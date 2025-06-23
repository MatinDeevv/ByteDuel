/*
  # Create Standardized Lobby System

  1. New Tables
    - `game_lobbies`
      - `id` (uuid, primary key)
      - `host_id` (uuid, foreign key to users)
      - `player_ids` (jsonb array of player IDs)
      - `created_at` (timestamp)
      - `status` (text: waiting, starting, active, completed)
      - `current_players` (integer)
      - `max_players` (integer, default 2)
      - `settings` (jsonb for match settings)
      - `expires_at` (timestamp for cleanup)

  2. Security
    - Enable RLS on `game_lobbies` table
    - Add policies for lobby management

  3. Functions
    - Automated cleanup for expired/completed lobbies
    - Lobby management functions
*/

-- Create game_lobbies table
CREATE TABLE IF NOT EXISTS game_lobbies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'starting', 'active', 'completed')),
  current_players integer DEFAULT 1,
  max_players integer DEFAULT 2,
  settings jsonb DEFAULT '{
    "level": 1,
    "timeLimit": 900,
    "mode": "ranked"
  }'::jsonb,
  expires_at timestamptz DEFAULT (now() + INTERVAL '30 minutes'),
  duel_id uuid REFERENCES duels(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE game_lobbies ENABLE ROW LEVEL SECURITY;

-- Policies for game_lobbies
CREATE POLICY "Anyone can read lobbies"
  ON game_lobbies
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create lobbies"
  ON game_lobbies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update own lobby"
  ON game_lobbies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id);

CREATE POLICY "Host can delete own lobby"
  ON game_lobbies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

-- Function to cleanup expired lobbies
CREATE OR REPLACE FUNCTION cleanup_expired_lobbies()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete expired lobbies
  DELETE FROM game_lobbies 
  WHERE expires_at < NOW() 
     OR (status = 'completed' AND created_at < NOW() - INTERVAL '1 hour');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % expired lobbies', deleted_count;
  END IF;
  
  RETURN deleted_count;
END;
$$;

-- Function to join a lobby
CREATE OR REPLACE FUNCTION join_lobby(lobby_id uuid, player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  lobby_record game_lobbies;
  new_player_ids jsonb;
  result jsonb;
BEGIN
  -- Get current lobby state
  SELECT * INTO lobby_record FROM game_lobbies WHERE id = lobby_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lobby not found');
  END IF;
  
  IF lobby_record.status != 'waiting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lobby is not accepting players');
  END IF;
  
  IF lobby_record.current_players >= lobby_record.max_players THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lobby is full');
  END IF;
  
  IF lobby_record.host_id = player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot join your own lobby');
  END IF;
  
  -- Check if player already in lobby
  IF lobby_record.player_ids ? player_id::text THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in this lobby');
  END IF;
  
  -- Add player to lobby
  new_player_ids := lobby_record.player_ids || jsonb_build_array(player_id);
  
  UPDATE game_lobbies 
  SET 
    player_ids = new_player_ids,
    current_players = current_players + 1,
    status = CASE 
      WHEN current_players + 1 >= max_players THEN 'starting'
      ELSE 'waiting'
    END
  WHERE id = lobby_id;
  
  RETURN jsonb_build_object('success', true, 'lobby_id', lobby_id);
END;
$$;

-- Function to leave a lobby
CREATE OR REPLACE FUNCTION leave_lobby(lobby_id uuid, player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  lobby_record game_lobbies;
  new_player_ids jsonb;
BEGIN
  -- Get current lobby state
  SELECT * INTO lobby_record FROM game_lobbies WHERE id = lobby_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lobby not found');
  END IF;
  
  -- If host is leaving, delete the lobby
  IF lobby_record.host_id = player_id THEN
    DELETE FROM game_lobbies WHERE id = lobby_id;
    RETURN jsonb_build_object('success', true, 'lobby_deleted', true);
  END IF;
  
  -- Remove player from lobby
  new_player_ids := lobby_record.player_ids - player_id::text;
  
  UPDATE game_lobbies 
  SET 
    player_ids = new_player_ids,
    current_players = current_players - 1
  WHERE id = lobby_id;
  
  RETURN jsonb_build_object('success', true, 'lobby_id', lobby_id);
END;
$$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_game_lobbies_status ON game_lobbies(status);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_created_at ON game_lobbies(created_at);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_expires_at ON game_lobbies(expires_at);
CREATE INDEX IF NOT EXISTS idx_game_lobbies_host_id ON game_lobbies(host_id);

-- Run initial cleanup
SELECT cleanup_expired_lobbies();
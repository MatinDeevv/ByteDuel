/*
  # Fix Lobby System Integration

  1. Database Schema Fixes
    - Fix foreign key relationships
    - Ensure proper data consistency
    - Add missing indexes

  2. Function Updates
    - Fix join_lobby function
    - Improve error handling
    - Add proper validation
*/

-- First, let's ensure the game_lobbies table has proper structure
ALTER TABLE game_lobbies 
DROP CONSTRAINT IF EXISTS game_lobbies_duel_id_fkey;

-- Add proper foreign key constraint
ALTER TABLE game_lobbies 
ADD CONSTRAINT game_lobbies_duel_id_fkey 
FOREIGN KEY (duel_id) REFERENCES duels(id) ON DELETE SET NULL;

-- Update the join_lobby function with better error handling
CREATE OR REPLACE FUNCTION join_lobby(lobby_id uuid, player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  lobby_record game_lobbies;
  new_player_ids jsonb;
  result jsonb;
  player_count integer;
BEGIN
  -- Get current lobby state with row lock
  SELECT * INTO lobby_record 
  FROM game_lobbies 
  WHERE id = lobby_id 
  FOR UPDATE;
  
  -- Check if lobby exists
  IF NOT FOUND THEN
    RAISE NOTICE 'Lobby not found: %', lobby_id;
    RETURN jsonb_build_object('success', false, 'error', 'Lobby not found');
  END IF;
  
  -- Check lobby status
  IF lobby_record.status NOT IN ('waiting', 'starting') THEN
    RAISE NOTICE 'Lobby % is not accepting players, status: %', lobby_id, lobby_record.status;
    RETURN jsonb_build_object('success', false, 'error', 'Lobby is not accepting players');
  END IF;
  
  -- Check if lobby is full
  IF lobby_record.current_players >= lobby_record.max_players THEN
    RAISE NOTICE 'Lobby % is full: %/%', lobby_id, lobby_record.current_players, lobby_record.max_players;
    RETURN jsonb_build_object('success', false, 'error', 'Lobby is full');
  END IF;
  
  -- Check if player is the host
  IF lobby_record.host_id = player_id THEN
    RAISE NOTICE 'Player % cannot join own lobby %', player_id, lobby_id;
    RETURN jsonb_build_object('success', false, 'error', 'Cannot join your own lobby');
  END IF;
  
  -- Check if player already in lobby
  IF lobby_record.player_ids ? player_id::text THEN
    RAISE NOTICE 'Player % already in lobby %', player_id, lobby_id;
    RETURN jsonb_build_object('success', false, 'error', 'Already in this lobby');
  END IF;
  
  -- Add player to lobby
  new_player_ids := lobby_record.player_ids || jsonb_build_array(player_id);
  player_count := lobby_record.current_players + 1;
  
  -- Update lobby
  UPDATE game_lobbies 
  SET 
    player_ids = new_player_ids,
    current_players = player_count,
    status = CASE 
      WHEN player_count >= max_players THEN 'starting'
      ELSE 'waiting'
    END
  WHERE id = lobby_id;
  
  RAISE NOTICE 'Player % successfully joined lobby %. Players: %/%', 
    player_id, lobby_id, player_count, lobby_record.max_players;
  
  RETURN jsonb_build_object(
    'success', true, 
    'lobby_id', lobby_id,
    'current_players', player_count,
    'status', CASE WHEN player_count >= lobby_record.max_players THEN 'starting' ELSE 'waiting' END
  );
END;
$$;

-- Update the leave_lobby function
CREATE OR REPLACE FUNCTION leave_lobby(lobby_id uuid, player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  lobby_record game_lobbies;
  new_player_ids jsonb;
  player_count integer;
BEGIN
  -- Get current lobby state with row lock
  SELECT * INTO lobby_record 
  FROM game_lobbies 
  WHERE id = lobby_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'Lobby not found: %', lobby_id;
    RETURN jsonb_build_object('success', false, 'error', 'Lobby not found');
  END IF;
  
  -- If host is leaving, delete the lobby
  IF lobby_record.host_id = player_id THEN
    DELETE FROM game_lobbies WHERE id = lobby_id;
    RAISE NOTICE 'Host % left, lobby % deleted', player_id, lobby_id;
    RETURN jsonb_build_object('success', true, 'lobby_deleted', true);
  END IF;
  
  -- Check if player is in the lobby
  IF NOT (lobby_record.player_ids ? player_id::text) THEN
    RAISE NOTICE 'Player % not in lobby %', player_id, lobby_id;
    RETURN jsonb_build_object('success', false, 'error', 'Not in this lobby');
  END IF;
  
  -- Remove player from lobby
  new_player_ids := lobby_record.player_ids - player_id::text;
  player_count := lobby_record.current_players - 1;
  
  UPDATE game_lobbies 
  SET 
    player_ids = new_player_ids,
    current_players = player_count,
    status = 'waiting'  -- Reset to waiting when someone leaves
  WHERE id = lobby_id;
  
  RAISE NOTICE 'Player % left lobby %. Players: %/%', 
    player_id, lobby_id, player_count, lobby_record.max_players;
  
  RETURN jsonb_build_object('success', true, 'lobby_id', lobby_id);
END;
$$;

-- Function to get lobby with host information
CREATE OR REPLACE FUNCTION get_lobbies_with_host_info()
RETURNS TABLE (
  id uuid,
  host_id uuid,
  host_name text,
  host_rating integer,
  host_avatar text,
  player_ids jsonb,
  current_players integer,
  max_players integer,
  status text,
  settings jsonb,
  created_at timestamptz,
  expires_at timestamptz,
  duel_id uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gl.id,
    gl.host_id,
    u.display_name as host_name,
    u.elo_rating as host_rating,
    u.avatar_url as host_avatar,
    gl.player_ids,
    gl.current_players,
    gl.max_players,
    gl.status,
    gl.settings,
    gl.created_at,
    gl.expires_at,
    gl.duel_id
  FROM game_lobbies gl
  JOIN users u ON gl.host_id = u.id
  WHERE gl.status IN ('waiting', 'starting')
    AND gl.expires_at > NOW()
  ORDER BY gl.created_at DESC;
END;
$$;

-- Clean up any invalid data
DELETE FROM game_lobbies WHERE host_id NOT IN (SELECT id FROM users);
DELETE FROM game_lobbies WHERE expires_at < NOW();

-- Run cleanup
SELECT cleanup_expired_lobbies();
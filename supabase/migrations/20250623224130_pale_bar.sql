/*
  # Simple Race-Free Matchmaking System

  1. New Tables
    - `matchmaking_queue` - Simple FIFO queue for matchmaking
    
  2. Functions
    - `run_match(mode)` - Atomically picks two players and removes them from queue
    - `enqueue_player` - Safely adds player to queue
    - `dequeue_player` - Safely removes player from queue
    
  3. Cleanup
    - Remove complex advanced matchmaking tables and functions
    - Keep essential tables (users, duels, etc.)
*/

-- Clean up the complex advanced matchmaking system
DROP TABLE IF EXISTS advanced_matchmaking_queue CASCADE;
DROP TABLE IF EXISTS player_behavior CASCADE;
DROP TABLE IF EXISTS recent_opponents CASCADE;

DROP FUNCTION IF EXISTS join_advanced_matchmaking_queue CASCADE;
DROP FUNCTION IF EXISTS leave_advanced_matchmaking_queue CASCADE;
DROP FUNCTION IF EXISTS process_advanced_matchmaking CASCADE;
DROP FUNCTION IF EXISTS find_queue_matches CASCADE;
DROP FUNCTION IF EXISTS create_match_between_users CASCADE;
DROP FUNCTION IF EXISTS debug_check_queue CASCADE;
DROP FUNCTION IF EXISTS expand_matchmaking_ranges CASCADE;
DROP FUNCTION IF EXISTS calculate_fair_play_pool CASCADE;
DROP FUNCTION IF EXISTS cleanup_stale_queue_entries CASCADE;

-- Ensure users table has rating column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS rating integer DEFAULT 1200;

-- Update existing users with rating if they don't have it
UPDATE users 
SET rating = elo_rating 
WHERE rating IS NULL;

-- Create simple matchmaking queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'ranked',
  queued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_mode_queued_at 
ON matchmaking_queue(mode, queued_at);

-- Function to atomically pick two players from the queue
CREATE OR REPLACE FUNCTION run_match(p_mode text DEFAULT 'ranked')
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  player1_id uuid;
  player2_id uuid;
  player1_name text;
  player2_name text;
  player1_rating integer;
  player2_rating integer;
BEGIN
  -- Atomically select and remove two oldest players from the queue
  WITH selected_players AS (
    SELECT user_id
    FROM matchmaking_queue
    WHERE mode = p_mode
    ORDER BY queued_at ASC
    LIMIT 2
    FOR UPDATE SKIP LOCKED
  ),
  deleted_players AS (
    DELETE FROM matchmaking_queue
    WHERE user_id IN (SELECT user_id FROM selected_players)
    RETURNING user_id
  ),
  player_info AS (
    SELECT 
      u.id,
      u.display_name,
      u.rating,
      ROW_NUMBER() OVER (ORDER BY mq.queued_at ASC) as rn
    FROM users u
    JOIN matchmaking_queue mq ON u.id = mq.user_id
    WHERE mq.user_id IN (SELECT user_id FROM deleted_players)
  )
  SELECT 
    MAX(CASE WHEN rn = 1 THEN id END),
    MAX(CASE WHEN rn = 2 THEN id END),
    MAX(CASE WHEN rn = 1 THEN display_name END),
    MAX(CASE WHEN rn = 2 THEN display_name END),
    MAX(CASE WHEN rn = 1 THEN rating END),
    MAX(CASE WHEN rn = 2 THEN rating END)
  INTO player1_id, player2_id, player1_name, player2_name, player1_rating, player2_rating
  FROM player_info;
  
  -- Return result
  IF player1_id IS NOT NULL AND player2_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'matched', true,
      'player1_id', player1_id,
      'player2_id', player2_id,
      'player1_name', player1_name,
      'player2_name', player2_name,
      'player1_rating', player1_rating,
      'player2_rating', player2_rating,
      'rating_difference', ABS(player1_rating - player2_rating)
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'matched', false,
      'message', 'Not enough players in queue'
    );
  END IF;
END;
$$;

-- Function to safely enqueue a player
CREATE OR REPLACE FUNCTION enqueue_player(p_user_id uuid, p_mode text DEFAULT 'ranked')
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  queue_position integer;
  queue_size integer;
BEGIN
  -- Remove player if already in queue
  DELETE FROM matchmaking_queue WHERE user_id = p_user_id;
  
  -- Add player to queue
  INSERT INTO matchmaking_queue (user_id, mode)
  VALUES (p_user_id, p_mode);
  
  -- Get queue position and size
  SELECT 
    COUNT(*) FILTER (WHERE queued_at <= mq.queued_at) as position,
    COUNT(*) OVER () as total_size
  INTO queue_position, queue_size
  FROM matchmaking_queue mq
  WHERE mode = p_mode AND user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'queued', true,
    'position', queue_position,
    'queue_size', queue_size,
    'estimated_wait_seconds', GREATEST(5, (queue_position - 1) * 15)
  );
END;
$$;

-- Function to safely dequeue a player
CREATE OR REPLACE FUNCTION dequeue_player(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  removed_count integer;
BEGIN
  DELETE FROM matchmaking_queue 
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'removed', removed_count > 0
  );
END;
$$;

-- Function to get queue status for a user
CREATE OR REPLACE FUNCTION get_queue_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  queue_info record;
  queue_size integer;
BEGIN
  SELECT 
    user_id,
    mode,
    queued_at,
    COUNT(*) FILTER (WHERE queued_at <= mq.queued_at) as position,
    COUNT(*) OVER () as total_size
  INTO queue_info
  FROM matchmaking_queue mq
  WHERE user_id = p_user_id
  GROUP BY user_id, mode, queued_at;
  
  IF queue_info.user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'in_queue', true,
      'mode', queue_info.mode,
      'position', queue_info.position,
      'queue_size', queue_info.total_size,
      'queued_at', queue_info.queued_at,
      'estimated_wait_seconds', GREATEST(5, (queue_info.position - 1) * 15)
    );
  ELSE
    RETURN jsonb_build_object(
      'in_queue', false
    );
  END IF;
END;
$$;

-- Function to get overall queue statistics
CREATE OR REPLACE FUNCTION get_queue_stats()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  stats record;
BEGIN
  SELECT 
    COUNT(*) as total_players,
    COUNT(*) FILTER (WHERE mode = 'ranked') as ranked_players,
    COUNT(*) FILTER (WHERE mode = 'casual') as casual_players,
    AVG(EXTRACT(EPOCH FROM (NOW() - queued_at))) as avg_wait_seconds
  INTO stats
  FROM matchmaking_queue;
  
  RETURN jsonb_build_object(
    'total_players', COALESCE(stats.total_players, 0),
    'ranked_players', COALESCE(stats.ranked_players, 0),
    'casual_players', COALESCE(stats.casual_players, 0),
    'avg_wait_seconds', COALESCE(stats.avg_wait_seconds, 0)
  );
END;
$$;

-- Clean up any existing queue entries
TRUNCATE TABLE matchmaking_queue;
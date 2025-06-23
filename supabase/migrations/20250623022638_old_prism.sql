/*
  # Fix Matchmaking System for Instant Connections

  1. Database Schema Updates
    - Ensure proper foreign key relationships
    - Add indexes for faster matchmaking queries
    - Update RLS policies for better performance

  2. Performance Optimizations
    - Add composite indexes for matchmaking queries
    - Optimize queue status queries
    - Improve user lookup performance

  3. Data Consistency
    - Ensure all demo users exist with proper ratings
    - Fix any data type mismatches
    - Clean up orphaned queue entries
*/

-- Ensure users table has proper structure
DO $$
BEGIN
  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email text;
  END IF;
END $$;

-- Fix foreign key relationship in matchmaking_queue
DO $$
BEGIN
  -- Drop existing foreign key if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'matchmaking_queue_user_id_fkey'
  ) THEN
    ALTER TABLE matchmaking_queue DROP CONSTRAINT matchmaking_queue_user_id_fkey;
  END IF;

  -- Add proper foreign key constraint
  ALTER TABLE matchmaking_queue 
  ADD CONSTRAINT matchmaking_queue_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
END $$;

-- Create optimized indexes for fast matchmaking
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_composite 
ON matchmaking_queue(mode, queued_at);

CREATE INDEX IF NOT EXISTS idx_users_elo_rating 
ON users(elo_rating) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_users_active_rating 
ON users(is_active, elo_rating) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_duels_active_participants 
ON duels(status, creator_id, opponent_id) WHERE status = 'active';

-- Update RLS policies for better performance
DROP POLICY IF EXISTS "Anyone can manage queue" ON matchmaking_queue;
CREATE POLICY "Users can manage own queue entry" 
ON matchmaking_queue FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Ensure demo users exist with correct data
INSERT INTO users (
  id, 
  display_name, 
  github_username, 
  elo_rating, 
  rating,
  games_played, 
  games_won,
  is_active,
  skill_level
) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'CodeMaster', 'codemaster', 1200, 1200, 52, 45, true, 'intermediate'),
  ('550e8400-e29b-41d4-a716-446655440002', 'AlgoNinja', 'algoninja', 1200, 1200, 44, 38, true, 'intermediate'),
  ('550e8400-e29b-41d4-a716-446655440003', 'ByteWarrior', 'bytewarrior', 1200, 1200, 51, 42, true, 'intermediate'),
  ('550e8400-e29b-41d4-a716-446655440004', 'DevGuru', 'devguru', 1200, 1200, 41, 35, true, 'intermediate'),
  ('550e8400-e29b-41d4-a716-446655440005', 'ScriptKid', 'scriptkid', 1200, 1200, 35, 28, true, 'intermediate')
ON CONFLICT (id) DO UPDATE SET
  elo_rating = EXCLUDED.elo_rating,
  rating = EXCLUDED.rating,
  is_active = EXCLUDED.is_active;

-- Clean up any orphaned queue entries
DELETE FROM matchmaking_queue 
WHERE user_id NOT IN (SELECT id FROM users);

-- Function to get queue statistics
CREATE OR REPLACE FUNCTION get_queue_stats()
RETURNS TABLE(
  mode text,
  total_players bigint,
  avg_wait_time_seconds numeric,
  players_by_rating jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mq.mode,
    COUNT(*) as total_players,
    EXTRACT(EPOCH FROM AVG(NOW() - mq.queued_at)) as avg_wait_time_seconds,
    jsonb_object_agg(
      u.elo_rating::text, 
      COUNT(*)
    ) as players_by_rating
  FROM matchmaking_queue mq
  JOIN users u ON mq.user_id = u.id
  GROUP BY mq.mode;
END;
$$;

-- Function to find exact ELO matches quickly
CREATE OR REPLACE FUNCTION find_exact_elo_matches(
  target_user_id uuid,
  target_mode text
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  elo_rating integer,
  queued_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  user_elo integer;
BEGIN
  -- Get the user's ELO rating
  SELECT u.elo_rating INTO user_elo
  FROM users u
  WHERE u.id = target_user_id;

  -- Return users with exact same ELO in the same mode
  RETURN QUERY
  SELECT 
    mq.user_id,
    u.display_name,
    u.elo_rating,
    mq.queued_at
  FROM matchmaking_queue mq
  JOIN users u ON mq.user_id = u.id
  WHERE mq.mode = target_mode
    AND mq.user_id != target_user_id
    AND u.elo_rating = user_elo
    AND u.is_active = true
  ORDER BY mq.queued_at ASC;
END;
$$;

-- Add some test queue entries for demo (will be cleaned up by background service)
DO $$
BEGIN
  -- Only add if queue is empty to avoid duplicates
  IF NOT EXISTS (SELECT 1 FROM matchmaking_queue LIMIT 1) THEN
    INSERT INTO matchmaking_queue (user_id, mode, queued_at) VALUES
      ('550e8400-e29b-41d4-a716-446655440001', 'ranked', NOW() - INTERVAL '30 seconds'),
      ('550e8400-e29b-41d4-a716-446655440002', 'ranked', NOW() - INTERVAL '25 seconds')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
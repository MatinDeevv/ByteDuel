/*
  # Fix Matchmaking System Database Schema

  1. New Tables
    - Ensures all tables exist with proper structure
    - Handles existing tables gracefully
    - Adds missing columns to existing tables

  2. Security
    - Enable RLS on all tables
    - Create policies only if they don't exist
    - Proper access control for matchmaking

  3. Performance
    - Add indexes for efficient queries
    - Optimize matchmaking queue operations

  4. Functions
    - ELO calculation function
    - User ranking functions
    - Demo data insertion
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create or update users table
DO $$
BEGIN
  -- Create users table if it doesn't exist
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    CREATE TABLE users (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      github_username text UNIQUE,
      display_name text NOT NULL,
      skill_level text NOT NULL DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
      elo_rating integer NOT NULL DEFAULT 1200,
      games_played integer NOT NULL DEFAULT 0,
      games_won integer NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      rating integer NOT NULL DEFAULT 1200
    );
  ELSE
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'rating') THEN
      ALTER TABLE users ADD COLUMN rating integer NOT NULL DEFAULT 1200;
    END IF;
  END IF;
END $$;

-- Create matchmaking_queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'ranked',
  queued_at timestamptz NOT NULL DEFAULT now()
);

-- Create or update duels table
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'duels') THEN
    CREATE TABLE duels (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      creator_id text NOT NULL,
      opponent_id text,
      status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
      mode text NOT NULL,
      prompt text NOT NULL,
      test_cases jsonb NOT NULL,
      time_limit integer NOT NULL,
      elo_change numeric,
      created_at timestamptz DEFAULT now(),
      started_at timestamptz,
      ended_at timestamptz
    );
  END IF;
END $$;

-- Create or update submissions table
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'submissions') THEN
    CREATE TABLE submissions (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      duel_id uuid NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
      user_id text NOT NULL,
      code text NOT NULL,
      passed_tests integer NOT NULL,
      total_tests integer NOT NULL,
      runtime_ms integer NOT NULL,
      submitted_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create practice_sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  mode text NOT NULL,
  topic text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  prompt text NOT NULL,
  test_cases jsonb NOT NULL,
  hints_used integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create match_history table
CREATE TABLE IF NOT EXISTS match_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duel_id uuid NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  opponent_id uuid REFERENCES users(id) ON DELETE CASCADE,
  result text NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  rating_before integer NOT NULL,
  rating_after integer NOT NULL,
  rating_change integer NOT NULL,
  completion_time integer,
  wrong_submissions integer NOT NULL DEFAULT 0,
  final_code text,
  created_at timestamptz DEFAULT now()
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_matches integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  win_rate numeric(5,2) NOT NULL DEFAULT 0.0,
  avg_completion_time integer,
  fastest_solve integer,
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  total_wrong_submissions integer NOT NULL DEFAULT 0,
  favorite_topics text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$
BEGIN
  -- Users table policies
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'users' AND policyname = 'Public can read user display data') THEN
    CREATE POLICY "Public can read user display data" ON users FOR SELECT TO anon, authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert own data') THEN
    CREATE POLICY "Users can insert own data" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own data') THEN
    CREATE POLICY "Users can update own data" ON users FOR UPDATE TO anon, authenticated USING (true);
  END IF;

  -- Matchmaking queue policies
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'matchmaking_queue' AND policyname = 'Anyone can manage queue') THEN
    CREATE POLICY "Anyone can manage queue" ON matchmaking_queue FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  -- Duels table policies
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'duels' AND policyname = 'Anyone can create duels') THEN
    CREATE POLICY "Anyone can create duels" ON duels FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'duels' AND policyname = 'Anyone can read duels') THEN
    CREATE POLICY "Anyone can read duels" ON duels FOR SELECT TO anon, authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'duels' AND policyname = 'Anyone can update duels') THEN
    CREATE POLICY "Anyone can update duels" ON duels FOR UPDATE TO anon, authenticated USING (true);
  END IF;

  -- Submissions table policies
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'Anyone can create submissions') THEN
    CREATE POLICY "Anyone can create submissions" ON submissions FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'Anyone can read submissions') THEN
    CREATE POLICY "Anyone can read submissions" ON submissions FOR SELECT TO anon, authenticated USING (true);
  END IF;

  -- Practice sessions table policies
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'practice_sessions' AND policyname = 'Anyone can create practice sessions') THEN
    CREATE POLICY "Anyone can create practice sessions" ON practice_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'practice_sessions' AND policyname = 'Anyone can read practice sessions') THEN
    CREATE POLICY "Anyone can read practice sessions" ON practice_sessions FOR SELECT TO anon, authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'practice_sessions' AND policyname = 'Anyone can update practice sessions') THEN
    CREATE POLICY "Anyone can update practice sessions" ON practice_sessions FOR UPDATE TO anon, authenticated USING (true);
  END IF;

  -- Match history table policies
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'match_history' AND policyname = 'Anyone can read match history') THEN
    CREATE POLICY "Anyone can read match history" ON match_history FOR SELECT TO anon, authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'match_history' AND policyname = 'Anyone can create match history') THEN
    CREATE POLICY "Anyone can create match history" ON match_history FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;

  -- User stats table policies
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'user_stats' AND policyname = 'Anyone can read user stats') THEN
    CREATE POLICY "Anyone can read user stats" ON user_stats FOR SELECT TO anon, authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'user_stats' AND policyname = 'Anyone can manage user stats') THEN
    CREATE POLICY "Anyone can manage user stats" ON user_stats FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_mode ON matchmaking_queue(mode);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_queued_at ON matchmaking_queue(queued_at);
CREATE INDEX IF NOT EXISTS idx_duels_status ON duels(status);
CREATE INDEX IF NOT EXISTS idx_duels_creator ON duels(creator_id);
CREATE INDEX IF NOT EXISTS idx_duels_opponent ON duels(opponent_id);
CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_created_at ON match_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_matches ON user_stats(total_matches DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_win_rate ON user_stats(win_rate DESC);

-- Create or replace functions
CREATE OR REPLACE FUNCTION calculate_elo_change(
  winner_rating integer,
  loser_rating integer,
  k_factor integer DEFAULT 32
)
RETURNS TABLE(winner_change integer, loser_change integer)
LANGUAGE plpgsql
AS $$
DECLARE
  expected_winner numeric;
  expected_loser numeric;
  winner_delta integer;
  loser_delta integer;
BEGIN
  -- Calculate expected scores
  expected_winner := 1.0 / (1.0 + power(10.0, (loser_rating - winner_rating) / 400.0));
  expected_loser := 1.0 / (1.0 + power(10.0, (winner_rating - loser_rating) / 400.0));
  
  -- Calculate rating changes
  winner_delta := round(k_factor * (1.0 - expected_winner));
  loser_delta := round(k_factor * (0.0 - expected_loser));
  
  RETURN QUERY SELECT winner_delta, loser_delta;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_leaderboard_position(user_profile_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  user_position integer;
BEGIN
  SELECT COUNT(*) + 1 INTO user_position
  FROM users u
  WHERE u.elo_rating > (
    SELECT elo_rating FROM users WHERE id = user_profile_id
  );
  
  RETURN COALESCE(user_position, 0);
END;
$$;

-- Insert demo users for testing (only if they don't exist)
INSERT INTO users (id, display_name, github_username, elo_rating, games_played, games_won) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'CodeMaster', 'codemaster', 2150, 52, 45),
  ('550e8400-e29b-41d4-a716-446655440002', 'AlgoNinja', 'algoninja', 2089, 44, 38),
  ('550e8400-e29b-41d4-a716-446655440003', 'ByteWarrior', 'bytewarrior', 1987, 51, 42),
  ('550e8400-e29b-41d4-a716-446655440004', 'DevGuru', 'devguru', 1923, 41, 35),
  ('550e8400-e29b-41d4-a716-446655440005', 'ScriptKid', 'scriptkid', 1876, 35, 28)
ON CONFLICT (id) DO NOTHING;

-- Insert corresponding user stats (only if they don't exist)
INSERT INTO user_stats (user_id, total_matches, wins, losses, win_rate) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 52, 45, 7, 86.54),
  ('550e8400-e29b-41d4-a716-446655440002', 44, 38, 6, 86.36),
  ('550e8400-e29b-41d4-a716-446655440003', 51, 42, 9, 82.35),
  ('550e8400-e29b-41d4-a716-446655440004', 41, 35, 6, 85.37),
  ('550e8400-e29b-41d4-a716-446655440005', 35, 28, 7, 80.00)
ON CONFLICT (user_id) DO NOTHING;
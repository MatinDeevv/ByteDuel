/*
  # Add comprehensive match history and statistics

  1. New Tables
    - `match_history` - Detailed match records with performance metrics
    - `user_stats` - Aggregated statistics per user

  2. Enhanced duel_results
    - Add performance metrics and detailed tracking

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies
*/

-- Enhance duel_results with more detailed tracking
DO $$
BEGIN
  -- Add wrong_submissions if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'duel_results' AND column_name = 'wrong_submissions'
  ) THEN
    ALTER TABLE duel_results ADD COLUMN wrong_submissions integer NOT NULL DEFAULT 0;
  END IF;

  -- Add completion_time if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'duel_results' AND column_name = 'completion_time'
  ) THEN
    ALTER TABLE duel_results ADD COLUMN completion_time integer; -- in seconds
  END IF;

  -- Add final_code if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'duel_results' AND column_name = 'final_code'
  ) THEN
    ALTER TABLE duel_results ADD COLUMN final_code text;
  END IF;
END $$;

-- Create match_history table for detailed tracking
CREATE TABLE IF NOT EXISTS match_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duel_id uuid NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  opponent_id uuid REFERENCES users(id) ON DELETE CASCADE,
  result text NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  rating_before integer NOT NULL,
  rating_after integer NOT NULL,
  rating_change integer NOT NULL,
  completion_time integer, -- in seconds, null if didn't complete
  wrong_submissions integer NOT NULL DEFAULT 0,
  final_code text,
  created_at timestamptz DEFAULT now()
);

-- Create user_stats table for aggregated statistics
CREATE TABLE IF NOT EXISTS user_stats (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_matches integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  win_rate numeric(5,2) NOT NULL DEFAULT 0.0,
  avg_completion_time integer, -- in seconds
  fastest_solve integer, -- in seconds
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  total_wrong_submissions integer NOT NULL DEFAULT 0,
  favorite_topics text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_history
CREATE POLICY "Users can read own match history"
  ON match_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can read match history for leaderboards"
  ON match_history
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "System can insert match history"
  ON match_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for user_stats
CREATE POLICY "Users can read own stats"
  ON user_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can read user stats"
  ON user_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can update own stats"
  ON user_stats
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_duel_id ON match_history(duel_id);
CREATE INDEX IF NOT EXISTS idx_match_history_created_at ON match_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_win_rate ON user_stats(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_matches ON user_stats(total_matches DESC);
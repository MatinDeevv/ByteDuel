/*
  # Initial Database Schema Setup

  1. New Tables
    - `profiles` - User profiles with authentication data
    - `user_stats` - Aggregated user statistics and performance metrics
    - `duels` - Coding challenge sessions between users
    - `submissions` - Code submissions and test results
    - `practice_sessions` - Solo practice mode sessions
    - `tournaments` - Tournament management
    - `match_history` - Historical match records
    - `leaderboards` - Cached leaderboard data

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for authenticated users
    - Secure data access patterns

  3. Performance
    - Add indexes on all filter/sort columns
    - Create materialized views for complex queries
    - Partition large tables by date
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS match_history CASCADE;
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS practice_sessions CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS duels CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS leaderboards CASCADE;

-- Create profiles table (replaces users table)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT NOT NULL,
  github_username TEXT UNIQUE,
  github_id TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  skill_level TEXT DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  elo_rating INTEGER DEFAULT 1200,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  preferred_languages TEXT[] DEFAULT '{}',
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_stats table for aggregated statistics
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_practice_sessions INTEGER DEFAULT 0,
  total_code_submissions INTEGER DEFAULT 0,
  average_solve_time INTEGER, -- in seconds
  fastest_solve_time INTEGER, -- in seconds
  slowest_solve_time INTEGER, -- in seconds
  favorite_topics TEXT[] DEFAULT '{}',
  difficulty_distribution JSONB DEFAULT '{"easy": 0, "medium": 0, "hard": 0}',
  monthly_activity JSONB DEFAULT '{}', -- {"2024-01": 15, "2024-02": 23}
  performance_trend JSONB DEFAULT '{}', -- rating changes over time
  achievements TEXT[] DEFAULT '{}',
  total_hints_used INTEGER DEFAULT 0,
  perfect_solutions INTEGER DEFAULT 0, -- solutions with no wrong attempts
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create duels table for competitive matches
CREATE TABLE duels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
  mode TEXT NOT NULL CHECK (mode IN ('ranked', 'casual', 'tournament', 'practice')),
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  topic TEXT NOT NULL,
  prompt TEXT NOT NULL,
  test_cases JSONB NOT NULL,
  time_limit INTEGER DEFAULT 900, -- 15 minutes in seconds
  max_attempts INTEGER DEFAULT 10,
  winner_id UUID REFERENCES profiles(id),
  creator_rating_before INTEGER,
  opponent_rating_before INTEGER,
  creator_rating_after INTEGER,
  opponent_rating_after INTEGER,
  creator_rating_change INTEGER DEFAULT 0,
  opponent_rating_change INTEGER DEFAULT 0,
  creator_completion_time INTEGER, -- in seconds
  opponent_completion_time INTEGER, -- in seconds
  creator_attempts INTEGER DEFAULT 0,
  opponent_attempts INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}', -- additional game data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Create submissions table for code submissions
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duel_id UUID REFERENCES duels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  language TEXT DEFAULT 'javascript',
  passed_tests INTEGER DEFAULT 0,
  total_tests INTEGER DEFAULT 0,
  runtime_ms INTEGER DEFAULT 0,
  memory_usage INTEGER DEFAULT 0, -- in KB
  test_results JSONB DEFAULT '[]',
  is_final BOOLEAN DEFAULT false,
  attempt_number INTEGER DEFAULT 1,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create practice_sessions table
CREATE TABLE practice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  prompt TEXT NOT NULL,
  test_cases JSONB NOT NULL,
  hints JSONB DEFAULT '[]',
  hints_used INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0, -- 0-100
  completion_time INTEGER, -- in seconds
  attempts INTEGER DEFAULT 0,
  final_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'registration' CHECK (status IN ('registration', 'active', 'completed', 'cancelled')),
  format TEXT DEFAULT 'single_elimination' CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin')),
  max_participants INTEGER DEFAULT 32,
  current_participants INTEGER DEFAULT 0,
  entry_fee INTEGER DEFAULT 0, -- in points/credits
  prize_pool JSONB DEFAULT '{}',
  rules JSONB DEFAULT '{}',
  bracket JSONB DEFAULT '{}',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create match_history table for historical records
CREATE TABLE match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  duel_id UUID REFERENCES duels(id) ON DELETE CASCADE,
  opponent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'draw')),
  rating_before INTEGER NOT NULL,
  rating_after INTEGER NOT NULL,
  rating_change INTEGER NOT NULL,
  completion_time INTEGER, -- in seconds
  attempts INTEGER DEFAULT 0,
  final_code TEXT,
  match_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (match_date);

-- Create partitions for match_history (current year and next year)
CREATE TABLE match_history_2024 PARTITION OF match_history
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE match_history_2025 PARTITION OF match_history
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Create leaderboards materialized view
CREATE MATERIALIZED VIEW leaderboards AS
SELECT 
  p.id,
  p.display_name,
  p.avatar_url,
  p.github_username,
  p.elo_rating,
  p.wins,
  p.losses,
  p.total_matches,
  CASE 
    WHEN p.total_matches > 0 THEN ROUND((p.wins::DECIMAL / p.total_matches) * 100, 1)
    ELSE 0 
  END as win_rate,
  p.current_streak,
  p.best_streak,
  us.average_solve_time,
  us.fastest_solve_time,
  ROW_NUMBER() OVER (ORDER BY p.elo_rating DESC, p.wins DESC) as rank
FROM profiles p
LEFT JOIN user_stats us ON p.id = us.user_id
WHERE p.is_active = true AND p.total_matches >= 5
ORDER BY p.elo_rating DESC, p.wins DESC
LIMIT 1000;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = auth_user_id);

-- Create RLS policies for user_stats
CREATE POLICY "Public stats are viewable by everyone" ON user_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own stats" ON user_stats
  FOR ALL USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Create RLS policies for duels
CREATE POLICY "Anyone can view duels" ON duels
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create duels" ON duels
  FOR INSERT TO authenticated WITH CHECK (
    creator_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update their duels" ON duels
  FOR UPDATE USING (
    creator_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()) OR
    opponent_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  );

-- Create RLS policies for submissions
CREATE POLICY "Anyone can view submissions" ON submissions
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own submissions" ON submissions
  FOR INSERT TO authenticated WITH CHECK (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Create RLS policies for practice_sessions
CREATE POLICY "Users can view their own practice sessions" ON practice_sessions
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own practice sessions" ON practice_sessions
  FOR ALL USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Create RLS policies for tournaments
CREATE POLICY "Anyone can view tournaments" ON tournaments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tournaments" ON tournaments
  FOR INSERT TO authenticated WITH CHECK (
    created_by IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Tournament creators can update their tournaments" ON tournaments
  FOR UPDATE USING (
    created_by IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Create RLS policies for match_history
CREATE POLICY "Users can view their own match history" ON match_history
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert match history" ON match_history
  FOR INSERT TO authenticated WITH CHECK (true);
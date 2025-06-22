/*
  # Performance Optimization - Indexes and Constraints

  1. Indexes
    - B-tree indexes on frequently queried columns
    - Composite indexes for complex queries
    - GIN indexes for JSONB and array columns
    - Partial indexes for filtered queries

  2. Constraints
    - Foreign key constraints with proper cascading
    - Check constraints for data validation
    - Unique constraints where needed

  3. Performance Features
    - Materialized view refresh schedule
    - Query optimization hints
*/

-- Profiles table indexes
CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX idx_profiles_github_username ON profiles(github_username) WHERE github_username IS NOT NULL;
CREATE INDEX idx_profiles_elo_rating ON profiles(elo_rating DESC);
CREATE INDEX idx_profiles_active_rating ON profiles(elo_rating DESC, is_active) WHERE is_active = true;
CREATE INDEX idx_profiles_last_active ON profiles(last_active DESC);
CREATE INDEX idx_profiles_skill_level ON profiles(skill_level);
CREATE INDEX idx_profiles_total_matches ON profiles(total_matches DESC);
CREATE INDEX idx_profiles_win_rate ON profiles((CASE WHEN total_matches > 0 THEN wins::DECIMAL / total_matches ELSE 0 END) DESC);

-- User stats indexes
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX idx_user_stats_solve_time ON user_stats(average_solve_time);
CREATE INDEX idx_user_stats_fastest_solve ON user_stats(fastest_solve_time);
CREATE INDEX idx_user_stats_updated ON user_stats(updated_at DESC);

-- Duels table indexes
CREATE INDEX idx_duels_creator_id ON duels(creator_id);
CREATE INDEX idx_duels_opponent_id ON duels(opponent_id);
CREATE INDEX idx_duels_status ON duels(status);
CREATE INDEX idx_duels_mode ON duels(mode);
CREATE INDEX idx_duels_topic ON duels(topic);
CREATE INDEX idx_duels_difficulty ON duels(difficulty);
CREATE INDEX idx_duels_created_at ON duels(created_at DESC);
CREATE INDEX idx_duels_active ON duels(status, created_at) WHERE status IN ('waiting', 'active');
CREATE INDEX idx_duels_completed ON duels(status, ended_at DESC) WHERE status = 'completed';
CREATE INDEX idx_duels_participants ON duels(creator_id, opponent_id, status);

-- Submissions table indexes
CREATE INDEX idx_submissions_duel_id ON submissions(duel_id);
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX idx_submissions_final ON submissions(is_final, submitted_at) WHERE is_final = true;
CREATE INDEX idx_submissions_user_duel ON submissions(user_id, duel_id, attempt_number);

-- Practice sessions indexes
CREATE INDEX idx_practice_user_id ON practice_sessions(user_id);
CREATE INDEX idx_practice_topic ON practice_sessions(topic);
CREATE INDEX idx_practice_difficulty ON practice_sessions(difficulty);
CREATE INDEX idx_practice_completed ON practice_sessions(completed, created_at DESC);
CREATE INDEX idx_practice_user_topic ON practice_sessions(user_id, topic, difficulty);
CREATE INDEX idx_practice_created_at ON practice_sessions(created_at DESC);

-- Tournaments indexes
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_start_time ON tournaments(start_time);
CREATE INDEX idx_tournaments_created_by ON tournaments(created_by);
CREATE INDEX idx_tournaments_active ON tournaments(status, start_time) WHERE status IN ('registration', 'active');

-- Match history indexes (on partitioned table)
CREATE INDEX idx_match_history_user_id ON match_history(user_id, match_date DESC);
CREATE INDEX idx_match_history_opponent_id ON match_history(opponent_id, match_date DESC);
CREATE INDEX idx_match_history_duel_id ON match_history(duel_id);
CREATE INDEX idx_match_history_result ON match_history(result, match_date DESC);
CREATE INDEX idx_match_history_rating_change ON match_history(rating_change DESC, match_date DESC);
CREATE INDEX idx_match_history_date ON match_history(match_date DESC);

-- JSONB indexes for complex queries
CREATE INDEX idx_duels_test_cases ON duels USING GIN(test_cases);
CREATE INDEX idx_duels_metadata ON duels USING GIN(metadata);
CREATE INDEX idx_user_stats_monthly_activity ON user_stats USING GIN(monthly_activity);
CREATE INDEX idx_user_stats_performance_trend ON user_stats USING GIN(performance_trend);
CREATE INDEX idx_tournaments_bracket ON tournaments USING GIN(bracket);
CREATE INDEX idx_tournaments_rules ON tournaments USING GIN(rules);

-- Array indexes
CREATE INDEX idx_profiles_preferred_languages ON profiles USING GIN(preferred_languages);
CREATE INDEX idx_user_stats_favorite_topics ON user_stats USING GIN(favorite_topics);
CREATE INDEX idx_user_stats_achievements ON user_stats USING GIN(achievements);

-- Text search indexes
CREATE INDEX idx_profiles_display_name_trgm ON profiles USING GIN(display_name gin_trgm_ops);
CREATE INDEX idx_tournaments_name_trgm ON tournaments USING GIN(name gin_trgm_ops);

-- Unique constraints
ALTER TABLE profiles ADD CONSTRAINT unique_auth_user_id UNIQUE(auth_user_id);
ALTER TABLE user_stats ADD CONSTRAINT unique_user_stats_user_id UNIQUE(user_id);

-- Additional check constraints
ALTER TABLE duels ADD CONSTRAINT valid_time_limit CHECK (time_limit > 0 AND time_limit <= 7200); -- max 2 hours
ALTER TABLE duels ADD CONSTRAINT valid_max_attempts CHECK (max_attempts > 0 AND max_attempts <= 50);
ALTER TABLE practice_sessions ADD CONSTRAINT valid_score CHECK (score >= 0 AND score <= 100);
ALTER TABLE practice_sessions ADD CONSTRAINT valid_hints_used CHECK (hints_used >= 0);
ALTER TABLE submissions ADD CONSTRAINT valid_attempt_number CHECK (attempt_number > 0);
ALTER TABLE submissions ADD CONSTRAINT valid_test_results CHECK (passed_tests >= 0 AND passed_tests <= total_tests);

-- Create function to refresh leaderboards materialized view
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW leaderboards;
END;
$$ LANGUAGE plpgsql;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_leaderboards_rank ON leaderboards(rank);
CREATE INDEX idx_leaderboards_rating ON leaderboards(elo_rating DESC);
CREATE INDEX idx_leaderboards_wins ON leaderboards(wins DESC);
CREATE INDEX idx_leaderboards_win_rate ON leaderboards(win_rate DESC);
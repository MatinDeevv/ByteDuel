/*
  # Database Functions and Triggers

  1. Trigger Functions
    - Auto-update timestamps
    - Maintain user statistics
    - Calculate ELO ratings
    - Update match history

  2. Utility Functions
    - ELO calculation
    - Statistics aggregation
    - Leaderboard updates

  3. Real-time Features
    - Match notifications
    - Status updates
*/

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate ELO rating changes
CREATE OR REPLACE FUNCTION calculate_elo_change(
  winner_rating INTEGER,
  loser_rating INTEGER,
  k_factor INTEGER DEFAULT 32
)
RETURNS TABLE(winner_change INTEGER, loser_change INTEGER) AS $$
DECLARE
  expected_winner DECIMAL;
  expected_loser DECIMAL;
  winner_delta INTEGER;
  loser_delta INTEGER;
BEGIN
  -- Calculate expected scores
  expected_winner := 1.0 / (1.0 + POWER(10, (loser_rating - winner_rating) / 400.0));
  expected_loser := 1.0 / (1.0 + POWER(10, (winner_rating - loser_rating) / 400.0));
  
  -- Calculate rating changes
  winner_delta := ROUND(k_factor * (1 - expected_winner));
  loser_delta := ROUND(k_factor * (0 - expected_loser));
  
  RETURN QUERY SELECT winner_delta, loser_delta;
END;
$$ LANGUAGE plpgsql;

-- Function to update user statistics after a match
CREATE OR REPLACE FUNCTION update_user_stats_after_match()
RETURNS TRIGGER AS $$
DECLARE
  creator_profile profiles%ROWTYPE;
  opponent_profile profiles%ROWTYPE;
BEGIN
  -- Only process when duel is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get profile records
    SELECT * INTO creator_profile FROM profiles WHERE id = NEW.creator_id;
    SELECT * INTO opponent_profile FROM profiles WHERE id = NEW.opponent_id;
    
    -- Update creator stats
    UPDATE profiles SET
      total_matches = total_matches + 1,
      wins = CASE WHEN NEW.winner_id = NEW.creator_id THEN wins + 1 ELSE wins END,
      losses = CASE WHEN NEW.winner_id != NEW.creator_id AND NEW.winner_id IS NOT NULL THEN losses + 1 ELSE losses END,
      draws = CASE WHEN NEW.winner_id IS NULL THEN draws + 1 ELSE draws END,
      elo_rating = COALESCE(NEW.creator_rating_after, elo_rating),
      current_streak = CASE 
        WHEN NEW.winner_id = NEW.creator_id THEN current_streak + 1
        ELSE 0
      END,
      best_streak = CASE 
        WHEN NEW.winner_id = NEW.creator_id AND current_streak + 1 > best_streak THEN current_streak + 1
        ELSE best_streak
      END,
      last_active = NOW()
    WHERE id = NEW.creator_id;
    
    -- Update opponent stats
    UPDATE profiles SET
      total_matches = total_matches + 1,
      wins = CASE WHEN NEW.winner_id = NEW.opponent_id THEN wins + 1 ELSE wins END,
      losses = CASE WHEN NEW.winner_id != NEW.opponent_id AND NEW.winner_id IS NOT NULL THEN losses + 1 ELSE losses END,
      draws = CASE WHEN NEW.winner_id IS NULL THEN draws + 1 ELSE draws END,
      elo_rating = COALESCE(NEW.opponent_rating_after, elo_rating),
      current_streak = CASE 
        WHEN NEW.winner_id = NEW.opponent_id THEN current_streak + 1
        ELSE 0
      END,
      best_streak = CASE 
        WHEN NEW.winner_id = NEW.opponent_id AND current_streak + 1 > best_streak THEN current_streak + 1
        ELSE best_streak
      END,
      last_active = NOW()
    WHERE id = NEW.opponent_id;
    
    -- Insert match history records
    INSERT INTO match_history (
      user_id, duel_id, opponent_id, result, 
      rating_before, rating_after, rating_change,
      completion_time, attempts, final_code
    ) VALUES 
    (
      NEW.creator_id, NEW.id, NEW.opponent_id,
      CASE 
        WHEN NEW.winner_id = NEW.creator_id THEN 'win'
        WHEN NEW.winner_id IS NULL THEN 'draw'
        ELSE 'loss'
      END,
      COALESCE(NEW.creator_rating_before, creator_profile.elo_rating),
      COALESCE(NEW.creator_rating_after, creator_profile.elo_rating),
      COALESCE(NEW.creator_rating_change, 0),
      NEW.creator_completion_time,
      NEW.creator_attempts,
      (SELECT code FROM submissions WHERE duel_id = NEW.id AND user_id = NEW.creator_id AND is_final = true LIMIT 1)
    ),
    (
      NEW.opponent_id, NEW.id, NEW.creator_id,
      CASE 
        WHEN NEW.winner_id = NEW.opponent_id THEN 'win'
        WHEN NEW.winner_id IS NULL THEN 'draw'
        ELSE 'loss'
      END,
      COALESCE(NEW.opponent_rating_before, opponent_profile.elo_rating),
      COALESCE(NEW.opponent_rating_after, opponent_profile.elo_rating),
      COALESCE(NEW.opponent_rating_change, 0),
      NEW.opponent_completion_time,
      NEW.opponent_attempts,
      (SELECT code FROM submissions WHERE duel_id = NEW.id AND user_id = NEW.opponent_id AND is_final = true LIMIT 1)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats after practice session
CREATE OR REPLACE FUNCTION update_user_stats_after_practice()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when practice session is completed
  IF NEW.completed = true AND OLD.completed = false THEN
    -- Update user stats
    INSERT INTO user_stats (user_id, total_practice_sessions, total_hints_used)
    VALUES (NEW.user_id, 1, NEW.hints_used)
    ON CONFLICT (user_id) DO UPDATE SET
      total_practice_sessions = user_stats.total_practice_sessions + 1,
      total_hints_used = user_stats.total_hints_used + NEW.hints_used,
      updated_at = NOW();
    
    -- Update profile last active
    UPDATE profiles SET last_active = NOW() WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create user stats when profile is created
CREATE OR REPLACE FUNCTION create_user_stats_for_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get user leaderboard position
CREATE OR REPLACE FUNCTION get_user_leaderboard_position(user_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  user_rating INTEGER;
  position INTEGER;
BEGIN
  -- Get user's current rating
  SELECT elo_rating INTO user_rating FROM profiles WHERE id = user_profile_id;
  
  -- Calculate position
  SELECT COUNT(*) + 1 INTO position
  FROM profiles 
  WHERE elo_rating > user_rating AND is_active = true AND total_matches >= 5;
  
  RETURN position;
END;
$$ LANGUAGE plpgsql;

-- Function to get matchmaking candidates
CREATE OR REPLACE FUNCTION get_matchmaking_candidates(
  user_profile_id UUID,
  rating_range INTEGER DEFAULT 200
)
RETURNS TABLE(
  id UUID,
  display_name TEXT,
  elo_rating INTEGER,
  total_matches INTEGER,
  last_active TIMESTAMPTZ
) AS $$
DECLARE
  user_rating INTEGER;
BEGIN
  -- Get user's current rating
  SELECT p.elo_rating INTO user_rating FROM profiles p WHERE p.id = user_profile_id;
  
  -- Return potential opponents within rating range
  RETURN QUERY
  SELECT p.id, p.display_name, p.elo_rating, p.total_matches, p.last_active
  FROM profiles p
  WHERE p.id != user_profile_id
    AND p.is_active = true
    AND p.elo_rating BETWEEN (user_rating - rating_range) AND (user_rating + rating_range)
    AND p.last_active > NOW() - INTERVAL '7 days'
  ORDER BY ABS(p.elo_rating - user_rating), p.last_active DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stats_after_duel_completion
  AFTER UPDATE ON duels
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_after_match();

CREATE TRIGGER update_stats_after_practice_completion
  AFTER UPDATE ON practice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_after_practice();

CREATE TRIGGER create_user_stats_on_profile_creation
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_stats_for_new_profile();

-- Create scheduled job to refresh leaderboards (requires pg_cron extension)
-- This would typically be set up in production with a cron job or scheduled function
-- SELECT cron.schedule('refresh-leaderboards', '0 */6 * * *', 'SELECT refresh_leaderboards();');
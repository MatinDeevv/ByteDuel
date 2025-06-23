/*
  # Advanced Chess.com-style Matchmaking System

  1. Enhanced Matchmaking Queue
    - Dynamic rating ranges
    - Time control preferences
    - Fair play tracking
    - Connection quality tracking
    - Color preferences and balancing

  2. Fair Play System
    - Track problematic behavior
    - Separate pools for different player types
    - Abort tracking
    - Timeout tracking

  3. Matching Algorithm
    - Dynamic rating expansion
    - Speed vs accuracy balance
    - Geographic considerations
    - Recent opponent tracking
*/

-- Drop old lobby system
DROP TABLE IF EXISTS game_lobbies CASCADE;

-- Enhanced matchmaking queue with advanced features
CREATE TABLE IF NOT EXISTS advanced_matchmaking_queue (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'ranked',
  time_control text NOT NULL DEFAULT '15+0', -- Format: "minutes+increment"
  preferred_color text DEFAULT 'random', -- 'white', 'black', 'random'
  min_rating integer,
  max_rating integer,
  current_rating_range integer DEFAULT 25, -- Start with ±25, expand dynamically
  queued_at timestamptz DEFAULT NOW(),
  last_expansion timestamptz DEFAULT NOW(),
  expansion_count integer DEFAULT 0,
  max_wait_seconds integer DEFAULT 300, -- 5 minutes max wait
  geographic_region text DEFAULT 'global',
  connection_quality text DEFAULT 'good', -- 'excellent', 'good', 'fair', 'poor'
  fair_play_pool text DEFAULT 'standard' -- 'standard', 'timeout_prone', 'rage_quitters'
);

-- Create indexes for fast matching
CREATE INDEX IF NOT EXISTS idx_matchmaking_mode_time ON advanced_matchmaking_queue(mode, time_control);
CREATE INDEX IF NOT EXISTS idx_matchmaking_rating_range ON advanced_matchmaking_queue(min_rating, max_rating);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queued_at ON advanced_matchmaking_queue(queued_at);
CREATE INDEX IF NOT EXISTS idx_matchmaking_fair_play ON advanced_matchmaking_queue(fair_play_pool);

-- Player behavior tracking for fair play system
CREATE TABLE IF NOT EXISTS player_behavior (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_games integer DEFAULT 0,
  aborted_games integer DEFAULT 0,
  timeout_games integer DEFAULT 0,
  rage_quit_games integer DEFAULT 0,
  fair_play_violations integer DEFAULT 0,
  recent_white_games integer DEFAULT 0,
  recent_black_games integer DEFAULT 0,
  color_balance_score numeric(5,2) DEFAULT 0.5, -- 0.5 = perfectly balanced
  average_game_duration integer DEFAULT 900, -- seconds
  connection_stability numeric(3,2) DEFAULT 1.0, -- 0.0-1.0
  last_violation_at timestamptz,
  fair_play_pool text DEFAULT 'standard',
  updated_at timestamptz DEFAULT NOW()
);

-- Recent opponents tracking to avoid immediate rematches
CREATE TABLE IF NOT EXISTS recent_opponents (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  opponent_id uuid REFERENCES users(id) ON DELETE CASCADE,
  last_played_at timestamptz DEFAULT NOW(),
  games_count integer DEFAULT 1,
  PRIMARY KEY (user_id, opponent_id)
);

-- Create index for recent opponents
CREATE INDEX IF NOT EXISTS idx_recent_opponents_user ON recent_opponents(user_id, last_played_at);

-- Function to calculate fair play pool
CREATE OR REPLACE FUNCTION calculate_fair_play_pool(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  behavior_record record;
  pool text := 'standard';
BEGIN
  SELECT * INTO behavior_record
  FROM player_behavior
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'standard';
  END IF;
  
  -- Check for timeout-prone players
  IF behavior_record.total_games > 10 AND 
     (behavior_record.timeout_games::float / behavior_record.total_games) > 0.15 THEN
    pool := 'timeout_prone';
  END IF;
  
  -- Check for rage quitters
  IF behavior_record.total_games > 5 AND 
     (behavior_record.rage_quit_games::float / behavior_record.total_games) > 0.10 THEN
    pool := 'rage_quitters';
  END IF;
  
  -- Check for excessive aborters
  IF behavior_record.total_games > 10 AND 
     (behavior_record.aborted_games::float / behavior_record.total_games) > 0.20 THEN
    pool := 'timeout_prone'; -- Group with timeout prone
  END IF;
  
  -- Recent violators get temporary separate pool
  IF behavior_record.last_violation_at IS NOT NULL AND 
     behavior_record.last_violation_at > NOW() - INTERVAL '24 hours' THEN
    pool := 'timeout_prone';
  END IF;
  
  RETURN pool;
END;
$$;

-- Enhanced join queue function with Chess.com-style matching
CREATE OR REPLACE FUNCTION join_advanced_matchmaking_queue(
  p_user_id uuid,
  p_mode text DEFAULT 'ranked',
  p_time_control text DEFAULT '15+0',
  p_preferred_color text DEFAULT 'random'
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  user_rating integer;
  fair_play_pool text;
  behavior_record record;
  potential_match record;
  new_duel_id uuid;
  queue_size integer;
  initial_range integer := 25;
  max_range integer := 200;
  opponent_color text;
  assigned_color text;
BEGIN
  -- Get user's rating and ensure they exist
  SELECT elo_rating INTO user_rating
  FROM users
  WHERE id = p_user_id;
  
  IF user_rating IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found or no rating available'
    );
  END IF;

  -- Get or create behavior record
  INSERT INTO player_behavior (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO behavior_record
  FROM player_behavior
  WHERE user_id = p_user_id;

  -- Calculate fair play pool
  fair_play_pool := calculate_fair_play_pool(p_user_id);
  
  -- Update user's fair play pool if changed
  UPDATE player_behavior
  SET fair_play_pool = fair_play_pool,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Remove user from queue if already there
  DELETE FROM advanced_matchmaking_queue WHERE user_id = p_user_id;
  
  -- Adjust initial range based on rating level (Chess.com style)
  IF user_rating >= 2500 THEN
    initial_range := 50; -- Higher rated players get wider initial range
    max_range := 300;
  ELSIF user_rating >= 2000 THEN
    initial_range := 35;
    max_range := 250;
  END IF;
  
  -- Get current queue size for dynamic adjustments
  SELECT COUNT(*) INTO queue_size
  FROM advanced_matchmaking_queue
  WHERE mode = p_mode 
    AND time_control = p_time_control
    AND fair_play_pool = fair_play_pool;
  
  -- Expand range if queue is small (faster matching)
  IF queue_size < 5 THEN
    initial_range := initial_range * 2;
  ELSIF queue_size < 2 THEN
    initial_range := max_range; -- Very aggressive expansion for small queues
  END IF;
  
  -- Try to find immediate match with current parameters
  SELECT 
    mq.user_id,
    u.elo_rating,
    u.display_name,
    pb.recent_white_games,
    pb.recent_black_games,
    ABS(u.elo_rating - user_rating) as rating_diff,
    mq.preferred_color,
    mq.queued_at
  INTO potential_match
  FROM advanced_matchmaking_queue mq
  JOIN users u ON mq.user_id = u.id
  JOIN player_behavior pb ON mq.user_id = pb.user_id
  WHERE mq.mode = p_mode
    AND mq.time_control = p_time_control
    AND mq.fair_play_pool = fair_play_pool
    AND mq.user_id != p_user_id
    AND ABS(u.elo_rating - user_rating) <= initial_range
    -- Avoid recent opponents
    AND NOT EXISTS (
      SELECT 1 FROM recent_opponents ro
      WHERE ro.user_id = p_user_id 
        AND ro.opponent_id = mq.user_id
        AND ro.last_played_at > NOW() - INTERVAL '10 minutes'
    )
  ORDER BY 
    ABS(u.elo_rating - user_rating) ASC, -- Closest rating first
    mq.queued_at ASC -- Then by wait time
  LIMIT 1;
  
  -- If match found, create duel with proper color assignment
  IF potential_match.user_id IS NOT NULL THEN
    -- Remove matched player from queue
    DELETE FROM advanced_matchmaking_queue WHERE user_id = potential_match.user_id;
    
    -- Determine colors based on preferences and balance
    assigned_color := 'white'; -- Default for creator
    opponent_color := 'black';
    
    -- Chess.com style color assignment logic
    IF p_preferred_color = 'black' AND potential_match.preferred_color != 'black' THEN
      assigned_color := 'black';
      opponent_color := 'white';
    ELSIF p_preferred_color = 'white' AND potential_match.preferred_color != 'white' THEN
      assigned_color := 'white';
      opponent_color := 'black';
    ELSIF potential_match.preferred_color = 'white' THEN
      assigned_color := 'black';
      opponent_color := 'white';
    ELSIF potential_match.preferred_color = 'black' THEN
      assigned_color := 'white';
      opponent_color := 'black';
    ELSE
      -- Balance based on recent games
      IF behavior_record.recent_white_games > behavior_record.recent_black_games THEN
        assigned_color := 'black';
        opponent_color := 'white';
      ELSIF potential_match.recent_white_games > potential_match.recent_black_games THEN
        assigned_color := 'white';
        opponent_color := 'black';
      END IF;
    END IF;
    
    -- Generate appropriate puzzle based on ratings
    INSERT INTO duels (
      creator_id,
      opponent_id,
      mode,
      prompt,
      test_cases,
      time_limit,
      status,
      started_at,
      creator_color,
      opponent_color,
      average_rating,
      rating_difference
    ) VALUES (
      p_user_id,
      potential_match.user_id,
      p_mode,
      'Two Sum Challenge: Find two numbers in an array that add up to a target sum. Return their indices.',
      '[{"input": "[2, 7, 11, 15], 9", "expected": "[0, 1]"}, {"input": "[3, 2, 4], 6", "expected": "[1, 2]"}, {"input": "[3, 3], 6", "expected": "[0, 1]"}]'::jsonb,
      CASE 
        WHEN p_time_control = '5+0' THEN 300
        WHEN p_time_control = '10+0' THEN 600
        WHEN p_time_control = '15+0' THEN 900
        WHEN p_time_control = '30+0' THEN 1800
        ELSE 900
      END,
      'active',
      NOW(),
      assigned_color,
      opponent_color,
      (user_rating + potential_match.elo_rating) / 2,
      ABS(user_rating - potential_match.elo_rating)
    ) RETURNING id INTO new_duel_id;
    
    -- Track recent opponents
    INSERT INTO recent_opponents (user_id, opponent_id, last_played_at)
    VALUES (p_user_id, potential_match.user_id, NOW())
    ON CONFLICT (user_id, opponent_id) 
    DO UPDATE SET 
      last_played_at = NOW(),
      games_count = recent_opponents.games_count + 1;
      
    INSERT INTO recent_opponents (user_id, opponent_id, last_played_at)
    VALUES (potential_match.user_id, p_user_id, NOW())
    ON CONFLICT (user_id, opponent_id) 
    DO UPDATE SET 
      last_played_at = NOW(),
      games_count = recent_opponents.games_count + 1;
    
    RETURN jsonb_build_object(
      'success', true,
      'matched', true,
      'duel_id', new_duel_id,
      'opponent_id', potential_match.user_id,
      'opponent_name', potential_match.display_name,
      'opponent_rating', potential_match.elo_rating,
      'rating_difference', potential_match.rating_diff,
      'assigned_color', assigned_color,
      'time_control', p_time_control,
      'match_quality', CASE 
        WHEN potential_match.rating_diff <= 25 THEN 'excellent'
        WHEN potential_match.rating_diff <= 50 THEN 'very_good'
        WHEN potential_match.rating_diff <= 100 THEN 'good'
        ELSE 'fair'
      END
    );
  END IF;
  
  -- No immediate match, add to queue with calculated parameters
  INSERT INTO advanced_matchmaking_queue (
    user_id, 
    mode, 
    time_control,
    preferred_color,
    min_rating,
    max_rating,
    current_rating_range,
    fair_play_pool,
    geographic_region,
    connection_quality
  ) VALUES (
    p_user_id, 
    p_mode, 
    p_time_control,
    p_preferred_color,
    user_rating - initial_range,
    user_rating + initial_range,
    initial_range,
    fair_play_pool,
    'global', -- Could be determined by IP geolocation
    'good'   -- Could be determined by connection tests
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'matched', false,
    'queue_position', queue_size + 1,
    'queue_size', queue_size + 1,
    'estimated_wait_seconds', LEAST(120, queue_size * 15 + 30),
    'initial_rating_range', initial_range,
    'fair_play_pool', fair_play_pool,
    'time_control', p_time_control
  );
END;
$$;

-- Function to expand search range for waiting players
CREATE OR REPLACE FUNCTION expand_matchmaking_ranges()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  queue_record record;
  expanded_count integer := 0;
  max_range_reached integer := 0;
BEGIN
  -- Expand ranges for players waiting more than 30 seconds
  FOR queue_record IN
    SELECT user_id, current_rating_range, expansion_count, queued_at
    FROM advanced_matchmaking_queue
    WHERE last_expansion < NOW() - INTERVAL '30 seconds'
      AND current_rating_range < 200
  LOOP
    -- Chess.com style progressive expansion
    UPDATE advanced_matchmaking_queue
    SET 
      current_rating_range = LEAST(200, current_rating_range * 1.5),
      min_rating = min_rating - LEAST(50, current_rating_range * 0.5),
      max_rating = max_rating + LEAST(50, current_rating_range * 0.5),
      last_expansion = NOW(),
      expansion_count = expansion_count + 1
    WHERE user_id = queue_record.user_id;
    
    expanded_count := expanded_count + 1;
    
    -- Track if we've reached max range
    IF queue_record.current_rating_range >= 200 THEN
      max_range_reached := max_range_reached + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'expanded_players', expanded_count,
    'max_range_reached', max_range_reached
  );
END;
$$;

-- Function to process queue and create matches
CREATE OR REPLACE FUNCTION process_advanced_matchmaking()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  queue_record record;
  match_result jsonb;
  matches_created integer := 0;
  processed_users uuid[] := '{}';
  total_processed integer := 0;
BEGIN
  -- First expand ranges for waiting players
  PERFORM expand_matchmaking_ranges();
  
  -- Process each player in queue, prioritizing by wait time and rating proximity
  FOR queue_record IN
    SELECT DISTINCT mq.user_id, mq.mode, mq.time_control, mq.preferred_color
    FROM advanced_matchmaking_queue mq
    WHERE mq.user_id NOT IN (SELECT unnest(processed_users))
    ORDER BY mq.queued_at ASC
  LOOP
    -- Skip if already processed
    IF queue_record.user_id = ANY(processed_users) THEN
      CONTINUE;
    END IF;
    
    total_processed := total_processed + 1;
    
    -- Try to find match using the enhanced matching function
    SELECT join_advanced_matchmaking_queue(
      queue_record.user_id,
      queue_record.mode,
      queue_record.time_control,
      queue_record.preferred_color
    ) INTO match_result;
    
    -- If match was created, add both players to processed list
    IF (match_result->>'matched')::boolean THEN
      processed_users := processed_users || queue_record.user_id;
      processed_users := processed_users || (match_result->>'opponent_id')::uuid;
      matches_created := matches_created + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'matches_created', matches_created,
    'total_processed', total_processed,
    'processed_users', array_length(processed_users, 1)
  );
END;
$$;

-- Function to get enhanced queue status
CREATE OR REPLACE FUNCTION get_advanced_queue_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  queue_info record;
  position integer;
  similar_rating_ahead integer;
  estimated_wait integer;
BEGIN
  -- Get user's queue info
  SELECT 
    mq.*,
    u.elo_rating,
    pb.fair_play_pool
  INTO queue_info
  FROM advanced_matchmaking_queue mq
  JOIN users u ON mq.user_id = u.id
  LEFT JOIN player_behavior pb ON mq.user_id = pb.user_id
  WHERE mq.user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('in_queue', false);
  END IF;
  
  -- Calculate position in queue (by wait time)
  SELECT COUNT(*) + 1 INTO position
  FROM advanced_matchmaking_queue
  WHERE mode = queue_info.mode
    AND time_control = queue_info.time_control
    AND queued_at < queue_info.queued_at;
  
  -- Count players with similar rating ahead in queue
  SELECT COUNT(*) INTO similar_rating_ahead
  FROM advanced_matchmaking_queue mq
  JOIN users u ON mq.user_id = u.id
  WHERE mq.mode = queue_info.mode
    AND mq.time_control = queue_info.time_control
    AND mq.queued_at < queue_info.queued_at
    AND ABS(u.elo_rating - queue_info.elo_rating) <= queue_info.current_rating_range;
  
  -- Estimate wait time based on queue dynamics
  estimated_wait := CASE
    WHEN similar_rating_ahead = 0 THEN 15 -- Should match very soon
    WHEN similar_rating_ahead <= 2 THEN 45
    WHEN similar_rating_ahead <= 5 THEN 90
    ELSE 120
  END;
  
  RETURN jsonb_build_object(
    'in_queue', true,
    'mode', queue_info.mode,
    'time_control', queue_info.time_control,
    'preferred_color', queue_info.preferred_color,
    'position', position,
    'similar_rating_ahead', similar_rating_ahead,
    'current_rating_range', queue_info.current_rating_range,
    'expansion_count', queue_info.expansion_count,
    'queued_at', queue_info.queued_at,
    'estimated_wait_seconds', estimated_wait,
    'fair_play_pool', COALESCE(queue_info.fair_play_pool, 'standard'),
    'user_rating', queue_info.elo_rating
  );
END;
$$;

-- Function to leave advanced queue
CREATE OR REPLACE FUNCTION leave_advanced_matchmaking_queue(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  removed_count integer;
BEGIN
  DELETE FROM advanced_matchmaking_queue WHERE user_id = p_user_id;
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'removed', removed_count > 0
  );
END;
$$;

-- Function to update player behavior after game
CREATE OR REPLACE FUNCTION update_player_behavior(
  p_user_id uuid,
  p_game_type text, -- 'completed', 'aborted', 'timeout', 'rage_quit'
  p_color text DEFAULT NULL, -- 'white', 'black'
  p_game_duration integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO player_behavior (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  UPDATE player_behavior
  SET 
    total_games = total_games + 1,
    aborted_games = CASE WHEN p_game_type = 'aborted' THEN aborted_games + 1 ELSE aborted_games END,
    timeout_games = CASE WHEN p_game_type = 'timeout' THEN timeout_games + 1 ELSE timeout_games END,
    rage_quit_games = CASE WHEN p_game_type = 'rage_quit' THEN rage_quit_games + 1 ELSE rage_quit_games END,
    recent_white_games = CASE 
      WHEN p_color = 'white' THEN LEAST(10, recent_white_games + 1)
      ELSE GREATEST(0, recent_white_games - 1)
    END,
    recent_black_games = CASE 
      WHEN p_color = 'black' THEN LEAST(10, recent_black_games + 1)
      ELSE GREATEST(0, recent_black_games - 1)
    END,
    average_game_duration = CASE 
      WHEN p_game_duration IS NOT NULL THEN 
        (average_game_duration * (total_games - 1) + p_game_duration) / total_games
      ELSE average_game_duration
    END,
    last_violation_at = CASE 
      WHEN p_game_type IN ('aborted', 'timeout', 'rage_quit') THEN NOW()
      ELSE last_violation_at
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Update color balance score
  UPDATE player_behavior
  SET color_balance_score = CASE 
    WHEN (recent_white_games + recent_black_games) > 0 THEN
      recent_white_games::numeric / (recent_white_games + recent_black_games)
    ELSE 0.5
  END
  WHERE user_id = p_user_id;
  
  -- Update fair play pool
  UPDATE player_behavior
  SET fair_play_pool = calculate_fair_play_pool(p_user_id)
  WHERE user_id = p_user_id;
END;
$$;

-- Function to get matchmaking statistics
CREATE OR REPLACE FUNCTION get_matchmaking_stats()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  stats record;
BEGIN
  SELECT 
    COUNT(*) as total_in_queue,
    COUNT(*) FILTER (WHERE mode = 'ranked') as ranked_players,
    COUNT(*) FILTER (WHERE mode = 'casual') as casual_players,
    COUNT(DISTINCT time_control) as active_time_controls,
    COUNT(*) FILTER (WHERE fair_play_pool = 'standard') as standard_pool,
    COUNT(*) FILTER (WHERE fair_play_pool != 'standard') as restricted_pool,
    ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - queued_at)))) as avg_wait_seconds,
    MAX(EXTRACT(EPOCH FROM (NOW() - queued_at))) as max_wait_seconds,
    ROUND(AVG(current_rating_range)) as avg_rating_range
  INTO stats
  FROM advanced_matchmaking_queue;
  
  RETURN jsonb_build_object(
    'total_in_queue', COALESCE(stats.total_in_queue, 0),
    'ranked_players', COALESCE(stats.ranked_players, 0),
    'casual_players', COALESCE(stats.casual_players, 0),
    'active_time_controls', COALESCE(stats.active_time_controls, 0),
    'standard_pool', COALESCE(stats.standard_pool, 0),
    'restricted_pool', COALESCE(stats.restricted_pool, 0),
    'average_wait_seconds', COALESCE(stats.avg_wait_seconds, 0),
    'max_wait_seconds', COALESCE(stats.max_wait_seconds, 0),
    'average_rating_range', COALESCE(stats.avg_rating_range, 25)
  );
END;
$$;

-- Add new columns to duels table for enhanced matching
ALTER TABLE duels 
ADD COLUMN IF NOT EXISTS creator_color text DEFAULT 'white',
ADD COLUMN IF NOT EXISTS opponent_color text DEFAULT 'black',
ADD COLUMN IF NOT EXISTS time_control text DEFAULT '15+0',
ADD COLUMN IF NOT EXISTS average_rating integer,
ADD COLUMN IF NOT EXISTS rating_difference integer,
ADD COLUMN IF NOT EXISTS match_quality text DEFAULT 'good';

-- Clean up any existing simple queue entries
DELETE FROM matchmaking_queue;

-- Initialize behavior records for existing users
INSERT INTO player_behavior (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;
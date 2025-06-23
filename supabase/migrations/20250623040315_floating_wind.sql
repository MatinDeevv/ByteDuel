-- Fix ambiguous column references in matchmaking functions

-- Drop and recreate the join_advanced_matchmaking_queue function with proper column qualification
DROP FUNCTION IF EXISTS join_advanced_matchmaking_queue(uuid, text, text, text);

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
  user_fair_play_pool text;
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
  user_fair_play_pool := calculate_fair_play_pool(p_user_id);
  
  -- Update user's fair play pool if changed
  UPDATE player_behavior
  SET fair_play_pool = user_fair_play_pool,
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
  FROM advanced_matchmaking_queue amq
  WHERE amq.mode = p_mode 
    AND amq.time_control = p_time_control
    AND amq.fair_play_pool = user_fair_play_pool;
  
  -- Expand range if queue is small (faster matching)
  IF queue_size < 5 THEN
    initial_range := initial_range * 2;
  ELSIF queue_size < 2 THEN
    initial_range := max_range; -- Very aggressive expansion for small queues
  END IF;
  
  -- Try to find immediate match with current parameters
  SELECT 
    amq.user_id,
    u.elo_rating,
    u.display_name,
    pb.recent_white_games,
    pb.recent_black_games,
    ABS(u.elo_rating - user_rating) as rating_diff,
    amq.preferred_color,
    amq.queued_at
  INTO potential_match
  FROM advanced_matchmaking_queue amq
  JOIN users u ON amq.user_id = u.id
  JOIN player_behavior pb ON amq.user_id = pb.user_id
  WHERE amq.mode = p_mode
    AND amq.time_control = p_time_control
    AND amq.fair_play_pool = user_fair_play_pool  -- Use variable instead of ambiguous reference
    AND amq.user_id != p_user_id
    AND ABS(u.elo_rating - user_rating) <= initial_range
    -- Avoid recent opponents
    AND NOT EXISTS (
      SELECT 1 FROM recent_opponents ro
      WHERE ro.user_id = p_user_id 
        AND ro.opponent_id = amq.user_id
        AND ro.last_played_at > NOW() - INTERVAL '10 minutes'
    )
  ORDER BY 
    ABS(u.elo_rating - user_rating) ASC, -- Closest rating first
    amq.queued_at ASC -- Then by wait time
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
      time_control,
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
      p_time_control,
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
    user_fair_play_pool,
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
    'fair_play_pool', user_fair_play_pool,
    'time_control', p_time_control
  );
END;
$$;

-- Fix the get_matchmaking_stats function with proper table aliases
DROP FUNCTION IF EXISTS get_matchmaking_stats();

CREATE OR REPLACE FUNCTION get_matchmaking_stats()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  stats record;
BEGIN
  SELECT 
    COUNT(*) as total_in_queue,
    COUNT(*) FILTER (WHERE amq.mode = 'ranked') as ranked_players,
    COUNT(*) FILTER (WHERE amq.mode = 'casual') as casual_players,
    COUNT(DISTINCT amq.time_control) as active_time_controls,
    COUNT(*) FILTER (WHERE amq.fair_play_pool = 'standard') as standard_pool,
    COUNT(*) FILTER (WHERE amq.fair_play_pool != 'standard') as restricted_pool,
    ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - amq.queued_at)))) as avg_wait_seconds,
    MAX(EXTRACT(EPOCH FROM (NOW() - amq.queued_at))) as max_wait_seconds,
    ROUND(AVG(amq.current_rating_range)) as avg_rating_range
  INTO stats
  FROM advanced_matchmaking_queue amq;
  
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

-- Fix the expand_matchmaking_ranges function with proper table aliases
DROP FUNCTION IF EXISTS expand_matchmaking_ranges();

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
    SELECT amq.user_id, amq.current_rating_range, amq.expansion_count, amq.queued_at
    FROM advanced_matchmaking_queue amq
    WHERE amq.last_expansion < NOW() - INTERVAL '30 seconds'
      AND amq.current_rating_range < 200
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
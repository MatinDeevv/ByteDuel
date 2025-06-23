/*
  # Fix Matchmaking System - Ensure Users Get Matched

  1. Simplified Matching Logic
    - Create a dedicated function to find matches between queued players
    - Fix the queue processing to avoid removing/re-adding users
    - Add better debugging and logging

  2. Immediate Matching
    - Improve the immediate matching when joining queue
    - Ensure same ELO users are matched instantly

  3. Queue Processing
    - Fix periodic processing to properly match existing queue members
    - Add better logic for finding compatible players
*/

-- Drop and recreate the main matching functions with better logic
DROP FUNCTION IF EXISTS process_advanced_matchmaking();
DROP FUNCTION IF EXISTS find_best_match_for_user(uuid, integer);

-- Function to find and create a match between two specific users
CREATE OR REPLACE FUNCTION create_match_between_users(
  p_user1_id uuid,
  p_user2_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  user1_info record;
  user2_info record;
  new_duel_id uuid;
  assigned_color text;
  opponent_color text;
BEGIN
  -- Get both users' queue info
  SELECT 
    amq.mode, amq.time_control, amq.preferred_color,
    u.elo_rating, u.display_name,
    pb.recent_white_games, pb.recent_black_games
  INTO user1_info
  FROM advanced_matchmaking_queue amq
  JOIN users u ON amq.user_id = u.id
  LEFT JOIN player_behavior pb ON amq.user_id = pb.user_id
  WHERE amq.user_id = p_user1_id;
  
  SELECT 
    amq.mode, amq.time_control, amq.preferred_color,
    u.elo_rating, u.display_name,
    pb.recent_white_games, pb.recent_black_games
  INTO user2_info
  FROM advanced_matchmaking_queue amq
  JOIN users u ON amq.user_id = u.id
  LEFT JOIN player_behavior pb ON amq.user_id = pb.user_id
  WHERE amq.user_id = p_user2_id;
  
  -- Validate both users exist and have compatible settings
  IF user1_info.mode IS NULL OR user2_info.mode IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'One or both users not in queue');
  END IF;
  
  IF user1_info.mode != user2_info.mode OR user1_info.time_control != user2_info.time_control THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incompatible game settings');
  END IF;
  
  -- Remove both users from queue
  DELETE FROM advanced_matchmaking_queue 
  WHERE user_id IN (p_user1_id, p_user2_id);
  
  -- Determine colors
  assigned_color := 'white';
  opponent_color := 'black';
  
  -- Color assignment logic
  IF user1_info.preferred_color = 'black' AND user2_info.preferred_color != 'black' THEN
    assigned_color := 'black';
    opponent_color := 'white';
  ELSIF user1_info.preferred_color = 'white' AND user2_info.preferred_color != 'white' THEN
    assigned_color := 'white';
    opponent_color := 'black';
  ELSIF user2_info.preferred_color = 'white' THEN
    assigned_color := 'black';
    opponent_color := 'white';
  ELSIF user2_info.preferred_color = 'black' THEN
    assigned_color := 'white';
    opponent_color := 'black';
  ELSE
    -- Balance based on recent games
    IF COALESCE(user1_info.recent_white_games, 0) > COALESCE(user1_info.recent_black_games, 0) THEN
      assigned_color := 'black';
      opponent_color := 'white';
    ELSIF COALESCE(user2_info.recent_white_games, 0) > COALESCE(user2_info.recent_black_games, 0) THEN
      assigned_color := 'white';
      opponent_color := 'black';
    END IF;
  END IF;
  
  -- Create the duel
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
    p_user1_id,
    p_user2_id,
    user1_info.mode,
    'Two Sum Challenge: Find two numbers in an array that add up to a target sum. Return their indices.',
    '[{"input": "[2, 7, 11, 15], 9", "expected": "[0, 1]"}, {"input": "[3, 2, 4], 6", "expected": "[1, 2]"}, {"input": "[3, 3], 6", "expected": "[0, 1]"}]'::jsonb,
    CASE 
      WHEN user1_info.time_control = '5+0' THEN 300
      WHEN user1_info.time_control = '10+0' THEN 600
      WHEN user1_info.time_control = '15+0' THEN 900
      WHEN user1_info.time_control = '30+0' THEN 1800
      ELSE 900
    END,
    'active',
    NOW(),
    assigned_color,
    opponent_color,
    user1_info.time_control,
    (user1_info.elo_rating + user2_info.elo_rating) / 2,
    ABS(user1_info.elo_rating - user2_info.elo_rating)
  ) RETURNING id INTO new_duel_id;
  
  -- Track recent opponents
  INSERT INTO recent_opponents (user_id, opponent_id, last_played_at)
  VALUES (p_user1_id, p_user2_id, NOW())
  ON CONFLICT (user_id, opponent_id) 
  DO UPDATE SET 
    last_played_at = NOW(),
    games_count = recent_opponents.games_count + 1;
    
  INSERT INTO recent_opponents (user_id, opponent_id, last_played_at)
  VALUES (p_user2_id, p_user1_id, NOW())
  ON CONFLICT (user_id, opponent_id) 
  DO UPDATE SET 
    last_played_at = NOW(),
    games_count = recent_opponents.games_count + 1;
  
  RETURN jsonb_build_object(
    'success', true,
    'duel_id', new_duel_id,
    'user1_id', p_user1_id,
    'user2_id', p_user2_id,
    'user1_name', user1_info.display_name,
    'user2_name', user2_info.display_name,
    'user1_color', assigned_color,
    'user2_color', opponent_color,
    'rating_difference', ABS(user1_info.elo_rating - user2_info.elo_rating)
  );
END;
$$;

-- Improved function to find matches in the queue
CREATE OR REPLACE FUNCTION find_queue_matches()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  match_pair record;
  match_result jsonb;
  matches_created integer := 0;
  processed_users uuid[] := '{}';
BEGIN
  RAISE NOTICE 'Starting queue match finding...';
  
  -- Look for compatible pairs in the queue
  FOR match_pair IN
    SELECT DISTINCT
      amq1.user_id as user1_id,
      amq2.user_id as user2_id,
      u1.display_name as user1_name,
      u2.display_name as user2_name,
      u1.elo_rating as user1_rating,
      u2.elo_rating as user2_rating,
      ABS(u1.elo_rating - u2.elo_rating) as rating_diff
    FROM advanced_matchmaking_queue amq1
    JOIN users u1 ON amq1.user_id = u1.id
    JOIN advanced_matchmaking_queue amq2 ON (
      amq2.user_id != amq1.user_id
      AND amq2.mode = amq1.mode
      AND amq2.time_control = amq1.time_control
      AND amq2.fair_play_pool = amq1.fair_play_pool
    )
    JOIN users u2 ON amq2.user_id = u2.id
    WHERE amq1.user_id < amq2.user_id  -- Avoid duplicate pairs
      AND amq1.user_id NOT IN (SELECT unnest(processed_users))
      AND amq2.user_id NOT IN (SELECT unnest(processed_users))
      -- Check rating compatibility (expand range based on wait time)
      AND ABS(u1.elo_rating - u2.elo_rating) <= GREATEST(
        amq1.current_rating_range,
        amq2.current_rating_range
      )
      -- Avoid recent opponents
      AND NOT EXISTS (
        SELECT 1 FROM recent_opponents ro
        WHERE (ro.user_id = amq1.user_id AND ro.opponent_id = amq2.user_id)
           OR (ro.user_id = amq2.user_id AND ro.opponent_id = amq1.user_id)
        AND ro.last_played_at > NOW() - INTERVAL '10 minutes'
      )
    ORDER BY 
      ABS(u1.elo_rating - u2.elo_rating) ASC,  -- Closest ratings first
      GREATEST(amq1.queued_at, amq2.queued_at) ASC  -- Longest waiting players first
    LIMIT 50  -- Process up to 50 potential matches at a time
  LOOP
    RAISE NOTICE 'Attempting to match % (%) with % (%) - rating diff: %', 
      match_pair.user1_name, match_pair.user1_rating,
      match_pair.user2_name, match_pair.user2_rating,
      match_pair.rating_diff;
    
    -- Skip if either user is already processed
    IF match_pair.user1_id = ANY(processed_users) OR match_pair.user2_id = ANY(processed_users) THEN
      CONTINUE;
    END IF;
    
    -- Try to create match
    SELECT create_match_between_users(match_pair.user1_id, match_pair.user2_id) INTO match_result;
    
    IF (match_result->>'success')::boolean THEN
      RAISE NOTICE 'Successfully created match between % and %', match_pair.user1_name, match_pair.user2_name;
      processed_users := processed_users || match_pair.user1_id || match_pair.user2_id;
      matches_created := matches_created + 1;
    ELSE
      RAISE NOTICE 'Failed to create match: %', match_result->>'error';
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Queue processing complete. Created % matches.', matches_created;
  
  RETURN jsonb_build_object(
    'matches_created', matches_created,
    'processed_users_count', array_length(processed_users, 1)
  );
END;
$$;

-- Simplified process_advanced_matchmaking function
CREATE OR REPLACE FUNCTION process_advanced_matchmaking()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  expansion_result jsonb;
  matching_result jsonb;
BEGIN
  RAISE NOTICE 'Processing advanced matchmaking queue...';
  
  -- First expand search ranges for waiting players
  SELECT expand_matchmaking_ranges() INTO expansion_result;
  RAISE NOTICE 'Expanded ranges for % players', expansion_result->>'expanded_players';
  
  -- Then find matches in the queue
  SELECT find_queue_matches() INTO matching_result;
  
  RETURN jsonb_build_object(
    'matches_created', matching_result->>'matches_created',
    'expanded_players', expansion_result->>'expanded_players',
    'success', true
  );
END;
$$;

-- Function to manually trigger a match check (for debugging)
CREATE OR REPLACE FUNCTION debug_check_queue()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  queue_info jsonb;
  match_result jsonb;
BEGIN
  -- Get current queue status
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', amq.user_id,
      'display_name', u.display_name,
      'elo_rating', u.elo_rating,
      'mode', amq.mode,
      'time_control', amq.time_control,
      'fair_play_pool', amq.fair_play_pool,
      'current_rating_range', amq.current_rating_range,
      'queued_at', amq.queued_at,
      'expansion_count', amq.expansion_count
    )
  ) INTO queue_info
  FROM advanced_matchmaking_queue amq
  JOIN users u ON amq.user_id = u.id
  ORDER BY amq.queued_at;
  
  -- Try to find matches
  SELECT find_queue_matches() INTO match_result;
  
  RETURN jsonb_build_object(
    'queue_status', COALESCE(queue_info, '[]'::jsonb),
    'matching_result', match_result
  );
END;
$$;

-- Update the join function to be more aggressive about immediate matching
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
  initial_range integer := 50; -- Start with wider range
  max_range integer := 200;
  match_result jsonb;
BEGIN
  RAISE NOTICE 'User % joining queue for % %', p_user_id, p_mode, p_time_control;
  
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
  
  -- Calculate fair play pool
  user_fair_play_pool := calculate_fair_play_pool(p_user_id);
  
  -- Update user's fair play pool if changed
  UPDATE player_behavior
  SET fair_play_pool = user_fair_play_pool,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Remove user from queue if already there
  DELETE FROM advanced_matchmaking_queue WHERE user_id = p_user_id;
  
  -- Get current queue size
  SELECT COUNT(*) INTO queue_size
  FROM advanced_matchmaking_queue amq
  WHERE amq.mode = p_mode 
    AND amq.time_control = p_time_control
    AND amq.fair_play_pool = user_fair_play_pool;
  
  RAISE NOTICE 'Queue size for % % %: %', p_mode, p_time_control, user_fair_play_pool, queue_size;
  
  -- If queue is small, use very wide range for faster matching
  IF queue_size <= 5 THEN
    initial_range := 500; -- Very wide range for small queues
  END IF;
  
  -- Try to find immediate match with current parameters
  SELECT 
    amq.user_id,
    u.elo_rating,
    u.display_name,
    ABS(u.elo_rating - user_rating) as rating_diff,
    amq.preferred_color,
    amq.queued_at
  INTO potential_match
  FROM advanced_matchmaking_queue amq
  JOIN users u ON amq.user_id = u.id
  WHERE amq.mode = p_mode
    AND amq.time_control = p_time_control
    AND amq.fair_play_pool = user_fair_play_pool
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
  
  -- If match found, create duel immediately
  IF potential_match.user_id IS NOT NULL THEN
    RAISE NOTICE 'Found immediate match: % (%) vs % (%)', 
      p_user_id, user_rating, potential_match.user_id, potential_match.elo_rating;
    
    SELECT create_match_between_users(p_user_id, potential_match.user_id) INTO match_result;
    
    IF (match_result->>'success')::boolean THEN
      RETURN jsonb_build_object(
        'success', true,
        'matched', true,
        'duel_id', match_result->>'duel_id',
        'opponent_id', potential_match.user_id,
        'opponent_name', potential_match.display_name,
        'opponent_rating', potential_match.elo_rating,
        'rating_difference', potential_match.rating_diff,
        'assigned_color', match_result->>'user1_color',
        'time_control', p_time_control,
        'match_quality', CASE 
          WHEN potential_match.rating_diff <= 25 THEN 'excellent'
          WHEN potential_match.rating_diff <= 50 THEN 'very_good'
          WHEN potential_match.rating_diff <= 100 THEN 'good'
          ELSE 'fair'
        END
      );
    END IF;
  END IF;
  
  -- No immediate match, add to queue
  RAISE NOTICE 'No immediate match found, adding % to queue', p_user_id;
  
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
    'global',
    'good'
  );
  
  -- Immediately try to process the queue to find matches
  PERFORM find_queue_matches();
  
  RETURN jsonb_build_object(
    'success', true,
    'matched', false,
    'queue_position', queue_size + 1,
    'queue_size', queue_size + 1,
    'estimated_wait_seconds', LEAST(60, queue_size * 10 + 15),
    'initial_rating_range', initial_range,
    'fair_play_pool', user_fair_play_pool,
    'time_control', p_time_control
  );
END;
$$;

-- Clean up any stale queue entries and test the matching
SELECT cleanup_stale_queue_entries();

-- Test function to verify matching works
SELECT debug_check_queue();
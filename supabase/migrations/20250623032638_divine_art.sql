/*
  # Fast ELO-based Matchmaking System

  1. New Functions
    - `join_matchmaking_queue` - Join queue with ELO-based matching
    - `find_best_match` - Find closest ELO match quickly
    - `create_match_from_queue` - Auto-create matches
    - `get_queue_position` - Get user's position in queue
    
  2. Enhanced matchmaking
    - ELO-based matching with configurable range
    - Fast matching when queue is small
    - Automatic match creation
    - Queue position tracking
*/

-- Enhanced function to join matchmaking queue with immediate matching attempt
CREATE OR REPLACE FUNCTION join_matchmaking_queue(
  p_user_id uuid,
  p_mode text DEFAULT 'ranked',
  p_max_elo_diff integer DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  user_elo integer;
  potential_match record;
  new_duel_id uuid;
  queue_size integer;
  result jsonb;
BEGIN
  -- Get user's ELO rating
  SELECT elo_rating INTO user_elo
  FROM users
  WHERE id = p_user_id;
  
  IF user_elo IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found or no ELO rating'
    );
  END IF;

  -- Remove user from queue if already there
  DELETE FROM matchmaking_queue WHERE user_id = p_user_id;
  
  -- Get current queue size for the mode
  SELECT COUNT(*) INTO queue_size
  FROM matchmaking_queue
  WHERE mode = p_mode;
  
  -- If queue is small (less than 10 players), expand ELO range for faster matching
  IF queue_size < 10 THEN
    p_max_elo_diff := p_max_elo_diff * 2; -- Double the ELO range
  END IF;
  
  -- Try to find an immediate match with similar ELO
  SELECT 
    mq.user_id,
    u.elo_rating,
    u.display_name,
    ABS(u.elo_rating - user_elo) as elo_diff
  INTO potential_match
  FROM matchmaking_queue mq
  JOIN users u ON mq.user_id = u.id
  WHERE mq.mode = p_mode
    AND mq.user_id != p_user_id
    AND ABS(u.elo_rating - user_elo) <= p_max_elo_diff
  ORDER BY 
    ABS(u.elo_rating - user_elo) ASC,
    mq.queued_at ASC
  LIMIT 1;
  
  -- If we found a match, create a duel immediately
  IF potential_match.user_id IS NOT NULL THEN
    -- Remove the matched player from queue
    DELETE FROM matchmaking_queue WHERE user_id = potential_match.user_id;
    
    -- Generate a puzzle for the duel (simplified for now)
    INSERT INTO duels (
      creator_id,
      opponent_id,
      mode,
      prompt,
      test_cases,
      time_limit,
      status,
      started_at
    ) VALUES (
      p_user_id,
      potential_match.user_id,
      p_mode,
      'Two Sum Problem: Given an array of integers and a target sum, return the indices of two numbers that add up to the target.',
      '[{"input": "[2, 7, 11, 15], 9", "expected": "[0, 1]"}, {"input": "[3, 2, 4], 6", "expected": "[1, 2]"}, {"input": "[3, 3], 6", "expected": "[0, 1]"}]'::jsonb,
      900, -- 15 minutes
      'active',
      NOW()
    ) RETURNING id INTO new_duel_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'matched', true,
      'duel_id', new_duel_id,
      'opponent_id', potential_match.user_id,
      'opponent_name', potential_match.display_name,
      'opponent_elo', potential_match.elo_rating,
      'elo_difference', potential_match.elo_diff
    );
  END IF;
  
  -- No immediate match found, add to queue
  INSERT INTO matchmaking_queue (user_id, mode, queued_at)
  VALUES (p_user_id, p_mode, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    mode = EXCLUDED.mode,
    queued_at = EXCLUDED.queued_at;
  
  -- Get queue position
  SELECT COUNT(*) + 1 INTO result
  FROM matchmaking_queue mq
  JOIN users u ON mq.user_id = u.id
  WHERE mq.mode = p_mode
    AND mq.queued_at < NOW()
    AND ABS(u.elo_rating - user_elo) <= p_max_elo_diff;
  
  RETURN jsonb_build_object(
    'success', true,
    'matched', false,
    'queue_position', COALESCE(result, 1),
    'queue_size', queue_size + 1,
    'estimated_wait_seconds', LEAST(60, queue_size * 10)
  );
END;
$$;

-- Function to find best match for a user already in queue
CREATE OR REPLACE FUNCTION find_best_match_for_user(
  p_user_id uuid,
  p_max_elo_diff integer DEFAULT 300
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  user_record record;
  potential_match record;
  new_duel_id uuid;
  queue_size integer;
BEGIN
  -- Get user info from queue
  SELECT mq.mode, u.elo_rating, u.display_name
  INTO user_record
  FROM matchmaking_queue mq
  JOIN users u ON mq.user_id = u.id
  WHERE mq.user_id = p_user_id;
  
  IF user_record.mode IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not in queue'
    );
  END IF;
  
  -- Get queue size
  SELECT COUNT(*) INTO queue_size
  FROM matchmaking_queue
  WHERE mode = user_record.mode;
  
  -- Expand ELO range if queue is small
  IF queue_size < 5 THEN
    p_max_elo_diff := p_max_elo_diff * 3;
  ELSIF queue_size < 10 THEN
    p_max_elo_diff := p_max_elo_diff * 2;
  END IF;
  
  -- Find best match
  SELECT 
    mq.user_id,
    u.elo_rating,
    u.display_name,
    ABS(u.elo_rating - user_record.elo_rating) as elo_diff
  INTO potential_match
  FROM matchmaking_queue mq
  JOIN users u ON mq.user_id = u.id
  WHERE mq.mode = user_record.mode
    AND mq.user_id != p_user_id
    AND ABS(u.elo_rating - user_record.elo_rating) <= p_max_elo_diff
  ORDER BY 
    ABS(u.elo_rating - user_record.elo_rating) ASC,
    mq.queued_at ASC
  LIMIT 1;
  
  -- If match found, create duel
  IF potential_match.user_id IS NOT NULL THEN
    -- Remove both players from queue
    DELETE FROM matchmaking_queue 
    WHERE user_id IN (p_user_id, potential_match.user_id);
    
    -- Create duel
    INSERT INTO duels (
      creator_id,
      opponent_id,
      mode,
      prompt,
      test_cases,
      time_limit,
      status,
      started_at
    ) VALUES (
      p_user_id,
      potential_match.user_id,
      user_record.mode,
      'Two Sum Problem: Given an array of integers and a target sum, return the indices of two numbers that add up to the target.',
      '[{"input": "[2, 7, 11, 15], 9", "expected": "[0, 1]"}, {"input": "[3, 2, 4], 6", "expected": "[1, 2]"}, {"input": "[3, 3], 6", "expected": "[0, 1]"}]'::jsonb,
      900,
      'active',
      NOW()
    ) RETURNING id INTO new_duel_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'matched', true,
      'duel_id', new_duel_id,
      'opponent_id', potential_match.user_id,
      'opponent_name', potential_match.display_name,
      'opponent_elo', potential_match.elo_rating,
      'elo_difference', potential_match.elo_diff
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'matched', false,
    'message', 'No suitable match found yet'
  );
END;
$$;

-- Function to get user's queue status
CREATE OR REPLACE FUNCTION get_queue_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  queue_info record;
  position integer;
  queue_size integer;
  wait_time_estimate integer;
BEGIN
  -- Check if user is in queue
  SELECT mq.mode, mq.queued_at, u.elo_rating
  INTO queue_info
  FROM matchmaking_queue mq
  JOIN users u ON mq.user_id = u.id
  WHERE mq.user_id = p_user_id;
  
  IF queue_info.mode IS NULL THEN
    RETURN jsonb_build_object(
      'in_queue', false
    );
  END IF;
  
  -- Get queue size for mode
  SELECT COUNT(*) INTO queue_size
  FROM matchmaking_queue
  WHERE mode = queue_info.mode;
  
  -- Calculate position (based on queue time and ELO similarity)
  SELECT COUNT(*) + 1 INTO position
  FROM matchmaking_queue mq
  JOIN users u ON mq.user_id = u.id
  WHERE mq.mode = queue_info.mode
    AND mq.queued_at < queue_info.queued_at;
  
  -- Estimate wait time (faster when fewer players)
  wait_time_estimate := CASE 
    WHEN queue_size <= 2 THEN 30
    WHEN queue_size <= 5 THEN 60
    WHEN queue_size <= 10 THEN 90
    ELSE 120
  END;
  
  RETURN jsonb_build_object(
    'in_queue', true,
    'mode', queue_info.mode,
    'position', position,
    'queue_size', queue_size,
    'queued_at', queue_info.queued_at,
    'estimated_wait_seconds', wait_time_estimate,
    'user_elo', queue_info.elo_rating
  );
END;
$$;

-- Function to process queue and find matches periodically
CREATE OR REPLACE FUNCTION process_matchmaking_queue()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  player_record record;
  match_result jsonb;
  matches_created integer := 0;
  processed_users uuid[] := '{}';
BEGIN
  -- Process players in queue order, but prioritize by wait time
  FOR player_record IN
    SELECT mq.user_id, mq.queued_at
    FROM matchmaking_queue mq
    WHERE mq.user_id NOT IN (SELECT unnest(processed_users))
    ORDER BY mq.queued_at ASC
  LOOP
    -- Skip if already processed
    IF player_record.user_id = ANY(processed_users) THEN
      CONTINUE;
    END IF;
    
    -- Try to find match for this player
    SELECT find_best_match_for_user(player_record.user_id) INTO match_result;
    
    -- If match was created, add both players to processed list
    IF (match_result->>'matched')::boolean THEN
      processed_users := processed_users || player_record.user_id;
      processed_users := processed_users || (match_result->>'opponent_id')::uuid;
      matches_created := matches_created + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'matches_created', matches_created,
    'processed_users', array_length(processed_users, 1)
  );
END;
$$;

-- Function to leave matchmaking queue
CREATE OR REPLACE FUNCTION leave_matchmaking_queue(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  removed_count integer;
BEGIN
  DELETE FROM matchmaking_queue WHERE user_id = p_user_id;
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'removed', removed_count > 0
  );
END;
$$;

-- Clean up stale entries and process queue
SELECT cleanup_stale_queue_entries();
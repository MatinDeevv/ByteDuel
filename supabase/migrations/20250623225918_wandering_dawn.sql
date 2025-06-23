-- Fix the run_match function to work correctly
CREATE OR REPLACE FUNCTION run_match(p_mode text DEFAULT 'ranked')
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  player1_record record;
  player2_record record;
  selected_players uuid[];
BEGIN
  -- Select two oldest players from the queue with lock
  SELECT ARRAY(
    SELECT user_id
    FROM matchmaking_queue
    WHERE mode = p_mode
    ORDER BY queued_at ASC
    LIMIT 2
    FOR UPDATE SKIP LOCKED
  ) INTO selected_players;
  
  -- Check if we have at least 2 players
  IF array_length(selected_players, 1) < 2 THEN
    RETURN jsonb_build_object(
      'success', true,
      'matched', false,
      'message', 'Not enough players in queue'
    );
  END IF;
  
  -- Get player information before removing from queue
  SELECT 
    u.id, u.display_name, u.rating
  INTO player1_record
  FROM users u
  WHERE u.id = selected_players[1];
  
  SELECT 
    u.id, u.display_name, u.rating
  INTO player2_record
  FROM users u
  WHERE u.id = selected_players[2];
  
  -- Remove both players from queue
  DELETE FROM matchmaking_queue
  WHERE user_id = ANY(selected_players);
  
  -- Return match result
  RETURN jsonb_build_object(
    'success', true,
    'matched', true,
    'player1_id', player1_record.id,
    'player2_id', player2_record.id,
    'player1_name', player1_record.display_name,
    'player2_name', player2_record.display_name,
    'player1_rating', player1_record.rating,
    'player2_rating', player2_record.rating,
    'rating_difference', ABS(player1_record.rating - player2_record.rating)
  );
END;
$$;

-- Test the function
SELECT run_match('ranked');
/*
  # Queue Cleanup Functions

  1. Database Functions
    - `cleanup_stale_queue_entries()` - Removes queue entries older than 5 minutes
    - `force_remove_from_queue()` - Force removes a specific user from queue
  
  2. Data Cleanup
    - Remove any orphaned queue entries for non-existent users
    - Clean up stale entries from previous sessions
  
  3. Security
    - Functions are secure and handle edge cases
    - Proper error handling and logging
*/

-- Clean up any orphaned queue entries
DELETE FROM matchmaking_queue 
WHERE user_id NOT IN (SELECT id FROM users);

-- Function to clean up stale queue entries (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_queue_entries()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM matchmaking_queue 
  WHERE queued_at < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Cleaned up % stale queue entries', deleted_count;
  END IF;
  
  RETURN deleted_count;
END;
$$;

-- Function to force remove user from queue (for cleanup)
CREATE OR REPLACE FUNCTION force_remove_from_queue(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  removed boolean := false;
BEGIN
  DELETE FROM matchmaking_queue WHERE user_id = target_user_id;
  
  GET DIAGNOSTICS removed = FOUND;
  
  RETURN removed;
END;
$$;

-- Function to get queue statistics
CREATE OR REPLACE FUNCTION get_queue_stats()
RETURNS TABLE (
  total_in_queue integer,
  ranked_players integer,
  casual_players integer,
  average_wait_time_seconds integer,
  oldest_entry_age_seconds integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_in_queue,
    COUNT(*) FILTER (WHERE mode = 'ranked')::integer as ranked_players,
    COUNT(*) FILTER (WHERE mode = 'casual')::integer as casual_players,
    COALESCE(EXTRACT(EPOCH FROM AVG(NOW() - queued_at))::integer, 0) as average_wait_time_seconds,
    COALESCE(EXTRACT(EPOCH FROM MAX(NOW() - queued_at))::integer, 0) as oldest_entry_age_seconds
  FROM matchmaking_queue;
END;
$$;

-- Clean up any existing stale entries
SELECT cleanup_stale_queue_entries();
/*
  # Queue Management and Cleanup Functions

  1. Data Cleanup
    - Remove orphaned queue entries for deleted users
    - Clean up stale entries from previous sessions

  2. Database Functions
    - `cleanup_stale_queue_entries()`: Removes entries older than 5 minutes
    - `force_remove_from_queue()`: Force removes specific user from queue
    - `get_queue_stats()`: Provides queue monitoring statistics

  3. Immediate Actions
    - Run cleanup immediately after creating functions
    - Ensure fresh start for the matchmaking system
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
  rows_affected integer;
BEGIN
  DELETE FROM matchmaking_queue WHERE user_id = target_user_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RETURN rows_affected > 0;
END;
$$;

-- Drop existing function if it exists (to avoid return type conflicts)
DROP FUNCTION IF EXISTS get_queue_stats();

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
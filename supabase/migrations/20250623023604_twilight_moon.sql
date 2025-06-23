@@ .. @@
 -- Clean up any orphaned queue entries
 DELETE FROM matchmaking_queue 
 WHERE user_id NOT IN (SELECT id FROM users);

+-- Function to clean up stale queue entries (older than 5 minutes)
+CREATE OR REPLACE FUNCTION cleanup_stale_queue_entries()
+RETURNS integer
+LANGUAGE plpgsql
+AS $$
+DECLARE
+  deleted_count integer;
+BEGIN
+  DELETE FROM matchmaking_queue 
+  WHERE queued_at < NOW() - INTERVAL '5 minutes';
+  
+  GET DIAGNOSTICS deleted_count = ROW_COUNT;
+  
+  IF deleted_count > 0 THEN
+    RAISE NOTICE 'Cleaned up % stale queue entries', deleted_count;
+  END IF;
+  
+  RETURN deleted_count;
+END;
+$$;
+
+-- Function to force remove user from queue (for cleanup)
+CREATE OR REPLACE FUNCTION force_remove_from_queue(target_user_id uuid)
+RETURNS boolean
+LANGUAGE plpgsql
+AS $$
+DECLARE
+  removed boolean := false;
+BEGIN
+  DELETE FROM matchmaking_queue WHERE user_id = target_user_id;
+  
+  GET DIAGNOSTICS removed = FOUND;
+  
+  RETURN removed;
+END;
+$$;
+
 -- Function to get queue statistics
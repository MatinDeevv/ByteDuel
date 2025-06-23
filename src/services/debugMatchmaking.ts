/**
 * Debug helper for matchmaking - helps diagnose issues
 */
import { supabase } from '../lib/supabaseClient';

export async function debugMatchmaking() {
  console.log('🔍 === MATCHMAKING DEBUG START ===');
  
  try {
    // Check queue contents
    const { data: queueData, error: queueError } = await supabase
      .from('matchmaking_queue')
      .select(`
        user_id,
        mode,
        queued_at,
        users:user_id (
          display_name,
          rating
        )
      `)
      .order('queued_at', { ascending: true });
    
    console.log('📋 Current queue contents:');
    if (queueError) {
      console.error('❌ Queue query error:', queueError);
    } else {
      queueData?.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${(entry.users as any)?.display_name} (${(entry.users as any)?.rating}) - ${entry.mode} - ${entry.queued_at}`);
      });
      console.log(`📊 Total in queue: ${queueData?.length || 0}`);
    }
    
    // Test run_match function
    console.log('🎲 Testing run_match function...');
    const { data: matchResult, error: matchError } = await supabase.rpc('run_match', {
      p_mode: 'ranked'
    });
    
    if (matchError) {
      console.error('❌ run_match error:', matchError);
    } else {
      console.log('✅ run_match result:', matchResult);
    }
    
    // Check users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, display_name, rating')
      .limit(10);
    
    console.log('👥 Sample users:');
    if (usersError) {
      console.error('❌ Users query error:', usersError);
    } else {
      usersData?.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.display_name} (${user.rating})`);
      });
    }
    
    // Test queue functions
    console.log('🧪 Testing queue functions...');
    const { data: statsData, error: statsError } = await supabase.rpc('get_queue_stats');
    
    if (statsError) {
      console.error('❌ get_queue_stats error:', statsError);
    } else {
      console.log('📈 Queue stats:', statsData);
    }
    
  } catch (error) {
    console.error('💥 Debug error:', error);
  }
  
  console.log('🔍 === MATCHMAKING DEBUG END ===');
}

// Make it available globally for browser console
if (typeof window !== 'undefined') {
  (window as any).debugMatchmaking = debugMatchmaking;
}
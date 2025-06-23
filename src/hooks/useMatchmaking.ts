/**
 * Enhanced Matchmaking Hook - Handles subscription, navigation, and match flow
 */
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimpleMatchmakingStore } from '../store/simpleMatchmakingStore';
import { useAuth } from './useAuth';
import type { MatchFoundPayload } from '../services/simpleMatchmakingService';

export function useMatchmaking() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    isInQueue,
    isSearching,
    queueStatus,
    currentMatch,
    showMatchModal,
    error,
    joinQueue,
    leaveQueue,
    acceptMatch,
    clearMatch,
    clearError,
  } = useSimpleMatchmakingStore();

  // Handle match found notification with auto-navigation
  const handleMatchFound = useCallback((payload: MatchFoundPayload) => {
    console.log('🎉 Match found - initiating navigation flow:', payload);
    
    // Log the match details
    console.log('📋 Match Details:', {
      duelId: payload.duel_id,
      opponent: payload.opponent_name,
      opponentRating: payload.opponent_rating,
      ratingDiff: payload.rating_difference,
      mode: payload.mode,
    });

    // Store match data in sessionStorage for DuelPage to access
    sessionStorage.setItem('currentMatch', JSON.stringify(payload));
    
    // Navigate immediately to duel page
    console.log(`🧭 Navigating to duel: /duel/${payload.duel_id}?mode=${payload.mode}`);
    navigate(`/duel/${payload.duel_id}?mode=${payload.mode}`, {
      state: {
        matchData: payload,
        autoStart: true,
      },
    });

    // Clear the match from store since we're navigating
    setTimeout(() => {
      clearMatch();
    }, 100);
  }, [navigate, clearMatch]);

  // Set up match found callback when component mounts
  useEffect(() => {
    const simpleMatchmakingService = import('../services/simpleMatchmakingService').then(
      ({ simpleMatchmakingService }) => {
        simpleMatchmakingService.onMatchFound(handleMatchFound);
      }
    );

    return () => {
      // Cleanup is handled by the service
    };
  }, [handleMatchFound]);

  // Enhanced join queue with logging
  const handleJoinQueue = useCallback(async (mode: 'ranked' | 'casual' = 'ranked') => {
    if (!user?.id) {
      console.error('❌ Cannot join queue: No user ID');
      return;
    }

    console.log(`🎯 Starting matchmaking flow for user ${user.id} in ${mode} mode`);
    
    try {
      await joinQueue(user.id, { mode });
      console.log('✅ Successfully joined matchmaking queue');
    } catch (error) {
      console.error('❌ Failed to join queue:', error);
    }
  }, [user?.id, joinQueue]);

  // Enhanced leave queue with logging
  const handleLeaveQueue = useCallback(async () => {
    if (!user?.id) return;

    console.log(`🚪 Leaving matchmaking queue for user ${user.id}`);
    
    try {
      await leaveQueue(user.id);
      console.log('✅ Successfully left matchmaking queue');
    } catch (error) {
      console.error('❌ Failed to leave queue:', error);
    }
  }, [user?.id, leaveQueue]);

  return {
    // State
    isInQueue,
    isSearching,
    queueStatus,
    currentMatch,
    showMatchModal,
    error,
    
    // Actions
    joinQueue: handleJoinQueue,
    leaveQueue: handleLeaveQueue,
    acceptMatch,
    clearMatch,
    clearError,
  };
}
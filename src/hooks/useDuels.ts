/**
 * Duel Hooks with React Query
 * Optimized data fetching for duels and matches
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDuel,
  joinDuel,
  getDuelWithParticipants,
  submitCode,
  getUserSubmissions,
  getActiveDuels,
  getUserRecentDuels,
  cancelDuel,
  getDuelStats,
  type CreateDuelOptions,
} from '../services/duelService';

/**
 * Hook for creating a new duel
 */
export function useCreateDuel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ creatorId, options }: { creatorId: string; options: CreateDuelOptions }) =>
      createDuel(creatorId, options),
    onSuccess: () => {
      // Invalidate active duels query
      queryClient.invalidateQueries({ queryKey: ['duels', 'active'] });
    },
  });
}

/**
 * Hook for joining a duel
 */
export function useJoinDuel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ duelId, opponentId }: { duelId: string; opponentId: string }) =>
      joinDuel(duelId, opponentId),
    onSuccess: (_, { duelId }) => {
      // Invalidate duel data and active duels
      queryClient.invalidateQueries({ queryKey: ['duels', 'detail', duelId] });
      queryClient.invalidateQueries({ queryKey: ['duels', 'active'] });
    },
  });
}

/**
 * Hook for getting duel details with participants
 */
export function useDuelDetails(duelId: string | null) {
  return useQuery({
    queryKey: ['duels', 'detail', duelId],
    queryFn: () => duelId ? getDuelWithParticipants(duelId) : null,
    enabled: !!duelId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for submitting code
 */
export function useSubmitCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      duelId, 
      userId, 
      code, 
      language 
    }: { 
      duelId: string; 
      userId: string; 
      code: string; 
      language?: string; 
    }) => submitCode(duelId, userId, code, language),
    onSuccess: (_, { duelId, userId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['duels', 'detail', duelId] });
      queryClient.invalidateQueries({ queryKey: ['duels', 'submissions', duelId, userId] });
      queryClient.invalidateQueries({ queryKey: ['duels', 'recent', userId] });
    },
  });
}

/**
 * Hook for getting user submissions for a duel
 */
export function useUserSubmissions(duelId: string | null, userId: string | null) {
  return useQuery({
    queryKey: ['duels', 'submissions', duelId, userId],
    queryFn: () => duelId && userId ? getUserSubmissions(duelId, userId) : [],
    enabled: !!(duelId && userId),
    staleTime: 10 * 1000, // 10 seconds
  });
}

/**
 * Hook for getting active duels for matchmaking
 */
export function useActiveDuels(mode: 'ranked' | 'casual' = 'ranked', limit = 10) {
  return useQuery({
    queryKey: ['duels', 'active', mode, limit],
    queryFn: () => getActiveDuels(mode, limit),
    staleTime: 5 * 1000, // 5 seconds for real-time feel
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
  });
}

/**
 * Hook for getting user's recent duels
 */
export function useUserRecentDuels(userId: string | null, limit = 10) {
  return useQuery({
    queryKey: ['duels', 'recent', userId, limit],
    queryFn: () => userId ? getUserRecentDuels(userId, limit) : [],
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for canceling a duel
 */
export function useCancelDuel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ duelId, userId }: { duelId: string; userId: string }) =>
      cancelDuel(duelId, userId),
    onSuccess: (_, { duelId, userId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['duels', 'detail', duelId] });
      queryClient.invalidateQueries({ queryKey: ['duels', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['duels', 'recent', userId] });
    },
  });
}

/**
 * Hook for duel statistics
 */
export function useDuelStats() {
  return useQuery({
    queryKey: ['duels', 'stats'],
    queryFn: getDuelStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for real-time duel updates
 */
export function useDuelRealtime(duelId: string | null) {
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['duels', 'realtime', duelId],
    queryFn: () => {
      if (!duelId) return null;

      // Set up real-time subscription
      const subscription = supabase
        .channel(`duel-${duelId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'duels',
            filter: `id=eq.${duelId}`,
          },
          () => {
            // Invalidate duel details when changes occur
            queryClient.invalidateQueries({ queryKey: ['duels', 'detail', duelId] });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'submissions',
            filter: `duel_id=eq.${duelId}`,
          },
          () => {
            // Invalidate submissions when new ones are added
            queryClient.invalidateQueries({ queryKey: ['duels', 'submissions', duelId] });
          }
        )
        .subscribe();

      return () => subscription.unsubscribe();
    },
    enabled: !!duelId,
    staleTime: Infinity, // Never stale, managed by real-time updates
  });
}

/**
 * Hook for matchmaking - finding suitable opponents
 */
export function useMatchmaking(userId: string | null, ratingRange = 200) {
  return useQuery({
    queryKey: ['matchmaking', 'candidates', userId, ratingRange],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase.rpc('get_matchmaking_candidates', {
        user_profile_id: userId,
        rating_range: ratingRange,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
  });
}
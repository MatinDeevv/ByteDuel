/**
 * Leaderboard Hooks with React Query
 * Optimized data fetching for leaderboards and rankings
 */
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getGlobalLeaderboard,
  getUserRanking,
  getLeaderboardAroundUser,
  getTopPerformers,
  getLeaderboardStats,
  searchLeaderboard,
  type LeaderboardFilters,
} from '../services/leaderboardService';

/**
 * Hook for global leaderboard with pagination
 */
export function useGlobalLeaderboard(
  filters: LeaderboardFilters = {},
  pageSize = 50
) {
  return useInfiniteQuery({
    queryKey: ['leaderboard', 'global', filters],
    queryFn: ({ pageParam = 0 }) => 
      getGlobalLeaderboard(pageSize, pageParam * pageSize, filters),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => 
      lastPage.length === pageSize ? allPages.length : undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for user's ranking and position
 */
export function useUserRanking(userId: string | null) {
  return useQuery({
    queryKey: ['leaderboard', 'user-ranking', userId],
    queryFn: () => userId ? getUserRanking(userId) : null,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for leaderboard around user's position
 */
export function useLeaderboardAroundUser(userId: string | null, range = 5) {
  return useQuery({
    queryKey: ['leaderboard', 'around-user', userId, range],
    queryFn: () => userId ? getLeaderboardAroundUser(userId, range) : [],
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for top performers by category
 */
export function useTopPerformers() {
  return useQuery({
    queryKey: ['leaderboard', 'top-performers'],
    queryFn: getTopPerformers,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for leaderboard statistics
 */
export function useLeaderboardStats() {
  return useQuery({
    queryKey: ['leaderboard', 'stats'],
    queryFn: getLeaderboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for searching leaderboard
 */
export function useLeaderboardSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ['leaderboard', 'search', query],
    queryFn: () => searchLeaderboard(query),
    enabled: enabled && query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for combined leaderboard data (for dashboard)
 */
export function useLeaderboardDashboard(userId: string | null) {
  const globalLeaderboard = useQuery({
    queryKey: ['leaderboard', 'dashboard-global'],
    queryFn: () => getGlobalLeaderboard(10),
    staleTime: 2 * 60 * 1000,
  });

  const userRanking = useQuery({
    queryKey: ['leaderboard', 'dashboard-user', userId],
    queryFn: () => userId ? getUserRanking(userId) : null,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const topPerformers = useQuery({
    queryKey: ['leaderboard', 'dashboard-top'],
    queryFn: getTopPerformers,
    staleTime: 10 * 60 * 1000,
  });

  return {
    globalLeaderboard: globalLeaderboard.data || [],
    userRanking: userRanking.data,
    topPerformers: topPerformers.data,
    loading: globalLeaderboard.isLoading || userRanking.isLoading || topPerformers.isLoading,
    error: globalLeaderboard.error || userRanking.error || topPerformers.error,
  };
}
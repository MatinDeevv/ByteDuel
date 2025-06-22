/**
 * Practice Hooks with React Query
 * Optimized data fetching for practice sessions
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  startPracticeSession,
  submitPracticeCode,
  useHint,
  getUserPracticeSessions,
  getUserPracticeStats,
  getRecommendedTopics,
  type CreatePracticeOptions,
} from '../services/practiceService';
import { Difficulty } from '../types';

/**
 * Hook for starting a practice session
 */
export function useStartPractice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, options }: { userId: string; options: CreatePracticeOptions }) =>
      startPracticeSession(userId, options),
    onSuccess: (_, { userId }) => {
      // Invalidate practice sessions query
      queryClient.invalidateQueries({ queryKey: ['practice', 'sessions', userId] });
    },
  });
}

/**
 * Hook for submitting practice code
 */
export function useSubmitPractice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, code, language }: { 
      sessionId: string; 
      code: string; 
      language?: string; 
    }) => submitPracticeCode(sessionId, code, language),
    onSuccess: (result) => {
      // Invalidate practice stats and sessions
      const userId = result.session.user_id;
      queryClient.invalidateQueries({ queryKey: ['practice', 'sessions', userId] });
      queryClient.invalidateQueries({ queryKey: ['practice', 'stats', userId] });
      queryClient.invalidateQueries({ queryKey: ['practice', 'recommendations', userId] });
    },
  });
}

/**
 * Hook for using a hint
 */
export function useHintMutation() {
  return useMutation({
    mutationFn: (sessionId: string) => useHint(sessionId),
  });
}

/**
 * Hook for getting user's practice sessions
 */
export function usePracticeSessions(
  userId: string | null,
  options: {
    topic?: string;
    difficulty?: Difficulty;
    completed?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  return useQuery({
    queryKey: ['practice', 'sessions', userId, options],
    queryFn: () => userId ? getUserPracticeSessions(userId, options) : [],
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for getting user's practice statistics
 */
export function usePracticeStats(userId: string | null) {
  return useQuery({
    queryKey: ['practice', 'stats', userId],
    queryFn: () => userId ? getUserPracticeStats(userId) : null,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for getting recommended practice topics
 */
export function useRecommendedTopics(userId: string | null) {
  return useQuery({
    queryKey: ['practice', 'recommendations', userId],
    queryFn: () => userId ? getRecommendedTopics(userId) : [],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for practice dashboard data
 */
export function usePracticeDashboard(userId: string | null) {
  const stats = useQuery({
    queryKey: ['practice', 'dashboard-stats', userId],
    queryFn: () => userId ? getUserPracticeStats(userId) : null,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const recentSessions = useQuery({
    queryKey: ['practice', 'dashboard-recent', userId],
    queryFn: () => userId ? getUserPracticeSessions(userId, { limit: 5 }) : [],
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const recommendations = useQuery({
    queryKey: ['practice', 'dashboard-recommendations', userId],
    queryFn: () => userId ? getRecommendedTopics(userId) : [],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  return {
    stats: stats.data,
    recentSessions: recentSessions.data || [],
    recommendations: recommendations.data || [],
    loading: stats.isLoading || recentSessions.isLoading || recommendations.isLoading,
    error: stats.error || recentSessions.error || recommendations.error,
  };
}

/**
 * Hook for practice session details with real-time updates
 */
export function usePracticeSession(sessionId: string | null) {
  return useQuery({
    queryKey: ['practice', 'session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook for practice topics and their statistics
 */
export function usePracticeTopics(userId: string | null) {
  return useQuery({
    queryKey: ['practice', 'topics', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get all practice sessions grouped by topic
      const { data: sessions, error } = await supabase
        .from('practice_sessions')
        .select('topic, difficulty, completed, score')
        .eq('user_id', userId);

      if (error) throw error;

      // Group by topic and calculate stats
      const topicStats: Record<string, {
        topic: string;
        totalSessions: number;
        completedSessions: number;
        averageScore: number;
        difficulties: Record<string, number>;
      }> = {};

      (sessions || []).forEach(session => {
        if (!topicStats[session.topic]) {
          topicStats[session.topic] = {
            topic: session.topic,
            totalSessions: 0,
            completedSessions: 0,
            averageScore: 0,
            difficulties: { easy: 0, medium: 0, hard: 0 },
          };
        }

        const stats = topicStats[session.topic];
        stats.totalSessions++;
        stats.difficulties[session.difficulty]++;
        
        if (session.completed) {
          stats.completedSessions++;
        }
      });

      // Calculate average scores
      Object.values(topicStats).forEach(stats => {
        const topicSessions = sessions?.filter(s => s.topic === stats.topic) || [];
        stats.averageScore = topicSessions.length > 0
          ? Math.round(topicSessions.reduce((sum, s) => sum + s.score, 0) / topicSessions.length)
          : 0;
      });

      return Object.values(topicStats);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
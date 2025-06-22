/**
 * Practice Service - Solo coding practice management
 * Handles practice sessions, hints, and progress tracking
 */
import { supabase, type PracticeSession, type UserStats } from '../lib/supabaseClient';
import { runCodeSandbox } from '../lib/sandboxRunner';
import { generatePuzzle } from '../lib/puzzleGenerator';
import { PracticeMode, Difficulty } from '../types';

export interface CreatePracticeOptions {
  topic: string;
  difficulty: Difficulty;
  mode: PracticeMode;
}

export interface PracticeResult {
  session: PracticeSession;
  score: number;
  feedback: string;
  achievements?: string[];
}

/**
 * Start a new practice session
 */
export async function startPracticeSession(
  userId: string,
  options: CreatePracticeOptions
): Promise<PracticeSession> {
  // Generate puzzle based on options
  const puzzle = await generatePuzzle('', '', 'practice', options);

  const sessionData = {
    user_id: userId,
    topic: options.topic,
    difficulty: options.difficulty,
    prompt: puzzle.prompt,
    test_cases: puzzle.tests,
    hints: puzzle.hints || [],
  };

  const { data, error } = await supabase
    .from('practice_sessions')
    .insert(sessionData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Submit code for practice session
 */
export async function submitPracticeCode(
  sessionId: string,
  code: string,
  language = 'javascript'
): Promise<PracticeResult> {
  // Get session data
  const { data: session, error: sessionError } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError) {
    throw sessionError;
  }

  // Run code in sandbox
  const result = await runCodeSandbox(code, session.test_cases);

  // Calculate score (0-100)
  const baseScore = Math.round((result.passedTests / result.totalTests) * 100);
  
  // Apply bonuses/penalties
  let score = baseScore;
  
  // Bonus for no hints used
  if (session.hints_used === 0 && result.passed) {
    score = Math.min(100, score + 10);
  }
  
  // Penalty for multiple attempts
  const attemptPenalty = Math.max(0, (session.attempts - 1) * 5);
  score = Math.max(0, score - attemptPenalty);

  // Update session
  const updateData = {
    completed: result.passed,
    score,
    completion_time: Math.floor(result.runtimeMs / 1000),
    attempts: session.attempts + 1,
    final_code: result.passed ? code : session.final_code,
    completed_at: result.passed ? new Date().toISOString() : session.completed_at,
  };

  const { data: updatedSession, error: updateError } = await supabase
    .from('practice_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  // Generate feedback
  let feedback = '';
  const achievements: string[] = [];

  if (result.passed) {
    feedback = 'Excellent work! All tests passed.';
    
    if (session.hints_used === 0) {
      feedback += ' Perfect solution with no hints!';
      achievements.push('No Hints Needed');
    }
    
    if (session.attempts === 0) { // First attempt
      feedback += ' Solved on first try!';
      achievements.push('First Try');
    }
    
    if (updateData.completion_time! < 120) { // Under 2 minutes
      feedback += ' Lightning fast solve!';
      achievements.push('Speed Demon');
    }
  } else {
    const passedPercentage = Math.round((result.passedTests / result.totalTests) * 100);
    feedback = `Good effort! ${result.passedTests}/${result.totalTests} tests passed (${passedPercentage}%). `;
    
    if (result.passedTests > 0) {
      feedback += 'You\'re on the right track. ';
    }
    
    if (session.hints.length > session.hints_used) {
      feedback += 'Try using a hint to get unstuck.';
    } else {
      feedback += 'Keep practicing and you\'ll get it!';
    }
  }

  return {
    session: updatedSession,
    score,
    feedback,
    achievements: achievements.length > 0 ? achievements : undefined,
  };
}

/**
 * Use a hint for practice session
 */
export async function useHint(sessionId: string): Promise<{ hint: string; hintsRemaining: number }> {
  const { data: session, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) {
    throw error;
  }

  const hints = session.hints as string[];
  const currentHintIndex = session.hints_used;

  if (currentHintIndex >= hints.length) {
    throw new Error('No more hints available');
  }

  // Update hints used count
  await supabase
    .from('practice_sessions')
    .update({ hints_used: currentHintIndex + 1 })
    .eq('id', sessionId);

  return {
    hint: hints[currentHintIndex],
    hintsRemaining: hints.length - currentHintIndex - 1,
  };
}

/**
 * Get user's practice sessions
 */
export async function getUserPracticeSessions(
  userId: string,
  options: {
    topic?: string;
    difficulty?: Difficulty;
    completed?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<PracticeSession[]> {
  let query = supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId);

  if (options.topic) {
    query = query.eq('topic', options.topic);
  }

  if (options.difficulty) {
    query = query.eq('difficulty', options.difficulty);
  }

  if (options.completed !== undefined) {
    query = query.eq('completed', options.completed);
  }

  query = query
    .order('created_at', { ascending: false })
    .limit(options.limit || 20);

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get practice statistics for user
 */
export async function getUserPracticeStats(userId: string): Promise<{
  totalSessions: number;
  completedSessions: number;
  averageScore: number;
  topicBreakdown: Record<string, { completed: number; total: number; avgScore: number }>;
  difficultyBreakdown: Record<string, { completed: number; total: number; avgScore: number }>;
  recentActivity: Array<{ date: string; sessions: number; avgScore: number }>;
}> {
  // Get all practice sessions for user
  const { data: sessions, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  if (!sessions || sessions.length === 0) {
    return {
      totalSessions: 0,
      completedSessions: 0,
      averageScore: 0,
      topicBreakdown: {},
      difficultyBreakdown: {},
      recentActivity: [],
    };
  }

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.completed).length;
  const averageScore = sessions.reduce((sum, s) => sum + s.score, 0) / totalSessions;

  // Topic breakdown
  const topicBreakdown: Record<string, { completed: number; total: number; avgScore: number }> = {};
  sessions.forEach(session => {
    if (!topicBreakdown[session.topic]) {
      topicBreakdown[session.topic] = { completed: 0, total: 0, avgScore: 0 };
    }
    topicBreakdown[session.topic].total++;
    if (session.completed) {
      topicBreakdown[session.topic].completed++;
    }
  });

  // Calculate average scores for topics
  Object.keys(topicBreakdown).forEach(topic => {
    const topicSessions = sessions.filter(s => s.topic === topic);
    topicBreakdown[topic].avgScore = 
      topicSessions.reduce((sum, s) => sum + s.score, 0) / topicSessions.length;
  });

  // Difficulty breakdown
  const difficultyBreakdown: Record<string, { completed: number; total: number; avgScore: number }> = {};
  sessions.forEach(session => {
    if (!difficultyBreakdown[session.difficulty]) {
      difficultyBreakdown[session.difficulty] = { completed: 0, total: 0, avgScore: 0 };
    }
    difficultyBreakdown[session.difficulty].total++;
    if (session.completed) {
      difficultyBreakdown[session.difficulty].completed++;
    }
  });

  // Calculate average scores for difficulties
  Object.keys(difficultyBreakdown).forEach(difficulty => {
    const difficultySessions = sessions.filter(s => s.difficulty === difficulty);
    difficultyBreakdown[difficulty].avgScore = 
      difficultySessions.reduce((sum, s) => sum + s.score, 0) / difficultySessions.length;
  });

  // Recent activity (last 7 days)
  const recentActivity: Array<{ date: string; sessions: number; avgScore: number }> = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const daySessions = sessions.filter(s => 
      s.created_at.startsWith(dateStr)
    );
    
    const avgScore = daySessions.length > 0 
      ? daySessions.reduce((sum, s) => sum + s.score, 0) / daySessions.length 
      : 0;
    
    recentActivity.push({
      date: dateStr,
      sessions: daySessions.length,
      avgScore: Math.round(avgScore),
    });
  }

  return {
    totalSessions,
    completedSessions,
    averageScore: Math.round(averageScore),
    topicBreakdown,
    difficultyBreakdown,
    recentActivity,
  };
}

/**
 * Get recommended practice topics for user
 */
export async function getRecommendedTopics(userId: string): Promise<Array<{
  topic: string;
  difficulty: Difficulty;
  reason: string;
  priority: number;
}>> {
  // Get user stats and recent sessions
  const [statsResult, sessionsResult] = await Promise.all([
    supabase.from('user_stats').select('*').eq('user_id', userId).single(),
    supabase.from('practice_sessions').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(20),
  ]);

  const stats = statsResult.data;
  const recentSessions = sessionsResult.data || [];

  const recommendations: Array<{
    topic: string;
    difficulty: Difficulty;
    reason: string;
    priority: number;
  }> = [];

  // All available topics
  const allTopics = [
    'arrays', 'strings', 'linked-lists', 'trees', 'graphs',
    'dynamic-programming', 'recursion', 'sorting', 'searching', 'hash-tables'
  ];

  // Get topics user hasn't practiced recently
  const recentTopics = new Set(recentSessions.slice(0, 10).map(s => s.topic));
  const unpracticedTopics = allTopics.filter(topic => !recentTopics.has(topic));

  // Recommend unpracticed topics
  unpracticedTopics.forEach(topic => {
    recommendations.push({
      topic,
      difficulty: 'easy',
      reason: 'New topic to explore',
      priority: 3,
    });
  });

  // Recommend topics where user struggled
  const struggledTopics = recentSessions
    .filter(s => s.completed && s.score < 70)
    .map(s => s.topic);

  [...new Set(struggledTopics)].forEach(topic => {
    recommendations.push({
      topic,
      difficulty: 'easy',
      reason: 'Practice makes perfect',
      priority: 5,
    });
  });

  // Recommend next difficulty level for mastered topics
  const masteredTopics = recentSessions
    .filter(s => s.completed && s.score >= 90 && s.difficulty === 'easy')
    .map(s => s.topic);

  [...new Set(masteredTopics)].forEach(topic => {
    recommendations.push({
      topic,
      difficulty: 'medium',
      reason: 'Ready for the next challenge',
      priority: 4,
    });
  });

  // Sort by priority and return top 5
  return recommendations
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);
}
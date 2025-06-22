import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Target, 
  Clock, 
  Code, 
  Zap, 
  Users, 
  TrendingUp, 
  Calendar,
  LogOut,
  Settings,
  Github,
  Play,
  BookOpen,
  Award
} from 'lucide-react';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedCard from '../components/AnimatedCard';
import RatingDisplay from '../components/RatingDisplay';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../hooks/useAuth';
import { useLeaderboardDashboard } from '../hooks/useLeaderboard';
import { useDuelStats, useUserRecentDuels } from '../hooks/useDuels';
import { usePracticeDashboard } from '../hooks/usePractice';

interface DashboardStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  averageTime: number;
  fastestSolve: number;
}

interface RecentMatch {
  id: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  ratingChange: number;
  duration: number;
  date: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  
  // Load dashboard data using React Query hooks
  const { globalLeaderboard, userRanking } = useLeaderboardDashboard(profile?.id || null);
  const { data: duelStats } = useDuelStats();
  const { data: recentDuels, isLoading: duelsLoading } = useUserRecentDuels(profile?.id || null, 5);
  const { stats: practiceStats, loading: practiceLoading } = usePracticeDashboard(profile?.id || null);

  const dataLoading = duelsLoading || practiceLoading;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-500';
      case 'loss': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': return <Trophy className="h-4 w-4" />;
      case 'loss': return <Target className="h-4 w-4" />;
      default: return <Code className="h-4 w-4" />;
    }
  };

  // Show error if no user
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {dataLoading && (
            <motion.div
              className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {dataLoading ? 'Loading Dashboard...' : 'Authentication Required'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {dataLoading ? 'Setting up your profile...' : 'Please sign in to access your dashboard.'}
          </p>
          {!dataLoading && (
            <AnimatedButton
              onClick={() => navigate('/login')}
              variant="primary"
            >
              Sign In
            </AnimatedButton>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Zap className="h-8 w-8 text-blue-500" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Welcome back, {profile?.display_name}!
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Ready for your next coding challenge?
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <RatingDisplay rating={profile?.rating || 1200} size="lg" />
              {userRanking && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Rank #{userRanking.rank} ({userRanking.percentile}th percentile)
                </div>
              )}
              <ThemeToggle />
              <AnimatedButton
                onClick={() => navigate('/profile')}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Profile
              </AnimatedButton>
              <AnimatedButton
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </AnimatedButton>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-8">
          {/* Profile Card */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatedCard className="p-6">
              <div className="flex items-center space-x-6">
                {/* Avatar */}
                <div className="relative">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                      {profile?.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                    <Award className="h-4 w-4 text-yellow-500" />
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {profile?.display_name}
                    </h2>
                    {profile?.github_username && (
                      <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
                        <Github className="h-4 w-4 mr-1" />
                        <span>@{profile.github_username}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Joined {new Date(profile?.created_at || '').toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <Trophy className="h-4 w-4 mr-1" />
                      <span>{profile?.wins || 0} wins</span>
                    </div>
                    <div className="flex items-center">
                      <Target className="h-4 w-4 mr-1" />
                      <span>{profile?.losses || 0} losses</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex space-x-3">
                  <AnimatedButton
                    onClick={() => navigate('/')}
                    variant="primary"
                    className="px-6"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Quick Match
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={() => navigate('/practice')}
                    variant="secondary"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Practice
                  </AnimatedButton>
                </div>
              </div>
            </AnimatedCard>
          </motion.div>

          {/* Stats Grid */}
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <AnimatedCard key={i} className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <AnimatedCard className="p-6" delay={0.1}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Win Rate</p>
                    <p className="text-2xl font-bold text-green-500">
                      {profile.games_played > 0 ? Math.round((profile.games_won / profile.games_played) * 100) : 0}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </AnimatedCard>

              <AnimatedCard className="p-6" delay={0.2}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Streak</p>
                    <p className="text-2xl font-bold text-blue-500">0</p>
                  </div>
                  <Zap className="h-8 w-8 text-blue-500" />
                </div>
              </AnimatedCard>

              <AnimatedCard className="p-6" delay={0.3}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg. Time</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {practiceStats?.averageScore ? `${practiceStats.averageScore}%` : 'N/A'}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-500" />
                </div>
              </AnimatedCard>

              <AnimatedCard className="p-6" delay={0.4}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Matches</p>
                    <p className="text-2xl font-bold text-orange-500">{profile.games_played}</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-500" />
                </div>
              </AnimatedCard>
            </motion.div>
          )}

          {/* Recent Matches */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <AnimatedCard delay={0.5}>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Recent Matches
                </h3>

                {dataLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                        </div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                ) : !recentDuels || recentDuels.length === 0 ? (
                  <div className="text-center py-12">
                    <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      No matches played yet. Start your first duel!
                    </p>
                    <AnimatedButton
                      onClick={() => navigate('/')}
                      variant="primary"
                    >
                      Find Match
                    </AnimatedButton>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentDuels.map((duel, index) => {
                      const isWin = duel.winner_id === profile.id;
                      const ratingChange = profile.id === duel.creator_id ? duel.creator_rating_change : duel.opponent_rating_change;
                      
                      return (
                      <motion.div
                        key={duel.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-2 rounded-full ${
                            isWin ? 'bg-green-100 dark:bg-green-900/20' :
                            !isWin ? 'bg-red-100 dark:bg-red-900/20' :
                            'bg-gray-100 dark:bg-gray-800'
                          }`}>
                            <div className={getResultColor(isWin ? 'win' : 'loss')}>
                              {getResultIcon(isWin ? 'win' : 'loss')}
                            </div>
                          </div>
                          
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              vs {duel.opponent_name || 'Unknown'}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>{duel.topic}</span>
                              <span>{new Date(duel.ended_at || duel.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`font-bold ${
                            ratingChange > 0 ? 'text-green-500' :
                            ratingChange < 0 ? 'text-red-500' :
                            'text-gray-500'
                          }`}>
                            {ratingChange > 0 ? '+' : ''}{ratingChange}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ELO
                          </div>
                        </div>
                      </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </AnimatedCard>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default DashboardPage;
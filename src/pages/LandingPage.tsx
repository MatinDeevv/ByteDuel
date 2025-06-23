import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Github, Code, Trophy, Users, BookOpen, Search, User, LogOut, Target } from 'lucide-react';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedCard from '../components/AnimatedCard';
import ModeSelector from '../components/ModeSelector';
import AnimatedLeaderboard from '../components/AnimatedLeaderboard';
import RatingDisplay from '../components/RatingDisplay';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import SimpleMatchmakingModal from '../components/SimpleMatchmakingModal';
import { useAuth } from '../hooks/useAuth';
import { GameMode } from '../types';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<GameMode>('ranked-duel');
  const [showMatchmakingModal, setShowMatchmakingModal] = useState(false);
  const { user, profile, signOut, signInWithGitHub } = useAuth();

  // Mock leaderboard data
  const leaderboardData = [
    { rank: 1, username: 'CodeMaster', eloRating: 2150, gamesWon: 45, gamesPlayed: 52 },
    { rank: 2, username: 'AlgoNinja', eloRating: 2089, gamesWon: 38, gamesPlayed: 44 },
    { rank: 3, username: 'ByteWarrior', eloRating: 1987, gamesWon: 42, gamesPlayed: 51 },
    { rank: 4, username: 'DevGuru', eloRating: 1923, gamesWon: 35, gamesPlayed: 41 },
    { rank: 5, username: 'ScriptKid', eloRating: 1876, gamesWon: 28, gamesPlayed: 35 },
  ];

  const handleDuelMe = async () => {
    // Require authentication for competitive modes
    if (!user) {
      try {
        await signInWithGitHub();
        // Auth state change will handle the redirect
      } catch (error) {
        console.error('Sign in failed:', error);
        navigate('/login');
      }
      return;
    }
    
    // Navigate based on selected mode
    if (selectedMode === 'practice') {
      navigate('/practice');
    } else if (selectedMode === 'ranked-duel') {
      // Show simple matchmaking modal
      setShowMatchmakingModal(true);
    } else {
      // For other modes, redirect to dashboard for now
      navigate('/dashboard');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900">
      {/* Header */}
      <motion.header 
        className="container mx-auto px-6 py-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Zap className="h-8 w-8 text-blue-500" />
            </motion.div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">ByteDuel</span>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <motion.a 
              href="#features" 
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              Features
            </motion.a>
            <motion.a 
              href="#how-it-works" 
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              How it Works
            </motion.a>
            <ThemeToggle />
            {user ? (
              <div className="flex items-center space-x-4">
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMatchmakingModal(true)}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Quick Match
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                >
                  <User className="h-4 w-4 mr-1" />
                  Dashboard
                </AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </AnimatedButton>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <AnimatedButton 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </AnimatedButton>
                <AnimatedButton 
                  variant="primary" 
                  size="sm"
                  onClick={() => navigate('/signup')}
                >
                  Sign Up
                </AnimatedButton>
              </div>
            )}
          </nav>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <motion.h1 
            className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Instant Coding Showdown
          </motion.h1>
          <motion.p 
            className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Simple, fast, and fair matchmaking. 
            Race-free atomic queue matching gets you into games in seconds.
          </motion.p>

          {/* Game Mode Selection */}
          <motion.div 
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">Choose Your Game Mode</h2>
            <ModeSelector
              selectedMode={selectedMode}
              onModeSelect={setSelectedMode}
              className="max-w-4xl mx-auto"
            />
          </motion.div>

          <AnimatedCard className="max-w-md mx-auto mb-12 p-8" delay={0.8}>
            <div className="space-y-6">
              {/* User Rating Display */}
              {profile && (
                <div className="text-center">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-4">
                    <div className="flex items-center justify-center space-x-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                        {profile.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-green-900 dark:text-green-100">
                          Welcome, {profile.display_name}!
                        </p>
                        <RatingDisplay rating={profile.rating} size="sm" />
                      </div>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Ready to compete? Get matched instantly with our fast queue system!
                    </p>
                  </div>
                </div>
              )}
              
              {/* GitHub Profile Input (only for guests) */}
              {!user && (
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Sign in to track your progress, compete in ranked matches, and unlock all features!
                  </p>
                  <div className="space-y-2">
                    <AnimatedButton
                      onClick={signInWithGitHub}
                      variant="primary"
                      size="sm"
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                    >
                      <Github className="h-4 w-4 mr-2" />
                      Continue with GitHub
                    </AnimatedButton>
                    <div className="flex space-x-2">
                      <AnimatedButton
                        onClick={() => navigate('/login')}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        Sign In
                      </AnimatedButton>
                      <AnimatedButton
                        onClick={() => navigate('/signup')}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        Sign Up
                      </AnimatedButton>
                    </div>
                  </div>
                </div>
              )}

              <AnimatedButton
                onClick={handleDuelMe}
                className="w-full py-4 text-lg font-semibold"
                size="lg"
              >
                {selectedMode === 'practice' ? (
                  <>
                    <BookOpen className="h-5 w-5 mr-2" />
                    Start Practice
                  </>
                ) : selectedMode === 'ranked-duel' ? (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Quick Matchmaking
                  </>
                ) : (
                  <>
                    <Target className="h-5 w-5 mr-2" />
                    {selectedMode === 'timed-trial' ? 'Start Trial' :
                     selectedMode === 'tournament' ? 'Join Tournament' :
                     'Challenge Bot'}
                  </>
                )}
              </AnimatedButton>
            </div>
          </AnimatedCard>

          {/* Features Grid */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
          >
            {[
              { icon: Zap, title: 'Instant Matching', desc: 'FIFO queue with atomic operations', color: 'text-blue-500' },
              { icon: Users, title: 'Race-Free', desc: 'PostgreSQL locks prevent duplicate matches', color: 'text-green-500' },
              { icon: BookOpen, title: 'Practice Mode', desc: 'Self-paced learning with hints and guidance', color: 'text-purple-500' },
              { icon: Trophy, title: 'Real-time Sync', desc: 'Supabase realtime notifications', color: 'text-pink-500' },
            ].map((feature, index) => (
              <motion.div 
                key={feature.title}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <feature.icon className={`h-12 w-12 ${feature.color} mx-auto mb-4`} />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Leaderboard */}
          <motion.div 
            className="max-w-md mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
          >
            <AnimatedLeaderboard entries={leaderboardData} />
          </motion.div>
        </div>
      </section>
      </div>

      {/* Simple Matchmaking Modal */}
      <SimpleMatchmakingModal
        isOpen={showMatchmakingModal}
        onClose={() => setShowMatchmakingModal(false)}
        mode="ranked"
      />
    </PageTransition>
  );
};

export default LandingPage;
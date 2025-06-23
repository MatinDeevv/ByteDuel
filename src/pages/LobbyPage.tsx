import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Zap } from 'lucide-react';
import AnimatedButton from '../components/AnimatedButton';
import GameLobby from '../components/GameLobby';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../hooks/useAuth';

const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <AnimatedButton
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </AnimatedButton>
              
              <div className="flex items-center space-x-3">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <Zap className="h-8 w-8 text-blue-500" />
                </motion.div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Game Lobby
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Join or host coding duels with players worldwide
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {profile && (
                <div className="flex items-center space-x-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {profile.display_name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {profile.elo_rating} ELO
                    </p>
                  </div>
                </div>
              )}
              
              <ThemeToggle />
              
              <AnimatedButton
                onClick={() => navigate('/dashboard')}
                variant="outline"
                size="sm"
              >
                <Users className="h-4 w-4 mr-2" />
                Dashboard
              </AnimatedButton>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GameLobby />
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
};

export default LobbyPage;
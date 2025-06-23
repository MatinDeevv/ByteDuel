import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Users, Clock, Zap, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedButton from './AnimatedButton';
import RatingDisplay from './RatingDisplay';
import { useMatchmaking } from '../hooks/useMatchmaking';
import { useAuth } from '../hooks/useAuth';
import { getRatingTier } from '../lib/elo';

interface SimpleMatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'ranked' | 'casual';
}

const SimpleMatchmakingModal: React.FC<SimpleMatchmakingModalProps> = ({ 
  isOpen, 
  onClose, 
  mode = 'ranked' 
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const {
    isInQueue,
    isSearching,
    queueStatus,
    currentMatch,
    showMatchModal,
    error,
    joinQueue,
    leaveQueue,
    clearError,
  } = useMatchmaking();

  const userTier = getRatingTier(profile?.rating || 1200);

  // Handle joining queue
  const handleJoinQueue = async () => {
    if (!user?.id) return;
    
    console.log('🎯 User clicked Find Quick Match');
    try {
      await joinQueue(mode);
      console.log('✅ Successfully initiated queue join');
    } catch (error) {
      console.error('❌ Failed to join queue from modal:', error);
    }
  };

  // Handle leaving queue
  const handleLeaveQueue = async () => {
    if (!user?.id) return;
    
    console.log('🚪 User clicked Cancel Search');
    try {
      await leaveQueue();
      onClose();
      console.log('✅ Successfully left queue and closed modal');
    } catch (error) {
      console.error('❌ Failed to leave queue from modal:', error);
    }
  };

  // Debug function
  const handleDebug = async () => {
    console.log('🐛 Running matchmaking debug...');
    if (typeof window !== 'undefined' && (window as any).debugMatchmaking) {
      await (window as any).debugMatchmaking();
    } else {
      // Import and run debug
      const { debugMatchmaking } = await import('../services/debugMatchmaking');
      await debugMatchmaking();
    }
  };

  // Auto-close modal when match is found (handled by navigation in useMatchmaking)
  useEffect(() => {
    if (currentMatch?.duel_id) {
      console.log('🎯 Match found in modal, navigation should be handled by hook');
      onClose();
    }
  }, [currentMatch, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Zap className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Quick Matchmaking
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {userTier.icon} {userTier.name} • {profile?.rating || 1200} Rating
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Debug Button - Only in development */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={handleDebug}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Debug Matchmaking"
                >
                  <Bug className="h-5 w-5 text-orange-500" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <motion.div
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={clearError}
                className="text-xs text-red-500 hover:text-red-600 mt-1"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {/* Queue Status */}
          {isInQueue && (
            <div className="text-center mb-6">
              <div className="relative mb-4">
                <motion.div
                  className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                {queueStatus?.position && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-500">
                      #{queueStatus.position}
                    </span>
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Finding Match...
              </h3>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      Position
                    </div>
                    <div className="text-gray-900 dark:text-white">
                      #{queueStatus?.position || 1}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      Queue Size
                    </div>
                    <div className="text-gray-900 dark:text-white">
                      {queueStatus?.queue_size || 1}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      Wait Time
                    </div>
                    <div className="text-gray-900 dark:text-white">
                      ~{Math.ceil((queueStatus?.estimated_wait_seconds || 30) / 60)}m
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      Mode
                    </div>
                    <div className="text-gray-900 dark:text-white capitalize">
                      {mode}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                <p>🎯 Looking for players with similar rating</p>
                <p>⚡ Checking for matches every 3 seconds</p>
                <p>🚀 Auto-navigation on match found</p>
              </div>

              <AnimatedButton
                onClick={handleLeaveQueue}
                variant="outline"
                className="w-full"
              >
                Cancel Search
              </AnimatedButton>
            </div>
          )}

          {/* Initial State */}
          {!isInQueue && !isSearching && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Ready for Quick Matches?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Simple FIFO queue matching with automatic navigation to duels when matches are found.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Enhanced Flow:
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Join queue and wait for opponent</li>
                  <li>• Auto-navigation when match found</li>
                  <li>• Duel specs fetched automatically</li>
                  <li>• Sandbox initialized and ready</li>
                </ul>
              </div>

              <div className="space-y-3">
                <AnimatedButton
                  onClick={handleJoinQueue}
                  disabled={isSearching}
                  loading={isSearching}
                  variant="primary"
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Find Quick Match ({mode})
                </AnimatedButton>
                <AnimatedButton
                  onClick={onClose}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </AnimatedButton>
              </div>
            </div>
          )}

          {/* Footer Stats */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Auto-navigation enabled</span>
              <span>Sandbox auto-init</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SimpleMatchmakingModal;
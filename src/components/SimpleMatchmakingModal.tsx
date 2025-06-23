import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Users, Clock, Zap, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedButton from './AnimatedButton';
import RatingDisplay from './RatingDisplay';
import { useSimpleMatchmakingStore } from '../store/simpleMatchmakingStore';
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
    queueStats,
    joinQueue,
    leaveQueue,
    acceptMatch,
    clearMatch,
    clearError,
    loadQueueStats,
  } = useSimpleMatchmakingStore();

  const userTier = getRatingTier(profile?.rating || 1200);

  // Load stats when modal opens
  useEffect(() => {
    if (isOpen) {
      loadQueueStats();
    }
  }, [isOpen, loadQueueStats]);

  // Handle joining queue
  const handleJoinQueue = async () => {
    if (!user?.id) return;
    
    try {
      await joinQueue(user.id, { mode });
    } catch (error) {
      console.error('Failed to join queue:', error);
    }
  };

  // Handle leaving queue
  const handleLeaveQueue = async () => {
    if (!user?.id) return;
    
    try {
      await leaveQueue(user.id);
      onClose();
    } catch (error) {
      console.error('Failed to leave queue:', error);
    }
  };

  // Handle accepting match
  const handleAcceptMatch = () => {
    if (!currentMatch?.duel_id) return;
    
    acceptMatch();
    onClose();
    navigate(`/duel/${currentMatch.duel_id}`);
  };

  // Auto-accept match after 3 seconds
  useEffect(() => {
    if (currentMatch?.duel_id && showMatchModal) {
      const timeout = setTimeout(() => {
        handleAcceptMatch();
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [currentMatch, showMatchModal]);

  // Debug function
  const handleDebug = async () => {
    if (typeof window !== 'undefined' && (window as any).debugMatchmaking) {
      await (window as any).debugMatchmaking();
    } else {
      // Import and run debug
      const { debugMatchmaking } = await import('../services/debugMatchmaking');
      await debugMatchmaking();
    }
  };

  if (!isOpen && !showMatchModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          if (currentMatch) {
            clearMatch();
          }
          onClose();
        }}
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
                onClick={() => {
                  if (currentMatch) {
                    clearMatch();
                  }
                  onClose();
                }}
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

          {/* Match Found */}
          {currentMatch && (
            <motion.div
              className="text-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              <motion.div
                className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Users className="h-8 w-8 text-white" />
              </motion.div>
              <h3 className="text-lg font-bold text-green-500 mb-2">Match Found!</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Opponent:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {currentMatch.opponent_name}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Rating:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {currentMatch.opponent_rating}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Difference:</span>
                  <span className="font-semibold text-blue-500">
                    ±{currentMatch.rating_difference}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Starting duel in 3 seconds...
              </p>
              <AnimatedButton
                onClick={handleAcceptMatch}
                variant="success"
                className="w-full"
              >
                Start Duel Now
              </AnimatedButton>
            </motion.div>
          )}

          {/* Queue Status */}
          {isInQueue && !currentMatch && (
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
          {!isInQueue && !isSearching && !currentMatch && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Ready for Quick Matches?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Simple FIFO queue matching - first come, first served with fair opponent selection.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  How it works:
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Join queue and wait for opponent</li>
                  <li>• Automatic pairing every 3 seconds</li>
                  <li>• Race-free atomic matching</li>
                  <li>• Real-time notifications</li>
                </ul>
              </div>

              {/* Queue Stats */}
              {queueStats && (
                <div className="mb-6 grid grid-cols-2 gap-4 text-xs">
                  <div className="text-center">
                    <div className="font-bold text-blue-500">{queueStats.total_players}</div>
                    <div className="text-gray-500">Players in Queue</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-500">~{Math.round(queueStats.avg_wait_seconds)}s</div>
                    <div className="text-gray-500">Avg Wait Time</div>
                  </div>
                </div>
              )}

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
              <span>Simple FIFO matching</span>
              <span>Checks every 3s</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SimpleMatchmakingModal;
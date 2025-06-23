import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Users, Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedButton from './AnimatedButton';
import { useMatchmakingStore } from '../store/matchmakingStore';
import { getRatingTier } from '../lib/elo';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MatchmakingModal: React.FC<MatchmakingModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const {
    isSearching,
    queuedAt,
    queuePosition,
    estimatedWaitTime,
    currentMatch,
    userRating,
    startSearch,
    cancelSearch,
    acceptMatch,
    clearMatch,
  } = useMatchmakingStore();

  const [searchTime, setSearchTime] = useState(0);
  const userTier = getRatingTier(userRating);

  // Update search timer
  useEffect(() => {
    if (!isSearching || !queuedAt) return;

    const interval = setInterval(() => {
      setSearchTime(Math.floor((Date.now() - queuedAt.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSearching, queuedAt]);

  // Handle match found
  useEffect(() => {
    if (currentMatch) {
      // Auto-accept match after 3 seconds or when user clicks
      const timeout = setTimeout(() => {
        handleAcceptMatch();
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [currentMatch]);

  const handleStartSearch = async () => {
    try {
      await startSearch('ranked');
    } catch (error) {
      console.error('Failed to start matchmaking:', error);
    }
  };

  const handleCancelSearch = async () => {
    try {
      await cancelSearch();
      onClose();
    } catch (error) {
      console.error('Failed to cancel search:', error);
    }
  };

  const handleAcceptMatch = () => {
    if (!currentMatch) return;
    
    acceptMatch();
    onClose();
    navigate(`/duel/${currentMatch.duelId}?mode=ranked`);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ranked Match</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {userTier.icon} {userTier.name} • {userRating} ELO
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

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
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Opponent found. Starting duel in 3 seconds...
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

          {/* Searching State */}
          {isSearching && !currentMatch && (
            <div className="text-center mb-6">
              <div className="relative mb-4">
                <motion.div
                  className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                {queuePosition && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-500">#{queuePosition}</span>
                  </div>
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {queuePosition ? `Position #${queuePosition} in Queue` : 'Finding Opponent...'}
              </h3>
              <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400 mb-4">
                <Clock className="h-4 w-4" />
                <span>
                  {estimatedWaitTime 
                    ? `~${Math.ceil(estimatedWaitTime / 60)} min wait` 
                    : formatTime(searchTime)
                  }
                </span>
              </div>
              <div className="space-y-2 mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Looking for players with similar skill level
                </p>
                {queuePosition && queuePosition > 1 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {queuePosition - 1} player{queuePosition > 2 ? 's' : ''} ahead of you
                  </p>
                )}
              </div>
              <AnimatedButton
                onClick={handleCancelSearch}
                variant="outline"
                className="w-full"
              >
                Cancel Search
              </AnimatedButton>
            </div>
          )}

          {/* Initial State */}
          {!isSearching && !currentMatch && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Ready to Compete?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Find an opponent with similar skill level for a ranked coding duel.
              </p>
              <div className="space-y-3">
                <AnimatedButton
                  onClick={handleStartSearch}
                  variant="primary"
                  className="w-full"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Find Match
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

          {/* Queue Stats */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Average wait time</span>
              <span>~1-2 minutes</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MatchmakingModal;
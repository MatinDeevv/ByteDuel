import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Users, 
  Clock, 
  Zap, 
  Settings, 
  Crown, 
  Target,
  ChevronDown,
  Info,
  TrendingUp,
  Shield,
  Bug
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedButton from './AnimatedButton';
import RatingDisplay from './RatingDisplay';
import MatchmakingDebugPanel from './MatchmakingDebugPanel';
import { useAdvancedMatchmakingStore } from '../../store/advancedMatchmakingStore';
import { useAuth } from '../hooks/useAuth';
import { getRatingTier } from '../lib/elo';
import { advancedMatchmakingService } from '../../services/advancedMatchmakingService';

interface AdvancedMatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdvancedMatchmakingModal: React.FC<AdvancedMatchmakingModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const {
    isInQueue,
    isSearching,
    queueStatus,
    currentMatch,
    showMatchModal,
    showOptionsModal,
    error,
    userRating,
    preferredTimeControl,
    preferredColor,
    matchmakingStats,
    joinQueue,
    leaveQueue,
    acceptMatch,
    clearMatch,
    clearError,
    setShowOptionsModal,
    setPreferredTimeControl,
    setPreferredColor,
    loadMatchmakingStats,
  } = useAdvancedMatchmakingStore();

  const [selectedMode, setSelectedMode] = useState<'ranked' | 'casual'>('ranked');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const userTier = getRatingTier(profile?.elo_rating || userRating);
  const timeControls = advancedMatchmakingService.getAvailableTimeControls();

  // Load stats when modal opens
  useEffect(() => {
    if (isOpen) {
      loadMatchmakingStats();
    }
  }, [isOpen, loadMatchmakingStats]);

  // Handle joining queue
  const handleJoinQueue = async () => {
    if (!user?.id) return;
    
    try {
      await joinQueue(user.id, {
        mode: selectedMode,
        timeControl: preferredTimeControl,
        preferredColor,
      });
    } catch (error) {
      console.error('Failed to join advanced queue:', error);
    }
  };

  // Handle leaving queue
  const handleLeaveQueue = async () => {
    if (!user?.id) return;
    
    try {
      await leaveQueue(user.id);
      onClose();
    } catch (error) {
      console.error('Failed to leave advanced queue:', error);
    }
  };

  // Handle accepting match
  const handleAcceptMatch = () => {
    if (!currentMatch?.duelId) return;
    
    acceptMatch();
    onClose();
    navigate(`/duel/${currentMatch.duelId}`);
  };

  // Auto-accept match after 3 seconds
  useEffect(() => {
    if (currentMatch?.duelId && showMatchModal) {
      const timeout = setTimeout(() => {
        handleAcceptMatch();
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [currentMatch, showMatchModal]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMatchQualityColor = (quality?: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'very_good': return 'text-blue-500';
      case 'good': return 'text-yellow-500';
      case 'fair': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getMatchQualityIcon = (quality?: string) => {
    switch (quality) {
      case 'excellent': return '🌟';
      case 'very_good': return '⭐';
      case 'good': return '👍';
      case 'fair': return '👌';
      default: return '⚖️';
    }
  };

  const getFairPlayPoolBadge = (pool?: string) => {
    switch (pool) {
      case 'standard':
        return { icon: '✅', text: 'Standard Pool', color: 'text-green-600 bg-green-100' };
      case 'timeout_prone':
        return { icon: '⏰', text: 'Timeout Pool', color: 'text-yellow-600 bg-yellow-100' };
      case 'rage_quitters':
        return { icon: '😤', text: 'Restricted Pool', color: 'text-red-600 bg-red-100' };
      default:
        return { icon: '🎯', text: 'Fair Play', color: 'text-blue-600 bg-blue-100' };
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
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Smart Matchmaking
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {userTier.icon} {userTier.name} • {profile?.elo_rating || userRating} ELO
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Debug Button - Only in development */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Debug Panel"
                >
                  <Bug className="h-5 w-5 text-orange-500" />
                </button>
              )}
              
              <button
                onClick={() => setShowOptionsModal(!showOptionsModal)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Matchmaking Options"
              >
                <Settings className="h-5 w-5 text-gray-500" />
              </button>
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

          {/* Perfect Match Found */}
          {currentMatch && currentMatch.matched && (
            <motion.div
              className="text-center mb-6"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              <motion.div
                className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Users className="h-8 w-8 text-white" />
              </motion.div>
              <h3 className="text-lg font-bold text-green-500 mb-2">
                {getMatchQualityIcon(currentMatch.matchQuality)} Perfect Match Found!
              </h3>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-gray-600 dark:text-gray-400">Opponent</div>
                    <div className="text-gray-900 dark:text-white font-bold">
                      {currentMatch.opponentName}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-600 dark:text-gray-400">ELO</div>
                    <div className="text-gray-900 dark:text-white font-bold">
                      {currentMatch.opponentRating}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-600 dark:text-gray-400">Your Color</div>
                    <div className="text-gray-900 dark:text-white font-bold">
                      {currentMatch.assignedColor === 'white' ? '⚪ White' : '⚫ Black'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-600 dark:text-gray-400">Quality</div>
                    <div className={`font-bold ${getMatchQualityColor(currentMatch.matchQuality)}`}>
                      {getMatchQualityIcon(currentMatch.matchQuality)} {currentMatch.matchQuality}
                    </div>
                  </div>
                </div>
                
                {currentMatch.ratingDifference !== undefined && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-center space-x-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-600 dark:text-gray-400">Rating difference:</span>
                      <span className="font-bold text-blue-500">±{currentMatch.ratingDifference}</span>
                    </div>
                  </div>
                )}
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

          {/* Advanced Queue Status */}
          {isInQueue && !currentMatch?.matched && (
            <div className="text-center mb-6">
              <div className="relative mb-4">
                <motion.div
                  className="w-16 h-16 border-4 border-gradient-to-r from-blue-500 to-purple-600 border-t-transparent rounded-full mx-auto"
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
                🎯 Smart Matching in Progress...
              </h3>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">Queue Position</div>
                    <div className="text-gray-900 dark:text-white">#{queueStatus?.position || 1}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">Time Control</div>
                    <div className="text-gray-900 dark:text-white">{queueStatus?.timeControl}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">Rating Range</div>
                    <div className="text-gray-900 dark:text-white">
                      ±{queueStatus?.currentRatingRange || 25}
                      {queueStatus?.expansionCount && queueStatus.expansionCount > 0 && (
                        <span className="text-xs text-yellow-500 ml-1">
                          (expanded {queueStatus.expansionCount}x)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">Est. Wait</div>
                    <div className="text-gray-900 dark:text-white">
                      ~{Math.ceil((queueStatus?.estimatedWaitSeconds || 60) / 60)}m
                    </div>
                  </div>
                </div>
                
                {queueStatus?.similarRatingAhead !== undefined && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-center space-x-2 text-sm">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-blue-600 dark:text-blue-400">
                        {queueStatus.similarRatingAhead} similar players ahead
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Fair Play Pool Badge */}
              {queueStatus?.fairPlayPool && (
                <div className="mb-4">
                  {(() => {
                    const badge = getFairPlayPoolBadge(queueStatus.fairPlayPool);
                    return (
                      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                        <span>{badge.icon}</span>
                        <span>{badge.text}</span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                <p>🧠 AI expanding search range automatically</p>
                <p>⚡ Prioritizing closest rating matches</p>
                <p>🎯 Balancing speed vs match quality</p>
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

          {/* Options Panel */}
          {showOptionsModal && (
            <motion.div
              className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Matchmaking Options</h4>
              
              <div className="space-y-4">
                {/* Game Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Game Mode
                  </label>
                  <div className="flex space-x-2">
                    {(['ranked', 'casual'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSelectedMode(mode)}
                        className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm ${
                          selectedMode === mode
                            ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {mode === 'ranked' ? <Crown className="h-4 w-4 mx-auto" /> : <Target className="h-4 w-4 mx-auto" />}
                        <span className="capitalize">{mode}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Control
                  </label>
                  <select
                    value={preferredTimeControl}
                    onChange={(e) => setPreferredTimeControl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {timeControls.map((tc) => (
                      <option key={tc.value} value={tc.value}>
                        {tc.label} - {tc.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color Preference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color Preference
                  </label>
                  <div className="flex space-x-2">
                    {([
                      { value: 'white', label: '⚪ White', color: 'bg-gray-100' },
                      { value: 'black', label: '⚫ Black', color: 'bg-gray-800 text-white' },
                      { value: 'random', label: '🎲 Random', color: 'bg-gradient-to-r from-gray-100 to-gray-800' }
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPreferredColor(option.value)}
                        className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm ${
                          preferredColor === option.value
                            ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Initial State */}
          {!isInQueue && !isSearching && !currentMatch && (
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Advanced Chess.com-style Matching
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Smart algorithms find the perfect opponent for your skill level with dynamic rating expansion.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-center">
                  <Info className="h-4 w-4 mr-2" />
                  How Smart Matching Works
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Starts with ±50 rating range, expands intelligently</li>
                  <li>• Fair play pools separate problematic players</li>
                  <li>• Color balancing based on recent games</li>
                  <li>• Avoids immediate rematches</li>
                  <li>• Faster matching with fewer players online</li>
                </ul>
              </div>

              {/* Current Settings Display */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Mode:</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">{selectedMode}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600 dark:text-gray-400">Time:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{preferredTimeControl}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600 dark:text-gray-400">Color:</span>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">{preferredColor}</span>
                </div>
              </div>

              {/* Queue Stats */}
              {matchmakingStats && (
                <div className="mb-6 grid grid-cols-2 gap-4 text-xs">
                  <div className="text-center">
                    <div className="font-bold text-blue-500">{matchmakingStats.totalInQueue}</div>
                    <div className="text-gray-500">Players in Queue</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-500">~{Math.round(matchmakingStats.averageWaitSeconds)}s</div>
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
                  Find Smart Match
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
              <span>Smart matching algorithm</span>
              <span>Chess.com-style experience</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Debug Panel */}
      <MatchmakingDebugPanel
        isOpen={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
    </AnimatePresence>
  );
};

export default AdvancedMatchmakingModal;
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Users, 
  Clock, 
  Trophy, 
  Target, 
  Zap, 
  RefreshCw, 
  Play,
  Crown,
  Star,
  X,
  Timer,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedButton from './AnimatedButton';
import AnimatedCard from './AnimatedCard';
import RatingDisplay from './RatingDisplay';
import { useAuth } from '../hooks/useAuth';
import { getAllLobbies, createLobby, joinLobby, leaveLobby, cleanupExpiredLobbies, type GameLobby } from '../services/lobbyService';
import { getRatingTier } from '../lib/elo';

interface StandardizedLobbyProps {
  className?: string;
}

const StandardizedLobby: React.FC<StandardizedLobbyProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [lobbies, setLobbies] = useState<GameLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joiningLobby, setJoiningLobby] = useState<string | null>(null);

  // Auto-refresh lobbies and cleanup
  useEffect(() => {
    loadLobbies();
    const interval = setInterval(() => {
      loadLobbies();
      cleanupExpiredLobbies(); // Run cleanup periodically
    }, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadLobbies = async () => {
    try {
      const lobbyList = await getAllLobbies();
      setLobbies(lobbyList);
    } catch (error) {
      console.error('Failed to load lobbies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLobbies();
  };

  const handleJoinLobby = async (lobbyId: string) => {
    if (!user) return;
    
    console.log('🚪 Joining lobby:', lobbyId);
    setJoiningLobby(lobbyId);
    try {
      const result = await joinLobby(lobbyId);
      console.log('📋 Join result:', result);
      
      if (result.success) {
        if (result.duel_id) {
          // Lobby was full, duel created
          console.log('🎯 Duel created, navigating to:', result.duel_id);
          navigate(`/duel/${result.duel_id}`);
        } else {
          // Successfully joined, waiting for more players
          console.log('⏳ Joined lobby, waiting for more players');
          loadLobbies(); // Refresh to show updated lobby
        }
      } else {
        const errorMsg = result.error || 'Failed to join lobby';
        console.error('❌ Join failed:', errorMsg);
        alert(errorMsg);
      }
    } catch (error) {
      console.error('💥 Exception joining lobby:', error);
      alert(`Failed to join lobby: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setJoiningLobby(null);
    }
  };

  const handleLeaveLobby = async (lobbyId: string) => {
    console.log('🚪 Leaving lobby:', lobbyId);
    try {
      const success = await leaveLobby(lobbyId);
      if (success) {
        console.log('✅ Left lobby successfully');
        loadLobbies(); // Refresh the list
      } else {
        console.error('❌ Failed to leave lobby');
        alert('Failed to leave lobby');
      }
    } catch (error) {
      console.error('Failed to leave lobby:', error);
      alert(`Failed to leave lobby: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins <= 0) return 'Expired';
    if (diffMins < 60) return `${diffMins}m left`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m left`;
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Level 1 Game Lobby
          </h2>
          <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">Level 1 Only</span>
            </div>
            <span>•</span>
            <span>{lobbies.length} lobbies available</span>
            <span>•</span>
            <span>{lobbies.filter(l => l.status === 'waiting').length} waiting for players</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <AnimatedButton
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </AnimatedButton>
          
          <AnimatedButton
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Host Level 1 Game
          </AnimatedButton>
        </div>
      </div>

      {/* Lobbies List */}
      <div className="space-y-4">
        <AnimatePresence>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <AnimatedCard key={i} className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </AnimatedCard>
              ))}
            </div>
          ) : lobbies.length === 0 ? (
            <AnimatedCard className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Level 1 lobbies available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Be the first to host a Level 1 game and start competing!
              </p>
              <AnimatedButton
                onClick={() => setShowCreateModal(true)}
                variant="primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Host First Level 1 Game
              </AnimatedButton>
            </AnimatedCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lobbies.map((lobby, index) => {
                const isOwnLobby = lobby.host_id === user?.id;
                const isInLobby = user && lobby.player_ids.includes(user.id);
                const tier = getRatingTier(lobby.host_rating);
                const timeRemaining = formatTimeRemaining(lobby.expires_at);
                const isExpiringSoon = new Date(lobby.expires_at).getTime() - Date.now() < 5 * 60 * 1000; // 5 minutes
                
                return (
                  <motion.div
                    key={lobby.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <AnimatedCard className="p-6 hover:shadow-lg transition-shadow">
                      {/* Lobby Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {lobby.host_avatar ? (
                            <img
                              src={lobby.host_avatar}
                              alt={lobby.host_name}
                              className="w-12 h-12 rounded-full border-2 border-yellow-500"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-white font-bold border-2 border-yellow-500">
                              {lobby.host_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {lobby.host_name}
                              </h3>
                              {isOwnLobby && (
                                <Crown className="h-4 w-4 text-yellow-500" title="Your lobby" />
                              )}
                            </div>
                            <div className="flex items-center space-x-1 text-sm">
                              <span className={tier.color}>{tier.icon}</span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {lobby.host_rating} ELO
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Level 1 Badge */}
                        <div className="px-3 py-1 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold flex items-center space-x-1">
                          <Award className="h-4 w-4" />
                          <span>Level 1</span>
                        </div>
                      </div>

                      {/* Lobby Info */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Mode:</span>
                          <div className="flex items-center space-x-1">
                            {lobby.settings.mode === 'ranked' ? (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <Target className="h-4 w-4 text-blue-500" />
                            )}
                            <span className="font-medium text-gray-900 dark:text-white capitalize">
                              {lobby.settings.mode}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Players:</span>
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {lobby.current_players}/{lobby.max_players}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Time Limit:</span>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {Math.floor(lobby.settings.timeLimit / 60)}m
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Created:</span>
                          <span className="text-gray-900 dark:text-white">
                            {formatTimeAgo(lobby.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                          <span className={`font-medium ${isExpiringSoon ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                            {timeRemaining}
                          </span>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <div className="mb-4">
                        <div className={`px-3 py-2 rounded-lg text-center text-sm font-medium ${
                          lobby.status === 'waiting' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                          lobby.status === 'starting' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                          'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                        }`}>
                          {lobby.status === 'waiting' && 'Waiting for players'}
                          {lobby.status === 'starting' && 'Starting soon...'}
                          {lobby.status === 'active' && 'Game in progress'}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center space-x-2">
                        {isOwnLobby ? (
                          <AnimatedButton
                            onClick={() => handleLeaveLobby(lobby.id)}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel Lobby
                          </AnimatedButton>
                        ) : isInLobby ? (
                          <AnimatedButton
                            onClick={() => handleLeaveLobby(lobby.id)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Leave Lobby
                          </AnimatedButton>
                        ) : lobby.status === 'waiting' ? (
                          <AnimatedButton
                            onClick={() => handleJoinLobby(lobby.id)}
                            disabled={joiningLobby === lobby.id}
                            loading={joiningLobby === lobby.id}
                            variant="primary"
                            size="sm"
                            className="flex-1"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Join Level 1 Game
                          </AnimatedButton>
                        ) : (
                          <div className="flex-1 text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                            {lobby.status === 'starting' ? 'Starting...' : 'In Progress'}
                          </div>
                        )}
                      </div>
                    </AnimatedCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Lobby Modal */}
      <CreateLobbyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onLobbyCreated={() => {
          setShowCreateModal(false);
          loadLobbies();
        }}
      />
    </div>
  );
};

// Create Lobby Modal Component
interface CreateLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLobbyCreated: () => void;
}

const CreateLobbyModal: React.FC<CreateLobbyModalProps> = ({ isOpen, onClose, onLobbyCreated }) => {
  const [mode, setMode] = useState<'ranked' | 'casual'>('ranked');
  const [timeLimit, setTimeLimit] = useState(900); // 15 minutes
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      console.log('🎮 Creating Level 1 lobby with options:', {
        mode,
        timeLimit,
      });
      
      await createLobby({
        mode,
        timeLimit,
      });
      onLobbyCreated();
      console.log('✅ Level 1 lobby created successfully');
    } catch (error) {
      console.error('Failed to create lobby:', error);
      alert(`Failed to create lobby: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Host Level 1 Game</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Standardized beginner-friendly challenges</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Level 1 Info */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center space-x-2 mb-2">
                <Award className="h-5 w-5 text-yellow-600" />
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Level 1 Features</h3>
              </div>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>• Beginner-friendly coding challenges</li>
                <li>• Standardized difficulty and format</li>
                <li>• Perfect for learning and practice</li>
                <li>• Fair matchmaking for all skill levels</li>
              </ul>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Game Mode
              </label>
              <div className="flex space-x-3">
                {(['ranked', 'casual'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      mode === m
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-600'
                        : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {m === 'ranked' ? (
                        <Trophy className="h-4 w-4" />
                      ) : (
                        <Target className="h-4 w-4" />
                      )}
                      <span className="capitalize font-medium">{m}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Time Limit
              </label>
              <select
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full px-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value={600}>10 minutes</option>
                <option value={900}>15 minutes</option>
                <option value={1200}>20 minutes</option>
                <option value={1800}>30 minutes</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3 mt-8">
            <AnimatedButton
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton
              onClick={handleCreate}
              disabled={creating}
              loading={creating}
              variant="primary"
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Host Level 1 Game
            </AnimatedButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StandardizedLobby;
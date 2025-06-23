import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Zap, 
  Plus, 
  RefreshCw, 
  Play, 
  Clock, 
  Crown, 
  Award, 
  Trophy, 
  Target,
  X
} from 'lucide-react';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedCard from '../components/AnimatedCard';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import FastMatchmakingModal from '../components/FastMatchmakingModal';
import { useAuth } from '../hooks/useAuth';
import { getAllLobbies, createLobby, joinLobby, leaveLobby, type GameLobby } from '../services/lobbyService';
import { getRatingTier } from '../lib/elo';

const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [lobbies, setLobbies] = useState<GameLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFastMatch, setShowFastMatch] = useState(false);
  const [joiningLobby, setJoiningLobby] = useState<string | null>(null);

  // Auto-refresh lobbies
  useEffect(() => {
    loadLobbies();
    const interval = setInterval(loadLobbies, 5000); // Every 5 seconds
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
      alert('Failed to join lobby. Please try again.');
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
        alert('Failed to leave lobby. Please try again.');
      }
    } catch (error) {
      console.error('Failed to leave lobby:', error);
      alert('Failed to leave lobby. Please try again.');
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
                    Join games or get matched instantly
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
          {/* Quick Actions */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fast Matchmaking Card */}
              <AnimatedCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Zap className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Quick Match
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Instant ELO-based matching
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Get matched with a player of similar skill level in 30-60 seconds. Perfect for quick games!
                </p>
                <AnimatedButton
                  onClick={() => setShowFastMatch(true)}
                  variant="primary"
                  className="w-full"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Find Quick Match
                </AnimatedButton>
              </AnimatedCard>

              {/* Host Game Card */}
              <AnimatedCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Crown className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Host Game
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Create a custom lobby
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Host a public game that other players can join. Customize difficulty and time limits.
                </p>
                <AnimatedButton
                  onClick={() => setShowCreateModal(true)}
                  variant="secondary"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Host Game
                </AnimatedButton>
              </AnimatedCard>
            </div>
          </motion.div>

          {/* Lobbies List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Available Games
                </h2>
                <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
                  <span>{lobbies.length} games available</span>
                  <span>•</span>
                  <span>{lobbies.filter(l => l.status === 'waiting').length} waiting for players</span>
                </div>
              </div>
              
              <AnimatedButton
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </AnimatedButton>
            </div>

            {/* Lobbies Grid */}
            <div className="space-y-4">
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
                    No games available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Be the first to host a game or try quick matchmaking!
                  </p>
                  <div className="flex space-x-3 justify-center">
                    <AnimatedButton
                      onClick={() => setShowCreateModal(true)}
                      variant="primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Host Game
                    </AnimatedButton>
                    <AnimatedButton
                      onClick={() => setShowFastMatch(true)}
                      variant="secondary"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Quick Match
                    </AnimatedButton>
                  </div>
                </AnimatedCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lobbies.map((lobby, index) => {
                    const isOwnLobby = lobby.host_id === user?.id;
                    const isInLobby = user && lobby.player_ids.includes(user.id);
                    const tier = getRatingTier(lobby.host_rating);
                    const timeRemaining = formatTimeRemaining(lobby.expires_at);
                    const isExpiringSoon = new Date(lobby.expires_at).getTime() - Date.now() < 5 * 60 * 1000;
                    
                    return (
                      <motion.div
                        key={lobby.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
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
                                  className="w-12 h-12 rounded-full border-2 border-blue-500"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold border-2 border-blue-500">
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
                            
                            {/* Game Mode Badge */}
                            <div className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-bold flex items-center space-x-1">
                              {lobby.settings.mode === 'ranked' ? (
                                <Trophy className="h-4 w-4" />
                              ) : (
                                <Target className="h-4 w-4" />
                              )}
                              <span className="capitalize">{lobby.settings.mode}</span>
                            </div>
                          </div>

                          {/* Lobby Info */}
                          <div className="space-y-3 mb-4">
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
                                Cancel Game
                              </AnimatedButton>
                            ) : isInLobby ? (
                              <AnimatedButton
                                onClick={() => handleLeaveLobby(lobby.id)}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Leave Game
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
                                Join Game
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
            </div>
          </motion.div>
        </main>

        {/* Create Lobby Modal */}
        <CreateLobbyModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onLobbyCreated={() => {
            setShowCreateModal(false);
            loadLobbies();
          }}
        />

        {/* Fast Matchmaking Modal */}
        <FastMatchmakingModal
          isOpen={showFastMatch}
          onClose={() => setShowFastMatch(false)}
          mode="ranked"
        />
      </div>
    </PageTransition>
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
      console.log('🎮 Creating lobby with options:', {
        mode,
        timeLimit,
      });
      
      await createLobby({
        mode,
        timeLimit,
      });
      onLobbyCreated();
      console.log('✅ Lobby created successfully');
    } catch (error) {
      console.error('Failed to create lobby:', error);
      alert(`Failed to create lobby: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
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
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Crown className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Host Game</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create a public lobby</p>
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
                      ? 'border-green-500 bg-green-500/10 text-green-600'
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
              className="w-full px-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
            variant="success"
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Game
          </AnimatedButton>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LobbyPage;
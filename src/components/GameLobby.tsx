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
  Filter,
  Search,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedButton from './AnimatedButton';
import AnimatedCard from './AnimatedCard';
import RatingDisplay from './RatingDisplay';
import { useAuth } from '../hooks/useAuth';
import { getAllGames, createGame, joinGame, cancelGame, type GameLobby } from '../services/gameService';
import { getRatingTier } from '../lib/elo';

interface GameLobbyProps {
  className?: string;
}

const GameLobby: React.FC<GameLobbyProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [games, setGames] = useState<GameLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joiningGame, setJoiningGame] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'ranked' | 'casual'>('all');

  // Auto-refresh games every second
  useEffect(() => {
    loadGames();
    const interval = setInterval(loadGames, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadGames = async () => {
    try {
      const gameList = await getAllGames();
      setGames(gameList);
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadGames();
  };

  const handleJoinGame = async (gameId: string) => {
    if (!user) return;
    
    setJoiningGame(gameId);
    try {
      const result = await joinGame(gameId);
      if (result.success && result.duelId) {
        navigate(`/duel/${result.duelId}`);
      } else {
        alert(result.error || 'Failed to join game');
      }
    } catch (error) {
      console.error('Failed to join game:', error);
      alert('Failed to join game');
    } finally {
      setJoiningGame(null);
    }
  };

  const handleCancelGame = async (gameId: string) => {
    try {
      const success = await cancelGame(gameId);
      if (success) {
        loadGames(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to cancel game:', error);
    }
  };

  const filteredGames = games.filter(game => {
    const matchesSearch = game.host_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterMode === 'all' || game.mode === filterMode;
    return matchesSearch && matchesFilter;
  });

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'ranked': return <Trophy className="h-4 w-4" />;
      case 'casual': return <Target className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'ranked': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'casual': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
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

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Game Lobby</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {games.length} games available • {games.filter(g => g.status === 'waiting').length} waiting for players
          </p>
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
            Host Game
          </AnimatedButton>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search games or players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          {(['all', 'ranked', 'casual'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterMode === mode
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Games List */}
      <div className="space-y-4">
        <AnimatePresence>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          ) : filteredGames.length === 0 ? (
            <AnimatedCard className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchTerm || filterMode !== 'all' ? 'No games match your filters' : 'No games available'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm || filterMode !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Be the first to host a game and start competing!'
                }
              </p>
              {(!searchTerm && filterMode === 'all') && (
                <AnimatedButton
                  onClick={() => setShowCreateModal(true)}
                  variant="primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Host First Game
                </AnimatedButton>
              )}
            </AnimatedCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGames.map((game, index) => {
                const isOwnGame = game.host_id === user?.id;
                const tier = getRatingTier(game.host_rating);
                
                return (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <AnimatedCard className="p-6 hover:shadow-lg transition-shadow">
                      {/* Game Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {game.host_avatar ? (
                            <img
                              src={game.host_avatar}
                              alt={game.host_name}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                              {game.host_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {game.host_name}
                              </h3>
                              {isOwnGame && (
                                <Crown className="h-4 w-4 text-yellow-500" title="Your game" />
                              )}
                            </div>
                            <div className="flex items-center space-x-1 text-sm">
                              <span className={tier.color}>{tier.icon}</span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {game.host_rating} ELO
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${getModeColor(game.mode)}`}>
                          <div className="flex items-center space-x-1">
                            {getModeIcon(game.mode)}
                            <span>{game.mode}</span>
                          </div>
                        </div>
                      </div>

                      {/* Game Info */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Topic:</span>
                          <span className="font-medium text-gray-900 dark:text-white capitalize">
                            {game.topic.replace('-', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Difficulty:</span>
                          <span className={`font-medium capitalize ${
                            game.difficulty === 'easy' ? 'text-green-500' :
                            game.difficulty === 'medium' ? 'text-yellow-500' :
                            'text-red-500'
                          }`}>
                            {game.difficulty}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Time Limit:</span>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {Math.floor(game.time_limit / 60)}m
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Created:</span>
                          <span className="text-gray-900 dark:text-white">
                            {formatTimeAgo(game.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      {game.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                          {game.description}
                        </p>
                      )}

                      {/* Action Button */}
                      <div className="flex items-center space-x-2">
                        {isOwnGame ? (
                          <AnimatedButton
                            onClick={() => handleCancelGame(game.id)}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel Game
                          </AnimatedButton>
                        ) : (
                          <AnimatedButton
                            onClick={() => handleJoinGame(game.id)}
                            disabled={joiningGame === game.id}
                            loading={joiningGame === game.id}
                            variant="primary"
                            size="sm"
                            className="flex-1"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Join Game
                          </AnimatedButton>
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

      {/* Create Game Modal */}
      <CreateGameModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGameCreated={() => {
          setShowCreateModal(false);
          loadGames();
        }}
      />
    </div>
  );
};

// Create Game Modal Component
interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGameCreated: () => void;
}

const CreateGameModal: React.FC<CreateGameModalProps> = ({ isOpen, onClose, onGameCreated }) => {
  const [mode, setMode] = useState<'ranked' | 'casual'>('ranked');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [topic, setTopic] = useState('algorithms');
  const [timeLimit, setTimeLimit] = useState(900); // 15 minutes
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const topics = [
    'algorithms', 'arrays', 'strings', 'linked-lists', 'trees', 'graphs',
    'dynamic-programming', 'recursion', 'sorting', 'searching', 'hash-tables'
  ];

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'ranked': return <Trophy className="h-4 w-4" />;
      case 'casual': return <Target className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createGame({
        mode,
        difficulty,
        topic,
        timeLimit,
        description: description || undefined,
      });
      onGameCreated();
    } catch (error) {
      console.error('Failed to create game:', error);
      alert('Failed to create game');
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Host New Game</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Game Mode
              </label>
              <div className="flex space-x-2">
                {(['ranked', 'casual'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                      mode === m
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                        : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      {getModeIcon(m)}
                      <span className="capitalize">{m}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty
              </label>
              <div className="flex space-x-2">
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all capitalize ${
                      difficulty === d
                        ? d === 'easy' ? 'border-green-500 bg-green-500/10 text-green-500' :
                          d === 'medium' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' :
                          'border-red-500 bg-red-500/10 text-red-500'
                        : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Limit
              </label>
              <select
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={600}>10 minutes</option>
                <option value={900}>15 minutes</option>
                <option value={1200}>20 minutes</option>
                <option value={1800}>30 minutes</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for your game..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
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
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Game
            </AnimatedButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GameLobby;
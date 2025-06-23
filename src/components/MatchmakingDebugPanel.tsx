import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bug, 
  RefreshCw, 
  Play, 
  Trash2, 
  Users, 
  Clock,
  Target,
  Zap 
} from 'lucide-react';
import AnimatedButton from './AnimatedButton';
import AnimatedCard from './AnimatedCard';
import { matchmakingDebugService, type QueueDebugInfo, type MatchingDebugResult } from '../../services/matchmakingDebugService';

interface MatchmakingDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MatchmakingDebugPanel: React.FC<MatchmakingDebugPanelProps> = ({ isOpen, onClose }) => {
  const [queueInfo, setQueueInfo] = useState<QueueDebugInfo[]>([]);
  const [debugResult, setDebugResult] = useState<MatchingDebugResult | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [queueData, statsData] = await Promise.all([
        matchmakingDebugService.getDetailedQueueInfo(),
        matchmakingDebugService.getQueueStatistics(),
      ]);
      
      setQueueInfo(queueData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDebugQueue = async () => {
    setLoading(true);
    try {
      const result = await matchmakingDebugService.debugQueue();
      setDebugResult(result);
      await loadAllData(); // Refresh data
    } catch (error) {
      console.error('Debug failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceProcess = async () => {
    setLoading(true);
    try {
      const result = await matchmakingDebugService.forceProcessQueue();
      console.log('Force process result:', result);
      await loadAllData(); // Refresh data
    } catch (error) {
      console.error('Force process failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearQueue = async () => {
    if (!confirm('Are you sure you want to clear the entire queue?')) return;
    
    setLoading(true);
    try {
      await matchmakingDebugService.clearQueue();
      await loadAllData(); // Refresh data
    } catch (error) {
      console.error('Clear queue failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    return `${Math.floor(diffSecs / 3600)}h ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Bug className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Matchmaking Debug Panel
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Debug and monitor the matchmaking system
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

        <div className="p-6">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            <AnimatedButton
              onClick={loadAllData}
              disabled={loading}
              loading={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </AnimatedButton>
            
            <AnimatedButton
              onClick={handleDebugQueue}
              disabled={loading}
              variant="primary"
              size="sm"
            >
              <Bug className="h-4 w-4 mr-2" />
              Debug Queue
            </AnimatedButton>
            
            <AnimatedButton
              onClick={handleForceProcess}
              disabled={loading}
              variant="secondary"
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Force Process
            </AnimatedButton>
            
            <AnimatedButton
              onClick={handleClearQueue}
              disabled={loading}
              variant="danger"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Queue
            </AnimatedButton>
          </div>

          {/* Statistics */}
          {stats && (
            <AnimatedCard className="mb-6">
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Queue Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{stats.total_in_queue}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total in Queue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{stats.ranked_players}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Ranked Players</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">{Math.round(stats.average_wait_seconds)}s</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Avg Wait Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">{stats.average_rating_range}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Avg Rating Range</div>
                  </div>
                </div>
              </div>
            </AnimatedCard>
          )}

          {/* Debug Result */}
          {debugResult && (
            <AnimatedCard className="mb-6">
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Last Debug Result</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
                    {JSON.stringify(debugResult.matchingResult, null, 2)}
                  </pre>
                </div>
              </div>
            </AnimatedCard>
          )}

          {/* Queue Details */}
          <AnimatedCard>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Current Queue ({queueInfo.length} players)
              </h3>
              
              {queueInfo.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No players in queue</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {queueInfo.map((player, index) => (
                    <motion.div
                      key={player.userId}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {player.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {player.displayName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {player.eloRating} ELO • {player.mode} • {player.timeControl}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="text-center">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              ±{player.currentRatingRange}
                            </div>
                            <div className="text-xs text-gray-500">Range</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {player.expansionCount}x
                            </div>
                            <div className="text-xs text-gray-500">Expanded</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {formatTime(player.queuedAt)}
                            </div>
                            <div className="text-xs text-gray-500">Queued</div>
                          </div>
                        </div>
                        
                        {player.fairPlayPool !== 'standard' && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              {player.fairPlayPool}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </AnimatedCard>
        </div>
      </motion.div>
    </div>
  );
};

export default MatchmakingDebugPanel;
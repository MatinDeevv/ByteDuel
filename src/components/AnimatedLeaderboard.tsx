import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import AnimatedCard from './AnimatedCard';

interface LeaderboardEntry {
  rank: number;
  username: string;
  eloRating: number;
  gamesWon: number;
  gamesPlayed: number;
}

interface AnimatedLeaderboardProps {
  entries: LeaderboardEntry[];
  className?: string;
}

const AnimatedLeaderboard: React.FC<AnimatedLeaderboardProps> = ({ entries, className = '' }) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-300" />;
      case 3:
        return <Award className="h-5 w-5 text-orange-400" />;
      default:
        return <span className="text-gray-400 font-mono text-sm">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-orange-400/20 to-red-500/20 border-orange-400/30';
      default:
        return 'bg-gray-800/50 border-gray-700';
    }
  };

  return (
    <AnimatedCard className={className}>
      <div className="p-6">
        <motion.div 
          className="flex items-center space-x-2 mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Trophy className="h-6 w-6 text-yellow-400" />
          <h2 className="text-xl font-bold dark:text-white">Leaderboard</h2>
        </motion.div>
        
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.username}
              className={`
                flex items-center justify-between p-4 rounded-lg border
                ${getRankColor(entry.rank)}
              `}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            >
              <div className="flex items-center space-x-4">
                <motion.div 
                  className="flex items-center justify-center w-8"
                  whileHover={{ scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {getRankIcon(entry.rank)}
                </motion.div>
                
                <div>
                  <div className="font-semibold text-white">{entry.username}</div>
                  <div className="text-sm text-gray-400">
                    {entry.gamesWon}W / {entry.gamesPlayed}G
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <motion.div 
                  className="font-bold text-blue-400 text-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + 0.1 * index, type: "spring", stiffness: 200 }}
                >
                  {entry.eloRating}
                </motion.div>
                <div className="text-xs text-gray-500">ELO</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AnimatedCard>
  );
};

export default AnimatedLeaderboard;
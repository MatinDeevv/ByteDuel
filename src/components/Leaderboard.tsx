import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import Card from './Card';

interface LeaderboardEntry {
  rank: number;
  username: string;
  eloRating: number;
  gamesWon: number;
  gamesPlayed: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  className?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ entries, className = '' }) => {
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
    <Card className={className}>
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Trophy className="h-6 w-6 text-yellow-400" />
          <h2 className="text-xl font-bold">Leaderboard</h2>
        </div>
        
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.username}
              className={`
                flex items-center justify-between p-4 rounded-lg border
                ${getRankColor(entry.rank)}
              `}
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(entry.rank)}
                </div>
                
                <div>
                  <div className="font-semibold text-white">{entry.username}</div>
                  <div className="text-sm text-gray-400">
                    {entry.gamesWon}W / {entry.gamesPlayed}G
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-blue-400">{entry.eloRating}</div>
                <div className="text-xs text-gray-500">ELO</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default Leaderboard;
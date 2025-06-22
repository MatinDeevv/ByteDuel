import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Target, Trophy, Bot, BookOpen } from 'lucide-react';
import { GameMode } from '../types';

interface ModeSelectorProps {
  selectedMode: GameMode;
  onModeSelect: (mode: GameMode) => void;
  className?: string;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onModeSelect, className = '' }) => {
  const modes = [
    {
      id: 'ranked-duel' as GameMode,
      name: 'Ranked Duel',
      description: 'Competitive matchmaking with Elo rating',
      icon: Zap,
      color: 'from-blue-500 to-purple-600',
      textColor: 'text-blue-400',
    },
    {
      id: 'timed-trial' as GameMode,
      name: 'Timed Trial',
      description: 'Solo challenges with strict time limits',
      icon: Target,
      color: 'from-orange-500 to-red-600',
      textColor: 'text-orange-400',
    },
    {
      id: 'tournament' as GameMode,
      name: 'Tournament',
      description: 'Bracketed competitions with multiple rounds',
      icon: Trophy,
      color: 'from-yellow-500 to-orange-600',
      textColor: 'text-yellow-400',
    },
    {
      id: 'beat-the-bot' as GameMode,
      name: 'Beat the Bot',
      description: 'Challenge AI opponents at various difficulties',
      icon: Bot,
      color: 'from-green-500 to-teal-600',
      textColor: 'text-green-400',
    },
    {
      id: 'practice' as GameMode,
      name: 'Practice Mode',
      description: 'Self-paced learning with hints and guidance',
      icon: BookOpen,
      color: 'from-purple-500 to-pink-600',
      textColor: 'text-purple-400',
    },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;
        
        return (
          <motion.button
            key={mode.id}
            onClick={() => onModeSelect(mode.id)}
            className={`
              relative p-6 rounded-xl border-2 transition-all duration-300 text-left
              ${isSelected 
                ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/25 dark:bg-blue-500/10' 
                : 'border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600 hover:bg-white dark:hover:bg-gray-800'
              }
            `}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * modes.indexOf(mode) }}
          >
            <div className="flex items-start space-x-4">
              <motion.div 
                className={`
                p-3 rounded-lg bg-gradient-to-br ${mode.color} 
                ${isSelected ? 'shadow-lg' : ''}
                `}
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Icon className="h-6 w-6 text-white" />
              </motion.div>
              
              <div className="flex-1">
                <h3 className={`font-semibold mb-2 ${isSelected ? mode.textColor : 'text-gray-900 dark:text-white'}`}>
                  {mode.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {mode.description}
                </p>
              </div>
            </div>
            
            {isSelected && (
              <motion.div 
                className="absolute top-2 right-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                <motion.div 
                  className="w-3 h-3 bg-blue-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default ModeSelector;
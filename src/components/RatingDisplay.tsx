import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getRatingTier } from '../lib/elo';

interface RatingDisplayProps {
  rating: number;
  delta?: number;
  showDelta?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating,
  delta,
  showDelta = false,
  size = 'md',
  className = '',
}) => {
  const tier = getRatingTier(rating);
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className={`${sizeClasses[size]} font-mono font-bold ${tier.color}`}>
        {tier.icon} {rating}
      </span>
      
      <span className={`${sizeClasses[size]} text-gray-500 dark:text-gray-400`}>
        {tier.name}
      </span>

      {showDelta && delta !== undefined && delta !== 0 && (
        <motion.div
          className={`flex items-center space-x-1 ${
            delta > 0 ? 'text-green-400' : 'text-red-400'
          }`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
        >
          {delta > 0 ? (
            <TrendingUp className={iconSizes[size]} />
          ) : (
            <TrendingDown className={iconSizes[size]} />
          )}
          <span className={`${sizeClasses[size]} font-mono font-bold`}>
            {delta > 0 ? '+' : ''}{delta}
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default RatingDisplay;
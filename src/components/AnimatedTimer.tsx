import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface AnimatedTimerProps {
  initialTime: number; // in seconds
  onTimeUp?: () => void;
  className?: string;
}

const AnimatedTimer: React.FC<AnimatedTimerProps> = ({ initialTime, onTimeUp, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp?.();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onTimeUp]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getColorClass = (): string => {
    if (timeLeft <= 60) return 'text-red-400';
    if (timeLeft <= 300) return 'text-yellow-400';
    return 'text-green-400';
  };

  const progress = (initialTime - timeLeft) / initialTime;
  const isUrgent = timeLeft <= 60;

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="relative">
        <motion.div
          className={`w-12 h-12 rounded-full border-4 ${
            isUrgent ? 'border-red-400' : timeLeft <= 300 ? 'border-yellow-400' : 'border-green-400'
          }`}
          animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 1, repeat: isUrgent ? Infinity : 0 }}
        >
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-700"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <motion.path
              className={getColorClass()}
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              initial={{ strokeDasharray: "0 100" }}
              animate={{ strokeDasharray: `${progress * 100} 100` }}
              transition={{ duration: 0.5 }}
            />
          </svg>
        </motion.div>
        <Clock className="absolute inset-0 m-auto h-5 w-5 text-gray-400" />
      </div>
      
      <motion.span 
        className={`font-mono font-bold text-xl ${getColorClass()}`}
        animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.5, repeat: isUrgent ? Infinity : 0 }}
      >
        {formatTime(timeLeft)}
      </motion.span>
    </div>
  );
};

export default AnimatedTimer;
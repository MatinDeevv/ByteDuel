import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface TestCaseAnimationProps {
  status: 'pending' | 'passed' | 'failed';
  input: string;
  expected: string;
  actual?: string;
  index: number;
}

const TestCaseAnimation: React.FC<TestCaseAnimationProps> = ({
  status,
  input,
  expected,
  actual,
  index,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'passed':
        return 'border-green-500/30 bg-green-500/5';
      case 'failed':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return 'border-gray-700 bg-gray-800/50';
    }
  };

  return (
    <motion.div
      className={`rounded-lg p-4 border ${getStatusColor()}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-300">Test Case {index + 1}</span>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: status !== 'pending' ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 500, delay: 0.2 }}
        >
          {getStatusIcon()}
        </motion.div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="text-gray-400">Input:</span>
          <pre className="text-blue-400 mt-1 font-mono">{input}</pre>
        </div>
        <div>
          <span className="text-gray-400">Expected:</span>
          <pre className="text-green-400 mt-1 font-mono">{expected}</pre>
        </div>
        {actual && status === 'failed' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-gray-400">Actual:</span>
            <pre className="text-red-400 mt-1 font-mono">{actual}</pre>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default TestCaseAnimation;
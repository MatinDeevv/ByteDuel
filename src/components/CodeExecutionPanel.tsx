import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle, XCircle, Clock, Zap, AlertTriangle, BarChart3, Trophy, Target } from 'lucide-react';
import AnimatedButton from './AnimatedButton';
import TestCaseAnimation from './TestCaseAnimation';
import { codeExecutionService, type ExecutionResult, type TestCase } from '../services/codeExecutionService';

interface CodeExecutionPanelProps {
  code: string;
  testCases: TestCase[];
  onExecutionComplete?: (result: ExecutionResult) => void;
  language?: string;
  userId?: string;
  className?: string;
}

const CodeExecutionPanel: React.FC<CodeExecutionPanelProps> = ({
  code,
  testCases,
  onExecutionComplete,
  language = 'javascript',
  userId,
  className = '',
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showBenchmark, setShowBenchmark] = useState(false);

  const handleExecute = async () => {
    if (!code.trim()) {
      return;
    }

    setIsExecuting(true);
    setResult(null);

    try {
      const executionResult = await codeExecutionService.executeCode(
        code,
        testCases,
        userId,
        {
          language,
          timeout: 5000,
          enableCaching: true,
          enableBenchmarking: false, // Enable for detailed analysis
        }
      );

      setResult(executionResult);
      onExecutionComplete?.(executionResult);
    } catch (error) {
      const errorResult: ExecutionResult = {
        passed: false,
        passedTests: 0,
        totalTests: testCases.length,
        runtimeMs: 0,
        wrongAttempts: 1,
        testResults: [],
        error: error instanceof Error ? error.message : 'Execution failed',
        performanceScore: 0,
        speedBonus: 0,
      };
      setResult(errorResult);
      onExecutionComplete?.(errorResult);
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusIcon = () => {
    if (isExecuting) {
      return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    if (!result) {
      return <Play className="h-5 w-5 text-gray-400" />;
    }
    if (result.passed) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusText = () => {
    if (isExecuting) return 'Executing...';
    if (!result) return 'Ready to run';
    if (result.passed) return 'All tests passed!';
    return `${result.passedTests}/${result.totalTests} tests passed`;
  };

  const getStatusColor = () => {
    if (isExecuting) return 'text-blue-600 dark:text-blue-400';
    if (!result) return 'text-gray-600 dark:text-gray-400';
    if (result.passed) return 'text-green-600 dark:text-green-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSpeedRating = (time: number) => {
    if (time <= 100) return { label: 'Lightning', color: 'text-purple-500', icon: '⚡' };
    if (time <= 200) return { label: 'Very Fast', color: 'text-green-500', icon: '🚀' };
    if (time <= 500) return { label: 'Fast', color: 'text-blue-500', icon: '💨' };
    if (time <= 1000) return { label: 'Good', color: 'text-yellow-500', icon: '👍' };
    if (time <= 2000) return { label: 'Average', color: 'text-orange-500', icon: '⏱️' };
    return { label: 'Slow', color: 'text-red-500', icon: '🐌' };
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Code Execution</h3>
            <p className={`text-sm ${getStatusColor()}`}>{getStatusText()}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {result && (
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4" />
                <span>{result.runtimeMs}ms</span>
              </div>
              {result.memoryUsage && (
                <div className="flex items-center space-x-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>{(result.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
                </div>
              )}
              {result.performanceScore !== undefined && (
                <div className="flex items-center space-x-1">
                  <Target className={`h-4 w-4 ${getPerformanceColor(result.performanceScore)}`} />
                  <span className={getPerformanceColor(result.performanceScore)}>
                    {result.performanceScore}/100
                  </span>
                </div>
              )}
            </div>
          )}

          <AnimatedButton
            onClick={handleExecute}
            disabled={isExecuting || !code.trim()}
            loading={isExecuting}
            variant="primary"
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            Run Code
          </AnimatedButton>
        </div>
      </div>

      {/* Results */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Error Message */}
              {result.error && (
                <motion.div
                  className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-200">Execution Error</h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{result.error}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Security Violations */}
              {result.securityViolations && result.securityViolations.length > 0 && (
                <motion.div
                  className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Security Issues</h4>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                        {result.securityViolations.map((violation, index) => (
                          <li key={index}>• {violation}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Performance Summary */}
              {result.passed && (
                <motion.div
                  className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <h4 className="font-medium text-green-800 dark:text-green-200">
                        All tests passed!
                      </h4>
                    </div>
                    {(result as any).cached && (
                      <div className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-800 px-2 py-1 rounded">
                        Cached Result
                      </div>
                    )}
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Speed</span>
                      </div>
                      <div className={`font-bold ${getSpeedRating(result.runtimeMs).color}`}>
                        {getSpeedRating(result.runtimeMs).icon} {getSpeedRating(result.runtimeMs).label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {result.runtimeMs}ms
                      </div>
                    </div>

                    {result.performanceScore !== undefined && (
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          <Target className="h-4 w-4 text-purple-500" />
                          <span className="font-medium">Performance</span>
                        </div>
                        <div className={`font-bold ${getPerformanceColor(result.performanceScore)}`}>
                          {result.performanceScore}/100
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Score
                        </div>
                      </div>
                    )}

                    {result.speedBonus !== undefined && result.speedBonus > 0 && (
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">Speed Bonus</span>
                        </div>
                        <div className="font-bold text-yellow-500">
                          +{result.speedBonus}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          ELO Points
                        </div>
                      </div>
                    )}

                    {result.memoryUsage && (
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          <BarChart3 className="h-4 w-4 text-green-500" />
                          <span className="font-medium">Memory</span>
                        </div>
                        <div className="font-bold text-green-500">
                          {(result.memoryUsage / 1024 / 1024).toFixed(1)}MB
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Usage
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Speed Bonus Explanation */}
                  {result.speedBonus !== undefined && result.speedBonus > 0 && (
                    <motion.div
                      className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-800"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                        <Trophy className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          🎉 Speed Bonus: +{result.speedBonus} ELO points for fast execution!
                        </span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Test Results */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Test Results</h4>
                {result.testResults.map((testResult, index) => (
                  <TestCaseAnimation
                    key={index}
                    status={testResult.passed ? 'passed' : 'failed'}
                    input={testResult.input}
                    expected={testResult.expected}
                    actual={testResult.actual}
                    index={index}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CodeExecutionPanel;
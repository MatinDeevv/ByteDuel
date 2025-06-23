import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Send, Zap, CheckCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedCard from '../components/AnimatedCard';
import AnimatedTimer from '../components/AnimatedTimer';
import TestCaseAnimation from '../components/TestCaseAnimation';
import ConfettiEffect from '../components/ConfettiEffect';
import RatingDisplay from '../components/RatingDisplay';
import CodeExecutionPanel from '../components/CodeExecutionPanel';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import { joinDuel, submitDuel } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useMatchmakingStore } from '../store/matchmakingStore';
import { useKeystrokeStore } from '../store/keystrokeStore';
import { codeExecutionService, type ExecutionResult } from '../services/codeExecutionService';

interface DuelData {
  prompt: string;
  tests: Array<{ input: string; expected: string }>;
  timeLimit: number;
}

const DuelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [duelData, setDuelData] = useState<DuelData | null>(null);
  const [code, setCode] = useState('// Your solution here\nfunction solve() {\n  \n}');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes default
  const [lastExecutionResult, setLastExecutionResult] = useState<ExecutionResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ratingDelta, setRatingDelta] = useState<number | undefined>();
  const [speedBonus, setSpeedBonus] = useState<number | undefined>();
  const [performanceScore, setPerformanceScore] = useState<number | undefined>();
  const { user } = useAuth();
  const { userRating, setUserRating } = useMatchmakingStore();
  const { recordKeystroke } = useKeystrokeStore();
  
  // Clean up queue when component mounts (user navigated to duel)
  useEffect(() => {
    const cleanupQueue = async () => {
      if (user?.id) {
        try {
          // Remove user from queue since they're now in a duel
          const { leaveMatchmakingQueue } = await import('../services/matchmakingService');
          await leaveMatchmakingQueue(user.id);
          console.log('🧹 Cleaned up user from queue on duel page load');
        } catch (error) {
          // Ignore errors - user might not be in queue
          console.log('Queue cleanup: User not in queue or already removed');
        }
      }
    };
    
    cleanupQueue();
  }, [user?.id]);

  useEffect(() => {
    const loadDuel = async () => {
      if (!id) return;
      
      try {
        // For active duels, we don't need to "join" - just load the data
        const { data: duel, error } = await supabase
          .from('duels')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          throw error;
        }

        const data = {
          prompt: duel.prompt,
          tests: duel.test_cases,
          timeLimit: duel.time_limit,
        };
        
        setDuelData(data);
        setTimeLeft(data.timeLimit || 900);
        
        console.log('🎮 Loaded duel data:', { id, prompt: data.prompt.slice(0, 100) + '...' });
      } catch (error) {
        console.error('Failed to load duel:', error);
        // Don't navigate away immediately, show error message
        alert('Failed to load duel. Please try again.');
      }
    };

    loadDuel();
  }, [id, navigate]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      recordKeystroke({
        timestamp: Date.now(),
        type: 'edit',
        content: value,
        position: 0, // Monaco will provide cursor position
      });
    }
  };

  const handleSubmit = async () => {
    if (!id) return;

    // Check if code has been tested
    if (!lastExecutionResult || !lastExecutionResult.passed) {
      alert('Please test your code and ensure all tests pass before submitting!');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitDuel(id, code);
      
      setSubmitted(true);
      
      if (result.passed) {
        setShowConfetti(true);
      }
      
      // Handle rating changes for ranked duels
      if (result.deltaWinner !== undefined && result.newRatings) {
        setRatingDelta(result.deltaWinner);
        setSpeedBonus(result.speedBonus);
        setPerformanceScore(result.performanceScore);
        setUserRating(result.newRatings.winner);
      }
      
      console.log('Submission result:', result);
      // Handle result (show feedback, navigate to results, etc.)
    } catch (error) {
      console.error('Failed to submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    if (!submitted) {
      handleSubmit();
    }
  };

  const handleExecutionComplete = (result: ExecutionResult) => {
    setLastExecutionResult(result);
  };

  if (!duelData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <motion.div 
            className="rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-600 dark:text-gray-400">Loading duel...</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <ConfettiEffect trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
        
      {/* Header */}
      <motion.header 
        className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors duration-300"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Zap className="h-6 w-6 text-blue-500" />
            </motion.div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">ByteDuel</span>
            <span className="text-gray-500 dark:text-gray-400">#{id}</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <AnimatedTimer 
              initialTime={timeLeft} 
              onTimeUp={handleTimeUp}
              className="text-lg font-mono"
            />
            <RatingDisplay 
              rating={userRating} 
              delta={ratingDelta}
              showDelta={submitted && ratingDelta !== undefined}
              size="sm"
            />
            
            {/* Performance Indicators */}
            {submitted && speedBonus !== undefined && speedBonus > 0 && (
              <motion.div
                className="flex items-center space-x-1 text-yellow-500"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 500 }}
              >
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-bold">+{speedBonus}</span>
              </motion.div>
            )}
            
            <ThemeToggle />
            
            {/* Submit Button */}
            <AnimatedButton
              onClick={handleSubmit}
              disabled={isSubmitting || submitted}
              variant={submitted ? "success" : lastExecutionResult?.passed ? "primary" : "outline"}
              size="sm"
              loading={isSubmitting}
            >
              {!isSubmitting && (
                submitted ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submitted
                  </>
                ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {lastExecutionResult?.passed ? 'Submit Solution' : 'Test First'}
                </>
                )
              )}
            </AnimatedButton>
          </div>
        </div>
      </motion.header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Problem Panel */}
        <motion.div 
          className="w-2/5 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-900 transition-colors duration-300"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="p-6">
            <AnimatedCard className="mb-6">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Challenge</h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{duelData.prompt}</p>
                </div>
              </div>
            </AnimatedCard>

            {/* Code Execution Panel */}
            <AnimatedCard delay={0.4}>
              <div className="p-6">
                <CodeExecutionPanel
                  code={code}
                  testCases={duelData.tests}
                  onExecutionComplete={handleExecutionComplete}
                  language="javascript"
                  userId={user?.id}
                />
              </div>
            </AnimatedCard>
          </div>
        </motion.div>

        {/* Editor Panel */}
        <motion.div 
          className="w-3/5 flex flex-col bg-gray-50 dark:bg-gray-800 transition-colors duration-300"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'}
              value={code}
              onChange={handleEditorChange}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                lineNumbers: 'on',
                glyphMargin: true,
                folding: true,
                lineDecorationsWidth: 20,
                lineNumbersMinChars: 3,
                renderLineHighlight: 'all',
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                },
              }}
            />
          </div>
        </motion.div>
      </div>
      </div>
    </PageTransition>
  );
};

export default DuelPage;
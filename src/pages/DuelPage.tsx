import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Send, Zap, CheckCircle, Trophy, ArrowLeft } from 'lucide-react';
import Editor from '@monaco-editor/react';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedCard from '../components/AnimatedCard';
import AnimatedTimer from '../components/AnimatedTimer';
import ConfettiEffect from '../components/ConfettiEffect';
import RatingDisplay from '../components/RatingDisplay';
import CodeExecutionPanel from '../components/CodeExecutionPanel';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import { submitDuel } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useSimpleMatchmakingStore } from '../store/simpleMatchmakingStore';
import { useKeystrokeStore } from '../store/keystrokeStore';
import { useSandboxRunner } from '../hooks/useSandboxRunner';
import { joinDuel, type DuelJoinResponse } from '../services/duelJoinService';
import { type ExecutionResult } from '../services/codeExecutionService';
import { supabase } from '../lib/supabaseClient';

interface DuelData {
  id: string;
  prompt: string;
  test_cases: Array<{ input: string; expected: string }>;
  time_limit: number;
  mode: string;
  status: string;
  creator_id: string;
  opponent_id: string | null;
}

interface MatchData {
  duel_id: string;
  opponent_id: string;
  opponent_name: string;
  opponent_rating: number;
  rating_difference: number;
  mode: string;
}

const DuelPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [duelData, setDuelData] = useState<DuelData | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [code, setCode] = useState('// Your solution here\nfunction solve() {\n  \n}');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes default
  const [lastExecutionResult, setLastExecutionResult] = useState<ExecutionResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ratingDelta, setRatingDelta] = useState<number | undefined>();
  const [speedBonus, setSpeedBonus] = useState<number | undefined>();
  const [performanceScore, setPerformanceScore] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { userRating, setUserRating, clearMatch } = useSimpleMatchmakingStore();
  const { recordKeystroke } = useKeystrokeStore();
  
  // Initialize sandbox runner with test cases
  const {
    initialized: sandboxInitialized,
    ready: sandboxReady,
    error: sandboxError,
    executeCode,
    validateCode,
  } = useSandboxRunner(duelData?.test_cases || [], code);

  // Clean up queue when component mounts (user navigated to duel)
  useEffect(() => {
    const cleanupQueue = async () => {
      if (user?.id) {
        try {
          clearMatch();
          console.log('🧹 Cleaned up user from queue on duel page load');
        } catch (error) {
          console.log('Queue cleanup: User not in queue or already removed');
        }
      }
    };
    
    cleanupQueue();
  }, [user?.id, clearMatch]);

  // Auto-fetch duel data when component mounts or ID changes
  useEffect(() => {
    const loadDuelData = async () => {
      if (!id) {
        console.error('❌ No duel ID provided');
        navigate('/', { replace: true });
        return;
      }

      console.log('🎮 Loading duel data for ID:', id);
      console.log('📍 Location state:', location.state);
      
      setLoading(true);
      setJoinError(null);

      try {
        // Check if we have match data from navigation state or sessionStorage
        let currentMatchData: MatchData | null = null;
        
        if (location.state?.matchData) {
          console.log('📦 Using match data from navigation state');
          currentMatchData = location.state.matchData;
        } else {
          const stored = sessionStorage.getItem('currentMatch');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.duel_id === id) {
                console.log('📦 Using match data from sessionStorage');
                currentMatchData = parsed;
              }
            } catch (e) {
              console.warn('⚠️ Failed to parse stored match data');
            }
          }
        }
        
        setMatchData(currentMatchData);

        // Call join API to get duel specification
        console.log('📞 Calling join duel API...');
        const joinResponse: DuelJoinResponse = await joinDuel({
          duelId: id,
          userId: user?.id,
        });

        if (!joinResponse.success || !joinResponse.duel) {
          console.error('❌ Failed to join duel:', joinResponse.error);
          setJoinError(joinResponse.error || 'Failed to load duel');
          return;
        }

        const duel = joinResponse.duel;
        console.log('✅ Successfully joined duel:', {
          id: duel.id,
          prompt: duel.prompt.slice(0, 100) + '...',
          testCount: duel.test_cases?.length || 0,
          timeLimit: duel.time_limit,
          status: duel.status,
        });

        // Set duel data
        setDuelData(duel);
        setTimeLeft(duel.time_limit || 900);

        // Clear sessionStorage since we've loaded the data
        sessionStorage.removeItem('currentMatch');

        console.log('🎯 Duel data loaded successfully');
      } catch (error) {
        console.error('💥 Exception loading duel data:', error);
        setJoinError(error instanceof Error ? error.message : 'Failed to load duel');
      } finally {
        setLoading(false);
      }
    };

    loadDuelData();
  }, [id, navigate, location.state, user?.id]);

  // Log sandbox initialization
  useEffect(() => {
    if (duelData?.test_cases && sandboxInitialized) {
      console.log('🔧 Sandbox initialized with duel test cases');
      console.log('📋 Test cases ready for execution:', duelData.test_cases.length);
    }
  }, [duelData?.test_cases, sandboxInitialized]);

  // Log sandbox readiness
  useEffect(() => {
    if (sandboxReady) {
      console.log('✅ Sandbox is ready for code execution');
    }
  }, [sandboxReady]);

  // Log sandbox errors
  useEffect(() => {
    if (sandboxError) {
      console.error('❌ Sandbox error:', sandboxError);
    }
  }, [sandboxError]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
      recordKeystroke({
        timestamp: Date.now(),
        type: 'edit',
        content: value,
        position: 0,
      });
    }
  };

  const handleSubmit = async () => {
    if (!id || !duelData) return;

    // Check if code has been tested
    if (!lastExecutionResult || !lastExecutionResult.passed) {
      alert('Please test your code and ensure all tests pass before submitting!');
      return;
    }

    console.log('📤 Submitting duel solution:', {
      duelId: id,
      codeLength: code.length,
      passedTests: lastExecutionResult.passedTests,
      totalTests: lastExecutionResult.totalTests,
    });

    setIsSubmitting(true);
    try {
      const result = await submitDuel(id, code);
      
      setSubmitted(true);
      
      if (result.passed) {
        setShowConfetti(true);
        console.log('🎉 Duel completed successfully!');
      }
      
      // Handle rating changes for ranked duels
      if (result.deltaWinner !== undefined && result.newRatings) {
        setRatingDelta(result.deltaWinner);
        setSpeedBonus(result.speedBonus);
        setPerformanceScore(result.performanceScore);
        setUserRating(result.newRatings.winner);
        
        console.log('📊 Rating updated:', {
          delta: result.deltaWinner,
          newRating: result.newRatings.winner,
          speedBonus: result.speedBonus,
        });
      }
      
      console.log('✅ Submission completed:', result);
    } catch (error) {
      console.error('❌ Failed to submit duel:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    if (!submitted) {
      console.log('⏰ Time expired, auto-submitting');
      handleSubmit();
    }
  };

  const handleExecutionComplete = (result: ExecutionResult) => {
    setLastExecutionResult(result);
    console.log('🧪 Code execution completed:', {
      passed: result.passed,
      passedTests: result.passedTests,
      totalTests: result.totalTests,
      runtime: result.runtimeMs,
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <motion.div 
            className="rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-600 dark:text-gray-400">Loading duel...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Fetching duel specification and initializing sandbox...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (joinError || !duelData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Failed to Load Duel
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {joinError || 'Duel not found or unable to load duel data.'}
          </p>
          <div className="space-y-3">
            <AnimatedButton onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </AnimatedButton>
            <AnimatedButton 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Retry
            </AnimatedButton>
          </div>
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
              <AnimatedButton
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit Duel
              </AnimatedButton>
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Zap className="h-6 w-6 text-blue-500" />
              </motion.div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">ByteDuel</span>
              <span className="text-gray-500 dark:text-gray-400">#{id}</span>
              {matchData && (
                <span className="text-sm text-blue-500">
                  vs {matchData.opponent_name} ({matchData.opponent_rating})
                </span>
              )}
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
              
              {/* Sandbox Status Indicator */}
              {sandboxReady && (
                <div className="flex items-center space-x-1 text-green-500 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Sandbox Ready</span>
                </div>
              )}
              
              <ThemeToggle />
              
              {/* Submit Button */}
              <AnimatedButton
                onClick={handleSubmit}
                disabled={isSubmitting || submitted || !sandboxReady}
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
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {duelData.prompt}
                    </p>
                  </div>
                  
                  {/* Match Info */}
                  {matchData && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-700 dark:text-blue-300">
                          Opponent: {matchData.opponent_name}
                        </span>
                        <span className="text-blue-700 dark:text-blue-300">
                          Rating Diff: ±{matchData.rating_difference}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </AnimatedCard>

              {/* Code Execution Panel */}
              <AnimatedCard delay={0.4}>
                <div className="p-6">
                  <CodeExecutionPanel
                    code={code}
                    testCases={duelData.test_cases}
                    onExecutionComplete={handleExecutionComplete}
                    language="javascript"
                    userId={user?.id}
                  />
                  
                  {/* Sandbox Status */}
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Sandbox: {sandboxReady ? '✅ Ready' : sandboxInitialized ? '🔧 Initializing...' : '⏳ Loading...'}
                    {sandboxError && (
                      <span className="text-red-500 ml-2">❌ {sandboxError}</span>
                    )}
                  </div>
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
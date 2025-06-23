import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Target, Lightbulb, Code, ArrowLeft } from 'lucide-react';
import Editor from '@monaco-editor/react';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedCard from '../components/AnimatedCard';
import TestCaseAnimation from '../components/TestCaseAnimation';
import CodeExecutionPanel from '../components/CodeExecutionPanel';
import ThemeToggle from '../components/ThemeToggle';
import PageTransition from '../components/PageTransition';
import { PracticeMode, Difficulty } from '../types';
import { useAuth } from '../hooks/useAuth';
import { startPractice, submitPractice } from '../services/api';
import { type ExecutionResult } from '../services/codeExecutionService';

interface PracticeData {
  sessionId: string;
  prompt: string;
  tests: Array<{ input: string; expected: string }>;
  hints: string[];
}

const PracticePage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<PracticeMode>('warm-up');
  const [selectedTopic, setSelectedTopic] = useState('arrays');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy');
  const [practiceData, setPracticeData] = useState<PracticeData | null>(null);
  const [code, setCode] = useState('// Your solution here\nfunction solve() {\n  \n}');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastExecutionResult, setLastExecutionResult] = useState<ExecutionResult | null>(null);
  const { user } = useAuth();

  const practiceModes = [
    {
      id: 'warm-up' as PracticeMode,
      name: 'Warm-up',
      description: 'Easy problems with AI hints and guidance',
      icon: Lightbulb,
      color: 'from-green-500 to-teal-600',
    },
    {
      id: 'drills' as PracticeMode,
      name: 'Drills',
      description: 'Focused practice on specific topics',
      icon: Target,
      color: 'from-blue-500 to-purple-600',
    },
    {
      id: 'custom' as PracticeMode,
      name: 'Custom',
      description: 'Paste your own prompt or pick topics',
      icon: Code,
      color: 'from-purple-500 to-pink-600',
    },
  ];

  const topics = [
    'arrays', 'strings', 'linked-lists', 'trees', 'graphs', 
    'dynamic-programming', 'recursion', 'sorting', 'searching', 'hash-tables'
  ];

  const handleStartPractice = async () => {
    try {
      const data = await startPractice(selectedTopic, selectedDifficulty, selectedMode);
      setPracticeData(data);
    } catch (error) {
      console.error('Failed to start practice:', error);
    }
  };

  const handleSubmit = async () => {
    if (!practiceData) return;

    // Check if code has been tested
    if (!lastExecutionResult) {
      alert('Please test your code first!');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitPractice(practiceData.sessionId, code);
      
      console.log('Practice result:', result);
      // Handle result feedback
    } catch (error) {
      console.error('Failed to submit practice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShowHint = () => {
    setShowHint(true);
    setHintsUsed(prev => prev + 1);
  };

  const handleExecutionComplete = (result: ExecutionResult) => {
    setLastExecutionResult(result);
  };

  if (practiceData) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
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
                onClick={() => setPracticeData(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </AnimatedButton>
              <BookOpen className="h-6 w-6 text-purple-400" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Practice Mode</span>
              <span className="text-gray-500 dark:text-gray-400">
                {selectedMode} • {selectedTopic} • {selectedDifficulty}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Hints used: <span className="text-yellow-400">{hintsUsed}</span>
              </div>
              <ThemeToggle />
              <AnimatedButton
                onClick={handleShowHint}
                variant="outline"
                size="sm"
                disabled={showHint || hintsUsed >= practiceData.hints.length}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Hint
              </AnimatedButton>
              <AnimatedButton
                onClick={handleSubmit}
                disabled={isSubmitting}
                variant={lastExecutionResult?.passed ? "success" : "primary"}
                size="sm"
                loading={isSubmitting}
              >
                {lastExecutionResult?.passed ? 'Submit Solution' : 'Check Solution'}
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
                  <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Problem</h2>
                  <div className="prose prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{practiceData.prompt}</p>
                  </div>
                </div>
              </AnimatedCard>

              {showHint && (
                <AnimatedCard className="mb-6 border-yellow-500/30 bg-yellow-500/5" delay={0.2}>
                  <div className="p-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <Lightbulb className="h-5 w-5 text-yellow-400" />
                      <h3 className="text-lg font-semibold text-yellow-400">Hint</h3>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{practiceData.hints[hintsUsed - 1]}</p>
                  </div>
                </AnimatedCard>
              )}

              <AnimatedCard delay={0.4}>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Test Cases</h3>
                  <div className="space-y-4">
                    {practiceData.tests.map((test, index) => (
                      <TestCaseAnimation
                        key={index}
                        status={testResults[index]?.status || 'pending'}
                        input={test.input}
                        expected={test.expected}
                        index={index}
                      />
                    ))}
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
                onChange={(value) => setCode(value || '')}
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  insertSpaces: true,
                }}
              />
            </div>
          </motion.div>
        </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-6 py-8">
        <motion.div 
          className="flex items-center space-x-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AnimatedButton
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </AnimatedButton>
          <BookOpen className="h-8 w-8 text-purple-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Mode</h1>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </motion.div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Mode Selection */}
          <AnimatedCard delay={0.2}>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Choose Practice Mode</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {practiceModes.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = selectedMode === mode.id;
                  
                  return (
                    <motion.button
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      className={`
                        p-4 rounded-lg border-2 transition-all duration-300 text-left
                        ${isSelected 
                          ? 'border-purple-500 bg-purple-500/10 dark:bg-purple-500/10' 
                          : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                        }
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`
                        inline-flex p-2 rounded-lg bg-gradient-to-br ${mode.color} mb-3
                      `}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">{mode.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{mode.description}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </AnimatedCard>

          {/* Topic & Difficulty Selection */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {/* Code Execution Panel */}
            <AnimatedCard delay={0.6}>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Topic</h3>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-300"
                >
                  {topics.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.5}>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Difficulty</h3>
                <div className="flex space-x-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((difficulty) => (
                    <motion.button
                      key={difficulty}
                      onClick={() => setSelectedDifficulty(difficulty)}
                      className={`
                        flex-1 py-3 px-4 rounded-lg border-2 transition-all duration-300 capitalize
                <CodeExecutionPanel
                  code={code}
                  testCases={practiceData.tests}
                  onExecutionComplete={handleExecutionComplete}
                  language="javascript"
                  userId={user?.id}
                />
              </div>
           </AnimatedCard>
          </motion.div>

          {/* Start Button */}
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <AnimatedButton
              onClick={handleStartPractice}
              size="lg"
              className="px-12 py-4 text-lg"
            >
              <BookOpen className="h-5 w-5 mr-2" />
              Start Practice Session
            </AnimatedButton>
          </motion.div>
        </div>
      </div>
      </div>
    </PageTransition>
  );
};

export default PracticePage;
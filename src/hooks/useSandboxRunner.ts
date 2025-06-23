/**
 * Sandbox Runner Hook - Manages code execution environment
 */
import { useState, useEffect, useCallback } from 'react';
import { codeExecutionService, type TestCase, type ExecutionResult } from '../services/codeExecutionService';

interface SandboxState {
  initialized: boolean;
  ready: boolean;
  error: string | null;
  lastResult: ExecutionResult | null;
}

export function useSandboxRunner(testCases: TestCase[], initialCode?: string) {
  const [state, setState] = useState<SandboxState>({
    initialized: false,
    ready: false,
    error: null,
    lastResult: null,
  });

  // Initialize sandbox when test cases are available
  useEffect(() => {
    if (testCases && testCases.length > 0 && !state.initialized) {
      console.log('🔧 Initializing sandbox with test cases:', testCases.length);
      
      setState(prev => ({
        ...prev,
        initialized: true,
        ready: true,
        error: null,
      }));
      
      console.log('✅ Sandbox initialization complete');
      console.log('📋 Test cases loaded:', testCases.map((tc, i) => ({
        case: i + 1,
        input: tc.input.slice(0, 50),
        expected: tc.expected.slice(0, 50),
      })));
    }
  }, [testCases, state.initialized]);

  // Execute code in sandbox
  const executeCode = useCallback(async (
    code: string,
    userId?: string,
    language = 'javascript'
  ): Promise<ExecutionResult> => {
    console.log('🚀 Executing code in sandbox:', {
      codeLength: code.length,
      testCases: testCases.length,
      language,
    });

    if (!state.ready) {
      console.error('❌ Sandbox not ready for execution');
      throw new Error('Sandbox not initialized');
    }

    try {
      const result = await codeExecutionService.executeCode(
        code,
        testCases,
        userId,
        {
          language,
          timeout: 5000,
          enableCaching: true,
          enableBenchmarking: false,
        }
      );

      console.log('✅ Code execution completed:', {
        passed: result.passed,
        passedTests: result.passedTests,
        totalTests: result.totalTests,
        runtime: result.runtimeMs,
        performanceScore: result.performanceScore,
      });

      setState(prev => ({
        ...prev,
        lastResult: result,
        error: null,
      }));

      return result;
    } catch (error) {
      console.error('❌ Sandbox execution error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Execution failed';
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      
      throw error;
    }
  }, [state.ready, testCases]);

  // Validate code without executing
  const validateCode = useCallback(async (code: string, language = 'javascript') => {
    console.log('🔍 Validating code:', { codeLength: code.length, language });
    
    try {
      const validation = await codeExecutionService.validateCodeOnly(code, language);
      console.log('✅ Code validation completed:', validation);
      return validation;
    } catch (error) {
      console.error('❌ Code validation error:', error);
      throw error;
    }
  }, []);

  // Reset sandbox state
  const reset = useCallback(() => {
    console.log('🔄 Resetting sandbox state');
    setState({
      initialized: false,
      ready: false,
      error: null,
      lastResult: null,
    });
  }, []);

  return {
    // State
    initialized: state.initialized,
    ready: state.ready,
    error: state.error,
    lastResult: state.lastResult,
    
    // Actions
    executeCode,
    validateCode,
    reset,
  };
}
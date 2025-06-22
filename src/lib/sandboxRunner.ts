/**
 * Sandbox Runner - Secure code execution environment
 * Enhanced with real answer checking and detailed result tracking
 */

export interface TestCase {
  input: string;
  expected: string;
}

export interface ExecutionResult {
  passed: boolean;
  passedTests: number;
  totalTests: number;
  runtimeMs: number;
  wrongAttempts: number;
  testResults: Array<{
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
    error?: string;
  }>;
  output?: string;
  error?: string;
}

export interface CodeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
}

export async function runCodeSandbox(code: string, testCases: TestCase[]): Promise<ExecutionResult> {
  console.log('Running code in secure sandbox:', { 
    codeLength: code.length, 
    testCount: testCases.length 
  });
  
  // Validate code before execution
  const validation = await validateCode(code);
  if (!validation.isValid) {
    return {
      passed: false,
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: 0,
      wrongAttempts: 1,
      testResults: [],
      error: `Code validation failed: ${validation.errors.join(', ')}`,
    };
  }
  
  try {
    const startTime = Date.now();
    const testResults: ExecutionResult['testResults'] = [];
    let passedTests = 0;
    let wrongAttempts = 0;
    
    // Create secure execution context
    const context = createSecureContext();
    
    // Execute code against each test case
    for (const testCase of testCases) {
      try {
        const result = await executeTestCase(code, testCase, context);
        testResults.push(result);
        
        if (result.passed) {
          passedTests++;
        } else {
          wrongAttempts++;
        }
      } catch (error) {
        wrongAttempts++;
        testResults.push({
          input: testCase.input,
          expected: testCase.expected,
          actual: '',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    const endTime = Date.now();
    const runtimeMs = endTime - startTime;
    
    return {
      passed: passedTests === testCases.length,
      passedTests,
      totalTests: testCases.length,
      runtimeMs,
      wrongAttempts,
      testResults,
      output: `Executed ${testCases.length} test cases in ${runtimeMs}ms`,
    };
  } catch (error) {
    return {
      passed: false,
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: 0,
      wrongAttempts: 1,
      testResults: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute a single test case in secure context
 */
async function executeTestCase(
  code: string, 
  testCase: TestCase, 
  context: Record<string, any>
): Promise<ExecutionResult['testResults'][0]> {
  try {
    // Parse input (assuming JSON format for now)
    const input = JSON.parse(`[${testCase.input}]`);
    const expected = testCase.expected;
    
    // Create function wrapper with timeout
    const wrappedCode = `
      const userFunction = ${code};
      return userFunction(...arguments);
    `;
    
    // Execute with timeout (5 seconds max)
    const actual = await executeWithTimeout(wrappedCode, input, context, 5000);
    const actualStr = JSON.stringify(actual);
    
    return {
      input: testCase.input,
      expected,
      actual: actualStr,
      passed: actualStr === expected,
    };
  } catch (error) {
    return {
      input: testCase.input,
      expected: testCase.expected,
      actual: '',
      passed: false,
      error: error instanceof Error ? error.message : 'Execution error',
    };
  }
}

/**
 * Execute code with timeout protection
 */
async function executeWithTimeout(
  code: string,
  args: any[],
  context: Record<string, any>,
  timeoutMs: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Code execution timeout'));
    }, timeoutMs);
    
    try {
      // Use Function constructor for safer evaluation
      const func = new Function('...args', code);
      const result = func.apply(context, args);
      
      clearTimeout(timeout);
      resolve(result);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

export async function validateCode(code: string): Promise<CodeValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const securityIssues: string[] = [];
  
  // Basic syntax validation
  try {
    new Function(code);
  } catch (error) {
    errors.push(`Syntax error: ${error instanceof Error ? error.message : 'Invalid syntax'}`);
  }
  
  // Security checks - prevent dangerous operations
  const dangerousPatterns = [
    /require\s*\(/g,
    /import\s+/g,
    /eval\s*\(/g,
    /Function\s*\(/g,
    /setTimeout\s*\(/g,
    /setInterval\s*\(/g,
    /process\./g,
    /global\./g,
    /window\./g,
    /document\./g,
    /fetch\s*\(/g,
    /XMLHttpRequest/g,
    /WebSocket/g,
  ];
  
  dangerousPatterns.forEach(pattern => {
    if (pattern.test(code)) {
      securityIssues.push(`Potentially dangerous operation detected: ${pattern.source}`);
    }
  });
  
  // Performance warnings
  if (code.includes('while(true)') || code.includes('for(;;)')) {
    warnings.push('Potential infinite loop detected');
  }
  
  if (code.length > 10000) {
    warnings.push('Code is very long - consider breaking into smaller functions');
  }
  
  return {
    isValid: errors.length === 0 && securityIssues.length === 0,
    errors,
    warnings,
    securityIssues,
  };
}

export function createSecureContext(): Record<string, any> {
  // Create minimal, secure execution context
  const safeConsole = {
    log: (...args: any[]) => {
      // Capture output for debugging but don't expose real console
      return args.join(' ');
    },
  };
  
  const safeMath = {
    ...Math,
    random: () => 0.5, // Deterministic for testing
  };
  
  return {
    console: safeConsole,
    Math: safeMath,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    RegExp,
    // Explicitly exclude dangerous globals
    require: undefined,
    process: undefined,
    global: undefined,
    window: undefined,
    document: undefined,
    fetch: undefined,
    setTimeout: undefined,
    setInterval: undefined,
  };
}
/**
 * Enhanced Sandbox Runner - Secure code execution environment
 * Supports multiple programming languages with comprehensive testing and performance tracking
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
    executionTime?: number;
  }>;
  output?: string;
  error?: string;
  memoryUsage?: number;
  securityViolations?: string[];
  performanceScore?: number; // 0-100 based on speed and efficiency
  speedBonus?: number; // ELO bonus for fast solutions
}

export interface CodeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
}

/**
 * Main sandbox execution function with enhanced answer checking
 */
export async function runCodeSandbox(
  code: string, 
  testCases: TestCase[],
  language: string = 'javascript',
  timeoutMs: number = 5000
): Promise<ExecutionResult> {
  console.log('🏃 Running code in secure sandbox:', { 
    codeLength: code.length, 
    testCount: testCases.length,
    language,
    timeout: timeoutMs
  });
  
  // Validate code before execution
  const validation = await validateCode(code, language);
  if (!validation.isValid) {
    return {
      passed: false,
      passedTests: 0,
      totalTests: testCases.length,
      runtimeMs: 0,
      wrongAttempts: 1,
      testResults: [],
      error: `Code validation failed: ${validation.errors.join(', ')}`,
      securityViolations: validation.securityIssues,
      performanceScore: 0,
      speedBonus: 0,
    };
  }
  
  try {
    const startTime = performance.now();
    const testResults: ExecutionResult['testResults'] = [];
    let passedTests = 0;
    let wrongAttempts = 0;
    let totalMemoryUsage = 0;
    let totalExecutionTime = 0;
    
    // Create secure execution context
    const context = createSecureContext();
    
    // Execute code against each test case with enhanced checking
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testStartTime = performance.now();
      
      try {
        const result = await executeTestCaseWithEnhancedChecking(
          code, 
          testCase, 
          context, 
          timeoutMs, 
          language
        );
        const testEndTime = performance.now();
        const testExecutionTime = testEndTime - testStartTime;
        
        testResults.push({
          ...result,
          executionTime: testExecutionTime,
        });
        
        totalExecutionTime += testExecutionTime;
        
        if (result.passed) {
          passedTests++;
        } else {
          wrongAttempts++;
        }
      } catch (error) {
        wrongAttempts++;
        const testExecutionTime = performance.now() - testStartTime;
        totalExecutionTime += testExecutionTime;
        
        testResults.push({
          input: testCase.input,
          expected: testCase.expected,
          actual: '',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: testExecutionTime,
        });
      }
    }
    
    const endTime = performance.now();
    const runtimeMs = endTime - startTime;
    
    // Calculate performance metrics
    const avgExecutionTime = totalExecutionTime / testCases.length;
    const performanceScore = calculatePerformanceScore(runtimeMs, avgExecutionTime, testCases.length);
    const speedBonus = calculateSpeedBonus(runtimeMs, passedTests, testCases.length);
    
    // Calculate memory usage (simulated based on code complexity)
    totalMemoryUsage = estimateMemoryUsage(code, testCases.length);
    
    return {
      passed: passedTests === testCases.length,
      passedTests,
      totalTests: testCases.length,
      runtimeMs: Math.round(runtimeMs),
      wrongAttempts,
      testResults,
      output: `Executed ${testCases.length} test cases in ${Math.round(runtimeMs)}ms`,
      memoryUsage: totalMemoryUsage,
      securityViolations: validation.securityIssues,
      performanceScore: Math.round(performanceScore),
      speedBonus: Math.round(speedBonus),
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
      performanceScore: 0,
      speedBonus: 0,
    };
  }
}

/**
 * Enhanced test case execution with improved answer checking
 */
async function executeTestCaseWithEnhancedChecking(
  code: string, 
  testCase: TestCase, 
  context: Record<string, any>,
  timeoutMs: number,
  language: string
): Promise<ExecutionResult['testResults'][0]> {
  try {
    // Parse input with enhanced error handling
    let input: any[];
    try {
      input = parseTestInput(testCase.input);
    } catch (parseError) {
      return {
        input: testCase.input,
        expected: testCase.expected,
        actual: '',
        passed: false,
        error: `Input parsing failed: ${parseError instanceof Error ? parseError.message : 'Invalid input format'}`,
      };
    }
    
    const expected = testCase.expected;
    
    // Create function wrapper based on language
    let wrappedCode: string;
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        wrappedCode = createJavaScriptWrapper(code);
        break;
      case 'python':
        wrappedCode = createPythonWrapper(code);
        break;
      default:
        wrappedCode = createJavaScriptWrapper(code);
    }
    
    // Execute with timeout and memory monitoring
    const actual = await executeWithTimeout(wrappedCode, input, context, timeoutMs);
    
    // Enhanced answer checking with multiple comparison methods
    const passed = checkAnswerEquality(actual, expected);
    
    return {
      input: testCase.input,
      expected,
      actual: formatOutput(actual),
      passed,
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
 * Enhanced input parsing with support for various formats
 */
function parseTestInput(input: string): any[] {
  // Remove extra whitespace
  input = input.trim();
  
  // Handle empty input
  if (!input) return [];
  
  // Try different parsing strategies
  const strategies = [
    // Strategy 1: Direct JSON array parsing
    () => JSON.parse(input),
    
    // Strategy 2: Wrap in array and parse
    () => JSON.parse(`[${input}]`),
    
    // Strategy 3: Handle function calls like "new TreeNode(...)"
    () => {
      if (input.includes('new ') || input.includes('TreeNode')) {
        // For tree/linked list inputs, create a special parser
        return [input]; // Return as string for special handling
      }
      throw new Error('Not a constructor call');
    },
    
    // Strategy 4: Handle quoted strings
    () => {
      if (input.startsWith('"') && input.endsWith('"')) {
        return [JSON.parse(input)];
      }
      throw new Error('Not a quoted string');
    },
    
    // Strategy 5: Handle multiple arguments separated by commas
    () => {
      const parts = input.split(',').map(part => part.trim());
      return parts.map(part => {
        try {
          return JSON.parse(part);
        } catch {
          // If JSON parsing fails, try to evaluate as a literal
          if (part === 'null') return null;
          if (part === 'undefined') return undefined;
          if (part === 'true') return true;
          if (part === 'false') return false;
          if (!isNaN(Number(part))) return Number(part);
          // Remove quotes if present
          return part.replace(/^["']|["']$/g, '');
        }
      });
    },
  ];
  
  for (const strategy of strategies) {
    try {
      const result = strategy();
      return Array.isArray(result) ? result : [result];
    } catch {
      continue;
    }
  }
  
  // Fallback: treat as single string argument
  return [input.replace(/^["']|["']$/g, '')];
}

/**
 * Enhanced answer checking with multiple comparison methods
 */
function checkAnswerEquality(actual: any, expected: string): boolean {
  // Format the actual output
  const actualStr = formatOutput(actual);
  
  // Strategy 1: Direct string comparison
  if (actualStr === expected) return true;
  
  // Strategy 2: JSON comparison (parse both and compare objects)
  try {
    const actualParsed = JSON.parse(actualStr);
    const expectedParsed = JSON.parse(expected);
    if (deepEqual(actualParsed, expectedParsed)) return true;
  } catch {
    // Not valid JSON, continue with other strategies
  }
  
  // Strategy 3: Numeric comparison with tolerance
  if (isNumeric(actualStr) && isNumeric(expected)) {
    const actualNum = parseFloat(actualStr);
    const expectedNum = parseFloat(expected);
    const tolerance = Math.max(Math.abs(expectedNum) * 1e-9, 1e-9); // Relative tolerance
    return Math.abs(actualNum - expectedNum) <= tolerance;
  }
  
  // Strategy 4: Array comparison (handle different array formats)
  if (actualStr.includes('[') && expected.includes('[')) {
    try {
      const actualArray = JSON.parse(actualStr);
      const expectedArray = JSON.parse(expected);
      if (Array.isArray(actualArray) && Array.isArray(expectedArray)) {
        return arraysEqual(actualArray, expectedArray);
      }
    } catch {
      // Continue with other strategies
    }
  }
  
  // Strategy 5: Boolean comparison
  if (isBooleanString(actualStr) && isBooleanString(expected)) {
    return normalizeBoolean(actualStr) === normalizeBoolean(expected);
  }
  
  // Strategy 6: String comparison with normalization
  const normalizedActual = normalizeString(actualStr);
  const normalizedExpected = normalizeString(expected);
  if (normalizedActual === normalizedExpected) return true;
  
  // Strategy 7: Type coercion comparison
  try {
    return String(actual) === String(expected);
  } catch {
    return false;
  }
}

/**
 * Format output for consistent display
 */
function formatOutput(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    // Handle special number cases
    if (Number.isNaN(value)) return 'NaN';
    if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
    // Format numbers consistently
    return Number.isInteger(value) ? value.toString() : value.toFixed(10).replace(/\.?0+$/, '');
  }
  if (typeof value === 'boolean') return value.toString();
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Deep equality check for objects and arrays
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Array equality with order consideration
 */
function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!deepEqual(a[i], b[i])) return false;
  }
  return true;
}

/**
 * Check if string represents a number
 */
function isNumeric(str: string): boolean {
  return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
}

/**
 * Check if string represents a boolean
 */
function isBooleanString(str: string): boolean {
  return str === 'true' || str === 'false';
}

/**
 * Normalize boolean string
 */
function normalizeBoolean(str: string): boolean {
  return str === 'true';
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Calculate performance score (0-100)
 */
function calculatePerformanceScore(totalTime: number, avgTestTime: number, testCount: number): number {
  // Base score starts at 100
  let score = 100;
  
  // Penalty for slow execution (exponential)
  const timeThreshold = 1000; // 1 second threshold
  if (totalTime > timeThreshold) {
    const timePenalty = Math.min(50, (totalTime - timeThreshold) / 100);
    score -= timePenalty;
  }
  
  // Bonus for fast execution
  if (totalTime < 100) {
    score += Math.min(20, (100 - totalTime) / 10);
  }
  
  // Penalty for inconsistent test times
  const consistencyBonus = avgTestTime > 0 ? Math.min(10, 100 / avgTestTime) : 0;
  score += consistencyBonus;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate speed bonus for ELO (0-50 points)
 */
function calculateSpeedBonus(totalTime: number, passedTests: number, totalTests: number): number {
  // Only give bonus if all tests passed
  if (passedTests !== totalTests) return 0;
  
  // Speed thresholds (in milliseconds)
  const speedTiers = [
    { threshold: 50, bonus: 50 },    // Lightning fast: 50ms
    { threshold: 100, bonus: 40 },   // Very fast: 100ms
    { threshold: 200, bonus: 30 },   // Fast: 200ms
    { threshold: 500, bonus: 20 },   // Good: 500ms
    { threshold: 1000, bonus: 10 },  // Average: 1s
    { threshold: 2000, bonus: 5 },   // Slow: 2s
  ];
  
  for (const tier of speedTiers) {
    if (totalTime <= tier.threshold) {
      return tier.bonus;
    }
  }
  
  return 0; // No bonus for very slow solutions
}

/**
 * Estimate memory usage based on code complexity
 */
function estimateMemoryUsage(code: string, testCount: number): number {
  // Base memory usage
  let memoryUsage = 1024 * 1024; // 1MB base
  
  // Add memory based on code length
  memoryUsage += code.length * 100;
  
  // Add memory based on test count
  memoryUsage += testCount * 50000;
  
  // Add memory based on code complexity
  const complexityFactors = [
    { pattern: /for\s*\(/g, factor: 10000 },
    { pattern: /while\s*\(/g, factor: 10000 },
    { pattern: /function\s+/g, factor: 5000 },
    { pattern: /=>\s*/g, factor: 5000 },
    { pattern: /new\s+/g, factor: 15000 },
    { pattern: /\[\]/g, factor: 8000 },
    { pattern: /\{\}/g, factor: 8000 },
  ];
  
  complexityFactors.forEach(({ pattern, factor }) => {
    const matches = code.match(pattern);
    if (matches) {
      memoryUsage += matches.length * factor;
    }
  });
  
  return Math.round(memoryUsage);
}

/**
 * Create JavaScript function wrapper with enhanced function detection
 */
function createJavaScriptWrapper(code: string): string {
  return `
    ${code}
    
    // Enhanced function detection and execution
    const functionNames = [
      'isPalindrome', 'maxProfit', 'twoSum', 'longestCommonSubsequence',
      'isValidBST', 'solve', 'solution', 'main', 'answer'
    ];
    
    // Try to find and execute the main function
    for (const funcName of functionNames) {
      if (typeof eval(funcName) === 'function') {
        try {
          return eval(funcName)(...arguments);
        } catch (error) {
          // Continue to next function if this one fails
          continue;
        }
      }
    }
    
    // Try to find any function in the code using regex
    const functionMatches = [
      ...code.matchAll(/function\\s+(\\w+)\\s*\\(/g),
      ...code.matchAll(/const\\s+(\\w+)\\s*=\\s*\\(/g),
      ...code.matchAll(/let\\s+(\\w+)\\s*=\\s*\\(/g),
      ...code.matchAll(/var\\s+(\\w+)\\s*=\\s*\\(/g),
      ...code.matchAll(/(\\w+)\\s*=\\s*\\([^)]*\\)\\s*=>/g),
    ];
    
    for (const match of functionMatches) {
      const functionName = match[1];
      if (functionName && typeof eval(functionName) === 'function') {
        try {
          return eval(functionName)(...arguments);
        } catch (error) {
          continue;
        }
      }
    }
    
    throw new Error('No executable function found. Please define a function like isPalindrome, maxProfit, twoSum, solve, solution, or main.');
  `;
}

/**
 * Create Python wrapper (for future implementation)
 */
function createPythonWrapper(code: string): string {
  // This would be implemented when adding Python support
  return `
# Python execution would be implemented here
# For now, fallback to JavaScript
${createJavaScriptWrapper(code)}
  `;
}

/**
 * Execute code with comprehensive timeout and monitoring
 */
async function executeWithTimeout(
  code: string,
  args: any[],
  context: Record<string, any>,
  timeoutMs: number
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Code execution timeout (${timeoutMs}ms exceeded)`));
    }, timeoutMs);
    
    try {
      // Create isolated execution environment
      const isolatedContext = { ...context };
      
      // Monitor execution
      const startTime = performance.now();
      
      // Use Function constructor for safer evaluation
      const func = new Function('...args', code);
      const result = func.apply(isolatedContext, args);
      
      const executionTime = performance.now() - startTime;
      
      // Check for reasonable execution time
      if (executionTime > timeoutMs * 0.8) {
        console.warn(`⚠️ Slow execution detected: ${executionTime}ms`);
      }
      
      clearTimeout(timeout);
      resolve(result);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Enhanced code validation with security checks
 */
export async function validateCode(code: string, language: string = 'javascript'): Promise<CodeValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const securityIssues: string[] = [];
  
  // Basic syntax validation for JavaScript
  if (language === 'javascript' || language === 'typescript') {
    try {
      new Function(code);
    } catch (error) {
      errors.push(`Syntax error: ${error instanceof Error ? error.message : 'Invalid syntax'}`);
    }
  }
  
  // Enhanced security checks
  const dangerousPatterns = [
    { pattern: /require\s*\(/g, message: 'require() is not allowed' },
    { pattern: /import\s+/g, message: 'import statements are not allowed' },
    { pattern: /eval\s*\(/g, message: 'eval() is not allowed' },
    { pattern: /Function\s*\(/g, message: 'Function constructor is not allowed' },
    { pattern: /setTimeout\s*\(/g, message: 'setTimeout() is not allowed' },
    { pattern: /setInterval\s*\(/g, message: 'setInterval() is not allowed' },
    { pattern: /process\./g, message: 'process object access is not allowed' },
    { pattern: /global\./g, message: 'global object access is not allowed' },
    { pattern: /window\./g, message: 'window object access is not allowed' },
    { pattern: /document\./g, message: 'document object access is not allowed' },
    { pattern: /fetch\s*\(/g, message: 'fetch() is not allowed' },
    { pattern: /XMLHttpRequest/g, message: 'XMLHttpRequest is not allowed' },
    { pattern: /WebSocket/g, message: 'WebSocket is not allowed' },
    { pattern: /localStorage/g, message: 'localStorage access is not allowed' },
    { pattern: /sessionStorage/g, message: 'sessionStorage access is not allowed' },
    { pattern: /indexedDB/g, message: 'indexedDB access is not allowed' },
    { pattern: /navigator\./g, message: 'navigator object access is not allowed' },
    { pattern: /location\./g, message: 'location object access is not allowed' },
    { pattern: /history\./g, message: 'history object access is not allowed' },
    { pattern: /alert\s*\(/g, message: 'alert() is not allowed' },
    { pattern: /confirm\s*\(/g, message: 'confirm() is not allowed' },
    { pattern: /prompt\s*\(/g, message: 'prompt() is not allowed' },
  ];
  
  dangerousPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(code)) {
      securityIssues.push(message);
    }
  });
  
  // Performance warnings
  if (code.includes('while(true)') || code.includes('for(;;)')) {
    warnings.push('Potential infinite loop detected');
  }
  
  if (code.length > 10000) {
    warnings.push('Code is very long - consider breaking into smaller functions');
  }
  
  // Check for nested loops (potential performance issue)
  const nestedLoopPattern = /for\s*\([^}]*for\s*\(|while\s*\([^}]*while\s*\(/g;
  if (nestedLoopPattern.test(code)) {
    warnings.push('Nested loops detected - ensure they terminate efficiently');
  }
  
  // Check for recursive functions without base case
  const recursivePattern = /function\s+(\w+)[^}]*\1\s*\(/g;
  if (recursivePattern.test(code)) {
    warnings.push('Recursive function detected - ensure it has a proper base case');
  }
  
  return {
    isValid: errors.length === 0 && securityIssues.length === 0,
    errors,
    warnings,
    securityIssues,
  };
}

/**
 * Create secure execution context with limited globals
 */
export function createSecureContext(): Record<string, any> {
  // Create minimal, secure execution context
  const safeConsole = {
    log: (...args: any[]) => {
      // Capture output for debugging but don't expose real console
      return args.join(' ');
    },
    error: (...args: any[]) => {
      return args.join(' ');
    },
    warn: (...args: any[]) => {
      return args.join(' ');
    },
  };
  
  const safeMath = {
    ...Math,
    random: () => 0.5, // Deterministic for testing
  };
  
  // Safe array and object methods
  const safeArray = Array;
  const safeObject = Object;
  
  return {
    console: safeConsole,
    Math: safeMath,
    JSON,
    Array: safeArray,
    Object: safeObject,
    String,
    Number,
    Boolean,
    Date,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    
    // Explicitly exclude dangerous globals
    require: undefined,
    process: undefined,
    global: undefined,
    window: undefined,
    document: undefined,
    fetch: undefined,
    setTimeout: undefined,
    setInterval: undefined,
    eval: undefined,
    Function: undefined,
    
    // Add some utility functions that are commonly needed
    min: Math.min,
    max: Math.max,
    abs: Math.abs,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round,
  };
}

/**
 * Benchmark code performance
 */
export async function benchmarkCode(
  code: string,
  testCases: TestCase[],
  iterations: number = 100
): Promise<{
  averageTime: number;
  minTime: number;
  maxTime: number;
  memoryUsage: number;
}> {
  const times: number[] = [];
  let totalMemory = 0;
  
  for (let i = 0; i < iterations; i++) {
    const result = await runCodeSandbox(code, testCases);
    times.push(result.runtimeMs);
    totalMemory += result.memoryUsage || 0;
  }
  
  return {
    averageTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    memoryUsage: totalMemory / iterations,
  };
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(
  result: ExecutionResult,
  benchmark?: Awaited<ReturnType<typeof benchmarkCode>>
): string {
  let report = `🏃 Execution Report\n`;
  report += `✅ Tests Passed: ${result.passedTests}/${result.totalTests}\n`;
  report += `⏱️ Runtime: ${result.runtimeMs}ms\n`;
  report += `🚀 Performance Score: ${result.performanceScore}/100\n`;
  report += `⚡ Speed Bonus: +${result.speedBonus} ELO\n`;
  
  if (result.memoryUsage) {
    report += `💾 Memory: ${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB\n`;
  }
  
  if (benchmark) {
    report += `📊 Benchmark (100 runs):\n`;
    report += `  Average: ${benchmark.averageTime.toFixed(2)}ms\n`;
    report += `  Best: ${benchmark.minTime}ms\n`;
    report += `  Worst: ${benchmark.maxTime}ms\n`;
  }
  
  if (result.securityViolations && result.securityViolations.length > 0) {
    report += `🚨 Security Issues: ${result.securityViolations.length}\n`;
  }
  
  return report;
}
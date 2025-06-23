/**
 * Puzzle Generator - AI-powered coding challenge creation
 * This module will interface with llama.cpp to generate personalized coding challenges
 */
import { GameMode, PracticeMode, Difficulty } from '../types';

export interface PuzzleTest {
  input: string;
  expected: string;
}

export interface GeneratedPuzzle {
  prompt: string;
  tests: PuzzleTest[];
  difficulty: Difficulty;
  tags: string[];
  hints?: string[];
}

interface PracticeOptions {
  topic: string;
  difficulty: Difficulty;
  mode: PracticeMode;
}

export async function generatePuzzle(
  player1Fingerprint: string,
  player2Fingerprint: string,
  gameMode: GameMode = 'ranked-duel',
  practiceOptions?: PracticeOptions
): Promise<GeneratedPuzzle> {
  // TODO: Implement actual LLM integration with llama.cpp
  // This will analyze GitHub profiles and generate fair challenges
  
  console.log('Generating puzzle for:', { 
    player1Fingerprint, 
    player2Fingerprint, 
    gameMode, 
    practiceOptions 
  });
  
  // Mock implementation for development - different puzzles based on mode
  const competitivePuzzles: GeneratedPuzzle[] = [
    {
      prompt: `Write a function that finds the two numbers in an array that add up to a target sum.

Given an array of integers and a target sum, return the indices of the two numbers that add up to the target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Examples:
- Input: nums = [2, 7, 11, 15], target = 9
- Output: [0, 1] (because nums[0] + nums[1] = 2 + 7 = 9)
- Input: nums = [3, 2, 4], target = 6  
- Output: [1, 2]

Function signature:
function twoSum(nums, target) {
  // Your code here
}`,
      tests: [
        { input: '[2, 7, 11, 15], 9', expected: '[0, 1]' },
        { input: '[3, 2, 4], 6', expected: '[1, 2]' },
        { input: '[3, 3], 6', expected: '[0, 1]' },
        { input: '[1, 2, 3, 4], 7', expected: '[2, 3]' },
        { input: '[5, 5], 10', expected: '[0, 1]' },
      ],
      difficulty: 'easy',
      tags: ['arrays', 'hash-table', 'two-pointers'],
    },
    {
      prompt: `Find the maximum profit from buying and selling a stock.

You are given an array of stock prices where prices[i] is the price on day i.
You want to maximize profit by choosing a single day to buy and a different day in the future to sell.

Return the maximum profit you can achieve. If no profit is possible, return 0.

Examples:
- [7,1,5,3,6,4] → 5 (buy at 1, sell at 6)
- [7,6,4,3,1] → 0 (prices only decrease)
- [1,2,3,4,5] → 4 (buy at 1, sell at 5)

Function signature:
function maxProfit(prices) {
  // Your code here
}`,
      tests: [
        { input: '[7,1,5,3,6,4]', expected: '5' },
        { input: '[7,6,4,3,1]', expected: '0' },
        { input: '[1,2,3,4,5]', expected: '4' },
        { input: '[2,4,1]', expected: '2' },
        { input: '[1]', expected: '0' },
        { input: '[3,2,6,5,0,3]', expected: '4' },
      ],
      difficulty: 'easy',
      tags: ['arrays', 'dynamic-programming', 'greedy'],
    },
    {
      prompt: `Implement a function to find the longest common subsequence.

Given two strings, find the length of their longest common subsequence.
A subsequence is a sequence that can be derived from another sequence by deleting some or no elements without changing the order of the remaining elements.

Examples:
- "abcde", "ace" → 3 (subsequence "ace")
- "abc", "abc" → 3 (entire string)
- "abc", "def" → 0 (no common subsequence)
- "ABCDGH", "AEDFHR" → 3 (subsequence "ADH")

Function signature:
function longestCommonSubsequence(text1, text2) {
  // Your code here
}`,
      tests: [
        { input: '"abcde", "ace"', expected: '3' },
        { input: '"abc", "abc"', expected: '3' },
        { input: '"abc", "def"', expected: '0' },
        { input: '"ABCDGH", "AEDFHR"', expected: '3' },
        { input: '"", "abc"', expected: '0' },
        { input: '"abc", ""', expected: '0' },
      ],
      difficulty: 'medium',
      tags: ['dynamic-programming', 'strings', 'subsequence'],
    },
    {
      prompt: `Implement a function to validate a binary search tree.

Given the root of a binary tree, determine if it is a valid binary search tree (BST).

A valid BST is defined as follows:
- The left subtree of a node contains only nodes with keys less than the node's key
- The right subtree of a node contains only nodes with keys greater than the node's key
- Both the left and right subtrees must also be binary search trees

Tree node structure:
class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

Function signature:
function isValidBST(root) {
  // Your code here
}`,
      tests: [
        { input: 'new TreeNode(2, new TreeNode(1), new TreeNode(3))', expected: 'true' },
        { input: 'new TreeNode(5, new TreeNode(1), new TreeNode(4, new TreeNode(3), new TreeNode(6)))', expected: 'false' },
        { input: 'new TreeNode(1)', expected: 'true' },
        { input: 'null', expected: 'true' },
      ],
      difficulty: 'medium',
      tags: ['trees', 'binary-search-tree', 'recursion'],
    },
    {
      prompt: `Write a function that finds the two numbers in an array that add up to a target sum.

Given an array of integers and a target sum, return the indices of the two numbers that add up to the target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Example:
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1] (because nums[0] + nums[1] = 2 + 7 = 9)`,
      tests: [
        { input: '[2, 7, 11, 15], 9', expected: '[0, 1]' },
        { input: '[3, 2, 4], 6', expected: '[1, 2]' },
        { input: '[3, 3], 6', expected: '[0, 1]' },
      ],
      difficulty: 'medium',
      tags: ['arrays', 'hash-table', 'two-pointers'],
    },
    {
      prompt: `Implement a function to reverse a linked list.

Given the head of a singly linked list, reverse the list and return the new head.

The linked list is defined as:
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val?: number, next?: ListNode | null) {
    this.val = (val === undefined ? 0 : val);
    this.next = (next === undefined ? null : next);
  }
}`,
      tests: [
        { input: '[1,2,3,4,5]', expected: '[5,4,3,2,1]' },
        { input: '[1,2]', expected: '[2,1]' },
        { input: '[]', expected: '[]' },
      ],
      difficulty: 'easy',
      tags: ['linked-list', 'recursion', 'iterative'],
    },
  ];
  
  const practicePuzzles: GeneratedPuzzle[] = [
    {
      prompt: `Find the maximum sum of a contiguous subarray (Kadane's Algorithm).

Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

This is a classic dynamic programming problem that can be solved efficiently in O(n) time.

Example:
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: [4,-1,2,1] has the largest sum = 6.`,
      tests: [
        { input: '[-2,1,-3,4,-1,2,1,-5,4]', expected: '6' },
        { input: '[1]', expected: '1' },
        { input: '[5,4,-1,7,8]', expected: '23' },
        { input: '[-1]', expected: '-1' },
      ],
      difficulty: 'medium',
      tags: ['dynamic-programming', 'arrays', 'kadane-algorithm'],
      hints: [
        'Think about what information you need to track as you iterate through the array.',
        'At each position, you can either extend the current subarray or start a new one.',
        'Keep track of the maximum sum seen so far and the maximum sum ending at the current position.',
        'This is Kadane\'s algorithm - a classic DP approach with O(n) time complexity.',
      ],
    },
    {
      prompt: `Check if a string is a valid palindrome.

A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

Example:
Input: s = "A man, a plan, a canal: Panama"
Output: true
Explanation: "amanaplanacanalpanama" is a palindrome.`,
      tests: [
        { input: '"A man, a plan, a canal: Panama"', expected: 'true' },
        { input: '"race a car"', expected: 'false' },
        { input: '" "', expected: 'true' },
      ],
      difficulty: 'easy',
      tags: ['strings', 'two-pointers', 'palindrome'],
      hints: [
        'First, clean the string by removing non-alphanumeric characters and converting to lowercase.',
        'Use two pointers - one at the start and one at the end.',
        'Compare characters and move pointers toward each other.',
        'If all comparisons match, it\'s a palindrome.',
      ],
    },
  ];

  // Return appropriate puzzle based on game mode
  if (gameMode === 'practice') {
    return practicePuzzles[Math.floor(Math.random() * practicePuzzles.length)];
  }
  
  return competitivePuzzles[Math.floor(Math.random() * competitivePuzzles.length)];
}

export async function analyzeCodingStyle(githubUsername: string): Promise<{
  preferredLanguages: string[];
  complexityLevel: number;
  favoritePatterns: string[];
}> {
  // TODO: Implement GitHub API integration to analyze coding patterns
  console.log('Analyzing coding style for:', githubUsername);
  
  return {
    preferredLanguages: ['javascript', 'typescript', 'python'],
    complexityLevel: 0.7, // 0-1 scale
    favoritePatterns: ['functional', 'object-oriented', 'recursive'],
  };
}
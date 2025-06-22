import { createClient } from '@supabase/supabase-js';
import { GameMode, PracticeMode, Difficulty } from '../types';

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration. Please check your environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
  
  // In development, show a helpful error
  if (import.meta.env.DEV) {
    throw new Error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }
}

// Create Supabase client with error handling
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Helper function to check if Supabase is available
export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}

// Helper function to get Supabase client with error handling
export function getSupabaseClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.');
  }
  return supabase;
}

// Database type definitions
export interface User {
  id: string;
  github_username?: string;
  display_name: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  elo_rating: number;
  games_played: number;
  games_won: number;
  created_at: string;
}

export interface Duel {
  id: string;
  creator_id: string;
  opponent_id?: string;
  status: 'waiting' | 'active' | 'completed';
  mode: GameMode;
  prompt: string;
  test_cases: Array<{ input: string; expected: string }>;
  time_limit: number; // in seconds
  elo_change?: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  mode: PracticeMode;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  test_cases: Array<{ input: string; expected: string }>;
  hints_used: number;
  completed: boolean;
  score: number;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  status: 'registration' | 'active' | 'completed';
  max_players: number;
  current_players: string[];
  bracket: any; // JSON field
  created_at: string;
}

export interface Submission {
  id: string;
  duel_id: string;
  user_id: string;
  code: string;
  passed_tests: number;
  total_tests: number;
  runtime_ms: number;
  submitted_at: string;
}

export interface Highlight {
  id: string;
  duel_id: string;
  video_url: string;
  keystrokes_data: string; // JSON string
  ai_commentary: string;
  created_at: string;
}
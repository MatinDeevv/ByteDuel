import { createClient } from '@supabase/supabase-js';

// Environment variables with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// For development, use demo credentials if environment variables are not set
const defaultUrl = 'https://demo.supabase.co';
const defaultKey = 'demo-key';

const finalUrl = supabaseUrl && !supabaseUrl.includes('xyzcompany') ? supabaseUrl : defaultUrl;
const finalKey = supabaseAnonKey && !supabaseAnonKey.includes('your_') ? supabaseAnonKey : defaultKey;

console.log('🔧 Supabase Configuration:', {
  url: finalUrl === defaultUrl ? 'Using demo URL' : 'Using environment URL',
  key: finalKey === defaultKey ? 'Using demo key' : 'Using environment key',
  isDemoMode: finalUrl === defaultUrl || finalKey === defaultKey,
});

// Create Supabase client with optimized configuration
export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'byteduel-web',
    },
  },
});

// Database type definitions
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          github_username: string | null;
          display_name: string;
          skill_level: 'beginner' | 'intermediate' | 'advanced';
          elo_rating: number;
          games_played: number;
          games_won: number;
          created_at: string;
          rating: number;
        };
        Insert: {
          id?: string;
          github_username?: string | null;
          display_name: string;
          skill_level?: 'beginner' | 'intermediate' | 'advanced';
          elo_rating?: number;
          games_played?: number;
          games_won?: number;
          created_at?: string;
          rating?: number;
        };
        Update: {
          id?: string;
          github_username?: string | null;
          display_name?: string;
          skill_level?: 'beginner' | 'intermediate' | 'advanced';
          elo_rating?: number;
          games_played?: number;
          games_won?: number;
          created_at?: string;
          rating?: number;
        };
      };
      matchmaking_queue: {
        Row: {
          user_id: string;
          mode: string;
          queued_at: string;
        };
        Insert: {
          user_id: string;
          mode?: string;
          queued_at?: string;
        };
        Update: {
          user_id?: string;
          mode?: string;
          queued_at?: string;
        };
      };
      duels: {
        Row: {
          id: string;
          creator_id: string;
          opponent_id: string | null;
          status: 'waiting' | 'active' | 'completed';
          mode: string;
          prompt: string;
          test_cases: any;
          time_limit: number;
          elo_change: number | null;
          created_at: string;
          started_at: string | null;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          creator_id: string;
          opponent_id?: string | null;
          status?: 'waiting' | 'active' | 'completed';
          mode: string;
          prompt: string;
          test_cases: any;
          time_limit: number;
          elo_change?: number | null;
          created_at?: string;
          started_at?: string | null;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          creator_id?: string;
          opponent_id?: string | null;
          status?: 'waiting' | 'active' | 'completed';
          mode?: string;
          prompt?: string;
          test_cases?: any;
          time_limit?: number;
          elo_change?: number | null;
          created_at?: string;
          started_at?: string | null;
          ended_at?: string | null;
        };
      };
      submissions: {
        Row: {
          id: string;
          duel_id: string;
          user_id: string;
          code: string;
          passed_tests: number;
          total_tests: number;
          runtime_ms: number;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          duel_id: string;
          user_id: string;
          code: string;
          passed_tests: number;
          total_tests: number;
          runtime_ms: number;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          duel_id?: string;
          user_id?: string;
          code?: string;
          passed_tests?: number;
          total_tests?: number;
          runtime_ms?: number;
          submitted_at?: string;
        };
      };
      practice_sessions: {
        Row: {
          id: string;
          user_id: string;
          mode: string;
          topic: string;
          difficulty: 'easy' | 'medium' | 'hard';
          prompt: string;
          test_cases: any;
          hints_used: number;
          completed: boolean;
          score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: string;
          topic: string;
          difficulty: 'easy' | 'medium' | 'hard';
          prompt: string;
          test_cases: any;
          hints_used?: number;
          completed?: boolean;
          score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mode?: string;
          topic?: string;
          difficulty?: 'easy' | 'medium' | 'hard';
          prompt?: string;
          test_cases?: any;
          hints_used?: number;
          completed?: boolean;
          score?: number;
          created_at?: string;
        };
      };
      match_history: {
        Row: {
          id: string;
          user_id: string;
          duel_id: string;
          opponent_id: string | null;
          result: 'win' | 'loss' | 'draw';
          rating_before: number;
          rating_after: number;
          rating_change: number;
          completion_time: number | null;
          wrong_submissions: number;
          final_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          duel_id: string;
          opponent_id?: string | null;
          result: 'win' | 'loss' | 'draw';
          rating_before: number;
          rating_after: number;
          rating_change: number;
          completion_time?: number | null;
          wrong_submissions?: number;
          final_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          duel_id?: string;
          opponent_id?: string | null;
          result?: 'win' | 'loss' | 'draw';
          rating_before?: number;
          rating_after?: number;
          rating_change?: number;
          completion_time?: number | null;
          wrong_submissions?: number;
          final_code?: string | null;
          created_at?: string;
        };
      };
      user_stats: {
        Row: {
          user_id: string;
          total_matches: number;
          wins: number;
          losses: number;
          draws: number;
          win_rate: number;
          avg_completion_time: number | null;
          fastest_solve: number | null;
          current_streak: number;
          best_streak: number;
          total_wrong_submissions: number;
          favorite_topics: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          total_matches?: number;
          wins?: number;
          losses?: number;
          draws?: number;
          win_rate?: number;
          avg_completion_time?: number | null;
          fastest_solve?: number | null;
          current_streak?: number;
          best_streak?: number;
          total_wrong_submissions?: number;
          favorite_topics?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          total_matches?: number;
          wins?: number;
          losses?: number;
          draws?: number;
          win_rate?: number;
          avg_completion_time?: number | null;
          fastest_solve?: number | null;
          current_streak?: number;
          best_streak?: number;
          total_wrong_submissions?: number;
          favorite_topics?: string[] | null;
          updated_at?: string | null;
        };
      };
    };
    Functions: {
      calculate_elo_change: {
        Args: {
          winner_rating: number;
          loser_rating: number;
          k_factor?: number;
        };
        Returns: {
          winner_change: number;
          loser_change: number;
        }[];
      };
      get_user_leaderboard_position: {
        Args: {
          user_profile_id: string;
        };
        Returns: number;
      };
    };
  };
}

// Type helpers
export type Profile = Database['public']['Tables']['users']['Row'];
export type Duel = Database['public']['Tables']['duels']['Row'];
export type Submission = Database['public']['Tables']['submissions']['Row'];
export type PracticeSession = Database['public']['Tables']['practice_sessions']['Row'];
export type MatchHistory = Database['public']['Tables']['match_history']['Row'];
export type UserStats = Database['public']['Tables']['user_stats']['Row'];

// Utility functions
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && 
    !supabaseUrl.includes('xyzcompany') && 
    !supabaseAnonKey.includes('your_'));
};

export const getSupabaseStatus = () => {
  return {
    configured: isSupabaseConfigured(),
    url: finalUrl === defaultUrl ? 'Demo Mode' : 'Configured',
    key: finalKey === defaultKey ? 'Demo Mode' : 'Configured',
    isDemoMode: finalUrl === defaultUrl || finalKey === defaultKey,
  };
};

// Mock Supabase for demo mode
if (finalUrl === defaultUrl || finalKey === defaultKey) {
  console.log('🎭 Running in demo mode - using mock data');
  
  // Override supabase methods for demo
  const originalFrom = supabase.from.bind(supabase);
  supabase.from = (table: string) => {
    // Mock successful responses for demo
    const mockResponse = {
      data: [],
      error: null,
      count: 0,
    };
    
    // Create a chainable mock query builder
    const createMockQueryBuilder = (): any => {
      const builder = {
        ...mockResponse,
        select: () => createMockQueryBuilder(),
        insert: () => createMockQueryBuilder(),
        update: () => createMockQueryBuilder(),
        delete: () => createMockQueryBuilder(),
        upsert: () => createMockQueryBuilder(),
        eq: () => createMockQueryBuilder(),
        neq: () => createMockQueryBuilder(),
        gte: () => createMockQueryBuilder(),
        lte: () => createMockQueryBuilder(),
        gt: () => createMockQueryBuilder(),
        lt: () => createMockQueryBuilder(),
        like: () => createMockQueryBuilder(),
        ilike: () => createMockQueryBuilder(),
        in: () => createMockQueryBuilder(),
        is: () => createMockQueryBuilder(),
        order: () => createMockQueryBuilder(),
        limit: () => createMockQueryBuilder(),
        range: () => createMockQueryBuilder(),
        single: () => Promise.resolve(mockResponse),
        maybeSingle: () => Promise.resolve(mockResponse),
        then: (resolve: any) => Promise.resolve(mockResponse).then(resolve),
        catch: (reject: any) => Promise.resolve(mockResponse).catch(reject),
      };
      return builder;
    };
    
    return createMockQueryBuilder();
  };
}
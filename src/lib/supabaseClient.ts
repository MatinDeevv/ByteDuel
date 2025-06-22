import { createClient } from '@supabase/supabase-js';

// Environment variables with validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file:\n' +
    `VITE_SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}\n` +
    `VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✓' : '✗'}`
  );
}

// Create Supabase client with optimized configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
      profiles: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string | null;
          display_name: string;
          github_username: string | null;
          github_id: string | null;
          avatar_url: string | null;
          bio: string | null;
          skill_level: 'beginner' | 'intermediate' | 'advanced';
          elo_rating: number;
          wins: number;
          losses: number;
          draws: number;
          total_matches: number;
          current_streak: number;
          best_streak: number;
          preferred_languages: string[];
          timezone: string;
          is_active: boolean;
          last_active: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          email?: string | null;
          display_name: string;
          github_username?: string | null;
          github_id?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          skill_level?: 'beginner' | 'intermediate' | 'advanced';
          elo_rating?: number;
          wins?: number;
          losses?: number;
          draws?: number;
          total_matches?: number;
          current_streak?: number;
          best_streak?: number;
          preferred_languages?: string[];
          timezone?: string;
          is_active?: boolean;
          last_active?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          email?: string | null;
          display_name?: string;
          github_username?: string | null;
          github_id?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          skill_level?: 'beginner' | 'intermediate' | 'advanced';
          elo_rating?: number;
          wins?: number;
          losses?: number;
          draws?: number;
          total_matches?: number;
          current_streak?: number;
          best_streak?: number;
          preferred_languages?: string[];
          timezone?: string;
          is_active?: boolean;
          last_active?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_stats: {
        Row: {
          user_id: string;
          total_practice_sessions: number;
          total_code_submissions: number;
          average_solve_time: number | null;
          fastest_solve_time: number | null;
          slowest_solve_time: number | null;
          favorite_topics: string[];
          difficulty_distribution: any;
          monthly_activity: any;
          performance_trend: any;
          achievements: string[];
          total_hints_used: number;
          perfect_solutions: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_practice_sessions?: number;
          total_code_submissions?: number;
          average_solve_time?: number | null;
          fastest_solve_time?: number | null;
          slowest_solve_time?: number | null;
          favorite_topics?: string[];
          difficulty_distribution?: any;
          monthly_activity?: any;
          performance_trend?: any;
          achievements?: string[];
          total_hints_used?: number;
          perfect_solutions?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          total_practice_sessions?: number;
          total_code_submissions?: number;
          average_solve_time?: number | null;
          fastest_solve_time?: number | null;
          slowest_solve_time?: number | null;
          favorite_topics?: string[];
          difficulty_distribution?: any;
          monthly_activity?: any;
          performance_trend?: any;
          achievements?: string[];
          total_hints_used?: number;
          perfect_solutions?: number;
          updated_at?: string;
        };
      };
      duels: {
        Row: {
          id: string;
          creator_id: string;
          opponent_id: string | null;
          status: 'waiting' | 'active' | 'completed' | 'cancelled';
          mode: 'ranked' | 'casual' | 'tournament' | 'practice';
          difficulty: 'easy' | 'medium' | 'hard';
          topic: string;
          prompt: string;
          test_cases: any;
          time_limit: number;
          max_attempts: number;
          winner_id: string | null;
          creator_rating_before: number | null;
          opponent_rating_before: number | null;
          creator_rating_after: number | null;
          opponent_rating_after: number | null;
          creator_rating_change: number;
          opponent_rating_change: number;
          creator_completion_time: number | null;
          opponent_completion_time: number | null;
          creator_attempts: number;
          opponent_attempts: number;
          metadata: any;
          created_at: string;
          started_at: string | null;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          creator_id: string;
          opponent_id?: string | null;
          status?: 'waiting' | 'active' | 'completed' | 'cancelled';
          mode: 'ranked' | 'casual' | 'tournament' | 'practice';
          difficulty?: 'easy' | 'medium' | 'hard';
          topic: string;
          prompt: string;
          test_cases: any;
          time_limit?: number;
          max_attempts?: number;
          winner_id?: string | null;
          creator_rating_before?: number | null;
          opponent_rating_before?: number | null;
          creator_rating_after?: number | null;
          opponent_rating_after?: number | null;
          creator_rating_change?: number;
          opponent_rating_change?: number;
          creator_completion_time?: number | null;
          opponent_completion_time?: number | null;
          creator_attempts?: number;
          opponent_attempts?: number;
          metadata?: any;
          created_at?: string;
          started_at?: string | null;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          creator_id?: string;
          opponent_id?: string | null;
          status?: 'waiting' | 'active' | 'completed' | 'cancelled';
          mode?: 'ranked' | 'casual' | 'tournament' | 'practice';
          difficulty?: 'easy' | 'medium' | 'hard';
          topic?: string;
          prompt?: string;
          test_cases?: any;
          time_limit?: number;
          max_attempts?: number;
          winner_id?: string | null;
          creator_rating_before?: number | null;
          opponent_rating_before?: number | null;
          creator_rating_after?: number | null;
          opponent_rating_after?: number | null;
          creator_rating_change?: number;
          opponent_rating_change?: number;
          creator_completion_time?: number | null;
          opponent_completion_time?: number | null;
          creator_attempts?: number;
          opponent_attempts?: number;
          metadata?: any;
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
          language: string;
          passed_tests: number;
          total_tests: number;
          runtime_ms: number;
          memory_usage: number;
          test_results: any;
          is_final: boolean;
          attempt_number: number;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          duel_id: string;
          user_id: string;
          code: string;
          language?: string;
          passed_tests?: number;
          total_tests?: number;
          runtime_ms?: number;
          memory_usage?: number;
          test_results?: any;
          is_final?: boolean;
          attempt_number?: number;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          duel_id?: string;
          user_id?: string;
          code?: string;
          language?: string;
          passed_tests?: number;
          total_tests?: number;
          runtime_ms?: number;
          memory_usage?: number;
          test_results?: any;
          is_final?: boolean;
          attempt_number?: number;
          submitted_at?: string;
        };
      };
      practice_sessions: {
        Row: {
          id: string;
          user_id: string;
          topic: string;
          difficulty: 'easy' | 'medium' | 'hard';
          prompt: string;
          test_cases: any;
          hints: any;
          hints_used: number;
          completed: boolean;
          score: number;
          completion_time: number | null;
          attempts: number;
          final_code: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic: string;
          difficulty: 'easy' | 'medium' | 'hard';
          prompt: string;
          test_cases: any;
          hints?: any;
          hints_used?: number;
          completed?: boolean;
          score?: number;
          completion_time?: number | null;
          attempts?: number;
          final_code?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic?: string;
          difficulty?: 'easy' | 'medium' | 'hard';
          prompt?: string;
          test_cases?: any;
          hints?: any;
          hints_used?: number;
          completed?: boolean;
          score?: number;
          completion_time?: number | null;
          attempts?: number;
          final_code?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      match_history: {
        Row: {
          id: string;
          user_id: string;
          duel_id: string;
          opponent_id: string;
          result: 'win' | 'loss' | 'draw';
          rating_before: number;
          rating_after: number;
          rating_change: number;
          completion_time: number | null;
          attempts: number;
          final_code: string | null;
          match_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          duel_id: string;
          opponent_id: string;
          result: 'win' | 'loss' | 'draw';
          rating_before: number;
          rating_after: number;
          rating_change: number;
          completion_time?: number | null;
          attempts?: number;
          final_code?: string | null;
          match_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          duel_id?: string;
          opponent_id?: string;
          result?: 'win' | 'loss' | 'draw';
          rating_before?: number;
          rating_after?: number;
          rating_change?: number;
          completion_time?: number | null;
          attempts?: number;
          final_code?: string | null;
          match_date?: string;
          created_at?: string;
        };
      };
      leaderboards: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          github_username: string | null;
          elo_rating: number;
          wins: number;
          losses: number;
          total_matches: number;
          win_rate: number;
          current_streak: number;
          best_streak: number;
          average_solve_time: number | null;
          fastest_solve_time: number | null;
          rank: number;
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
      get_matchmaking_candidates: {
        Args: {
          user_profile_id: string;
          rating_range?: number;
        };
        Returns: {
          id: string;
          display_name: string;
          elo_rating: number;
          total_matches: number;
          last_active: string;
        }[];
      };
      refresh_leaderboards: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
    };
  };
}

// Type helpers
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserStats = Database['public']['Tables']['user_stats']['Row'];
export type Duel = Database['public']['Tables']['duels']['Row'];
export type Submission = Database['public']['Tables']['submissions']['Row'];
export type PracticeSession = Database['public']['Tables']['practice_sessions']['Row'];
export type MatchHistory = Database['public']['Tables']['match_history']['Row'];
export type LeaderboardEntry = Database['public']['Tables']['leaderboards']['Row'];

// Utility functions
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

export const getSupabaseStatus = () => {
  return {
    configured: isSupabaseConfigured(),
    url: supabaseUrl ? 'Set' : 'Missing',
    key: supabaseAnonKey ? 'Set' : 'Missing',
  };
};
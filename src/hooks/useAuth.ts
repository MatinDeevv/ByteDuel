/**
 * Simple Client-Side Authentication Hook
 * Direct GitHub OAuth with immediate profile creation
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase, type Profile, isSupabaseConfigured } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export interface AuthActions {
  signInWithGitHub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  diagnoseAuth: () => Promise<void>;
}

const AUTH_QUERY_KEY = ['auth'];

/**
 * Main authentication hook - simplified approach
 */
export function useAuth(): AuthState & AuthActions {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Simple auth query that handles everything
  const {
    data: authData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      
      try {
        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
          console.log('🎭 Demo mode - creating mock user');
          return createDemoUser();
        }

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (!session?.user) {
          return null;
        }
        
        // Get or create profile immediately
        let profile = await getProfile(session.user.id);
        
        if (!profile) {
          profile = await createProfile(session.user);
        }
        
        return { user: session.user, profile };
      } catch (error) {
        console.error('Auth query error:', error);
        // In demo mode, return demo user on error
        if (!isSupabaseConfigured()) {
          return createDemoUser();
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      return failureCount < 2;
    },
  });

  // Set up auth state listener (only if Supabase is configured)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Immediately refetch to get/create profile
          queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY });
          setError(null);
        } else if (event === 'SIGNED_OUT') {
          queryClient.setQueryData(AUTH_QUERY_KEY, null);
          setError(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // GitHub sign-in
  const signInWithGitHub = async () => {
    
    try {
      if (!isSupabaseConfigured()) {
        // Demo mode - simulate successful auth
        queryClient.setQueryData(AUTH_QUERY_KEY, createDemoUser());
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'read:user user:email',
        },
      });

      if (error) {
        setError(error.message);
        throw error;
      }
    } catch (error) {
      throw error;
    }
  };

  // Email sign-in
  const signInWithEmail = async (email: string, password: string) => {
    
    try {
      if (!isSupabaseConfigured()) {
        // Demo mode - simulate successful auth
        queryClient.setQueryData(AUTH_QUERY_KEY, createDemoUser());
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        throw error;
      }

      // Trigger refetch to get profile
      queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY });
      setError(null);
    } catch (error) {
      throw error;
    }
  };

  // Email sign-up
  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    
    try {
      if (!isSupabaseConfigured()) {
        // Demo mode - simulate successful auth
        queryClient.setQueryData(AUTH_QUERY_KEY, createDemoUser());
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) {
        setError(error.message);
        throw error;
      }

      // For email signup, we need to wait for email confirmation
      // But we can still create the profile if the user was created
      if (data.user && !data.user.email_confirmed_at) {
        // User needs to confirm email
        setError('Please check your email and click the confirmation link to complete signup.');
        return;
      }

      // Trigger refetch to get profile
      queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY });
      setError(null);
    } catch (error) {
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    
    try {
      if (!isSupabaseConfigured()) {
        // Demo mode - clear auth data
        queryClient.setQueryData(AUTH_QUERY_KEY, null);
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(error.message);
        throw error;
      }
      
      setError(null);
    } catch (error) {
      throw error;
    }
  };

  // Diagnostic function
  const diagnoseAuth = async () => {
    console.log('🔍 === AUTH DIAGNOSIS START ===');
    
    try {
      // Check environment
      console.log('🌍 Environment check:', {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing',
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
        currentUrl: window.location.href,
        isConfigured: isSupabaseConfigured(),
      });
      
      if (!isSupabaseConfigured()) {
        console.log('🎭 Running in demo mode');
        return;
      }
      
      // Check session
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      console.log('🎫 Session check:', { 
        hasSession: !!session?.session,
        hasUser: !!session?.session?.user,
        userId: session?.session?.user?.id,
        error: sessionError 
      });
      
      // Check user
      const { data: user, error: userError } = await supabase.auth.getUser();
      console.log('👤 User check:', { 
        hasUser: !!user?.user,
        userId: user?.user?.id,
        email: user?.user?.email,
        error: userError 
      });
      
      // Test database connection
      try {
        const { data, error, count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        console.log('🗄️ Database test (users table):', { 
          success: !error,
          count,
          error: error?.message 
        });
      } catch (e) {
        console.log('💥 Database error:', e);
      }
      
      // Test basic connectivity
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        console.log('🌐 Supabase connectivity:', {
          status: response.status,
          ok: response.ok,
        });
      } catch (e) {
        console.log('💥 Connectivity error:', e);
      }
      
      // Check React Query state
      const queryCache = queryClient.getQueryCache();
      const authQuery = queryCache.find({ queryKey: AUTH_QUERY_KEY });
      console.log('⚛️ React Query state:', {
        hasAuthQuery: !!authQuery,
        queryState: authQuery?.state.status,
        queryData: !!authQuery?.state.data,
        queryError: authQuery?.state.error?.message,
      });
      
    } catch (error) {
      console.error('💥 Diagnosis error:', error);
    }
    
    console.log('🔍 === AUTH DIAGNOSIS END ===');
  };

  const clearError = () => setError(null);

  // Combine query error with local errors
  const combinedError = error || (queryError instanceof Error ? queryError.message : null);

  return {
    user: authData?.user || null,
    profile: authData?.profile || null,
    loading,
    error: combinedError,
    signInWithGitHub,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    clearError,
    diagnoseAuth,
  };
}

/**
 * Create demo user for testing
 */
function createDemoUser(): { user: User; profile: Profile } {
  const demoUser = {
    id: 'demo-user-123',
    email: 'demo@byteduel.com',
    user_metadata: {
      display_name: 'Demo Player',
      user_name: 'demoplayer',
    },
  } as User;

  const demoProfile: Profile = {
    id: 'demo-user-123',
    github_username: 'demoplayer',
    display_name: 'Demo Player',
    skill_level: 'intermediate',
    elo_rating: 1350,
    rating: 1350,
    games_played: 15,
    games_won: 9,
    created_at: new Date().toISOString(),
  };

  return { user: demoUser, profile: demoProfile };
}

/**
 * Get existing profile
 */
async function getProfile(userId: string): Promise<Profile | null> {
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Create new profile from user data
 */
async function createProfile(user: User): Promise<Profile> {
  
  try {
    const githubData = user.user_metadata || {};
    
    const profileData = {
      id: user.id,
      github_username: githubData?.user_name || null,
      display_name: githubData?.full_name || 
                    githubData?.name || 
                    githubData?.user_name || 
                    user.email?.split('@')[0] ||
                    'User',
      skill_level: 'beginner' as const,
      elo_rating: 1200,
      rating: 1200,
      games_played: 0,
      games_won: 0,
    };

    const { data, error } = await supabase
      .from('users')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
}
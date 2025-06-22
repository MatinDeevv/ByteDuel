/**
 * Simple Client-Side Authentication Hook
 * Direct GitHub OAuth with immediate profile creation
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase, type Profile } from '../lib/supabaseClient';
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
      console.log('🔍 Auth query running...');
      
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          throw sessionError;
        }
        
        if (!session?.user) {
          console.log('ℹ️ No session found');
          return null;
        }
        
        console.log('✅ Session found for user:', session.user.id);
        console.log('📧 User email:', session.user.email);
        console.log('🔗 User metadata:', session.user.user_metadata);
        
        // Get or create profile immediately
        let profile = await getProfile(session.user.id);
        
        if (!profile) {
          console.log('🆕 No profile found, creating one...');
          profile = await createProfile(session.user);
        }
        
        console.log('✅ Profile ready:', profile.display_name);
        return { user: session.user, profile };
      } catch (error) {
        console.error('💥 Auth query error:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      console.log(`🔄 Auth query retry ${failureCount}:`, error);
      return failureCount < 2;
    },
  });

  // Set up auth state listener
  useEffect(() => {
    console.log('🎧 Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, !!session?.user);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in, refetching auth data...');
          // Immediately refetch to get/create profile
          queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY });
          setError(null);
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out, clearing auth data...');
          queryClient.setQueryData(AUTH_QUERY_KEY, null);
          setError(null);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed');
        }
      }
    );

    return () => {
      console.log('🔌 Cleaning up auth state listener...');
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // GitHub sign-in
  const signInWithGitHub = async () => {
    console.log('🚀 Starting GitHub sign in...');
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/`,
          scopes: 'read:user user:email',
        },
      });

      if (error) {
        console.error('❌ GitHub OAuth error:', error);
        setError(error.message);
        throw error;
      }
      
      console.log('✅ GitHub OAuth initiated successfully');
    } catch (error) {
      console.error('💥 GitHub sign in failed:', error);
      throw error;
    }
  };

  // Email sign-in
  const signInWithEmail = async (email: string, password: string) => {
    console.log('📧 Starting email sign in for:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Email sign in error:', error);
        setError(error.message);
        throw error;
      }

      console.log('✅ Email sign in successful');
      setError(null);
    } catch (error) {
      console.error('💥 Email sign in failed:', error);
      throw error;
    }
  };

  // Email sign-up
  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    console.log('📝 Starting email sign up for:', email);
    
    try {
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
        console.error('❌ Email sign up error:', error);
        setError(error.message);
        throw error;
      }

      console.log('✅ Email sign up successful');
      setError(null);
    } catch (error) {
      console.error('💥 Email sign up failed:', error);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    console.log('👋 Signing out...');
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
        setError(error.message);
        throw error;
      }
      
      console.log('✅ Sign out successful');
      setError(null);
    } catch (error) {
      console.error('💥 Sign out failed:', error);
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
      });
      
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
 * Get existing profile
 */
async function getProfile(userId: string): Promise<Profile | null> {
  console.log('🔍 Getting profile for user:', userId);
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error getting profile:', error);
      throw error;
    }

    if (data) {
      console.log('✅ Profile found:', data.display_name);
    } else {
      console.log('ℹ️ No profile found');
    }

    return data || null;
  } catch (error) {
    console.error('💥 Get profile failed:', error);
    throw error;
  }
}

/**
 * Create new profile from user data
 */
async function createProfile(user: User): Promise<Profile> {
  console.log('🆕 Creating profile for user:', user.id);
  
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

    console.log('📝 Profile data to create:', profileData);

    const { data, error } = await supabase
      .from('users')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error('❌ Profile creation error:', error);
      throw error;
    }

    console.log('✅ Profile created successfully:', data.display_name);
    return data;
  } catch (error) {
    console.error('💥 Create profile failed:', error);
    throw error;
  }
}
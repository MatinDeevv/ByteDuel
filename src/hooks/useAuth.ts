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
      console.log('Auth query running...');
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }
      
      if (!session?.user) {
        console.log('No session found');
        return null;
      }
      
      console.log('Session found for user:', session.user.id);
      
      // Get or create profile immediately
      let profile = await getProfile(session.user.id);
      
      if (!profile) {
        console.log('No profile found, creating one...');
        profile = await createProfile(session.user);
      }
      
      console.log('Profile ready:', profile.display_name);
      return { user: session.user, profile };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, !!session?.user);
        
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

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // GitHub sign-in
  const signInWithGitHub = async () => {
    console.log('Starting GitHub sign in...');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: 'read:user user:email',
      },
    });

    if (error) {
      console.error('GitHub OAuth error:', error);
      setError(error.message);
      throw error;
    }
  };

  // Email sign-in
  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      throw error;
    }

    // Profile will be handled by auth state change
    setError(null);
  };

  // Email sign-up
  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
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

    setError(null);
  };

  // Sign out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError(error.message);
      throw error;
    }
    setError(null);
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
  };
}

/**
 * Get existing profile
 */
async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting profile:', error);
    throw error;
  }

  return data || null;
}

/**
 * Create new profile from user data
 */
async function createProfile(user: User): Promise<Profile> {
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

  console.log('Creating profile:', profileData);

  const { data, error } = await supabase
    .from('users')
    .insert(profileData)
    .select()
    .single();

  if (error) {
    console.error('Profile creation error:', error);
    throw error;
  }

  console.log('Profile created successfully:', data.display_name);
  return data;
}
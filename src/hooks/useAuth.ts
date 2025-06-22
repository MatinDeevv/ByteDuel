/**
 * Enhanced Authentication Hook with React Query
 * Provides optimized auth state management with caching
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase, type Profile } from '../lib/supabaseClient';
import { User, AuthError } from '@supabase/supabase-js';
import {
  getCurrentUserWithProfile,
  signInWithGitHub as authSignInWithGitHub,
  signInWithEmail as authSignInWithEmail,
  signUpWithEmail as authSignUpWithEmail,
  signOut as authSignOut,
  updateProfile,
  syncWithGitHub,
} from '../services/authService';

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
  updateProfile: (updates: Partial<Profile>) => Promise<Profile>;
  syncWithGitHub: (githubUsername: string) => Promise<Profile>;
  clearError: () => void;
}

const AUTH_QUERY_KEY = ['auth'];

/**
 * Main authentication hook
 */
export function useAuth(): AuthState & AuthActions {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [profileCreated, setProfileCreated] = useState(false);

  // Query for current user and profile
  const {
    data: authData,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getCurrentUserWithProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    enabled: true, // Always enabled
  });

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, !!session?.user);
        
        // Invalidate auth query to refetch
        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
        
        // Clear any existing errors on successful auth
        if (session?.user) {
          setError(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // GitHub sign-in mutation
  const signInWithGitHubMutation = useMutation({
    mutationFn: authSignInWithGitHub,
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Email sign-in mutation
  const signInWithEmailMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authSignInWithEmail(email, password),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Email sign-up mutation
  const signUpWithEmailMutation = useMutation({
    mutationFn: ({ email, password, displayName }: { 
      email: string; 
      password: string; 
      displayName: string; 
    }) => authSignUpWithEmail(email, password, displayName),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEY });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Sign-out mutation
  const signOutMutation = useMutation({
    mutationFn: authSignOut,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear(); // Clear all cached data
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (updates: Partial<Profile>) => {
      if (!authData?.profile) {
        throw new Error('No profile to update');
      }
      return updateProfile(authData.profile.id, updates);
    },
    onSuccess: (updatedProfile) => {
      // Update cached auth data
      queryClient.setQueryData(AUTH_QUERY_KEY, (old: any) => 
        old ? { ...old, profile: updatedProfile } : old
      );
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Sync with GitHub mutation
  const syncWithGitHubMutation = useMutation({
    mutationFn: (githubUsername: string) => {
      if (!authData?.profile) {
        throw new Error('No profile to sync');
      }
      return syncWithGitHub(authData.profile.id, githubUsername);
    },
    onSuccess: (updatedProfile) => {
      // Update cached auth data
      queryClient.setQueryData(AUTH_QUERY_KEY, (old: any) => 
        old ? { ...old, profile: updatedProfile } : old
      );
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const clearError = () => setError(null);

  // Combine query error with mutation errors
  const combinedError = error || (queryError instanceof Error ? queryError.message : null);

  return {
    user: authData?.user || null,
    profile: authData?.profile || null,
    loading: loading || 
             signInWithEmailMutation.isPending || 
             signUpWithEmailMutation.isPending || 
             signOutMutation.isPending,
    error: combinedError,
    signInWithGitHub: signInWithGitHubMutation.mutateAsync,
    signInWithEmail: (email: string, password: string) =>
      signInWithEmailMutation.mutateAsync({ email, password }),
    signUpWithEmail: (email: string, password: string, displayName: string) =>
      signUpWithEmailMutation.mutateAsync({ email, password, displayName }),
    signOut: signOutMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    syncWithGitHub: syncWithGitHubMutation.mutateAsync,
    clearError,
  };
}

/**
 * Hook to check if user is authenticated
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  return {
    isAuthenticated: !!user,
    loading,
    user,
  };
}

/**
 * Hook for auth-dependent queries
 */
export function useAuthQuery<T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  options: any = {}
) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['auth-dependent', ...queryKey],
    queryFn,
    enabled: !!user,
    ...options,
  });
}
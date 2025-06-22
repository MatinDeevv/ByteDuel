/**
 * Authentication Service - Handle GitHub OAuth and email/password auth with secure cookie storage
 */
import React from 'react';
import Cookies from 'js-cookie';
import { supabase, isSupabaseAvailable } from './supabaseClient';
import { User } from '@supabase/supabase-js';
import { useAuthStore } from '../store/authStore';

export interface UserProfile {
  id: string;
  email?: string;
  display_name: string;
  github_username?: string;
  github_id?: string;
  avatar_url?: string;
  rating: number;
  wins: number;
  losses: number;
  created_at: string;
  last_active?: string;
}

export interface GitHubProfile {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  email?: string;
  bio?: string;
  public_repos: number;
  followers: number;
  following: number;
}

// Cookie configuration
const COOKIE_OPTIONS = {
  secure: window.location.protocol === 'https:',
  sameSite: 'lax' as const,
  expires: 7, // 7 days
};

const ACCESS_TOKEN_KEY = 'sb-access-token';
const REFRESH_TOKEN_KEY = 'sb-refresh-token';

/**
 * Store auth tokens in secure cookies
 */
export function storeAuthTokens(accessToken: string, refreshToken: string): void {
  Cookies.set(ACCESS_TOKEN_KEY, accessToken, COOKIE_OPTIONS);
  Cookies.set(REFRESH_TOKEN_KEY, refreshToken, COOKIE_OPTIONS);
}

/**
 * Get auth tokens from cookies
 */
export function getAuthTokens(): { accessToken: string | null; refreshToken: string | null } {
  return {
    accessToken: Cookies.get(ACCESS_TOKEN_KEY) || null,
    refreshToken: Cookies.get(REFRESH_TOKEN_KEY) || null,
  };
}

/**
 * Clear auth tokens from cookies
 */
export function clearAuthTokens(): void {
  Cookies.remove(ACCESS_TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
}

/**
 * Parse OAuth tokens from URL fragment
 */
export function parseAuthFragment(): { accessToken: string | null; refreshToken: string | null; error?: string } {
  const fragment = window.location.hash.substring(1);
  const params = new URLSearchParams(fragment);
  
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    error: params.get('error_description') || params.get('error'),
  };
}

/**
 * Clear URL fragment from address bar
 */
export function clearUrlFragment(): void {
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

/**
 * Sign in with GitHub OAuth
 */
export async function signInWithGitHub(): Promise<void> {
  if (!isSupabaseAvailable()) {
    throw new Error('Authentication service is not available. Please check configuration.');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'read:user user:email',
    },
  });

  if (error) {
    throw new Error(`GitHub sign-in failed: ${error.message}`);
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<{ user: User; profile: UserProfile }> {
  if (!isSupabaseAvailable()) {
    throw new Error('Authentication service is not available. Please check configuration.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Email sign-in failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Sign-in failed: No user returned');
  }

  // Store tokens in cookies
  if (data.session) {
    storeAuthTokens(data.session.access_token, data.session.refresh_token);
  }

  // Fetch user profile
  const profile = await getUserProfile(data.user.id);
  if (!profile) {
    // Create profile if it doesn't exist
    const newProfile = await createUserProfile(data.user);
    return { user: data.user, profile: newProfile };
  }

  return { user: data.user, profile };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string, 
  password: string, 
  displayName: string
): Promise<{ user: User; profile: UserProfile }> {
  if (!isSupabaseAvailable()) {
    throw new Error('Authentication service is not available. Please check configuration.');
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
    throw new Error(`Email sign-up failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Sign-up failed: No user returned');
  }

  // Store tokens in cookies if session exists
  if (data.session) {
    storeAuthTokens(data.session.access_token, data.session.refresh_token);
  }

  // Create user profile
  const profile = await createUserProfile(data.user, { display_name: displayName });
  
  return { user: data.user, profile };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  clearAuthTokens();
  
  if (isSupabaseAvailable()) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign-out error:', error);
      // Don't throw error for sign-out failures
    }
  }
}

/**
 * Get current user session
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseAvailable()) {
    return null;
  }

  // Try to get session from Supabase first
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    return user;
  }

  // If no session, try to restore from cookies
  const { accessToken, refreshToken } = getAuthTokens();
  
  if (accessToken && refreshToken) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        clearAuthTokens();
        return null;
      }

      return data.user;
    } catch (error) {
      clearAuthTokens();
      return null;
    }
  }

  return null;
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseAvailable()) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }

  return data;
}

/**
 * Create user profile after authentication
 */
export async function createUserProfile(
  user: User, 
  additionalData: Partial<UserProfile> = {}
): Promise<UserProfile> {
  if (!isSupabaseAvailable()) {
    throw new Error('Database service is not available. Please check configuration.');
  }

  // Extract GitHub data if available
  const githubData = user.user_metadata;
  
  const profileData = {
    id: user.id,
    email: user.email,
    display_name: additionalData.display_name || githubData?.full_name || githubData?.user_name || 'Anonymous',
    github_username: githubData?.user_name,
    github_id: githubData?.provider_id,
    avatar_url: githubData?.avatar_url,
    rating: 1200,
    wins: 0,
    losses: 0,
    last_active: new Date().toISOString(),
    ...additionalData,
  };

  const { data, error } = await supabase
    .from('users')
    .upsert(profileData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user profile: ${error.message}`);
  }

  return data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string, 
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  if (!isSupabaseAvailable()) {
    throw new Error('Database service is not available. Please check configuration.');
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      last_active: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }

  return data;
}

/**
 * Fetch GitHub profile data
 */
export async function fetchGitHubProfile(username: string): Promise<GitHubProfile | null> {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch GitHub profile:', error);
    return null;
  }
}

/**
 * Sync user profile with GitHub data
 */
export async function syncWithGitHub(userId: string, githubUsername: string): Promise<UserProfile> {
  const githubProfile = await fetchGitHubProfile(githubUsername);
  
  if (!githubProfile) {
    throw new Error('GitHub profile not found');
  }

  const updates = {
    github_username: githubProfile.login,
    github_id: githubProfile.id.toString(),
    display_name: githubProfile.name || githubProfile.login,
    avatar_url: githubProfile.avatar_url,
  };

  return updateUserProfile(userId, updates);
}

/**
 * Main auth hook with comprehensive state management
 */
export function useAuth() {
  const {
    user,
    profile,
    loading,
    error,
    setUser,
    setProfile,
    setLoading,
    setError,
    clearError,
    reset,
  } = useAuthStore();

  React.useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check if Supabase is available
        if (!isSupabaseAvailable()) {
          setError('Authentication service is not configured properly.');
          setLoading(false);
          return;
        }

        // Get initial session
        const currentUser = await getCurrentUser();
        
        if (!mounted) return;

        if (currentUser) {
          setUser(currentUser);
          
          // Fetch user profile
          const userProfile = await getUserProfile(currentUser.id);
          if (!mounted) return;
          
          if (!userProfile) {
            // Create profile for new users
            try {
              const newProfile = await createUserProfile(currentUser);
              if (mounted) {
                setProfile(newProfile);
              }
            } catch (profileError) {
              console.error('Failed to create user profile:', profileError);
              if (mounted) {
                setError('Failed to set up user profile. Please try again.');
              }
            }
          } else {
            setProfile(userProfile);
          }
        }
      } catch (initError) {
        console.error('Auth initialization error:', initError);
        if (mounted) {
          setError('Failed to initialize authentication. Please refresh the page.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state change:', event, session?.user?.id);

        try {
          if (session?.user) {
            // Store tokens in cookies
            storeAuthTokens(session.access_token, session.refresh_token);
            
            setUser(session.user);
            
            // Fetch or create user profile
            let userProfile = await getUserProfile(session.user.id);
            
            if (!userProfile) {
              // Create profile for new users
              userProfile = await createUserProfile(session.user);
            }
            
            if (mounted) {
              setProfile(userProfile);
            }
          } else {
            // Clear tokens on sign out
            clearAuthTokens();
            if (mounted) {
              setUser(null);
              setProfile(null);
            }
          }
        } catch (authError) {
          console.error('Auth state change error:', authError);
          if (mounted) {
            setError('Authentication error occurred. Please try signing in again.');
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, setProfile, setLoading, setError]);

  // Auth action handlers with proper error handling
  const handleSignInWithGitHub = async () => {
    try {
      clearError();
      setLoading(true);
      await signInWithGitHub();
      // Don't set loading to false here - let the auth callback handle it
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub sign-in failed');
      setLoading(false);
      throw err;
    }
  };

  const handleSignInWithEmail = async (email: string, password: string) => {
    try {
      clearError();
      setLoading(true);
      const { user: authUser, profile: userProfile } = await signInWithEmail(email, password);
      setUser(authUser);
      setProfile(userProfile);
      return { user: authUser, profile: userProfile };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email sign-in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      clearError();
      setLoading(true);
      const { user: authUser, profile: userProfile } = await signUpWithEmail(email, password, displayName);
      setUser(authUser);
      setProfile(userProfile);
      return { user: authUser, profile: userProfile };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email sign-up failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      clearError();
      await signOut();
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-out failed');
      throw err;
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    try {
      clearError();
      const updatedProfile = await updateUserProfile(user.id, updates);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile update failed');
      throw err;
    }
  };

  const handleSyncWithGitHub = async (githubUsername: string) => {
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    try {
      clearError();
      const updatedProfile = await syncWithGitHub(user.id, githubUsername);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub sync failed');
      throw err;
    }
  };

  return {
    user,
    profile,
    loading,
    error,
    isAuthenticated: !!user,
    signInWithGitHub: handleSignInWithGitHub,
    signInWithEmail: handleSignInWithEmail,
    signUpWithEmail: handleSignUpWithEmail,
    signOut: handleSignOut,
    updateProfile: handleUpdateProfile,
    syncWithGitHub: handleSyncWithGitHub,
    clearError,
  };
}

/**
 * Hook to require authentication
 */
export function useRequireAuth() {
  const { user, loading, error } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    if (!loading) {
      setIsAuthenticated(!!user);
    }
  }, [user, loading]);

  return {
    isAuthenticated,
    loading,
    error,
    user,
  };
}
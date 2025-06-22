/**
 * Enhanced Authentication Service - FINAL VERSION
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
 * Sign in with GitHub OAuth - fastest path
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
 * Sign in with email and password - fallback
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

  // Fetch user profile in one combined query
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
 * Get current user session with combined profile query
 */
export async function getCurrentUserWithProfile(): Promise<{ user: User; profile: UserProfile } | null> {
  if (!isSupabaseAvailable()) {
    console.log('Supabase not available, returning null');
    return null;
  }

  try {
    // Get session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    console.log('getCurrentUserWithProfile - session:', !!session, 'error:', error);
    
    if (error || !session?.user) {
      // Try to restore from cookies
      const { accessToken, refreshToken } = getAuthTokens();
      
      console.log('No session, trying cookies - tokens available:', !!accessToken, !!refreshToken);
      
      if (accessToken && refreshToken) {
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          console.log('Cookie restore result:', !!data.user, 'error:', sessionError);
          if (sessionError || !data.user) {
            clearAuthTokens();
            return null;
          }

          // Get profile for restored session
          const profile = await getUserProfile(data.user.id);
          console.log('Profile fetched for restored session:', !!profile);
          
          if (!profile) {
            const newProfile = await createUserProfile(data.user);
            console.log('Created new profile for restored session');
            return { user: data.user, profile: newProfile };
          }

          return { user: data.user, profile };
        } catch (error) {
          console.error('Cookie restore failed:', error);
          clearAuthTokens();
          return null;
        }
      }
      
      return null;
    }

    // Get profile for current session
    const profile = await getUserProfile(session.user.id);
    console.log('Profile fetched for current session:', !!profile);
    
    if (!profile) {
      const newProfile = await createUserProfile(session.user);
      console.log('Created new profile for current session');
      return { user: session.user, profile: newProfile };
    }

    return { user: session.user, profile };
  } catch (error) {
    console.error('getCurrentUserWithProfile error:', error);
    return null;
  }
}

/**
 * Get current user session
 */
export async function getCurrentUser(): Promise<User | null> {
  const result = await getCurrentUserWithProfile();
  return result?.user || null;
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseAvailable()) {
    return null;
  }

  try {
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
  } catch (error) {
    console.error('getUserProfile error:', error);
    return null;
  }
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
 * Enhanced auth hook with proper state management
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
    let subscription: any = null;
    let initialized = false;

    const initializeAuth = async () => {
      if (initialized) return;
      initialized = true;
      
      console.log('Initializing auth...');
      
      try {
        setLoading(true);
        
        // Check if Supabase is available
        if (!isSupabaseAvailable()) {
          console.error('Supabase not available');
          setError('Authentication service is not configured properly.');
          setLoading(false);
          return;
        }

        // Get initial session with profile in one call
        const result = await getCurrentUserWithProfile();
        
        if (!mounted) return;

        if (result) {
          console.log('Auth initialized with user:', result.user.id);
          setUser(result.user);
          setProfile(result.profile);
        } else {
          console.log('Auth initialized - no user');
          setUser(null);
          setProfile(null);
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

    // Set up auth state listener
    const setupAuthListener = () => {
      if (!isSupabaseAvailable()) return;

      const { data } = supabase.auth.onAuthStateChange(
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
                setLoading(false);
              }
            } else {
              // Clear tokens on sign out
              clearAuthTokens();
              if (mounted) {
                setUser(null);
                setProfile(null);
                setLoading(false);
              }
            }
          } catch (authError) {
            console.error('Auth state change error:', authError);
            if (mounted) {
              setError('Authentication error occurred. Please try signing in again.');
              setLoading(false);
            }
          }
        }
      );
      subscription = data.subscription;
    };

    // Set up listener first, then initialize
    setupAuthListener();
    initializeAuth();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []); // Remove dependencies to prevent re-initialization

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
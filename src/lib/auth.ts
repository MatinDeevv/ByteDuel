/**
 * Authentication Service - Handle GitHub OAuth and email/password auth with secure cookie storage
 */
import React from 'react';
import Cookies from 'js-cookie';
import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';

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
  secure: true,
  sameSite: 'strict' as const,
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
export function parseAuthFragment(): { accessToken: string | null; refreshToken: string | null } {
  const fragment = window.location.hash.substring(1);
  const params = new URLSearchParams(fragment);
  
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
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
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Email sign-in failed: ${error.message}`);
  }

  // Store tokens in cookies
  if (data.session) {
    storeAuthTokens(data.session.access_token, data.session.refresh_token);
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string, 
  password: string, 
  displayName: string
): Promise<void> {
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

  // Store tokens in cookies if session exists
  if (data.session) {
    storeAuthTokens(data.session.access_token, data.session.refresh_token);
  }

  // Create user profile
  if (data.user) {
    await createUserProfile(data.user, { display_name: displayName });
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  clearAuthTokens();
  
  if (error) {
    throw new Error(`Sign-out failed: ${error.message}`);
  }
}

/**
 * Get current user session
 */
export async function getCurrentUser(): Promise<User | null> {
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
 * Check if user is authenticated
 */
export function useAuth() {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Get initial session
    getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        getUserProfile(currentUser.id).then(setProfile);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Store tokens in cookies
          storeAuthTokens(session.access_token, session.refresh_token);
          
          const userProfile = await getUserProfile(session.user.id);
          if (!userProfile) {
            // Create profile for new users
            const newProfile = await createUserProfile(session.user);
            setProfile(newProfile);
          } else {
            setProfile(userProfile);
          }
        } else {
          // Clear tokens on sign out
          clearAuthTokens();
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    profile,
    loading,
    signInWithGitHub,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateProfile: (updates: Partial<UserProfile>) => 
      user ? updateUserProfile(user.id, updates) : Promise.reject('Not authenticated'),
    syncWithGitHub: (githubUsername: string) =>
      user ? syncWithGitHub(user.id, githubUsername) : Promise.reject('Not authenticated'),
  };
}

/**
 * Hook to require authentication
 */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    if (!loading) {
      setIsAuthenticated(!!user);
    }
  }, [user, loading]);

  return {
    isAuthenticated,
    loading,
    user,
  };
}
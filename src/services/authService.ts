/**
 * Authentication Service - Optimized for Supabase Auth
 * Handles GitHub OAuth, email/password auth, and profile management
 */
import { supabase, type Profile } from '../lib/supabaseClient';
import { User, AuthError } from '@supabase/supabase-js';

export interface AuthResult {
  user: User;
  profile: Profile;
}

export interface GitHubProfile {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

/**
 * Sign in with GitHub OAuth - Primary authentication method
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
    throw new AuthError(error.message);
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new AuthError(error.message);
  }

  if (!data.user) {
    throw new AuthError('No user returned from authentication');
  }

  // Get or create profile
  const profile = await getOrCreateProfile(data.user);
  
  return { user: data.user, profile };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResult> {
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
    throw new AuthError(error.message);
  }

  if (!data.user) {
    throw new AuthError('No user returned from sign up');
  }

  // Create profile
  const profile = await createProfile(data.user, { display_name: displayName });
  
  return { user: data.user, profile };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new AuthError(error.message);
  }
}

/**
 * Get current user session
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get current user with profile in single query
 */
export async function getCurrentUserWithProfile(): Promise<AuthResult | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const profile = await getOrCreateProfile(user);
  return { user, profile };
}

/**
 * Get user profile by auth user ID
 */
export async function getUserProfile(authUserId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Get or create profile for user
 */
export async function getOrCreateProfile(user: User): Promise<Profile> {
  let profile = await getUserProfile(user.id);
  
  if (!profile) {
    profile = await createProfile(user);
  }

  return profile;
}

/**
 * Create user profile
 */
export async function createProfile(
  user: User,
  additionalData: Partial<Profile> = {}
): Promise<Profile> {
  const githubData = user.user_metadata;
  
  const profileData = {
    auth_user_id: user.id,
    email: user.email,
    display_name: additionalData.display_name || 
                  githubData?.full_name || 
                  githubData?.name || 
                  githubData?.user_name || 
                  'Anonymous User',
    github_username: githubData?.user_name,
    github_id: githubData?.provider_id,
    avatar_url: githubData?.avatar_url,
    bio: githubData?.bio,
    skill_level: additionalData.skill_level || 'beginner',
    preferred_languages: additionalData.preferred_languages || ['javascript'],
    ...additionalData,
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(profileData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Update user profile
 */
export async function updateProfile(
  profileId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    throw error;
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
 * Sync profile with GitHub data
 */
export async function syncWithGitHub(profileId: string, githubUsername: string): Promise<Profile> {
  const githubProfile = await fetchGitHubProfile(githubUsername);
  
  if (!githubProfile) {
    throw new Error('GitHub profile not found');
  }

  const updates: Partial<Profile> = {
    github_username: githubProfile.login,
    github_id: githubProfile.id.toString(),
    display_name: githubProfile.name || githubProfile.login,
    avatar_url: githubProfile.avatar_url,
    bio: githubProfile.bio,
  };

  return updateProfile(profileId, updates);
}

/**
 * Delete user account and all associated data
 */
export async function deleteAccount(profileId: string): Promise<void> {
  // Delete profile (cascades to other tables)
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId);

  if (error) {
    throw error;
  }

  // Sign out user
  await signOut();
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('github_username', username)
    .single();

  if (error && error.code === 'PGRST116') {
    // No profile found with this username
    return true;
  }

  return !data;
}

/**
 * Search profiles by display name or username
 */
export async function searchProfiles(query: string, limit = 10): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`display_name.ilike.%${query}%,github_username.ilike.%${query}%`)
    .eq('is_active', true)
    .order('elo_rating', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}
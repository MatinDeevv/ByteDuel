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
    console.log('No user found in getCurrentUserWithProfile');
    return null;
  }

  console.log('Getting profile for user:', user.id);
  const profile = await getOrCreateProfile(user);
  console.log('Profile result:', !!profile);
  return { user, profile };
}

/**
 * Get user profile by auth user ID
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
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
  // First try to get existing profile by auth_user_id
  console.log('Looking for existing profile for user:', user.id);
  const { data: existingProfile, error: getError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (!getError && existingProfile) {
    console.log('Found existing profile:', existingProfile.display_name);
    return existingProfile;
  }

  console.log('No existing profile found, creating new one...');
  // If no profile exists, create one
  return await createProfile(user);
}

/**
 * Create user profile
 */
export async function createProfile(
  user: User,
  additionalData: Partial<Profile> = {}
): Promise<Profile> {
  const githubData = user.user_metadata || {};
  console.log('Creating profile with GitHub data:', githubData);
  
  const profileData = {
    id: user.id, // Use auth user ID as primary key
    display_name: additionalData.display_name || 
                  githubData?.full_name || 
                  githubData?.name || 
                  githubData?.user_name || 
                  user.email?.split('@')[0] ||
                  'User',
    github_username: githubData?.user_name,
    skill_level: 'beginner',
    elo_rating: 1200,
    rating: 1200,
    games_played: 0,
    games_won: 0,
    ...additionalData,
  };

  console.log('Inserting profile data:', profileData);

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

/**
 * Update user profile
 */
export async function updateProfile(
  profileId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
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
    .from('users')
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
    .from('users')
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
    .from('users')
    .select('*')
    .or(`display_name.ilike.%${query}%,github_username.ilike.%${query}%`)
    .order('rating', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}
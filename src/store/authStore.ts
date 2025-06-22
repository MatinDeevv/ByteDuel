import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';
import { UserProfile } from '../lib/auth';

interface AuthState {
  // Auth state
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  
  // UI state
  showAuthModal: boolean;
  authModalMode: 'signin' | 'signup';
  
  // Actions
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setShowAuthModal: (show: boolean, mode?: 'signin' | 'signup') => void;
  clearError: () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    profile: null,
    loading: true, // Start with true, will be set to false after auth check
    error: null,
    showAuthModal: false,
    authModalMode: 'signin',

    // Actions
    setUser: (user) => {
      console.log('AuthStore: setUser', user?.id || 'null');
      set({ user });
    },
    
    setProfile: (profile) => {
      console.log('AuthStore: setProfile', profile?.display_name || 'null');
      set({ profile });
    },
    
    setLoading: (loading) => {
      console.log('AuthStore: setLoading', loading);
      set({ loading });
    },
    
    setError: (error) => {
      console.log('AuthStore: setError', error);
      set({ error });
    },
    
    setShowAuthModal: (show, mode = 'signin') => set({ 
      showAuthModal: show, 
      authModalMode: mode,
      error: null // Clear error when opening modal
    }),
    
    clearError: () => set({ error: null }),
    
    reset: () => {
      console.log('AuthStore: reset');
      set({ 
        user: null, 
        profile: null, 
        loading: false,
        error: null,
        showAuthModal: false 
      });
    },
  }))
);
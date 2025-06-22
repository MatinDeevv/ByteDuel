import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

interface AuthState {
  showAuthModal: boolean;
  authMode: 'signin' | 'signup';
}

interface AuthActions {
  setShowAuthModal: (show: boolean, mode?: 'signin' | 'signup') => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  // State
  showAuthModal: false,
  authMode: 'signin',

  // Actions
  setShowAuthModal: (show: boolean, mode: 'signin' | 'signup' = 'signin') => {
    set({ 
      showAuthModal: show,
      authMode: mode,
    });
  },
}));
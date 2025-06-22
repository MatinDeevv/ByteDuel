import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Mail, X, User, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedButton from './AnimatedButton';
import { useAuth } from '../lib/auth';
import { useAuthStore } from '../store/authStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
  redirectTo?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultMode = 'signin',
  redirectTo = '/'
}) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);

  const { 
    signInWithGitHub, 
    signInWithEmail, 
    signUpWithEmail, 
    loading: globalLoading,
    error: globalError,
    clearError 
  } = useAuth();

  const { setShowAuthModal } = useAuthStore();

  const loading = localLoading || globalLoading;
  const error = localError || globalError;

  const handleGitHubSignIn = async () => {
    setLocalLoading(true);
    setLocalError('');
    try {
      await signInWithGitHub();
      // Don't close modal here - let the auth callback handle the redirect
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'GitHub sign-in failed');
      setLocalLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalLoading(true);
    setLocalError('');

    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      
      setSuccess(true);
      
      // Close modal and navigate after brief success message
      setTimeout(() => {
        onClose();
        setShowAuthModal(false);
        navigate(redirectTo);
      }, 1500);
      
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLocalLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setLocalError('');
    setSuccess(false);
    setShowPassword(false);
    clearError();
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {success ? 'Welcome!' : mode === 'signin' ? 'Welcome Back' : 'Join ByteDuel'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Success State */}
          {success && (
            <motion.div
              className="text-center py-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <motion.div
                className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {mode === 'signin' ? 'Signed in successfully!' : 'Account created successfully!'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Redirecting you to the dashboard...
              </p>
            </motion.div>
          )}

          {/* Auth Form */}
          {!success && (
            <>
              {/* Error Message */}
              {error && (
                <motion.div
                  className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg flex items-start space-x-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              {/* GitHub Sign In */}
              <AnimatedButton
                onClick={handleGitHubSignIn}
                disabled={loading}
                variant="outline"
                className="w-full mb-4 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                loading={loading && !localLoading}
              >
                <Github className="h-5 w-5 mr-2" />
                Continue with GitHub
              </AnimatedButton>

              {/* Divider */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or</span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Display Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Your display name"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="your@email.com"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <AnimatedButton
                  type="submit"
                  disabled={loading}
                  variant="primary"
                  className="w-full"
                  loading={localLoading}
                >
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </AnimatedButton>
              </form>

              {/* Switch Mode */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                  <button
                    onClick={switchMode}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
                    disabled={loading}
                  >
                    {mode === 'signin' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>

              {/* GitHub Integration Note */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 Sign in with GitHub to automatically sync your profile, avatar, and coding stats!
                </p>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthModal;
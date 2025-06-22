import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Github, Mail, Lock, Eye, EyeOff, User, Zap, AlertCircle, ArrowLeft } from 'lucide-react';
import AnimatedButton from '../components/AnimatedButton';
import { useAuth } from '../lib/auth';
import { toast } from '../store/toastStore';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    loading: authLoading, 
    signInWithGitHub, 
    signUpWithEmail, 
    error: authError,
    clearError 
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMethod, setAuthMethod] = useState<'github' | 'email' | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  // Clear errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Handle GitHub OAuth
  const handleGitHubSignIn = async () => {
    setAuthMethod('github');
    setIsSubmitting(true);
    clearError();

    try {
      await signInWithGitHub();
      toast.success('Redirecting to GitHub...', 'You will be redirected back after authentication');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GitHub sign-in failed';
      toast.error('GitHub Sign-in Failed', message);
      setIsSubmitting(false);
      setAuthMethod(null);
    }
  };

  // Handle email/password signup
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMethod('email');
    setIsSubmitting(true);
    clearError();

    try {
      await signUpWithEmail(email, password, displayName);
      toast.success('Account created!', 'Welcome to ByteDuel! Redirecting to dashboard...');
      
      // Navigate to dashboard after successful signup
      setTimeout(() => {
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Account creation failed';
      toast.error('Sign-up Failed', message);
      setIsSubmitting(false);
      setAuthMethod(null);
    }
  };

  const isLoading = authLoading || isSubmitting;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="flex items-center justify-center space-x-2 mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Zap className="h-10 w-10 text-purple-500" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ByteDuel</h1>
          </motion.div>
          <p className="text-gray-600 dark:text-gray-400">
            Join the coding competition platform
          </p>
        </div>

        {/* Auth Card */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Back Button */}
          <div className="mb-6">
            <AnimatedButton
              onClick={() => navigate('/login')}
              variant="outline"
              size="sm"
              className="text-gray-600 dark:text-gray-400"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </AnimatedButton>
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {authError && (
              <motion.div
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Sign-up Failed
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {authError}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* GitHub Sign-up (Primary) */}
          <AnimatedButton
            onClick={handleGitHubSignIn}
            disabled={isLoading}
            variant="primary"
            className="w-full mb-6 py-3 text-base font-semibold"
            loading={isSubmitting && authMethod === 'github'}
          >
            <Github className="h-5 w-5 mr-3" />
            Sign up with GitHub
          </AnimatedButton>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                or create account with email
              </span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="Your display name"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Must be at least 6 characters long
              </p>
            </div>

            <AnimatedButton
              type="submit"
              disabled={isLoading || !email || !password || !displayName}
              variant="primary"
              className="w-full py-3 text-base font-semibold"
              loading={isSubmitting && authMethod === 'email'}
            >
              Create Account
            </AnimatedButton>
          </form>

          {/* Terms */}
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
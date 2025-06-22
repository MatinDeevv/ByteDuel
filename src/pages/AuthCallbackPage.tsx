import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { parseAuthFragment, clearUrlFragment, storeAuthTokens } from '../lib/auth';
import { supabase, isSupabaseAvailable } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = React.useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = React.useState<string>('');
  const { setLoading, setError: setGlobalError } = useAuthStore();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);

        if (!isSupabaseAvailable()) {
          throw new Error('Authentication service is not available');
        }

        // Parse tokens from URL fragment
        const { accessToken, refreshToken, error: authError } = parseAuthFragment();
        
        if (authError) {
          throw new Error(authError);
        }
        
        if (accessToken && refreshToken) {
          // Store tokens in secure cookies
          storeAuthTokens(accessToken, refreshToken);
          
          // Set session in Supabase
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            throw error;
          }

          if (!data.user) {
            throw new Error('No user data received from authentication');
          }

          // Clear URL fragment
          clearUrlFragment();
          
          setStatus('success');
          
          // Redirect to home after a brief success message
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
        } else {
          throw new Error('No authentication tokens received');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        setGlobalError(errorMessage);
        setStatus('error');
        
        // Clear any fragments and redirect to home after error
        clearUrlFragment();
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, setLoading, setGlobalError]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center border border-gray-200 dark:border-gray-700"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {status === 'processing' && (
          <>
            <motion.div
              className="w-16 h-16 mx-auto mb-4 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader className="h-8 w-8 text-blue-500" />
              </motion.div>
            </motion.div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Completing Sign In...
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we set up your account and sync your profile.
            </p>
            <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, ease: 'easeInOut' }}
              />
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </motion.div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome to ByteDuel!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You've been successfully signed in and your profile has been synced.
            </p>
            <motion.div
              className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                className="w-2 h-2 bg-blue-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span>Redirecting to home...</span>
            </motion.div>
          </>
        )}

        {status === 'error' && (
          <>
            <motion.div
              className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </motion.div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Authentication Failed
            </h1>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-red-700 dark:text-red-400 text-sm">
                {error}
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Please try signing in again. If the problem persists, contact support.
            </p>
            <motion.div
              className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span>Redirecting to home page...</span>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default AuthCallbackPage;
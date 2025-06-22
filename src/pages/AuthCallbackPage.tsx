import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { parseAuthFragment, clearUrlFragment, storeAuthTokens } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = React.useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = React.useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Parse tokens from URL fragment
        const { accessToken, refreshToken } = parseAuthFragment();
        
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

          // Clear URL fragment
          clearUrlFragment();
          
          setStatus('success');
          
          // Redirect to home after a brief success message
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 2000);
        } else {
          // Check if there's an error in the URL
          const fragment = window.location.hash.substring(1);
          const params = new URLSearchParams(fragment);
          const errorDescription = params.get('error_description') || 'Authentication failed';
          
          throw new Error(errorDescription);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
        
        // Clear any fragments and redirect to home after error
        clearUrlFragment();
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {status === 'processing' && (
          <>
            <motion.div
              className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Completing Sign In...
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we set up your account.
            </p>
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
            <p className="text-gray-600 dark:text-gray-400">
              You've been successfully signed in. Redirecting to home...
            </p>
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
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to home page...
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default AuthCallbackPage;
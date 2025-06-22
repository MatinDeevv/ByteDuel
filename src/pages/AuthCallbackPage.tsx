import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { getCurrentUserWithProfile } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Starting auth callback handling...');
        
        // Get the current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          navigate('/login', { replace: true });
          return;
        }
        
        if (sessionData.session?.user) {
          console.log('Session found, user:', sessionData.session.user.id);
          
          // Ensure profile exists
          console.log('Creating/getting profile...');
          const authResult = await getCurrentUserWithProfile();
          
          if (authResult?.profile) {
            console.log('Profile ready:', authResult.profile.display_name);
            setIsProcessing(false);
            navigate('/dashboard', { replace: true });
          } else {
            console.error('Failed to create profile');
            navigate('/login', { replace: true });
          }
        } else {
          console.log('No session found');
          setIsProcessing(false);
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setIsProcessing(false);
        navigate('/login', { replace: true });
      }
    };

    // Only run once when component mounts
    handleAuthCallback();
  }, [navigate]);

  // Also listen for user changes from useAuth
  useEffect(() => {
    if (user && !loading && !isProcessing) {
      console.log('User loaded in callback, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, isProcessing, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Zap className="w-8 h-8 text-white" />
        </motion.div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Completing Sign In...
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we set up your account
        </p>
        
        <motion.div
          className="mt-8 w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthCallbackPage;
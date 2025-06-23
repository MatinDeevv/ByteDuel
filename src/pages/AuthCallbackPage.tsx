import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Handle the auth callback
    const handleAuthCallback = async () => {
      try {
        // Wait a moment for auth to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (user) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/', { replace: true });
      }
    };

    handleAuthCallback();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="w-16 h-16 mx-auto mb-6 bg-blue-500 rounded-full flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Zap className="w-8 h-8 text-white" />
        </motion.div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Completing Sign In...
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Please wait while we set up your account
        </p>
        
        <motion.div
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    </div>
  );
};

export default AuthCallbackPage;
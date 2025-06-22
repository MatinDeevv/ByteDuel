import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useAuthStore } from '../store/authStore';
import AuthModal from './AuthModal';
import AnimatedButton from './AnimatedButton';

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  showModal?: boolean;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ 
  children, 
  fallback,
  redirectTo = '/login',
  showModal = false
}) => {
  const { user, loading, error } = useAuth();
  const { showAuthModal, setShowAuthModal } = useAuthStore();
  const location = useLocation();

  console.log('RequireAuth:', { 
    hasUser: !!user, 
    loading, 
    error, 
    pathname: location.pathname 
  });

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </motion.div>
      </div>
    );
  }

  // Show error state if auth service is unavailable
  if (error && !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Service Unavailable
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <AnimatedButton
            onClick={() => window.location.reload()}
            variant="primary"
          >
            Retry
          </AnimatedButton>
        </motion.div>
      </div>
    );
  }

  // If user is authenticated, render children
  if (user) {
    console.log('RequireAuth: User authenticated, rendering children');
    return <>{children}</>;
  }

  // If custom fallback provided, use it
  if (fallback) {
    console.log('RequireAuth: Using custom fallback');
    return <>{fallback}</>;
  }

  // For certain routes, show auth modal instead of redirecting
  const protectedRoutes = ['/duel/', '/practice', '/profile'];
  const isProtectedRoute = protectedRoutes.some(route => location.pathname.startsWith(route));

  if (isProtectedRoute && showModal) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <motion.div
            className="text-center max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Authentication Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please sign in to access this feature and start competing in coding duels.
            </p>
            <div className="space-y-3">
              <AnimatedButton
                onClick={() => setShowAuthModal(true, 'signin')}
                variant="primary"
                className="w-full"
              >
                Sign In to Continue
              </AnimatedButton>
              <AnimatedButton
                onClick={() => setShowAuthModal(true, 'signup')}
                variant="outline"
                className="w-full"
              >
                Create New Account
              </AnimatedButton>
            </div>
            
            {/* Benefits section */}
            <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Why sign up?
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Track your coding progress and ELO rating</li>
                <li>• Compete in ranked matches and tournaments</li>
                <li>• Generate shareable highlight reels</li>
                <li>• Access personalized practice problems</li>
              </ul>
            </div>
          </motion.div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          redirectTo={location.pathname}
        />
      </>
    );
  }

  // Default: redirect to specified route
  console.log('RequireAuth: Redirecting to', redirectTo);
  return <Navigate to={redirectTo} state={{ from: location }} replace />;
};

export default RequireAuth;
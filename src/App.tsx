import React, { useEffect, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useErrorHandler } from './hooks/useErrorHandler';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { handleError } = useErrorHandler();

  // Handle any unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Check if it's a 404 or routing error
      const errorMessage = event.reason?.message || event.reason?.toString() || '';
      if (errorMessage.includes('404') || errorMessage.includes('NOT_FOUND')) {
        event.preventDefault();
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [navigate]);

  // Handle navigation errors
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Global error:', error);
      
      // Check if it's a routing or 404 error
      if (error.message?.includes('404') || error.message?.includes('NOT_FOUND')) {
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-inter transition-colors duration-300">
      <AnimatePresence mode="wait">
        <Suspense fallback={<LoadingFallback />}>
          <Outlet />
        </Suspense>
      </AnimatePresence>
    </div>
  );
}

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <motion.div
      className="flex flex-col items-center space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Zap className="h-8 w-8 text-blue-500" />
      </motion.div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </motion.div>
  </div>
);

export default App;
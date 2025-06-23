import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedButton from './AnimatedButton';
import PageTransition from './PageTransition';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  // Auto-redirect to home after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 flex items-center justify-center p-4">
        <motion.div
          className="text-center max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 404 Animation */}
          <motion.div
            className="mb-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          >
            <div className="text-8xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text mb-4">
              404
            </div>
            <motion.div
              className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"
              initial={{ width: 0 }}
              animate={{ width: 96 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            />
          </motion.div>

          <motion.h1
            className="text-3xl font-bold text-gray-900 dark:text-white mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Page Not Found
          </motion.h1>

          <motion.p
            className="text-gray-600 dark:text-gray-400 mb-8 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            The page you're looking for doesn't exist or has been moved.
            <br />
            <span className="text-sm">Redirecting to home in 5 seconds...</span>
          </motion.p>

          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <AnimatedButton
              onClick={() => navigate('/', { replace: true })}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Home className="h-5 w-5 mr-2" />
              Go to Home
            </AnimatedButton>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <AnimatedButton
                onClick={() => navigate(-1)}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </AnimatedButton>

              <AnimatedButton
                onClick={() => navigate('/lobby')}
                variant="outline"
                size="sm"
              >
                <Search className="h-4 w-4 mr-2" />
                Browse Games
              </AnimatedButton>
            </div>
          </motion.div>

          {/* Progress bar for auto-redirect */}
          <motion.div
            className="mt-8 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <motion.div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-1 rounded-full"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
            />
          </motion.div>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default NotFound;
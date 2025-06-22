import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import { useAuth } from './lib/auth';

function App() {
  const { user, loading } = useAuth();

  // Initialize auth state on app load
  useEffect(() => {
    // Auth initialization is handled in the useAuth hook
    console.log('App initialized, user:', user?.id, 'loading:', loading);
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-inter transition-colors duration-300">
      <AnimatePresence mode="wait">
        <Outlet />
      </AnimatePresence>
    </div>
  );
}

export default App;
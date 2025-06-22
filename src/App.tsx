import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import AuthModal from './components/AuthModal';
import { useAuthStore } from './store/authStore';

function App() {
  const { showAuthModal, setShowAuthModal, authModalMode } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-inter transition-colors duration-300">
      <AnimatePresence mode="wait">
        <Outlet />
      </AnimatePresence>
      
      {/* Global Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
      />
    </div>
  );
}

export default App;
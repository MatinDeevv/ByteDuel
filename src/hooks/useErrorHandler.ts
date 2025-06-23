import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

interface ErrorHandlerOptions {
  redirectToHome?: boolean;
  showAlert?: boolean;
  logError?: boolean;
}

export function useErrorHandler() {
  const navigate = useNavigate();

  const handleError = useCallback((
    error: Error | string,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      redirectToHome = false,
      showAlert = true,
      logError = true,
    } = options;

    const errorMessage = typeof error === 'string' ? error : error.message;
    
    if (logError) {
      console.error('Error handled:', error);
    }

    // Handle specific error types
    if (errorMessage.includes('404') || errorMessage.includes('NOT_FOUND')) {
      navigate('/', { replace: true });
      return;
    }

    if (errorMessage.includes('403') || errorMessage.includes('FORBIDDEN')) {
      if (showAlert) {
        alert('Access denied. Please check your permissions.');
      }
      navigate('/', { replace: true });
      return;
    }

    if (errorMessage.includes('401') || errorMessage.includes('UNAUTHORIZED')) {
      if (showAlert) {
        alert('Please sign in to continue.');
      }
      navigate('/login', { replace: true });
      return;
    }

    // Network errors
    if (errorMessage.includes('NetworkError') || errorMessage.includes('fetch')) {
      if (showAlert) {
        alert('Network error. Please check your connection and try again.');
      }
      if (redirectToHome) {
        navigate('/', { replace: true });
      }
      return;
    }

    // Generic error handling
    if (showAlert) {
      alert(errorMessage || 'An unexpected error occurred.');
    }

    if (redirectToHome) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleAsyncError = useCallback(async (
    asyncFn: () => Promise<any>,
    options: ErrorHandlerOptions = {}
  ) => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error as Error, options);
      throw error; // Re-throw so calling code can handle it too if needed
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
  };
}
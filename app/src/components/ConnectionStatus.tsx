'use client';

import { useEffect, useState } from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  connectionError: string | null;
  onRetry?: () => void;
}

export default function ConnectionStatus({ 
  isConnected, 
  connectionError,
  onRetry 
}: ConnectionStatusProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Auto-retry logic
  useEffect(() => {
    if (!isConnected && connectionError && onRetry) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
      const timer = setTimeout(() => {
        setIsRetrying(true);
        onRetry();
        setRetryCount(prev => prev + 1);
        setTimeout(() => setIsRetrying(false), 1000);
      }, retryDelay);
      
      return () => clearTimeout(timer);
    } else if (isConnected) {
      setRetryCount(0); // Reset retry count on successful connection
    }
  }, [isConnected, connectionError, onRetry, retryCount]);
  
  // Don't show anything if connected
  if (isConnected && !connectionError) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`
        px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm
        ${isConnected ? 'bg-green-600' : 'bg-red-600'}
        text-white transition-all duration-300
      `}>
        {/* Status indicator dot */}
        <div className={`
          w-2 h-2 rounded-full
          ${isConnected ? 'bg-green-300' : 'bg-red-300'}
          ${isRetrying ? 'animate-pulse' : ''}
        `} />
        
        {/* Status text */}
        <span>
          {isRetrying ? 'Reconnecting...' : 
           isConnected ? 'Connected' : 
           'Connection lost'}
        </span>
        
        {/* Manual retry button */}
        {!isConnected && !isRetrying && onRetry && (
          <button
            onClick={() => {
              setIsRetrying(true);
              onRetry();
              setTimeout(() => setIsRetrying(false), 1000);
            }}
            className="ml-2 text-xs underline hover:no-underline"
          >
            Retry
          </button>
        )}
        
        {/* Auto-retry indicator */}
        {!isConnected && !isRetrying && retryCount > 0 && (
          <span className="text-xs opacity-75">
            (retry #{retryCount})
          </span>
        )}
      </div>
    </div>
  );
}

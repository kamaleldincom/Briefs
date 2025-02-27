// src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { initializeServices } from '@/lib/initialize-services';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 30 * 60 * 1000, // 30 minutes
          },
        },
      })
  );

  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeServices();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize services:', error);
        setInitError(error as Error);
      }
    };

    init();
  }, []);

  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <span className="text-red-500">!</span>
        </div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Failed to initialize application</h2>
        <p className="text-sm text-gray-500 text-center mb-4">{initError.message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"/>
        <p className="text-gray-600">Initializing application...</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
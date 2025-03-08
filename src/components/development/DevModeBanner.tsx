"use client";

import { useEffect, useState } from 'react';
import { Database, RefreshCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isDatabaseOnlyMode, DEV_CONFIG } from '@/lib/config/development';

/**
 * Development-only banner that indicates the current mode
 * Appears only in development builds
 */
export function DevModeBanner() {
  const [isDatabaseOnly, setIsDatabaseOnly] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    // Only show in development mode
    if (process.env.NODE_ENV === 'development') {
      setIsDatabaseOnly(isDatabaseOnlyMode());
      setShowBanner(true);
    }
  }, []);
  
  if (!showBanner) return null;
  
  const toggleMode = () => {
    // This doesn't actually toggle the env var, just shows how you would do it
    alert('To toggle Database-Only mode, modify your .env.local file:\nNEXT_PUBLIC_DATABASE_ONLY=true/false\n\nThen restart the development server.');
  };
  
  return (
    <div className={`fixed bottom-4 right-4 z-50 p-3 rounded-lg shadow-lg flex items-center gap-3 ${
      isDatabaseOnly 
        ? 'bg-indigo-700 text-white' 
        : 'bg-green-700 text-white'
    }`}>
      <div className="flex items-center gap-2">
        {isDatabaseOnly ? (
          <Database className="h-5 w-5" />
        ) : (
          <RefreshCcw className="h-5 w-5" />
        )}
        <span className="font-medium">
          {isDatabaseOnly 
            ? 'Database-Only Mode' 
            : 'API Active Mode'}
        </span>
      </div>
      
      <Button
        size="sm"
        variant={isDatabaseOnly ? "outline" : "default"}
        className={isDatabaseOnly 
          ? "bg-indigo-800 hover:bg-indigo-900 text-white border-indigo-500"
          : "bg-green-800 hover:bg-green-900 text-white"}
        onClick={toggleMode}
      >
        How to Toggle
      </Button>
    </div>
  );
}
// src/components/shared/DatabaseModeBadge.tsx
"use client";

import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import { isDatabaseOnlyMode } from '@/lib/config/development';

/**
 * A small, subtle indicator that appears when the application is in database-only mode
 */
export function DatabaseModeBadge() {
  const [showBadge, setShowBadge] = useState(false);
  
  useEffect(() => {
    // Check if we're in database-only mode
    setShowBadge(isDatabaseOnlyMode());
  }, []);
  
  if (!showBadge) return null;
  
  return (
    <div 
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 py-1 px-3 rounded-full bg-blue-100 border border-blue-300 text-blue-700 shadow-sm text-xs font-medium hover:bg-blue-200 transition-colors"
      title="Database-Only Mode Active - NewsAPI calls are disabled"
    >
      <Database className="h-3.5 w-3.5" />
      <span>DB Mode</span>
    </div>
  );
}
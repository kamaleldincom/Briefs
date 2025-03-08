// src/components/shared/DatabaseModeNotifier.tsx
"use client";

import { useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { isDatabaseOnlyMode } from '@/lib/config/development';

/**
 * Component that shows a one-time toast notification when in database-only mode
 * This is designed to be added to the layout, not requiring any UI
 */
export function DatabaseModeNotifier() {
  const { toast } = useToast();
  
  useEffect(() => {
    // Only show once on initial load
    if (isDatabaseOnlyMode()) {
      // Short delay to ensure toast system is ready
      const timer = setTimeout(() => {
        toast({
          title: "Database-Only Mode Active",
          description: "NewsAPI calls are disabled. All content is from the local database.",
          duration: 5000,
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  // This component doesn't render anything
  return null;
}

// src/components/shared/PullToRefreshIndicator.tsx
import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  pullProgress: number;
  isRefreshing: boolean;
}

export function PullToRefreshIndicator({ 
  isPulling, 
  pullProgress, 
  isRefreshing 
}: PullToRefreshIndicatorProps) {
  if (!isPulling && !isRefreshing) return null;
  
  // Calculate styles based on pull progress
  const translateY = isPulling ? Math.min(pullProgress * 50, 50) : 0;
  const opacity = isPulling ? Math.min(pullProgress * 1.5, 1) : 1;
  const scale = isPulling ? 0.8 + (pullProgress * 0.2) : 1;
  const rotation = isPulling ? pullProgress * 360 : 0;
  
  return (
    <div 
      className="absolute left-0 right-0 flex justify-center z-10 pointer-events-none"
      style={{
        top: `${translateY}px`,
        opacity,
        transition: !isPulling ? 'all 0.2s ease-out' : 'none'
      }}
    >
      <div 
        className="bg-background/80 backdrop-blur-sm text-foreground rounded-full shadow-md px-4 py-2 flex items-center gap-2"
        style={{
          transform: `scale(${scale})`,
        }}
      >
        {isRefreshing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw 
            className="h-4 w-4" 
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isPulling ? 'none' : 'all 0.2s ease-out'
            }}
          />
        )}
        <span className="text-xs font-medium">
          {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  );
}
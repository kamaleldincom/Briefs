// src/hooks/usePullToRefresh.ts
import { useState, useEffect, useRef } from 'react';

interface PullToRefreshConfig {
  onRefresh: () => Promise<void>;
  pullDistance?: number;
  containerRef?: React.RefObject<HTMLElement>;
  disabled?: boolean;
}

/**
 * Hook to add pull-to-refresh functionality to a scrollable container
 */
export function usePullToRefresh({
  onRefresh,
  pullDistance = 100,
  containerRef: externalContainerRef,
  disabled = false
}: PullToRefreshConfig) {
  const internalContainerRef = useRef<HTMLElement | null>(null);
  const containerRef = externalContainerRef || internalContainerRef;
  
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isTouchActiveRef = useRef(false);

  useEffect(() => {
    if (disabled || !containerRef.current) return;

    const container = containerRef.current;
    
    const handleTouchStart = (e: TouchEvent) => {
      // Only activate pull to refresh when at the top of the container
      if (container.scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY;
        currentYRef.current = startYRef.current;
        isTouchActiveRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchActiveRef.current) return;
      
      currentYRef.current = e.touches[0].clientY;
      const pullLength = currentYRef.current - startYRef.current;
      
      // Only handle pull down (positive pullLength)
      if (pullLength > 0 && container.scrollTop <= 0) {
        // Calculate progress as a percentage of the pull distance
        const progress = Math.min(pullLength / pullDistance, 1);
        setPullProgress(progress);
        setIsPulling(true);
        
        // Prevent default scrolling behavior
        e.preventDefault();
      } else {
        setPullProgress(0);
        setIsPulling(false);
      }
    };

    const handleTouchEnd = async () => {
      if (!isTouchActiveRef.current) return;
      
      const pullLength = currentYRef.current - startYRef.current;
      isTouchActiveRef.current = false;
      
      // If pulled far enough, trigger refresh
      if (pullLength >= pullDistance && !isRefreshing) {
        setIsRefreshing(true);
        setPullProgress(0);
        setIsPulling(false);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
        }
      } else {
        setPullProgress(0);
        setIsPulling(false);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef, pullDistance, onRefresh, disabled, isRefreshing]);

  return {
    containerRef: internalContainerRef,
    isPulling,
    pullProgress,
    isRefreshing
  };
}
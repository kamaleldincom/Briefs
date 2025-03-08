// src/hooks/useScrollRestoration.ts
import { useEffect, useRef } from 'react';

interface ScrollRestorationOptions {
  /**
   * Key used to store the scroll position in localStorage
   */
  storageKey: string;
  
  /**
   * Whether to save scroll position when component unmounts
   */
  saveOnUnmount?: boolean;
  
  /**
   * Whether to restore scroll position when component mounts
   */
  restoreOnMount?: boolean;
  
  /**
   * Element to track scroll position of (defaults to window)
   */
  element?: React.RefObject<HTMLElement>;
  
  /**
   * Whether to use smooth scrolling when restoring position
   */
  smooth?: boolean;
  
  /**
   * Custom scroll behavior
   */
  behavior?: ScrollBehavior;
  
  /**
   * Debounce time for saving scroll position (ms)
   */
  debounceTime?: number;
}

/**
 * Hook for automatically saving and restoring scroll position
 */
export function useScrollRestoration({
  storageKey,
  saveOnUnmount = true,
  restoreOnMount = true,
  element,
  smooth = false,
  behavior,
  debounceTime = 200
}: ScrollRestorationOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialRestorationDoneRef = useRef(false);
  
  const getScrollPosition = (): number => {
    if (element?.current) {
      return element.current.scrollTop;
    }
    return window.scrollY || document.documentElement.scrollTop;
  };
  
  const setScrollPosition = (position: number) => {
    if (element?.current) {
      element.current.scrollTo({
        top: position,
        behavior: behavior || (smooth ? 'smooth' : 'auto')
      });
    } else {
      window.scrollTo({
        top: position,
        behavior: behavior || (smooth ? 'smooth' : 'auto')
      });
    }
  };
  
  const saveScrollPosition = () => {
    const currentPosition = getScrollPosition();
    try {
      localStorage.setItem(storageKey, String(currentPosition));
    } catch (error) {
      console.error('Error saving scroll position:', error);
    }
  };
  
  const restoreScrollPosition = () => {
    try {
      const savedPosition = localStorage.getItem(storageKey);
      if (savedPosition !== null) {
        const position = parseInt(savedPosition, 10);
        setScrollPosition(position);
        return true;
      }
    } catch (error) {
      console.error('Error restoring scroll position:', error);
    }
    return false;
  };
  
  // Function to handle scroll events with debouncing
  const handleScroll = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      saveScrollPosition();
    }, debounceTime);
  };
  
  // Restore scroll position on mount
  useEffect(() => {
    if (restoreOnMount && !initialRestorationDoneRef.current) {
      initialRestorationDoneRef.current = true;
      restoreScrollPosition();
    }
    
    // Set up scroll event listener
    const targetElement = element?.current || window;
    targetElement.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      // Clean up event listener
      targetElement.removeEventListener('scroll', handleScroll);
      
      // Clear any pending debounce
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Save scroll position on unmount
      if (saveOnUnmount) {
        saveScrollPosition();
      }
    };
  }, [element, restoreOnMount, saveOnUnmount]);
  
  // Return functions to manually save/restore scroll position
  return {
    saveScrollPosition,
    restoreScrollPosition,
    getScrollPosition,
    setScrollPosition
  };
}
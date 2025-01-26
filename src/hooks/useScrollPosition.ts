// src/hooks/useScrollPosition.ts
import { useState, useEffect } from 'react';

export function useScrollPosition() {
  // Initialize with saved scroll position or 0
  const [scrollPosition, setScrollPosition] = useState(0);

  // Load saved scroll position when component mounts
  useEffect(() => {
    const savedPosition = localStorage.getItem('newsScrollPosition');
    if (savedPosition) {
      const position = parseInt(savedPosition, 10);
      setScrollPosition(position);
      // Restore the scroll position
      window.scrollTo(0, position);
    }
  }, []);

  // Save scroll position before component unmounts
  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY;
      setScrollPosition(position);
      localStorage.setItem('newsScrollPosition', position.toString());
    };

    // Throttle scroll event to improve performance
    let timeoutId: NodeJS.Timeout;
    const throttledHandleScroll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', throttledHandleScroll);
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return scrollPosition;
}
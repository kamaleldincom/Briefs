// src/context/ScrollRestorationContext.tsx
"use client";

import { createContext, useContext, useEffect, useState } from 'react';

interface ScrollRestorationContextType {
  scrollPosition: number;
  setScrollPosition: (position: number) => void;
}

const ScrollRestorationContext = createContext<ScrollRestorationContextType>({
  scrollPosition: 0,
  setScrollPosition: () => {},
});

export function ScrollRestorationProvider({ children }: { children: React.ReactNode }) {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    // Load saved position when the app starts
    const savedPosition = localStorage.getItem('newsScrollPosition');
    if (savedPosition) {
      setScrollPosition(parseInt(savedPosition, 10));
    }
  }, []);

  return (
    <ScrollRestorationContext.Provider value={{ scrollPosition, setScrollPosition }}>
      {children}
    </ScrollRestorationContext.Provider>
  );
}

export function useScrollRestoration() {
  const context = useContext(ScrollRestorationContext);
  if (!context) {
    throw new Error('useScrollRestoration must be used within a ScrollRestorationProvider');
  }
  return context;
}
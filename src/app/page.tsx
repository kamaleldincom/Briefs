// src/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import NewsFeed from "@/components/feed/NewsFeed";
import Header from "@/components/navigation/Header";
import { Story } from "@/lib/types";

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStories() {
      try {
        setLoading(true);
        const res = await fetch('/api/news');
        
        if (!res.ok) {
          throw new Error('Failed to fetch stories');
        }
        
        const data = await res.json();
        setStories(data);
        setError(null);
      } catch (error) {
        console.error('Error loading stories:', error);
        setError('Failed to load stories. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    loadStories();

    // Refresh stories periodically
    const interval = setInterval(loadStories, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {loading && stories.length === 0 ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
            <div className="text-center">
              <h2 className="text-xl font-semibold">Loading stories...</h2>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600">{error}</h2>
            </div>
          </div>
        ) : (
          <NewsFeed initialStories={stories} />
        )}
      </main>
    </div>
  );
}
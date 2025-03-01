// src/app/page.tsx
"use client";

import { useState, useEffect } from 'react';
import NewsFeed from "@/components/feed/NewsFeed";
import Header from "@/components/navigation/Header";
import { Story } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load initial stories
    loadStories();
    
    // Refresh stories every 5 minutes
    const interval = setInterval(() => {
      loadStories(true);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadStories(silent: boolean = false) {
    try {
      if (!silent) setLoading(true);
      
      // Include refresh parameter to force NewsAPI fetch if silent is false
      const params = new URLSearchParams({
        page: '1',
        pageSize: '12',
      });
      
      if (!silent) params.append('refresh', 'true');
      
      const res = await fetch(`/api/news?${params}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch stories: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log("API Response:", data); // Debug log
      
      // Handle both formats: direct array or {stories: [...]} object
      const fetchedStories = Array.isArray(data) ? data : data.stories || [];
      
      if (silent) {
        // In silent mode, check if we have new stories
        const newStoryIds = new Set(fetchedStories.map((s: Story) => s.id));
        const oldStoryIds = new Set(stories.map(s => s.id));
        
        const hasNewStories = fetchedStories.some((s: Story) => !oldStoryIds.has(s.id));
        
        if (hasNewStories && fetchedStories.length > 0) {
          setStories(fetchedStories);
          toast({
            title: "New stories available",
            description: "The feed has been updated with new stories",
            duration: 3000,
          });
        }
      } else {
        // In non-silent mode, always update
        if (fetchedStories.length > 0) {
          setStories(fetchedStories);
        } else {
          console.warn("No stories in API response");
        }
      }
      
      setError(null);
    } catch (error) {
      console.error('Error loading stories:', error);
      if (!silent) {
        setError(`Failed to load stories: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {loading && stories.length === 0 ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold">Loading stories...</h2>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600">{error}</h2>
              <button 
                onClick={() => loadStories()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <NewsFeed initialStories={stories} />
        )}
      </main>
    </div>
  );
}
// src/app/page.tsx (partial update)
"use client";

import { useState, useEffect } from 'react';
import NewsFeed from "@/components/feed/NewsFeed";
import Header from "@/components/navigation/Header";
import { Story } from "@/lib/types";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import StoryCardSkeleton from "@/components/feed/StoryCardSkeleton";
import { DatabaseModeBadge } from "@/components/shared/DatabaseModeBadge";
import { isDatabaseOnlyMode } from '@/lib/config/development';

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load initial stories
    loadStories();
    
    // Only set up periodic checks if NOT in database-only mode
    if (!isDatabaseOnlyMode()) {
      // Periodic background checks for new stories
      const checkForNewStories = async () => {
        try {
          const response = await fetch('/api/news?page=1&pageSize=1');
          if (response.ok) {
            const data = await response.json();
            if (data.stories && data.stories.length > 0) {
              // Check if newest story is different than what we have
              if (stories.length > 0 && data.stories[0].id !== stories[0].id) {
                toast({
                  title: "New stories available",
                  description: "Pull down to refresh and see latest news",
                  duration: 5000,
                });
              }
            }
          }
        } catch (error) {
          console.error('Error checking for new stories:', error);
        }
      };
      
      // Check for new stories every 5 minutes
      const interval = setInterval(checkForNewStories, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [stories]);

  async function loadStories(silent: boolean = false) {
    try {
      if (!silent) setLoading(true);
      
      // Include refresh parameter to force NewsAPI fetch if silent is false
      // and we're not in database-only mode
      const params = new URLSearchParams({
        page: '1',
        pageSize: '12',
      });
      
      if (!silent && !isDatabaseOnlyMode()) params.append('refresh', 'true');
      
      const res = await fetch(`/api/news?${params}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch stories: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Check API status
      const apiStatus = data.apiStatus || { success: true };
      
      // Handle both formats: direct array or {stories: [...]} object
      const fetchedStories = Array.isArray(data) ? data : data.stories || [];
      
      if (fetchedStories.length > 0) {
        setStories(fetchedStories);
        
        // If there was an API error (but not database-only mode) and we still got stories, show a toast
        if (!apiStatus.success && !silent && apiStatus.mode !== 'database-only') {
          toast({
            title: "Using cached stories",
            description: "NewsAPI rate limit exceeded. Showing available stories from our database.",
            duration: 5000,
          });
        }
      } else {
        console.warn("No stories in API response");
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
        {/* Add the database mode badge */}
        <DatabaseModeBadge />
        
        {loading && stories.length === 0 ? (
          <div className="flex flex-col">
            <StoryCardSkeleton />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-4">{error}</h2>
              <Button 
                onClick={() => loadStories()}
                variant="default"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <NewsFeed initialStories={stories} />
        )}
      </main>
    </div>
  );
}
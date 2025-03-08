// src/components/feed/NewsFeed.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Story } from "@/lib/types";
import StoryCard from "./StoryCard";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/shared/PullToRefreshIndicator";

interface NewsFeedProps {
  initialStories: Story[];
}

export default function NewsFeed({ initialStories = [] }: NewsFeedProps) {
  // State for stories and pagination
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [currentStory, setCurrentStory] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastStoryRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  
  // Define the refreshFeed function before using it in usePullToRefresh
  const refreshFeed = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      const res = await fetch('/api/news?refresh=true&page=1&pageSize=12');
      
      if (!res.ok) {
        throw new Error('Failed to refresh stories');
      }
      
      const data = await res.json();
      
      if (data.stories && data.stories.length > 0) {
        // Check if we have new stories
        const oldStoryIds = new Set(stories.map(s => s.id));
        const hasNewStories = data.stories.some((s: Story) => !oldStoryIds.has(s.id));
        
        if (hasNewStories) {
          setStories(data.stories);
          setPage(1);
          setHasMore(data.pagination?.hasMore ?? false);
          
          // Reset scroll position to top
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }
          
          toast({
            title: "Feed refreshed",
            description: "New stories have been loaded.",
            duration: 3000,
          });
        } else {
          toast({
            title: "No new stories",
            description: "Your feed is already up to date.",
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Error refreshing feed:', error);
      toast({
        title: "Refresh failed",
        description: "Couldn't load new stories. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Initialize pull-to-refresh
  const { isPulling, pullProgress, isRefreshing: isPullRefreshing } = usePullToRefresh({
    onRefresh: refreshFeed,
    containerRef: scrollContainerRef,
    disabled: isRefreshing // Disable when already refreshing
  });

  // Effect to restore scroll position when component mounts
  useEffect(() => {
    const savedStoryIndex = localStorage.getItem('currentStoryIndex');
    if (savedStoryIndex && scrollContainerRef.current && stories.length > 0) {
      const index = parseInt(savedStoryIndex, 10);
      // Ensure the index is valid
      if (index >= 0 && index < stories.length) {
        setCurrentStory(index);
        // Calculate and restore scroll position based on story height
        const scrollPosition = index * scrollContainerRef.current.clientHeight;
        scrollContainerRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'instant' // Use instant to prevent smooth scrolling on load
        });
      }
    }
  }, [stories.length]);

  // Load more stories
  const loadMoreStories = async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/news?page=${nextPage}&pageSize=12`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch more stories: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (data.stories && data.stories.length > 0) {
        setStories(prevStories => {
          // Filter out duplicates (in case the API returns the same story)
          const newStoryIds = new Set(data.stories.map((s: Story) => s.id));
          const filteredPrevStories = prevStories.filter(s => !newStoryIds.has(s.id));
          return [...filteredPrevStories, ...data.stories];
        });
        
        setPage(nextPage);
        setHasMore(data.pagination?.hasMore ?? false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more stories:', error);
      setError('Failed to load more stories. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create an intersection observer for infinite loading
  useEffect(() => {
    if (isLoading) return;
    
    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    // Create new observer
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        loadMoreStories();
      }
    }, { 
      rootMargin: '200px' // Start loading before the element is fully visible
    });
    
    // Observe the last story element
    if (lastStoryRef.current) {
      observerRef.current.observe(lastStoryRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, hasMore, stories.length]);

  // Handle scroll events to update current story
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const storyIndex = Math.round(scrollTop / element.clientHeight);
    
    // Only update if the story index has changed
    if (storyIndex !== currentStory && storyIndex >= 0 && storyIndex < stories.length) {
      setCurrentStory(storyIndex);
      // Save current story index to localStorage
      localStorage.setItem('currentStoryIndex', storyIndex.toString());
    }
  };

  // Handle story click navigation
  const handleStoryClick = (storyId: string) => {
    // Save current story index before navigation
    localStorage.setItem('currentStoryIndex', currentStory.toString());
    router.push(`/story/${storyId}`);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const storyHeight = container.clientHeight;
      const maxIndex = stories.length - 1;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentStory > 0) {
            const newIndex = currentStory - 1;
            setCurrentStory(newIndex);
            container.scrollTo({
              top: newIndex * storyHeight,
              behavior: 'smooth'
            });
            localStorage.setItem('currentStoryIndex', newIndex.toString());
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (currentStory < maxIndex) {
            const newIndex = currentStory + 1;
            setCurrentStory(newIndex);
            container.scrollTo({
              top: newIndex * storyHeight,
              behavior: 'smooth'
            });
            localStorage.setItem('currentStoryIndex', newIndex.toString());
          } else if (currentStory === maxIndex && hasMore && !isLoading) {
            // If at the last story, try to load more
            loadMoreStories();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStory, stories.length, hasMore, isLoading]);

  // If no stories, show empty state
  if (stories.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">No stories available</h2>
          <p className="text-gray-600 mb-6">Check back soon for the latest news</p>
          <Button 
            onClick={refreshFeed}
            disabled={isRefreshing}
            className="gap-2"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator 
        isPulling={isPulling} 
        pullProgress={pullProgress} 
        isRefreshing={isRefreshing || isPullRefreshing} 
      />
      
      {/* Refresh button in top-right corner */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          size="sm"
          variant="ghost"
          onClick={refreshFeed}
          disabled={isRefreshing || isPullRefreshing}
          className="gap-2 bg-background/70 backdrop-blur-sm hover:bg-background/90 rounded-full p-3 h-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>
      
      <div 
        ref={scrollContainerRef}
        className="h-screen overflow-y-auto snap-y snap-mandatory" 
        onScroll={handleScroll}
      >
        {stories.map((story, index) => {
          // Determine if this is the last item for intersection observer
          const isLastItem = index === stories.length - 1;
          
          return (
            <div 
              key={story.id} 
              ref={isLastItem ? lastStoryRef : null}
            >
              <StoryCard
                story={story}
                onClick={() => handleStoryClick(story.id)}
              />
            </div>
          );
        })}
        
        {/* Loading state at bottom of list */}
        {isLoading && (
          <div className="h-24 flex items-center justify-center">
            <div className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Loading more stories...</span>
            </div>
          </div>
        )}
        
        {/* End of feed message */}
        {!hasMore && stories.length > 0 && (
          <div className="h-24 flex items-center justify-center text-gray-500 text-sm">
            <div className="text-center">
              <p>You've reached the end of the feed</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  // Scroll back to the top
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({
                      top: 0,
                      behavior: 'smooth'
                    });
                  }
                }}
                className="mt-2"
              >
                Back to top
              </Button>
            </div>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <div className="h-24 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-500 mb-2">{error}</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadMoreStories}
              >
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
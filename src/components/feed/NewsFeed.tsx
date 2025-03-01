// src/components/feed/NewsFeed.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Story } from "@/lib/types";
import StoryCard from "./StoryCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface NewsFeedProps {
  initialStories: Story[];
}

// Update the component definition
export default function NewsFeed({ initialStories = [] }: NewsFeedProps) {
  // State for stories and pagination
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [currentStory, setCurrentStory] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
    
    // Check if we're near the end to trigger loading more
    const scrollBottom = scrollTop + element.clientHeight;
    const totalHeight = element.scrollHeight;
    
    if (scrollBottom >= totalHeight - 500 && !isLoading && hasMore) {
      loadMoreStories();
    }
  };

  // Load more stories
  const loadMoreStories = async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/news?page=${nextPage}&pageSize=12`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch more stories');
      }
      
      const data = await res.json();
      
      if (data.stories && data.stories.length > 0) {
        setStories(prevStories => [...prevStories, ...data.stories]);
        setPage(nextPage);
        setHasMore(data.pagination?.hasMore || false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more stories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle story click navigation
  const handleStoryClick = (storyId: string) => {
    // Save current story index before navigation
    localStorage.setItem('currentStoryIndex', currentStory.toString());
    router.push(`/story/${storyId}`);
  };

  // Handle keyboard navigation
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
          <p className="text-gray-600">Check back soon for the latest news</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      <div 
        ref={scrollContainerRef}
        className="h-screen overflow-y-auto snap-y snap-mandatory" 
        onScroll={handleScroll}
      >
        {stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            onClick={() => handleStoryClick(story.id)}
          />
        ))}
        
        {/* Loading spinner or load more button */}
        {hasMore && (
          <div className="h-24 flex items-center justify-center">
            {isLoading ? (
              <div className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Loading more stories...</span>
              </div>
            ) : (
              <Button 
                onClick={loadMoreStories}
                variant="outline"
              >
                Load more stories
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
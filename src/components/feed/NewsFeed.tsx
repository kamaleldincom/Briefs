// src/components/feed/NewsFeed.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Story } from "@/lib/types";
import StoryCard from "./StoryCard";

interface NewsFeedProps {
  initialStories: Story[];
}

export default function NewsFeed({ initialStories }: NewsFeedProps) {
  // State for tracking current story and scroll container
  const [currentStory, setCurrentStory] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Effect to restore scroll position when component mounts
  useEffect(() => {
    const savedStoryIndex = localStorage.getItem('currentStoryIndex');
    if (savedStoryIndex && scrollContainerRef.current) {
      const index = parseInt(savedStoryIndex, 10);
      // Ensure the index is valid
      if (index >= 0 && index < initialStories.length) {
        setCurrentStory(index);
        // Calculate and restore scroll position based on story height
        const scrollPosition = index * scrollContainerRef.current.clientHeight;
        scrollContainerRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'instant' // Use instant to prevent smooth scrolling on load
        });
      }
    }
  }, [initialStories.length]);

  // Handle scroll events to update current story
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const storyIndex = Math.round(scrollTop / element.clientHeight);
    
    // Only update if the story index has changed
    if (storyIndex !== currentStory) {
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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const storyHeight = container.clientHeight;
      const maxIndex = initialStories.length - 1;

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
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentStory, initialStories.length]);

  return (
    <div className="relative h-screen">
      <div 
        ref={scrollContainerRef}
        className="h-screen overflow-y-auto snap-y snap-mandatory" 
        onScroll={handleScroll}
      >
        {initialStories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            onClick={() => handleStoryClick(story.id)}
          />
        ))}
      </div>
    </div>
  );
}
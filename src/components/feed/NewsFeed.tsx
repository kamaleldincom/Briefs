// src/components/feed/NewsFeed.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Story } from "@/lib/types";
import StoryCard from "./StoryCard";

interface NewsFeedProps {
  initialStories: Story[];
}

export default function NewsFeed({ initialStories }: NewsFeedProps) {
  const [currentStory, setCurrentStory] = useState(0);
  const router = useRouter();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollTop = element.scrollTop;
    const storyIndex = Math.round(scrollTop / element.clientHeight);
    setCurrentStory(storyIndex);
  };

  const handleStoryClick = (storyId: string) => {
    router.push(`/story/${storyId}`);
  };

  return (
    <div className="relative h-screen">
      <div className="h-screen overflow-y-auto snap-y snap-mandatory" onScroll={handleScroll}>
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
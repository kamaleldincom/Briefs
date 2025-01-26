// src/app/page.tsx
import { Suspense } from "react";
import NewsFeed from "@/components/feed/NewsFeed";
import { ScrollRestorationProvider } from "@/context/ScrollRestorationContext";

async function getStories() {
  try {
    // Still fetch from our API route, which now uses MongoDB
    const res = await fetch('http://localhost:3000/api/news', {
      cache: 'no-store'
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch stories');
    }
    
    const stories = await res.json();
    
    // If we got stories, return them
    if (stories && stories.length > 0) {
      return stories;
    }

    // If no stories in MongoDB yet, fall back to mock data
    const { MOCK_STORIES } = await import('@/lib/mock-data');
    return MOCK_STORIES;
    
  } catch (error) {
    console.error('Error fetching stories:', error);
    // Keep mock data as fallback
    const { MOCK_STORIES } = await import('@/lib/mock-data');
    return MOCK_STORIES;
  }
}

export default async function Home() {
  const stories = await getStories();

  return (
    <main className="min-h-screen">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Loading stories...</h2>
          </div>
        </div>
      }>
        <NewsFeed initialStories={stories} />
      </Suspense>
    </main>
  );
}
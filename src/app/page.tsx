// src/app/page.tsx
import { Suspense } from "react";
import NewsFeed from "@/components/feed/NewsFeed";


async function getStories() {
  try {
    const res = await fetch('http://localhost:3000/api/news', {
      cache: 'no-store'
    });
    
    if (!res.ok) {
      const { MOCK_STORIES } = await import('@/lib/mock-data');
      return MOCK_STORIES;
    }
    
    return res.json();
  } catch (error) {
    console.error('Error fetching stories:', error);
    const { MOCK_STORIES } = await import('@/lib/mock-data');
    return MOCK_STORIES;
  }
}

export default async function Home() {
  const stories = await getStories();

  return (
    <main className="min-h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <NewsFeed initialStories={stories} />
      </Suspense>
    </main>
  );
}
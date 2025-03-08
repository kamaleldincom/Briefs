// src/app/story/[id]/page.tsx
import StoryDetail from "@/components/story/StoryDetail";
import Header from "@/components/navigation/Header";
import Link from "next/link";
import { getStoryManager } from "@/lib/services";
import { notFound } from "next/navigation";

// Add a revalidation period to ensure data is refreshed periodically
export const revalidate = 300; // 5 minutes

export default async function StoryPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const decodedId = decodeURIComponent(resolvedParams.id);
    
    // Use the new enhanced API endpoint to get the story
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/stories/${decodedId}`, {
      next: { revalidate }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch story: ${response.status}`);
    }
    
    const story = await response.json();

    if (!story) {
      notFound();
    }

    // Parse dates in the story object (especially for timeline events)
    const parsedStory = parseStoryDates(story);

    return (
      <div className="flex flex-col min-h-screen">
        <Header isStoryPage />
        <main className="flex-1">
          <StoryDetail story={parsedStory} />
        </main>
      </div>
    );
  } catch (error) {
    console.error('Error loading story:', error);
    
    return (
      <div className="flex flex-col min-h-screen">
        <Header isStoryPage />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Error loading story</h2>
            <p className="text-gray-600 mb-4">Something went wrong while loading this story.</p>
            <Link href="/" className="text-blue-500 hover:underline mt-4 block">
              Return to home
            </Link>
          </div>
        </main>
      </div>
    );
  }
}

// Helper function to parse date strings into Date objects throughout the story
function parseStoryDates(story: any) {
  // Parse metadata dates
  const parsedStory = {
    ...story,
    metadata: {
      ...story.metadata,
      firstPublished: new Date(story.metadata.firstPublished),
      lastUpdated: new Date(story.metadata.lastUpdated)
    }
  };
  
  // Parse timeline dates if they exist
  if (parsedStory.analysis && parsedStory.analysis.timeline) {
    parsedStory.analysis.timeline = parsedStory.analysis.timeline.map((event: any) => ({
      ...event,
      timestamp: new Date(event.timestamp)
    }));
  }
  
  // Parse notable quote dates if they exist
  if (parsedStory.analysis && parsedStory.analysis.notableQuotes) {
    parsedStory.analysis.notableQuotes = parsedStory.analysis.notableQuotes.map((quote: any) => ({
      ...quote,
      timestamp: quote.timestamp ? new Date(quote.timestamp) : undefined
    }));
  }
  
  return parsedStory;
}
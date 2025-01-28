// src/app/story/[id]/page.tsx
import StoryDetail from "@/components/story/StoryDetail";
import Header from "@/components/navigation/Header";
import Link from "next/link";
import { getStoryManager } from "@/lib/services";

export default async function StoryPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const storyManager = await getStoryManager();
    const story = await storyManager.getStoryById(resolvedParams.id);

    if (!story) {
      return (
        <div className="flex flex-col min-h-screen">
          <Header isStoryPage />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Story not found</h2>
              <p className="text-gray-600">The story you're looking for doesn't exist or has been removed.</p>
              <Link href="/" className="text-blue-500 hover:underline mt-4 block">
                Return to home
              </Link>
            </div>
          </main>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen">
        <Header isStoryPage />
        <main className="flex-1">
          <StoryDetail story={story} />
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
            <p className="text-gray-600">Something went wrong while loading this story.</p>
            <Link href="/" className="text-blue-500 hover:underline mt-4 block">
              Return to home
            </Link>
          </div>
        </main>
      </div>
    );
  }
}
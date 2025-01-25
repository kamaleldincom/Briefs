// src/app/story/[id]/page.tsx
import Link from "next/link";
import StoryDetail from "@/components/story/StoryDetail";
import { getStoryManager } from "@/lib/services";


export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const storyManager = await getStoryManager();
    const story = await storyManager.getStoryById(resolvedParams.id);

    if (!story) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Story not found</h2>
            <p className="text-gray-600">The story you're looking for doesn't exist or has been removed.</p>
            <Link href="/" className="text-blue-500 hover:underline mt-4 block">
              Return to home
            </Link>
          </div>
        </div>
      );
    }

    return <StoryDetail story={story} />;
  } catch (error) {
    console.error('Error loading story:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error loading story</h2>
          <p className="text-gray-600">Something went wrong while loading this story.</p>
          <Link href="/" className="text-blue-500 hover:underline mt-4 block">
            Return to home
          </Link>
        </div>
      </div>
    );
  }
}
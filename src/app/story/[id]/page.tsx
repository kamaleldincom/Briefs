// src/app/story/[id]/page.tsx
import Link from "next/link";
import StoryDetail from "@/components/story/StoryDetail";
import { fetchLatestNews } from "@/lib/services/news";

export default async function StoryPage({
  params: { id }
}: {
  params: { id: string }
}) {
  const stories = await fetchLatestNews();
  const story = stories.find(s => s.id === id);

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
}
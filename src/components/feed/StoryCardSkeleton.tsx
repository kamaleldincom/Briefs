// src/components/feed/StoryCardSkeleton.tsx
import { Card, CardContent } from "@/components/ui/card";

export default function StoryCardSkeleton() {
  return (
    <div className="h-screen w-full snap-start flex items-start justify-center p-4">
      <Card className="w-full max-w-4xl h-[calc(100vh-6rem)] overflow-hidden animate-pulse">
        <CardContent className="p-6 h-full flex flex-col">
          {/* Title skeleton */}
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-md mb-4 w-3/4"></div>

          {/* Source list skeleton */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
          
          {/* Featured Image skeleton */}
          <div className="relative w-full h-1/2 mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          
          {/* Summary skeleton */}
          <div className="flex-grow mb-6 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-11/12"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-10/12"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-9/12"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/12"></div>
          </div>

          {/* Metadata Footer skeleton */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
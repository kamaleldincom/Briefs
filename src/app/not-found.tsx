// src/app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">Story not found</h2>
        <p className="text-gray-600">The story you're looking for doesn't exist or has been removed.</p>
        <Link href="/" className="text-blue-500 hover:underline">
          Return to home
        </Link>
      </div>
    </div>
  );
}
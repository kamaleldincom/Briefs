// src/components/news/raw-article-view.tsx
'use client';

import { RawArticle } from '@/types/database';
import { ExternalLink } from 'lucide-react';
import { useStoryArticles } from '@/hooks/useNews';
import { format } from 'date-fns';

interface RawArticleViewProps {
  storyId: string;
}

export function RawArticleView({ storyId }: RawArticleViewProps) {
  const { data: articles, isLoading, error } = useStoryArticles(storyId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-600">Error loading original articles: {error.message}</p>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-gray-500">No original articles found for this story.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        {articles.length} Original Article{articles.length !== 1 ? 's' : ''}
      </div>

      <div className="space-y-4">
        {articles.map((article) => (
          <RawArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}

interface RawArticleCardProps {
  article: RawArticle;
}

function RawArticleCard({ article }: RawArticleCardProps) {
  const { sourceArticle } = article;
  const publishedDate = new Date(sourceArticle.publishedAt);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
          {format(publishedDate, 'PP')}
        </span>
        <span className="text-xs text-gray-500">
          {format(publishedDate, 'p')}
        </span>
      </div>

      <h3 className="text-lg font-medium mb-2">{sourceArticle.title}</h3>
      
      {sourceArticle.description && (
        <p className="text-sm text-gray-600 mb-4">{sourceArticle.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
            {sourceArticle.source.name[0]}
          </div>
          <span className="text-sm font-medium">{sourceArticle.source.name}</span>
        </div>

        <a
          href={sourceArticle.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          View Source <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
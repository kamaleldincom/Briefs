// src/components/story/OriginalArticleModal.tsx
"use client";

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, ExternalLink } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface OriginalArticleModalProps {
  articleId: string;
  onClose: () => void;
}

interface RawArticle {
  id: string;
  sourceArticle: {
    title: string;
    description: string;
    content: string;
    url: string;
    publishedAt: string;
    urlToImage: string | null;
    source: {
      id: string | null;
      name: string;
    };
  };
}

export default function OriginalArticleModal({ articleId, onClose }: OriginalArticleModalProps) {
  const [article, setArticle] = useState<RawArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticle() {
      try {
        setLoading(true);
        const response = await fetch(`/api/articles/${articleId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch article');
        }
        
        const data = await response.json();
        setArticle(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching article:', error);
        setError('Could not load the original article.');
      } finally {
        setLoading(false);
      }
    }

    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  return (
    <Dialog open={!!articleId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading article...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
          </div>
        ) : article ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold mb-2">
                {article.sourceArticle.title}
              </DialogTitle>
              <DialogDescription className="flex items-center text-sm text-gray-500">
                <span className="font-medium text-gray-700 mr-2">
                  {article.sourceArticle.source.name}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(new Date(article.sourceArticle.publishedAt))}
                </span>
              </DialogDescription>
            </DialogHeader>
            
            {article.sourceArticle.urlToImage && (
              <div className="my-4">
                <img
                  src={article.sourceArticle.urlToImage}
                  alt={article.sourceArticle.title}
                  className="w-full h-auto rounded-md object-cover"
                />
              </div>
            )}
            
            <div className="space-y-4 my-4">
              {article.sourceArticle.description && (
                <p className="text-lg font-medium">
                  {article.sourceArticle.description}
                </p>
              )}
              
              <div className="prose max-w-none">
                {/* Display article content */}
                <p>
                  {article.sourceArticle.content 
                    ? article.sourceArticle.content.replace(/\[\+\d+ chars\]$/, '')
                    : 'Full content not available'}
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <div className="flex justify-between w-full">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button asChild>
                  <a 
                    href={article.sourceArticle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <span>View Original</span>
                    <ExternalLink className="ml-2 w-4 h-4" />
                  </a>
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-8">
            <p>Article not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
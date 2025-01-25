// src/lib/services/story-manager/types.ts
import { Story } from '@/lib/types';
import { NewsStorage } from '../storage/types';

export interface StoryManager {
  processNewArticles(articles: NewsAPIArticle[]): Promise<Story[]>;
  getStories(): Promise<Story[]>;
  getStoryById(id: string): Promise<Story | null>;
}

export interface NewsAPIArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string;
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
}
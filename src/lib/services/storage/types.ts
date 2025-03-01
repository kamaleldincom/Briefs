// src/lib/services/storage/types.ts
import { Story } from '@/lib/types';
import { RawArticle, StoryArticleLink } from '@/lib/types/database';

export interface NewsStorage {
  // Initialize storage connections
  initialize(): Promise<void>;
  
  // Story methods
  getStories(options?: { page?: number; pageSize?: number; }): Promise<Story[]>;
  getStoryById(id: string): Promise<Story | null>;
  addStory(story: Story): Promise<Story>;
  updateStory(id: string, story: Partial<Story>): Promise<void>;
  findRelatedStories(story: Partial<Story>): Promise<Story[]>;
  
  // Raw article methods
  getRawArticle(id: string): Promise<RawArticle | null>;
  getRawArticlesByStoryId(storyId: string): Promise<RawArticle[]>;
  storeRawArticle(article: RawArticle): Promise<RawArticle>;
  updateRawArticle(id: string, update: Partial<RawArticle>): Promise<void>;
  findArticleByUrl(url: string): Promise<RawArticle | null>;
  
  // Story-article link methods
  getStoryLinks(storyId: string): Promise<StoryArticleLink[]>;
  getArticleLinks(articleId: string): Promise<StoryArticleLink[]>;
  createStoryLink(link: StoryArticleLink): Promise<StoryArticleLink>;
  updateStoryLink(id: string, update: Partial<StoryArticleLink>): Promise<void>;
  
  // Count methods for pagination
  countStories(filter?: any): Promise<number>;
  countRawArticles(filter?: any): Promise<number>;
}
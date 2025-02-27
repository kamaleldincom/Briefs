// src/types/database.ts
import { NewsAPIArticle, NewsSource, Story } from './news';

/**
 * Represents a raw, unprocessed article directly from the news API
 */
export interface RawArticle {
  id: string;
  sourceArticle: NewsAPIArticle;
  processed: boolean;
  storyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents the relationship between an article and a story
 */
export interface StoryArticleLink {
  id: string;
  storyId: string;
  articleId: string;
  addedAt: Date;
  contributionType: 'original' | 'update' | 'related';
  impact: 'major' | 'minor' | 'context';
}

/**
 * Parameters for fetching stories from storage
 */
export interface FetchStoriesOptions {
  page?: number;
  pageSize?: number;
  sortBy?: 'publishedAt' | 'recentActivity' | 'sourceCount';
  category?: string;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Interface for storage service operations
 */
export interface StorageService {
  // Raw Article operations
  storeRawArticle(article: RawArticle): Promise<RawArticle>;
  getRawArticle(id: string): Promise<RawArticle | null>;
  getRawArticleByUrl(url: string): Promise<RawArticle | null>;
  getUnprocessedRawArticles(limit?: number): Promise<RawArticle[]>;
  updateRawArticle(article: RawArticle): Promise<RawArticle>;
  
  // Story operations
  storeStory(story: Story): Promise<Story>;
  getStory(id: string): Promise<Story | null>;
  getStoryByTitle(title: string): Promise<Story | null>;
  getActiveStories(options: FetchStoriesOptions): Promise<Story[]>;
  getRecentStories(hoursAgo: number): Promise<Story[]>;
  updateStory(story: Story): Promise<Story>;
  
  // StoryArticleLink operations
  storeStoryLink(link: StoryArticleLink): Promise<StoryArticleLink>;
  getStoryLinks(storyId: string): Promise<StoryArticleLink[]>;
  getArticleLinks(articleId: string): Promise<StoryArticleLink[]>;
  
  // Composite operations
  findStoryByArticleUrl(url: string): Promise<Story | null>;
  getStoryWithArticles(storyId: string): Promise<{ story: Story; articles: RawArticle[] } | null>;
}
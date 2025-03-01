// src/lib/types/database.ts
import { NewsAPIArticle } from '@/lib/services/story-manager/types';
import { Story } from '@/lib/types';
import { ObjectId } from 'mongodb';

export interface RawArticle {
  id: string;
  sourceArticle: NewsAPIArticle;
  processed: boolean;
  storyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RawArticleDocument extends RawArticle {
  _id: ObjectId;
}

export interface StoryArticleLink {
  id: string;
  storyId: string;
  articleId: string;
  addedAt: Date;
  contributionType: 'original' | 'update' | 'related';
  impact: 'major' | 'minor' | 'context';
}

export interface StoryArticleLinkDocument extends StoryArticleLink {
  _id: ObjectId;
}

export interface StoryDocument extends Story {
  _id: ObjectId;
}
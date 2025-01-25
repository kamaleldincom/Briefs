// src/lib/services/storage/types.ts
import { Story } from '@/lib/types';

export interface NewsStorage {
  initialize(): Promise<void>;
  getStories(): Promise<Story[]>;
  getStoryById(id: string): Promise<Story | null>;
  addStory(story: Story): Promise<void>;
  updateStory(id: string, story: Partial<Story>): Promise<void>;
  findRelatedStories(story: Partial<Story>): Promise<Story[]>;
}
// src/lib/services/ai/types.ts
import { Story, StoryAnalysis, Perspective, NotableQuote, TimelineEvent } from '@/lib/types';

export interface SimilarityAnalysis {
  isSimilar: boolean;
  confidenceScore: number;
  reasonings: string[];
}

// Make AIAnalysisResult match StoryAnalysis exactly
export interface AIAnalysisResult {
  summary: string;
  keyPoints: string[];
  mainPerspectives: string[];
  controversialPoints: string[];
  perspectives?: Perspective[];
  notableQuotes: NotableQuote[];
  timeline: TimelineEvent[];
}

export interface AIService {
  findSimilarStories(story: Story, candidates: Story[]): Promise<Story[]>;
  analyzeStoryGroup(stories: Story[]): Promise<AIAnalysisResult>;
  updateStoryAnalysis(story: Story, newContent: Story): Promise<StoryAnalysis>;
}
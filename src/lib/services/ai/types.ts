// src/lib/services/ai/types.ts
import { Story, StoryAnalysis, Perspective, NotableQuote, TimelineEvent, KeyPoint } from '@/lib/types';

export interface SimilarityAnalysis {
  isSimilar: boolean;
  confidenceScore: number;
  reasonings: string[];
}

// Make AIAnalysisResult match StoryAnalysis structure
export interface AIAnalysisResult {
  summary: string;
  backgroundContext: string;
  keyPoints: KeyPoint[];
  mainPerspectives: string[];
  controversialPoints: string[];
  perspectives: Perspective[];
  implications: {
    shortTerm: string[];
    longTerm: string[];
  };
  notableQuotes: NotableQuote[];
  timeline: TimelineEvent[];
  relatedTopics: string[];
}

export interface AIService {
  findSimilarStories(story: Story, candidates: Story[]): Promise<Story[]>;
  analyzeStoryGroup(stories: Story[]): Promise<AIAnalysisResult>;
  updateStoryAnalysis(story: Story, newContent: Story): Promise<StoryAnalysis>;
}
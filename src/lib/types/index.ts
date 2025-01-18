// src/lib/types/index.ts
export interface Source {
  id: string;
  name: string;
  url: string;
  bias: number;
  sentiment: number;
}

export interface StoryMetadata {
  firstPublished: Date;
  lastUpdated: Date;
  totalSources: number;
  categories: string[];
}

export interface StoryAnalysis {
  summary: string;
  keyPoints: string[];
  mainPerspectives: string[];
  controversialPoints: string[];
  timeline: {
      timestamp: Date;
      event: string;
      sources: string[];
  }[];
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;  // From NewsAPI's urlToImage
  sources: Source[];
  metadata: StoryMetadata;
  analysis: StoryAnalysis;
}
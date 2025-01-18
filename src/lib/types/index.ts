// src/lib/types/index.ts
export interface Source {
  id: string;
  name: string;
  url: string;
  bias: number;
  sentiment: number;
  quote?: string;    // For notable statements
  perspective?: string; // For different viewpoints
}

export interface StoryMetadata {
  firstPublished: Date;
  lastUpdated: Date;
  totalSources: number;
  categories: string[];
  latestDevelopment?: string;  // For latest updates
  imageUrl?: string;           // For media
  imageCaption?: string;
}

export interface StoryAnalysis {
  summary: string;
  keyPoints: string[];
  mainPerspectives: string[];
  controversialPoints: string[];
  notableQuotes: {
    text: string;
    source: string;
  }[];
  timeline: {
    timestamp: Date;
    event: string;
    sources: string[];
  }[];
}
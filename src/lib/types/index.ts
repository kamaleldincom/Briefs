// src/lib/types/index.ts
export interface Source {
  id: string;
  name: string;
  url: string;
  bias: number;
  sentiment: number;
  quote?: string;
  perspective?: string;
}

export interface StoryMetadata {
  firstPublished: Date;
  lastUpdated: Date;
  totalSources: number;
  categories: string[];
  latestDevelopment?: string;
  imageUrl?: string;
  imageCaption?: string;
}

export interface KeyPoint {
  point: string;
  importance: 'high' | 'medium' | 'low';
  context?: string;
}

export interface Perspective {
  sourceName: string;
  stance: string;  // e.g., "Neutral", "Supportive", "Critical"
  summary: string;
  keyArguments: string[];
  bias?: string;
  evidence?: string[];
}

export interface NotableQuote {
  text: string;
  source: string;
  context?: string;
  significance?: string;
  timestamp?: Date;
}

export interface TimelineEvent {
  timestamp: Date;
  event: string;
  significance: string;
  sources: string[];
  relatedQuotes?: string[];
  impact?: string;
}

export interface StoryAnalysis {
  summary: string;
  backgroundContext: string;  // Added for historical/contextual information
  keyPoints: KeyPoint[];
  mainPerspectives: string[];
  controversialPoints: string[];
  perspectives: Perspective[];
  implications: {    // Added to analyze potential impacts
    shortTerm: string[];
    longTerm: string[];
  };
  notableQuotes: NotableQuote[];
  timeline: TimelineEvent[];
  relatedTopics?: string[];  // Added for connecting to broader themes
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  content: string;
  sources: Source[];
  metadata: StoryMetadata;
  analysis: StoryAnalysis;
}
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

export interface Perspective {
  sourceName: string;
  viewpoint: string;
  bias: string;
  evidence?: string;
}

export interface NotableQuote {
  text: string;
  source: string;
  context?: string;
  significance?: string;
}

export interface TimelineEvent {
  timestamp: Date;
  event: string;
  sources: string[];
  significance?: string;
}

export interface StoryAnalysis {
  summary: string;
  keyPoints: string[];
  mainPerspectives: string[];
  controversialPoints: string[];
  perspectives?: Perspective[];
  notableQuotes: NotableQuote[];
  timeline: TimelineEvent[];
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
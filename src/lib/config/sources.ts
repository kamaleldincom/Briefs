// src/lib/config/sources.ts

/**
 * Represents a news source with metadata for filtering and display
 */
export interface NewsSource {
  id: string;            // NewsAPI source ID
  name: string;          // Display name
  category?: string;     // News category 
  bias?: number;         // Political bias (-1 to 1 scale, 0 is neutral)
  reliability?: number;  // Source reliability (0 to 1 scale)
  enabled: boolean;      // Whether to include in API requests
}

/**
 * Complete list of news sources supported by the app
 * To enable/disable sources, simply change the 'enabled' property
 * Add new sources by adding entries to this array
 */
export const NEWS_SOURCES: NewsSource[] = [
  // Major International Sources
  { id: 'bbc-news', name: 'BBC News', category: 'International', bias: 0, reliability: 0.9, enabled: true },
  { id: 'reuters', name: 'Reuters', category: 'International', bias: 0, reliability: 0.95, enabled: true },
  { id: 'the-associated-press', name: 'Associated Press', category: 'International', bias: 0, reliability: 0.95, enabled: true },
  { id: 'al-jazeera-english', name: 'Al Jazeera', category: 'International', bias: -0.1, reliability: 0.85, enabled: true },
  
  // US Sources
  { id: 'cnn', name: 'CNN', category: 'US', bias: -0.2, reliability: 0.8, enabled: true },
  { id: 'the-new-york-times', name: 'New York Times', category: 'US', bias: -0.2, reliability: 0.9, enabled: true },
  { id: 'the-washington-post', name: 'Washington Post', category: 'US', bias: -0.1, reliability: 0.85, enabled: true },
  { id: 'fox-news', name: 'Fox News', category: 'US', bias: 0.3, reliability: 0.7, enabled: true },
  { id: 'the-wall-street-journal', name: 'Wall Street Journal', category: 'US', bias: 0.1, reliability: 0.9, enabled: true },
  { id: 'newsweek', name: 'Newsweek', category: 'US', bias: 0, reliability: 0.8, enabled: true },
  { id: 'usa-today', name: 'USA Today', category: 'US', bias: 0, reliability: 0.85, enabled: true },
  
  // Politics
  { id: 'politico', name: 'Politico', category: 'Politics', bias: 0, reliability: 0.85, enabled: true },
  { id: 'the-hill', name: 'The Hill', category: 'Politics', bias: 0, reliability: 0.85, enabled: true },
  
  // Business
  { id: 'bloomberg', name: 'Bloomberg', category: 'Business', bias: 0, reliability: 0.9, enabled: true },
  { id: 'business-insider', name: 'Business Insider', category: 'Business', bias: 0, reliability: 0.8, enabled: true },
  { id: 'financial-times', name: 'Financial Times', category: 'Business', bias: 0, reliability: 0.9, enabled: true },
  
  // Technology
  { id: 'the-verge', name: 'The Verge', category: 'Technology', bias: 0, reliability: 0.85, enabled: true },
  { id: 'wired', name: 'Wired', category: 'Technology', bias: -0.1, reliability: 0.85, enabled: true },
  { id: 'techcrunch', name: 'TechCrunch', category: 'Technology', bias: 0, reliability: 0.85, enabled: true },
  
  // Science
  { id: 'national-geographic', name: 'National Geographic', category: 'Science', bias: 0, reliability: 0.9, enabled: true },
  { id: 'new-scientist', name: 'New Scientist', category: 'Science', bias: 0, reliability: 0.9, enabled: true },
  
  // Entertainment
  { id: 'entertainment-weekly', name: 'Entertainment Weekly', category: 'Entertainment', bias: 0, reliability: 0.8, enabled: false },
  { id: 'mtv-news', name: 'MTV News', category: 'Entertainment', bias: -0.1, reliability: 0.7, enabled: false },
  
  // Sports
  { id: 'espn', name: 'ESPN', category: 'Sports', bias: 0, reliability: 0.85, enabled: false },
  { id: 'bleacher-report', name: 'Bleacher Report', category: 'Sports', bias: 0, reliability: 0.8, enabled: false },
];

/**
 * Get an array of all enabled source IDs for API requests
 */
export function getEnabledSources(): string[] {
  return NEWS_SOURCES
    .filter(source => source.enabled)
    .map(source => source.id);
}

/**
 * Get a source by its ID
 */
export function getSourceById(id: string): NewsSource | undefined {
  return NEWS_SOURCES.find(source => source.id === id);
}

/**
 * Get all sources in a specific category
 */
export function getSourcesByCategory(category: string): NewsSource[] {
  return NEWS_SOURCES.filter(source => 
    source.category === category && source.enabled
  );
}

/**
 * Get a list of all available categories
 */
export function getAllCategories(): string[] {
  return Array.from(new Set(
    NEWS_SOURCES
      .filter(source => source.enabled && source.category)
      .map(source => source.category as string)
  ));
}

/**
 * Create a source object with default values for missing properties
 */
export function createSource(
  id: string, 
  name: string, 
  options: Partial<NewsSource> = {}
): NewsSource {
  return {
    id,
    name,
    category: 'Other',
    bias: 0,
    reliability: 0.8,
    enabled: true,
    ...options
  };
}

// Legacy support for existing code
export const TRUSTED_SOURCES = getEnabledSources();
export const SOURCE_DETAILS = NEWS_SOURCES.reduce((acc, source) => ({
  ...acc,
  [source.id]: { name: source.name, bias: source.bias }
}), {});
// src/lib/services/news.ts
import { Story, Source } from '@/lib/types';
import { TRUSTED_SOURCES, SOURCE_DETAILS } from '../config/sources';

interface NewsAPIResponse {
  status: string;
  articles: Array<{
    title: string;
    description: string;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string;
    source: {
      id: string | null;
      name: string;
    };
    author: string | null;
  }>;
}

// Helper function to extract quotes from content
function extractQuotes(content: string): string {
  const matches = content.match(/"([^"]*?)"/g);
  return matches ? matches[0].replace(/"/g, '') : content.slice(0, 100) + '...';
}

function getKeywords(text: string): Set<string> {
  // Convert to lowercase and remove special characters
  const cleaned = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  // Split into words and filter out common words and short terms
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  return new Set(
    cleaned.split(' ')
      .filter(word => word.length > 3 && !commonWords.has(word))
  );
}

function calculateSimilarity(text1: string, text2: string): number {
  const keywords1 = getKeywords(text1);
  const keywords2 = getKeywords(text2);
  
  // Find common keywords
  const commonWords = [...keywords1].filter(word => keywords2.has(word));
  
  // Calculate Jaccard similarity
  const union = new Set([...keywords1, ...keywords2]);
  return commonWords.length / union.size;
}

function areArticlesRelated(article1: NewsAPIResponse['articles'][0], article2: NewsAPIResponse['articles'][0]): boolean {
  // Combine title and description for better context
  const content1 = `${article1.title} ${article1.description || ''}`;
  const content2 = `${article2.title} ${article2.description || ''}`;
  
  // Calculate similarity score
  const similarityScore = calculateSimilarity(content1, content2);
  
  // Articles are considered related if they share enough content similarity
  return similarityScore > 0.25; // Adjust threshold as needed
}

export async function fetchLatestNews(): Promise<Story[]> {
  const response = await fetch(
    `https://newsapi.org/v2/top-headlines?` + 
    new URLSearchParams({
      sources: TRUSTED_SOURCES.join(','),
      pageSize: '100',
      apiKey: process.env.NEWS_API_KEY || ''
    })
  );

  if (!response.ok) {
    throw new Error('Failed to fetch news');
  }

  const data: NewsAPIResponse = await response.json();
  const stories: Story[] = [];
  const processedUrls = new Set<string>();

  // Group related articles with improved matching
  data.articles.forEach(mainArticle => {
    if (processedUrls.has(mainArticle.url)) return;

    // Find all related articles
    const relatedArticles = data.articles.filter(article => 
      !processedUrls.has(article.url) && 
      (article === mainArticle || areArticlesRelated(mainArticle, article))
    );

    if (relatedArticles.length > 0) {
      // Skip if we only found duplicates from the same source
      const uniqueSources = new Set(relatedArticles.map(a => a.source.name));
      if (uniqueSources.size === 1 && relatedArticles.length > 1) {
        processedUrls.add(mainArticle.url);
        return;
      }

      // Mark all related articles as processed
      relatedArticles.forEach(article => processedUrls.add(article.url));

      // Create sources array with unique sources only
      const uniqueSourcesMap = new Map<string, NewsAPIResponse['articles'][0]>();
      relatedArticles.forEach(article => {
        if (!uniqueSourcesMap.has(article.source.name)) {
          uniqueSourcesMap.set(article.source.name, article);
        }
      });

      const sources: Source[] = Array.from(uniqueSourcesMap.values()).map(article => ({
        id: article.source.id || article.source.name,
        name: article.source.name,
        url: article.url,
        bias: SOURCE_DETAILS[article.source.id as keyof typeof SOURCE_DETAILS]?.bias || 0,
        sentiment: 0,
        quote: extractQuotes(article.content || article.description || ''),
        perspective: article.description
      }));

      // Use the earliest article as the main article
      const sortedArticles = relatedArticles.sort((a, b) => 
        new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      );
      const earliestArticle = sortedArticles[0];

      // Create story object
      const story: Story = {
        id: String(stories.length),
        title: earliestArticle.title,
        summary: earliestArticle.description || '',
        content: earliestArticle.content || earliestArticle.description || '',
        sources,
        metadata: {
          firstPublished: new Date(earliestArticle.publishedAt),
          lastUpdated: new Date(sortedArticles[sortedArticles.length - 1].publishedAt),
          totalSources: sources.length,
          categories: [],
          latestDevelopment: sortedArticles[sortedArticles.length - 1].description,
          imageUrl: earliestArticle.urlToImage || undefined
        },
        analysis: {
          summary: earliestArticle.description || '',
          keyPoints: sortedArticles
            .map(article => article.description)
            .filter((desc): desc is string => !!desc)
            .slice(0, 5),
          mainPerspectives: sources.map(source => source.perspective || '')
            .filter(perspective => !!perspective),
          controversialPoints: [],
          notableQuotes: sources
            .filter(source => source.quote)
            .map(source => ({
              text: source.quote || '',
              source: source.name
            })),
          timeline: sortedArticles.map(article => ({
            timestamp: new Date(article.publishedAt),
            event: article.description || '',
            sources: [article.source.name]
          }))
        }
      };

      stories.push(story);
    }
  });

  // Sort stories by number of sources and recency
  return stories.sort((a, b) => {
    if (b.metadata.totalSources === a.metadata.totalSources) {
      return b.metadata.lastUpdated.getTime() - a.metadata.lastUpdated.getTime();
    }
    return b.metadata.totalSources - a.metadata.totalSources;
  });
}
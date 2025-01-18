// src/lib/services/news.ts
import { Story } from '@/lib/types';
import { TRUSTED_SOURCES, SOURCE_DETAILS } from '../config/sources';

interface NewsAPIResponse {
  status: string;
  articles: Array<{
    title: string;
    description: string;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    source: {
      id: string | null;
      name: string;
    };
    content: string;
  }>;
}

function similarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(' ');
  const words2 = str2.toLowerCase().split(' ');
  const commonWords = words1.filter(word => words2.includes(word));
  return commonWords.length / Math.max(words1.length, words2.length);
}

export async function fetchLatestNews(): Promise<Story[]> {
  // Fetch from all trusted sources
  const sourcesParam = TRUSTED_SOURCES.join(',');
  const response = await fetch(
    `https://newsapi.org/v2/top-headlines?sources=${sourcesParam}&pageSize=100&apiKey=${process.env.NEWS_API_KEY}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch news');
  }

  const data: NewsAPIResponse = await response.json();
  
  // Group similar stories
  const stories: Story[] = [];
  const processedUrls = new Set<string>();

  data.articles.forEach((article) => {
    if (processedUrls.has(article.url)) return;

    // Find similar articles
    const similarArticles = data.articles.filter(a => 
      !processedUrls.has(a.url) && 
      similarity(article.title, a.title) > 0.5
    );

    if (similarArticles.length > 0) {
      // Mark all similar articles as processed
      similarArticles.forEach(a => processedUrls.add(a.url));

      // Create a unified story
      const story: Story = {
        id: String(stories.length),
        title: article.title,
        summary: article.description || '',
        content: article.content || article.description || '',
        imageUrl: article.urlToImage || undefined,
        sources: similarArticles.map(a => ({
          id: a.source.id || a.source.name,
          name: a.source.name,
          url: a.url,
          bias: SOURCE_DETAILS[a.source.id as keyof typeof SOURCE_DETAILS]?.bias || 0,
          sentiment: 0 // We can add sentiment analysis later
        })),
        metadata: {
          firstPublished: new Date(Math.min(...similarArticles.map(a => new Date(a.publishedAt).getTime()))),
          lastUpdated: new Date(Math.max(...similarArticles.map(a => new Date(a.publishedAt).getTime()))),
          totalSources: similarArticles.length,
          categories: []
        },
        analysis: {
          summary: article.description || '',
          keyPoints: [],
          mainPerspectives: [],
          controversialPoints: [],
          timeline: []
        }
      };

      stories.push(story);
    }
  });

  // Sort by number of sources (most covered stories first)
  return stories.sort((a, b) => b.metadata.totalSources - a.metadata.totalSources);
}
// src/lib/services/story-manager/index.ts
import { Story, Source } from '@/lib/types';
import { NewsStorage } from '../storage/types';
import { NewsAPIArticle } from './types';
import { SOURCE_DETAILS } from '@/lib/config/sources';
import { calculateSimilarity } from '@/lib/utils';

export class StoryManagerService {
  constructor(private storage: NewsStorage) {}

  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  async processNewArticles(articles: NewsAPIArticle[]): Promise<Story[]> {
    console.log('Starting to process articles...');
    const processedStories: Story[] = [];
    const processedUrls = new Set<string>();
  
    for (const article of articles) {
      if (processedUrls.has(article.url)) {
        console.log('Skipping duplicate article:', article.title);
        continue;
      }
  
      console.log('Processing article:', article.title);
      // Create a potential story from this article
      const potentialStory = this.createStoryFromArticle(article);
      
      // Find if this article relates to any existing stories
      const relatedStories = await this.storage.findRelatedStories(potentialStory);
      console.log(`Found ${relatedStories.length} related stories for:`, article.title);
  
      if (relatedStories.length > 0) {
        // Update existing story with new source
        const mainStory = relatedStories[0];
        console.log('Updating existing story:', mainStory.title);
        
        const updatedSources = this.mergeNewSource(
          mainStory.sources,
          this.createSourceFromArticle(article)
        );

        // Update the story with new source and analysis
        const updatedStory = this.updateStoryAnalysis({
          ...mainStory,
          sources: updatedSources,
          metadata: {
            ...mainStory.metadata,
            lastUpdated: new Date(),
            totalSources: updatedSources.length,
            latestDevelopment: article.description || undefined
          }
        }, article);
  
        await this.storage.updateStory(mainStory.id, updatedStory);
        processedStories.push(updatedStory);
      } else {
        // Create new story
        console.log('Creating new story:', article.title);
        const newStory = this.createStoryFromArticle(article);
        await this.storage.addStory(newStory);
        processedStories.push(newStory);
      }
  
      processedUrls.add(article.url);
    }
  
    console.log(`Processed ${processedStories.length} stories in total`);
    return processedStories;
  }

  async getStories(): Promise<Story[]> {
    return this.storage.getStories();
  }

  async getStoryById(id: string): Promise<Story | null> {
    console.log('Story Manager - Getting story by ID:', id);
    const story = await this.storage.getStoryById(id);
    console.log('Story Manager - Result:', story ? story.title : 'not found');
    return story;
  }

  private createSourceFromArticle(article: NewsAPIArticle): Source {
    return {
      id: article.source.id || article.source.name,
      name: article.source.name,
      url: article.url,
      bias: SOURCE_DETAILS[article.source.id as keyof typeof SOURCE_DETAILS]?.bias || 0,
      sentiment: 0,
      quote: this.extractQuote(article.content || article.description || ''),
      perspective: article.description
    };
  }

  private createStoryFromArticle(article: NewsAPIArticle): Story {
    const source = this.createSourceFromArticle(article);
    return {
      id: encodeURIComponent(Buffer.from(article.url).toString('base64')),
      title: article.title,
      summary: article.description || '',
      content: article.content || article.description || '',
      sources: [source],
      metadata: {
        firstPublished: new Date(article.publishedAt),
        lastUpdated: new Date(article.publishedAt),
        totalSources: 1,
        categories: [],
        latestDevelopment: article.description,
        imageUrl: article.urlToImage || undefined
      },
      analysis: {
        summary: article.description || '',
        keyPoints: [article.description || ''].filter(Boolean),
        mainPerspectives: [article.description || ''].filter(Boolean),
        controversialPoints: [],
        notableQuotes: source.quote ? [{
          text: source.quote,
          source: source.name
        }] : [],
        timeline: [{
          timestamp: new Date(article.publishedAt),
          event: article.description || '',
          sources: [article.source.name]
        }]
      }
    };
  }

  private mergeNewSource(existingSources: Source[], newSource: Source): Source[] {
    // Don't add duplicate sources
    if (existingSources.some(s => s.url === newSource.url)) {
      return existingSources;
    }
    return [...existingSources, newSource];
  }

  private updateStoryAnalysis(story: Story, article: NewsAPIArticle): Story {
    // Update notable quotes
    const newQuote = this.extractQuote(article.content || article.description || '');
    const quotes = [...story.analysis.notableQuotes];
    if (newQuote) {
      quotes.push({
        text: newQuote,
        source: article.source.name
      });
    }

    // Update timeline
    const timeline = [...story.analysis.timeline];
    timeline.push({
      timestamp: new Date(article.publishedAt),
      event: article.description || '',
      sources: [article.source.name]
    });

    // Sort timeline by timestamp in descending order
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      ...story,
      analysis: {
        ...story.analysis,
        notableQuotes: quotes,
        timeline: timeline
      }
    };
  }

  private extractQuote(content: string): string | undefined {
    const matches = content.match(/"([^"]*?)"/g);
    return matches ? matches[0].replace(/"/g, '') : content.slice(0, 100) + '...';
  }
}
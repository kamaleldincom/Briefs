// src/lib/services/story-manager/index.ts
import { Story } from '@/lib/types';
import { NewsStorage } from '../storage/types';
import { NewsAPIArticle } from './types';
import { SOURCE_DETAILS } from '@/lib/config/sources';
import { AIServiceImpl } from '../ai';
import { CONFIG } from '@/lib/config';
import { StoryRechecker } from './rechecker';
import { calculateSimilarity } from '@/lib/utils';

export class StoryManagerService {
  private aiService: AIServiceImpl;
  private rechecker: StoryRechecker;

  constructor(private storage: NewsStorage) {
    this.aiService = new AIServiceImpl();
    this.rechecker = new StoryRechecker(this);
    this.rechecker.startPeriodicCheck();
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  async processNewArticles(articles: NewsAPIArticle[]): Promise<void> {
    console.log('Processing new articles:', articles.length);
    
    // Track processed stories to avoid duplicates within the same batch
    const processedUrls = new Set<string>();

    for (const article of articles) {
      try {
        // Skip if we've already processed this URL in this batch
        if (processedUrls.has(article.url)) {
          console.log('Skipping duplicate article:', article.title);
          continue;
        }

        // Create initial story
        const newStory = this.createStoryFromArticle(article);
        
        // Find existing stories in database
        const existingStories = await this.storage.getStories();
        
        // Check if we already have this story
        if (await this.isStoryExists(newStory)) {
          console.log('Story already exists:', newStory.title);
          continue;
        }

        // Use AI to find similar stories
        const similarStories = await this.aiService.findSimilarStories(
          newStory, 
          existingStories
        );

        if (similarStories.length > 0) {
          console.log(`Found ${similarStories.length} similar stories for: ${newStory.title}`);
          
          // Get the main story (oldest one with most sources)
          const mainStory = this.findMainStory(similarStories);

          // Update analysis with new content
          const updatedAnalysis = await this.aiService.updateStoryAnalysis(
            mainStory,
            newStory
          );

          // Merge sources and update the story
          const mergedSources = this.mergeSources(mainStory.sources, newStory.sources);
          
          await this.storage.updateStory(mainStory.id, {
            sources: mergedSources,
            analysis: updatedAnalysis,
            metadata: {
              ...mainStory.metadata,
              totalSources: mergedSources.length,
              lastUpdated: new Date(),
              latestDevelopment: newStory.summary
            }
          });
        } else {
          console.log('Creating new story:', newStory.title);
          
          // If no similar stories found, analyze and store as new story
          const analysis = await this.aiService.analyzeStoryGroup([newStory]);
          newStory.analysis = analysis;
          await this.storage.addStory(newStory);
        }

        // Mark this URL as processed
        processedUrls.add(article.url);
      } catch (error) {
        console.error('Error processing article:', error);
        continue;
      }
    }
  }

  async getStories(): Promise<Story[]> {
    return this.storage.getStories();
  }

  async getStoryById(id: string): Promise<Story | null> {
    return this.storage.getStoryById(id);
  }

  private createStoryFromArticle(article: NewsAPIArticle): Story {
    const source = {
      id: this.createSourceId(article.source.id || article.source.name),
      name: article.source.name,
      url: article.url,
      bias: SOURCE_DETAILS[article.source.id as keyof typeof SOURCE_DETAILS]?.bias || 0,
      sentiment: 0,
      quote: this.extractQuote(article.content || article.description || ''),
      perspective: article.description
    };

    return {
      id: this.createStoryId(article.title),
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
          source: source.name,
          context: 'From original article'
        }] : [],
        timeline: [{
          timestamp: new Date(article.publishedAt),
          event: article.description || '',
          sources: [article.source.name],
          significance: 'Initial report'
        }]
      }
    };
  }

  private createStoryId(title: string): string {
    const timestamp = Date.now();
    const sanitizedTitle = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50); // Limit length

    return `${sanitizedTitle}-${timestamp}`;
  }

  private createSourceId(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private extractQuote(content: string): string | undefined {
    const matches = content.match(/"([^"]*?)"/g);
    if (matches && matches[0].length > 20) { // Only use quotes that are substantial
      return matches[0].replace(/"/g, '');
    }
    // If no substantial quote found, create one from the content
    return content.slice(0, 100) + '...';
  }

  private async isStoryExists(newStory: Story): Promise<boolean> {
    const existingStories = await this.storage.getStories();
    
    // Check for exact URL matches first
    const hasMatchingUrl = existingStories.some(story => 
      story.sources.some(source => 
        newStory.sources.some(newSource => newSource.url === source.url)
      )
    );

    if (hasMatchingUrl) return true;

    // Then check for title similarity
    const titleSimilarity = existingStories.some(story => {
      const similarity = calculateSimilarity(story.title, newStory.title);
      return similarity > 0.8; // High threshold for considering it the same story
    });

    return titleSimilarity;
  }

  private findMainStory(stories: Story[]): Story {
    return stories.reduce((main, current) => {
      // Prioritize stories with more sources
      if (current.sources.length > main.sources.length) return current;
      
      // If same number of sources, prefer older story
      if (current.sources.length === main.sources.length) {
        return current.metadata.firstPublished < main.metadata.firstPublished ? current : main;
      }
      
      return main;
    });
  }

  private mergeSources(existing: Story['sources'], newSources: Story['sources']): Story['sources'] {
    const uniqueSources = new Map<string, Story['sources'][0]>();
    
    // Add existing sources first
    existing.forEach(source => {
      uniqueSources.set(source.url, source);
    });
    
    // Add new sources, up to the limit
    newSources.forEach(source => {
      if (uniqueSources.size < CONFIG.maxSourcesPerStory && !uniqueSources.has(source.url)) {
        uniqueSources.set(source.url, source);
      }
    });
    
    return Array.from(uniqueSources.values());
  }

  async refreshStoryAnalysis(storyId: string): Promise<void> {
    const story = await this.getStoryById(storyId);
    if (!story) {
      throw new Error('Story not found');
    }

    try {
      // Get fresh analysis for the story
      const freshAnalysis = await this.aiService.analyzeStoryGroup([story]);
      
      // Update the story with new analysis
      await this.storage.updateStory(story.id, {
        analysis: freshAnalysis,
        metadata: {
          ...story.metadata,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      console.error(`Error refreshing analysis for story ${storyId}:`, error);
      throw error;
    }
  }

  async cleanupOldStories(): Promise<void> {
    const stories = await this.storage.getStories();
    const now = new Date();
    
    for (const story of stories) {
      const storyAge = now.getTime() - new Date(story.metadata.firstPublished).getTime();
      
      // Archive or delete stories older than cache timeout
      if (storyAge > CONFIG.cacheTimeout) {
        console.log(`Story ${story.id} is older than cache timeout:`, {
          title: story.title,
          age: storyAge / (1000 * 60 * 60 * 24) // Convert to days
        });
      }
    }
  }
}
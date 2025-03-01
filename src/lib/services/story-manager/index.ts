// src/lib/services/story-manager/index.ts
import { Story } from '@/lib/types';
import { NewsStorage } from '../storage/types';
import { NewsAPIArticle } from './types';
import { SOURCE_DETAILS } from '@/lib/config/sources';
import { AIServiceImpl } from '../ai';
import { CONFIG } from '@/lib/config';
import { StoryRechecker } from './rechecker';
import { calculateSimilarity } from '@/lib/utils';
import { RawArticle, StoryArticleLink } from '@/lib/types/database';
import { v4 as uuidv4 } from 'uuid';

export class StoryManagerService {
  private aiService: AIServiceImpl;
  private rechecker: StoryRechecker;

  constructor(private storage: NewsStorage) {
    this.aiService = new AIServiceImpl();
    this.rechecker = new StoryRechecker(this);
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
    // Initialize rechecker after storage is ready
    this.rechecker.startPeriodicCheck();
  }

  async processNewArticles(articles: NewsAPIArticle[]): Promise<void> {
    console.log('Processing new articles:', articles.length);
    
    // Process each article
    for (const article of articles) {
      try {
        // Step 1: Store raw article
        const rawArticle = await this.storeRawArticle(article);
        
        // Step 2: Process the article
        await this.processRawArticle(rawArticle);
      } catch (error) {
        console.error('Error processing article:', error);
        // Continue with next article
        continue;
      }
    }
  }

  async getStories(options: { page?: number; pageSize?: number } = {}): Promise<Story[]> {
    return this.storage.getStories(options);
  }

  async getStoryById(id: string): Promise<Story | null> {
    return this.storage.getStoryById(id);
  }

  async getRawArticlesByStoryId(storyId: string): Promise<RawArticle[]> {
    return this.storage.getRawArticlesByStoryId(storyId);
  }

  // Store raw article without processing
  private async storeRawArticle(article: NewsAPIArticle): Promise<RawArticle> {
    console.log('Storing raw article:', article.title);
    
    // Create raw article object
    const rawArticle: RawArticle = {
      id: uuidv4(),
      sourceArticle: article,
      processed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Store in database
    return await this.storage.storeRawArticle(rawArticle);
  }
  
  // Process a raw article to match with or create stories
  private async processRawArticle(rawArticle: RawArticle): Promise<void> {
    console.log('Processing raw article:', rawArticle.sourceArticle.title);
    
    // If article is already processed, skip
    if (rawArticle.processed) {
      console.log('Article already processed, skipping');
      return;
    }
    
    try {
      // Create a new story from the article (we'll use this to find matches)
      const potentialStory = this.createStoryFromArticle(rawArticle.sourceArticle);
      
      // Try to find related stories
      const relatedStories = await this.storage.findRelatedStories(potentialStory);
      
      if (relatedStories.length > 0) {
        // If we found related stories, link to the most relevant one
        const mainStory = this.findMainStory(relatedStories);
        console.log('Found related story:', mainStory.title);
        
        // Create link between article and story
        await this.linkArticleToStory(rawArticle, mainStory, 'update');
        
        // Update the story with additional source information
        await this.updateStoryWithNewSource(mainStory, rawArticle);
      } else {
        // If no related stories found, create a new one
        console.log('No related stories found, creating new story');
        await this.createNewStory(rawArticle);
      }
      
      // Mark article as processed
      await this.storage.updateRawArticle(rawArticle.id, { processed: true, updatedAt: new Date() });
    } catch (error) {
      console.error('Error processing raw article:', error);
      throw error;
    }
  }
  
  // Link a raw article to an existing story
  private async linkArticleToStory(
    article: RawArticle, 
    story: Story, 
    contributionType: StoryArticleLink['contributionType'] = 'related'
  ): Promise<void> {
    console.log(`Linking article ${article.id} to story ${story.id}`);
    
    // Update the article's storyId
    await this.storage.updateRawArticle(article.id, { 
      storyId: story.id,
      updatedAt: new Date()
    });
    
    // Create a link record
    const link: StoryArticleLink = {
      id: uuidv4(),
      storyId: story.id,
      articleId: article.id,
      addedAt: new Date(),
      contributionType,
      impact: this.determineArticleImpact(article, story)
    };
    
    await this.storage.createStoryLink(link);
  }
  
  // Determine how important this article is to the story
  private determineArticleImpact(article: RawArticle, story: Story): StoryArticleLink['impact'] {
    // If it's a new or developing story, it's likely major
    if (story.sources.length <= 2) return 'major';
    
    // Check if article contains new significant information
    const containsBreakingTerms = this.containsBreakingTerms(article.sourceArticle);
    if (containsBreakingTerms) return 'major';
    
    // Check publish time - if it's much newer than the last update, it might be significant
    const timeSinceLastUpdate = new Date().getTime() - new Date(story.metadata.lastUpdated).getTime();
    if (timeSinceLastUpdate > 12 * 60 * 60 * 1000) return 'major'; // 12 hours
    
    // Default to minor impact
    return 'minor';
  }
  
  // Check if article contains terms indicating breaking news
  private containsBreakingTerms(article: NewsAPIArticle): boolean {
    const breakingTerms = ['breaking', 'urgent', 'just in', 'update', 'developing'];
    const content = `${article.title} ${article.description || ''}`.toLowerCase();
    
    return breakingTerms.some(term => content.includes(term));
  }
  
  // Create a new story from a raw article
  private async createNewStory(rawArticle: RawArticle): Promise<Story> {
    const article = rawArticle.sourceArticle;
    console.log('Creating new story from article:', article.title);
    
    // Create initial story object
    const newStory: Story = this.createStoryFromArticle(article);
    
    try {
      // Analyze with AI if available
      if (process.env.OPENAI_API_KEY) {
        try {
          const analysis = await this.aiService.analyzeStoryGroup([newStory]);
          newStory.analysis = analysis;
        } catch (error) {
          console.error('AI analysis failed, using default analysis:', error);
          // Keep default analysis
        }
      }
      
      // Store the story
      const createdStory = await this.storage.addStory(newStory);
      
      // Link the article to the story
      await this.linkArticleToStory(rawArticle, createdStory, 'original');
      
      return createdStory;
    } catch (error) {
      console.error('Error creating new story:', error);
      throw error;
    }
  }
  
  // Update an existing story with information from a new article
  private async updateStoryWithNewSource(story: Story, rawArticle: RawArticle): Promise<void> {
    const article = rawArticle.sourceArticle;
    console.log('Updating story with new source:', story.title);
    
    try {
      // Create source object from the article
      const newSource = this.createSourceFromArticle(article);
      
      // Only add if not already present
      const sourceExists = story.sources.some(s => s.url === newSource.url);
      if (sourceExists) {
        console.log('Source already exists in story, skipping update');
        return;
      }
      
      // Merge sources, respecting the max limit
      const mergedSources = [...story.sources, newSource]
        .slice(0, CONFIG.maxSourcesPerStory);
      
      // Determine if we should update the analysis
      const shouldUpdateAnalysis = this.shouldUpdateAnalysis(story, rawArticle);
      
      let updatedAnalysis = story.analysis;
      if (shouldUpdateAnalysis && process.env.OPENAI_API_KEY) {
        try {
          // Create a temporary story with the new source for analysis
          const tempStory: Story = {
            ...story,
            sources: [newSource]
          };
          
          // Update analysis with the new content
          updatedAnalysis = await this.aiService.updateStoryAnalysis(story, tempStory);
        } catch (error) {
          console.error('Error updating analysis:', error);
          // Keep existing analysis on failure
        }
      }
      
      // Update the story
      await this.storage.updateStory(story.id, {
        sources: mergedSources,
        analysis: updatedAnalysis,
        metadata: {
          ...story.metadata,
          totalSources: mergedSources.length,
          lastUpdated: new Date(),
          latestDevelopment: article.description || undefined
        }
      });
    } catch (error) {
      console.error('Error updating story with new source:', error);
      throw error;
    }
  }
  
  // Determine if we should update the analysis
  private shouldUpdateAnalysis(story: Story, newArticle: RawArticle): boolean {
    // If this is one of the first few sources, always update
    if (!story.sources || story.sources.length < 3) return true;
    
    // If it's been a while since the last analysis, update
    const timeSinceLastUpdate = new Date().getTime() - new Date(story.metadata.lastUpdated).getTime();
    if (timeSinceLastUpdate > 6 * 60 * 60 * 1000) return true; // 6 hours
    
    // If the article contains breaking terms, update
    if (this.containsBreakingTerms(newArticle.sourceArticle)) return true;
    
    // If we have added 3 or more sources since last analysis, update
    const threshold = 3;
    const sourcesCount = story.sources.length;
    const articleCount = story.metadata.totalSources || 0;
    
    if (sourcesCount - articleCount >= threshold) return true;
    
    // Default: don't update
    return false;
  }
  
  private createStoryFromArticle(article: NewsAPIArticle): Story {
    const source = this.createSourceFromArticle(article);

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
        backgroundContext: '',
        keyPoints: [{
          point: article.description || 'No description available',
          importance: 'medium'
        }],
        mainPerspectives: [article.description || ''].filter(Boolean),
        controversialPoints: [],
        perspectives: [{
          sourceName: source.name,
          stance: 'Reporting',
          summary: article.description || 'No description available',
          keyArguments: []
        }],
        implications: {
          shortTerm: [],
          longTerm: []
        },
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
        }],
        relatedTopics: []
      }
    };
  }

  private createSourceFromArticle(article: NewsAPIArticle): { 
    id: string; 
    name: string; 
    url: string; 
    bias: number; 
    sentiment: number; 
    quote?: string; 
    perspective?: string; 
  } {
    return {
      id: this.createSourceId(article.source.id || article.source.name),
      name: article.source.name,
      url: article.url,
      bias: SOURCE_DETAILS[article.source.id as keyof typeof SOURCE_DETAILS]?.bias || 0,
      sentiment: 0,
      quote: this.extractQuote(article.content || article.description || ''),
      perspective: article.description
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

  async refreshStoryAnalysis(storyId: string): Promise<void> {
    const story = await this.getStoryById(storyId);
    if (!story) {
      throw new Error('Story not found');
    }

    try {
      // Get all raw articles for this story
      const rawArticles = await this.getRawArticlesByStoryId(storyId);
      
      if (rawArticles.length === 0) {
        console.log('No raw articles found for story, skipping analysis refresh');
        return;
      }
      
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


async getStoriesByKeywords(
  keywords: string[],
  options: { maxAge?: number; limit?: number } = {}
): Promise<Story[]> {
  try {
    // Get all stories
    const allStories = await this.storage.getStories();
    
    // Filter by keywords
    const matchingStories = allStories.filter(story => {
      const content = `${story.title} ${story.summary} ${story.content || ''}`.toLowerCase();
      return keywords.some(keyword => content.includes(keyword.toLowerCase()));
    });
    
    // Filter by age if specified
    const filteredStories = options.maxAge
      ? matchingStories.filter(story => {
          const storyTime = new Date(story.metadata.firstPublished).getTime();
          return Date.now() - storyTime < options.maxAge;
        })
      : matchingStories;
    
    // Sort by recency
    const sortedStories = filteredStories.sort((a, b) => 
      new Date(b.metadata.lastUpdated).getTime() - new Date(a.metadata.lastUpdated).getTime()
    );
    
    // Limit if specified
    return options.limit 
      ? sortedStories.slice(0, options.limit) 
      : sortedStories;
  } catch (error) {
    console.error('Error getting stories by keywords:', error);
    return [];
  }
}
}
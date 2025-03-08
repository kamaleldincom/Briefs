// src/lib/services/story-manager/index.ts
import { Story } from '@/lib/types';
import { NewsStorage } from '../storage/types';
import { NewsAPIArticle } from './types';
import { CONFIG } from '@/lib/config';
import { AIServiceImpl } from '../ai';
import { StoryRechecker } from './rechecker';
import { RawArticle, StoryArticleLink } from '@/lib/types/database';
import { v4 as uuidv4 } from 'uuid';
import { ArticleProcessor } from './article-processor';

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

  /**
   * Processes a batch of articles from NewsAPI
   * This is the main entry point for handling new articles
   * Called by external components like the rechecker and API routes
   */
  async processNewArticles(articles: NewsAPIArticle[]): Promise<void> {
    // This method is called from external code but was missing 
    // We'll delegate to processRawArticles for consistency
    return this.processRawArticles(articles);
  }

  /**
   * Processes articles from NewsAPI
   * Stores them as RawArticles and passes them to individual processing
   */
  async processRawArticles(articles: NewsAPIArticle[]): Promise<void> {
    console.log('Processing articles:', articles.length);
    
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

  /**
   * Gets stories with pagination
   */
  async getStories(options: { page?: number; pageSize?: number } = {}): Promise<Story[]> {
    return this.storage.getStories(options);
  }

  /**
   * Gets a specific story by ID
   */
  async getStoryById(id: string): Promise<Story | null> {
    return this.storage.getStoryById(id);
  }

  /**
   * Gets raw articles associated with a story
   */
  async getRawArticlesByStoryId(storyId: string): Promise<RawArticle[]> {
    return this.storage.getRawArticlesByStoryId(storyId);
  }

  /**
   * Enhanced story matching using multi-tier approach:
   * 1. Exact URL matching (fastest)
   * 2. Conventional content similarity
   * 3. AI-based conceptual matching (when available)
   */
  async findRelatedStoriesEnhanced(rawArticle: RawArticle): Promise<Story[]> {
    console.log('Enhanced story matching for:', rawArticle.sourceArticle.title);
    
    // Create potential story object from the article
    const potentialStory = this.createStoryFromArticle(rawArticle.sourceArticle);
    
    // TIER 1: Try exact URL matching first (fastest)
    const existingArticle = await this.storage.findArticleByUrl(rawArticle.sourceArticle.url);
    if (existingArticle && existingArticle.storyId) {
      console.log('Found exact URL match with existing article');
      const story = await this.storage.getStoryById(existingArticle.storyId);
      return story ? [story] : [];
    }
    
    // TIER 2: Try conventional content similarity matching
    const conventionalMatches = await this.storage.findRelatedStories(potentialStory);
    if (conventionalMatches.length > 0) {
      console.log('Found matches using conventional similarity');
      return conventionalMatches;
    }
    
    // TIER 3: Use AI for conceptual matching (if available and content is substantial)
    if (process.env.OPENAI_API_KEY && this.hasSubstantialContent(rawArticle)) {
      try {
        console.log('Attempting AI-based conceptual matching');
        // Get recent stories to check against
        const recentStories = await this.storage.getStories({ 
          page: 1,
          pageSize: 20 // Limit to 20 recent stories for performance
        });
        
        // Create a temporary story object from the article
        const tempStory: Story = potentialStory as Story;
        
        // Use AI service to find conceptually similar stories
        const aiMatches = await this.aiService.findSimilarStories(tempStory, recentStories);
        
        if (aiMatches.length > 0) {
          console.log('Found matches using AI conceptual similarity');
          return aiMatches;
        }
      } catch (error) {
        console.error('Error in AI conceptual matching:', error);
        // Continue to fallback methods
      }
    }
    
    // No matches found
    return [];
  }
  
  /**
   * Process a single raw article to match with existing stories or create a new one
   */
  private async processRawArticle(rawArticle: RawArticle): Promise<void> {
    console.log('Processing raw article:', rawArticle.sourceArticle.title);
    
    // If article is already processed, skip
    if (rawArticle.processed) {
      console.log('Article already processed, skipping');
      return;
    }
    
    try {
      // Use enhanced matching algorithm
      const relatedStories = await this.findRelatedStoriesEnhanced(rawArticle);
      
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

  /**
   * Store a raw article in the database
   */
  private async storeRawArticle(article: NewsAPIArticle): Promise<RawArticle> {
    console.log('Storing raw article:', article.title);
    
    // Clean the article content before storing
    const cleanedArticle = {
      ...article,
      content: ArticleProcessor.cleanArticleContent(article.content || '')
    };
    
    // Create raw article object
    const rawArticle: RawArticle = {
      id: uuidv4(),
      sourceArticle: cleanedArticle,
      processed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Store in database
    return await this.storage.storeRawArticle(rawArticle);
  }

  /**
   * Link an article to a story in the database
   */
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
  
  /**
   * Determine the impact level of an article on a story
   */
  private determineArticleImpact(article: RawArticle, story: Story): StoryArticleLink['impact'] {
    // If it's a new or developing story, it's likely major
    if (story.sources.length <= 2) return 'major';
    
    // Check if article contains new significant information
    const containsBreakingTerms = ArticleProcessor.containsBreakingTerms(article.sourceArticle);
    if (containsBreakingTerms) return 'major';
    
    // Check publish time - if it's much newer than the last update, it might be significant
    const timeSinceLastUpdate = new Date().getTime() - new Date(story.metadata.lastUpdated).getTime();
    if (timeSinceLastUpdate > 12 * 60 * 60 * 1000) return 'major'; // 12 hours
    
    // Default to minor impact
    return 'minor';
  }
  
  /**
   * Create a new story from a raw article
   */
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
  
  /**
   * Update an existing story with information from a new article
   */
  private async updateStoryWithNewSource(story: Story, rawArticle: RawArticle): Promise<void> {
    const article = rawArticle.sourceArticle;
    console.log('Updating story with new source:', story.title);
    
    try {
      // Create source object from the article
      const newSource = ArticleProcessor.createSourceFromArticle(article);
      
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
          latestDevelopment: article.description || undefined,
          // Use the best image available across all sources
          imageUrl: this.getBestImage(story, article)
        }
      });
    } catch (error) {
      console.error('Error updating story with new source:', error);
      throw error;
    }
  }
  
  /**
   * Get the best image URL from available sources
   */
  private getBestImage(story: Story, newArticle: NewsAPIArticle): string | undefined {
    // If the new article has an image and the story doesn't, use the new one
    if (newArticle.urlToImage && !story.metadata.imageUrl) {
      return newArticle.urlToImage;
    }
    
    // If the story already has an image, keep it
    if (story.metadata.imageUrl) {
      return story.metadata.imageUrl;
    }
    
    // No image available
    return undefined;
  }
  
  /**
   * Determine if we should update the analysis for a story
   */
  private shouldUpdateAnalysis(story: Story, newArticle: RawArticle): boolean {
    // If this is one of the first few sources, always update
    if (!story.sources || story.sources.length < 3) return true;
    
    // If it's been a while since the last analysis, update
    const timeSinceLastUpdate = new Date().getTime() - new Date(story.metadata.lastUpdated).getTime();
    if (timeSinceLastUpdate > 6 * 60 * 60 * 1000) return true; // 6 hours
    
    // If the article contains breaking terms, update
    if (ArticleProcessor.containsBreakingTerms(newArticle.sourceArticle)) return true;
    
    // If we have added 3 or more sources since last analysis, update
    const threshold = 3;
    const sourcesCount = story.sources.length;
    const articleCount = story.metadata.totalSources || 0;
    
    if (sourcesCount - articleCount >= threshold) return true;
    
    // Default: don't update
    return false;
  }
  
  /**
   * Create a story object from a NewsAPI article
   */
  private createStoryFromArticle(article: NewsAPIArticle): Story {
    const source = ArticleProcessor.createSourceFromArticle(article);
    const substantialContent = ArticleProcessor.getSubstantialContent(article);
    const entities = ArticleProcessor.extractEntities(article.title + " " + article.description);

    return {
      id: this.createStoryId(article.title),
      title: article.title,
      summary: article.description || '',
      content: substantialContent,
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
          keyArguments: entities.length > 0 ? [`Mentions ${entities.slice(0, 3).join(', ')}`] : []
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
        relatedTopics: entities.slice(0, 5) // Use extracted entities as initial related topics
      }
    };
  }

  /**
   * Create a story ID from a title
   */
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

  /**
   * Find the main story from a list of related stories
   */
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

  /**
   * Check if an article has enough content for AI analysis
   */
  private hasSubstantialContent(article: RawArticle): boolean {
    const { title, description, content } = article.sourceArticle;
    const titleLength = title?.length || 0;
    const descriptionLength = description?.length || 0;
    const contentLength = content?.length || 0;
    
    // At least 100 characters combined
    return (titleLength + descriptionLength + contentLength) > 100;
  }

  /**
   * Refresh the AI analysis for a story
   */
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

  /**
   * Clean up old stories
   */
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

  /**
   * Gets stories that match specific priority keywords
   * Used to ensure important topics like Sudan always appear in the feed
   */
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

  /**
   * Checks if a story contains any of the specified keywords
   */
  private storyContainsKeywords(story: Story, keywords: string[]): boolean {
    const content = `${story.title} ${story.summary} ${story.content || ''}`.toLowerCase();
    return keywords.some(keyword => content.includes(keyword.toLowerCase()));
  }

  /**
   * Adds priority topics to a story feed
   * Returns a modified list of stories with priority topics included
   */
  async incorporatePriorityTopics(
    regularStories: Story[], 
    priorityTopics: { name: string; keywords: string[]; minCount: number; maxAge: number }[]
  ): Promise<Story[]> {
    try {
      const result = [...regularStories];
      
      // For each priority topic
      for (const topic of priorityTopics) {
        // Skip if minimum count already met
        const existingCount = regularStories.filter(story => 
          this.storyContainsKeywords(story, topic.keywords)
        ).length;
        
        if (existingCount >= topic.minCount) {
          console.log(`Already have ${existingCount} stories about ${topic.name}`);
          continue;
        }
        
        // Search for stories about this topic
        const topicStories = await this.getStoriesByKeywords(
          topic.keywords, 
          { maxAge: topic.maxAge }
        );
        
        // Add priority stories not already in the regular set
        if (topicStories && topicStories.length > 0) {
          const storiesToAdd = topicStories.filter(topicStory => 
            !regularStories.some(regStory => regStory.id === topicStory.id)
          );
          
          // Add to result, replacing latest regular stories to maintain pageSize
          if (storiesToAdd.length > 0) {
            const neededCount = Math.min(
              topic.minCount - existingCount,
              storiesToAdd.length
            );
            
            if (neededCount > 0) {
              console.log(`Adding ${neededCount} stories about ${topic.name}`);
              
              // Remove stories from the end to make room
              result.splice(result.length - neededCount, neededCount);
              
              // Add priority stories
              result.push(...storiesToAdd.slice(0, neededCount));
            }
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error incorporating priority topics:', error);
      return regularStories; // Return original stories if anything goes wrong
    }
  }
}
// src/lib/services/story-manager/rechecker.ts
import { Story } from '@/lib/types';
import { StoryManagerService } from './index';
import { TIME_CONFIG, MS } from '@/lib/config/time';
import { getEnabledSources } from '@/lib/config/sources';
import { getArticleAgeLimit } from '@/lib/config/time';
import { isDatabaseOnlyMode, logApiInfo } from '@/lib/config/development';

export class StoryRechecker {
  private initialized = false;
  private lastApiError: Date | null = null;
  private apiErrorCount = 0;
  
  // Exponential backoff settings for API calls
  private readonly MIN_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_BACKOFF_MS = 60 * 60 * 1000; // 1 hour

  constructor(private storyManager: StoryManagerService) {}

  async startPeriodicCheck() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    console.log('Starting periodic story rechecker...');

    // Run initial check after a short delay to give the system time to initialize
    setTimeout(() => this.recheckStories(), 60 * 1000); // 1 minute delay

    // Set up periodic checking
    setInterval(() => this.recheckStories(), MS.RECHECK_INTERVAL);
  }

  private async recheckStories() {
    try {
      // Check if we're in database-only mode
      if (isDatabaseOnlyMode()) {
        logApiInfo('Database-only mode active. Skipping story rechecking.');
        return;
      }
      
      // Check if we should skip this run due to API rate limiting
      if (this.shouldSkipDueToRateLimiting()) {
        logApiInfo('Skipping story recheck due to recent API errors');
        return;
      }
      
      logApiInfo('Starting periodic story recheck...');
      const stories = await this.storyManager.getStories();
      const activeStories = this.filterActiveStories(stories);

      logApiInfo(`Found ${activeStories.length} active stories to recheck`);

      // Process a few stories at a time to avoid overloading the API
      const batchSize = 5;
      for (let i = 0; i < activeStories.length; i += batchSize) {
        const batch = activeStories.slice(i, i + batchSize);
        await Promise.all(batch.map(story => this.recheckStory(story)));
        
        // Add a short delay between batches
        if (i + batchSize < activeStories.length) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      // Reset error count if successful
      this.apiErrorCount = 0;
      logApiInfo('Completed story recheck');
    } catch (error) {
      console.error('Error during story recheck:', error);
    }
  }

  private filterActiveStories(stories: Story[]): Story[] {
    const cutoffTime = Date.now() - MS.ACTIVE_STORY_WINDOW;
    return stories.filter(story => 
      new Date(story.metadata.lastUpdated).getTime() > cutoffTime
    );
  }

  private async recheckStory(story: Story) {
    try {
      console.log(`Rechecking story: ${story.title}`);
      
      // Fetch latest news about this story
      const response = await fetch(
        `https://newsapi.org/v2/everything?` + 
        new URLSearchParams({
          q: this.generateSearchQuery(story),
          from: this.getSearchStartDate(story),
          sources: getEnabledSources().join(','),
          sortBy: 'publishedAt',
          apiKey: process.env.NEWS_API_KEY || '',
          language: 'en'
        })
      );
  
      // Handle rate limiting and other errors
      if (!response.ok) {
        this.handleApiError(response.status);
        
        if (response.status === 429) {
          console.log(`Rate limit exceeded while rechecking story: ${story.title}`);
          return; // Skip this story but don't throw, allowing other operations to continue
        } else {
          throw new Error(`Failed to fetch updates: ${response.status} ${response.statusText}`);
        }
      }
      
      // Reset error count on success
      this.apiErrorCount = 0;
  
      const data = await response.json();
      
      if (data.articles && data.articles.length > 0) {
        console.log(`Found ${data.articles.length} potential updates for story: ${story.title}`);
        // Use the correct method name here
        await this.storyManager.processRawArticles(data.articles);
      } else {
        console.log(`No updates found for story: ${story.title}`);
      }
    } catch (error) {
      console.error(`Error rechecking story ${story.id}:`, error);
    }
  }
  
  private handleApiError(status: number) {
    this.lastApiError = new Date();
    this.apiErrorCount++;
    
    // Log more details for rate limit errors
    if (status === 429) {
      console.warn(`NewsAPI rate limit hit. Error count: ${this.apiErrorCount}`);
    }
  }
  
  private shouldSkipDueToRateLimiting(): boolean {
    // If no errors occurred yet, don't skip
    if (!this.lastApiError) return false;
    
    // Calculate time since last error
    const timeSinceError = Date.now() - this.lastApiError.getTime();
    
    // Calculate backoff time based on error count (exponential)
    const backoffTime = Math.min(
      this.MIN_BACKOFF_MS * Math.pow(2, this.apiErrorCount - 1), 
      this.MAX_BACKOFF_MS
    );
    
    // Skip if we're still within the backoff period
    return timeSinceError < backoffTime;
  }

  private generateSearchQuery(story: Story): string {
    // Create search query from story title and key points
    const titleWords = story.title.split(' ')
      .filter(word => word.length > 3)
      .slice(0, 3);
    
    // Add main entities/keywords from the story
    let keywords = [...titleWords];
    
    // Add keywords from key points if available
    if (story.analysis && story.analysis.keyPoints) {
      const keyPointsText = story.analysis.keyPoints
        .map(kp => typeof kp === 'string' ? kp : kp.point)
        .join(' ');
      
      const keyPointWords = keyPointsText.split(' ')
        .filter(word => word.length > 3 && !titleWords.includes(word))
        .slice(0, 3);
      
      keywords = [...keywords, ...keyPointWords];
    }
    
    // Limit to 6 keywords to avoid overly restrictive queries
    return keywords.slice(0, 6).join(' ');
  }

  private getSearchStartDate(story: Story): string {
    // Use the common function to get age limit
    const ageLimit = new Date(getArticleAgeLimit());
    
    // Get date from story first published
    const storyDate = new Date(story.metadata.firstPublished);
    
    // Use the more recent date (don't go back further than MAX_ARTICLE_AGE_DAYS)
    if (storyDate < ageLimit) {
      return getArticleAgeLimit();
    }
    
    // Go back one day from story date to catch slightly older articles
    storyDate.setDate(storyDate.getDate() - 1);
    return storyDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
}
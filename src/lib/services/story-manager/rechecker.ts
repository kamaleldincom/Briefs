// src/lib/services/story-manager/rechecker.ts
import { Story } from '@/lib/types';
import { StoryManagerService } from './index';
import { CONFIG } from '@/lib/config';

const ACTIVE_STORY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class StoryRechecker {
  private initialized = false;

  constructor(private storyManager: StoryManagerService) {}

  async startPeriodicCheck() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    console.log('Starting periodic story rechecker...');

    // Run initial check after a short delay to give the system time to initialize
    setTimeout(() => this.recheckStories(), 60 * 1000); // 1 minute delay

    // Set up periodic checking every 15 minutes
    setInterval(() => this.recheckStories(), 15 * 60 * 1000);
  }

  private async recheckStories() {
    try {
      console.log('Starting periodic story recheck...');
      const stories = await this.storyManager.getStories();
      const activeStories = this.filterActiveStories(stories);

      console.log(`Found ${activeStories.length} active stories to recheck`);

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

      console.log('Completed story recheck');
    } catch (error) {
      console.error('Error during story recheck:', error);
    }
  }

  private filterActiveStories(stories: Story[]): Story[] {
    const cutoffTime = Date.now() - ACTIVE_STORY_WINDOW;
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
          sortBy: 'publishedAt',
          apiKey: process.env.NEWS_API_KEY || '',
          language: 'en'
        })
      );
  
      if (!response.ok) {
        throw new Error(`Failed to fetch updates: ${response.status} ${response.statusText}`);
      }
  
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
    // Get date from one day before the story was first published
    const date = new Date(story.metadata.firstPublished);
    date.setDate(date.getDate() - 1); // Go back one day to catch slightly older articles
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
}
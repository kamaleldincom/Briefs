// src/lib/services/story-manager/rechecker.ts
import { Story } from '@/lib/types';
import { CONFIG } from '@/lib/config';

const ACTIVE_STORY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class StoryRechecker {
  constructor(private storyManager: any) {}

  async startPeriodicCheck() {
    // Run initial check
    await this.recheckStories();

    // Set up periodic checking every 15 minutes
    setInterval(() => this.recheckStories(), 15 * 60 * 1000);
  }

  private async recheckStories() {
    try {
      console.log('Starting periodic story recheck...');
      const stories = await this.storyManager.getStories();
      const activeStories = this.filterActiveStories(stories);

      console.log(`Found ${activeStories.length} active stories to recheck`);

      for (const story of activeStories) {
        await this.recheckStory(story);
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
        throw new Error('Failed to fetch updates');
      }

      const { articles } = await response.json();
      
      if (articles.length > 0) {
        await this.storyManager.processNewArticles(articles);
      }
    } catch (error) {
      console.error(`Error rechecking story ${story.id}:`, error);
    }
  }

  private generateSearchQuery(story: Story): string {
    // Create search query from story title and key points
    const keywords = [
      ...story.title.split(' ').slice(0, 3), // First 3 words of title
      ...story.analysis.keyPoints.slice(0, 2).join(' ').split(' ').slice(0, 3) // First 3 words of first 2 key points
    ];
    return keywords.join(' ');
  }

  private getSearchStartDate(story: Story): string {
    const date = new Date(story.metadata.firstPublished);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
}
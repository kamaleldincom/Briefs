// src/app/api/news/route.ts
import { NextResponse } from 'next/server';
import { getStoryManager } from '@/lib/services';
import { TRUSTED_SOURCES } from '@/lib/config/sources';
import { Story } from '@/lib/types';

// Cache to store the last fetch time and results
let lastFetchTime = 0;
let cachedStories: Story[] | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();
    
    // Return cached stories if they're still fresh
    if (cachedStories && (now - lastFetchTime) < CACHE_DURATION) {
      return NextResponse.json(cachedStories);
    }

    const storyManager = await getStoryManager();
    
    // First, try to get existing stories from the database
    const existingStories = await storyManager.getStories();
    
    // If we have stories and it hasn't been long enough, return them
    if (existingStories.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
      cachedStories = existingStories;
      return NextResponse.json(existingStories);
    }

    // Otherwise, fetch new stories
    console.log('Fetching fresh stories from NewsAPI...');
    
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?` + 
      new URLSearchParams({
        sources: TRUSTED_SOURCES.join(','),
        pageSize: '100',
        apiKey: process.env.NEWS_API_KEY || ''
      })
    );

    if (!response.ok) {
      throw new Error('Failed to fetch from NewsAPI');
    }

    const newsData = await response.json();
    
    // Process in background
    processArticlesInBackground(storyManager, newsData.articles);
    
    // Return what we have now
    const stories = await storyManager.getStories();
    cachedStories = stories;
    lastFetchTime = now;
    
    return NextResponse.json(stories);
  } catch (error) {
    console.error('API Route: Failed to fetch or process news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

async function processArticlesInBackground(storyManager: any, articles: any[]) {
  try {
    await storyManager.processNewArticles(articles);
  } catch (error) {
    console.error('Background processing error:', error);
  }
}
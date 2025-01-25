// src/app/api/news/route.ts
import { NextResponse } from 'next/server';
import { getStoryManager } from '@/lib/services';
import { TRUSTED_SOURCES } from '@/lib/config/sources';

export async function GET(request: Request) {
  try {
    // Get the story manager instance
    const storyManager = await getStoryManager();
    
    console.log('Fetching from NewsAPI...');
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
    console.log(`Processing ${newsData.articles.length} articles...`);

    // Process new articles and get updated stories
    await storyManager.processNewArticles(newsData.articles);
    console.log('Articles processed and stored');

    // Get all stories from storage
    const stories = await storyManager.getStories();
    console.log(`Returning ${stories.length} stories`);

    return NextResponse.json(stories);
  } catch (error) {
    console.error('Failed to fetch or process news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
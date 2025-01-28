// src/app/api/news/route.ts
import { NextResponse } from 'next/server';
import { getStoryManager } from '@/lib/services';
import { TRUSTED_SOURCES } from '@/lib/config/sources';

export async function GET(request: Request) {
  try {
    const storyManager = await getStoryManager();
    console.log('API Route: Story manager initialized');
    
    // Log raw NewsAPI response
    console.log('API Route: Fetching from NewsAPI...');
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
    
    // Log API response details
    console.log(`API Route: Received ${newsData.articles?.length} articles`);
    console.log('API Route: Sample article titles:');
    newsData.articles?.slice(0, 5).forEach((article: any) => {
      console.log(`- ${article.title} (${article.source.name})`);
    });

    // Process articles
    console.log('API Route: Processing articles...');
    await storyManager.processNewArticles(newsData.articles);

    // Get and log results
    const stories = await storyManager.getStories();
    console.log(`API Route: Total stories in DB: ${stories.length}`);
    console.log('API Route: Multi-source stories:');
    stories
      .filter(s => s.sources.length > 1)
      .forEach(s => console.log(`- ${s.title} (${s.sources.length} sources)`));

    return NextResponse.json(stories);
  } catch (error) {
    console.error('API Route: Failed to fetch or process news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
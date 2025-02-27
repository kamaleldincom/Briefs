// src/app/api/news/fetch/route.ts
import { NextResponse } from 'next/server';
import { getApiNewsService } from '../../_services/news-service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '12');
    const category = url.searchParams.get('category') || undefined;
    const q = url.searchParams.get('q') || undefined;
    const language = url.searchParams.get('language') || 'en';
    const country = url.searchParams.get('country') || 'us';
    
    // Get news service
    const newsService = getApiNewsService();
    
    // Fetch and process stories from the external API
    const stories = await newsService.fetchStories({
      page,
      pageSize,
      category,
      q,
      language,
      country
    });
    
    return NextResponse.json(stories);
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
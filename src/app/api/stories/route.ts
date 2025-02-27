// src/app/api/stories/route.ts
import { NextResponse } from 'next/server';
import { getStorageService } from '@/lib/services/storage';
import { FetchStoriesOptions } from '@/types/database';
import { getApiNewsService } from '../_services/news-service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '12');
    const category = url.searchParams.get('category') || undefined;
    const sortBy = url.searchParams.get('sortBy') as 'publishedAt' | 'recentActivity' | 'sourceCount' | undefined;
    const q = url.searchParams.get('q') || undefined;
    const language = url.searchParams.get('language') || undefined;
    const country = url.searchParams.get('country') || undefined;
    
    // If fetching fresh stories from NewsAPI
    if (url.searchParams.get('fetch') === 'true') {
      const newsService = getApiNewsService();
      const stories = await newsService.fetchStories({
        page,
        pageSize,
        category,
        q,
        language,
        country
      });
      
      return NextResponse.json(stories);
    }
    
    // Otherwise, get from database
    // Parse date parameters if provided
    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    
    const fromDateParam = url.searchParams.get('fromDate');
    const toDateParam = url.searchParams.get('toDate');
    
    if (fromDateParam) {
      fromDate = new Date(fromDateParam);
    }
    
    if (toDateParam) {
      toDate = new Date(toDateParam);
    }
    
    // Prepare options
    const options: FetchStoriesOptions = {
      page,
      pageSize,
      sortBy: sortBy || 'publishedAt',
      category,
      fromDate,
      toDate
    };
    
    // Get storage service
    const storageService = await getStorageService();
    
    // Fetch stories
    const stories = await storageService.getActiveStories(options);
    
    return NextResponse.json(stories);
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}
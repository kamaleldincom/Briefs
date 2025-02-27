// src/app/api/stories/[id]/articles/route.ts
import { NextResponse } from 'next/server';
import { getStorageService } from '@/lib/services/storage';
import { getApiNewsService } from '../../../_services/news-service';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Story ID is required' },
        { status: 400 }
      );
    }
    
    // Get storage service
    const storageService = await getStorageService();
    
    // Fetch story with articles
    const result = await storageService.getStoryWithArticles(id);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result.articles);
  } catch (error) {
    console.error(`Error fetching articles for story ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}
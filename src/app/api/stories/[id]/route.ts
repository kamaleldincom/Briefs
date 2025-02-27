// src/app/api/stories/[id]/route.ts
import { NextResponse } from 'next/server';
import { getStorageService } from '@/lib/services/storage';
import { getApiNewsService } from '../../_services/news-service';

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
    
    // Fetch story
    const story = await storageService.getStory(id);
    
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(story);
  } catch (error) {
    console.error(`Error fetching story ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}
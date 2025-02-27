// src/app/api/news/v2/[id]/route.ts
import { NextResponse } from 'next/server';
import { EnhancedStoryManagerService } from '@/lib/services/story-manager/enhanced-story-manager';
import { EnhancedMongoDBStorage } from '@/lib/services/storage/enhanced-mongodb-storage';

const storage = new EnhancedMongoDBStorage();
const storyManager = new EnhancedStoryManagerService(storage);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const story = await storyManager.getStoryById(params.id);
    
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error('Story API Route Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}
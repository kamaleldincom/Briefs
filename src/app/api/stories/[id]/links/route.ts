// src/app/api/stories/[id]/links/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MongoDBStorage } from '@/lib/services/storage/mongodb-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storyId = params.id;
    
    // Get storage directly to access story links
    const storage = new MongoDBStorage();
    await storage.initialize();
    
    // Fetch the story links
    const links = await storage.getStoryLinks(storyId);
    
    if (!links || links.length === 0) {
      return NextResponse.json([]);
    }
    
    return NextResponse.json(links);
  } catch (error) {
    console.error('Error fetching story links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story links' },
      { status: 500 }
    );
  }
}
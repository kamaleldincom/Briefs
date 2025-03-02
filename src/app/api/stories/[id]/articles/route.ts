// src/app/api/stories/[id]/articles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStoryManager } from '@/lib/services';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const storyId = resolvedParams.id;
    
    const storyManager = await getStoryManager();
    const articles = await storyManager.getRawArticlesByStoryId(storyId);
    
    if (!articles || articles.length === 0) {
      return NextResponse.json([]);
    }
    
    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching story articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story articles' },
      { status: 500 }
    );
  }
}
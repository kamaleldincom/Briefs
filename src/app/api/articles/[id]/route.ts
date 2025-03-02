// src/app/api/articles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStoryManager } from '@/lib/services';
import { MongoDBStorage } from '@/lib/services/storage/mongodb-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const articleId = resolvedParams.id;
    
    // Get storage directly to access raw articles
    const storage = new MongoDBStorage();
    await storage.initialize();
    
    // Fetch the raw article
    const article = await storage.getRawArticle(articleId);
    
    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}
// src/app/api/news/route.ts
import { NextResponse } from 'next/server';
import { fetchLatestNews } from '@/lib/services/news';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};
  
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  try {
    const news = await fetchLatestNews(params);
    return NextResponse.json(news);
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
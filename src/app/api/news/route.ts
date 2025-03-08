// src/app/api/news/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getStoryManager } from '@/lib/services';
import { Story } from '@/lib/types';
import { getEnabledSources } from '@/lib/config/sources';
import { CONTENT_PREFERENCES } from '@/lib/config/preferences';
import { getArticleAgeLimit, TIME_CONFIG, MS } from '@/lib/config/time';
import { isDatabaseOnlyMode, logApiInfo } from '@/lib/config/development';

// Cache for API responses
let responseCache: {
  stories: Story[];
  timestamp: number;
  params: string;
} | null = null;

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '12');
    const refresh = searchParams.get('refresh') === 'true';
    
    // Create a cache key based on parameters
    const cacheParams = `page=${page}&pageSize=${pageSize}`;
    const now = Date.now();
    
    // Return cached response if available and not stale
    // if (
    //   !refresh && 
    //   responseCache &&
    //   responseCache.params === cacheParams &&
    //   (now - responseCache.timestamp) < MS.CACHE_DURATION
    // ) {
    //   console.log('Returning cached stories response');
    //   return NextResponse.json({
    //     stories: sanitizeStories(responseCache.stories),
    //     pagination: {
    //       currentPage: page,
    //       pageSize,
    //       hasMore: responseCache.stories.length === pageSize
    //     },
    //     apiStatus: { success: true, message: "Using cached data" }
    //   });
    // }

    // Get story manager
    const storyManager = await getStoryManager();
    
    // Get stories with pagination
    const stories = await storyManager.getStories({ page, pageSize });
    
    // Only fetch from NewsAPI if we need to refresh or don't have enough stories
    let apiStatus = { success: true, message: null };
    
    // Check if database-only mode is enabled
    // Check if database-only mode is enabled
    if (isDatabaseOnlyMode()) {
      logApiInfo('Database-only mode active. Skipping NewsAPI fetch.');
      
      // Get stories directly from database without attempting API calls
      const storyManager = await getStoryManager();
      const stories = await storyManager.getStories({ page, pageSize });

      // Return a special apiStatus for database-only mode
      return NextResponse.json({
        stories: sanitizeStories(stories),
        pagination: {
          currentPage: page,
          pageSize,
          hasMore: stories.length === pageSize
        },
        apiStatus: { 
          success: true, // Mark as successful to avoid error toasts
          message: 'Database-only mode is enabled',
          mode: 'database-only'
        }
      });
    }
    else if (refresh || stories.length < pageSize) {
      try {
        logApiInfo('Fetching fresh stories from NewsAPI...');
        
        // Fetch latest news
        const response = await fetch(
          `https://newsapi.org/v2/top-headlines?` + 
          new URLSearchParams({
            sources: getEnabledSources().join(','),
            from: getArticleAgeLimit(), // Use the date limit from config
            pageSize: '100',
            apiKey: process.env.NEWS_API_KEY || ''
          })
        );

        // Handle rate limiting and other errors
        if (!response.ok) {
          // Set API status for response
          apiStatus = { 
            success: false, 
            message: `NewsAPI request failed: ${response.status} ${response.statusText}` 
          };
          
          if (response.status === 429) {
            console.log('NewsAPI rate limit exceeded. Using existing database content.');
          } else {
            console.error(`NewsAPI error: ${response.status} ${response.statusText}`);
          }
          
          // Continue with existing data instead of throwing error
        } else {
          // Process API response if successful
          const newsData = await response.json();
          
          if (newsData.articles && newsData.articles.length > 0) {
            console.log(`Retrieved ${newsData.articles.length} articles from NewsAPI`);
            
            // Process articles in background
            processArticlesInBackground(storyManager, newsData.articles);
            
            // If refresh was requested, wait a moment for processing to start
            if (refresh) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              // Get refreshed stories
              const refreshedStories = await storyManager.getStories({ page, pageSize });
              
              // Update cache
              responseCache = {
                stories: refreshedStories,
                timestamp: now,
                params: cacheParams
              };
              
              return NextResponse.json({
                stories: sanitizeStories(refreshedStories),
                pagination: {
                  currentPage: page,
                  pageSize,
                  hasMore: refreshedStories.length === pageSize
                },
                apiStatus
              });
            }
          } else {
            console.log('No new articles found from NewsAPI');
          }
        }
      } catch (error) {
        // Handle any exceptions during API fetch without failing the whole request
        console.error('Error fetching from NewsAPI:', error);
        apiStatus = { 
          success: false, 
          message: `Error connecting to NewsAPI: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
        // Continue with existing database content
      }
    }
    
    // Check if we should include any priority topics (like Sudan)
    const priorityTopics = CONTENT_PREFERENCES?.priorityTopics || [];
    if (priorityTopics.length > 0 && page === 1) {
      // We'll try to incorporate priority topics in the first page
      const storiesWithPriorities = await storyManager.incorporatePriorityTopics(
        stories, 
        priorityTopics
      );
      
      // Ensure we have no duplicates after incorporating priorities
      const dedupedStories = removeDuplicateStories(storiesWithPriorities);
      
      // Update cache
      responseCache = {
        stories: dedupedStories,
        timestamp: now,
        params: cacheParams
      };
      
      // Return response
      return NextResponse.json({
        stories: sanitizeStories(dedupedStories),
        pagination: {
          currentPage: page,
          pageSize,
          hasMore: stories.length >= pageSize // If we had enough stories originally, there are likely more
        },
        apiStatus
      });
    }
    
    // Ensure we have no duplicates
    const dedupedStories = removeDuplicateStories(stories);
    
    // Update cache
    responseCache = {
      stories: dedupedStories,
      timestamp: now,
      params: cacheParams
    };
    
    // Return response
    return NextResponse.json({
      stories: sanitizeStories(dedupedStories),
      pagination: {
        currentPage: page,
        pageSize,
        hasMore: stories.length === pageSize
      },
      apiStatus
    });
  } catch (error) {
    console.error('API Route: Failed to fetch or process news:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch news',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Process articles in background
async function processArticlesInBackground(storyManager: any, articles: any[]) {
  try {
    // This now uses the correct method name
    await storyManager.processRawArticles(articles);
  } catch (error) {
    console.error('Background processing error:', error);
  }
}

// Function to remove duplicate stories based on ID
function removeDuplicateStories(stories: Story[]): Story[] {
  const seen = new Set<string>();
  return stories.filter(story => {
    if (seen.has(story.id)) {
      return false; // Skip this duplicate
    }
    seen.add(story.id);
    return true;
  });
}

// Ensure stories have all required fields and convert dates to strings
function sanitizeStories(stories: any[]): Story[] {
  return stories.map(story => ({
    id: story.id || `story-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    title: story.title || 'Untitled Story',
    summary: story.summary || '',
    content: story.content || '',
    sources: Array.isArray(story.sources) ? story.sources : [],
    metadata: {
      firstPublished: story.metadata?.firstPublished || new Date(),
      lastUpdated: story.metadata?.lastUpdated || new Date(),
      totalSources: story.metadata?.totalSources || (Array.isArray(story.sources) ? story.sources.length : 0),
      categories: Array.isArray(story.metadata?.categories) ? story.metadata.categories : [],
      latestDevelopment: story.metadata?.latestDevelopment || '',
      imageUrl: story.metadata?.imageUrl || undefined
    },
    analysis: {
      summary: story.analysis?.summary || '',
      backgroundContext: story.analysis?.backgroundContext || '',
      keyPoints: Array.isArray(story.analysis?.keyPoints) ? story.analysis.keyPoints : [],
      mainPerspectives: Array.isArray(story.analysis?.mainPerspectives) ? story.analysis.mainPerspectives : [],
      controversialPoints: Array.isArray(story.analysis?.controversialPoints) ? story.analysis.controversialPoints : [],
      perspectives: Array.isArray(story.analysis?.perspectives) ? story.analysis.perspectives : [],
      implications: {
        shortTerm: Array.isArray(story.analysis?.implications?.shortTerm) ? story.analysis.implications.shortTerm : [],
        longTerm: Array.isArray(story.analysis?.implications?.longTerm) ? story.analysis.implications.longTerm : []
      },
      notableQuotes: Array.isArray(story.analysis?.notableQuotes) ? story.analysis.notableQuotes : [],
      timeline: Array.isArray(story.analysis?.timeline) ? story.analysis.timeline : [],
      relatedTopics: Array.isArray(story.analysis?.relatedTopics) ? story.analysis.relatedTopics : []
    }
  }));
}
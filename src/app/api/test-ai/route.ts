// src/app/api/test-ai/route.ts
import { NextResponse } from 'next/server';
import { getStoryManager } from '@/lib/services';
import { getOptimizedAIService } from '@/lib/services/ai/optimized-service';
import { AICacheService } from '@/lib/services/ai/cache-service';

export async function GET() {
  try {
    const storyManager = await getStoryManager();
    const aiService = getOptimizedAIService();
    const cacheService = AICacheService.getInstance();

    // Test story
    const testStory = {
      id: 'test-1',
      title: 'USAID officials put on leave as Elon Musk says time for agency to die',
      summary: 'Elon Musk called USAID a criminal organization that should "die." Proponents say it\'s a key arm of U.S. influence that, if destroyed, "cannot be easily rebuilt."',
      content: 'USAID Director for Security John Vorhees and Deputy Director for Security Brian McGill were put on leave last night, two sources confirmed to CBS News.',
      sources: [{
        id: 'cbs-news',
        name: 'CBS News',
        url: 'https://www.cbsnews.com/test',
        bias: 0,
        sentiment: 0
      }],
      metadata: {
        firstPublished: new Date(),
        lastUpdated: new Date(),
        totalSources: 1,
        categories: [],
      },
      analysis: {
        summary: '',
        backgroundContext: '',
        keyPoints: [],
        mainPerspectives: [],
        controversialPoints: [],
        perspectives: [],
        implications: {
          shortTerm: [],
          longTerm: []
        },
        notableQuotes: [],
        timeline: [],
        relatedTopics: []
      }
    };

    // Test the optimized AI analysis
    console.log('Testing optimized AI analysis...');
    const startTime = Date.now();
    const analysis = await aiService.analyzeStoryGroup([testStory]);
    const duration = Date.now() - startTime;

    // Get cache stats
    const cacheStats = cacheService.getCacheStats();
    
    return NextResponse.json({
      success: true,
      analysis,
      performance: {
        duration: `${duration}ms`,
        cacheStats
      }
    });
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
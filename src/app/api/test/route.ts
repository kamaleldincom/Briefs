// src/app/api/test/route.ts
import { NextResponse } from 'next/server';
import { getStoryManager } from '@/lib/services';
import { AIServiceImpl } from '@/lib/services/ai';

export async function GET() {
  try {
    const storyManager = await getStoryManager();
    const aiService = new AIServiceImpl();

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
        keyPoints: [],
        mainPerspectives: [],
        controversialPoints: [],
        notableQuotes: [],
        timeline: []
      }
    };

    // Test AI analysis
    console.log('Testing AI analysis...');
    const analysis = await aiService.analyzeStoryGroup([testStory]);
    
    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
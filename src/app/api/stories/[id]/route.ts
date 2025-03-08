// src/app/api/stories/[id]/route.ts
// Create this file to provide a consistent API for fetching a single story with complete data

import { NextRequest, NextResponse } from 'next/server';
import { getStoryManager } from '@/lib/services';
import { MongoDBStorage } from '@/lib/services/storage/mongodb-storage';
import { getOptimizedAIService } from '@/lib/services/ai/optimized-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storyId = params.id;
    const storyManager = await getStoryManager();
    const storage = new MongoDBStorage();
    await storage.initialize();
    
    // Get the basic story
    const story = await storyManager.getStoryById(storyId);
    
    if (!story) {
      return NextResponse.json(
        { error: 'Story not found' },
        { status: 404 }
      );
    }
    
    // Get story links and raw articles to ensure we have the complete picture
    const storyLinks = await storage.getStoryLinks(storyId);
    const rawArticles = await storage.getRawArticlesByStoryId(storyId);
    
    // Ensure the story has an analysis
    // If it doesn't have a proper analysis, try to generate one
    const needsAnalysis = (
      !story.analysis?.summary || 
      (story.analysis.keyPoints?.length === 0 && story.sources.length > 1)
    );
    
    let enhancedStory = { ...story };
    
    if (needsAnalysis && rawArticles.length > 0 && process.env.OPENAI_API_KEY) {
      try {
        console.log('Generating analysis for story:', storyId);
        const aiService = getOptimizedAIService();
        const analysis = await aiService.analyzeStoryGroup([story]);
        
        // Update the story with the new analysis
        enhancedStory = {
          ...story,
          analysis: {
            ...story.analysis,
            ...analysis
          }
        };
        
        // Save the updated analysis to the database asynchronously
        // We don't need to wait for this to complete
        storage.updateStory(storyId, {
          analysis: enhancedStory.analysis
        }).catch(err => {
          console.error('Error saving enhanced analysis:', err);
        });
      } catch (error) {
        console.error('Error generating analysis:', error);
        // Just continue with the existing analysis
      }
    }
    
    // Convert any timeline dates to proper Date objects
    if (enhancedStory.analysis?.timeline) {
      enhancedStory.analysis.timeline = enhancedStory.analysis.timeline.map(event => ({
        ...event,
        timestamp: event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp)
      }));
    }
    
    // Ensure consistent format for all fields
    const normalizedStory = normalizeStoryStructure(enhancedStory);
    
    return NextResponse.json(normalizedStory);
  } catch (error) {
    console.error('Error fetching story:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story' },
      { status: 500 }
    );
  }
}

// Helper function to ensure consistent story structure
function normalizeStoryStructure(story: any) {
  return {
    ...story,
    analysis: {
      summary: story.analysis?.summary || '',
      backgroundContext: story.analysis?.backgroundContext || '',
      keyPoints: ensureKeyPointsFormat(story.analysis?.keyPoints || []),
      mainPerspectives: story.analysis?.mainPerspectives || [],
      controversialPoints: story.analysis?.controversialPoints || [],
      perspectives: story.analysis?.perspectives || [],
      implications: {
        shortTerm: story.analysis?.implications?.shortTerm || [],
        longTerm: story.analysis?.implications?.longTerm || []
      },
      notableQuotes: story.analysis?.notableQuotes || [],
      timeline: story.analysis?.timeline || [],
      relatedTopics: story.analysis?.relatedTopics || []
    }
  };
}

// Helper function to normalize key points to the same format
function ensureKeyPointsFormat(keyPoints: any[]): { point: string; importance: string; context?: string }[] {
  return keyPoints.map(kp => {
    if (typeof kp === 'string') {
      return { point: kp, importance: 'medium' };
    } else if (typeof kp === 'object') {
      return {
        point: kp.point || 'Unknown point',
        importance: kp.importance || 'medium',
        context: kp.context
      };
    }
    return { point: 'Unknown point', importance: 'medium' };
  });
}
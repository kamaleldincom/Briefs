// src/lib/services/ai/index.ts
import OpenAI from 'openai';
import { CONFIG } from '@/lib/config';
import { ANALYSIS_PROMPTS } from './prompts';
import { AIAnalysisResult, SimilarityAnalysis } from './types';
import { Story, StoryAnalysis } from '@/lib/types';
import { calculateSimilarity } from '@/lib/utils';

export class AIServiceImpl {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async findSimilarStories(story: Story, candidates: Story[]): Promise<Story[]> {
    const similarStories: Story[] = [];
    
    for (const candidate of candidates) {
      if (candidate.id === story.id) continue;

      // Enhanced similarity check using both title and summary
      const titleSimilarity = calculateSimilarity(story.title, candidate.title);
      const summarySimilarity = calculateSimilarity(story.summary || '', candidate.summary || '');
      
      // If either title or summary is similar enough, do deep analysis
      if (titleSimilarity > 0.25 || summarySimilarity > 0.3) {
        try {
          // Log similarity scores for debugging
          console.log('Checking similarity:', {
            story1: story.title,
            story2: candidate.title,
            titleSimilarity,
            summarySimilarity
          });

          const analysis = await this.analyzeSimilarity(story, candidate);
          
          if (analysis.isSimilar && analysis.confidenceScore > 0.6) {
            console.log('Found similar story:', {
              title: candidate.title,
              confidenceScore: analysis.confidenceScore,
              reasons: analysis.reasonings
            });
            similarStories.push(candidate);
          }
        } catch (error) {
          console.error('Error in similarity analysis:', error);
          // Fallback to basic similarity if AI fails
          if (titleSimilarity > 0.4 || summarySimilarity > 0.4) {
            similarStories.push(candidate);
          }
        }
      }
    }
    
    return similarStories;
  }

  private async analyzeSimilarity(story1: Story, story2: Story): Promise<SimilarityAnalysis> {
    try {
      const response = await this.openai.chat.completions.create({
        model: CONFIG.aiModel,
        messages: [
          {
            role: "system",
            content: ANALYSIS_PROMPTS.storySimilarity
          },
          {
            role: "user",
            content: `Story 1:
Title: ${story1.title}
Summary: ${story1.summary}
Content: ${story1.content}

Story 2:
Title: ${story2.title}
Summary: ${story2.summary}
Content: ${story2.content}`
          }
        ]
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        isSimilar: result.isSimilar || false,
        confidenceScore: result.confidenceScore || 0,
        reasonings: result.reasonings || []
      };
    } catch (error) {
      console.error('Error in similarity analysis:', error);
      return { isSimilar: false, confidenceScore: 0, reasonings: [] };
    }
  }

  async analyzeStoryGroup(stories: Story[]): Promise<AIAnalysisResult> {
    try {
      const combinedContent = stories.map(story => ({
        title: story.title,
        content: story.content,
        summary: story.summary,
        source: story.sources[0].name,
        timestamp: story.metadata.firstPublished,
        url: story.sources[0].url
      }));

      const response = await this.openai.chat.completions.create({
        model: CONFIG.aiModel,
        messages: [
          {
            role: "system",
            content: ANALYSIS_PROMPTS.storyAnalysis
          },
          {
            role: "user",
            content: JSON.stringify(combinedContent)
          }
        ]
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Ensure proper date objects and string significances in timeline
      const timeline = analysis.timeline.map((entry: any) => ({
        timestamp: new Date(entry.timestamp),
        event: entry.event,
        significance: String(entry.significance || ''), // Convert to string
        sources: entry.sources
      }));

      // Ensure proper structure for notableQuotes
      const notableQuotes = analysis.notableQuotes.map((quote: any) => ({
        text: quote.text,
        source: quote.source,
        context: quote.context || undefined,
        significance: quote.significance || undefined
      }));

      return {
        summary: analysis.summary || '',
        keyPoints: analysis.keyPoints || [],
        mainPerspectives: analysis.mainPerspectives || [],
        controversialPoints: analysis.controversialPoints || [],
        perspectives: analysis.perspectives,
        notableQuotes,
        timeline
      };
    } catch (error) {
      console.error('Error in story group analysis:', error);
      throw error;
    }
  }

  async updateStoryAnalysis(story: Story, newContent: Story): Promise<StoryAnalysis> {
    try {
      const currentAnalysis = story.analysis;
      const combinedContent = {
        existing: {
          title: story.title,
          content: story.content,
          analysis: currentAnalysis,
          sources: story.sources
        },
        new: {
          title: newContent.title,
          content: newContent.content,
          source: newContent.sources[0].name,
          timestamp: newContent.metadata.firstPublished,
          url: newContent.sources[0].url
        }
      };

      const response = await this.openai.chat.completions.create({
        model: CONFIG.aiModel,
        messages: [
          {
            role: "system",
            content: ANALYSIS_PROMPTS.updateAnalysis
          },
          {
            role: "user",
            content: JSON.stringify(combinedContent)
          }
        ]
      });

      const updatedAnalysis = JSON.parse(response.choices[0].message.content || '{}');
      
      // Ensure timeline entries have proper structure
      const combinedTimeline = [...currentAnalysis.timeline, ...updatedAnalysis.timeline]
        .map(entry => ({
          timestamp: new Date(entry.timestamp),
          event: entry.event,
          significance: String(entry.significance || ''),
          sources: entry.sources
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return {
        summary: updatedAnalysis.summary || currentAnalysis.summary,
        keyPoints: [...new Set([...(updatedAnalysis.keyPoints || []), ...currentAnalysis.keyPoints])],
        mainPerspectives: [...new Set([...(updatedAnalysis.mainPerspectives || []), ...currentAnalysis.mainPerspectives])],
        controversialPoints: [...new Set([...(updatedAnalysis.controversialPoints || []), ...currentAnalysis.controversialPoints])],
        perspectives: updatedAnalysis.perspectives || currentAnalysis.perspectives,
        notableQuotes: [
          ...(updatedAnalysis.notableQuotes || []),
          ...currentAnalysis.notableQuotes
        ],
        timeline: combinedTimeline
      };
    } catch (error) {
      console.error('Error updating story analysis:', error);
      return story.analysis;
    }
  }
}
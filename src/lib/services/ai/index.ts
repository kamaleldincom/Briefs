// src/lib/services/ai/index.ts
import OpenAI from 'openai';
import { CONFIG } from '@/lib/config';
import { ANALYSIS_PROMPTS } from './prompts';
import { AIAnalysisResult, SimilarityAnalysis } from './types';
import { Story, StoryAnalysis } from '@/lib/types';
import { calculateSimilarity } from '@/lib/utils';

export class AIServiceImpl {
  private openai: OpenAI;
  private similarityCache: Map<string, SimilarityAnalysis> = new Map();
  private entityCache: Map<string, string[]> = new Map();
  
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
          // Generate cache key for these two stories
          const cacheKey = this.generateCacheKey(story, candidate);
          
          // Check cache first
          let analysis: SimilarityAnalysis;
          if (this.similarityCache.has(cacheKey)) {
            analysis = this.similarityCache.get(cacheKey)!;
            console.log('Using cached similarity analysis');
          } else {
            // Log similarity scores for debugging
            console.log('Checking similarity:', {
              story1: story.title,
              story2: candidate.title,
              titleSimilarity,
              summarySimilarity
            });

            analysis = await this.analyzeSimilarity(story, candidate);
            
            // Cache the result
            this.similarityCache.set(cacheKey, analysis);
            
            // Limit cache size to prevent memory issues
            if (this.similarityCache.size > 1000) {
              const oldestKey = this.similarityCache.keys().next().value;
              this.similarityCache.delete(oldestKey);
            }
          }
          
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

  private generateCacheKey(story1: Story, story2: Story): string {
    // Sort IDs to ensure consistency regardless of order
    const ids = [story1.id, story2.id].sort();
    return ids.join('_');
  }

  private async analyzeSimilarity(story1: Story, story2: Story): Promise<SimilarityAnalysis> {
    try {
      // Extract entities to enhance matching
      const entities1 = await this.extractEntities(story1.title + " " + story1.summary);
      const entities2 = await this.extractEntities(story2.title + " " + story2.summary);
      
      // Enhance the prompt with entity information
      const enhancedPrompt = `${ANALYSIS_PROMPTS.storySimilarity}
      
Entity analysis:
Story 1 entities: ${entities1.join(', ')}
Story 2 entities: ${entities2.join(', ')}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo-0125", // Use a smaller, faster model for similarity checking
        messages: [
          {
            role: "system",
            content: enhancedPrompt
          },
          {
            role: "user",
            content: `Story 1:
Title: ${story1.title}
Summary: ${story1.summary}
Content: ${story1.content?.substring(0, 300) || ''}

Story 2:
Title: ${story2.title}
Summary: ${story2.summary}
Content: ${story2.content?.substring(0, 300) || ''}

Please determine if these stories are about the same event or news topic.
Consider the entities, timing, locations, and overall subject matter.`
          }
        ]
      });

      // Try to parse JSON response, with fallback handling
      try {
        const result = JSON.parse(response.choices[0].message.content || '{}');
        return {
          isSimilar: result.isSimilar || false,
          confidenceScore: result.confidenceScore || 0,
          reasonings: result.reasonings || []
        };
      } catch (jsonError) {
        // Parse non-JSON responses
        const content = response.choices[0].message.content || '';
        const isSimilar = content.toLowerCase().includes('similar') || content.toLowerCase().includes('same topic');
        const confidenceScore = content.toLowerCase().includes('high confidence') ? 0.8 : 
                               content.toLowerCase().includes('medium confidence') ? 0.6 : 0.4;
        
        return {
          isSimilar,
          confidenceScore,
          reasonings: [content]
        };
      }
    } catch (error) {
      console.error('Error in similarity analysis:', error);
      return { isSimilar: false, confidenceScore: 0, reasonings: [] };
    }
  }
  
  // Extract entities from text with caching
  private async extractEntities(text: string): Promise<string[]> {
    if (!text || text.trim().length === 0) return [];
    
    // Create a cache key for this text (use a hash or truncated version)
    const cacheKey = text.slice(0, 100);
    
    // Check cache first
    if (this.entityCache.has(cacheKey)) {
      return this.entityCache.get(cacheKey) || [];
    }
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo-0125", // Use a smaller, faster model for entity extraction
        messages: [
          {
            role: "system",
            content: "Extract the main entities (people, organizations, locations, events) from the text. Return only a JSON array of strings, with no explanation."
          },
          {
            role: "user",
            content: text
          }
        ]
      });
      
      let entities: string[] = [];
      try {
        entities = JSON.parse(response.choices[0].message.content || '[]');
      } catch (jsonError) {
        // Fallback parsing if AI doesn't return valid JSON
        const content = response.choices[0].message.content || '';
        entities = content.split(',').map(entity => entity.trim());
      }
      
      // Store in cache
      this.entityCache.set(cacheKey, entities);
      
      // Limit cache size
      if (this.entityCache.size > 1000) {
        const oldestKey = this.entityCache.keys().next().value;
        this.entityCache.delete(oldestKey);
      }
      
      return entities;
    } catch (error) {
      console.error('Error extracting entities:', error);
      return [];
    }
  }

  async analyzeStoryGroup(stories: Story[]): Promise<AIAnalysisResult> {
    try {
      // Create a cache key based on the story ids
      const cacheKey = `analysis_${stories.map(s => s.id).join('_')}`;
      const cachedResult = typeof localStorage !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      
      // Check cache first (if available in browser environment)
      if (cachedResult && typeof window !== 'undefined') {
        try {
          const parsedCache = JSON.parse(cachedResult);
          // Verify the cached result has required fields
          if (parsedCache.summary && parsedCache.timeline) {
            console.log('Using cached analysis result');
            return parsedCache;
          }
        } catch (e) {
          console.warn('Cache parsing error:', e);
          // Continue with fresh analysis
        }
      }
      
      const combinedContent = stories.map(story => ({
        title: story.title,
        content: story.content,
        summary: story.summary,
        source: story.sources[0]?.name || 'Unknown',
        timestamp: story.metadata.firstPublished,
        url: story.sources[0]?.url || ''
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

      let analysis;
      try {
        analysis = JSON.parse(response.choices[0].message.content || '{}');
      } catch (jsonError) {
        console.error('Error parsing AI response:', jsonError);
        analysis = {
          summary: response.choices[0].message.content || 'Analysis not available',
        };
      }
      
      // Ensure proper date objects and string significances in timeline
      const timeline = analysis.timeline ? analysis.timeline.map((entry: any) => ({
        timestamp: new Date(entry.timestamp),
        event: entry.event,
        significance: String(entry.significance || ''), // Convert to string
        sources: entry.sources || []
      })) : [];

      // Ensure proper structure for notableQuotes
      const notableQuotes = analysis.notableQuotes ? analysis.notableQuotes.map((quote: any) => ({
        text: quote.text,
        source: quote.source,
        context: quote.context || undefined,
        significance: quote.significance || undefined
      })) : [];

      // Process key points to ensure consistent structure
      const keyPoints = analysis.keyPoints ? analysis.keyPoints.map((point: any) => {
        if (typeof point === 'string') {
          return { 
            point, 
            importance: 'medium',
            context: undefined
          };
        } else if (typeof point === 'object') {
          return {
            point: point.point || 'Unknown point',
            importance: point.importance || 'medium',
            context: point.context
          };
        }
        return point;
      }) : [];

      const result = {
        summary: analysis.summary || '',
        backgroundContext: analysis.backgroundContext || '',
        keyPoints,
        mainPerspectives: analysis.mainPerspectives || [],
        controversialPoints: analysis.controversialPoints || [],
        perspectives: analysis.perspectives || [],
        implications: {
          shortTerm: analysis.implications?.shortTerm || [],
          longTerm: analysis.implications?.longTerm || []
        },
        notableQuotes,
        timeline,
        relatedTopics: analysis.relatedTopics || []
      };

      // Store in cache for future use (if in browser)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        } catch (e) {
          console.warn('Cache storage error:', e);
        }
      }

      return result;
    } catch (error) {
      console.error('Error in story group analysis:', error);
      // Return minimal valid response instead of throwing
      return {
        summary: 'Analysis temporarily unavailable.',
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
      };
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
          source: newContent.sources[0]?.name || 'Unknown',
          timestamp: newContent.metadata.firstPublished,
          url: newContent.sources[0]?.url || ''
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

      let updatedAnalysis;
      try {
        updatedAnalysis = JSON.parse(response.choices[0].message.content || '{}');
      } catch (jsonError) {
        console.error('Error parsing AI response:', jsonError);
        // Return existing analysis if parsing fails
        return currentAnalysis;
      }
      
      // Ensure timeline entries have proper structure
      const combinedTimeline = [...(currentAnalysis.timeline || []), ...(updatedAnalysis.timeline || [])]
        .map(entry => ({
          timestamp: new Date(entry.timestamp),
          event: entry.event,
          significance: String(entry.significance || ''),
          sources: entry.sources || []
        }))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Process key points to ensure consistent structure
      const keyPoints = [...(currentAnalysis.keyPoints || []), ...(updatedAnalysis.keyPoints || [])].map(point => {
        if (typeof point === 'string') {
          return { 
            point, 
            importance: 'medium',
            context: undefined
          };
        } else if (typeof point === 'object') {
          return {
            point: point.point || 'Unknown point',
            importance: point.importance || 'medium',
            context: point.context
          };
        }
        return point;
      });

      return {
        summary: updatedAnalysis.summary || currentAnalysis.summary || '',
        backgroundContext: updatedAnalysis.backgroundContext || currentAnalysis.backgroundContext || '',
        keyPoints,
        mainPerspectives: [...new Set([...(updatedAnalysis.mainPerspectives || []), ...(currentAnalysis.mainPerspectives || [])])],
        controversialPoints: [...new Set([...(updatedAnalysis.controversialPoints || []), ...(currentAnalysis.controversialPoints || [])])],
        perspectives: updatedAnalysis.perspectives || currentAnalysis.perspectives || [],
        implications: {
          shortTerm: [...new Set([...(updatedAnalysis.implications?.shortTerm || []), ...(currentAnalysis.implications?.shortTerm || [])])],
          longTerm: [...new Set([...(updatedAnalysis.implications?.longTerm || []), ...(currentAnalysis.implications?.longTerm || [])])]
        },
        notableQuotes: [
          ...(updatedAnalysis.notableQuotes || []),
          ...(currentAnalysis.notableQuotes || [])
        ],
        timeline: combinedTimeline,
        relatedTopics: [...new Set([...(updatedAnalysis.relatedTopics || []), ...(currentAnalysis.relatedTopics || [])])]
      };
    } catch (error) {
      console.error('Error updating story analysis:', error);
      return story.analysis;
    }
  }
}
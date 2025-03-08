// src/lib/services/ai/optimized-service.ts
import OpenAI from 'openai';
import { CONFIG } from '@/lib/config';
import { OPTIMIZED_PROMPTS } from './optimized-prompts';
import { AIAnalysisResult, SimilarityAnalysis } from './types';
import { Story, StoryAnalysis } from '@/lib/types';
import { calculateSimilarity } from '@/lib/utils';
import { AICacheService } from './cache-service';

// Analysis complexity levels for tiered processing
type AnalysisComplexity = 'minimal' | 'standard' | 'comprehensive';

export class OptimizedAIService {
  private openai: OpenAI;
  private cacheService: AICacheService;
  private similarityCache: Map<string, SimilarityAnalysis> = new Map();
  private entityCache: Map<string, string[]> = new Map();
  private apiCallsCount: number = 0;
  private lastResetTime: number = Date.now();
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.cacheService = AICacheService.getInstance();
  }

  /**
   * Track API calls and reset counter periodically
   */
  private trackApiCall(): void {
    this.apiCallsCount++;
    
    // Reset counter every hour
    const now = Date.now();
    if (now - this.lastResetTime > 60 * 60 * 1000) {
      console.log(`AI API calls in the last hour: ${this.apiCallsCount}`);
      this.apiCallsCount = 0;
      this.lastResetTime = now;
    }
  }

  /**
   * Find stories similar to the input story
   */
  async findSimilarStories(story: Story, candidates: Story[]): Promise<Story[]> {
    const similarStories: Story[] = [];
    
    for (const candidate of candidates) {
      if (candidate.id === story.id) continue;

      // Enhanced similarity check using both title and summary
      const titleSimilarity = calculateSimilarity(story.title, candidate.title);
      const summarySimilarity = calculateSimilarity(story.summary || '', candidate.summary || '');
      
      // If either title or summary is similar enough, proceed with detailed analysis
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

            // Only use AI for borderline cases to reduce API calls
            if (titleSimilarity > 0.4 || summarySimilarity > 0.4) {
              // Clear case of similarity, skip expensive AI analysis
              analysis = {
                isSimilar: true,
                confidenceScore: Math.max(titleSimilarity, summarySimilarity),
                reasonings: [`High text similarity: title=${titleSimilarity.toFixed(2)}, summary=${summarySimilarity.toFixed(2)}`]
              };
            } else {
              // Borderline case, use AI
              analysis = await this.analyzeSimilarity(story, candidate);
            }
            
            // Cache the result
            this.similarityCache.set(cacheKey, analysis);
            
            // Limit cache size to prevent memory issues
            if (this.similarityCache.size > 100) {
              const oldestKey = this.similarityCache.keys().next().value;
              this.similarityCache.delete(oldestKey);
            }
          }
          
          // Include stories with high enough confidence
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

  /**
   * Generate a cache key for two stories
   */
  private generateCacheKey(story1: Story, story2: Story): string {
    // Sort IDs to ensure consistency regardless of order
    const ids = [story1.id, story2.id].sort();
    return ids.join('_');
  }

  /**
   * Analyze similarity between two stories
   */
  private async analyzeSimilarity(story1: Story, story2: Story): Promise<SimilarityAnalysis> {
    try {
      // Extract entities to enhance matching
      const entities1 = await this.extractEntities(story1.title + " " + story1.summary);
      const entities2 = await this.extractEntities(story2.title + " " + story2.summary);
      
      // Enhance the prompt with entity information
      const enhancedPrompt = `${OPTIMIZED_PROMPTS.storySimilarity}
      
Entity analysis:
Story 1 entities: ${entities1.join(', ')}
Story 2 entities: ${entities2.join(', ')}`;

      this.trackApiCall();
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

Story 2:
Title: ${story2.title}
Summary: ${story2.summary}

Are these about the same event/topic?`
          }
        ],
        temperature: 0.2 // Lower temperature for more consistent results
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
  
  /**
   * Extract entities from text with caching
   */
  private async extractEntities(text: string): Promise<string[]> {
    if (!text || text.trim().length === 0) return [];
    
    // Create a cache key for this text (use a hash or truncated version)
    const cacheKey = text.slice(0, 100);
    
    // Check cache first
    if (this.entityCache.has(cacheKey)) {
      return this.entityCache.get(cacheKey) || [];
    }
    
    try {
      this.trackApiCall();
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
        ],
        temperature: 0.1,
        max_tokens: 200 // Keep response short
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
      if (this.entityCache.size > 500) {
        const oldestKey = this.entityCache.keys().next().value;
        this.entityCache.delete(oldestKey);
      }
      
      return entities;
    } catch (error) {
      console.error('Error extracting entities:', error);
      return [];
    }
  }

  /**
   * Determine the appropriate analysis complexity level based on story and context
   */
  private determineAnalysisComplexity(stories: Story[], isUpdate: boolean = false): AnalysisComplexity {
    // For updates to existing stories, use a lighter analysis
    if (isUpdate) {
      return 'minimal';
    }
    
    // For stories with many sources, use comprehensive analysis
    if (stories.some(s => s.sources.length > 3)) {
      return 'comprehensive';
    }
    
    // For stories with controversial topics or clear evidence of differing viewpoints
    if (this.hasControversialIndications(stories)) {
      return 'comprehensive';
    }
    
    // Default to standard analysis
    return 'standard';
  }
  
  /**
   * Check if stories have indications of controversy
   */
  private hasControversialIndications(stories: Story[]): boolean {
    const controversialTerms = [
      'controversy', 'dispute', 'debate', 'disagree', 'conflict', 
      'opposing', 'critics', 'versus', 'vs', 'clash'
    ];
    
    // Check titles and summaries for controversial terms
    for (const story of stories) {
      const content = `${story.title} ${story.summary}`.toLowerCase();
      if (controversialTerms.some(term => content.includes(term))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Analyze a group of stories with optimized prompts and caching
   */
  async analyzeStoryGroup(stories: Story[]): Promise<AIAnalysisResult> {
    try {
      // Create a cache key based on the story ids and modification times
      const storyIds = stories.map(s => s.id);
      
      // Check cache first
      const cachedResult = this.cacheService.getCachedAnalysis(storyIds);
      if (cachedResult) {
        console.log('Using cached analysis result');
        return cachedResult;
      }
      
      // Determine the appropriate analysis complexity
      const complexity = this.determineAnalysisComplexity(stories);
      console.log(`Using ${complexity} analysis for stories:`, storyIds);
      
      // Prepare story content based on complexity
      const combinedContent = stories.map(story => {
        if (complexity === 'minimal') {
          // For minimal analysis, just send essential data
          return {
            title: story.title,
            summary: story.summary,
            source: story.sources[0]?.name || 'Unknown',
            timestamp: story.metadata.firstPublished
          };
        } else {
          // For standard/comprehensive, send more data
          return {
            title: story.title,
            content: complexity === 'comprehensive' ? story.content : undefined,
            summary: story.summary,
            source: story.sources[0]?.name || 'Unknown',
            timestamp: story.metadata.firstPublished,
            url: story.sources[0]?.url || '',
            otherSources: story.sources.slice(1).map(s => s.name)
          };
        }
      });

      // Select the appropriate prompt based on complexity
      const prompt = complexity === 'minimal' 
        ? OPTIMIZED_PROMPTS.efficientAnalysis 
        : OPTIMIZED_PROMPTS.storyAnalysis;
      
      this.trackApiCall();
      const response = await this.openai.chat.completions.create({
        model: complexity === 'comprehensive' ? CONFIG.aiModel : "gpt-3.5-turbo-0125",
        messages: [
          {
            role: "system",
            content: prompt
          },
          {
            role: "user",
            content: JSON.stringify(combinedContent)
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent results
        max_tokens: complexity === 'minimal' ? 800 : 1500 // Adjust token limit based on complexity
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
      
      // Process the analysis into a consistent format
      const result = this.processAnalysisResult(analysis);
      
      // Cache the result for future use
      this.cacheService.cacheAnalysis(storyIds, result);

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

  /**
   * Process the raw analysis result into a consistent format
   */
  private processAnalysisResult(analysis: any): AIAnalysisResult {
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

    return {
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
  }

  /**
   * Update an existing story analysis with new content
   */
  async updateStoryAnalysis(story: Story, newContent: Story): Promise<StoryAnalysis> {
    try {
      const currentAnalysis = story.analysis;
      
      // Determine if this update is significant enough to warrant AI analysis
      if (!this.isSignificantUpdate(story, newContent)) {
        console.log('Update not significant enough for AI analysis, using existing analysis');
        return currentAnalysis;
      }
      
      // Prepare update-focused content
      const updateContent = {
        existing: {
          title: story.title,
          analysis: {
            summary: currentAnalysis.summary,
            keyPoints: currentAnalysis.keyPoints.map(kp => 
              typeof kp === 'string' ? kp : kp.point
            ).slice(0, 3) // Keep it minimal
          }
        },
        new: {
          title: newContent.title,
          content: newContent.content,
          source: newContent.sources[0]?.name || 'Unknown',
          timestamp: newContent.metadata.firstPublished,
          description: newContent.summary
        }
      };

      this.trackApiCall();
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo-0125", // Use faster model for updates
        messages: [
          {
            role: "system",
            content: OPTIMIZED_PROMPTS.updateAnalysis
          },
          {
            role: "user",
            content: JSON.stringify(updateContent)
          }
        ],
        temperature: 0.3,
        max_tokens: 800 // Keep response shorter for updates
      });

      let updatedAnalysis;
      try {
        updatedAnalysis = JSON.parse(response.choices[0].message.content || '{}');
      } catch (jsonError) {
        console.error('Error parsing AI response:', jsonError);
        // Return existing analysis if parsing fails
        return currentAnalysis;
      }
      
      // Merge the updates with existing analysis
      const mergedAnalysis = this.mergeAnalysisUpdates(currentAnalysis, updatedAnalysis);
      
      // Invalidate cache for this story since it's been updated
      this.cacheService.invalidateCacheForStory(story.id);
      
      return mergedAnalysis;
    } catch (error) {
      console.error('Error updating story analysis:', error);
      return story.analysis;
    }
  }
  
  /**
   * Determine if a story update is significant enough to warrant AI analysis
   */
  private isSignificantUpdate(story: Story, newContent: Story): boolean {
    // If this is one of the first few sources, it's significant
    if (story.sources.length < 3) return true;
    
    // Check for breaking terms
    const breakingTerms = ['breaking', 'urgent', 'just in', 'update', 'developing'];
    const newContentText = `${newContent.title} ${newContent.summary}`.toLowerCase();
    if (breakingTerms.some(term => newContentText.includes(term))) return true;
    
    // Check time since last update
    const timeSinceUpdate = new Date().getTime() - new Date(story.metadata.lastUpdated).getTime();
    if (timeSinceUpdate > 8 * 60 * 60 * 1000) return true; // 8 hours
    
    // Check content similarity
    const newContentSummary = newContent.summary || '';
    const existingSummaries = story.sources.map(s => s.perspective || '').filter(Boolean);
    
    // If there are existing summaries, check if this one is significantly different
    if (existingSummaries.length > 0) {
      const similarityScores = existingSummaries.map(summary => 
        calculateSimilarity(summary, newContentSummary)
      );
      const maxSimilarity = Math.max(...similarityScores);
      
      // If this content is very different from existing content, it's significant
      if (maxSimilarity < 0.3) return true;
    }
    
    // Not significant enough
    return false;
  }
  
  /**
   * Merge updated analysis with existing analysis
   */
  private mergeAnalysisUpdates(currentAnalysis: StoryAnalysis, updates: any): StoryAnalysis {
    // Helper to merge arrays without duplicates
    const mergeArrays = (existing: any[], updates: any[] | undefined): any[] => {
      if (!updates || updates.length === 0) return existing;
      
      // For simple string arrays
      if (typeof existing[0] === 'string') {
        return [...new Set([...updates, ...existing])];
      }
      
      // For arrays of objects, more complex merging might be needed
      return [...updates, ...existing];
    };
    
    // Ensure timeline entries have proper structure and are sorted
    const mergedTimeline = mergeArrays(currentAnalysis.timeline || [], updates.timeline || [])
      .map(entry => ({
        timestamp: new Date(entry.timestamp),
        event: entry.event,
        significance: String(entry.significance || ''),
        sources: entry.sources || []
      }))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Process and merge key points
    const keyPoints = mergeArrays(currentAnalysis.keyPoints || [], updates.keyPoints || [])
      .map(point => {
        if (typeof point === 'string') {
          return { point, importance: 'medium', context: undefined };
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
      summary: updates.summary || currentAnalysis.summary || '',
      backgroundContext: updates.backgroundContext || currentAnalysis.backgroundContext || '',
      keyPoints,
      mainPerspectives: mergeArrays(currentAnalysis.mainPerspectives || [], updates.mainPerspectives),
      controversialPoints: mergeArrays(currentAnalysis.controversialPoints || [], updates.controversialPoints),
      perspectives: mergeArrays(currentAnalysis.perspectives || [], updates.perspectives),
      implications: {
        shortTerm: mergeArrays(currentAnalysis.implications?.shortTerm || [], updates.implications?.shortTerm),
        longTerm: mergeArrays(currentAnalysis.implications?.longTerm || [], updates.implications?.longTerm)
      },
      notableQuotes: mergeArrays(currentAnalysis.notableQuotes || [], updates.notableQuotes || []),
      timeline: mergedTimeline,
      relatedTopics: mergeArrays(currentAnalysis.relatedTopics || [], updates.relatedTopics)
    };
  }
}

// Export a singleton instance
let aiServiceInstance: OptimizedAIService | null = null;

export function getOptimizedAIService(): OptimizedAIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new OptimizedAIService();
  }
  return aiServiceInstance;
}
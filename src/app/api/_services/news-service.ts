// src/app/api/_services/news-service.ts
// This is a serverside-only version of the news service for API routes
import { NewsApiResponse, FetchStoriesParams, Story, NewsArticle, NewsSource } from '@/types/news';
import { StorageService, RawArticle, StoryArticleLink } from '@/types/database';
import { getStorageService } from '@/lib/services/storage';
import { generateId } from '@/lib/id-utils';

class ApiNewsService {
  private static instance: ApiNewsService;
  private baseUrl = 'https://newsapi.org/v2';
  private apiKey: string;
  private storage: StorageService | null = null;

  private constructor() {
    const apiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY;
    if (!apiKey) throw new Error('NEWS_API_KEY is not defined');
    this.apiKey = apiKey;
  }

  public static getInstance(): ApiNewsService {
    if (!ApiNewsService.instance) {
      ApiNewsService.instance = new ApiNewsService();
    }
    return ApiNewsService.instance;
  }

  private async getStorage(): Promise<StorageService> {
    if (!this.storage) {
      this.storage = await getStorageService();
    }
    return this.storage;
  }

  // Source bias data
  private sourceBiases: Record<string, {
    bias: 'left' | 'center' | 'right';
    reliability: number;
  }> = {
    'Reuters': { bias: 'center', reliability: 0.9 },
    'Associated Press': { bias: 'center', reliability: 0.9 },
    'BBC News': { bias: 'center', reliability: 0.85 },
    'Fox News': { bias: 'right', reliability: 0.6 },
    'CNN': { bias: 'left', reliability: 0.7 },
    // Add more sources
  };

  /**
   * Calculate source bias
   */
  private calculateSourceBias(source: NewsSource) {
    const biasData = this.sourceBiases[source.name];
    return {
      ...source,
      bias: biasData?.bias || 'center',
      reliability: biasData?.reliability || 0.7
    };
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    return Array.from(new Set(words));
  }

  /**
   * Calculate title similarity
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const keywords1 = new Set(this.extractKeywords(title1));
    const keywords2 = new Set(this.extractKeywords(title2));
    
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);
    
    return intersection.size / union.size;
  }

  /**
   * Detect article category
   */
  private detectCategory(article: NewsArticle): string {
    const keywords = this.extractKeywords(article.title + ' ' + (article.description || ''));
    
    const categoryKeywords: Record<string, string[]> = {
      'politics': ['government', 'election', 'president', 'congress', 'senate'],
      'technology': ['tech', 'apple', 'google', 'ai', 'software'],
      'business': ['market', 'economy', 'stock', 'company', 'business'],
      'science': ['research', 'study', 'scientist', 'discovery'],
      // Add more categories
    };

    let maxCategory = 'general';
    let maxScore = 0;

    for (const [category, catKeywords] of Object.entries(categoryKeywords)) {
      const score = catKeywords.filter(k => keywords.includes(k)).length;
      if (score > maxScore) {
        maxScore = score;
        maxCategory = category;
      }
    }

    return maxCategory;
  }

  /**
   * Calculate polarization
   */
  private calculatePolarization(articles: NewsArticle[]) {
    const sources = articles.map(a => this.calculateSourceBias(a.source));
    
    // Calculate source diversity and positions
    const sourcesWithStance = sources.map(source => {
      const articleContent = articles.find(a => a.source.name === source.name)?.description || '';
      return {
        ...source,
        stance: this.analyzeStance(articleContent)
      };
    });
  
    const supportingSources = sourcesWithStance.filter(s => s.stance === 'supporting');
    const opposingSources = sourcesWithStance.filter(s => s.stance === 'opposing');
    const neutralSources = sourcesWithStance.filter(s => s.stance === 'neutral');
    
    const totalSources = sourcesWithStance.length;
    const supportingPercentage = Math.round((supportingSources.length / totalSources) * 100);
    const opposingPercentage = Math.round((opposingSources.length / totalSources) * 100);
    const neutralPercentage = Math.round((neutralSources.length / totalSources) * 100);
  
    // Determine level based on ratio between supporting and opposing
    const polarizationRatio = Math.abs(supportingPercentage - opposingPercentage) / 100;
    const level = polarizationRatio > 0.7 ? 'High' : polarizationRatio > 0.3 ? 'Moderate' : 'Low';
  
    return {
      level,
      score: polarizationRatio,
      supporting: supportingPercentage,
      opposing: opposingPercentage,
      neutral: neutralPercentage,
      sourceBiases: sourcesWithStance.map(s => ({
        name: s.name,
        bias: s.stance,
        reliability: s.reliability
      })),
      contentionPoints: [],  // We'll add these with AI later
      notableStatements: []  // We'll add these with AI later
    };
  }

  /**
   * Analyze article stance
   */
  private analyzeStance(content: string): 'supporting' | 'opposing' | 'neutral' {
    const supportingKeywords = [
      'cooperation', 'agreement', 'partnership', 'support', 'assist',
      'humanitarian', 'legitimate', 'authorized', 'legal', 'bilateral'
    ];
  
    const opposingKeywords = [
      'violation', 'concern', 'condemn', 'illegal', 'threat',
      'sanctions', 'warning', 'crisis', 'escalation', 'conflict'
    ];
  
    const words = content.toLowerCase().split(/\s+/);
    const supportingCount = words.filter(word => supportingKeywords.includes(word)).length;
    const opposingCount = words.filter(word => opposingKeywords.includes(word)).length;
  
    if (Math.abs(supportingCount - opposingCount) <= 1) return 'neutral';
    return supportingCount > opposingCount ? 'supporting' : 'opposing';
  }

  /**
   * Detect source category
   */
  private detectSourceCategory(sourceName: string): 'official' | 'press' | 'analysis' {
    const officialKeywords = ['Ministry', 'Department', 'Government', 'Agency', 'Official', 'Council'];
    const analysisKeywords = ['Institute', 'Research', 'Analysis', 'Think Tank', 'Foundation', 'University'];
  
    if (officialKeywords.some(keyword => sourceName.includes(keyword))) {
      return 'official';
    }
  
    if (analysisKeywords.some(keyword => sourceName.includes(keyword))) {
      return 'analysis';
    }
  
    return 'press';
  }

  /**
   * Calculate estimated read time
   */
  private calculateReadTime(content: string): string {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  }

  /**
   * Process a new article and link it to a story
   */
  private async processArticle(article: NewsArticle): Promise<{
    rawArticle: RawArticle;
    story: Story;
    isNewStory: boolean;
  }> {
    const storage = await this.getStorage();
    
    // Check if article already exists
    const existingArticle = await storage.getRawArticleByUrl(article.url);
    if (existingArticle) {
      // If article exists and is linked to a story, return that story
      if (existingArticle.storyId) {
        const story = await storage.getStory(existingArticle.storyId);
        if (story) {
          return { rawArticle: existingArticle, story, isNewStory: false };
        }
      }
    }
    
    // Store raw article
    const rawArticle: RawArticle = {
      id: generateId(),
      sourceArticle: article,
      processed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await storage.storeRawArticle(rawArticle);
    
    // Find matching story based on content similarity
    const matchingStories = await this.findRelatedStories(article);
    
    if (matchingStories.length > 0) {
      // Update existing story
      const story = matchingStories[0];
      
      // Update raw article with story ID
      rawArticle.storyId = story.id;
      rawArticle.processed = true;
      await storage.updateRawArticle(rawArticle);
      
      // Create story link
      await storage.storeStoryLink({
        id: generateId(),
        storyId: story.id,
        articleId: rawArticle.id,
        addedAt: new Date(),
        contributionType: 'related',
        impact: 'minor'
      });
      
      return { rawArticle, story, isNewStory: false };
    } else {
      // Create new story
      const category = this.detectCategory(article);
      
      const story: Story = {
        id: generateId(),
        title: article.title,
        description: article.description || '',
        mainSource: this.calculateSourceBias(article.source),
        relatedSources: [],
        url: article.url,
        urlToImage: article.urlToImage,
        publishedAt: article.publishedAt,
        category,
        readTime: this.calculateReadTime(article.content || article.description || ''),
        polarization: this.calculatePolarization([article]),
        articles: [{ 
          ...article, 
          source: { 
            ...article.source, 
            category: this.detectSourceCategory(article.source.name),
            bias: this.analyzeStance(article.description || '')
          }
        }]
      };
      
      // Store story
      await storage.storeStory(story);
      
      // Update raw article with story ID
      rawArticle.storyId = story.id;
      rawArticle.processed = true;
      await storage.updateRawArticle(rawArticle);
      
      // Create story link
      await storage.storeStoryLink({
        id: generateId(),
        storyId: story.id,
        articleId: rawArticle.id,
        addedAt: new Date(),
        contributionType: 'original',
        impact: 'major'
      });
      
      return { rawArticle, story, isNewStory: true };
    }
  }

  /**
   * Find stories related to an article
   */
  private async findRelatedStories(article: NewsArticle): Promise<Story[]> {
    const storage = await this.getStorage();
    
    // Get recent stories (last 72 hours)
    const recentStories = await storage.getRecentStories(72);
    
    // Calculate similarity for each story
    const storiesWithSimilarity = recentStories.map(story => ({
      story,
      similarity: this.calculateTitleSimilarity(story.title, article.title)
    }));
    
    // Sort by similarity and filter by threshold
    const relatedStories = storiesWithSimilarity
      .filter(item => item.similarity > 0.6)
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => item.story);
    
    return relatedStories;
  }

  /**
   * Fetch stories from the API and process them
   */
  async fetchStories(params: FetchStoriesParams = {}): Promise<Story[]> {
    const { category, page = 1, pageSize = 20, q, language = 'en', country = 'us' } = params;
    
    const queryParams = new URLSearchParams({
      apiKey: this.apiKey,
      page: page.toString(),
      pageSize: pageSize.toString(),
      language,
      country,
    });

    if (category) queryParams.append('category', category);
    if (q) queryParams.append('q', q);

    // Fetch from News API
    const response = await fetch(
      `${this.baseUrl}/top-headlines?${queryParams.toString()}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch news');
    }

    const data: NewsApiResponse = await response.json();
    
    // Process articles
    const processedResults = await Promise.all(
      data.articles.map(article => this.processArticle(article))
    );
    
    // Group by story to handle duplicates
    const storyMap = new Map<string, Story>();
    
    for (const { story } of processedResults) {
      storyMap.set(story.id, story);
    }
    
    // Convert back to array and sort by published date
    return Array.from(storyMap.values())
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  /**
   * Get story by ID
   */
  async getStoryById(id: string): Promise<Story | null> {
    const storage = await this.getStorage();
    return storage.getStory(id);
  }

  /**
   * Get original articles for a story
   */
  async getStoryArticles(storyId: string): Promise<RawArticle[]> {
    const storage = await this.getStorage();
    const result = await storage.getStoryWithArticles(storyId);
    return result ? result.articles : [];
  }
}

// Factory function to get an instance of the API News Service
export function getApiNewsService(): ApiNewsService {
  return ApiNewsService.getInstance();
}
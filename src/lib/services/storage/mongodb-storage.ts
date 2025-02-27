// src/lib/services/storage/mongodb-storage.ts
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { RawArticle, StorageService, StoryArticleLink, FetchStoriesOptions } from '@/types/database';
import { Story, NewsAPIArticle } from '@/types/news';

// Add MongoDB specific document types
interface RawArticleDocument extends Omit<RawArticle, 'id'> {
  _id: ObjectId;
  id: string;
}

interface StoryDocument extends Omit<Story, 'id'> {
  _id: ObjectId;
  id: string;
}

interface StoryArticleLinkDocument extends Omit<StoryArticleLink, 'id'> {
  _id: ObjectId;
  id: string;
}

export class MongoDBStorage implements StorageService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private rawArticlesCollection: Collection<RawArticleDocument> | null = null;
  private storiesCollection: Collection<StoryDocument> | null = null;
  private storyLinksCollection: Collection<StoryArticleLinkDocument> | null = null;
  
  /**
   * Initialize MongoDB connections and collections
   */
  async initialize(uri: string): Promise<void> {
    try {
      this.client = await MongoClient.connect(uri);
      this.db = this.client.db('news_aggregator');
      
      this.rawArticlesCollection = this.db.collection('rawArticles');
      this.storiesCollection = this.db.collection('stories');
      this.storyLinksCollection = this.db.collection('storyLinks');
      
      await this.createIndexes();
      console.log('MongoDB storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MongoDB storage:', error);
      throw error;
    }
  }

  /**
   * Create indexes for collections
   */
  private async createIndexes(): Promise<void> {
    if (!this.rawArticlesCollection || !this.storiesCollection || !this.storyLinksCollection) {
      throw new Error('Collections not initialized');
    }

    // Raw articles indexes
    await this.rawArticlesCollection.createIndex({ processed: 1 });
    await this.rawArticlesCollection.createIndex({ 'sourceArticle.url': 1 }, { unique: true });
    await this.rawArticlesCollection.createIndex({ 'sourceArticle.publishedAt': -1 });
    
    // Stories indexes
    await this.storiesCollection.createIndex({ publishedAt: -1 });
    await this.storiesCollection.createIndex({ title: 'text', description: 'text' });
    
    // Story links indexes
    await this.storyLinksCollection.createIndex({ storyId: 1 });
    await this.storyLinksCollection.createIndex({ articleId: 1 });
  }

  /**
   * Store a raw article
   */
  async storeRawArticle(article: RawArticle): Promise<RawArticle> {
    if (!this.rawArticlesCollection) {
      throw new Error('Raw articles collection not initialized');
    }

    try {
      // Check if article already exists
      const existing = await this.getRawArticleByUrl(article.sourceArticle.url);
      if (existing) {
        return existing;
      }
      
      const result = await this.rawArticlesCollection.insertOne(article as any);
      return article;
    } catch (error) {
      console.error('Failed to store raw article:', error);
      throw error;
    }
  }

  /**
   * Get a raw article by ID
   */
  async getRawArticle(id: string): Promise<RawArticle | null> {
    if (!this.rawArticlesCollection) {
      throw new Error('Raw articles collection not initialized');
    }
    
    const article = await this.rawArticlesCollection.findOne({ id });
    return article ? this.transformRawArticle(article) : null;
  }

  /**
   * Get a raw article by URL
   */
  async getRawArticleByUrl(url: string): Promise<RawArticle | null> {
    if (!this.rawArticlesCollection) {
      throw new Error('Raw articles collection not initialized');
    }
    
    const article = await this.rawArticlesCollection.findOne({ 'sourceArticle.url': url });
    return article ? this.transformRawArticle(article) : null;
  }

  /**
   * Get unprocessed raw articles
   */
  async getUnprocessedRawArticles(limit: number = 100): Promise<RawArticle[]> {
    if (!this.rawArticlesCollection) {
      throw new Error('Raw articles collection not initialized');
    }
    
    const articles = await this.rawArticlesCollection
      .find({ processed: false })
      .sort({ 'sourceArticle.publishedAt': -1 })
      .limit(limit)
      .toArray();
    
    return articles.map(this.transformRawArticle);
  }

  /**
   * Update a raw article
   */
  async updateRawArticle(article: RawArticle): Promise<RawArticle> {
    if (!this.rawArticlesCollection) {
      throw new Error('Raw articles collection not initialized');
    }
    
    await this.rawArticlesCollection.updateOne(
      { id: article.id },
      { $set: article }
    );
    
    return article;
  }

  /**
   * Store a story
   */
  async storeStory(story: Story): Promise<Story> {
    if (!this.storiesCollection) {
      throw new Error('Stories collection not initialized');
    }
    
    await this.storiesCollection.insertOne(story as any);
    return story;
  }

  /**
   * Get a story by ID
   */
  async getStory(id: string): Promise<Story | null> {
    if (!this.storiesCollection) {
      throw new Error('Stories collection not initialized');
    }
    
    const story = await this.storiesCollection.findOne({ id });
    return story ? this.transformStory(story) : null;
  }

  /**
   * Get a story by title
   */
  async getStoryByTitle(title: string): Promise<Story | null> {
    if (!this.storiesCollection) {
      throw new Error('Stories collection not initialized');
    }
    
    // First try exact match
    let story = await this.storiesCollection.findOne({ title });
    
    // If no exact match, try text search
    if (!story) {
      const result = await this.storiesCollection
        .find({ $text: { $search: title } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(1)
        .toArray();
      
      if (result.length > 0) {
        story = result[0];
      }
    }
    
    return story ? this.transformStory(story) : null;
  }

  /**
   * Get active stories with pagination
   */
  async getActiveStories(options: FetchStoriesOptions): Promise<Story[]> {
    if (!this.storiesCollection) {
      throw new Error('Stories collection not initialized');
    }
    
    const { 
      page = 1, 
      pageSize = 12, 
      sortBy = 'publishedAt',
      category,
      fromDate,
      toDate
    } = options;
    
    const query: any = {};
    
    if (category) {
      query.category = category;
    }
    
    if (fromDate || toDate) {
      query.publishedAt = {};
      if (fromDate) query.publishedAt.$gte = fromDate.toISOString();
      if (toDate) query.publishedAt.$lte = toDate.toISOString();
    }
    
    const sort: any = {};
    if (sortBy === 'publishedAt') {
      sort.publishedAt = -1;
    } else if (sortBy === 'sourceCount') {
      sort.sourceCount = -1;
      sort.publishedAt = -1;
    } else {
      // recentActivity - default
      sort.publishedAt = -1;
    }
    
    const stories = await this.storiesCollection
      .find(query)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();
    
    return stories.map(this.transformStory);
  }

  /**
   * Get recent stories (from the last X hours)
   */
  async getRecentStories(hoursAgo: number): Promise<Story[]> {
    if (!this.storiesCollection) {
      throw new Error('Stories collection not initialized');
    }
    
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - hoursAgo);
    
    const stories = await this.storiesCollection
      .find({
        publishedAt: { $gte: fromDate.toISOString() }
      })
      .sort({ publishedAt: -1 })
      .toArray();
    
    return stories.map(this.transformStory);
  }

  /**
   * Update a story
   */
  async updateStory(story: Story): Promise<Story> {
    if (!this.storiesCollection) {
      throw new Error('Stories collection not initialized');
    }
    
    await this.storiesCollection.updateOne(
      { id: story.id },
      { $set: story }
    );
    
    return story;
  }

  /**
   * Store a story-article link
   */
  async storeStoryLink(link: StoryArticleLink): Promise<StoryArticleLink> {
    if (!this.storyLinksCollection) {
      throw new Error('Story links collection not initialized');
    }
    
    await this.storyLinksCollection.insertOne(link as any);
    return link;
  }

  /**
   * Get links for a story
   */
  async getStoryLinks(storyId: string): Promise<StoryArticleLink[]> {
    if (!this.storyLinksCollection) {
      throw new Error('Story links collection not initialized');
    }
    
    const links = await this.storyLinksCollection
      .find({ storyId })
      .sort({ addedAt: -1 })
      .toArray();
    
    return links.map(this.transformStoryLink);
  }

  /**
   * Get links for an article
   */
  async getArticleLinks(articleId: string): Promise<StoryArticleLink[]> {
    if (!this.storyLinksCollection) {
      throw new Error('Story links collection not initialized');
    }
    
    const links = await this.storyLinksCollection
      .find({ articleId })
      .toArray();
    
    return links.map(this.transformStoryLink);
  }

  /**
   * Find a story by article URL
   */
  async findStoryByArticleUrl(url: string): Promise<Story | null> {
    if (!this.rawArticlesCollection || !this.storyLinksCollection || !this.storiesCollection) {
      throw new Error('Collections not initialized');
    }
    
    // Find raw article by URL
    const article = await this.getRawArticleByUrl(url);
    if (!article) return null;
    
    // Find links for this article
    const links = await this.getArticleLinks(article.id);
    if (links.length === 0) return null;
    
    // Get the story
    return this.getStory(links[0].storyId);
  }

  /**
   * Get a story with all its linked articles
   */
  async getStoryWithArticles(storyId: string): Promise<{ story: Story; articles: RawArticle[] } | null> {
    if (!this.storiesCollection || !this.storyLinksCollection || !this.rawArticlesCollection) {
      throw new Error('Collections not initialized');
    }
    
    // Get the story
    const story = await this.getStory(storyId);
    if (!story) return null;
    
    // Get links for this story
    const links = await this.getStoryLinks(storyId);
    
    // Get all articles
    const articles = await Promise.all(
      links.map(link => this.getRawArticle(link.articleId))
    );
    
    // Filter out any null articles
    const validArticles = articles.filter((article): article is RawArticle => article !== null);
    
    return { story, articles: validArticles };
  }

  /**
   * Transform MongoDB document to RawArticle
   */
  private transformRawArticle(doc: RawArticleDocument): RawArticle {
    const { _id, ...data } = doc;
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
  }

  /**
   * Transform MongoDB document to Story
   */
  private transformStory(doc: StoryDocument): Story {
    const { _id, ...data } = doc;
    return data;
  }

  /**
   * Transform MongoDB document to StoryArticleLink
   */
  private transformStoryLink(doc: StoryArticleLinkDocument): StoryArticleLink {
    const { _id, ...data } = doc;
    return {
      ...data,
      addedAt: new Date(data.addedAt)
    };
  }
}

// Create and export singleton instance
let storageInstance: MongoDBStorage | null = null;

export async function getStorageService(mongoUri?: string): Promise<MongoDBStorage> {
  if (!storageInstance) {
    storageInstance = new MongoDBStorage();
    if (mongoUri) {
      await storageInstance.initialize(mongoUri);
    } else if (process.env.MONGODB_URI) {
      await storageInstance.initialize(process.env.MONGODB_URI);
    } else {
      throw new Error('MongoDB URI not provided');
    }
  }
  
  return storageInstance;
}
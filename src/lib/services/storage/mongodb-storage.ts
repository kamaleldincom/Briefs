// src/lib/services/storage/mongodb-storage.ts
import { MongoClient, Collection, ObjectId, Filter } from 'mongodb';
import { Story } from '@/lib/types';
import { RawArticle, RawArticleDocument, StoryArticleLink, StoryArticleLinkDocument, StoryDocument } from '@/lib/types/database';
import { NewsStorage } from './types';
import clientPromise from '../mongodb';
import { calculateSimilarity } from '@/lib/utils';

export class MongoDBStorage implements NewsStorage {
    private client: MongoClient | null = null;
    private storiesCollection: Collection<StoryDocument> | null = null;
    private rawArticlesCollection: Collection<RawArticleDocument> | null = null;
    private storyLinksCollection: Collection<StoryArticleLinkDocument> | null = null;

    // Track URLs we've processed in the current session to prevent duplicates
    private processedUrls: Set<string> = new Set();

    async initialize(): Promise<void> {
        console.log('MongoDB: Initializing connection...');
        this.client = await clientPromise;
        const db = this.client.db('news_aggregator');
        
        // Initialize collections
        this.storiesCollection = db.collection<StoryDocument>('stories');
        this.rawArticlesCollection = db.collection<RawArticleDocument>('rawArticles');
        this.storyLinksCollection = db.collection<StoryArticleLinkDocument>('storyLinks');
        
        // Create indexes for efficient querying
        await this.createIndexes();
        
        console.log('MongoDB: Connection and indexes initialized');
    }
    
    private async createIndexes(): Promise<void> {
        if (!this.storiesCollection || !this.rawArticlesCollection || !this.storyLinksCollection) {
            throw new Error('Collections not initialized');
        }
        
        // Indexes for stories collection
        await this.storiesCollection.createIndex({ id: 1 }, { unique: true });
        await this.storiesCollection.createIndex({ title: "text", summary: "text" });
        await this.storiesCollection.createIndex({ "metadata.lastUpdated": -1 });
        await this.storiesCollection.createIndex({ "metadata.firstPublished": -1 });
        
        // Indexes for raw articles collection
        await this.rawArticlesCollection.createIndex({ id: 1 }, { unique: true });
        await this.rawArticlesCollection.createIndex({ "sourceArticle.url": 1 }, { unique: true });
        await this.rawArticlesCollection.createIndex({ processed: 1 });
        await this.rawArticlesCollection.createIndex({ storyId: 1 });
        await this.rawArticlesCollection.createIndex({ "sourceArticle.publishedAt": -1 });
        
        // Indexes for story links collection
        await this.storyLinksCollection.createIndex({ id: 1 }, { unique: true });
        await this.storyLinksCollection.createIndex({ storyId: 1 });
        await this.storyLinksCollection.createIndex({ articleId: 1 });
        await this.storyLinksCollection.createIndex({ storyId: 1, articleId: 1 }, { unique: true });
    }

    // Story methods
async getStories(options: { page?: number; pageSize?: number; } = {}): Promise<Story[]> {
    if (!this.storiesCollection) throw new Error('Storage not initialized');
    
    const { page = 1, pageSize = 12 } = options;
    const skip = (page - 1) * pageSize;
    
    console.log(`MongoDB: Fetching stories (page ${page}, pageSize ${pageSize})...`);
    
    const stories = await this.storiesCollection
        .find({})
        .sort({ 
            'metadata.lastUpdated': -1,  // Most recently updated first
            'metadata.totalSources': -1  // Stories with more sources higher
        })
        .skip(skip)
        .limit(pageSize)
        .toArray();
  
    console.log(`MongoDB: Retrieved ${stories.length} stories`);
    return stories.map(this.transformToStory);
  }

    async getStoryById(id: string): Promise<Story | null> {
        if (!this.storiesCollection) throw new Error('Storage not initialized');
        
        const decodedId = decodeURIComponent(id);
        console.log('MongoDB: Looking for story with ID:', decodedId);
        
        const story = await this.storiesCollection.findOne({ id: decodedId });
        console.log('MongoDB: Story lookup result:', story ? 'Found' : 'Not found');
        
        return story ? this.transformToStory(story) : null;
    }

    async addStory(story: Story): Promise<Story> {
        if (!this.storiesCollection) throw new Error('Storage not initialized');
        
        try {
            console.log('MongoDB: Adding new story:', story.title);
            
            const storyDoc: StoryDocument = {
                _id: new ObjectId(),
                ...story
            };
            
            await this.storiesCollection.insertOne(storyDoc);
            console.log('MongoDB: Successfully added new story');
            
            return this.transformToStory(storyDoc);
        } catch (error) {
            console.error('MongoDB: Error adding story:', error);
            throw error;
        }
    }

    async updateStory(id: string, update: Partial<Story>): Promise<void> {
        if (!this.storiesCollection) throw new Error('Storage not initialized');
        
        console.log('MongoDB: Updating story:', id);
        try {
            const result = await this.storiesCollection.updateOne(
                { id },
                { $set: update }
            );
            console.log('MongoDB: Update result:', result.modifiedCount ? 'Modified' : 'No changes');
        } catch (error) {
            console.error('MongoDB: Error updating story:', error);
            throw error;
        }
    }

    async findRelatedStories(story: Partial<Story>): Promise<Story[]> {
        if (!this.storiesCollection || !this.rawArticlesCollection) {
            throw new Error('Storage not initialized');
        }
        
        console.log('Looking for related stories to:', story.title);
        
        // First check for stories that share the same source articles
        if (story.sources && story.sources.length > 0) {
            const sourceUrls = story.sources.map(source => source.url);
            
            // Check if we have any raw articles with these URLs that are linked to stories
            const linkedArticles = await this.rawArticlesCollection
                .find({
                    "sourceArticle.url": { $in: sourceUrls },
                    storyId: { $exists: true, $ne: null }
                })
                .toArray();
            
            if (linkedArticles.length > 0) {
                // Get the stories these articles are linked to
                const storyIds = [...new Set(linkedArticles
                    .filter(article => article.storyId)
                    .map(article => article.storyId as string))];
                
                if (storyIds.length > 0) {
                    const linkedStories = await this.storiesCollection
                        .find({ id: { $in: storyIds } })
                        .toArray();
                    
                    console.log(`Found ${linkedStories.length} stories by source URL match`);
                    return linkedStories.map(this.transformToStory);
                }
            }
        }
        
        // Then try content similarity using text search
        const similarStories = await this.storiesCollection
            .find({
                $text: {
                    $search: `${story.title} ${story.summary}`
                }
            })
            .toArray();
        
        console.log(`Found ${similarStories.length} potentially similar stories by text search`);
        
        // Filter by title similarity with a lower threshold
        const relatedStories = similarStories.filter(existingStory => {
            const titleSimilarity = calculateSimilarity(
                existingStory.title,
                story.title || ''
            );
            console.log(`Similarity score with "${existingStory.title}": ${titleSimilarity}`);
            return titleSimilarity > 0.2;
        });
        
        console.log(`After similarity filtering: ${relatedStories.length} related stories`);
        return relatedStories.map(this.transformToStory);
    }

    // Raw article methods
    async getRawArticle(id: string): Promise<RawArticle | null> {
        if (!this.rawArticlesCollection) throw new Error('Storage not initialized');
        
        console.log('MongoDB: Getting raw article:', id);
        const article = await this.rawArticlesCollection.findOne({ id });
        
        if (!article) return null;
        return this.transformToRawArticle(article);
    }

    async getRawArticlesByStoryId(storyId: string): Promise<RawArticle[]> {
        if (!this.rawArticlesCollection) throw new Error('Storage not initialized');
        
        console.log('MongoDB: Getting raw articles for story:', storyId);
        
        // Get article IDs from story links
        const links = await this.storyLinksCollection?.find({ storyId }).toArray();
        
        if (!links || links.length === 0) {
            return [];
        }
        
        const articleIds = links.map(link => link.articleId);
        const articles = await this.rawArticlesCollection
            .find({ id: { $in: articleIds } })
            .toArray();
        
        return articles.map(this.transformToRawArticle);
    }

    async storeRawArticle(article: RawArticle): Promise<RawArticle> {
        if (!this.rawArticlesCollection) throw new Error('Storage not initialized');
        
        try {
            // Check if this URL has been processed
            if (this.processedUrls.has(article.sourceArticle.url)) {
                console.log('MongoDB: Article URL already processed in this session, skipping');
                const existingArticle = await this.findArticleByUrl(article.sourceArticle.url);
                return existingArticle!;
            }
            
            // Check if article already exists in database
            const existingArticle = await this.findArticleByUrl(article.sourceArticle.url);
            if (existingArticle) {
                console.log('MongoDB: Article already exists in database:', existingArticle.id);
                return existingArticle;
            }
            
            // Add URL to processed set
            this.processedUrls.add(article.sourceArticle.url);
            
            console.log('MongoDB: Storing new raw article:', article.sourceArticle.title);
            
            const articleDoc: RawArticleDocument = {
                _id: new ObjectId(),
                ...article
            };
            
            await this.rawArticlesCollection.insertOne(articleDoc);
            console.log('MongoDB: Successfully stored raw article:', articleDoc.id);
            
            return this.transformToRawArticle(articleDoc);
        } catch (error) {
            console.error('MongoDB: Error storing raw article:', error);
            throw error;
        }
    }

    async updateRawArticle(id: string, update: Partial<RawArticle>): Promise<void> {
        if (!this.rawArticlesCollection) throw new Error('Storage not initialized');
        
        console.log('MongoDB: Updating raw article:', id);
        
        // Add updatedAt timestamp
        const updateWithTimestamp = {
            ...update,
            updatedAt: new Date()
        };
        
        try {
            const result = await this.rawArticlesCollection.updateOne(
                { id },
                { $set: updateWithTimestamp }
            );
            
            console.log('MongoDB: Raw article update result:', 
                result.modifiedCount ? 'Modified' : 'No changes');
        } catch (error) {
            console.error('MongoDB: Error updating raw article:', error);
            throw error;
        }
    }

    async findArticleByUrl(url: string): Promise<RawArticle | null> {
        if (!this.rawArticlesCollection) throw new Error('Storage not initialized');
        
        console.log('MongoDB: Looking for article with URL:', url);
        
        const article = await this.rawArticlesCollection.findOne({
            "sourceArticle.url": url
        });
        
        if (!article) return null;
        return this.transformToRawArticle(article);
    }

    // Story-article link methods
    async getStoryLinks(storyId: string): Promise<StoryArticleLink[]> {
        if (!this.storyLinksCollection) throw new Error('Storage not initialized');
        
        console.log('MongoDB: Getting links for story:', storyId);
        
        const links = await this.storyLinksCollection
            .find({ storyId })
            .sort({ addedAt: -1 })
            .toArray();
        
        return links.map(this.transformToStoryLink);
    }

    async getArticleLinks(articleId: string): Promise<StoryArticleLink[]> {
        if (!this.storyLinksCollection) throw new Error('Storage not initialized');
        
        console.log('MongoDB: Getting links for article:', articleId);
        
        const links = await this.storyLinksCollection
            .find({ articleId })
            .toArray();
        
        return links.map(this.transformToStoryLink);
    }

    async createStoryLink(link: StoryArticleLink): Promise<StoryArticleLink> {
        if (!this.storyLinksCollection) throw new Error('Storage not initialized');
        
        try {
            console.log('MongoDB: Creating story-article link');
            
            // Check if link already exists
            const existingLink = await this.storyLinksCollection.findOne({
                storyId: link.storyId,
                articleId: link.articleId
            });
            
            if (existingLink) {
                console.log('MongoDB: Link already exists, returning existing');
                return this.transformToStoryLink(existingLink);
            }
            
            const linkDoc: StoryArticleLinkDocument = {
                _id: new ObjectId(),
                ...link
            };
            
            await this.storyLinksCollection.insertOne(linkDoc);
            console.log('MongoDB: Successfully created story-article link');
            
            return this.transformToStoryLink(linkDoc);
        } catch (error) {
            console.error('MongoDB: Error creating story-article link:', error);
            throw error;
        }
    }

    async updateStoryLink(id: string, update: Partial<StoryArticleLink>): Promise<void> {
        if (!this.storyLinksCollection) throw new Error('Storage not initialized');
        
        console.log('MongoDB: Updating story-article link:', id);
        
        try {
            const result = await this.storyLinksCollection.updateOne(
                { id },
                { $set: update }
            );
            
            console.log('MongoDB: Link update result:', 
                result.modifiedCount ? 'Modified' : 'No changes');
        } catch (error) {
            console.error('MongoDB: Error updating story-article link:', error);
            throw error;
        }
    }

    // Count methods for pagination
    async countStories(filter: Filter<StoryDocument> = {}): Promise<number> {
        if (!this.storiesCollection) throw new Error('Storage not initialized');
        return this.storiesCollection.countDocuments(filter);
    }

    async countRawArticles(filter: Filter<RawArticleDocument> = {}): Promise<number> {
        if (!this.rawArticlesCollection) throw new Error('Storage not initialized');
        return this.rawArticlesCollection.countDocuments(filter);
    }

    // Helper methods for document transformation
    private transformToStory(doc: StoryDocument): Story {
        const { _id, ...storyData } = doc;
        return storyData;
    }

    private transformToRawArticle(doc: RawArticleDocument): RawArticle {
        const { _id, ...articleData } = doc;
        return articleData;
    }

    private transformToStoryLink(doc: StoryArticleLinkDocument): StoryArticleLink {
        const { _id, ...linkData } = doc;
        return linkData;
    }
}
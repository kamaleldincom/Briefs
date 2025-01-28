// src/lib/services/storage/mongodb-storage.ts
import { MongoClient, Collection, ObjectId } from 'mongodb';
import { Story } from '@/lib/types';
import { NewsStorage } from './types';
import clientPromise from '../mongodb';
import { calculateSimilarity } from '@/lib/utils';

// Interface that extends Story to include MongoDB's _id field
interface StoryDocument extends Story {
    _id: ObjectId;
}

export class MongoDBStorage implements NewsStorage {
    private client: MongoClient | null = null;
    private collection: Collection<StoryDocument> | null = null;
    // Track URLs we've processed in the current session to prevent duplicates
    private processedUrls: Set<string> = new Set();

    async initialize(): Promise<void> {
        console.log('MongoDB: Initializing connection...');
        this.client = await clientPromise;
        this.collection = this.client.db('news_aggregator').collection<StoryDocument>('stories');
        
        // Create indexes for efficient querying
        await this.collection.createIndex({ "sources.url": 1 });
        await this.collection.createIndex({ title: "text", summary: "text" });
        console.log('MongoDB: Connection and indexes initialized');
    }

    async getStories(): Promise<Story[]> {
        if (!this.collection) throw new Error('Storage not initialized');
        
        console.log('MongoDB: Fetching all stories...');
        const stories = await this.collection
            .find({})
            .sort({ 
                'metadata.lastUpdated': -1,    // Latest stories first
                'metadata.totalSources': -1     // Stories with more sources higher
            })
            .toArray();

        console.log(`MongoDB: Retrieved ${stories.length} stories`);
        return stories.map(this.transformToStory);
    }

    async getStoryById(id: string): Promise<Story | null> {
        if (!this.collection) throw new Error('Storage not initialized');
        
        const decodedId = decodeURIComponent(id);
        console.log('MongoDB: Looking for story with ID:', decodedId);
        const story = await this.collection.findOne({ id: decodedId });
        console.log('MongoDB: Story lookup result:', story ? 'Found' : 'Not found');
        
        return story ? this.transformToStory(story) : null;
    }

    async addStory(story: Story): Promise<void> {
        if (!this.collection) throw new Error('Storage not initialized');
        
        try {
            // Check if any of the story's URLs have been processed in this session
            const storyUrls = story.sources.map(s => s.url);
            if (storyUrls.some(url => this.processedUrls.has(url))) {
                console.log('MongoDB: Story already processed in this session, skipping');
                return;
            }

            // Check if story already exists in database
            const existingStory = await this.collection.findOne({
                'sources.url': { $in: storyUrls }
            });

            if (existingStory) {
                console.log('MongoDB: Story already exists in database, skipping');
                return;
            }

            // Add all URLs to processed set
            storyUrls.forEach(url => this.processedUrls.add(url));

            console.log('MongoDB: Adding new story:', story.title);
            const storyDoc: StoryDocument = {
                _id: new ObjectId(),
                ...story
            };
            
            await this.collection.insertOne(storyDoc);
            console.log('MongoDB: Successfully added new story');
        } catch (error) {
            console.error('MongoDB: Error adding story:', error);
            throw error;
        }
    }

    async updateStory(id: string, update: Partial<Story>): Promise<void> {
        if (!this.collection) throw new Error('Storage not initialized');
        
        console.log('MongoDB: Updating story:', id);
        try {
            const result = await this.collection.updateOne(
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
        if (!this.collection) throw new Error('Storage not initialized');
        
        console.log('Looking for related stories to:', story.title);
        
        // First try exact URL match
        if (story.sources?.[0]?.url) {
          const exactMatch = await this.collection.findOne({
            'sources.url': story.sources[0].url
          });
          
          if (exactMatch) {
            console.log('Found exact match by URL');
            return [this.transformToStory(exactMatch)];
          }
        }
      
        // Then try content similarity using text search
        const similarStories = await this.collection
          .find({
            $text: {
              $search: `${story.title} ${story.summary}`
            }
          })
          .toArray();
      
        console.log(`Found ${similarStories.length} potentially similar stories`);
      
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

    // Helper method to transform MongoDB document to Story type
    private transformToStory(doc: StoryDocument): Story {
        const { _id, ...storyData } = doc;
        return storyData;
    }
}
// src/lib/services/storage/mongodb-storage.ts
import { MongoClient, Collection, WithId, Document, ObjectId } from 'mongodb';
import { Story } from '@/lib/types';
import { NewsStorage } from './types';
import clientPromise from '../mongodb';
import { calculateSimilarity } from '@/lib/utils';


// interface for MongoDB document structure
interface StoryDocument extends Story {
    _id: ObjectId;
  }

export class MongoDBStorage implements NewsStorage {
    private client: MongoClient | null = null;
    private collection: Collection<StoryDocument> | null = null;
  
    async initialize(): Promise<void> {
      this.client = await clientPromise;
      this.collection = this.client.db('news_aggregator').collection<StoryDocument>('stories');
    }

  async getStories(): Promise<Story[]> {
    if (!this.collection) throw new Error('Storage not initialized');
    
    const stories = await this.collection
      .find({})
      .sort({ 'metadata.lastUpdated': -1 })
      .toArray();

    // Transform MongoDB documents to Story type
    return stories.map(doc => ({
      id: doc.id,
      title: doc.title,
      summary: doc.summary,
      content: doc.content,
      sources: doc.sources,
      metadata: doc.metadata,
      analysis: doc.analysis,
      imageUrl: doc.imageUrl
    }));
  }

  async getStoryById(id: string): Promise<Story | null> {
    if (!this.collection) throw new Error('Storage not initialized');
    
    const decodedId = decodeURIComponent(id);
    console.log('Looking for story with decoded ID:', decodedId);
    const story = await this.collection.findOne({ id: decodedId });
    console.log('Found story:', story ? story.title : 'null');
    
    if (!story) return null;
    return this.transformToStory(story);
  }

  async addStory(story: Story): Promise<void> {
    if (!this.collection) throw new Error('Storage not initialized');
    
    console.log('Adding story to MongoDB:', story.title);
    
    // Create a StoryDocument by adding the _id field
    const storyDoc: StoryDocument = {
      _id: new ObjectId(),
      ...story
    };
    
    await this.collection.insertOne(storyDoc);
  }

  async updateStory(id: string, update: Partial<Story>): Promise<void> {
    if (!this.collection) throw new Error('Storage not initialized');
    
    await this.collection.updateOne(
      { id },
      { $set: update }
    );
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

  // Helper method to transform MongoDB document to Story
  private transformToStory(doc: StoryDocument): Story {
    const { _id, ...storyData } = doc;
    return storyData;
  }
}
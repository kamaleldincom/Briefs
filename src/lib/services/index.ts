// src/lib/services/index.ts
// First, let's create a service factory
import { MongoDBStorage } from './storage/mongodb-storage';
import { StoryManagerService } from './story-manager';

let storyManager: StoryManagerService | null = null;

export async function getStoryManager() {
  if (!storyManager) {
    const storage = new MongoDBStorage();
    storyManager = new StoryManagerService(storage);
    await storyManager.initialize();
  }
  return storyManager;
}
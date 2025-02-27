// src/lib/services/storage/index.ts
import { StorageService } from '@/types/database';
import { MongoDBStorage, getStorageService as getMongoDBStorage } from './mongodb-storage';

let storageService: StorageService | null = null;

/**
 * Factory function to get the storage service
 * This allows us to potentially switch storage implementations in the future
 */
export async function getStorageService(): Promise<StorageService> {
  if (!storageService) {
    storageService = await getMongoDBStorage();
  }
  
  return storageService;
}
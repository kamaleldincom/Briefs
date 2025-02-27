// src/lib/initialize-services.ts
import { getStorageService } from './services/storage';

/**
 * Initialize all services
 * This should be called on app startup
 */
export async function initializeServices(): Promise<void> {
  try {
    // Initialize storage service
    await getStorageService();
    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}
// src/lib/services/ai/cache-service.ts
import { AIAnalysisResult } from './types';

interface CacheEntry {
  result: AIAnalysisResult;
  timestamp: number;
  version: number;
  storyIds: string[];
}

/**
 * Service for caching AI analysis results to reduce API calls
 */
export class AICacheService {
  private static instance: AICacheService;
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_VERSION = 1;
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): AICacheService {
    if (!AICacheService.instance) {
      AICacheService.instance = new AICacheService();
    }
    return AICacheService.instance;
  }

  /**
   * Generate a cache key from story IDs
   */
  public generateCacheKey(storyIds: string[]): string {
    // Sort to ensure consistent keys regardless of order
    return storyIds.sort().join('_');
  }

  /**
   * Store an analysis result in the cache
   */
  public cacheAnalysis(storyIds: string[], result: AIAnalysisResult): void {
    const key = this.generateCacheKey(storyIds);
    
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      version: this.CACHE_VERSION,
      storyIds
    });

    // Prune cache if it gets too large
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      this.pruneCache();
    }
  }

  /**
   * Retrieve a cached analysis if available and valid
   */
  public getCachedAnalysis(storyIds: string[]): AIAnalysisResult | null {
    const key = this.generateCacheKey(storyIds);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if cache entry is still valid
    if (!this.isCacheEntryValid(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Check if a cache entry is still valid
   */
  private isCacheEntryValid(entry: CacheEntry): boolean {
    const now = Date.now();
    
    // Check if entry is expired
    if (now - entry.timestamp > this.CACHE_TTL) {
      return false;
    }
    
    // Check if entry version matches current version
    if (entry.version !== this.CACHE_VERSION) {
      return false;
    }
    
    return true;
  }

  /**
   * Remove the oldest entries from the cache
   */
  private pruneCache(): void {
    // Get all entries sorted by timestamp (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort(([, entryA], [, entryB]) => entryA.timestamp - entryB.timestamp);
    
    // Delete the oldest 20% of entries
    const entriesToDelete = Math.ceil(this.cache.size * 0.2);
    for (let i = 0; i < entriesToDelete; i++) {
      if (i < entries.length) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Clear the entire cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache entries containing a specific story ID
   */
  public invalidateCacheForStory(storyId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.storyIds.includes(storyId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      version: this.CACHE_VERSION
    };
  }
}
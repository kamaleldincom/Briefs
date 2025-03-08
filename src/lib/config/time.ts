// src/lib/config/time.ts

/**
 * Central configuration for all time-related settings in the News App.
 * Modify these values to adjust how the app handles time constraints.
 */
export const TIME_CONFIG = {
    // Maximum age of articles to fetch from NewsAPI (in days)
    MAX_ARTICLE_AGE_DAYS: 3,
    
    // How long to keep stories in active rechecker queue (in hours)
    ACTIVE_STORY_WINDOW_HOURS: 24,
    
    // How often to recheck active stories (in minutes)
    RECHECK_INTERVAL_MINUTES: 15,
    
    // How long to cache API responses (in minutes)
    CACHE_DURATION_MINUTES: 5,
    
    // Default date display format for the UI
    DEFAULT_DATE_FORMAT: 'MMM d, yyyy h:mm a'
  };
  
  /**
   * Returns the date limit for article fetching in YYYY-MM-DD format
   * Used in NewsAPI calls to limit how far back we search
   */
  export function getArticleAgeLimit(): string {
    const date = new Date();
    date.setDate(date.getDate() - TIME_CONFIG.MAX_ARTICLE_AGE_DAYS);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
  
  /**
   * Converts milliseconds to minutes for easier configuration
   */
  export function minutesToMs(minutes: number): number {
    return minutes * 60 * 1000;
  }
  
  /**
   * Converts hours to milliseconds for easier configuration
   */
  export function hoursToMs(hours: number): number {
    return hours * 60 * 60 * 1000;
  }
  
  /**
   * Converts days to milliseconds for easier configuration
   */
  export function daysToMs(days: number): number {
    return days * 24 * 60 * 60 * 1000;
  }
  
  /**
   * Returns millisecond values for commonly used time periods
   */
  export const MS = {
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    
    // Convenience methods for the config values
    CACHE_DURATION: minutesToMs(TIME_CONFIG.CACHE_DURATION_MINUTES),
    RECHECK_INTERVAL: minutesToMs(TIME_CONFIG.RECHECK_INTERVAL_MINUTES),
    ACTIVE_STORY_WINDOW: hoursToMs(TIME_CONFIG.ACTIVE_STORY_WINDOW_HOURS),
    MAX_ARTICLE_AGE: daysToMs(TIME_CONFIG.MAX_ARTICLE_AGE_DAYS)
  };
// src/lib/config/development.ts

/**
 * Development-specific configuration flags
 * These settings only affect the app during development
 */
export const DEV_CONFIG = {
    /**
     * When true, completely disables all API calls to NewsAPI
     * The app will only use existing content from the database
     * Useful for UI development when you want to avoid hitting rate limits
     */
    DATABASE_ONLY_MODE: process.env.NEXT_PUBLIC_DATABASE_ONLY === 'true',
    
    /**
     * When true, shows development indicators in the UI
     * Helps developers know which mode they're working in
     */
    SHOW_DEV_INDICATORS: process.env.NODE_ENV === 'development',
    
    /**
     * Controls whether to show detailed API status messages
     * in console logs during development
     */
    VERBOSE_API_LOGGING: process.env.NODE_ENV === 'development'
  };
  
  /**
   * Check if the app is currently in database-only mode
   * This is used throughout the app to conditionally skip API calls
   */
  export function isDatabaseOnlyMode(): boolean {
    return DEV_CONFIG.DATABASE_ONLY_MODE;
  }
  
  /**
   * Log API-related information during development
   * Only logs when VERBOSE_API_LOGGING is enabled
   */
  export function logApiInfo(message: string, data?: any): void {
    if (DEV_CONFIG.VERBOSE_API_LOGGING) {
      if (data) {
        console.info(`[API] ${message}`, data);
      } else {
        console.info(`[API] ${message}`);
      }
    }
  }
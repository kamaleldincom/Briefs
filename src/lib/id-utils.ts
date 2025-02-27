// src/lib/id-utils.ts

/**
 * Generates a unique ID combining random characters and timestamp
 * @returns A unique ID string
 */
export function generateId(): string {
    return Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }
  
  /**
   * Creates a URL-friendly slug from a title string
   * @param title The title to slugify
   * @returns A slug string
   */
  export function createSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  /**
   * Creates a deterministic ID from a title, useful for finding duplicate stories
   * @param title The story title
   * @returns A deterministic ID
   */
  export function createStoryId(title: string): string {
    return createSlug(title);
  }
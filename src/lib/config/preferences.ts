// src/lib/config/preferences.ts

export interface TopicPreference {
    name: string;
    keywords: string[];
    minCount: number;
    maxAge: number; // in milliseconds
  }
  
  export const CONTENT_PREFERENCES = {
    priorityTopics: [
      {
        name: 'Sudan',
        keywords: ['Sudan', 'Sudanese', 'Khartoum', 'Darfur', 'Port Sudan'],
        minCount: 1,  // At least 1 story about Sudan should be included
        maxAge: 7 * 24 * 60 * 60 * 1000  // Stories up to 7 days old are acceptable
      }
      // Additional priority topics can be added here following the same structure
    ]
  };
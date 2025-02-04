// lib/config/index.ts
export const CONFIG = {
    siteName: 'News App',
    apiEndpoints: {
      news: process.env.NEWS_API_ENDPOINT || 'https://newsapi.org/v2',
      openai: 'https://api.openai.com/v1',
    },
    aiModel: 'gpt-3.5-turbo-0125',
    maxSourcesPerStory: 5,
    storyRefreshInterval: 300000, // 5 minutes
    cacheTimeout: 86400, // 24 hours
  } as const;
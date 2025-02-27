// src/hooks/useNews.ts
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import NewsService from '@/lib/services/news';
import { FetchStoriesParams, Story } from '@/types/news';
import { useNewsStore } from '@/store/news-store';
import { RawArticle } from '@/types/database';

/**
 * Fetches stories from the API
 */
async function fetchStoriesFromAPI(params: FetchStoriesParams = {}): Promise<Story[]> {
  const { category, page = 1, pageSize = 12, q, language, country } = params;
  
  const searchParams = new URLSearchParams();
  searchParams.append('page', page.toString());
  searchParams.append('pageSize', pageSize.toString());
  
  if (category) searchParams.append('category', category);
  if (q) searchParams.append('q', q);
  if (language) searchParams.append('language', language);
  if (country) searchParams.append('country', country);
  
  const response = await fetch(`/api/stories?${searchParams.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch stories');
  }
  
  return response.json();
}

/**
 * Fetches a single story by ID
 */
async function fetchStory(id: string): Promise<Story> {
  const response = await fetch(`/api/stories/${id}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch story');
  }
  
  return response.json();
}

/**
 * Fetches raw articles for a story
 */
async function fetchStoryArticles(id: string): Promise<RawArticle[]> {
  const response = await fetch(`/api/stories/${id}/articles`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch articles');
  }
  
  return response.json();
}

/**
 * Hook for fetching stories for the main feed
 */
export function useNews(params: FetchStoriesParams = {}) {
  const setStories = useNewsStore(state => state.setStories);
  const setError = useNewsStore(state => state.setError);
  const setLoading = useNewsStore(state => state.setLoading);

  return useQuery<Story[], Error>({
    queryKey: ['news', params],
    queryFn: () => fetchStoriesFromAPI(params),
    onSuccess: (data) => {
      setStories(data);
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
    },
    onSettled: () => {
      setLoading(false);
    }
  });
}

/**
 * Hook for searching stories
 */
export function useSearchNews(query: string) {
  return useQuery<Story[], Error>({
    queryKey: ['news-search', query],
    queryFn: () => fetchStoriesFromAPI({ q: query }),
    enabled: query.length > 0
  });
}

/**
 * Hook for infinite scrolling news feed
 */
export function useInfiniteNews(params: FetchStoriesParams = {}) {
  return useInfiniteQuery<Story[], Error>({
    queryKey: ['infinite-news', params],
    queryFn: ({ pageParam = 1 }) => 
      fetchStoriesFromAPI({ ...params, page: pageParam }),
    getNextPageParam: (lastPage, allPages) => 
      lastPage.length === 12 ? allPages.length + 1 : undefined,
  });
}

/**
 * Hook for fetching a single story
 */
export function useStory(storyId: string | null) {
  return useQuery<Story, Error>({
    queryKey: ['story', storyId],
    queryFn: () => fetchStory(storyId as string),
    enabled: !!storyId
  });
}

/**
 * Hook for fetching raw articles for a story
 */
export function useStoryArticles(storyId: string | null) {
  return useQuery<RawArticle[], Error>({
    queryKey: ['story-articles', storyId],
    queryFn: () => fetchStoryArticles(storyId as string),
    enabled: !!storyId
  });
}
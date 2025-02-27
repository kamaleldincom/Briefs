// src/hooks/useFetchNews.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FetchStoriesParams, Story } from '@/types/news';

/**
 * Fetches fresh news from the external API
 */
async function fetchFreshNews(params: FetchStoriesParams = {}): Promise<Story[]> {
  const { category, page = 1, pageSize = 12, q, language = 'en', country = 'us' } = params;
  
  const searchParams = new URLSearchParams();
  searchParams.append('page', page.toString());
  searchParams.append('pageSize', pageSize.toString());
  searchParams.append('language', language);
  searchParams.append('country', country);
  
  if (category) searchParams.append('category', category);
  if (q) searchParams.append('q', q);
  
  const response = await fetch(`/api/news/fetch?${searchParams.toString()}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch news');
  }
  
  return response.json();
}

/**
 * Hook for triggering fresh news fetch from the external API
 */
export function useFetchNews() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: fetchFreshNews,
    onSuccess: (data) => {
      // Invalidate and refetch active queries
      queryClient.invalidateQueries({ queryKey: ['news'] });
    }
  });
}
// src/lib/services/news/index.ts
import NewsService from './news-service';

export default NewsService;

export function getNewsService(): NewsService {
  return NewsService.getInstance();
}
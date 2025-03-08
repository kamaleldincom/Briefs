// src/lib/services/story-manager/article-processor.ts
// Add this new utility to improve article content extraction

import { NewsAPIArticle } from './types';
import { Source } from '@/lib/types';
import { SOURCE_DETAILS } from '@/lib/config/sources';

/**
 * Enhanced article processor that extracts more content from NewsAPI articles
 */
export class ArticleProcessor {
  /**
   * Clean up article content by removing truncation markers and other noise
   */
  static cleanArticleContent(content: string): string {
    if (!content) return '';
    
    // Remove truncation markers like "[+123 chars]"
    const cleanContent = content.replace(/\[\+\d+ chars\]$/, '')
                              .replace(/\[\+\d+ characters\]$/, '');
    
    return cleanContent.trim();
  }
  
  /**
   * Extract the most substantial quote from content
   */
  static extractQuote(content: string, minimumLength: number = 20): string | undefined {
    if (!content) return undefined;
    
    // Try to extract quoted text first
    const quoteMatches = content.match(/"([^"]*?)"/g);
    if (quoteMatches) {
      // Find the longest quote that meets minimum length
      const substantialQuotes = quoteMatches
        .map(quote => quote.replace(/"/g, ''))
        .filter(quote => quote.length >= minimumLength)
        .sort((a, b) => b.length - a.length);
      
      if (substantialQuotes.length > 0) {
        return substantialQuotes[0];
      }
    }
    
    // If no quotes found, extract a sentence
    const sentences = content.split(/[.!?][\s\n]/);
    const substantialSentences = sentences
      .filter(sentence => sentence.trim().length >= minimumLength)
      .sort((a, b) => b.length - a.length);
    
    if (substantialSentences.length > 0) {
      return substantialSentences[0].trim();
    }
    
    // Fallback to first N characters
    return content.slice(0, 100) + '...';
  }
  
  /**
   * Create a source object from a NewsAPI article
   */
  static createSourceFromArticle(article: NewsAPIArticle): Source {
    // Clean the article content
    const cleanContent = this.cleanArticleContent(article.content || article.description || '');
    
    return {
      id: this.createSourceId(article.source.id || article.source.name),
      name: article.source.name,
      url: article.url,
      bias: SOURCE_DETAILS[article.source.id as keyof typeof SOURCE_DETAILS]?.bias || 0,
      sentiment: 0,
      quote: this.extractQuote(cleanContent),
      perspective: article.description
    };
  }
  
  /**
   * Create a source ID from a name
   */
  static createSourceId(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  /**
   * Get the most substantial content from an article
   */
  static getSubstantialContent(article: NewsAPIArticle): string {
    // Try content first, then description
    const content = this.cleanArticleContent(article.content || '');
    if (content.length > 100) return content;
    
    // Fall back to description
    return article.description || '';
  }
  
  /**
   * Extract potential entities (people, organizations, locations) from article text
   */
  static extractEntities(text: string): string[] {
    if (!text) return [];
    
    // Look for capitalized words (potentially names, places, organizations)
    const capitalized = text.match(/\b[A-Z][a-zA-Z]*\b/g) || [];
    
    // Look for multi-word capitalized phrases (likely organizations, places)
    const multiWordCapitalized = text.match(/\b[A-Z][a-zA-Z]*(\s+[A-Z][a-zA-Z]*)+\b/g) || [];
    
    // Combine and remove duplicates
    const allEntities = [...capitalized, ...multiWordCapitalized];
    return [...new Set(allEntities)];
  }
  
  /**
   * Determine if an article contains breaking news indicators
   */
  static containsBreakingTerms(article: NewsAPIArticle): boolean {
    const breakingTerms = ['breaking', 'urgent', 'just in', 'update', 'developing', 'latest'];
    const content = `${article.title} ${article.description || ''}`.toLowerCase();
    
    return breakingTerms.some(term => content.includes(term));
  }
}
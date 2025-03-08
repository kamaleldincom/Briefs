// src/lib/utils/date.ts
import { formatDistanceToNow, format, isValid } from 'date-fns';
import { TIME_CONFIG } from '@/lib/config/time';

/**
 * Options for date formatting
 */
export interface DateFormatOptions {
  showRelative?: boolean;  // Show relative time (e.g. "2 hours ago")
  showExact?: boolean;     // Show exact timestamp
  exactFormat?: string;    // Format for exact timestamp
  showBoth?: boolean;      // Show both relative and exact
  fallback?: string;       // Fallback text if date is invalid
}

/**
 * Enhanced date formatter that provides multiple display options
 * 
 * @param date - The date to format
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | number | undefined, options: DateFormatOptions = {}): string {
  // Default options
  const {
    showRelative = true,
    showExact = false,
    showBoth = false,
    exactFormat = TIME_CONFIG.DEFAULT_DATE_FORMAT,
    fallback = 'Unknown date'
  } = options;
  
  // Convert to Date object and validate
  const dateObj = date ? new Date(date) : new Date();
  if (!date || !isValid(dateObj)) {
    return fallback;
  }
  
  try {
    // Format based on options
    if (showBoth || (showRelative && showExact)) {
      return `${formatDistanceToNow(dateObj, { addSuffix: true })} (${format(dateObj, exactFormat)})`;
    } else if (showExact) {
      return format(dateObj, exactFormat);
    } else {
      return formatDistanceToNow(dateObj, { addSuffix: true });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    // Fallback to basic formatting if date-fns fails
    return dateObj.toLocaleString();
  }
}

/**
 * Format a date specifically for story timeline display
 * 
 * @param date - The date to format
 * @returns Formatted timeline date string
 */
export function formatTimelineDate(date: Date | string | number): string {
  return formatDate(date, {
    showRelative: false,
    showExact: true,
    exactFormat: 'MMM d, yyyy h:mm a'
  });
}

/**
 * Format a date for article headers with both relative and exact time
 * 
 * @param date - The date to format
 * @returns Formatted article date string
 */
export function formatArticleDate(date: Date | string | number): string {
  return formatDate(date, {
    showBoth: true,
    exactFormat: 'MMM d, yyyy h:mm a'
  });
}

/**
 * Format a date for feed cards (shorter format)
 * 
 * @param date - The date to format
 * @returns Formatted feed date string
 */
export function formatFeedDate(date: Date | string | number): string {
  return formatDate(date, {
    showRelative: true,
    showExact: false
  });
}
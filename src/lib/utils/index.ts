// src/lib/utils/index.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getSentimentVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  if (score >= 0.3) return "default";
  if (score >= -0.3) return "secondary";
  return "destructive";
}

export function getBiasVariant(score: number): "default" | "secondary" | "destructive" | "outline" {
  const absoluteScore = Math.abs(score);
  if (absoluteScore <= 0.3) return "default";
  if (absoluteScore <= 0.6) return "secondary";
  return "destructive";
}

export function formatSentiment(score: number): string {
  if (score >= 0.3) return 'Positive';
  if (score <= -0.3) return 'Negative';
  return 'Neutral';
}

export function formatBias(score: number): string {
  if (score >= 0.6) return 'Strong Right';
  if (score >= 0.3) return 'Lean Right';
  if (score >= -0.3) return 'Center';
  if (score >= -0.6) return 'Lean Left';
  return 'Strong Left';
}
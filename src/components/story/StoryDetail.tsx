// src/components/story/StoryDetail.tsx
"use client";

import { useState, useEffect } from "react";
import { Story, KeyPoint, Perspective, Source } from "@/lib/types";
import { StoryArticleLink } from "@/lib/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BarChart2, FileText, ExternalLink, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import ShareButton from "../shared/ShareButton";
import OriginalArticleModal from "./OriginalArticleModal";

interface StoryDetailProps {
  story: Story;
}

interface RawArticle {
  id: string;
  sourceArticle: {
    title: string;
    description: string;
    content: string;
    url: string;
    publishedAt: string;
    urlToImage: string | null;
    source: {
      id: string | null;
      name: string;
    };
  };
  storyId?: string;
  processed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Normalize KeyPoint to handle both string and object formats
const normalizeKeyPoint = (point: KeyPoint | string): KeyPoint => {
  if (typeof point === 'string') {
    return { point, importance: 'medium' };
  }
  return point;
};

const KeyPointComponent = ({ point }: { point: KeyPoint }) => (
  <div className="flex items-start gap-3 mb-4">
    <Badge 
      variant={point.importance === 'high' ? 'destructive' : 
              point.importance === 'medium' ? 'secondary' : 'outline'}
      className="mt-1 capitalize"
    >
      {point.importance}
    </Badge>
    <div>
      <p className="text-gray-800 font-medium">{point.point}</p>
      {point.context && (
        <p className="text-gray-600 text-sm mt-1">{point.context}</p>
      )}
    </div>
  </div>
);

const PerspectiveComponent = ({ perspective }: { perspective: Perspective }) => (
  <div className="border-b last:border-0 pb-6 mb-6">
    <div className="flex flex-wrap items-center gap-2 mb-3">
      <Badge variant="outline">{perspective.sourceName}</Badge>
      <Badge variant="secondary">{perspective.stance}</Badge>
      {perspective.bias && (
        <Badge variant="outline" className="text-gray-500">{perspective.bias}</Badge>
      )}
    </div>
    <p className="text-gray-800 mb-3">{perspective.summary}</p>
    {perspective.keyArguments && perspective.keyArguments.length > 0 && (
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Arguments:</h4>
        <ul className="list-disc list-inside space-y-1">
          {perspective.keyArguments.map((arg, idx) => (
            <li key={idx} className="text-gray-600 text-sm">{arg}</li>
          ))}
        </ul>
      </div>
    )}
    {perspective.evidence && perspective.evidence.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Supporting Evidence:</h4>
        <ul className="list-disc list-inside space-y-1">
          {perspective.evidence.map((ev, idx) => (
            <li key={idx} className="text-gray-600 text-sm">{ev}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const NotableQuote = ({ 
  text, 
  source, 
  context, 
  significance,
  timestamp
}: { 
  text: string; 
  source: string; 
  context?: string;
  significance?: string;
  timestamp?: Date;
}) => (
  <blockquote className="border-l-4 border-gray-200 pl-4 my-4">
    <p className="italic text-gray-700">{text}</p>
    <footer className="text-sm mt-2">
      <div className="text-gray-500">— {source}</div>
      {timestamp && (
        <div className="text-gray-400 text-xs mt-1">{formatDate(timestamp)}</div>
      )}
      {context && <div className="text-gray-400 mt-1">{context}</div>}
      {significance && <div className="text-blue-500 mt-1">{significance}</div>}
    </footer>
  </blockquote>
);

const TimelineEvent = ({
  timestamp,
  event,
  sources,
  significance,
  impact,
  relatedQuotes,
  isLatest,
  url
}: {
  timestamp: Date;
  event: string;
  sources: string[];
  significance: string;
  impact?: string;
  relatedQuotes?: string[];
  isLatest?: boolean;
  url?: string;
}) => (
  <div className={`border-l-2 ${isLatest ? 'border-blue-500' : 'border-gray-200'} pl-4 relative`}>
    <div className={`absolute w-3 h-3 ${isLatest ? 'bg-blue-500' : 'bg-gray-400'} rounded-full -left-[7px]`} />
    <div className="text-sm text-gray-500 mb-1">
      {isLatest ? 'Latest Update' : formatDate(timestamp)}
    </div>
    {significance && (
      <div className="text-blue-600 text-sm font-medium mb-1">{significance}</div>
    )}
    <div className="font-medium mb-2">
      {sources.join(', ')}
    </div>
    <p className="text-gray-700 mb-2">{event}</p>
    {impact && (
      <p className="text-gray-600 text-sm mb-2">Impact: {impact}</p>
    )}
    {relatedQuotes && relatedQuotes.length > 0 && (
      <div className="text-sm text-gray-500 mb-2">
        <strong>Related Quotes:</strong>
        <ul className="list-disc list-inside mt-1">
          {relatedQuotes.map((quote, idx) => (
            <li key={idx}>{quote}</li>
          ))}
        </ul>
      </div>
    )}
    {isLatest && url && (
      <a 
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline text-sm"
      >
        Read full coverage →
      </a>
    )}
  </div>
);

// Component to display when analysis section is empty
const EmptyAnalysisSection = ({ title }: { title: string }) => (
  <div className="py-6 text-center">
    <div className="flex justify-center mb-2">
      <AlertTriangle className="h-6 w-6 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-600 mb-2">No {title} Available</h3>
    <p className="text-gray-500 text-sm">
      This section couldn't be generated from the available sources.
    </p>
  </div>
);

export default function StoryDetail({ story }: StoryDetailProps) {
  const [storyLinks, setStoryLinks] = useState<StoryArticleLink[]>([]);
  const [rawArticles, setRawArticles] = useState<RawArticle[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Safely access potentially undefined analysis properties
  const analysis = story.analysis || {};
  const hasAnalysis = !!analysis.summary;
  
  // Normalize key points to handle both string and object formats
  const keyPoints = (analysis.keyPoints || []).map(normalizeKeyPoint);
  
  // Ensure perspectives is always an array
  const perspectives = Array.isArray(analysis.perspectives) ? analysis.perspectives : [];
  
  // Ensure timeline is always an array and dates are properly parsed
  const timeline = (analysis.timeline || []).map(event => ({
    ...event,
    timestamp: event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp)
  }));
  
  // Ensure notableQuotes is always an array
  const notableQuotes = Array.isArray(analysis.notableQuotes) ? analysis.notableQuotes : [];
  
  // Ensure implications structure exists
  const implications = analysis.implications || { shortTerm: [], longTerm: [] };
  const hasImplications = (implications.shortTerm?.length > 0 || implications.longTerm?.length > 0);
  
  // Ensure relatedTopics is always an array
  const relatedTopics = Array.isArray(analysis.relatedTopics) ? analysis.relatedTopics : [];

  // Fetch story links and raw articles
  useEffect(() => {
    const fetchStoryData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch story links
        const linksResponse = await fetch(`/api/stories/${story.id}/links`);
        
        if (linksResponse.ok) {
          const linksData = await linksResponse.json();
          setStoryLinks(linksData);
          
          // If we have links, fetch the corresponding raw articles
          if (linksData && linksData.length > 0) {
            const articleIds = linksData.map((link: StoryArticleLink) => link.articleId);
            
            // Fetch each article
            const articlesData = await Promise.all(
              articleIds.map(async (id: string) => {
                try {
                  const response = await fetch(`/api/articles/${id}`);
                  if (response.ok) {
                    return await response.json();
                  }
                  console.warn(`Failed to fetch article ${id}: ${response.status}`);
                  return null;
                } catch (error) {
                  console.error(`Error fetching article ${id}:`, error);
                  return null;
                }
              })
            );
            
            // Filter out any null results
            setRawArticles(articlesData.filter(Boolean));
          }
        } else {
          console.warn(`Failed to fetch story links: ${linksResponse.status}`);
          // Don't set an error to the user - just log it
        }
      } catch (error) {
        console.error('Error fetching story data:', error);
        setError('Failed to load some story details. The content shown may be incomplete.');
      } finally {
        setLoading(false);
      }
    };

    if (story.id) {
      fetchStoryData();
    }
  }, [story.id]);

  // Helper function to find the most appropriate article ID for a source
  const findArticleIdForSource = (source: Source): string | null => {
    // If we don't have any raw articles or links, return null
    if (!rawArticles.length || !storyLinks.length) {
      return null;
    }
    
    // First try to find a direct URL match
    const directMatch = storyLinks.find(link => {
      const article = rawArticles.find(a => a.id === link.articleId);
      return article && article.sourceArticle.url === source.url;
    });
    
    if (directMatch) {
      return directMatch.articleId;
    }
    
    // Then try to find by source name
    const nameMatch = storyLinks.find(link => {
      const article = rawArticles.find(a => a.id === link.articleId);
      return article && article.sourceArticle.source.name === source.name;
    });
    
    if (nameMatch) {
      return nameMatch.articleId;
    }
    
    // If we have any link for this story, return the first one as fallback
    if (storyLinks.length > 0) {
      return storyLinks[0].articleId;
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header section */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          {story.metadata.imageUrl && (
            <div className="mb-4">
              <img 
                src={story.metadata.imageUrl} 
                alt={story.metadata.imageCaption || story.title}
                className="w-full h-40 object-cover rounded-lg"
              />
              {story.metadata.imageCaption && (
                <p className="text-sm text-gray-500 mt-2">{story.metadata.imageCaption}</p>
              )}
            </div>
          )}
          <h1 className="text-3xl font-bold mb-4">{story.title}</h1>
          <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-4 items-center text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(story.metadata.firstPublished)}
              </div>
              <div className="flex items-center gap-1">
                <BarChart2 className="w-4 h-4" />
                {story.metadata.totalSources} sources
              </div>
            </div>
            <ShareButton 
              storyId={story.id}
              title={story.title}
              summary={story.summary}
            />
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4">
        {error && (
          <div className="my-4 p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </div>
        )}
        
        <div className="mt-6 space-y-6">
          {/* Latest Development */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Latest Development</h3>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-2">
                  {formatDate(story.metadata.lastUpdated)}
                </div>
                <p className="text-gray-700">
                  {story.metadata.latestDevelopment || story.summary}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Story Analysis */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Story Analysis</h3>
              {hasAnalysis ? (
                <div className="space-y-6">
                  <div className="prose max-w-none">
                    <p className="text-gray-700">{analysis.summary}</p>
                    {analysis.backgroundContext && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Background Context</h4>
                        <p className="text-gray-700">{analysis.backgroundContext}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyAnalysisSection title="AI Analysis" />
              )}
            </CardContent>
          </Card>

          {/* Key Points */}
          {keyPoints.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Key Points</h3>
                <div className="space-y-4">
                  {keyPoints.map((point, index) => (
                    <KeyPointComponent key={`keypoint-${index}`} point={point} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Different Perspectives */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Different Perspectives</h3>
              <div className="space-y-4">
                {perspectives.length > 0 ? (
                  perspectives.map((perspective, index) => (
                    <PerspectiveComponent 
                      key={`perspective-${index}-${perspective.sourceName}`} 
                      perspective={perspective}
                    />
                  ))
                ) : story.sources.length > 0 ? (
                  story.sources.map((source, index) => (
                    <div 
                      key={`source-${source.id}-${index}`} 
                      className="border-b last:border-0 pb-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{source.name}</Badge>
                      </div>
                      <p className="text-gray-700">
                        {source.perspective || 'No perspective available'}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyAnalysisSection title="Perspectives" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Implications */}
          {hasImplications && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Implications</h3>
                <div className="space-y-6">
                  {implications.shortTerm && implications.shortTerm.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium mb-3">Short-term Impact</h4>
                      <ul className="list-disc list-inside space-y-2">
                        {implications.shortTerm.map((impact, idx) => (
                          <li key={`short-term-${idx}`} className="text-gray-700">{impact}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {implications.longTerm && implications.longTerm.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium mb-3">Long-term Impact</h4>
                      <ul className="list-disc list-inside space-y-2">
                        {implications.longTerm.map((impact, idx) => (
                          <li key={`long-term-${idx}`} className="text-gray-700">{impact}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notable Statements */}
          {notableQuotes.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Notable Statements</h3>
                <div className="space-y-4">
                  {notableQuotes.map((quote, index) => (
                    <NotableQuote 
                      key={`quote-${index}-${quote.source}`}
                      {...quote}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Developments Timeline</h3>
                <div className="space-y-8">
                  {timeline.map((entry, index) => (
                    <TimelineEvent
                      key={`timeline-${entry.timestamp.toString()}-${index}`}
                      {...entry}
                      isLatest={index === 0}
                      url={index === 0 ? story.sources[0]?.url : undefined}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Topics */}
          {relatedTopics.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Related Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {relatedTopics.map((topic, index) => (
                    <Badge key={`topic-${index}`} variant="secondary">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sources */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">All sources</h3>
              {loading ? (
                <div className="py-8 text-center">
                  <p className="text-gray-500">Loading source details...</p>
                </div>
              ) : story.sources.length > 0 ? (
                <div className="divide-y">
                  {story.sources.map((source, index) => (
                    <div 
                      key={`source-${source.id}-${index}`} 
                      className="py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{source.name}</span>
                        <div className="flex space-x-2">
                          {/* Read on our site button - only show if we have raw articles */}
                          {rawArticles.length > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex items-center"
                              onClick={() => {
                                const articleId = findArticleIdForSource(source);
                                if (articleId) {
                                  setSelectedArticleId(articleId);
                                } else {
                                  console.log('No article found for this source');
                                }
                              }}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Read on our site
                            </Button>
                          )}
                          
                          {/* External link */}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            asChild
                          >
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-500 hover:underline"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Original source
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">No source information available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="h-16" />
        
        {/* Original Article Modal */}
        {selectedArticleId && (
          <OriginalArticleModal
            articleId={selectedArticleId}
            onClose={() => setSelectedArticleId(null)}
          />
        )}
      </div>
    </div>
  );
}
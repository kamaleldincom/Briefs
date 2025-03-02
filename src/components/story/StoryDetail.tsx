"use client";

import { useState, useEffect } from "react";
import { Story, KeyPoint, Perspective, Source } from "@/lib/types";
import { StoryArticleLink } from "@/lib/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BarChart2, FileText, ExternalLink } from "lucide-react";
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
    {perspective.keyArguments?.length > 0 && (
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

export default function StoryDetail({ story }: StoryDetailProps) {
  const [storyLinks, setStoryLinks] = useState<StoryArticleLink[]>([]);
  const [rawArticles, setRawArticles] = useState<RawArticle[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch story links and raw articles
  useEffect(() => {
    const fetchStoryData = async () => {
      try {
        setLoading(true);
        
        // Fetch story links
        const linksResponse = await fetch(`/api/stories/${story.id}/links`);
        
        if (linksResponse.ok) {
          const linksData = await linksResponse.json();
          setStoryLinks(linksData);
          
          // If we have links, fetch the corresponding raw articles
          if (linksData.length > 0) {
            const articleIds = linksData.map((link: StoryArticleLink) => link.articleId);
            
            // Fetch each article
            const articlesData = await Promise.all(
              articleIds.map(async (id: string) => {
                const response = await fetch(`/api/articles/${id}`);
                if (response.ok) {
                  return await response.json();
                }
                return null;
              })
            );
            
            // Filter out any null results
            setRawArticles(articlesData.filter(Boolean));
          }
        }
      } catch (error) {
        console.error('Error fetching story data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStoryData();
  }, [story.id]);

  // Helper function to find the most appropriate article ID for a source
  const findArticleIdForSource = (source: Source): string | null => {
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
              {story.analysis.summary ? (
                <div className="space-y-6">
                  <div className="prose max-w-none">
                    <p className="text-gray-700">{story.analysis.summary}</p>
                    {story.analysis.backgroundContext && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Background Context</h4>
                        <p className="text-gray-700">{story.analysis.backgroundContext}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  <h3 className="text-lg font-semibold mb-2">AI Analysis Coming Soon</h3>
                  <p>We'll provide AI-enhanced analysis of different perspectives and key insights.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key Points */}
          {story.analysis.keyPoints?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Key Points</h3>
                <div className="space-y-4">
                  {story.analysis.keyPoints.map((point, index) => (
                    <KeyPointComponent key={index} point={
                      typeof point === 'string' 
                        ? { point, importance: 'medium' } 
                        : point
                    } />
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
                {story.analysis.perspectives && story.analysis.perspectives.length > 0 ? (
                  story.analysis.perspectives.map((perspective, index) => (
                    <PerspectiveComponent 
                      key={`perspective-${index}-${perspective.sourceName}`} 
                      perspective={perspective}
                    />
                  ))
                ) : (
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
                )}
              </div>
            </CardContent>
          </Card>

          {/* Implications */}
          {story.analysis.implications && (
            (story.analysis.implications.shortTerm?.length > 0 || 
             story.analysis.implications.longTerm?.length > 0) && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">Implications</h3>
                  <div className="space-y-6">
                    {story.analysis.implications.shortTerm && 
                     story.analysis.implications.shortTerm.length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium mb-3">Short-term Impact</h4>
                        <ul className="list-disc list-inside space-y-2">
                          {story.analysis.implications.shortTerm.map((impact, idx) => (
                            <li key={idx} className="text-gray-700">{impact}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {story.analysis.implications.longTerm && 
                     story.analysis.implications.longTerm.length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium mb-3">Long-term Impact</h4>
                        <ul className="list-disc list-inside space-y-2">
                          {story.analysis.implications.longTerm.map((impact, idx) => (
                            <li key={idx} className="text-gray-700">{impact}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* Notable Statements */}
          {story.analysis.notableQuotes && story.analysis.notableQuotes.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Notable Statements</h3>
                <div className="space-y-4">
                  {story.analysis.notableQuotes.map((quote, index) => (
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
          {story.analysis.timeline && story.analysis.timeline.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Developments Timeline</h3>
                <div className="space-y-8">
                  {story.analysis.timeline.map((entry, index) => (
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
          {story.analysis.relatedTopics && story.analysis.relatedTopics.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Related Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {story.analysis.relatedTopics.map((topic, index) => (
                    <Badge key={index} variant="secondary">
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
              ) : (
                <div className="divide-y">
                  {story.sources.map((source, index) => (
                    <div 
                      key={`source-${source.id}-${index}`} 
                      className="py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{source.name}</span>
                        <div className="flex space-x-2">
                          {/* Read on our site button */}
                          {storyLinks.length > 0 && (
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
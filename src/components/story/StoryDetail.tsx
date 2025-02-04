// src/components/story/StoryDetail.tsx
import { Story } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, BarChart2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import ShareButton from "../shared/ShareButton";

interface StoryDetailProps {
  story: Story;
}

const NotableQuote = ({ 
  text, 
  source, 
  context, 
  significance 
}: { 
  text: string; 
  source: string; 
  context?: string;
  significance?: string;
}) => (
  <blockquote className="border-l-4 border-gray-200 pl-4 my-4">
    <p className="italic text-gray-700">{text}</p>
    <footer className="text-sm mt-2">
      <div className="text-gray-500">— {source}</div>
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
  isLatest,
  url
}: {
  timestamp: Date;
  event: string;
  sources: string[];
  significance?: string;
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
  return (
    <div className="min-h-screen bg-background">
      {/* Header with metadata */}
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
                  </div>
                  
                  {story.analysis.keyPoints?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-lg mb-3">Key Points</h4>
                      <ul className="space-y-2">
                        {story.analysis.keyPoints.map((point, index) => (
                          <li 
                            key={`key-point-${index}`} 
                            className="flex items-start gap-2"
                          >
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                              {index + 1}
                            </span>
                            <span className="text-gray-700">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  <h3 className="text-lg font-semibold mb-2">AI Analysis Coming Soon</h3>
                  <p>We'll provide AI-enhanced analysis of different perspectives and key insights.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Different Perspectives */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Different Perspectives</h3>
              <div className="space-y-4">
              {story.analysis.perspectives ? (
  story.analysis.perspectives.map((perspective, index) => (
    <div 
      key={`perspective-${index}-${perspective.sourceName}`} 
      className="border-b last:border-0 pb-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline">{perspective.sourceName}</Badge>
        {perspective.bias && (
          <Badge variant="secondary">{perspective.bias}</Badge>
        )}
      </div>
      <p className="text-gray-700 mb-2">{perspective.viewpoint}</p>
      {perspective.evidence && (
        <p className="text-sm text-gray-500">{perspective.evidence}</p>
      )}
    </div>
  ))
) : (
  // Fallback to mainPerspectives if enhanced perspectives aren't available
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

          {/* Notable Statements */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Notable Statements</h3>
              <div className="space-y-4">
                {[
                  ...(story.analysis.notableQuotes || []),
                  ...story.sources
                    .filter(source => source.quote)
                    .map(source => ({
                      text: source.quote || '',
                      source: source.name
                    }))
                ].map((quote, index) => (
                  <NotableQuote 
                    key={`quote-${index}-${quote.source}`}
                    {...quote}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Developments Timeline</h3>
              <div className="space-y-8">
                {story.analysis.timeline.map((entry, index) => (
                  <TimelineEvent
                    key={`timeline-${entry.timestamp.toString()}-${index}`}
                    {...entry}
                    isLatest={index === 0}
                    url={index === 0 ? story.sources[0].url : undefined}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sources */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">All sources</h3>
              <div className="divide-y">
                {story.sources.map((source, index) => (
                  <div 
                    key={`source-${source.id}-${index}`} 
                    className="py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{source.name}</span>
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm"
                      >
                        Read original
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="h-16" /> {/* Bottom spacing */}
      </div>
    </div>
  );
}
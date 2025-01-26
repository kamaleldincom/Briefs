// src/components/story/StoryDetail.tsx
import { Story } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, BarChart2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface StoryDetailProps {
  story: Story;
}

const NotableQuote = ({ text, source }: { text: string; source: string }) => (
  <blockquote className="border-l-4 border-gray-200 pl-4 my-4">
    <p className="italic text-gray-700">{text}</p>
    <footer className="text-sm text-gray-500 mt-2">— {source}</footer>
  </blockquote>
);

export default function StoryDetail({ story }: StoryDetailProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with metadata */}
      <div className=" top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
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
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4">

          <div className="mt-6">
            {/* Summary */}
              <div className="space-y-6">
                {/* Latest Update with Image */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">Latest Development</h3>
            
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-2">
                {formatDate(story.metadata.lastUpdated)}
              </div>
              <p className="text-gray-700">{story.metadata.latestDevelopment || story.summary}</p>
            </div>
          </CardContent>
        </Card>

        {/* Analysis */}
        <Card>
                <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Story Analysis</h3>
                  <div className="text-gray-500 text-center py-8">
                    <h3 className="text-lg font-semibold mb-2">AI Analysis Coming Soon</h3>
                    <p>We'll provide AI-enhanced analysis of different perspectives and key insights.</p>
                  </div>
                </CardContent>
              </Card>

        {/* Key Points of Contention */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">Different Perspectives</h3>
            <div className="space-y-4">
              {story.sources.map((source, index) => (
                <div key={index} className="border-b last:border-0 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{source.name}</Badge>
                  </div>
                  <p className="text-gray-700">{source.perspective || 'No perspective available'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notable Statements */}
        <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Notable Statements</h3>
                {/* Combine quotes from both analysis and sources */}
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
                    key={index}
                    text={quote.text}
                    source={quote.source}
                  />
                ))}
              </CardContent>
            </Card>
              

            {/* Timeline Tab */}
              <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Developments Timeline</h3>
                <div className="space-y-8">
                  {story.analysis.timeline.map((entry, index) => (
                    <div 
                      key={index} 
                      className={`border-l-2 ${index === 0 ? 'border-blue-500' : 'border-gray-200'} pl-4 relative`}
                    >
                      <div 
                        className={`absolute w-3 h-3 ${index === 0 ? 'bg-blue-500' : 'bg-gray-400'} rounded-full -left-[7px]`} 
                      />
                      <div className="text-sm text-gray-500 mb-1">
                        {index === 0 ? 'Latest Update' : formatDate(entry.timestamp)}
                      </div>
                      <div className="font-medium mb-2">
                        {entry.sources.join(', ')}
                      </div>
                      <p className="text-gray-700 mb-2">{entry.event}</p>
                      {index === 0 && (
                        <a 
                          href={story.sources[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-sm"
                        >
                          Read full coverage →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sources */}
              <Card>
                
                <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">All sources</h3>
                  <div>
                    {story.sources.map((source, index) => (
                      <div key={index} className="py-2 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
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
              
              <div className="m-4"></div>
            
              </div>
          </div>
      </div>
    </div>
  );
}
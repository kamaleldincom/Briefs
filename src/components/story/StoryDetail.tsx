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
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container max-w-4xl mx-auto px-4 py-6">
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

      {/* Tabs and Content */}
      <div className="container max-w-4xl mx-auto px-4">
        <Tabs defaultValue="summary" className="mt-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {/* Summary Tab */}
            <TabsContent value="summary">
              <div className="space-y-6">
                {/* Latest Update with Image */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">Latest Development</h3>
            {story.metadata.imageUrl && (
              <div className="mb-4">
                <img 
                  src={story.metadata.imageUrl} 
                  alt={story.metadata.imageCaption || story.title}
                  className="w-full rounded-lg"
                />
                {story.metadata.imageCaption && (
                  <p className="text-sm text-gray-500 mt-2">{story.metadata.imageCaption}</p>
                )}
              </div>
            )}
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-2">
                {formatDate(story.metadata.lastUpdated)}
              </div>
              <p className="text-gray-700">{story.metadata.latestDevelopment || story.summary}</p>
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
            {story.analysis.notableQuotes?.map((quote, index) => (
              <NotableQuote 
                key={index}
                text={quote.text}
                source={quote.source}
              />
            )) || story.sources.map((source, index) => (
              <NotableQuote 
                key={index}
                text={source.quote || 'No quote available'}
                source={source.name}
              />
            ))}
          </CardContent>
        </Card>
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-8">
                    {/* Latest Update */}
                    <div className="border-l-2 border-blue-500 pl-4 relative">
                      <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px]" />
                      <div className="text-sm text-gray-500 mb-1">
                        Latest Update • {formatDate(story.metadata.lastUpdated)}
                      </div>
                      <div className="font-medium mb-2">{story.sources[0].name}</div>
                      <p className="text-gray-700 mb-2">{story.summary}</p>
                      <a 
                        href={story.sources[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm"
                      >
                        Read full coverage →
                      </a>
                    </div>

                    {/* Initial Coverage */}
                    <div className="border-l-2 border-gray-200 pl-4 relative">
                      <div className="absolute w-3 h-3 bg-gray-400 rounded-full -left-[7px]" />
                      <div className="text-sm text-gray-500 mb-1">
                        First Reported • {formatDate(story.metadata.firstPublished)}
                      </div>
                      <div className="font-medium mb-2">
                        {story.sources[story.sources.length - 1].name}
                      </div>
                      <a 
                        href={story.sources[story.sources.length - 1].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline text-sm"
                      >
                        View original coverage →
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sources Tab */}
            <TabsContent value="sources">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {story.sources.map((source, index) => (
                      <div key={index} className="p-4 bg-muted rounded-lg">
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
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis">
              <Card>
                <CardContent className="p-6">
                  <div className="text-gray-500 text-center py-8">
                    <h3 className="text-lg font-semibold mb-2">AI Analysis Coming Soon</h3>
                    <p>We'll provide AI-enhanced analysis of different perspectives and key insights.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
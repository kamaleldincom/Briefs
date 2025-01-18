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
        <Tabs defaultValue="analysis" className="mt-6">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>

          <div className="mt-6">
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

            {/* Summary Tab */}
            <TabsContent value="summary">
              <Card>
                <CardContent className="p-6 space-y-6">
                  {story.sources.map((source, index) => (
                    <div key={index} className="space-y-2">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        {source.name}
                      </h3>
                      <p className="text-gray-700 pl-4">{story.summary}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {story.sources.map((source, index) => (
                      <div key={index} className="flex gap-4 border-l-2 border-gray-200 pl-4 relative">
                        <div className="absolute w-3 h-3 bg-gray-400 rounded-full -left-[7px]" />
                        <div className="space-y-2">
                          <div className="text-sm text-gray-500">
                            {formatDate(story.metadata.firstPublished)}
                          </div>
                          <div className="font-medium">{source.name}</div>
                          <p className="text-gray-700">{story.summary}</p>
                        </div>
                      </div>
                    ))}
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
          </div>
        </Tabs>
      </div>
    </div>
  );
}
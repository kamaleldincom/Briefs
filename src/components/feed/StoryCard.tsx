// src/components/feed/StoryCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart2, Clock } from "lucide-react";
import { Story } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface StoryCardProps {
  story: Story;
  isVisible?: boolean;
  onClick: () => void;
}

export default function StoryCard({ story, isVisible, onClick }: StoryCardProps) {
  // Get unique source names for display
  const primarySources = story.sources.slice(0, 3);
  const remainingSources = story.sources.length - 3;

  return (
    <div className="h-screen w-full snap-start flex items-center justify-center p-4">
      <Card 
        className="w-full max-w-4xl h-[calc(100vh-2rem)] overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-6 h-full flex flex-col">
          {/* Title */}
          <h2 className="text-3xl font-semibold mb-4">{story.title}</h2>
          
          {/* Sources */}
          <div className="flex flex-wrap gap-2 mb-4">
            {primarySources.map((source, index) => (
              <Badge 
                key={index} 
                variant="outline"
                className="flex items-center gap-1"
              >
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                {source.name}
              </Badge>
            ))}
            {remainingSources > 0 && (
              <Badge variant="outline">
                +{remainingSources} more
              </Badge>
            )}
          </div>

          {/* Coverage Indicator */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <BarChart2 className="w-4 h-4" />
              <span>{story.metadata.totalSources} sources covering this story</span>
            </div>
          </div>

          {/* Summary */}
          <div className="flex-grow overflow-y-auto mb-6">
            <p className="text-gray-700 text-lg leading-relaxed">
              {story.summary}
            </p>
          </div>

          {/* Metadata Footer */}
          <div className="flex flex-wrap items-center justify-between text-sm text-gray-500 pt-4 border-t gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>First reported {formatDate(story.metadata.firstPublished)}</span>
            </div>
            <div className="flex items-center gap-2">
              {story.imageUrl && (
                <span className="text-blue-500">• Has visual coverage</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
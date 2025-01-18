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
  return (
    <div className="h-screen w-full snap-start flex items-center justify-center p-4">
      <Card 
        className="w-full max-w-4xl h-[calc(100vh-2rem)] overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        onClick={onClick}
      >
        <CardContent className="p-6 h-full flex flex-col">
          {/* Title */}
          <h2 className="text-3xl font-semibold mb-4">{story.title}</h2>

          {/* Source List */}
          <div className="flex flex-wrap gap-2 mb-4">
            {story.sources.map((source, index) => (
              <Badge 
                key={index} 
                variant="outline"
                className="flex items-center gap-1"
              >
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                {source.name}
              </Badge>
            ))}
          </div>
          
          {/* Featured Image */}
          {story.metadata.imageUrl && (
            <div className="relative w-full h-3/5 mb-4">
              <img 
                src={story.metadata.imageUrl} 
                alt={story.title}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          )}
          

          {/* Summary */}
          <div className="flex-grow overflow-y-auto mb-6 h-max">
            <p className="text-gray-700 text-lg leading-relaxed">
              {story.summary}
            </p>
          </div>

          {/* Metadata Footer */}
          <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
            <div className="flex items-center gap-4">
              <span>{formatDate(story.metadata.firstPublished)}</span>
              <div className="flex items-center">
                <BarChart2 className="w-4 h-4 mr-1" />
                <span>{story.metadata.totalSources} sources</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
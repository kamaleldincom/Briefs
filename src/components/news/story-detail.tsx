// src/components/news/story-detail.tsx
'use client';

import { Story } from '@/types/news';
import { ArrowLeft, Share, Clock} from 'lucide-react';
import { useState, useEffect } from 'react';
import { TimelineView } from './timeline-view';
import { PolarisationView } from './polarisation-view';
import { SourcesView } from './sources-view';
import { RawArticleView } from './raw-article-view';
import TimelineService from '@/lib/timeline-service';

type StoryDetailProps = {
  story: Story;
  onBack: () => void;
};

export function StoryDetail({ story, onBack }: StoryDetailProps) {
    const [activeTab, setActiveTab] = useState<'brief' | 'timeline' | 'polarisation' | 'sources' | 'original'>('brief');
    const [timelineData, setTimelineData] = useState<{
      days: any[];
      latestUpdate: any;
      coverageTrend: any[];
    } | null>(null);
  
    // Process timeline data when the story changes
    useEffect(() => {
      if (story) {
        // Convert story updates to timeline events format
        const timelineEvents = story.articles.map(article => ({
          id: article.url,
          timestamp: article.publishedAt,
          title: article.title,
          description: article.description || '',
          source: {
            id: article.source.id || '',
            name: article.source.name,
            category: 'press' as const,
            url: article.url,
            color: getSourceColor(article.source.name), // Helper function to assign consistent colors
          }
        }));
  
        const processedData = TimelineService.getInstance().processTimelineEvents(timelineEvents);
        setTimelineData(processedData);
      }
    }, [story]);
  
    // Helper function to get consistent source colors
    const getSourceColor = (sourceName: string) => {
      const colorMap: Record<string, string> = {
        'Reuters': 'orange',
        'Associated Press': 'blue',
        'BBC News': 'red',
        // Add more sources and colors
      };
      return colorMap[sourceName] || 'gray';
    };
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <button 
          className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5"/>
          <span>Back</span>
        </button>
        <button 
          className="p-2 hover:bg-gray-50 rounded-full transition-colors"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: story.title,
                text: story.description,
                url: story.url
              });
            } else {
              navigator.clipboard.writeText(story.url);
            }
          }}
        >
          <Share className="w-5 h-5 text-gray-600"/>
        </button>
      </div>

      <div className="p-4">
        {/* Title and Metadata */}
        <h1 className="text-2xl font-bold mb-3">{story.title}</h1>
        <h1 className="text-2xl font-bold mb-2">{story.title}</h1>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {timelineData && (
              <span>Story Timeline: {timelineData.days.length} Days</span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-100 rounded-lg p-1 flex mb-6">
          {(['brief', 'timeline', 'polarisation', 'sources', 'original'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded transition-all ${
                activeTab === tab 
                  ? 'bg-white shadow-sm text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'original' ? 'Original' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
        {activeTab === 'brief' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">{story.description}</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-xs font-medium text-blue-600">
                  {story.mainSource.name[0]}
                </div>
                <a 
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Read full story on {story.mainSource.name}
                </a>
              </div>
            </div>
          )}

{activeTab === 'polarisation' && <PolarisationView story={story} />}

{activeTab === 'timeline' && timelineData && (
            <TimelineView 
              days={timelineData.days}
              latestUpdate={timelineData.latestUpdate}
              coverageTrend={timelineData.coverageTrend}
            />
          )}

            {activeTab === 'sources' && <SourcesView story={story} />}
            
            {activeTab === 'original' && <RawArticleView storyId={story.id} />}
        </div>
      </div>
    </div>
  );
}
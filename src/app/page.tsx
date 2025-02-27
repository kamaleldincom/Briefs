// src/app/page.tsx
'use client';

import { StoryCard } from '@/components/news/story-card';
import { StoryDetail } from '@/components/news/story-detail';
import { useNews } from '@/hooks/useNews';
import { useFetchNews } from '@/hooks/useFetchNews';
import { useNewsStore } from '@/store/news-store';
import { RefreshCw, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const { 
    activeTab, 
    activeView, 
    activeStory, 
    setActiveView, 
    setActiveStory,
    setActiveTab 
  } = useNewsStore();

  const { data: stories, isLoading, error, refetch } = useNews({ 
    country: activeTab === 'local' ? 'us' : undefined 
  });
  
  const { mutate: fetchFreshNews, isLoading: isFetching } = useFetchNews();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <span className="text-red-500">!</span>
        </div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Failed to load news</h2>
        <p className="text-sm text-gray-500 text-center mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (activeView === 'detail' && activeStory) {
    return (
      <StoryDetail 
        story={activeStory} 
        onBack={() => {
          setActiveView('feed');
          setActiveStory(null);
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white z-10">
        <div className="px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl text-gray-400 font-light">News</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => fetchFreshNews({ country: activeTab === 'local' ? 'us' : undefined })}
              className="p-2 hover:bg-gray-50 rounded-full"
              disabled={isFetching}
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => router.push('/search')}
              className="p-2 hover:bg-gray-50 rounded-full"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-200"/>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 py-3">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            {(['international', 'local'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded transition-all ${
                  activeTab === tab ? 'bg-white shadow-sm' : 'text-gray-500'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stories Feed */}
      <div 
        className="h-[calc(100vh-120px)] mt-[120px] overflow-y-auto snap-y snap-mandatory"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-[calc(100vh-120px)]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"/>
          </div>
        ) : stories?.map((story) => (
          <div 
            key={story.id}
            className="min-h-screen p-4 snap-start"
          >
            <div className="max-w-2xl mx-auto">
              <StoryCard 
                story={story}
                onClick={() => {
                  setActiveStory(story);
                  setActiveView('detail');
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
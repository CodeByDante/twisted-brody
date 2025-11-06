import React, { useState, useEffect } from 'react';
import { Search, TrendingUp as Trending } from 'lucide-react';
import { useStore } from '../lib/store';
import VideoCard from '../components/VideoCard';
import { useNavigate } from 'react-router-dom';

export default function ExplorePage() {
  const { videos, settings } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof videos>([]);
  const [trendingVideos, setTrendingVideos] = useState<typeof videos>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Get trending videos sorted by view count, respecting hidden status
    const visibleVideos = videos.filter(video => 
      !video.isShort && // Exclude Brody Twis posts
      (!video.isHidden || settings.showHiddenVideos)
    );
    const sorted = [...visibleVideos].sort((a, b) => (b.views || 0) - (a.views || 0));
    setTrendingVideos(sorted.slice(0, 12));
  }, [videos, settings.showHiddenVideos]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const visibleVideos = videos.filter(video => 
        !video.isShort && // Exclude Brody Twis posts
        (!video.isHidden || settings.showHiddenVideos)
      );
      const results = visibleVideos.filter(video => 
        video.title.toLowerCase().includes(query) ||
        video.description?.toLowerCase().includes(query) ||
        video.hashtags.some(tag => tag.toLowerCase().includes(query)) ||
        video.actors?.some(actor => actor.toLowerCase().includes(query))
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-surface p-6 rounded-lg">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar videos por título, descripción, hashtags o actores..."
            className="w-full pl-12 pr-4 py-3 bg-surface-light rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </form>
      </div>

      {searchResults.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Resultados de búsqueda</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {searchResults.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Trending className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">En tendencia</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {trendingVideos.map(video => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
import React from 'react';
import { Bookmark } from 'lucide-react';
import { useStore } from '../lib/store';
import VideoCard from '../components/VideoCard';

export default function SavedPage() {
  const { videos, saved, watchLater, playlists } = useStore();
  
  // Combine all saved video IDs from different sources
  const allSavedVideoIds = new Set([
    ...saved,
    ...watchLater,
    ...playlists.flatMap(playlist => playlist.videoIds)
  ]);
  
  const savedVideos = videos.filter(video => 
    allSavedVideoIds.has(video.id) && !video.isShort // Exclude Brody Twis posts
  );

  if (savedVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bookmark className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-400 mb-2">No hay videos guardados</h2>
        <p className="text-gray-500">
          Guarda videos para verlos más tarde o agrégalos a tus bibliotecas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Bookmark className="h-8 w-8 text-primary" />
        Videos Guardados
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {savedVideos.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
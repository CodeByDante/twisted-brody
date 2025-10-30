import React from 'react';
import { Star } from 'lucide-react';
import { useStore } from '../lib/store';
import VideoCard from '../components/VideoCard';

export default function FavoritesPage() {
  const { videos, favorites } = useStore();
  const favoriteVideos = videos.filter(video => 
    favorites.includes(video.id) && !video.isShort // Exclude Brody Twis posts
  );

  if (favoriteVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Star className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-400 mb-2">No hay videos favoritos</h2>
        <p className="text-gray-500">
          Marca videos como favoritos para encontrarlos fácilmente aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Star className="h-8 w-8 text-primary" />
        Videos Favoritos
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {favoriteVideos.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
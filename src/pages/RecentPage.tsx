import React from 'react';
import { Clock } from 'lucide-react';
import { useStore } from '../lib/store';
import VideoCard from '../components/VideoCard';

export default function RecentPage() {
  const { videoHistory } = useStore();
  const filteredHistory = videoHistory.filter(video => !video.isShort); // Exclude Brody Twis posts

  if (filteredHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-400 mb-2">No hay videos recientes</h2>
        <p className="text-gray-500">
          Los videos que veas aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Clock className="h-8 w-8 text-primary" />
        Videos Recientes
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredHistory.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
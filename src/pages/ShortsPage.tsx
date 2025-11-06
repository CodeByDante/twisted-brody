import React from 'react';
import { useStore } from '../lib/store';
import VideoCard from '../components/VideoCard';

const ShortsPage: React.FC = () => {
  const { videos } = useStore();
  
  // Filter videos that are marked as shorts
  const shortVideos = videos.filter(video => video.isShort);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Shorts</h1>
      
      {shortVideos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No short videos found</p>
          <p className="text-gray-400 text-sm mt-2">Short videos will appear here when added</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {shortVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ShortsPage;
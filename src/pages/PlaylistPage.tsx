import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Folder, ArrowLeft } from 'lucide-react';
import { useStore } from '../lib/store';
import VideoCard from '../components/VideoCard';

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const { playlists, videos } = useStore();
  const playlist = playlists.find(p => p.id === id);

  if (!playlist) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-400">Biblioteca no encontrada</h2>
        <Link to="/library" className="text-primary hover:underline mt-4 inline-block">
          Volver a la biblioteca
        </Link>
      </div>
    );
  }

  const playlistVideos = videos.filter(video => 
    playlist.videoIds.includes(video.id) && !video.isShort // Exclude Brody Twis posts
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/library"
          className="p-2 hover:bg-surface-light rounded-lg transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Folder className="h-8 w-8 text-primary" />
          {playlist.name}
        </h1>
      </div>

      {playlist.description && (
        <p className="text-gray-400">{playlist.description}</p>
      )}

      {playlistVideos.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-400 mb-2">No hay videos en esta biblioteca</h2>
          <p className="text-gray-500">
            Agrega videos a esta biblioteca para verlos aquí
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {playlistVideos.map(video => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
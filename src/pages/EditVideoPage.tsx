import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import VideoForm from '../components/VideoForm';
import type { Video } from '../types';

export default function EditVideoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { videos, updateVideo } = useStore();
  const video = videos.find(v => v.id === id);

  if (!video) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-400">Video no encontrado</h2>
        <button
          onClick={() => navigate('/')}
          className="text-primary hover:underline mt-4 inline-block"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const handleSubmit = async (data: Partial<Video>) => {
    try {
      await updateVideo(video.id, {
        title: data.title,
        description: data.description,
        url: data.url,
        servers: data.servers || [], // Ensure servers are included in update
        hashtags: data.hashtags,
        categoryIds: data.categoryIds,
        isShort: data.isShort,
        actors: data.actors,
        customThumbnailUrl: data.customThumbnailUrl,
        isHidden: data.isHidden,
        linkedVideos: data.linkedVideos
      });
      navigate(`/video/${video.id}`);
    } catch (error) {
      console.error('Error al actualizar el video:', error);
      alert('Error al actualizar el video. Por favor, inténtalo de nuevo.');
    }
  };

  return (
    <VideoForm
      initialData={{
        title: video.title,
        description: video.description || '',
        url: video.url,
        servers: video.servers || [], // Pass existing servers to form
        hashtags: video.hashtags,
        categoryIds: video.categoryIds,
        isShort: video.isShort,
        actors: video.actors || [],
        customThumbnailUrl: video.customThumbnailUrl,
        isHidden: video.isHidden,
        linkedVideos: video.linkedVideos || []
      }}
      onSubmit={handleSubmit}
      onClose={() => navigate(`/video/${video.id}`)}
    />
  );
}
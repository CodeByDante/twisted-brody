import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Bookmark, Play, Eye } from 'lucide-react';
import { useStore } from '../lib/store';
import { getVideoThumbnail, getVideoProvider } from '../lib/utils';
import ImageLoader from './ImageLoader';
import type { Video } from '../types';

interface VideoCardProps {
  video: Video;
  onVideoClick?: (videoId: string, e: React.MouseEvent) => void;
}

export default function VideoCard({ video, onVideoClick }: VideoCardProps) {
  const { toggleFavorite, toggleSaved, favorites, saved } = useStore();
  const provider = getVideoProvider(video.url);
  const thumbnail = video.customThumbnailUrl || getVideoThumbnail(video.url);
  const isFavorite = favorites.includes(video.id);
  const isSaved = saved.includes(video.id);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onVideoClick) {
      e.preventDefault();
      onVideoClick(video.id, e);
    }
  };

  const formatViewCount = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  return (
    <div className="bg-surface rounded-lg overflow-hidden shadow-lg group relative transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl animate-scale-in">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(video.id);
          }}
          className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 transform hover:scale-110 ${
            isFavorite 
              ? 'bg-primary text-white' 
              : 'bg-black/50 text-white hover:bg-black/70'
          }`}
          title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
          <Heart className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSaved(video.id);
          }}
          className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 transform hover:scale-110 ${
            isSaved 
              ? 'bg-primary text-white' 
              : 'bg-black/50 text-white hover:bg-black/70'
          }`}
          title={isSaved ? 'Quitar de guardados' : 'Guardar video'}
        >
          <Bookmark className="h-4 w-4" fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <Link
        to={`/video/${video.id}`}
        onClick={handleClick}
        className="block relative group touch-manipulation"
      >
        <div className="aspect-video bg-surface-light overflow-hidden">
          {video.customThumbnailUrl ? (
            <ImageLoader
              src={video.customThumbnailUrl}
              alt={video.title}
              className="transition-transform duration-500 group-hover:scale-110"
              aspectRatio="aspect-video"
            />
          ) : thumbnail ? (
            <ImageLoader
              src={thumbnail}
              alt={video.title}
              className="transition-transform duration-500 group-hover:scale-110"
              aspectRatio="aspect-video"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 loading-skeleton">
              <div className="text-sm sm:text-base">
                Vista previa no disponible
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
            <Play className="h-12 w-12 text-white transform transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>
      </Link>
      
      <div className="p-4 space-y-2">
        <Link
          to={`/video/${video.id}`}
          onClick={handleClick}
          className="block group/title"
        >
          <h2 className="font-semibold text-lg transition-colors duration-300 group-hover/title:text-primary line-clamp-2">
            {video.title}
          </h2>
        </Link>
        
        {video.description && (
          <p className="text-gray-400 text-sm line-clamp-2 transition-opacity duration-300 group-hover:opacity-100">
            {video.description}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-gray-400 text-sm">
          <Eye className="h-4 w-4" />
          <span className="transition-all duration-300 group-hover:text-primary">
            {formatViewCount(video.views || 0)} vistas
          </span>
        </div>
      </div>
    </div>
  );
}
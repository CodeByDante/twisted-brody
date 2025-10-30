import React, { useState } from 'react';
import { Plus, X, Search, Trash2, Check } from 'lucide-react';
import { useStore } from '../lib/store';
import type { Video } from '../types';
import ImageLoader from './ImageLoader';

interface CustomCollectionManagerProps {
  collectionName: string;
  currentVideos: { id: string; title: string; customThumbnailUrl?: string; views: number }[];
  onUpdate: (videoIds: string[]) => void;
  onClose: () => void;
}

export default function CustomCollectionManager({ 
  collectionName, 
  currentVideos, 
  onUpdate, 
  onClose 
}: CustomCollectionManagerProps) {
  const { videos } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>(
    currentVideos.map(v => v.id)
  );

  const availableVideos = videos.filter(video => 
    !video.isShort && // Exclude Brody Twis posts
    (video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     video.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleToggleVideo = (videoId: string) => {
    setSelectedVideoIds(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      }
      return [...prev, videoId];
    });
  };

  const handleSave = () => {
    onUpdate(selectedVideoIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Gestionar Colección: {collectionName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar videos para agregar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-light rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableVideos.map(video => (
              <div
                key={video.id}
                className={`bg-surface-light rounded-lg p-3 cursor-pointer transition-all ${
                  selectedVideoIds.includes(video.id) 
                    ? 'ring-2 ring-primary bg-primary/10' 
                    : 'hover:bg-surface'
                }`}
                onClick={() => handleToggleVideo(video.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-12 bg-surface rounded overflow-hidden flex-shrink-0">
                    {video.customThumbnailUrl ? (
                      <ImageLoader
                        src={video.customThumbnailUrl}
                        alt={video.title}
                        aspectRatio="w-16 h-12"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-xs">Sin imagen</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{video.title}</h3>
                    {video.description && (
                      <p className="text-sm text-gray-400 truncate">{video.description}</p>
                    )}
                    <p className="text-xs text-gray-500">{video.views || 0} vistas</p>
                  </div>
                  {selectedVideoIds.includes(video.id) && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center">
          <p className="text-sm text-gray-400">
            {selectedVideoIds.length} videos seleccionados
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface-light hover:bg-surface text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
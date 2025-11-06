import React, { useState } from 'react';
import { Library, Plus, Folder, Clock, X, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import VideoCard from '../components/VideoCard';
import { Link } from 'react-router-dom';
import ImageLoader from '../components/ImageLoader';

interface LibraryFormModalProps {
  onClose: () => void;
  onSubmit: (name: string, description?: string) => void;
  initialData?: {
    name: string;
    description?: string;
  };
  title: string;
  submitText: string;
}

function LibraryFormModal({ onClose, onSubmit, initialData, title, submitText }: LibraryFormModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name, description);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface p-6 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Nombre *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Descripción
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
              rows={3}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md"
          >
            {submitText}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const { playlists, videos, watchLater, createPlaylist, updatePlaylist, deletePlaylist } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<{
    id: string;
    name: string;
    description?: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const watchLaterVideos = videos.filter(video => 
    watchLater.includes(video.id) && !video.isShort // Exclude Brody Twis posts
  );

  const handleDeletePlaylist = async (playlistId: string) => {
    await deletePlaylist(playlistId);
    setShowDeleteConfirm(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Library className="h-8 w-8 text-primary" />
          Biblioteca
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">Nueva Biblioteca</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/watch-later"
          className="bg-surface rounded-lg p-6 hover:ring-2 hover:ring-primary transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Ver más tarde</h2>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
          </div>
          <p className="text-gray-400 mb-4">
            {watchLaterVideos.length} video{watchLaterVideos.length !== 1 ? 's' : ''}
          </p>
          {watchLaterVideos.length > 0 && (
            <div className="aspect-video bg-surface-light rounded-lg overflow-hidden">
              <ImageLoader
                src={watchLaterVideos[0].customThumbnailUrl || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1920&auto=format&fit=crop&q=100&ixlib=rb-4.0.3'}
                alt="Video thumbnail"
                aspectRatio="aspect-video"
              />
            </div>
          )}
        </Link>

        {playlists.map(playlist => {
          const playlistVideos = videos.filter(video => 
            playlist.videoIds.includes(video.id) && !video.isShort // Exclude Brody Twis posts
          );
          return (
            <div
              key={playlist.id}
              className="bg-surface rounded-lg p-6 group relative"
            >
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={() => setEditingPlaylist({
                    id: playlist.id,
                    name: playlist.name,
                    description: playlist.description
                  })}
                  className="p-2 hover:bg-surface-light rounded-full transition-colors"
                  title="Editar biblioteca"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(playlist.id)}
                  className="p-2 hover:bg-surface-light rounded-full transition-colors text-red-500"
                  title="Eliminar biblioteca"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <Link
                to={`/playlist/${playlist.id}`}
                className="block"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Folder className="h-6 w-6 text-primary" />
                  <h2 className="text-xl font-semibold">{playlist.name}</h2>
                </div>
                <p className="text-gray-400 mb-4">
                  {playlistVideos.length} video{playlistVideos.length !== 1 ? 's' : ''}
                </p>
                {playlistVideos.length > 0 && (
                  <div className="aspect-video bg-surface-light rounded-lg overflow-hidden">
                    <ImageLoader
                      src={playlistVideos[0].customThumbnailUrl || 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1920&auto=format&fit=crop&q=100&ixlib=rb-4.0.3'}
                      alt="Video thumbnail"
                      aspectRatio="aspect-video"
                    />
                  </div>
                )}
                {playlist.description && (
                  <p className="text-gray-400 mt-4 line-clamp-2">{playlist.description}</p>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <LibraryFormModal
          title="Nueva Biblioteca"
          submitText="Crear Biblioteca"
          onClose={() => setShowCreateModal(false)}
          onSubmit={(name, description) => createPlaylist(name, description)}
        />
      )}

      {editingPlaylist && (
        <LibraryFormModal
          title="Editar Biblioteca"
          submitText="Guardar Cambios"
          initialData={editingPlaylist}
          onClose={() => setEditingPlaylist(null)}
          onSubmit={(name, description) => {
            updatePlaylist(editingPlaylist.id, { name, description });
          }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">¿Eliminar biblioteca?</h2>
            <p className="text-gray-300 mb-6">
              Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar esta biblioteca?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeletePlaylist(showDeleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md"
              >
                Eliminar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-surface-light hover:bg-surface-light/80 text-white font-medium py-2 px-4 rounded-md"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
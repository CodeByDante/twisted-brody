import React, { useState } from 'react';
import { Plus, X, Folder, Clock, Check } from 'lucide-react';
import { useStore } from '../lib/store';

interface SaveToPlaylistModalProps {
  videoId: string;
  onClose: () => void;
}

export default function SaveToPlaylistModal({ videoId, onClose }: SaveToPlaylistModalProps) {
  const { playlists, createPlaylist, addToPlaylist, removeFromPlaylist, toggleWatchLater, watchLater } = useStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim(), newPlaylistDescription.trim());
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setShowCreateForm(false);
    }
  };

  const handleTogglePlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      if (playlist.videoIds.includes(videoId)) {
        removeFromPlaylist(playlistId, videoId);
      } else {
        addToPlaylist(playlistId, videoId);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface p-6 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Guardar en...</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => toggleWatchLater(videoId)}
            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-light transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <span>Ver más tarde</span>
            </div>
            {watchLater.includes(videoId) && (
              <Check className="h-5 w-5 text-primary" />
            )}
          </button>

          <div className="border-t border-gray-700 my-4" />

          <div className="space-y-2">
            {playlists.map(playlist => (
              <button
                key={playlist.id}
                onClick={() => handleTogglePlaylist(playlist.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-surface-light transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Folder className="h-5 w-5 text-primary" />
                  <span>{playlist.name}</span>
                </div>
                {playlist.videoIds.includes(videoId) && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}
          </div>

          {showCreateForm ? (
            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  id="name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
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
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md"
                >
                  Crear
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 hover:bg-surface-light rounded-md transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center gap-2 p-3 text-primary hover:bg-surface-light rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Crear nueva biblioteca</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
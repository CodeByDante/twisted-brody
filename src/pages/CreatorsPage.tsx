import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Search, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useStore } from '../lib/store';
import { Link, useNavigate } from 'react-router-dom';
import { uploadToImgBB } from '../lib/utils';
import { API_CONFIG } from '../lib/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ImageLoader from '../components/ImageLoader';

interface CreatorFormModalProps {
  onClose: () => void;
  onSubmit: (name: string, imageUrl?: string) => void;
  initialData?: {
    name: string;
    imageUrl?: string;
  };
  title: string;
  submitText: string;
}

function CreatorFormModal({ onClose, onSubmit, initialData, title, submitText }: CreatorFormModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsUploading(true);
    try {
      let imageUrl = initialData?.imageUrl;
      if (imageFile) {
        const uploadedUrl = await uploadToImgBB(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
      onSubmit(name.trim(), imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
    }
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
            <label className="block text-sm font-medium mb-1">
              Imagen (opcional)
            </label>
            <div className="space-y-2">
              {imagePreview ? (
                <div className="relative mx-auto w-32 h-32">
                  <ImageLoader
                    src={imagePreview}
                    alt="Vista previa"
                    className="rounded-full ring-4 ring-surface-light"
                    aspectRatio="w-32 h-32"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative mx-auto w-32 h-32">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
                  />
                  <div className="w-full h-full rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center bg-surface-light hover:bg-surface transition-colors">
                    <div className="text-center">
                      <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-xs text-gray-400">
                        Subir imagen
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50"
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Subiendo...</span>
              </div>
            ) : (
              submitText
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CreatorsPage() {
  const { videos, settings } = useStore();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatorImages, setCreatorImages] = useState<Record<string, string>>({});
  const [editingCreator, setEditingCreator] = useState<{
    name: string;
    imageUrl?: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [singleSelection, setSingleSelection] = useState(true);
  const [selectedCreators, setSelectedCreators] = useState<string[]>([]);
  const [creators, setCreators] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        const docRef = doc(db, 'creatorImages', 'temp-user');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCreatorImages(docSnap.data() as Record<string, string>);
          Object.keys(docSnap.data()).forEach(name => {
            setCreators(prev => new Set(prev).add(name));
          });
        }

        videos.forEach(video => {
          video.creators?.forEach(creator => {
            setCreators(prev => new Set(prev).add(creator));
          });
        });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [videos]);

  const creatorStats = React.useMemo(() => {
    const stats = new Map<string, number>();
    creators.forEach(creator => {
      const count = videos.filter(video => 
        video.creators?.includes(creator) &&
        !video.isShort && // Exclude Brody Twis posts
        (settings.showHiddenVideos || !video.isHidden)
      ).length;
      stats.set(creator, count);
    });
    return stats;
  }, [creators, videos, settings.showHiddenVideos]);

  const filteredCreators = Array.from(creators)
    .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const countA = creatorStats.get(a) || 0;
      const countB = creatorStats.get(b) || 0;
      return countB - countA || a.localeCompare(b);
    });

  const handleAddCreator = async (name: string, imageUrl?: string) => {
    try {
      const newImages = { ...creatorImages };
      if (imageUrl) {
        newImages[name] = imageUrl;
      }
      await setDoc(doc(db, 'creatorImages', 'temp-user'), newImages);
      setCreatorImages(newImages);
      setCreators(prev => new Set(prev).add(name));
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error saving creator image:', error);
    }
  };

  const handleEditCreator = async (oldName: string, newName: string, imageUrl?: string) => {
    try {
      const newImages = { ...creatorImages };
      delete newImages[oldName];
      if (imageUrl) {
        newImages[newName] = imageUrl;
      }
      await setDoc(doc(db, 'creatorImages', 'temp-user'), newImages);
      setCreatorImages(newImages);
      
      setCreators(prev => {
        const updated = new Set(prev);
        updated.delete(oldName);
        updated.add(newName);
        return updated;
      });

      setEditingCreator(null);
    } catch (error) {
      console.error('Error updating creator:', error);
    }
  };

  const handleDeleteCreator = async (name: string) => {
    try {
      const newImages = { ...creatorImages };
      delete newImages[name];
      await setDoc(doc(db, 'creatorImages', 'temp-user'), newImages);
      setCreatorImages(newImages);
      
      setCreators(prev => {
        const updated = new Set(prev);
        updated.delete(name);
        return updated;
      });

      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting creator:', error);
    }
  };

  const handleCreatorClick = (name: string) => {
    if (singleSelection) {
      navigate(`/?creator=${encodeURIComponent(name)}`);
    } else {
      setSelectedCreators(prev => {
        if (prev.includes(name)) {
          return prev.filter(n => n !== name);
        }
        return [...prev, name];
      });
    }
  };

  const handleSearch = () => {
    if (selectedCreators.length > 0) {
      const searchParams = selectedCreators.map(name => `creator=${encodeURIComponent(name)}`).join('&');
      navigate(`/?${searchParams}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando creadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Creadores</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSingleSelection(!singleSelection);
                setSelectedCreators([]);
              }}
              className="text-gray-300 hover:text-white"
            >
              {singleSelection ? (
                <ToggleRight className="h-6 w-6 text-primary" />
              ) : (
                <ToggleLeft className="h-6 w-6" />
              )}
            </button>
            <span className="text-sm text-gray-300">
              {singleSelection ? 'Selección única' : 'Selección múltiple'}
            </span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Nuevo Creador</span>
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar creadores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-light rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          {!singleSelection && selectedCreators.length > 0 && (
            <button
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
            >
              <Search className="h-4 w-4" />
              <span>Buscar ({selectedCreators.length})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {filteredCreators.map(name => {
            const count = creatorStats.get(name) || 0;
            return (
              <div
                key={name}
                className={`group relative cursor-pointer ${
                  selectedCreators.includes(name) ? 'ring-2 ring-primary rounded-lg' : ''
                }`}
                onClick={() => handleCreatorClick(name)}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-surface ring-4 ring-surface-light group-hover:ring-primary transition-all">
                    {creatorImages[name] ? (
                      <ImageLoader
                        src={creatorImages[name]}
                        alt={name}
                        aspectRatio="w-24 h-24"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium truncate max-w-[120px] group-hover:text-primary transition-colors">
                      {name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {count} video{count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCreator({
                        name,
                        imageUrl: creatorImages[name]
                      });
                    }}
                    className="p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
                    title="Editar creador"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(name);
                    }}
                    className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Eliminar creador"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showCreateModal && (
        <CreatorFormModal
          title="Nuevo Creador"
          submitText="Crear Creador"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleAddCreator}
        />
      )}

      {editingCreator && (
        <CreatorFormModal
          title="Editar Creador"
          submitText="Guardar Cambios"
          initialData={editingCreator}
          onClose={() => setEditingCreator(null)}
          onSubmit={(name, imageUrl) => handleEditCreator(editingCreator.name, name, imageUrl)}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">¿Eliminar creador?</h2>
            <p className="text-gray-300 mb-6">
              ¿Estás seguro de que deseas eliminar este creador? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeleteCreator(showDeleteConfirm)}
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
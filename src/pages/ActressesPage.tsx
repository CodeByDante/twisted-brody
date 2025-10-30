import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Search, Pencil, Trash2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useStore } from '../lib/store';
import { Link, useNavigate } from 'react-router-dom';
import { uploadToImgBB } from '../lib/utils';
import { API_CONFIG } from '../lib/config';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import ImageLoader from '../components/ImageLoader';

interface ActressFormModalProps {
  onClose: () => void;
  onSubmit: (name: string, imageUrl?: string) => void;
  initialData?: {
    name: string;
    imageUrl?: string;
  };
  title: string;
  submitText: string;
}

function ActressFormModal({ onClose, onSubmit, initialData, title, submitText }: ActressFormModalProps) {
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

export default function ActressesPage() {
  const { videos, settings } = useStore();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actressImages, setActressImages] = useState<Record<string, string>>({});
  const [editingActress, setEditingActress] = useState<{
    name: string;
    imageUrl?: string;
  } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [singleSelection, setSingleSelection] = useState(true);
  const [selectedActresses, setSelectedActresses] = useState<string[]>([]);
  const [actresses, setActresses] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load actress images
        const docRef = doc(db, 'actressImages', 'temp-user');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setActressImages(docSnap.data() as Record<string, string>);
          // Add actresses from images to the set
          Object.keys(docSnap.data()).forEach(name => {
            setActresses(prev => new Set(prev).add(name));
          });
        }


        // Add all actresses from videos to the set
        videos.forEach(video => {
          video.actors?.forEach(actor => {
            setActresses(prev => new Set(prev).add(actor));
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

  // Get video counts for actresses based on visibility settings
  const actressStats = React.useMemo(() => {
    const stats = new Map<string, number>();
    actresses.forEach(actress => {
      const count = videos.filter(video => 
        video.actors?.includes(actress) &&
        !video.isShort && // Exclude Brody Twis posts
        (settings.showHiddenVideos || !video.isHidden)
      ).length;
      stats.set(actress, count);
    });
    return stats;
  }, [actresses, videos, settings.showHiddenVideos]);


  // Filter actresses based on search query
  const filteredActresses = Array.from(actresses)
    .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const countA = actressStats.get(a) || 0;
      const countB = actressStats.get(b) || 0;
      return countB - countA || a.localeCompare(b);
    });


  const handleAddActress = async (name: string, imageUrl?: string) => {
    try {
      const newImages = { ...actressImages };
      if (imageUrl) {
        newImages[name] = imageUrl;
      }
      await setDoc(doc(db, 'actressImages', 'temp-user'), newImages);
      setActressImages(newImages);
      setActresses(prev => new Set(prev).add(name));
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error saving actress image:', error);
    }
  };


  const handleEditActress = async (oldName: string, newName: string, imageUrl?: string) => {
    try {
      const newImages = { ...actressImages };
      // Remove old name entry
      delete newImages[oldName];
      // Add new name entry with image URL
      if (imageUrl) {
        newImages[newName] = imageUrl;
      }
      // Update in Firestore
      await setDoc(doc(db, 'actressImages', 'temp-user'), newImages);
      setActressImages(newImages);
      
      // Update actresses set
      setActresses(prev => {
        const updated = new Set(prev);
        updated.delete(oldName);
        updated.add(newName);
        return updated;
      });

      // Update actress name in videos
      const videosRef = collection(db, 'videos');
      const videosSnapshot = await getDocs(videosRef);
      const batch = writeBatch(db);

      videosSnapshot.docs.forEach(doc => {
        const video = doc.data();
        if (video.actors?.includes(oldName)) {
          const updatedActors = video.actors.map((actor: string) => 
            actor === oldName ? newName : actor
          );
          batch.update(doc.ref, { actors: updatedActors });
        }
      });

      await batch.commit();
      setEditingActress(null);
    } catch (error) {
      console.error('Error updating actress:', error);
    }
  };


  const handleDeleteActress = async (name: string) => {
    try {
      const batch = writeBatch(db);

      // Remove actress from images
      const newImages = { ...actressImages };
      delete newImages[name];
      await setDoc(doc(db, 'actressImages', 'temp-user'), newImages);
      setActressImages(newImages);
      
      // Remove from actresses set
      setActresses(prev => {
        const updated = new Set(prev);
        updated.delete(name);
        return updated;
      });

      // Remove actress from videos
      const videosRef = collection(db, 'videos');
      const videosSnapshot = await getDocs(videosRef);
      
      videosSnapshot.docs.forEach(doc => {
        const video = doc.data();
        if (video.actors?.includes(name)) {
          const updatedActors = video.actors.filter((actor: string) => actor !== name);
          batch.update(doc.ref, { actors: updatedActors });
        }
      });

      await batch.commit();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting actress:', error);
      alert('Error al eliminar la actriz. Por favor, inténtalo de nuevo.');
    }
  };


  const handleActressClick = (name: string) => {
    if (singleSelection) {
      navigate(`/?actor=${encodeURIComponent(name)}`);
    } else {
      setSelectedActresses(prev => {
        if (prev.includes(name)) {
          return prev.filter(n => n !== name);
        }
        return [...prev, name];
      });
    }
  };


  const handleSearch = () => {
    if (selectedActresses.length > 0) {
      const searchParams = selectedActresses.map(name => `actor=${encodeURIComponent(name)}`).join('&');
      navigate(`/?${searchParams}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Actrices</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSingleSelection(!singleSelection);
                setSelectedActresses([]);
              }}
              className="text-gray-300 hover:text-white"
            >
              {singleSelection ? (
                <ToggleRight className="h-5 w-5 text-primary" />
              ) : (
                <ToggleLeft className="h-5 w-5" />
              )}
            </button>
            <span className="text-xs text-gray-300">
              {singleSelection ? 'Selección única' : 'Selección múltiple'}
            </span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-1 px-2 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo</span>
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar actrices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-light rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          {!singleSelection && selectedActresses.length > 0 && (
            <button
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm"
            >
              <Search className="h-4 w-4" />
              <span>Buscar ({selectedActresses.length})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-3">
          {filteredActresses.map(name => {
            const count = actressStats.get(name) || 0;
            const isSelected = selectedActresses.includes(name);
            const imageUrl = actressImages[name];
            
            return (
              <div
                key={name}
                className={`group relative cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-primary rounded-lg' : ''
                }`}
                onClick={() => handleActressClick(name)}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-surface ring-2 ring-surface-light group-hover:ring-primary transition-all">
                    {imageUrl ? (
                      <ImageLoader
                        src={imageUrl}
                        alt={name}
                        aspectRatio="w-16 h-16"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="font-medium truncate max-w-[80px] group-hover:text-primary transition-colors text-sm">
                      {name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {count} video{count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingActress({
                        name,
                        imageUrl: actressImages[name]
                      });
                    }}
                    className="p-1 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
                    title="Editar actriz"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(name);
                    }}
                    className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Eliminar actriz"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showCreateModal && (
        <ActressFormModal
          title="Nueva Actriz"
          submitText="Crear Actriz"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleAddActress}
        />
      )}

      {editingActress && (
        <ActressFormModal
          title="Editar Actriz"
          submitText="Guardar Cambios"
          initialData={editingActress}
          onClose={() => setEditingActress(null)}
          onSubmit={(name, imageUrl) => handleEditActress(editingActress.name, name, imageUrl)}
        />
      )}


      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              ¿Eliminar actriz?
            </h2>
            <p className="text-gray-300 mb-6">
              ¿Estás seguro de que deseas eliminar esta actriz? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeleteActress(showDeleteConfirm)}
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
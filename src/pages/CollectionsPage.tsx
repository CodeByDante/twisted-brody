import React, { useState, useEffect } from 'react';
import { Search, TrendingUp as Trending, Link as LinkIcon, Users, Heart, Share2, Play, Bookmark, Check, ExternalLink, Image as ImageIcon, Loader2, Library, Plus, Folder, Clock, X, ChevronRight, Pencil, Trash2, ChevronDown, ChevronUp, Settings, Minus, Home, Compass, Upload, Clock3, Star, Tag, Users as UsersIcon, FolderOpen, Book } from 'lucide-react';
import { useStore } from '../lib/store';
import { uploadToImgBB } from '../lib/utils';
import { API_CONFIG } from '../lib/config';
import VideoCard from '../components/VideoCard';
import { Link } from 'react-router-dom';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import CustomCollectionManager from '../components/CustomCollectionManager';

interface Series {
  name: string;
  videos: {
    id: string;
    title: string;
    customThumbnailUrl?: string;
    views: number;
  }[];
  customThumbnailUrl?: string;
  description?: string;
}

interface SeriesCardProps {
  series: Series;
  originalName: string;
  isCustom?: boolean;
  onEdit: (newName: string, description?: string, thumbnailUrl?: string) => void;
  onDelete: () => void;
  onManageVideos?: () => void;
}

function SeriesCard({ series, originalName, isCustom, onEdit, onDelete, onManageVideos }: SeriesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <div className="bg-surface rounded-lg overflow-hidden">
      <div className="relative">
        {series.customThumbnailUrl ? (
          <div className="aspect-video">
            <img 
              src={series.customThumbnailUrl} 
              alt={series.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video bg-surface-light flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      <div className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-6 w-6 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold">{series.name}</h3>
              <span className="text-sm text-gray-400">
                {series.videos.length} videos
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isCustom && onManageVideos && (
                <button
                  onClick={() => onManageVideos()}
                  className="p-2 hover:bg-surface-light rounded-lg transition-colors"
                  title="Gestionar videos"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 hover:bg-surface-light rounded-lg transition-colors"
                title="Editar colección"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 hover:bg-surface-light rounded-lg transition-colors text-red-500"
                title="Eliminar colección"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-surface-light rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {series.description && (
            <p className="text-gray-400">{series.description}</p>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {series.videos.map(video => (
            <VideoCard
              key={video.id}
              video={{
                id: video.id,
                title: video.title,
                customThumbnailUrl: video.customThumbnailUrl,
                views: video.views
              }}
              compact
            />
          ))}
        </div>
      )}

      {showEditModal && (
        <SeriesFormModal
          title="Editar colección"
          submitText="Guardar cambios"
          onClose={() => setShowEditModal(false)}
          onSubmit={(name, description, thumbnailUrl) => onEdit(name, description, thumbnailUrl)}
          initialData={{
            name: series.name,
            description: series.description,
            imageUrl: series.customThumbnailUrl
          }}
        />
      )}
    </div>
  );
}

interface SeriesFormModalProps {
  onClose: () => void;
  onSubmit: (name: string, description?: string, imageUrl?: string) => void;
  initialData?: {
    name: string;
    description?: string;
    imageUrl?: string;
  };
  title: string;
  submitText: string;
}

function SeriesFormModal({ onClose, onSubmit, initialData, title, submitText }: SeriesFormModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
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
      onSubmit(name.trim(), description.trim(), imageUrl);
      onClose();
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen. Por favor, inténtalo de nuevo.');
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

          <div>
            <label className="block text-sm font-medium mb-1">
              Portada (opcional)
            </label>
            <div className="space-y-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Vista previa"
                    className="w-full aspect-video object-cover rounded-lg"
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
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full aspect-video border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-surface-light hover:bg-surface transition-colors">
                    <div className="text-center">
                      <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-400">
                        Haz clic para subir una portada
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

export default function CollectionsPage() {
  const { videos } = useStore();
  const [seriesData, setSeriesData] = useState<Map<string, Series>>(new Map());
  const [customCollections, setCustomCollections] = useState<Map<string, Series>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showCreateCustomModal, setShowCreateCustomModal] = useState(false);
  const [managingCollection, setManagingCollection] = useState<{
    name: string;
    videos: { id: string; title: string; customThumbnailUrl?: string; views: number }[];
  } | null>(null);

  useEffect(() => {
    const loadSeriesData = async () => {
      try {
        const docRef = doc(db, 'seriesData', 'temp-user');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const seriesMap = new Map(Object.entries(data));
          setSeriesData(seriesMap);
        }

        // Load custom collections
        const customDocRef = doc(db, 'customCollections', 'temp-user');
        const customDocSnap = await getDoc(customDocRef);
        if (customDocSnap.exists()) {
          const customData = customDocSnap.data();
          const customMap = new Map(Object.entries(customData));
          setCustomCollections(customMap);
        }
      } catch (error) {
        console.error('Error loading series data:', error);
      }
    };

    loadSeriesData();
  }, []);

  const series = React.useMemo(() => {
    const groups = new Map<string, Series>();

    videos
      .filter(video => !video.isShort) // Already filtering out Brody Twis posts
      .forEach(video => {
        const baseName = video.title
          .replace(/\s+(?:HLA|HD|SD).*$/i, '')
          .replace(/\s+\d+(?:\s*x\s*\d+)?$/i, '')
          .replace(/(?:^|\s+)(?:EP?\.?\s*)?(?:\d+|\[\d+\]|\(\d+\))(?:\s+|$)/i, ' ')
          .trim();

        if (!groups.has(baseName)) {
          const existingSeries = seriesData.get(baseName);
          groups.set(baseName, {
            name: existingSeries?.name || baseName,
            videos: [],
            customThumbnailUrl: existingSeries?.customThumbnailUrl,
            description: existingSeries?.description
          });
        }

        groups.get(baseName)?.videos.push({
          id: video.id,
          title: video.title,
          customThumbnailUrl: video.customThumbnailUrl,
          views: video.views || 0
        });
    });

    groups.forEach(series => {
      series.videos.sort((a, b) => {
        const getEpisodeNumber = (title: string) => {
          const match = title.match(/(?:EP?\.?\s*)?(\d+)/i);
          return match ? parseInt(match[1]) : 0;
        };
        return getEpisodeNumber(a.title) - getEpisodeNumber(b.title);
      });
    });

    return Array.from(groups.values())
      .filter(series => series.videos.length > 1)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [videos, seriesData]);

  const allCollections = React.useMemo(() => {
    const autoSeries = series;
    const customSeries = Array.from(customCollections.values()).map(collection => ({
      ...collection,
      videos: collection.videos.map(videoRef => {
        const fullVideo = videos.find(v => v.id === videoRef.id);
        return fullVideo ? {
          id: fullVideo.id,
          title: fullVideo.title,
          customThumbnailUrl: fullVideo.customThumbnailUrl,
          views: fullVideo.views || 0
        } : videoRef;
      }).filter(v => videos.some(video => video.id === v.id))
    }));
    
    return [...autoSeries, ...customSeries].sort((a, b) => a.name.localeCompare(b.name));
  }, [series, customCollections, videos]);
  const filteredSeries = React.useMemo(() => {
    if (!searchQuery) return allCollections;
    const query = searchQuery.toLowerCase();
    return allCollections.filter(s => s.name.toLowerCase().includes(query));
  }, [allCollections, searchQuery]);

  const handleCreateCustomCollection = async (name: string, description?: string, thumbnailUrl?: string) => {
    try {
      const newCollection: Series = {
        name,
        videos: [],
        customThumbnailUrl: thumbnailUrl,
        description
      };

      const updatedCustom = new Map(customCollections);
      updatedCustom.set(name, newCollection);

      await setDoc(doc(db, 'customCollections', 'temp-user'), Object.fromEntries(updatedCustom));
      setCustomCollections(updatedCustom);
      setShowCreateCustomModal(false);
    } catch (error) {
      console.error('Error creating custom collection:', error);
      alert('Error al crear la colección. Por favor, inténtalo de nuevo.');
    }
  };
  const handleEditSeries = async (oldName: string, newName: string, description?: string, thumbnailUrl?: string) => {
    try {
      // Check if it's a custom collection or auto-generated series
      if (customCollections.has(oldName)) {
        const updatedCustom = new Map(customCollections);
        const existingCollection = updatedCustom.get(oldName);
        if (existingCollection) {
          updatedCustom.delete(oldName);
          updatedCustom.set(newName, {
            ...existingCollection,
            name: newName,
            customThumbnailUrl: thumbnailUrl,
            description
          });
          await setDoc(doc(db, 'customCollections', 'temp-user'), Object.fromEntries(updatedCustom));
          setCustomCollections(updatedCustom);
        }
      } else {
        const updatedData = new Map(seriesData);
        updatedData.set(oldName, {
          name: newName,
          videos: [],
          customThumbnailUrl: thumbnailUrl,
          description
        });
        await setDoc(doc(db, 'seriesData', 'temp-user'), Object.fromEntries(updatedData));
        setSeriesData(updatedData);
      }
    } catch (error) {
      console.error('Error updating series:', error);
      alert('Error al guardar los cambios. Por favor, inténtalo de nuevo.');
    }
  };

  const handleManageCustomCollection = async (collectionName: string, videoIds: string[]) => {
    try {
      const updatedCustom = new Map(customCollections);
      const existingCollection = updatedCustom.get(collectionName);
      
      if (existingCollection) {
        const updatedCollection = {
          ...existingCollection,
          videos: videoIds.map(id => {
            const video = videos.find(v => v.id === id);
            return video ? {
              id: video.id,
              title: video.title,
              customThumbnailUrl: video.customThumbnailUrl,
              views: video.views || 0
            } : { id, title: 'Video no encontrado', views: 0 };
          })
        };
        
        updatedCustom.set(collectionName, updatedCollection);
        await setDoc(doc(db, 'customCollections', 'temp-user'), Object.fromEntries(updatedCustom));
        setCustomCollections(updatedCustom);
      }
    } catch (error) {
      console.error('Error updating custom collection:', error);
      alert('Error al actualizar la colección. Por favor, inténtalo de nuevo.');
    }
  };

  const handleDeleteSeries = async (seriesName: string) => {
    try {
      // Check if it's a custom collection or auto-generated series
      if (customCollections.has(seriesName)) {
        const updatedCustom = new Map(customCollections);
        updatedCustom.delete(seriesName);
        await setDoc(doc(db, 'customCollections', 'temp-user'), Object.fromEntries(updatedCustom));
        setCustomCollections(updatedCustom);
      } else {
        const updatedData = new Map(seriesData);
        updatedData.delete(seriesName);
        await setDoc(doc(db, 'seriesData', 'temp-user'), Object.fromEntries(updatedData));
        setSeriesData(updatedData);
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting series:', error);
      alert('Error al eliminar la colección. Por favor, inténtalo de nuevo.');
    }
  };

  if (allCollections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Library className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-400 mb-2">No hay colecciones</h2>
        <p className="text-gray-500">
          Las colecciones se crean automáticamente cuando hay varios videos con títulos similares o puedes crear colecciones personalizadas
        </p>
        <button
          onClick={() => setShowCreateCustomModal(true)}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Crear Colección Personalizada</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Library className="h-8 w-8 text-primary" />
          Colecciones
        </h1>
        <button
          onClick={() => setShowCreateCustomModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Nueva Colección</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="search"
          placeholder="Buscar colecciones..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSeries.map(s => (
          <SeriesCard
            key={s.name}
            series={s}
            originalName={s.name}
            isCustom={customCollections.has(s.name)}
            onEdit={(newName, description, thumbnailUrl) => handleEditSeries(s.name, newName, description, thumbnailUrl)}
            onDelete={() => setShowDeleteConfirm(s.name)}
            onManageVideos={customCollections.has(s.name) ? () => setManagingCollection({
              name: s.name,
              videos: s.videos
            }) : undefined}
          />
        ))}
      </div>

      {showCreateCustomModal && (
        <SeriesFormModal
          title="Nueva Colección Personalizada"
          submitText="Crear Colección"
          onClose={() => setShowCreateCustomModal(false)}
          onSubmit={handleCreateCustomCollection}
        />
      )}

      {managingCollection && (
        <CustomCollectionManager
          collectionName={managingCollection.name}
          currentVideos={managingCollection.videos}
          onUpdate={(videoIds) => handleManageCustomCollection(managingCollection.name, videoIds)}
          onClose={() => setManagingCollection(null)}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">¿Eliminar colección?</h2>
            <p className="text-gray-300 mb-6">
              Esta acción no se puede deshacer. Los videos no se eliminarán.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeleteSeries(showDeleteConfirm)}
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
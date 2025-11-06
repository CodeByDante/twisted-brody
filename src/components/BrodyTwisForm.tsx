import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Loader2, Camera, Search } from 'lucide-react';
import { useStore } from '../lib/store';
import { uploadToImgBB } from '../lib/utils';
import { API_CONFIG } from '../lib/config';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import ImageLoader from './ImageLoader';
import type { Video } from '../types';

interface BrodyTwisFormProps {
  onClose: () => void;
  standalone?: boolean;
  initialData?: {
    title: string;
    description: string;
    galleryImages?: string[];
    linkedVideos?: string[];
  };
  isEditing?: boolean;
  videoId?: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

interface VideoSelectorProps {
  onSelect: (video: Video) => void;
  selectedVideos: Video[];
  onRemove: (videoId: string) => void;
}

function VideoSelector({ onSelect, selectedVideos, onRemove }: VideoSelectorProps) {
  const { videos } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const filteredVideos = videos.filter(video => 
    !selectedVideos.some(selected => selected.id === video.id) &&
    (video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     video.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Buscar videos..."
            className="w-full pl-10 pr-4 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {showDropdown && searchQuery && (
        <div className="absolute z-10 w-full mt-1 bg-surface-light border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredVideos.length > 0 ? (
            filteredVideos.map(video => (
              <button
                key={video.id}
                onClick={() => {
                  onSelect(video);
                  setSearchQuery('');
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-surface transition-colors flex items-center gap-2"
              >
                <div className="w-16 h-9 bg-surface-light rounded overflow-hidden flex-shrink-0">
                  {video.customThumbnailUrl && (
                    <img
                      src={video.customThumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 truncate">
                  <p className="font-medium truncate">{video.title}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-gray-400">No se encontraron videos</div>
          )}
        </div>
      )}
    </div>
  );
}

function SelectedVideosList({ videos, onRemove }: { videos: Video[], onRemove: (id: string) => void }) {
  const navigate = useNavigate();
  
  if (videos.length === 0) return null;

  return (
    <div className="space-y-2 mb-4 bg-surface-light p-3 rounded-lg">
      {videos.map(video => (
        <div key={video.id} className="flex items-start gap-2 group">
          <div 
            className="w-24 h-16 bg-surface-light rounded overflow-hidden cursor-pointer flex-shrink-0"
            onClick={() => navigate(`/video/${video.id}`)}
          >
            {video.customThumbnailUrl && (
              <ImageLoader
                src={video.customThumbnailUrl}
                alt={video.title}
                aspectRatio="w-24 h-16"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div
              onClick={() => navigate(`/video/${video.id}`)}
              className="text-primary hover:text-primary/80 transition-colors truncate cursor-pointer"
            >
              {video.title}
            </div>
            {video.description && (
              <p className="text-gray-400 text-sm truncate">{video.description}</p>
            )}
          </div>
          <button
            onClick={() => onRemove(video.id)}
            className="p-1 hover:bg-surface rounded-lg transition-all text-red-500 self-start"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function BrodyTwisForm({ 
  onClose, 
  standalone, 
  initialData,
  isEditing,
  videoId 
}: BrodyTwisFormProps) {
  const navigate = useNavigate();
  const { addVideo, updateVideo, videos } = useStore();
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>(initialData?.galleryImages || []);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedVideos, setSelectedVideos] = useState<Video[]>(
    initialData?.linkedVideos 
      ? videos.filter(v => initialData.linkedVideos?.includes(v.id))
      : []
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    checkDescriptionHeight();
  }, [description]);

  const checkDescriptionHeight = () => {
    if (descriptionRef.current) {
      const lineHeight = parseInt(getComputedStyle(descriptionRef.current).lineHeight);
      const height = descriptionRef.current.scrollHeight;
      const lines = height / lineHeight;
      setNeedsExpansion(lines > 5);
      if (!needsExpansion) {
        setIsDescriptionExpanded(false);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(prev => [...prev, ...files]);
    
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);

    // Initialize progress for new files
    const newProgress: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));
    setUploadProgress(prev => [...prev, ...newProgress]);
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    
    // Only revoke URL if it's a local preview
    if (!initialData?.galleryImages?.includes(imagePreviewUrls[index])) {
      URL.revokeObjectURL(imagePreviewUrls[index]);
    }
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => prev.filter((_, i) => i !== index));
  };

  const updateProgress = (index: number, progress: number) => {
    setUploadProgress(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], progress, status: 'uploading' };
      return updated;
    });

    // Calculate and update overall progress
    setUploadProgress(prev => {
      const totalProgress = prev.reduce((acc, curr) => acc + curr.progress, 0);
      const overallPercent = totalProgress / prev.length;
      setOverallProgress(overallPercent);
      return prev;
    });
  };

  const handleVideoSelect = (video: Video) => {
    setSelectedVideos(prev => [...prev, video]);
  };

  const handleVideoRemove = (videoId: string) => {
    setSelectedVideos(prev => prev.filter(v => v.id !== videoId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsUploading(true);
    setError(null);

    try {
      // Upload new images to ImgBB with progress tracking
      const uploadPromises = selectedImages.map((file, index) => {
        return new Promise<string | null>((resolve) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('image', file);
          formData.append('key', API_CONFIG.IMGBB.API_KEY);

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 100;
              updateProgress(index, progress);
            }
          });

          xhr.onload = () => {
            if (xhr.status === 200) {
              const response = JSON.parse(xhr.responseText);
              if (response.data?.url) {
                setUploadProgress(prev => {
                  const updated = [...prev];
                  updated[index] = { ...updated[index], status: 'completed', progress: 100 };
                  return updated;
                });
                resolve(response.data.url);
              } else {
                setUploadProgress(prev => {
                  const updated = [...prev];
                  updated[index] = { ...updated[index], status: 'error' };
                  return updated;
                });
                resolve(null);
              }
            } else {
              setUploadProgress(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], status: 'error' };
                return updated;
              });
              resolve(null);
            }
          };

          xhr.onerror = () => {
            setUploadProgress(prev => {
              const updated = [...prev];
              updated[index] = { ...updated[index], status: 'error' };
              return updated;
            });
            resolve(null);
          };

          xhr.open('POST', API_CONFIG.IMGBB.BASE_URL);
          xhr.send(formData);
        });
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => url !== null);

      // Combine existing images (that weren't removed) with new ones
      const existingImages = initialData?.galleryImages?.filter(url => 
        imagePreviewUrls.includes(url)
      ) || [];

      const allImages = [...existingImages, ...validUrls];

      if (allImages.length === 0) {
        throw new Error('No se pudieron subir las imágenes');
      }

      const postData = {
        title: title.trim(),
        description: description.trim(),
        url: '', // Empty URL since this is a Brody Twis post
        hashtags: [],
        categoryIds: [],
        userId: 'temp-user',
        createdAt: new Date().toISOString(),
        isShort: true,
        actors: [],
        galleryImages: allImages,
        views: 0,
        linkedVideos: selectedVideos.map(v => v.id)
      };

      if (isEditing && videoId) {
        await updateVideo(videoId, postData);
      } else {
        await addVideo({
          id: crypto.randomUUID(),
          ...postData
        });
      }
      
      if (standalone) {
        navigate('/shorts');
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error al procesar el post. Por favor, inténtalo de nuevo.');
    } finally {
      setIsUploading(false);
      setOverallProgress(0);
      setUploadProgress([]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!standalone && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="h-6 w-6" />
        </button>
      )}
      
      <h2 className="text-2xl font-bold mb-6">
        {isEditing ? 'Editar Post' : 'Nuevo Post'}
      </h2>
      
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Título *
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Videos relacionados
        </label>
        <VideoSelector
          onSelect={handleVideoSelect}
          selectedVideos={selectedVideos}
          onRemove={handleVideoRemove}
        />
        <SelectedVideosList videos={selectedVideos} onRemove={handleVideoRemove} />
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Descripción
        </label>
        <div className="relative">
          <textarea
            ref={descriptionRef}
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full px-3 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 ease-in-out ${
              needsExpansion && !isDescriptionExpanded ? 'line-clamp-5' : ''
            }`}
            rows={3}
          />
          {needsExpansion && (
            <button
              type="button"
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-surface-light to-transparent flex items-end justify-center pb-1 text-primary hover:text-primary/80 text-sm transition-all duration-300"
            >
              {isDescriptionExpanded ? '▲ Ver menos' : '▼ Ver más'}
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Imágenes *
        </label>
        <div className="space-y-4">
          {imagePreviewUrls.length > 0 && (
            <Swiper
              modules={[Navigation, Pagination]}
              navigation={!isMobile}
              pagination={{ clickable: true }}
              spaceBetween={20}
              slidesPerView={1}
              className="w-full aspect-square bg-surface-light rounded-lg overflow-hidden"
            >
              {imagePreviewUrls.map((url, index) => (
                <SwiperSlide key={index}>
                  <div className="relative w-full h-full">
                    <ImageLoader
                      src={url}
                      alt={`Preview ${index + 1}`}
                      aspectRatio="w-full h-full"
                      objectFit="contain"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {uploadProgress[index] && uploadProgress[index].status === 'uploading' && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                        <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress[index].progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}

          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-full h-32 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-surface-light hover:bg-surface transition-colors">
              <div className="text-center">
                <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-400">
                  Haz clic para agregar imágenes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
      
      <button
        type="submit"
        disabled={isUploading || !title.trim() || imagePreviewUrls.length === 0}
        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
      >
        {isUploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Subiendo... {Math.round(overallProgress)}%</span>
          </div>
        ) : (
          isEditing ? 'Guardar Cambios' : 'Publicar'
        )}
        {isUploading && (
          <div 
            className="absolute bottom-0 left-0 h-1 bg-white/20"
            style={{ width: `${overallProgress}%` }}
          />
        )}
      </button>
    </form>
  );
}
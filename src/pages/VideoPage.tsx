import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Calendar, Tag, Play, Share2, Check, Users, Plus, X, Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Heart, Bookmark, ExternalLink, Edit2, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { useStore } from '../lib/store';
import { getVideoThumbnail, getVideoProvider, formatDescription, getVideoEmbedUrl, uploadToImgBB } from '../lib/utils';
import ImageLoader from '../components/ImageLoader';
import type { Video, VideoServer } from '../types';
import SaveToPlaylistModal from '../components/SaveToPlaylistModal';

interface ServerSelectorProps { 
  servers?: VideoServer[];
  currentUrl: string;
  onServerChange: (url: string) => void;
  originalUrl: string;
}

function ServerSelector({ servers, currentUrl, onServerChange, originalUrl }: ServerSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setShowLeftArrow(container.scrollLeft > 0);
      setShowRightArrow(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [servers]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = container.clientWidth / 2;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    checkScroll();
  };

  if (!servers || servers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onServerChange(originalUrl)}
        className={`px-3 py-1.5 rounded-lg transition-colors text-sm ${
          currentUrl === originalUrl
            ? 'bg-primary text-white'
            : 'bg-surface-light hover:bg-surface-light/80 text-gray-400 hover:text-white'
        }`}
      >
        Principal
      </button>

      <div className="relative flex-1">
        <div
          ref={scrollContainerRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide scroll-smooth touch-pan-x"
          onScroll={handleScroll}
        >
          {servers.map((server, index) => (
            <button
              key={index}
              onClick={() => onServerChange(server.url)}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap text-sm flex-shrink-0 ${
                currentUrl === server.url
                  ? 'bg-primary text-white'
                  : 'bg-surface-light hover:bg-surface-light/80 text-gray-400 hover:text-white'
              }`}
            >
              {server.name}
            </button>
          ))}
        </div>

        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full hidden md:block"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full hidden md:block"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function VideoPlayer({ url }: { url: string }) {
  if (!url?.trim()) {
    return (
      <div className="aspect-video bg-surface-light flex items-center justify-center text-gray-400">
        No hay URL de video disponible
      </div>
    );
  }

  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVertical, setIsVertical] = useState(false);

  const videoData = useMemo(() => getVideoEmbedUrl(url), [url]);

  const handleVideoMetadata = useCallback(() => {
    if (videoRef.current) {
      const { videoWidth, videoHeight } = videoRef.current;
      setIsVertical(videoHeight > videoWidth);
    }
  }, []);

  const containerClasses = useMemo(() => 
    isVertical ? "w-full max-w-[500px] mx-auto" : "aspect-video",
    [isVertical]
  );

  if (error) {
    return (
      <div className={`${containerClasses} bg-surface-light flex items-center justify-center text-gray-400`}>
        Error al cargar el video
      </div>
    );
  }

  if (!videoData) {
    return (
      <div className={`${containerClasses} bg-surface-light flex items-center justify-center text-gray-400`}>
        Proveedor de video no soportado
      </div>
    );
  }

  const renderVideoContent = useMemo(() => {
    switch (videoData.provider) {
      case 'youtube':
        return (
          <div className={containerClasses}>
            <iframe
              src={`${videoData.embedUrl}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              onError={() => setError(true)}
            />
          </div>
        );
      
      case 'vimeo':
        return (
          <div className={containerClasses}>
            <div style={{ padding: '56.25% 0 0 0', position: 'relative' }}>
              <iframe
                src={`${videoData.embedUrl}&autoplay=1`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                onError={() => setError(true)}
              />
            </div>
          </div>
        );

      case 'dropbox':
      case 'catbox':
        return (
          <div ref={containerRef} className={containerClasses}>
            <video
              ref={videoRef}
              src={videoData.embedUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full"
              onLoadedMetadata={handleVideoMetadata}
              onError={() => setError(true)}
              preload="auto"
            />
          </div>
        );

      case 'telegram':
        return (
          <div className={`${containerClasses} bg-surface-light flex items-center justify-center`}>
            <a
              href={videoData.embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 hover:opacity-80 transition-opacity"
            >
              <img
                src="https://telegram.org/img/t_logo.svg"
                alt="Telegram"
                className="w-24 h-24"
              />
              <p className="text-primary hover:text-primary/80">Abrir en Telegram</p>
            </a>
          </div>
        );

      case 'xvideos':
      case 'pornhub':
        return (
          <div className={containerClasses}>
            <iframe
              src={`${videoData.embedUrl}?autoplay=1`}
              allowFullScreen
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              className="w-full h-full"
              onError={() => setError(true)}
            />
          </div>
        );

      case 'gdrive':
        return (
          <div className={containerClasses}>
            <iframe
              src={videoData.embedUrl}
              allowFullScreen
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              className="w-full h-full"
              onError={() => setError(true)}
            />
          </div>
        );

      default:
        return (
          <div className={`${containerClasses} bg-surface-light flex items-center justify-center text-gray-400`}>
            Proveedor de video no soportado
          </div>
        );
    }
  }, [videoData, containerClasses, handleVideoMetadata]);

  return renderVideoContent;
}

function ShareButton({ url }: { url: string }) {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (error) {
      console.error('Error al copiar el enlace:', error);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors w-full md:w-auto text-sm sm:text-base"
    >
      {shared ? (
        <>
          <Check className="h-4 w-4" />
          <span>¡Copiado!</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          <span>Compartir</span>
        </>
      )}
    </button>
  );
}

function RelatedVideos({ currentVideoId, categoryIds, hashtags, actors }: { 
  currentVideoId: string; 
  categoryIds: string[]; 
  hashtags: string[];
  actors?: string[];
}) {
  const { videos, settings } = useStore();
  const navigate = useNavigate();
  const [randomSeed] = useState(() => Math.random());
  
  const relatedVideos = videos
    .filter(video => video.id !== currentVideoId)
    .filter(video => !video.isShort) // Exclude Brody Twis posts from related videos
    .filter(video => !video.isHidden || settings.showHiddenVideos)
    .filter(video => {
      const hasMatchingCategory = video.categoryIds.some(id => categoryIds.includes(id));
      const hasMatchingHashtag = video.hashtags.some(tag => hashtags.includes(tag));
      const hasMatchingActor = actors?.some(actor => video.actors?.includes(actor));
      return hasMatchingCategory || hasMatchingHashtag || hasMatchingActor;
    })
    .map(value => ({ value, sort: randomSeed * Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
    .slice(0, 6);

  const handleVideoClick = (videoId: string) => {
    navigate(`/video/${videoId}`);
    window.scrollTo(0, 0);
  };

  if (relatedVideos.length === 0) {
    return (
      <p className="text-gray-400 text-center py-8">No se encontraron videos relacionados</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {relatedVideos.map(video => {
        const provider = getVideoProvider(video.url);
        const thumbnail = video.customThumbnailUrl || getVideoThumbnail(video.url);

        return (
          <div
            key={video.id}
            onClick={() => handleVideoClick(video.id)}
            className="bg-surface rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all group cursor-pointer"
          >
            <div className="aspect-video bg-surface-light relative overflow-hidden">
              {thumbnail ? (
                <ImageLoader
                  src={thumbnail}
                  alt={video.title}
                  className="transition-transform group-hover:scale-105"
                  aspectRatio="aspect-video"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Vista previa
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg line-clamp-2">{video.title}</h3>
              {video.description && (
                <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                  {formatDescription(video.description)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImageGalleryViewer({ images, onClose, initialIndex = 0 }: {
  images: string[];
  onClose: () => void;
  initialIndex?: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        
        <button
          onClick={goToPrevious}
          className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="w-full h-full p-12 flex items-center justify-center">
          <img
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        <button
          onClick={goToNext}
          className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
}

function CollectionNavigation({ currentVideo, onNavigate }: { 
  currentVideo: Video;
  onNavigate: (videoId: string) => void;
}) {
  const { videos } = useStore();
  const [collectionVideos, setCollectionVideos] = useState<Video[]>([]);
  
  useEffect(() => {
    const getBaseName = (title: string) => {
      return title
        .replace(/\s+(?:HLA|HD|SD).*$/i, '')
        .replace(/\s+\d+(?:\s*x\s*\d+)?$/i, '')
        .replace(/(?:^|\s+)(?:EP?\.?\s*)?(?:\d+|\[\d+\]|\(\d+\))(?:\s+|$)/i, ' ')
        .trim();
    };

    const getEpisodeNumber = (title: string) => {
      const match = title.match(/(?:EP?\.?\s*)?(\d+)/i);
      return match ? parseInt(match[1]) : 0;
    };

    const currentBaseName = getBaseName(currentVideo.title);
    const collection = videos
      .filter(video => getBaseName(video.title) === currentBaseName)
      .sort((a, b) => getEpisodeNumber(a.title) - getEpisodeNumber(b.title));
    
    setCollectionVideos(collection);
  }, [currentVideo, videos]);

  if (collectionVideos.length <= 1) return null;

  const currentIndex = collectionVideos.findIndex(v => v.id === currentVideo.id);
  const prevVideo = currentIndex > 0 ? collectionVideos[currentIndex - 1] : null;
  const nextVideo = currentIndex < collectionVideos.length - 1 ? collectionVideos[currentIndex + 1] : null;

  return (
    <div className="bg-surface rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Play className="h-4 w-4 text-primary" />
        <span>Colección</span>
      </h2>

      <div className="flex flex-col sm:flex-row gap-2">
        {prevVideo && (
          <button
            onClick={() => onNavigate(prevVideo.id)}
            className="flex items-center gap-2 p-2 bg-surface-light hover:bg-surface-light/80 rounded-lg transition-colors group flex-1"
          >
            <ArrowLeft className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0 text-left">
              <p className="text-xs text-gray-400">Anterior</p>
              <p className="truncate text-sm group-hover:text-primary transition-colors">
                {prevVideo.title}
              </p>
            </div>
          </button>
        )}

        {nextVideo && (
          <button
            onClick={() => onNavigate(nextVideo.id)}
            className="flex items-center gap-2 p-2 bg-surface-light hover:bg-surface-light/80 rounded-lg transition-colors group flex-1 text-right"
          >
            <div className="min-w-0 flex-1 text-right">
              <p className="text-xs text-gray-400">Siguiente</p>
              <p className="truncate text-sm group-hover:text-primary transition-colors">
                {nextVideo.title}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto scrollbar-hide">
        {collectionVideos.map(video => (
          <button
            key={video.id}
            onClick={() => onNavigate(video.id)}
            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
              video.id === currentVideo.id
                ? 'bg-primary/20 ring-1 ring-primary'
                : 'bg-surface-light hover:bg-surface-light/80'
            }`}
          >
            <div className="w-12 h-8 bg-surface rounded overflow-hidden flex-shrink-0">
              {video.customThumbnailUrl ? (
                <img
                  src={video.customThumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="h-3 w-3 text-gray-400" />
                </div>
              )}
            </div>
            <p className={`truncate text-sm ${
              video.id === currentVideo.id ? 'text-primary' : 'group-hover:text-primary'
            } transition-colors`}>
              {video.title}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { videos, categories, addToHistory, updateVideo, getVideo, favorites, toggleFavorite, incrementViews, getVideoCategories } = useStore();
  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewIncrementedRef = useRef(false);

  const isFavorite = video ? favorites.includes(video.id) : false;
  const linkedVideos = video?.linkedVideos ? videos.filter(v => video.linkedVideos?.includes(v.id)) : [];

  useEffect(() => {
    if (video) {
      setCurrentUrl(video.url);
    }
  }, [video]);

  const handleLinkedVideoClick = (e: React.MouseEvent, videoId: string) => {
    e.preventDefault();
    navigate(`/video/${videoId}`);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const loadVideo = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const videoData = await getVideo(id);
        if (videoData) {
          setVideo(videoData);
          addToHistory(videoData);
          
          if (!viewIncrementedRef.current) {
            incrementViews(videoData.id);
            viewIncrementedRef.current = true;
          }
        }
      } catch (error) {
        console.error('Error loading video:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVideo();
  }, [id, getVideo, addToHistory, incrementViews]);

  const handleNavigate = (videoId: string) => {
    navigate(`/video/${videoId}`);
    window.scrollTo(0, 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando video...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-400">Video no encontrado</h2>
        <Link to="/" className="text-primary hover:underline mt-4 inline-block">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const videoCategories = getVideoCategories().filter(c => video.categoryIds.includes(c.id));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = selectedFiles.map(file => uploadToImgBB(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => url !== null);

      if (validUrls.length > 0) {
        const currentGallery = video.galleryImages || [];
        await updateVideo(video.id, {
          ...video,
          galleryImages: [...currentGallery, ...validUrls]
        });
        
        setVideo(prev => prev ? {
          ...prev,
          galleryImages: [...(prev.galleryImages || []), ...validUrls]
        } : null);
      }

      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error al subir las imágenes. Por favor, inténtalo de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    if (!video.galleryImages) return;
    
    const newGallery = [...video.galleryImages];
    newGallery.splice(index, 1);
    
    try {
      await updateVideo(video.id, {
        ...video,
        galleryImages: newGallery
      });
      
      setVideo(prev => prev ? {
        ...prev,
        galleryImages: newGallery
      } : null);
    } catch (error) {
      console.error('Error removing image:', error);
      alert('Error al eliminar la imagen. Por favor, inténtalo de nuevo.');
    }
  };

  const hasAdditionalServers = video.servers && video.servers.length > 0;

  return (
    <div className="space-y-8">
      <div className="bg-surface rounded-lg overflow-hidden">
        {hasAdditionalServers && (
          <div className="p-4 border-b border-gray-700">
            <ServerSelector
              servers={video.servers}
              currentUrl={currentUrl}
              onServerChange={setCurrentUrl}
              originalUrl={video.url}
            />
          </div>
        )}
        <VideoPlayer url={currentUrl} />
        <div className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{video.title}</h1>
              <p className="text-gray-400">{video.views || 0} visualizaciones</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleFavorite(video.id)}
                className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-sm sm:text-base ${
                  isFavorite 
                    ? 'bg-primary text-white' 
                    : 'bg-primary/10 hover:bg-primary/20 text-primary'
                }`}
              >
                <Heart className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
                <span>{isFavorite ? 'Favorito' : 'Agregar a favoritos'}</span>
              </button>
              
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors text-primary text-sm sm:text-base"
              >
                <Bookmark className="h-4 w-4" />
                <span>Guardar</span>
              </button>

              <ShareButton url={video.url} />
            </div>
          </div>

          {linkedVideos.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {linkedVideos.map(linkedVideo => (
                  <a
                    key={linkedVideo.id}
                    href={`/video/${linkedVideo.id}`}
                    onClick={(e) => handleLinkedVideoClick(e, linkedVideo.id)}
                    className="flex items-center gap-2 bg-surface-light hover:bg-surface px-3 py-2 rounded-lg transition-colors group"
                  >
                    <div className="w-8 h-8 bg-surface rounded overflow-hidden flex-shrink-0">
                      {linkedVideo.customThumbnailUrl ? (
                        <ImageLoader
                          src={linkedVideo.customThumbnailUrl}
                          alt={linkedVideo.title}
                          aspectRatio="w-8 h-8"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm group-hover:text-primary transition-colors line-clamp-1">
                      {linkedVideo.title}
                    </span>
                    <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors flex-shrink-0" />
                  
                  </a>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1 text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>{new Date(video.createdAt).toLocaleDateString()}</span>
            </div>
            {videoCategories.map(category => (
              <Link
                
                key={category.id}
                to={`/?category=${category.id}`}
                className="flex items-center gap-1 text-gray-400 hover:text-primary"
              >
                <Tag className="h-4 w-4" />
                <span>{category.name}</span>
              </Link>
            ))}
          </div>

          {video.description && (
            <div className="text-gray-300 whitespace-pre-wrap space-y-2">
              {formatDescription(video.description).split('\n').map((line, index) => (
                <p key={index} className={line.startsWith('• ') ? 'pl-4' : ''}>
                  {line}
                </p>
              ))}
            </div>
          )}

          {video.actors && video.actors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="h-5 w-5" />
                <span className="font-medium text-lg">Actores/Actrices</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {video.actors.map(actor => (
                  <Link
                    key={actor}
                    to={`/?actor=${encodeURIComponent(actor)}`}
                    className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-full text-sm transition-colors"
                  >
                    {actor}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {video.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {video.hashtags.map(tag => (
                <Link
                  key={tag}
                  to={`/?hashtag=${encodeURIComponent(tag)}`}
                  className="text-primary hover:text-primary/80 text-sm"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={() => setIsGalleryExpanded(!isGalleryExpanded)}
              className="w-full flex items-center justify-between p-4 bg-surface-light hover:bg-surface-light/80 rounded-lg transition-colors"
            >
              <h2 className="text-xl font-semibold">Galería de imágenes</h2>
              {isGalleryExpanded ? (
                <ChevronUp className="h-6 w-6" />
              ) : (
                <ChevronDown className="h-6 w-6" />
              )}
            </button>

            <div className={`space-y-4 overflow-hidden transition-all duration-300 ${
              isGalleryExpanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
            }`}>
              <div className="flex items-center justify-end gap-2">
                {selectedFiles.length > 0 && (
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Subiendo...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Subir {selectedFiles.length} imagen(es)</span>
                      </>
                    )}
                  </button>
                )}
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-surface-light hover:bg-surface-light/80 rounded-lg transition-colors"
                    disabled={isUploading}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Agregar imágenes</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-4">
                {video.galleryImages?.map((imageUrl, index) => (
                  <div key={index} className="relative aspect-square group">
                    <ImageLoader
                      src={imageUrl}
                      alt={`Image ${index + 1}`}
                      className="rounded-lg cursor-pointer"
                      aspectRatio="aspect-square"
                    />
                    <div 
                      className="absolute inset-0 cursor-pointer"
                      onClick={() => setSelectedImageIndex(index)}
                    />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {selectedImageIndex !== null && video.galleryImages && (
                <ImageGalleryViewer
                  images={video.galleryImages}
                  initialIndex={selectedImageIndex}
                  onClose={() => setSelectedImageIndex(null)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {video && <CollectionNavigation currentVideo={video} onNavigate={handleNavigate} />}

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Videos Relacionados</h2>
        <RelatedVideos 
          currentVideoId={video.id} 
          categoryIds={video.categoryIds}
          hashtags={video.hashtags}
          actors={video.actors}
        />
      </div>

      {showSaveModal && (
        <SaveToPlaylistModal
          videoId={video.id}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}
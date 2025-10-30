import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Play, X, Users, Eye } from 'lucide-react';
import { useStore } from '../lib/store';
import { getVideoThumbnail, getVideoProvider, formatDescription, getVideoEmbedUrl, preloadThumbnails, generateVideoThumbnail } from '../lib/utils';
import ImageLoader from '../components/ImageLoader';

function naturalCompare(a: string, b: string): number {
  const splitIntoNumbers = (str: string) => {
    return str.split(/(\d+)/).map(part => {
      const num = parseInt(part);
      return isNaN(num) ? part.toLowerCase() : num;
    });
  };

  const aParts = splitIntoNumbers(a);
  const bParts = splitIntoNumbers(b);

  const len = Math.min(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    if (aParts[i] !== bParts[i]) {
      if (typeof aParts[i] === 'number' && typeof bParts[i] === 'number') {
        return aParts[i] - bParts[i];
      }
      if (typeof aParts[i] === 'number') return 1;
      if (typeof bParts[i] === 'number') return -1;
      return aParts[i] < bParts[i] ? -1 : 1;
    }
  }

  return aParts.length - bParts.length;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Home() {
  const { videos, categories, removeVideo, gridColumns, settings, getVideoCategories } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedHashtags = searchParams.getAll('hashtag');
  const selectedCategories = searchParams.getAll('category');
  const selectedActors = searchParams.getAll('actor');
  const searchQuery = searchParams.get('search')?.toLowerCase();
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [thumbnailErrors, setThumbnailErrors] = useState<Record<string, boolean>>({});
  const [retryAttempts, setRetryAttempts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [initialRender, setInitialRender] = useState(true);
  const [sortedVideos, setSortedVideos] = useState<typeof videos>([]);

  const isFiltering = searchQuery || selectedHashtags.length > 0 || selectedCategories.length > 0 || selectedActors.length > 0;

  const formatViewCount = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  const getGridClasses = () => {
    const columns = gridColumns;
    return `grid grid-cols-1 ${
      columns === 1 ? '' : 
      `sm:grid-cols-${Math.min(columns, 2)} 
       md:grid-cols-${Math.min(columns, 4)} 
       lg:grid-cols-${columns}`
    } gap-3 md:gap-6`;
  };

  const getCategoryNames = (categoryIds: string[]) => {
    const videoCategories = getVideoCategories();
    return categoryIds
      .map(id => videoCategories.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'Sin categoría';
  };

  const handleDelete = (videoId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este video?')) {
      removeVideo(videoId);
    }
  };

  const handleVideoClick = (videoId: string, e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/video/${videoId}`, { replace: true });
  };

  const handleHashtagClick = (hashtag: string, e: React.MouseEvent) => {
    e.preventDefault();
    const currentHashtags = new Set(selectedHashtags);
    
    if (currentHashtags.has(hashtag)) {
      currentHashtags.delete(hashtag);
    } else {
      currentHashtags.add(hashtag);
    }

    const params = new URLSearchParams(searchParams);
    params.delete('hashtag');
    currentHashtags.forEach(tag => params.append('hashtag', tag));
    setSearchParams(params);
  };

  const handleActorClick = (actor: string, e: React.MouseEvent) => {
    e.preventDefault();
    const currentActors = new Set(selectedActors);
    
    if (currentActors.has(actor)) {
      currentActors.delete(actor);
    } else {
      currentActors.add(actor);
    }

    const params = new URLSearchParams(searchParams);
    params.delete('actor');
    currentActors.forEach(a => params.append('actor', a));
    setSearchParams(params);
  };

  const removeHashtagFilter = (hashtag: string) => {
    const params = new URLSearchParams(searchParams);
    const currentHashtags = searchParams.getAll('hashtag').filter(h => h !== hashtag);
    params.delete('hashtag');
    currentHashtags.forEach(tag => params.append('hashtag', tag));
    setSearchParams(params);
  };

  const removeActorFilter = (actor: string) => {
    const params = new URLSearchParams(searchParams);
    const currentActors = searchParams.getAll('actor').filter(a => a !== actor);
    params.delete('actor');
    currentActors.forEach(a => params.append('actor', a));
    setSearchParams(params);
  };

  useEffect(() => {
    if (videos.length > 0) {
      if (isFiltering) {
        const sorted = [...videos].sort((a, b) => naturalCompare(a.title, b.title));
        setSortedVideos(sorted);
      } else {
        setSortedVideos(videos);
      }
      
      if (initialRender) {
        setInitialRender(false);
        setIsLoading(false);
      }
    }
  }, [videos, isFiltering, initialRender]);

  useEffect(() => {
    preloadThumbnails(videos);
  }, [videos]);

  useEffect(() => {
    const generateThumbnails = async () => {
      for (const video of videos) {
        if (!video.url) {
          console.warn('Empty video URL:', video);
          continue;
        }

        const provider = getVideoProvider(video.url);
        const thumbnail = getVideoThumbnail(video.url);
        const currentRetries = retryAttempts[video.id] || 0;
        const maxRetries = 2;

        if ((provider === 'dropbox' || (provider === 'vimeo' && !thumbnail)) && 
            !thumbnails[video.id] && 
            !thumbnailErrors[video.id] && 
            currentRetries < maxRetries) {
          try {
            const thumbnail = await generateVideoThumbnail(video.url, provider);
            setThumbnails(prev => ({
              ...prev,
              [video.id]: thumbnail
            }));
            setRetryAttempts(prev => ({
              ...prev,
              [video.id]: 0
            }));
          } catch (error) {
            console.error(`Error generating thumbnail for video ${video.id}:`, error);
            
            const newRetryCount = currentRetries + 1;
            setRetryAttempts(prev => ({
              ...prev,
              [video.id]: newRetryCount
            }));

            if (newRetryCount >= maxRetries) {
              setThumbnailErrors(prev => ({
                ...prev,
                [video.id]: true
              }));
            }
          }
        }
      }
    };

    generateThumbnails();
  }, [videos, thumbnails, thumbnailErrors, retryAttempts]);

  const filteredVideos = React.useMemo(() => {
    if (isLoading) return [];

    const videoCategories = getVideoCategories();
    return sortedVideos.filter(video => {
      // Filter out Brody Twis posts from main feed
      if (video.isShort) return false;

      const videoActors = video.actors || [];
      const videoCategories = video.categoryIds.map(id => 
        getVideoCategories().find(c => c.id === id)?.name?.toLowerCase()
      ).filter(Boolean);
      
      const searchTerms = searchQuery?.toLowerCase().split(/\s+/).filter(Boolean) || [];
      
      const matchesSearch = !searchQuery || searchTerms.every(term => 
        video.title.toLowerCase().includes(term) ||
        video.description?.toLowerCase().includes(term) ||
        video.url.toLowerCase().includes(term) ||
        video.hashtags.some(tag => tag.toLowerCase().includes(term)) ||
        videoActors.some(actor => actor.toLowerCase().includes(term)) ||
        videoCategories.some(category => category?.includes(term))
      );

      const matchesActors = selectedActors.length === 0 || 
        (videoActors.length > 0 && selectedActors.some(actor => videoActors.includes(actor)));

      const matchesHashtags = selectedHashtags.length === 0 || 
        selectedHashtags.every(tag => video.hashtags.includes(tag));
        
      const matchesCategories = selectedCategories.length === 0 || 
        selectedCategories.some(id => video.categoryIds.includes(id));
        
      const matchesShort = searchParams.get('isShort') === 'true' ? 
        video.isShort : true;

      const isVisible = !video.isHidden || settings.showHiddenVideos;
      
      return matchesHashtags && matchesCategories && matchesActors && 
             matchesSearch && matchesShort && isVisible;
    });
  }, [sortedVideos, selectedHashtags, selectedCategories, selectedActors, 
      searchQuery, categories, isLoading, searchParams, settings.showHiddenVideos]);

  return (
    <div className="space-y-4 md:space-y-8">
      {isFiltering && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg md:text-xl font-semibold">
              {searchQuery ? `Resultados para "${searchQuery}"` :
               selectedCategories.length > 0 ? `Categorías: ${getCategoryNames(selectedCategories)}` :
               selectedHashtags.length > 0 || selectedActors.length > 0 ? 'Filtros aplicados:' : ''}
            </h2>
            <Link
              to="/"
              className="text-primary hover:text-primary/80 text-sm flex items-center gap-1"
            >
              Limpiar filtros
            </Link>
          </div>

          {(selectedHashtags.length > 0 || selectedActors.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {selectedHashtags.map(hashtag => (
                <span
                  key={hashtag}
                  className="bg-primary/20 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {hashtag}
                  <button
                    onClick={() => removeHashtagFilter(hashtag)}
                    className="hover:text-white ml-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
              {selectedActors.map(actor => (
                <span
                  key={actor}
                  className="bg-primary/20 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1"
                >
                  {actor}
                  <button
                    onClick={() => removeActorFilter(actor)}
                    className="hover:text-white ml-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 md:py-12">
          <p className="text-gray-400 text-lg">Cargando videos...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-8 md:py-12">
          <p className="text-gray-400 text-lg">No se encontraron videos</p>
          {isFiltering && (
            <Link to="/" className="text-primary hover:underline mt-4 inline-block">
              Ver todos los videos
            </Link>
          )}
        </div>
      ) : (
        <div className={getGridClasses()}>
          {filteredVideos.map(video => {
            const provider = getVideoProvider(video.url);
            let thumbnail = video.url ? getVideoThumbnail(video.url) : null;
            
            if ((provider === 'dropbox' || (provider === 'vimeo' && !thumbnail)) && thumbnails[video.id]) {
              thumbnail = thumbnails[video.id];
            }
            
            return (
              <div key={video.id} className={`bg-surface rounded-lg overflow-hidden shadow-lg ${
                gridColumns === 1 ? 'flex' : ''
              }`}>
                <a
                  href={`/video/${video.id}`}
                  onClick={(e) => handleVideoClick(video.id, e)}
                  className={`block relative group ${
                    gridColumns === 1 ? 'w-64 flex-shrink-0' : ''
                  }`}
                >
                  <div className="aspect-video bg-surface-light overflow-hidden">
                    {video.customThumbnailUrl ? (
                      <ImageLoader
                        src={video.customThumbnailUrl}
                        alt={video.title}
                        className="transition-transform group-hover:scale-105"
                        aspectRatio="aspect-video"
                      />
                    ) : thumbnail ? (
                      <ImageLoader
                        src={thumbnail}
                        alt={video.title}
                        className="transition-transform group-hover:scale-105"
                        aspectRatio="aspect-video"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-surface-light">
                        <div className="text-sm sm:text-base">
                          {thumbnailErrors[video.id] ? 
                            'Error al generar miniatura' : 
                            'Generando miniatura...'}
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
                    </div>
                  </div>
                </a>
                
                <div className="p-3 sm:p-4 space-y-2 flex-1">
                  <a
                    href={`/video/${video.id}`}
                    onClick={(e) => handleVideoClick(video.id, e)}
                  >
                    <h2 className="text-base sm:text-lg font-semibold hover:text-primary break-words line-clamp-2">
                      {video.title}
                    </h2>
                  </a>
                  
                  {video.description && (
                    <p className="text-gray-400 text-xs sm:text-sm line-clamp-2">
                      {video.description}
                    </p>
                  )}

                  {video.actors && video.actors.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                      <Users className="h-3.5 w-3.5" />
                      <span>Actores/Actrices:</span>
                      <div className="flex flex-wrap gap-1">
                        {video.actors.map((actor, index) => (
                          <React.Fragment key={actor}>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleActorClick(actor, e);
                              }}
                              className="text-primary hover:text-primary/80 transition-colors"
                            >
                              {actor}
                            </button>
                            {index < video.actors!.length - 1 && ", "}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {video.hashtags.map(tag => (
                      <button
                        key={tag}
                        onClick={(e) => handleHashtagClick(tag, e)}
                        className={isFiltering ? 
                          `text-xs px-2 py-0.5 rounded-full transition-colors ${
                            selectedHashtags.includes(tag)
                              ? 'bg-primary text-white'
                              : 'text-primary hover:bg-primary/10'
                          }` :
                          'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0'
                        }
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm pt-2">
                    <div className="flex flex-wrap gap-2">
                      {video.categoryIds.length > 0 ? (
                        video.categoryIds.map((categoryId, index) => (
                          <React.Fragment key={categoryId}>
                            <Link
                              to={`/?category=${categoryId}`}
                              className={`text-xs sm:text-sm ${
                                selectedCategories.includes(categoryId)
                                  ? 'text-primary'
                                  : 'text-gray-400 hover:text-primary'
                              }`}
                            >
                              {categories.find(c => c.id === categoryId)?.name}
                            </Link>
                          </React.Fragment>
                        ))
                      ) : (
                        <span className="text-xs sm:text-sm text-gray-400">Sin categoría</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/video/${video.id}/edit`}
                        className="p-1 hover:text-primary"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(video.id)}
                        className="p-1 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{formatViewCount(video.views || 0)} vistas</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
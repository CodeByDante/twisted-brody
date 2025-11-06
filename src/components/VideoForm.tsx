import React, { useState, useEffect, useRef } from 'react';
import { Plus, ToggleLeft, ToggleRight, X, Camera, Search, Clock, Check, History, Clock3, Trash, ToggleLeft as ToggleLeftIcon, ToggleRight as ToggleRightIcon, CreditCard as Edit2, Trash2, Video as VideoIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { Link, useNavigate } from 'react-router-dom';
import type { VideoProvider, Video, VideoServer } from '../types';
import { uploadToImgBB } from '../lib/utils';
import { API_CONFIG } from '../lib/config';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import BrodyTwisForm from './BrodyTwisForm';

interface VideoFormProps {
  onClose: () => void;
  initialData?: {
    title: string;
    description: string;
    url: string;
    hashtags: string[];
    categoryIds: string[];
    isShort?: boolean;
    actors?: string[];
    customThumbnailUrl?: string | null;
    isHidden?: boolean;
    linkedVideos?: string[];
    servers?: VideoServer[];
  };
  onSubmit?: (data: any) => Promise<void>;
  standalone?: boolean;
}

interface VideoSelectorProps {
  onSelect: (video: Video) => void;
  selectedVideos: Video[];
  onRemove: (videoId: string) => void;
}

function ServerList({ servers, onUpdate, onRemove }: {
  servers: VideoServer[];
  onUpdate: (index: number, field: keyof VideoServer, value: string) => void;
  onRemove: (index: number) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {servers.map((server, index) => (
        <div key={index} className="bg-surface-light p-3 rounded-lg">
          {editingIndex === index ? (
            <div className="space-y-2">
              <input
                type="text"
                value={server.name}
                onChange={(e) => onUpdate(index, 'name', e.target.value)}
                placeholder="Nombre del servidor"
                className="w-full px-3 py-2 bg-surface rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <input
                type="url"
                value={server.url}
                onChange={(e) => onUpdate(index, 'url', e.target.value)}
                placeholder="URL del servidor"
                className="w-full px-3 py-2 bg-surface rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => setEditingIndex(null)}
                  className="text-primary hover:text-primary/80"
                >
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex-1 truncate mr-4">
                <span className="text-gray-400">{server.url}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingIndex(index)}
                  className="p-1 hover:text-primary transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onRemove(index)}
                  className="p-1 text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
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
              <img
                src={video.customThumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover"
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

export default function VideoForm({ onClose, initialData, onSubmit, standalone }: VideoFormProps) {
  const [isBrodyTwis, setIsBrodyTwis] = useState(false);
  const navigate = useNavigate();
  const { categories, addVideo, addCategory, videos, getVideoCategories } = useStore();
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [url, setUrl] = useState(initialData?.url || '');
  const [hashtags, setHashtags] = useState<string[]>(initialData?.hashtags || []);
  const [hashtagInput, setHashtagInput] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialData?.categoryIds || []);
  const [newCategory, setNewCategory] = useState('');
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [singleSelection, setSingleSelection] = useState(
    !initialData?.categoryIds || initialData.categoryIds.length <= 1
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isShort, setIsShort] = useState(initialData?.isShort || false);
  const [isHidden, setIsHidden] = useState(initialData?.isHidden || false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [actors, setActors] = useState<string[]>(initialData?.actors || []);
  const [actorInput, setActorInput] = useState('');
  const [showActorSuggestions, setShowActorSuggestions] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    initialData?.customThumbnailUrl || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingActresses, setExistingActresses] = useState<Set<string>>(new Set());
  const [selectedVideos, setSelectedVideos] = useState<Video[]>(
    initialData?.linkedVideos 
      ? videos.filter(v => initialData.linkedVideos?.includes(v.id))
      : []
  );
  const [servers, setServers] = useState<VideoServer[]>(
    initialData?.servers || []
  );

  const addServer = () => {
    setServers(prev => [...prev, { url: '', name: '' }]);
  };

  const removeServer = (index: number) => {
    setServers(prev => prev.filter((_, i) => i !== index));
  };

  const updateServer = (index: number, field: keyof VideoServer, value: string) => {
    setServers(prev => prev.map((server, i) => 
      i === index ? { ...server, [field]: value } : server
    ));
  };

  useEffect(() => {
    const loadActorsData = async () => {
      try {
        // Load actresses
        const actressesRef = doc(db, 'actressImages', 'temp-user');
        const actressesSnap = await getDoc(actressesRef);
        if (actressesSnap.exists()) {
          const actresses = new Set(Object.keys(actressesSnap.data()));
          setExistingActresses(actresses);
        }
      } catch (error) {
        console.error('Error loading actors data:', error);
      }
    };

    loadActorsData();
  }, []);

  const handleVideoSelect = (video: Video) => {
    setSelectedVideos(prev => [...prev, video]);
  };

  const handleVideoRemove = (videoId: string) => {
    setSelectedVideos(prev => prev.filter(v => v.id !== videoId));
  };

  const existingHashtags = React.useMemo(() => {
    const allVideos = useStore.getState().videos;
    const uniqueHashtags = new Set<string>();
    allVideos.forEach(video => {
      video.hashtags.forEach(tag => uniqueHashtags.add(tag));
    });
    return Array.from(uniqueHashtags);
  }, []);

  const handleHashtagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHashtagInput(value);

    if (value.trim()) {
      setShowHashtagSuggestions(true);
    } else {
      setShowHashtagSuggestions(false);
    }
  };

  const handleActorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setActorInput(value);

    if (value.trim()) {
      setShowActorSuggestions(true);
    } else {
      setShowActorSuggestions(false);
    }
  };

  const handleHashtagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addHashtag();
    }
  };

  const handleActorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addActor();
    }
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim();
    if (tag) {
      const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;
      if (!hashtags.includes(formattedTag)) {
        setHashtags(prev => [...prev, formattedTag]);
      }
      setHashtagInput('');
      setShowHashtagSuggestions(false);
    }
  };

  const addActor = () => {
    const actor = actorInput.trim();
    if (actor && !actors.includes(actor)) {
      setActors(prev => [...prev, actor]);
      setActorInput('');
      setShowActorSuggestions(false);
    }
  };

  const handleHashtagRemove = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };

  const handleActorRemove = (actor: string) => {
    setActors(actors.filter(a => a !== actor));
  };

  const handleCategoryChange = (categoryId: string) => {
    if (singleSelection) {
      setSelectedCategories([categoryId]);
      setIsDropdownOpen(false);
    } else {
      setSelectedCategories(prev => {
        if (prev.includes(categoryId)) {
          return prev.filter(id => id !== categoryId);
        }
        return [...prev, categoryId];
      });
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      const videoCategories = getVideoCategories();
      const words = newCategory.trim().split(/\s+/);

      words.forEach(word => {
        if (word) {
          const existingCategory = videoCategories.find(
            cat => cat.name.toLowerCase() === word.toLowerCase()
          );

          if (existingCategory) {
            if (singleSelection) {
              setSelectedCategories([existingCategory.id]);
            } else {
              setSelectedCategories(prev => {
                if (!prev.includes(existingCategory.id)) {
                  return [...prev, existingCategory.id];
                }
                return prev;
              });
            }
          } else {
            const category = {
              id: crypto.randomUUID(),
              name: word,
              userId: 'temp-user',
              type: 'video' as const
            };
            addCategory(category);
            if (singleSelection) {
              setSelectedCategories([category.id]);
            } else {
              setSelectedCategories(prev => [...prev, category.id]);
            }
          }
        }
      });

      setNewCategory('');
      setShowCategorySuggestions(false);
    }
  };

  const categorySuggestions = categories.filter(category =>
    category.type === 'video' &&
    category.name.toLowerCase().includes(newCategory.toLowerCase()) &&
    category.name.toLowerCase() !== newCategory.toLowerCase()
  );

  const videoCategories = getVideoCategories();
  const filteredCategories = videoCategories.filter(category =>
    category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  const handleSelectSuggestion = (categoryName: string) => {
    setNewCategory(categoryName);
    setShowCategorySuggestions(false);
  };

  const filteredHashtags = existingHashtags.filter(tag => 
    tag.toLowerCase().includes(hashtagInput.toLowerCase()) &&
    !hashtags.includes(tag)
  );

  const filteredActresses = Array.from(existingActresses)
    .filter(actress =>
      actress.toLowerCase().includes(actorInput.toLowerCase()) &&
      !actors.includes(actress)
    );


  const handleSelectActor = (actor: string) => {
    if (!actors.includes(actor)) {
      setActors(prev => [...prev, actor]);
    }
    setActorInput('');
    setShowActorSuggestions(false);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const preview = URL.createObjectURL(file);
      setThumbnailPreview(preview);
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  const detectVideoProvider = (url: string): VideoProvider | null => {
    try {
      const urlObj = new URL(url);
      
      const providers: Record<VideoProvider, RegExp> = {
        youtube: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
        vimeo: /vimeo\.com\/(\d+)/,
        xvideos: /xvideos\.com\/video(\d+)/,
        pornhub: /pornhub\.com\/view_video\.php\?viewkey=([^&\s]+)/,
        gdrive: /drive\.google\.com\/file\/d\/([^/]+)/,
        dropbox: /dropbox\.com\/s\/([^?&\s]+)/,
        terabox: /terabox\.com\/s\/([^?]+)/,
        telegram: /t\.me\/([^/]+)\/(\d+)/,
        catbox: /catbox\.moe\/([^?&\s]+)/
      };

      if (urlObj.hostname.includes('dropbox.com')) {
        return 'dropbox';
      }

      if (urlObj.hostname.includes('catbox.moe')) {
        return 'catbox';
      }

      for (const [provider, regex] of Object.entries(providers)) {
        if (regex.test(url)) {
          return provider as VideoProvider;
        }
      }
      return null;
    } catch (error) {
      console.error('Error al analizar la URL:', error);
      return null;
    }
  };

  return (
    <div className={standalone ? "" : "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"}>
      <div className={`bg-surface p-6 rounded-lg ${standalone ? "w-full max-w-xl mx-auto" : "w-full max-w-xl relative max-h-[90vh] overflow-y-auto"}`}>
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold">
              {initialData ? 'Editar Video' : 'Agregar Nuevo Video'}
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setIsBrodyTwis(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                  !isBrodyTwis 
                    ? 'bg-primary text-white'
                    : 'bg-surface-light hover:bg-surface-light/80'
                }`}
              >
                <VideoIcon className="h-5 w-5" />
                <span>Twisted Brody</span>
              </button>
              <button
                onClick={() => setIsBrodyTwis(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                  isBrodyTwis 
                    ? 'bg-primary text-white'
                    : 'bg-surface-light hover:bg-surface-light/80'
                }`}
              >
                <Camera className="h-5 w-5" />
                <span>Brody Twis</span>
              </button>
            </div>
          </div>

          {isBrodyTwis ? (
            <BrodyTwisForm 
              onClose={onClose}
              standalone={standalone}
            />
          ) : (
            <>
              {!standalone && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsUploading(true);
                setError(null);

                try {
                  const provider = detectVideoProvider(url);
                  if (!provider) {
                    setError('Post no publicado: error de enlace');
                    setIsUploading(false);
                    return;
                  }

                  let customThumbnailUrl: string | null = null;
                  if (thumbnailFile) {
                    const uploadedUrl = await uploadToImgBB(thumbnailFile);
                    if (!uploadedUrl) {
                      alert('Error al subir la miniatura. Se usará la miniatura generada automáticamente.');
                    } else {
                      customThumbnailUrl = uploadedUrl;
                    }
                  } else if (thumbnailPreview) {
                    customThumbnailUrl = thumbnailPreview;
                  }

                  if (hashtagInput.trim()) {
                    const lastTag = hashtagInput.trim().startsWith('#') 
                      ? hashtagInput.trim() 
                      : `#${hashtagInput.trim()}`;
                    if (!hashtags.includes(lastTag)) {
                      hashtags.push(lastTag);
                    }
                  }

                  if (actorInput.trim() && !actors.includes(actorInput.trim())) {
                    actors.push(actorInput.trim());
                  }

                  const videoData = {
                    id: initialData?.id || crypto.randomUUID(),
                    title,
                    description,
                    url,
                    servers: servers.filter(s => s.url && s.name),
                    hashtags,
                    categoryIds: selectedCategories,
                    userId: 'temp-user',
                    createdAt: initialData?.createdAt || new Date().toISOString(),
                    isShort,
                    isHidden,
                    actors,
                    customThumbnailUrl,
                    linkedVideos: selectedVideos.map(v => v.id)
                  };

                  if (onSubmit) {
                    await onSubmit(videoData);
                  } else {
                    await addVideo(videoData);
                  }
                  
                  if (standalone) {
                    navigate('/');
                  } else {
                    onClose();
                  }
                } catch (error) {
                  console.error('Error:', error);
                  setError('Error al procesar el video. Por favor, inténtalo de nuevo.');
                } finally {
                  setIsUploading(false);
                }
              }} className="space-y-6">
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
                  <label htmlFor="url" className="block text-sm font-medium mb-1">
                    URL del Video Principal *
                  </label>
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                  {error && (
                    <p className="mt-2 text-red-500 text-sm">{error}</p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Servidores Adicionales</label>
                    <button
                      type="button"
                      onClick={addServer}
                      className="text-primary hover:text-primary/80 text-sm flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Añadir servidor
                    </button>
                  </div>

                  <ServerList
                    servers={servers}
                    onUpdate={updateServer}
                    onRemove={removeServer}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Videos relacionados
                  </label>
                  <VideoSelector
                    onSelect={handleVideoSelect}
                    selectedVideos={selectedVideos}
                    onRemove={handleVideoRemove}
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">
                    Descripción
                  </label>
                  <SelectedVideosList videos={selectedVideos} onRemove={handleVideoRemove} />
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
                    Miniatura personalizada (opcional)
                  </label>
                  <div className="space-y-2">
                    {thumbnailPreview ? (
                      <div className="relative">
                        <img
                          src={thumbnailPreview}
                          alt="Vista previa"
                          className="w-full aspect-video object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={removeThumbnail}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-full aspect-video border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-surface-light hover:bg-surface transition-colors">
                          <div className="text-center">
                            <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-400">
                              Haz clic para subir una miniatura
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Brody Twis</span>
                  <button
                    type="button"
                    onClick={() => setIsShort(!isShort)}
                    className="text-gray-300 hover:text-white"
                  >
                    {isShort ? (
                      <ToggleRight className="h-6 w-6 text-primary" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{isHidden ? 'Video oculto' : 'Ocultar video'}</span>
                  <button
                    type="button"
                    onClick={() => setIsHidden(!isHidden)}
                    className="text-gray-300 hover:text-white"
                  >
                    {isHidden ? (
                      <ToggleRight className="h-6 w-6 text-primary" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="actors" className="block text-sm font-medium">
                      Actrices
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="actors"
                      value={actorInput}
                      onChange={handleActorInputChange}
                      onKeyDown={handleActorKeyDown}
                      onFocus={() => setShowActorSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowActorSuggestions(false), 200)}
                      placeholder="Escribe nombres de actrices y presiona Enter o Espacio"
                      className="w-full px-3 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    {showActorSuggestions && actorInput.trim() && (
                      <div className="absolute z-10 w-full mt-1 bg-surface-light border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredActresses.length > 0 ? (
                          filteredActresses.map(person => (
                            <button
                              key={person}
                              type="button"
                              onClick={() => handleSelectActor(person)}
                              className="w-full px-3 py-2 text-left hover:bg-surface text-gray-300 hover:text-white transition-colors"
                            >
                              {person}
                            </button>
                          ))
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectActor(actorInput.trim())}
                            className="w-full px-3 py-2 text-left hover:bg-surface text-gray-300 hover:text-white transition-colors"
                          >
                            Agregar: {actorInput}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Presiona Enter o Espacio para agregar cada actriz
                  </p>
                  {actors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {actors.map(actor => (
                        <span 
                          key={actor} 
                          className="bg-primary/20 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1"
                        >
                          {actor}
                          <button
                            type="button"
                            onClick={() => handleActorRemove(actor)}
                            className="hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="hashtags" className="block text-sm font-medium mb-1">
                    Hashtags
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="hashtags"
                      value={hashtagInput}
                      onChange={handleHashtagInputChange}
                      onKeyDown={handleHashtagKeyDown}
                      onFocus={() => setShowHashtagSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowHashtagSuggestions(false), 200)}
                      placeholder="Escribe hashtags y presiona Enter o Espacio"
                      className="w-full px-3 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    {showHashtagSuggestions && hashtagInput.trim() && (
                      <div className="absolute z-10 w-full mt-1 bg-surface-light border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredHashtags.length > 0 ? (
                          filteredHashtags.map(tag => (
                            <div 
                              key={tag}
                              className="p-2 hover:bg-surface cursor-pointer"
                              onClick={() => {
                                if (!hashtags.includes(tag)) {
                                  setHashtags(prev => [...prev, tag]);
                                }
                                setHashtagInput('');
                                setShowHashtagSuggestions(false);
                              }}
                            >
                              {tag}
                            </div>
                          ))
                        ) : (
                          <div 
                            className="p-2 hover:bg-surface cursor-pointer"
                            onClick={() => {
                              const tag = hashtagInput.trim();
                              const formattedTag = tag.startsWith('#') ? tag : `#${tag}`;
                              if (!hashtags.includes(formattedTag)) {
                                setHashtags(prev => [...prev, formattedTag]);
                              }
                              setHashtagInput('');
                              setShowHashtagSuggestions(false);
                            }}
                          >
                            Agregar: {hashtagInput.startsWith('#') ? hashtagInput : `#${hashtagInput}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Presiona Enter o Espacio para agregar cada hashtag
                  </p>
                  {hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {hashtags.map(tag => (
                        <span 
                          key={tag} 
                          className="bg-primary/20 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleHashtagRemove(tag)}
                            className="hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium">Categorías</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSingleSelection(!singleSelection);
                          if (!singleSelection && selectedCategories.length > 1) {
                            setSelectedCategories([selectedCategories[0]]);
                          }
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
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-3 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary text-left flex items-center justify-between"
                    >
                      <span className="text-gray-300">
                        {selectedCategories.length === 0
                          ? 'Seleccionar categorías'
                          : selectedCategories
                              .map(id => categories.find(c => c.id === id)?.name)
                              .filter(Boolean)
                              .join(', ')}
                      </span>
                      <span className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-surface-light border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        <div className="sticky top-0 p-2 bg-surface-light border-b border-gray-600">
                          <input
                            type="text"
                            value={categorySearchQuery}
                            onChange={(e) => setCategorySearchQuery(e.target.value)}
                            placeholder="Buscar categorías..."
                            className="w-full px-3 py-2 bg-surface rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                          />
                        </div>
                        {filteredCategories.map(category => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => handleCategoryChange(category.id)}
                            className={`w-full px-3 py-2 text-left hover:bg-surface transition-colors ${
                              selectedCategories.includes(category.id)
                                ? 'text-primary'
                                : 'text-gray-300'
                            }`}
                          >
                            {category.name}
                            {selectedCategories.includes(category.id) && (
                              <span className="ml-2">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => {
                          setNewCategory(e.target.value);
                          setShowCategorySuggestions(true);
                        }}
                        onFocus={() => setShowCategorySuggestions(true)}
                        onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                        placeholder="Agregar nueva categoría"
                        className="w-full px-3 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      {showCategorySuggestions && newCategory.trim() && categorySuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-surface-light border border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {categorySuggestions.map(category => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => handleSelectSuggestion(category.name)}
                              className="w-full px-3 py-2 text-left hover:bg-surface text-gray-300 hover:text-white transition-colors"
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="bg-primary hover:bg-primary/90 text-white px-3 py-2 rounded-md"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Procesando...' : (initialData ? 'Guardar Cambios' : 'Agregar Video')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
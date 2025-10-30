import React, { useState, useRef } from 'react';
import { X, Plus, Loader2, Book, Trash2, Edit2, ChevronDown, ChevronUp, Search, Check } from 'lucide-react';
import { useStore } from '../lib/store';
import { uploadToImgBB } from '../lib/utils';
import { API_CONFIG } from '../lib/config';
import type { Manga, MangaVersion } from '../types';
import ImageLoader from './ImageLoader';

interface MangaFormProps {
  onClose: () => void;
  onSubmit: (data: Omit<Manga, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  initialData?: Manga;
  title: string;
  submitText: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

export default function MangaForm({ 
  onClose, 
  onSubmit, 
  initialData, 
  title, 
  submitText 
}: MangaFormProps) {
  const { categories, addCategory } = useStore();
  const [mangaTitle, setMangaTitle] = useState(initialData?.title || '');
  const [theme, setTheme] = useState(initialData?.theme || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [author, setAuthor] = useState(initialData?.author || '');
  const [genre, setGenre] = useState(initialData?.genre || '');
  const [status, setStatus] = useState<'ongoing' | 'completed' | 'hiatus'>(initialData?.status || 'ongoing');
  const [releaseYear, setReleaseYear] = useState(initialData?.releaseYear || '');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(initialData?.coverImage || null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialData?.categoryIds || []);
  const [newCategory, setNewCategory] = useState('');
  const [selectedCoverPageIndex, setSelectedCoverPageIndex] = useState<{ versionId: string; pageIndex: number } | null>(null);
  const [versions, setVersions] = useState<MangaVersion[]>(
    initialData?.versions || [{ id: crypto.randomUUID(), name: 'Versión 1', pages: [], isDefault: true }]
  );
  const [selectedImages, setSelectedImages] = useState<{ [versionId: string]: File[] }>({});
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [versionId: string]: UploadProgress[] }>({});
  const [overallProgress, setOverallProgress] = useState(0);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingVersionName, setEditingVersionName] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedNewImageIndex, setDraggedNewImageIndex] = useState<number | null>(null);
  const [dragOverNewImageIndex, setDragOverNewImageIndex] = useState<number | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const fileInputRefs = useRef<{ [versionId: string]: HTMLInputElement | null }>({});
  const coverInputRef = useRef<HTMLInputElement>(null);

  const mangaCategories = categories.filter(c => c.type === 'manga');

  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const preview = URL.createObjectURL(file);
      setCoverImagePreview(preview);
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImageFile(null);
    setCoverImagePreview(null);
  };

  const handleImageSelect = (versionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(prev => ({
      ...prev,
      [versionId]: [...(prev[versionId] || []), ...files]
    }));

    // Initialize progress for new files
    const newProgress: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));
    setUploadProgress(prev => ({
      ...prev,
      [versionId]: [...(prev[versionId] || []), ...newProgress]
    }));
  };

  const handleRemoveImage = (versionId: string, index: number, isExisting: boolean = false) => {
    if (isExisting) {
      // Remove from existing pages
      setVersions(prev => prev.map(version => 
        version.id === versionId 
          ? { ...version, pages: version.pages.filter((_, i) => i !== index) }
          : version
      ));
    } else {
      // Remove from new selected images
      setSelectedImages(prev => ({
        ...prev,
        [versionId]: (prev[versionId] || []).filter((_, i) => i !== index)
      }));
      setUploadProgress(prev => ({
        ...prev,
        [versionId]: (prev[versionId] || []).filter((_, i) => i !== index)
      }));
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      const words = newCategory.trim().split(/\s+/);

      words.forEach(word => {
        if (word) {
          const existingCategory = mangaCategories.find(
            cat => cat.name.toLowerCase() === word.toLowerCase()
          );

          if (existingCategory) {
            setSelectedCategories(prev => {
              if (!prev.includes(existingCategory.id)) {
                return [...prev, existingCategory.id];
              }
              return prev;
            });
          } else {
            const category = {
              id: crypto.randomUUID(),
              name: word,
              userId: 'temp-user',
              type: 'manga' as const
            };
            addCategory(category);
            setSelectedCategories(prev => [...prev, category.id]);
          }
        }
      });

      setNewCategory('');
    }
  };

  const handlePageClick = (versionId: string, pageIndex: number, pageUrl: string, isNewUpload: boolean = false) => {
    if (isNewUpload) {
      // Handle selection from new uploads
      const newImages = selectedImages[versionId];
      if (newImages && newImages[pageIndex]) {
        const previewUrl = URL.createObjectURL(newImages[pageIndex]);
        setCoverImagePreview(previewUrl);
        setCoverImageFile(newImages[pageIndex]);
        setSelectedCoverPageIndex({ versionId, pageIndex: -1 });
      }
    } else {
      // Handle selection from existing pages
      const version = versions.find(v => v.id === versionId);
      if (version && version.pages && version.pages[pageIndex]) {
        setCoverImagePreview(version.pages[pageIndex]);
        setCoverImageFile(null);
        setSelectedCoverPageIndex({ versionId, pageIndex });
      }
    }
  };

  const movePageInVersion = (versionId: string, fromIndex: number, toIndex: number) => {
    setVersions(prev => prev.map(version => {
      if (version.id === versionId) {
        const newPages = [...version.pages];
        const [movedPage] = newPages.splice(fromIndex, 1);
        newPages.splice(toIndex, 0, movedPage);
        return { ...version, pages: newPages };
      }
      return version;
    }));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedPageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedPageIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, versionId: string, dropIndex: number) => {
    e.preventDefault();
    if (draggedPageIndex !== null && draggedPageIndex !== dropIndex) {
      movePageInVersion(versionId, draggedPageIndex, dropIndex);
    }
    setDraggedPageIndex(null);
    setDragOverIndex(null);
  };

  const moveNewImageInVersion = (versionId: string, fromIndex: number, toIndex: number) => {
    setSelectedImages(prev => {
      const versionImages = [...(prev[versionId] || [])];
      const [movedImage] = versionImages.splice(fromIndex, 1);
      versionImages.splice(toIndex, 0, movedImage);
      return {
        ...prev,
        [versionId]: versionImages
      };
    });

    setUploadProgress(prev => {
      const versionProgress = [...(prev[versionId] || [])];
      const [movedProgress] = versionProgress.splice(fromIndex, 1);
      versionProgress.splice(toIndex, 0, movedProgress);
      return {
        ...prev,
        [versionId]: versionProgress
      };
    });
  };

  const handleNewImageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedNewImageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleNewImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverNewImageIndex(index);
  };

  const handleNewImageDragEnd = () => {
    setDraggedNewImageIndex(null);
    setDragOverNewImageIndex(null);
  };

  const handleNewImageDrop = (e: React.DragEvent, versionId: string, dropIndex: number) => {
    e.preventDefault();
    if (draggedNewImageIndex !== null && draggedNewImageIndex !== dropIndex) {
      moveNewImageInVersion(versionId, draggedNewImageIndex, dropIndex);
    }
    setDraggedNewImageIndex(null);
    setDragOverNewImageIndex(null);
  };

  const addVersion = () => {
    const newVersion: MangaVersion = {
      id: crypto.randomUUID(),
      name: `Versión ${versions.length + 1}`,
      pages: [],
      isDefault: versions.length === 0
    };
    setVersions(prev => [...prev, newVersion]);
  };

  const removeVersion = (versionId: string) => {
    if (versions.length <= 1) return;
    setVersions(prev => prev.filter(v => v.id !== versionId));
    setSelectedImages(prev => {
      const updated = { ...prev };
      delete updated[versionId];
      return updated;
    });
    setUploadProgress(prev => {
      const updated = { ...prev };
      delete updated[versionId];
      return updated;
    });
  };

  const updateVersionName = (versionId: string, name: string) => {
    setVersions(prev => prev.map(v => 
      v.id === versionId ? { ...v, name } : v
    ));
  };

  const setDefaultVersion = (versionId: string) => {
    setVersions(prev => prev.map(v => ({
      ...v,
      isDefault: v.id === versionId
    })));
  };

  const updateProgress = (versionId: string, index: number, progress: number) => {
    setUploadProgress(prev => ({
      ...prev,
      [versionId]: (prev[versionId] || []).map((item, i) => 
        i === index ? { ...item, progress, status: 'uploading' } : item
      )
    }));

    // Calculate overall progress after state update
    setTimeout(() => {
      setUploadProgress(current => {
        const allProgress = Object.values(current).flat();
        if (allProgress.length > 0) {
          const totalProgress = allProgress.reduce((acc, curr) => acc + curr.progress, 0);
          const overallPercent = totalProgress / allProgress.length;
          setOverallProgress(overallPercent);
        }
        return current;
      });
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mangaTitle.trim() || versions.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      let coverImageUrl = initialData?.coverImage;
      
      // Upload cover image if selected
      if (coverImageFile) {
        const uploadedCoverUrl = await uploadToImgBB(coverImageFile);
        if (uploadedCoverUrl) {
          coverImageUrl = uploadedCoverUrl;
        }
      } else if (selectedCoverPageIndex) {
        // Use selected page as cover
        const selectedVersion = versions.find(v => v.id === selectedCoverPageIndex.versionId);
        if (selectedVersion && selectedVersion.pages[selectedCoverPageIndex.pageIndex]) {
          coverImageUrl = selectedVersion.pages[selectedCoverPageIndex.pageIndex];
        }
      } else if (!coverImageUrl && versions.length > 0 && versions[0].pages.length > 0) {
        // Auto-select first page as cover if no cover is set
        coverImageUrl = versions[0].pages[0];
      }

      // Upload images for each version
      const updatedVersions: MangaVersion[] = [];
      
      for (const version of versions) {
        const versionImages = selectedImages[version.id] || [];
        const existingPages = version.pages || [];
        
        if (versionImages.length > 0) {
          // Upload new images for this version
          const uploadPromises = versionImages.map((file, index) => {
            return new Promise<string | null>((resolve) => {
              const xhr = new XMLHttpRequest();
              const formData = new FormData();
              formData.append('image', file);
              formData.append('key', API_CONFIG.IMGBB.API_KEY);

              xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                  const progress = (event.loaded / event.total) * 100;
                  updateProgress(version.id, index, progress);
                }
              });

              xhr.onload = () => {
                if (xhr.status === 200) {
                  const response = JSON.parse(xhr.responseText);
                  if (response.data?.url) {
                    setUploadProgress(prev => ({
                      ...prev,
                      [version.id]: (prev[version.id] || []).map((item, i) => 
                        i === index ? { ...item, status: 'completed', progress: 100 } : item
                      )
                    }));
                    resolve(response.data.url);
                  } else {
                    setUploadProgress(prev => ({
                      ...prev,
                      [version.id]: (prev[version.id] || []).map((item, i) => 
                        i === index ? { ...item, status: 'error' } : item
                      )
                    }));
                    resolve(null);
                  }
                } else {
                  setUploadProgress(prev => ({
                    ...prev,
                    [version.id]: (prev[version.id] || []).map((item, i) => 
                      i === index ? { ...item, status: 'error' } : item
                    )
                  }));
                  resolve(null);
                }
              };

              xhr.onerror = () => {
                setUploadProgress(prev => ({
                  ...prev,
                  [version.id]: (prev[version.id] || []).map((item, i) => 
                    i === index ? { ...item, status: 'error' } : item
                  )
                }));
                resolve(null);
              };

              xhr.open('POST', API_CONFIG.IMGBB.BASE_URL);
              xhr.send(formData);
            });
          });

          const uploadedUrls = await Promise.all(uploadPromises);
          const validUrls = uploadedUrls.filter((url): url is string => url !== null);
          
          updatedVersions.push({
            ...version,
            pages: [...existingPages, ...validUrls]
          });
        } else {
          // Keep existing pages if no new images
          updatedVersions.push({
            ...version,
            pages: existingPages
          });
        }
      }

      const mangaData = {
        title: mangaTitle.trim(),
        theme: theme.trim(),
        description: description.trim(),
        author: author.trim(),
        genre: genre.trim(),
        status,
        releaseYear: releaseYear.trim(),
        coverImage: coverImageUrl || '',
        versions: updatedVersions,
        categoryIds: selectedCategories
      };

      await onSubmit(mangaData);
      onClose();
    } catch (error) {
      console.error('Error:', error);
      setError('Error al procesar el manga. Por favor, inténtalo de nuevo.');
    } finally {
      setIsUploading(false);
      setOverallProgress(0);
      setUploadProgress({});
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gradient-to-br from-surface via-surface to-surface-light p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl w-full max-w-sm sm:max-w-2xl md:max-w-4xl max-h-[98vh] sm:max-h-[95vh] overflow-y-auto shadow-2xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-xl">
              <Book className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {title}
              </h2>
              <p className="text-sm text-gray-400">Crea tu manga con estilo profesional</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-surface-light rounded-lg"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Campos Principales */}
          <div className="bg-surface-light/30 rounded-2xl p-6 border border-gray-600/30 space-y-6">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Información Principal
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Título */}
              <div className="lg:col-span-1">
                <label htmlFor="title" className="block text-sm font-semibold mb-3 text-white">
                  Título del Cómic *
                </label>
                <input
                  type="text"
                  id="title"
                  value={mangaTitle}
                  onChange={(e) => setMangaTitle(e.target.value)}
                  placeholder="Ingresa el nombre del cómic"
                  className="w-full px-4 py-3 bg-surface/80 rounded-xl border border-gray-600/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-lg font-medium"
                  required
                />
              </div>

              {/* Tema */}
              <div className="lg:col-span-1">
                <label htmlFor="theme" className="block text-sm font-semibold mb-3 text-white">
                  Tema
                </label>
                <input
                  type="text"
                  id="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Subtítulo o tema del manga"
                  className="w-full px-4 py-3 bg-surface/80 rounded-xl border border-gray-600/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Opciones Avanzadas */}
          <div className="bg-surface-light/30 rounded-2xl border border-gray-600/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full p-6 flex items-center justify-between hover:bg-surface-light/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-300">Opciones Avanzadas</h3>
                <span className="text-xs bg-gray-700/50 px-2 py-1 rounded-full text-gray-400">
                  Opcional
                </span>
              </div>
              {showAdvancedOptions ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>

            <div className={`transition-all duration-300 ease-in-out ${
              showAdvancedOptions ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
            } overflow-hidden`}>
              <div className="p-6 pt-0 space-y-6">
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-3 text-gray-300">
                    Descripción General
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe de qué trata el manga..."
                    className="w-full px-4 py-3 bg-surface/80 rounded-xl border border-gray-600/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    rows={4}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Categorías */}
          <div className="bg-surface-light/30 rounded-2xl p-6 border border-gray-600/30 space-y-4">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Categorías
            </h3>
            
            <div className="space-y-4">
              {/* Categorías seleccionadas */}
              {selectedCategories.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">Categorías seleccionadas:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map(categoryId => {
                      const category = mangaCategories.find(c => c.id === categoryId);
                      return category ? (
                        <span
                          key={categoryId}
                          className="bg-primary/20 text-primary px-3 py-1.5 rounded-full text-sm flex items-center gap-2"
                        >
                          {category.name}
                          <button
                            type="button"
                            onClick={() => handleCategoryChange(categoryId)}
                            className="hover:text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Dropdown selector de categorías */}
              <div className="space-y-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full px-4 py-3 bg-surface/80 rounded-xl border border-gray-600/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-left flex items-center justify-between"
                  >
                    <span className="text-gray-300">
                      {selectedCategories.length === 0
                        ? 'Seleccionar categorías'
                        : `${selectedCategories.length} categoría${selectedCategories.length !== 1 ? 's' : ''} seleccionada${selectedCategories.length !== 1 ? 's' : ''}`}
                    </span>
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isCategoryDropdownOpen && (
                    <div className="absolute z-20 w-full mt-2 bg-surface border border-gray-600 rounded-xl shadow-xl max-h-64 overflow-hidden">
                      {/* Buscador */}
                      <div className="sticky top-0 p-3 bg-surface border-b border-gray-600">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={categorySearchQuery}
                            onChange={(e) => setCategorySearchQuery(e.target.value)}
                            placeholder="Buscar categorías..."
                            className="w-full pl-9 pr-3 py-2 bg-surface-light rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      
                      {/* Lista de categorías */}
                      <div className="max-h-48 overflow-y-auto">
                        {mangaCategories
                          .filter(category => 
                            category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
                          )
                          .map(category => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => handleCategoryChange(category.id)}
                              className={`w-full px-4 py-3 text-left hover:bg-surface-light transition-colors flex items-center justify-between ${
                                selectedCategories.includes(category.id)
                                  ? 'text-primary bg-primary/10'
                                  : 'text-gray-300'
                              }`}
                            >
                              <span>{category.name}</span>
                              {selectedCategories.includes(category.id) && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </button>
                          ))}
                        {mangaCategories
                          .filter(category => 
                            category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
                          ).length === 0 && (
                          <div className="px-4 py-3 text-gray-400 text-sm">
                            No se encontraron categorías
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Agregar nueva categoría */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Crear nueva categoría"
                  className="flex-1 px-4 py-3 bg-surface/80 rounded-xl border border-gray-600/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-3 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Agregar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Imagen de Portada */}
          <div className="bg-surface-light/30 rounded-2xl p-6 border border-gray-600/30 space-y-4">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Imagen de Portada
            </h3>
            
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="w-full lg:w-48">
                {coverImagePreview ? (
                  <div className="relative group">
                    <div className="aspect-[2/3] w-full">
                      <ImageLoader
                        src={coverImagePreview}
                        alt="Portada"
                        className="rounded-xl ring-2 ring-primary/30 group-hover:ring-primary/50 transition-all"
                        aspectRatio="aspect-[2/3]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoverImage}
                      className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {selectedCoverPageIndex && (
                      <div className="absolute bottom-2 left-2 bg-primary/90 text-white px-2 py-1 rounded-md text-xs font-medium">
                        {selectedCoverPageIndex.pageIndex === -1 ? 'Nueva imagen seleccionada' : 'Página seleccionada'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleCoverImageSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="aspect-[2/3] w-full border-2 border-dashed border-primary/30 rounded-xl flex items-center justify-center bg-primary/5 hover:bg-primary/10 transition-colors group">
                      <div className="text-center">
                        <Plus className="h-8 w-8 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                        <p className="text-sm text-primary font-medium">Subir Portada</p>
                        <p className="text-xs text-gray-400 mt-1">O haz clic en una página existente</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="bg-surface/50 rounded-xl p-4 border border-gray-600/30">
                  <h4 className="font-medium text-white mb-2">Consejos para la portada:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Haz clic en cualquier página existente o nueva para usarla como portada</li>
                    <li>• O sube una imagen personalizada desde tu dispositivo</li>
                    <li>• Puedes seleccionar la portada incluso antes de publicar el manga</li>
                    <li>• Proporción recomendada: 2:3 (vertical)</li>
                    <li>• Formatos soportados: JPG, PNG, WebP, GIF</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Versiones del Manga */}
          <div className="bg-surface-light/30 rounded-2xl p-6 border border-gray-600/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                Versiones del Manga
              </h3>
              <button
                type="button"
                onClick={addVersion}
                className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-xl transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                <span>Agregar Versión</span>
              </button>
            </div>

            <div className="space-y-6">
              {versions.map((version, versionIndex) => (
                <div key={version.id} className="bg-surface/50 rounded-xl p-6 border border-gray-600/30">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3 flex-1">
                      {editingVersionId === version.id ? (
                        <input
                          type="text"
                          value={editingVersionName}
                          onChange={(e) => setEditingVersionName(e.target.value)}
                          onBlur={() => {
                            updateVersionName(version.id, editingVersionName);
                            setEditingVersionId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateVersionName(version.id, editingVersionName);
                              setEditingVersionId(null);
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-surface rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary text-lg font-semibold"
                          autoFocus
                        />
                      ) : (
                        <h4 
                          className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors flex-1"
                          onClick={() => {
                            setEditingVersionId(version.id);
                            setEditingVersionName(version.name);
                          }}
                        >
                          {version.name}
                        </h4>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDefaultVersion(version.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            version.isDefault
                              ? 'bg-primary text-white shadow-lg shadow-primary/25'
                              : 'bg-surface-light text-gray-400 hover:bg-surface hover:text-white'
                          }`}
                        >
                          {version.isDefault ? 'Por Defecto' : 'Hacer Principal'}
                        </button>
                        
                        {versions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVersion(version.id)}
                            className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Existing Images */}
                  {version.pages && version.pages.length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                        Páginas Actuales ({version.pages.length}) - Arrastra para reordenar
                      </h5>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {version.pages.map((pageUrl, index) => (
                          <div 
                            key={index} 
                            className={`relative aspect-[2/3] group cursor-pointer transition-all ${
                              dragOverIndex === index ? 'scale-105 ring-2 ring-primary' : ''
                            } ${
                              selectedCoverPageIndex?.versionId === version.id && selectedCoverPageIndex?.pageIndex === index
                                ? 'ring-2 ring-primary'
                                : ''
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            onDrop={(e) => handleDrop(e, version.id, index)}
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageClick(version.id, index, pageUrl);
                            }}
                          >
                            <ImageLoader
                              src={pageUrl}
                              alt={`Página ${index + 1}`}
                              className={`rounded-lg ring-1 transition-all cursor-pointer ${
                                selectedCoverPageIndex?.versionId === version.id && selectedCoverPageIndex?.pageIndex === index
                                  ? 'ring-2 ring-primary shadow-lg shadow-primary/25'
                                  : 'ring-gray-600/50 group-hover:ring-primary/50'
                              }`}
                              aspectRatio="aspect-[2/3]"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveImage(version.id, index, true);
                              }}
                              className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded-md font-medium">
                              {index + 1}
                            </div>
                            {selectedCoverPageIndex?.versionId === version.id && selectedCoverPageIndex?.pageIndex === index && (
                              <div className="absolute top-1 left-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-md font-medium">
                                ★ Portada
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Images Preview */}
                  {selectedImages[version.id] && selectedImages[version.id].length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        Nuevas Páginas ({selectedImages[version.id].length}) - Arrastra para reordenar
                      </h5>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {selectedImages[version.id].map((file, index) => {
                          const previewUrl = URL.createObjectURL(file);
                          const isSelectedAsCover = coverImagePreview === previewUrl || (selectedCoverPageIndex?.versionId === version.id && selectedCoverPageIndex?.pageIndex === -1 && coverImageFile === file);

                          return (
                            <div
                              key={index}
                              className={`relative aspect-[2/3] group cursor-move transition-all ${
                                dragOverNewImageIndex === index ? 'scale-105 ring-2 ring-primary' : ''
                              } ${
                                isSelectedAsCover ? 'ring-2 ring-primary' : ''
                              }`}
                              draggable
                              onDragStart={(e) => handleNewImageDragStart(e, index)}
                              onDragOver={(e) => handleNewImageDragOver(e, index)}
                              onDragEnd={handleNewImageDragEnd}
                              onDrop={(e) => handleNewImageDrop(e, version.id, index)}
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageClick(version.id, index, previewUrl, true);
                              }}
                            >
                              <img
                                src={previewUrl}
                                alt={`Nueva página ${index + 1}`}
                                className={`w-full h-full object-cover rounded-lg ring-1 transition-all cursor-move ${
                                  isSelectedAsCover
                                    ? 'ring-2 ring-primary shadow-lg shadow-primary/25'
                                    : 'ring-primary/30 group-hover:ring-primary/50'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveImage(version.id, index, false);
                                }}
                                className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              {uploadProgress[version.id]?.[index] && uploadProgress[version.id][index].status === 'uploading' && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1">
                                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary transition-all duration-300"
                                      style={{ width: `${uploadProgress[version.id][index].progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              <div className="absolute bottom-1 left-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded-md font-medium">
                                {(version.pages?.length || 0) + index + 1}
                              </div>
                              {isSelectedAsCover && (
                                <div className="absolute top-1 left-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-md font-medium">
                                  ★ Portada
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Upload Area */}
                  <div className="relative">
                    <input
                      ref={(el) => fileInputRefs.current[version.id] = el}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      multiple
                      onChange={(e) => handleImageSelect(version.id, e)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full h-28 border-2 border-dashed border-primary/30 rounded-xl flex items-center justify-center bg-primary/5 hover:bg-primary/10 transition-colors group">
                      <div className="text-center">
                        <Plus className="h-8 w-8 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                        <p className="text-sm text-primary font-medium">
                          Agregar Páginas a {version.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Selecciona múltiples imágenes
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUploading || !mangaTitle.trim()}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden shadow-xl hover:shadow-primary/25 transform hover:scale-[1.02] disabled:hover:scale-100"
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-lg">Subiendo... {Math.round(overallProgress)}%</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Book className="h-6 w-6" />
                <span className="text-lg">{submitText}</span>
              </div>
            )}
            {isUploading && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-full transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
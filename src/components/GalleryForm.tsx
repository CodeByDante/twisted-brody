import React, { useState, useRef } from 'react';
import { X, Plus, Loader2, Image as ImageIcon, Trash2, GripVertical } from 'lucide-react';
import { useStore } from '../lib/store';
import { uploadToImgBB } from '../lib/utils';
import { API_CONFIG } from '../lib/config';
import type { Gallery } from '../types';
import ImageLoader from './ImageLoader';

interface GalleryFormProps {
  onClose: () => void;
  onSubmit: (data: Omit<Gallery, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
  initialData?: Gallery;
  title: string;
  submitText: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
}

export default function GalleryForm({ 
  onClose, 
  onSubmit, 
  initialData, 
  title, 
  submitText 
}: GalleryFormProps) {
  const { categories, addCategory } = useStore();
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialData?.categoryIds || []);
  const [newCategory, setNewCategory] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || []);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(initialData?.coverImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const galleryCategories = categories.filter(c => c.type === 'gallery');

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(prev => [...prev, ...files]);

    // Initialize progress for new files
    const newProgress: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    }));
    setUploadProgress(prev => [...prev, ...newProgress]);
  };

  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const preview = URL.createObjectURL(file);
      setCoverImagePreview(preview);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStartExisting = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEndExisting = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDragOverExisting = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropExisting = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (dragIndex !== dropIndex) {
      setExistingImages(prev => {
        const newImages = [...prev];
        const [removed] = newImages.splice(dragIndex, 1);
        newImages.splice(dropIndex, 0, removed);
        return newImages;
      });
    }
  };

  const handleDragStartNew = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEndNew = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDragOverNew = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropNew = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));

    if (dragIndex !== dropIndex) {
      setSelectedImages(prev => {
        const newImages = [...prev];
        const [removed] = newImages.splice(dragIndex, 1);
        newImages.splice(dropIndex, 0, removed);
        return newImages;
      });

      setUploadProgress(prev => {
        const newProgress = [...prev];
        const [removedProgress] = newProgress.splice(dragIndex, 1);
        newProgress.splice(dropIndex, 0, removedProgress);
        return newProgress;
      });
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImageFile(null);
    setCoverImagePreview(null);
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
          const existingCategory = galleryCategories.find(
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
              type: 'gallery' as const
            };
            addCategory(category);
            setSelectedCategories(prev => [...prev, category.id]);
          }
        }
      });

      setNewCategory('');
    }
  };

  const updateProgress = (index: number, progress: number) => {
    setUploadProgress(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], progress, status: 'uploading' };
      return updated;
    });

    // Calculate overall progress
    setUploadProgress(prev => {
      const totalProgress = prev.reduce((acc, curr) => acc + curr.progress, 0);
      const overallPercent = totalProgress / prev.length;
      setOverallProgress(overallPercent);
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

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
      }

      // Upload new images with progress tracking
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
                  updated[index] = { ...updated[index], status: 'completed', progress: 100, url: response.data.url };
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

      // Combine existing images with new ones
      const allImages = [...existingImages, ...validUrls];

      const galleryData = {
        name: name.trim(),
        description: description.trim(),
        coverImage: coverImageUrl,
        images: allImages,
        categoryIds: selectedCategories
      };

      await onSubmit(galleryData);
      onClose();
    } catch (error) {
      console.error('Error:', error);
      setError('Error al procesar el álbum. Por favor, inténtalo de nuevo.');
    } finally {
      setIsUploading(false);
      setOverallProgress(0);
      setUploadProgress([]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="block text-sm font-medium mb-2">
              Imagen de portada (opcional)
            </label>
            <div className="space-y-2">
              {coverImagePreview ? (
                <div className="relative">
                  <div className="aspect-video w-full max-w-xs">
                    <ImageLoader
                      src={coverImagePreview}
                      alt="Portada"
                      className="rounded-lg"
                      aspectRatio="aspect-video"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoverImage}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="aspect-video w-full max-w-xs border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-surface-light hover:bg-surface transition-colors">
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-400">
                        Haz clic para agregar portada
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Imágenes del álbum *
            </label>
            
            {/* Existing images */}
            {existingImages.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Imágenes actuales (arrastra para reordenar)</h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {existingImages.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="relative aspect-square group cursor-move"
                      draggable
                      onDragStart={(e) => handleDragStartExisting(e, index)}
                      onDragEnd={handleDragEndExisting}
                      onDragOver={handleDragOverExisting}
                      onDrop={(e) => handleDropExisting(e, index)}
                    >
                      <ImageLoader
                        src={imageUrl}
                        alt={`Existing ${index + 1}`}
                        className="rounded-lg"
                        aspectRatio="aspect-square"
                      />
                      <div className="absolute top-1 left-1 p-0.5 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-3 w-3 text-white" />
                      </div>
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white">
                        {index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(index)}
                        className="absolute -bottom-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New images preview */}
            {selectedImages.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Nuevas imágenes (arrastra para reordenar)</h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {selectedImages.map((file, index) => (
                    <div
                      key={index}
                      className="relative aspect-square group cursor-move"
                      draggable
                      onDragStart={(e) => handleDragStartNew(e, index)}
                      onDragEnd={handleDragEndNew}
                      onDragOver={handleDragOverNew}
                      onDrop={(e) => handleDropNew(e, index)}
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute top-1 left-1 p-0.5 bg-black/60 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-3 w-3 text-white" />
                      </div>
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-xs text-white">
                        {existingImages.length + index + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -bottom-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {uploadProgress[index] && uploadProgress[index].status === 'uploading' && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
                          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${uploadProgress[index].progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
                  <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400">
                    Haz clic para agregar imágenes
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          
          <button
            type="submit"
            disabled={isUploading || !name.trim() || (existingImages.length === 0 && selectedImages.length === 0)}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden shadow-lg hover:shadow-primary/25 transform hover:scale-[1.02]"
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Subiendo... {Math.round(overallProgress)}%</span>
              </div>
            ) : (
              submitText
            )}
            {isUploading && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-full"
                style={{ width: `${overallProgress}%` }}
              />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
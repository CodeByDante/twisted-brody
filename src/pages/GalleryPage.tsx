import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Image as ImageIcon, X, ChevronRight, Pencil, Trash2, Loader2, Tag, ChevronDown, Filter, ChevronUp, ToggleLeft, ToggleRight, ArrowUpDown, Grid, List, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Link } from 'react-router-dom';
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ImageLoader from '../components/ImageLoader';
import type { Gallery } from '../types';
import GalleryForm from '../components/GalleryForm';

export default function GalleryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedCategories = searchParams.getAll('category');
  const [galleryList, setGalleryList] = useState<Gallery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingGallery, setEditingGallery] = useState<string | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    description: '',
    categories: [] as string[],
    singleSelection: true
  });
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const { settings } = useStore();
  const [sortMode, setSortMode] = useState<'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'size-asc' | 'size-desc'>('date-desc');
  const [viewMode, setViewMode] = useState<'masonry' | 'grid' | 'vertical'>('masonry');

  useEffect(() => {
    const loadGalleries = async () => {
      try {
        const galleryCollection = collection(db, 'galleries');
        const gallerySnapshot = await getDocs(galleryCollection);
        const galleryData = gallerySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Gallery[];
        setGalleryList(galleryData);
      } catch (error) {
        console.error('Error loading galleries:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGalleries();
  }, []);

  const getSortedGalleries = (galleries: Gallery[]) => {
    return [...galleries].sort((a, b) => {
      let comparison = 0;

      const [sortBy, sortOrder] = sortMode.split('-') as [string, 'asc' | 'desc'];

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          comparison = (a.images?.length || 0) - (b.images?.length || 0);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const handleAddGallery = async (data: Omit<Gallery, 'id' | 'createdAt' | 'userId'>) => {
    try {
      const newGallery: Gallery = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
        userId: 'temp-user'
      };

      await setDoc(doc(db, 'galleries', newGallery.id), newGallery);
      setGalleryList(prev => [...prev, newGallery]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error adding gallery:', error);
      alert('Error al guardar el álbum. Por favor, inténtalo de nuevo.');
    }
  };

  const handleDeleteGallery = async (galleryId: string) => {
    try {
      const galleryRef = doc(db, 'galleries', galleryId);
      await deleteDoc(galleryRef);
      setGalleryList(prev => prev.filter(gallery => gallery.id !== galleryId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting gallery:', error);
      alert('Error al eliminar el álbum. Por favor, inténtalo de nuevo.');
    }
  };

  const baseGalleries = galleryList.filter(gallery =>
    (searchQuery ? gallery.name.toLowerCase().includes(searchQuery.toLowerCase()) : true) &&
    (searchFilters.name ? gallery.name.toLowerCase().includes(searchFilters.name.toLowerCase()) : true) &&
    (searchFilters.description ? gallery.description?.toLowerCase().includes(searchFilters.description.toLowerCase()) : true) &&
    (searchFilters.categories.length > 0 ? 
     searchFilters.categories.some(categoryId => gallery.categoryIds?.includes(categoryId)) : true) &&
    (selectedCategories.length === 0 || 
     selectedCategories.some(categoryId => gallery.categoryIds?.includes(categoryId)))
  );
  
  const filteredGalleries = getSortedGalleries(baseGalleries);

  const handleAdvancedSearch = () => {
    setSearchQuery(searchFilters.name);
    if (searchFilters.categories.length > 0) {
      const params = new URLSearchParams(searchParams);
      params.delete('category');
      searchFilters.categories.forEach(categoryId => params.append('category', categoryId));
      setSearchParams(params);
    }
    setShowAdvancedSearch(false);
  };

  const clearAdvancedFilters = () => {
    setSearchFilters({ 
      name: '', 
      description: '', 
      categories: [], 
      singleSelection: true 
    });
    setSearchQuery('');
    setSearchParams(new URLSearchParams());
    setIsCategoryDropdownOpen(false);
    setCategorySearchQuery('');
  };

  const { categories } = useStore();
  const galleryCategories = categories.filter(c => c.type === 'gallery');

  const handleRemoveCategoryFilter = (categoryId: string) => {
    const params = new URLSearchParams(searchParams);
    const currentCategories = searchParams.getAll('category').filter(id => id !== categoryId);
    params.delete('category');
    currentCategories.forEach(id => params.append('category', id));
    setSearchParams(params);
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSearchFilters(prev => {
      if (prev.singleSelection) {
        return { ...prev, categories: [categoryId] };
      } else {
        const newCategories = prev.categories.includes(categoryId)
          ? prev.categories.filter(id => id !== categoryId)
          : [...prev.categories, categoryId];
        return { ...prev, categories: newCategories };
      }
    });
  };

  const filteredCategoriesForDropdown = galleryCategories.filter(category =>
    category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  const cycleViewMode = () => {
    setViewMode(prev => {
      switch (prev) {
        case 'masonry':
          return 'grid';
        case 'grid':
          return 'vertical';
        case 'vertical':
          return 'masonry';
        default:
          return 'masonry';
      }
    });
  };

  const getViewModeIcon = () => {
    switch (viewMode) {
      case 'masonry':
        return <LayoutGrid className="h-4 w-4" />;
      case 'grid':
        return <Grid className="h-4 w-4" />;
      case 'vertical':
        return <List className="h-4 w-4" />;
      default:
        return <LayoutGrid className="h-4 w-4" />;
    }
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'masonry':
        return 'Vista galería';
      case 'grid':
        return 'Vista cuadrícula';
      case 'vertical':
        return 'Vista vertical';
      default:
        return 'Vista galería';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando álbumes...</p>
        </div>
      </div>
    );
  }

  const renderGalleryCard = (gallery: Gallery) => (
    <div key={gallery.id} className="group relative break-inside-avoid">
      <Link
        to={`/gallery/${gallery.id}`}
        className="block cursor-pointer"
      >
        <div className="aspect-[4/3] rounded-lg sm:rounded-xl overflow-hidden bg-gray-900 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
          {gallery.coverImage ? (
            <ImageLoader
              src={gallery.coverImage}
              alt={gallery.name}
              className="transition-all duration-500 group-hover:scale-105"
              aspectRatio="aspect-[4/3]"
            />
          ) : gallery.images && gallery.images.length > 0 ? (
            <ImageLoader
              src={gallery.images[0]}
              alt={gallery.name}
              className="transition-all duration-500 group-hover:scale-105"
              aspectRatio="aspect-[4/3]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <ImageIcon className="h-12 w-12" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 inline-block">
              <p className="text-white text-xs font-medium truncate">
                {gallery.images?.length || 0} imágenes
              </p>
            </div>
          </div>
        </div>
      </Link>
      
      {/* Title and description always below the image */}
      <div className="mt-2 sm:mt-3 px-1">
        <Link to={`/gallery/${gallery.id}`}>
          <h3 className="font-medium text-sm sm:text-base group-hover:text-primary transition-colors line-clamp-2 leading-tight text-center">
            {gallery.name}
          </h3>
        </Link>
        {gallery.description && (
          <p className="text-xs text-gray-400 line-clamp-1 mt-1 text-center">
            {gallery.description}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1 text-center">
          {gallery.images?.length || 0} imágenes
        </p>
      </div>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.preventDefault();
            setEditingGallery(gallery.id);
          }}
          className="p-1.5 sm:p-2 bg-black/70 backdrop-blur-sm text-white rounded-full hover:bg-primary transition-colors shadow-lg"
          title="Editar álbum"
        >
          <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            setShowDeleteConfirm(gallery.id);
          }}
          className="p-1.5 sm:p-2 bg-black/70 backdrop-blur-sm text-white rounded-full hover:bg-red-500 transition-colors shadow-lg"
          title="Eliminar álbum"
        >
          <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Álbumes</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Nuevo Álbum</span>
        </button>
      </div>

      {/* Filtros activos */}
      {selectedCategories.length > 0 && (
        <div className="bg-surface rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Filtros activos
            </h3>
            <Link
              to="/gallery"
              className="text-primary hover:text-primary/80 text-sm"
            >
              Limpiar filtros
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(categoryId => {
              const category = galleryCategories.find(c => c.id === categoryId);
              return category ? (
                <span
                  key={categoryId}
                  className="bg-primary/20 text-primary px-3 py-1.5 rounded-full text-sm flex items-center gap-2"
                >
                  <Tag className="h-3 w-3" />
                  {category.name}
                  <button
                    onClick={() => handleRemoveCategoryFilter(categoryId)}
                    className="hover:text-white ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      <div className="bg-surface rounded-lg p-4 space-y-4">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder="Buscar álbumes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-light rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => {
                const modes: typeof sortMode[] = ['date-desc', 'date-asc', 'name-asc', 'name-desc', 'size-asc', 'size-desc'];
                const currentIndex = modes.indexOf(sortMode);
                const nextIndex = (currentIndex + 1) % modes.length;
                setSortMode(modes[nextIndex]);
              }}
              className="px-3 sm:px-4 py-2 rounded-lg border border-gray-600 bg-surface-light hover:bg-surface text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm sm:text-base"
              title="Cambiar orden"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">
                {sortMode === 'date-desc' && 'Más recientes'}
                {sortMode === 'date-asc' && 'Más antiguos'}
                {sortMode === 'name-asc' && 'A-Z'}
                {sortMode === 'name-desc' && 'Z-A'}
                {sortMode === 'size-asc' && 'Menos imágenes'}
                {sortMode === 'size-desc' && 'Más imágenes'}
              </span>
            </button>
            <button
              onClick={cycleViewMode}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-surface-light hover:bg-surface rounded-lg transition-colors text-sm sm:text-base"
              title={getViewModeLabel()}
            >
              {getViewModeIcon()}
              <span className="hidden sm:inline">{getViewModeLabel()}</span>
            </button>
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={`px-3 sm:px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 text-sm sm:text-base ${
                showAdvancedSearch || searchFilters.name || searchFilters.description || searchFilters.categories.length > 0
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-600 bg-surface-light hover:bg-surface text-gray-400 hover:text-white'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedSearch ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showAdvancedSearch && (
            <div className="bg-surface-light rounded-lg p-4 space-y-4 animate-slide-up">
              <h3 className="font-medium text-white flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Búsqueda Avanzada
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre</label>
                  <input
                    type="text"
                    placeholder="Filtrar por nombre..."
                    value={searchFilters.name}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <input
                    type="text"
                    placeholder="Filtrar por descripción..."
                    value={searchFilters.description}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAdvancedSearch}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Aplicar Filtros
                </button>
                <button
                  type="button"
                  onClick={clearAdvancedFilters}
                  className="px-4 py-2 bg-surface hover:bg-surface/80 text-gray-400 hover:text-white rounded-lg transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Vista de álbumes */}
        {viewMode === 'vertical' ? (
          <div className="space-y-4">
            {filteredGalleries.map(gallery => (
              <div key={gallery.id} className="bg-surface-light rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 group hover:bg-surface transition-colors">
                <Link to={`/gallery/${gallery.id}`} className="flex-shrink-0">
                  <div className="w-full sm:w-24 aspect-[4/3] sm:h-18 rounded-lg overflow-hidden bg-gray-900">
                    {gallery.coverImage ? (
                      <ImageLoader
                        src={gallery.coverImage}
                        alt={gallery.name}
                        aspectRatio="w-full h-full"
                      />
                    ) : gallery.images && gallery.images.length > 0 ? (
                      <ImageLoader
                        src={gallery.images[0]}
                        alt={gallery.name}
                        aspectRatio="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="h-8 w-8 sm:h-6 sm:w-6" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/gallery/${gallery.id}`}>
                    <h3 className="font-semibold text-base sm:text-lg group-hover:text-primary transition-colors line-clamp-2">
                      {gallery.name}
                    </h3>
                  </Link>
                  {gallery.description && (
                    <p className="text-gray-400 text-sm line-clamp-2 mt-1">
                      {gallery.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1 sm:mt-2">
                    {gallery.images?.length || 0} imágenes
                  </p>
                </div>
                <div className="flex sm:flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity self-start">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setEditingGallery(gallery.id);
                    }}
                    className="p-1.5 sm:p-2 hover:bg-surface rounded-lg transition-colors"
                    title="Editar álbum"
                  >
                    <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDeleteConfirm(gallery.id);
                    }}
                    className="p-1.5 sm:p-2 hover:bg-surface rounded-lg transition-colors text-red-500"
                    title="Eliminar álbum"
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredGalleries.map(renderGalleryCard)}
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 sm:gap-4 space-y-3">
            {filteredGalleries.map(renderGalleryCard)}
          </div>
        )}

        {filteredGalleries.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-400 mb-2">No hay álbumes</h2>
            <p className="text-sm sm:text-base text-gray-500 mb-4 px-4">
              {searchQuery || selectedCategories.length > 0 ? 
                'No se encontraron álbumes que coincidan con los filtros' : 
                'Crea tu primer álbum para comenzar'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/90 text-white px-4 sm:px-6 py-2 rounded-lg transition-colors text-sm sm:text-base"
            >
              Crear Álbum
            </button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <GalleryForm
          title="Nuevo Álbum"
          submitText="Crear Álbum"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleAddGallery}
        />
      )}

      {editingGallery && (
        <GalleryForm
          title="Editar Álbum"
          submitText="Guardar Cambios"
          initialData={galleryList.find(g => g.id === editingGallery)}
          onClose={() => setEditingGallery(null)}
          onSubmit={async (data: Omit<Gallery, 'id' | 'createdAt' | 'userId'>) => {
            try {
              const galleryRef = doc(db, 'galleries', editingGallery);
              const updatedGallery = {
                ...galleryList.find(g => g.id === editingGallery),
                ...data,
                id: editingGallery
              };
              await setDoc(galleryRef, updatedGallery);
              setGalleryList(prev => prev.map(g => 
                g.id === editingGallery ? updatedGallery : g
              ));
              setEditingGallery(null);
            } catch (error) {
              console.error('Error updating gallery:', error);
              alert('Error al actualizar el álbum. Por favor, inténtalo de nuevo.');
            }
          }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-4 sm:p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">¿Eliminar álbum?</h2>
            <p className="text-gray-300 mb-6">
              ¿Estás seguro de que deseas eliminar este álbum? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeleteGallery(showDeleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-md text-sm sm:text-base"
              >
                Eliminar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-surface-light hover:bg-surface-light/80 text-white font-medium py-2 px-4 rounded-md text-sm sm:text-base"
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
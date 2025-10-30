import React, { useState } from 'react';
import { Tag, Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight, Search, Video, Book, Image as ImageIcon } from 'lucide-react';
import { useStore } from '../lib/store';
import { Link, useNavigate } from 'react-router-dom';

interface CategoryFormModalProps {
  onClose: () => void;
  onSubmit: (name: string, type: 'video' | 'manga' | 'gallery') => void;
  initialName?: string;
  initialType?: 'video' | 'manga' | 'gallery';
  title: string;
  submitText: string;
}

function CategoryFormModal({ onClose, onSubmit, initialName = '', initialType = 'video', title, submitText }: CategoryFormModalProps) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<'video' | 'manga' | 'gallery'>(initialType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), type);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface p-4 sm:p-6 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              className="w-full px-3 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tipo de categoría *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('video')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                  type === 'video' 
                    ? 'bg-primary text-white' 
                    : 'bg-surface-light hover:bg-surface-light/80'
                }`}
              >
                <Video className="h-4 w-4" />
                <span>Videos</span>
              </button>
              <button
                type="button"
                onClick={() => setType('manga')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                  type === 'manga' 
                    ? 'bg-primary text-white' 
                    : 'bg-surface-light hover:bg-surface-light/80'
                }`}
              >
                <Book className="h-4 w-4" />
                <span>Manga</span>
              </button>
              <button
                type="button"
                onClick={() => setType('gallery')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                  type === 'gallery' 
                    ? 'bg-primary text-white' 
                    : 'bg-surface-light hover:bg-surface-light/80'
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                <span>Álbumes</span>
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-md"
          >
            {submitText}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const navigate = useNavigate();
  const { categories, addCategory, removeCategory } = useStore();
  
  // Debug: Log categories to console
  React.useEffect(() => {
    console.log('Categories loaded:', categories);
    console.log('Video categories:', categories.filter(c => c.type === 'video'));
    console.log('Manga categories:', categories.filter(c => c.type === 'manga'));
  }, [categories]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{id: string, name: string, type: 'video' | 'manga'} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [singleSelection, setSingleSelection] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'video' | 'manga' | 'gallery'>('video');

  const videoCategories = categories.filter(category => 
    category.type === 'video' && category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mangaCategories = categories.filter(category => 
    category.type === 'manga' && category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const galleryCategories = categories.filter(category => 
    category.type === 'gallery' && category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentCategories = activeTab === 'video' ? videoCategories : 
                           activeTab === 'manga' ? mangaCategories : galleryCategories;

  const handleDeleteCategory = async (categoryId: string) => {
    await removeCategory(categoryId);
    setShowDeleteConfirm(null);
  };

  const handleCategoryClick = (categoryId: string) => {
    if (singleSelection) {
      if (activeTab === 'video') {
        navigate(`/?category=${categoryId}`);
      } else if (activeTab === 'manga') {
        navigate(`/comicon?category=${categoryId}`);
      } else {
        navigate(`/gallery?category=${categoryId}`);
      }
    } else {
      setSelectedCategories(prev => {
        if (prev.includes(categoryId)) {
          return prev.filter(id => id !== categoryId);
        }
        return [...prev, categoryId];
      });
    }
  };

  const handleSearch = () => {
    if (selectedCategories.length > 0) {
      const searchParams = selectedCategories.map(id => `category=${id}`).join('&');
      if (activeTab === 'video') {
        navigate(`/?${searchParams}`);
      } else if (activeTab === 'manga') {
        navigate(`/comicon?${searchParams}`);
      } else {
        navigate(`/gallery?${searchParams}`);
      }
    }
  };

  const handleAddCategory = (name: string, type: 'video' | 'manga') => {
    const existingCategory = categories.find(
      cat => cat.name === name && cat.type === type
    );

    if (existingCategory) {
      if (singleSelection) {
        if (type === 'video') {
          navigate(`/?category=${existingCategory.id}`);
        } else if (type === 'manga') {
          navigate(`/comicon?category=${existingCategory.id}`);
        } else {
          navigate(`/gallery?category=${existingCategory.id}`);
        }
      } else {
        setSelectedCategories(prev => {
          if (!prev.includes(existingCategory.id)) {
            return [...prev, existingCategory.id];
          }
          return prev;
        });
      }
    } else {
      addCategory({
        id: crypto.randomUUID(),
        name,
        userId: 'temp-user',
        type
      });
    }
  };

  // Function to add sample categories
  const addSampleCategories = () => {
    const sampleVideoCategories = [
      'Acción', 'Comedia', 'Drama', 'Terror', 'Ciencia Ficción', 'Romance'
    ];
    
    const sampleMangaCategories = [
      'Shonen', 'Seinen', 'Shoujo', 'Josei', 'Kodomomuke'
    ];
    
    const sampleGalleryCategories = [
      'Paisajes', 'Retratos', 'Arquitectura', 'Naturaleza', 'Arte', 'Fotografía'
    ];
    
    sampleVideoCategories.forEach(name => {
      addCategory({
        id: crypto.randomUUID(),
        name,
        userId: 'temp-user',
        type: 'video'
      });
    });
    
    sampleMangaCategories.forEach(name => {
      addCategory({
        id: crypto.randomUUID(),
        name,
        userId: 'temp-user',
        type: 'manga'
      });
    });
    
    sampleGalleryCategories.forEach(name => {
      addCategory({
        id: crypto.randomUUID(),
        name,
        userId: 'temp-user',
        type: 'gallery'
      });
    });
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Tag className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Categorías</h1>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <button
              onClick={addSampleCategories}
              className="flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Agregar Ejemplos</span>
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Nueva Categoría</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface rounded-lg p-1 flex">
        <button
          onClick={() => {
            setActiveTab('video');
            setSelectedCategories([]);
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-md transition-colors ${
            activeTab === 'video'
              ? 'bg-primary text-white'
              : 'text-gray-400 hover:text-white hover:bg-surface-light'
          }`}
        >
          <Video className="h-4 w-4" />
          <span className="hidden sm:inline">Videos</span>
          <span className="sm:hidden">({videoCategories.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('manga');
            setSelectedCategories([]);
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-md transition-colors ${
            activeTab === 'manga'
              ? 'bg-primary text-white'
              : 'text-gray-400 hover:text-white hover:bg-surface-light'
          }`}
        >
          <Book className="h-4 w-4" />
          <span className="hidden sm:inline">Manga</span>
          <span className="sm:hidden">({mangaCategories.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('gallery');
            setSelectedCategories([]);
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-md transition-colors ${
            activeTab === 'gallery'
              ? 'bg-primary text-white'
              : 'text-gray-400 hover:text-white hover:bg-surface-light'
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Álbumes</span>
          <span className="sm:hidden">({galleryCategories.length})</span>
        </button>
      </div>

      <div className="bg-surface rounded-lg p-3 sm:p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder={`Buscar categorías de ${activeTab === 'video' ? 'videos' : activeTab === 'manga' ? 'manga' : 'álbumes'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-surface-light rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
            />
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3">
            {!singleSelection && (
              <button
                onClick={handleSearch}
                disabled={selectedCategories.length === 0}
                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="h-4 w-4" />
                <span>Buscar ({selectedCategories.length})</span>
              </button>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSingleSelection(!singleSelection);
                  setSelectedCategories([]);
                }}
                className="text-gray-300 hover:text-white"
              >
                {singleSelection ? (
                  <ToggleRight className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                ) : (
                  <ToggleLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                )}
              </button>
              <span className="text-xs sm:text-sm text-gray-300">
                {singleSelection ? 'Selección única' : 'Selección múltiple'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {currentCategories.map(category => (
            <div
              key={category.id}
              className={`bg-surface-light rounded-lg p-3 flex items-center justify-between group cursor-pointer transition-colors ${
                selectedCategories.includes(category.id) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleCategoryClick(category.id)}
            >
              <div className="flex items-center gap-2">
                {category.type === 'video' ? (
                  <Video className="h-4 w-4 text-primary" />
                ) : category.type === 'manga' ? (
                  <Book className="h-4 w-4 text-primary" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-primary" />
                )}
                <span className="text-sm sm:text-base hover:text-primary transition-colors truncate">
                  {category.name}
                </span>
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategory({
                      id: category.id,
                      name: category.name,
                      type: category.type || 'video'
                    });
                  }}
                  className="p-1.5 hover:bg-surface rounded-lg transition-colors"
                  title="Editar categoría"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(category.id);
                  }}
                  className="p-1.5 hover:bg-surface rounded-lg transition-colors text-red-500"
                  title="Eliminar categoría"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {currentCategories.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              {activeTab === 'video' ? <Video className="h-12 w-12 mx-auto mb-2" /> : 
               activeTab === 'manga' ? <Book className="h-12 w-12 mx-auto mb-2" /> :
               <ImageIcon className="h-12 w-12 mx-auto mb-2" />}
            </div>
            <p className="text-gray-400">
              No hay categorías de {activeTab === 'video' ? 'videos' : activeTab === 'manga' ? 'manga' : 'álbumes'} {searchQuery ? 'que coincidan con la búsqueda' : 'creadas'}
            </p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CategoryFormModal
          title="Nueva Categoría"
          submitText="Crear Categoría"
          initialType={activeTab}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleAddCategory}
        />
      )}

      {editingCategory && (
        <CategoryFormModal
          title="Editar Categoría"
          submitText="Guardar Cambios"
          initialName={editingCategory.name}
          initialType={editingCategory.type}
          onClose={() => setEditingCategory(null)}
          onSubmit={(name, type) => {
            handleAddCategory(name, type);
            setEditingCategory(null);
          }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-4 sm:p-6 rounded-lg w-full max-w-md">
            <h2 className="text-lg sm:text-xl font-bold mb-3">¿Eliminar categoría?</h2>
            <p className="text-sm text-gray-300 mb-4">
              Esta acción no se puede deshacer. ¿Estás seguro?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteCategory(showDeleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-md text-sm"
              >
                Eliminar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-surface-light hover:bg-surface-light/80 text-white font-medium py-2 px-3 rounded-md text-sm"
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
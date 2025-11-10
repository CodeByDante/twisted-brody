import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Book, X, ChevronRight, Pencil, Trash2, Image as ImageIcon, Loader2, Tag, ChevronDown, Filter, ChevronUp, ToggleLeft, ToggleRight, ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Link } from 'react-router-dom';
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ImageLoader from '../components/ImageLoader';
import type { Manga } from '../types';
import MangaForm from '../components/MangaForm';

export default function ComiconPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const selectedCategories = searchParams.getAll('category');
  const [mangaList, setMangaList] = useState<Manga[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingManga, setEditingManga] = useState<string | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    title: '',
    categories: [] as string[],
    singleSelection: true
  });
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const { settings } = useStore();
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const loadManga = async () => {
      try {
        const mangaCollection = collection(db, 'manga');
        const mangaSnapshot = await getDocs(mangaCollection);
        const mangaData = mangaSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Manga[];
        setMangaList(mangaData);
      } catch (error) {
        console.error('Error loading manga:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadManga();
  }, []);

  const getSortedManga = (manga: Manga[]) => {
    return [...manga].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'size':
          const aTotalPages = a.versions.reduce((total, version) => total + (version.pages?.length || 0), 0);
          const bTotalPages = b.versions.reduce((total, version) => total + (version.pages?.length || 0), 0);
          comparison = aTotalPages - bTotalPages;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const handleAddManga = async (data: Omit<Manga, 'id' | 'createdAt' | 'userId'>) => {
    try {
      const newManga: Manga = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
        userId: 'temp-user'
      };

      await setDoc(doc(db, 'manga', newManga.id), newManga);
      setMangaList(prev => [...prev, newManga]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error adding manga:', error);
      alert('Error al guardar el manga. Por favor, inténtalo de nuevo.');
    }
  };

  const handleDeleteManga = async (mangaId: string) => {
    try {
      const mangaRef = doc(db, 'manga', mangaId);
      await deleteDoc(mangaRef);
      setMangaList(prev => prev.filter(manga => manga.id !== mangaId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting manga:', error);
      alert('Error al eliminar el manga. Por favor, inténtalo de nuevo.');
    }
  };

  const { categories } = useStore();
  const mangaCategories = categories.filter(c => c.type === 'manga');

  const baseManga = mangaList.filter(manga => {
    const query = searchQuery.toLowerCase().trim();

    // Dividir el query en palabras individuales
    const searchTerms = query.split(/\s+/).filter(term => term.length > 0);

    // Buscar en título - debe coincidir con al menos una palabra
    const matchesTitle = searchTerms.length === 0 || searchTerms.some(term =>
      manga.title.toLowerCase().includes(term)
    );

    // Buscar en nombres de categorías asociadas
    const matchesCategory = searchTerms.length > 0 && manga.categoryIds && manga.categoryIds.length > 0
      ? searchTerms.some(term =>
          manga.categoryIds.some(categoryId => {
            const category = mangaCategories.find(c => c.id === categoryId);
            return category?.name.toLowerCase().includes(term);
          })
        )
      : false;

    // Buscar en autor
    const matchesAuthor = searchTerms.length > 0 && manga.author
      ? searchTerms.some(term => manga.author?.toLowerCase().includes(term))
      : false;

    // Buscar en género
    const matchesGenre = searchTerms.length > 0 && manga.genre
      ? searchTerms.some(term => manga.genre?.toLowerCase().includes(term))
      : false;

    // Buscar en tema
    const matchesTheme = searchTerms.length > 0 && manga.theme
      ? searchTerms.some(term => manga.theme?.toLowerCase().includes(term))
      : false;

    return (
      (searchQuery ? (matchesTitle || matchesCategory || matchesAuthor || matchesGenre || matchesTheme) : true) &&
      (searchFilters.title ? manga.title.toLowerCase().includes(searchFilters.title.toLowerCase()) : true) &&
      (searchFilters.categories.length > 0 ?
       searchFilters.categories.some(categoryId => manga.categoryIds?.includes(categoryId)) : true) &&
      (selectedCategories.length === 0 ||
       selectedCategories.some(categoryId => manga.categoryIds?.includes(categoryId)))
    );
  });

  const filteredManga = getSortedManga(baseManga);

  const handleAdvancedSearch = () => {
    setSearchQuery(searchFilters.title);
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
      title: '',
      categories: [],
      singleSelection: true
    });
    setSearchQuery('');
    setSearchParams(new URLSearchParams());
    setIsCategoryDropdownOpen(false);
    setCategorySearchQuery('');
  };

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

  const filteredCategoriesForDropdown = mangaCategories.filter(category =>
    category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Cargando manga...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Book className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Biblioteca de Manga</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Nuevo Manga</span>
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
              to="/comicon"
              className="text-primary hover:text-primary/80 text-sm"
            >
              Limpiar filtros
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(categoryId => {
              const category = mangaCategories.find(c => c.id === categoryId);
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
                placeholder="Buscar manga..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-light rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => {
                const modes: typeof sortBy[] = ['date', 'name', 'size'];
                const currentIndex = modes.indexOf(sortBy);
                const nextIndex = (currentIndex + 1) % modes.length;
                setSortBy(modes[nextIndex]);
              }}
              className="px-4 py-2 rounded-lg border border-gray-600 bg-surface-light hover:bg-surface text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              title="Cambiar criterio de ordenamiento"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">
                {sortBy === 'date' && 'Fecha'}
                {sortBy === 'name' && 'Nombre'}
                {sortBy === 'size' && 'Páginas'}
              </span>
            </button>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 rounded-lg border border-gray-600 bg-surface-light hover:bg-surface text-gray-400 hover:text-white transition-colors"
              title={sortOrder === 'asc' ? 'Orden ascendente' : 'Orden descendente'}
            >
              {sortOrder === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                showAdvancedSearch || searchFilters.title || searchFilters.categories.length > 0
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-600 bg-surface-light hover:bg-surface text-gray-400 hover:text-white'
              }`}
            >
              <Filter className="h-4 w-4" />
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedSearch ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showAdvancedSearch && (
            <div className="bg-surface-light rounded-lg p-4 space-y-4 animate-slide-up">
              <h3 className="font-medium text-white flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Búsqueda Avanzada
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Título</label>
                  <input
                    type="text"
                    placeholder="Filtrar por título..."
                    value={searchFilters.title}
                    onChange={(e) => setSearchFilters(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Categorías</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSearchFilters(prev => ({ 
                          ...prev, 
                          singleSelection: !prev.singleSelection,
                          categories: prev.singleSelection ? prev.categories : prev.categories.slice(0, 1)
                        }))}
                        className="text-gray-300 hover:text-white"
                      >
                        {searchFilters.singleSelection ? (
                          <ToggleRight className="h-5 w-5 text-primary" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <span className="text-xs text-gray-300">
                        {searchFilters.singleSelection ? 'Única' : 'Múltiple'}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className="w-full px-3 py-2 bg-surface rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary text-left flex items-center justify-between"
                    >
                      <span className="text-gray-300 truncate">
                        {searchFilters.categories.length === 0
                          ? 'Seleccionar categorías'
                          : searchFilters.categories
                              .map(id => categories.find(c => c.id === id)?.name)
                              .filter(Boolean)
                              .join(', ')}
                      </span>
                      <span className={`transform transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown className="h-4 w-4" />
                      </span>
                    </button>

                    {isCategoryDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-surface border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
                        <div className="sticky top-0 p-2 bg-surface border-b border-gray-600">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="text"
                              value={categorySearchQuery}
                              onChange={(e) => setCategorySearchQuery(e.target.value)}
                              placeholder="Buscar categorías..."
                              className="w-full pl-9 pr-3 py-2 bg-surface-light rounded-md border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {mangaCategories.filter(category =>
                            category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
                          ).map(category => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => handleCategoryToggle(category.id)}
                              className={`w-full px-3 py-2 text-left hover:bg-surface-light transition-colors flex items-center justify-between ${
                                searchFilters.categories.includes(category.id)
                                  ? 'text-primary bg-primary/10'
                                  : 'text-gray-300'
                              }`}
                            >
                              <span>{category.name}</span>
                              {searchFilters.categories.includes(category.id) && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </button>
                          ))}
                          {mangaCategories.filter(category =>
                            category.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-2 text-gray-400 text-sm">
                              No se encontraron categorías
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {searchFilters.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {searchFilters.categories.map(categoryId => {
                    const category = mangaCategories.find(c => c.id === categoryId);
                    return category ? (
                      <span
                        key={categoryId}
                        className="bg-primary/20 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1"
                      >
                        <Tag className="h-3 w-3" />
                        {category.name}
                        <button
                          type="button"
                          onClick={() => setSearchFilters(prev => ({
                            ...prev,
                            categories: prev.categories.filter(id => id !== categoryId)
                          }))}
                          className="hover:text-white ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              
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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredManga.map(manga => (
            <div key={manga.id} className="group relative">
              <Link
                to={`/manga/${manga.id}`}
                className="block cursor-pointer"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 mb-3 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]">
                  <ImageLoader
                    src={manga.coverImage}
                    alt={manga.title}
                    className="transition-all duration-500 group-hover:scale-105"
                    aspectRatio="aspect-[2/3]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-black/70 backdrop-blur-sm rounded-md px-2 py-1 inline-block">
                      <p className="text-white text-xs font-medium truncate">
                        {manga.versions.reduce((total, version) => total + (version.pages?.length || 0), 0)} páginas
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-center px-1">
                  <h3 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                    {manga.title}
                  </h3>
                  {manga.theme && (
                    <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                      {manga.theme}
                    </p>
                  )}
                  {manga.author && (
                    <p className="text-xs text-gray-400 line-clamp-1 mt-1">
                      {manga.author}
                    </p>
                  )}
                </div>
              </Link>

              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setEditingManga(manga.id);
                  }}
                  className="p-1.5 bg-black/70 backdrop-blur-sm text-white rounded-full hover:bg-primary transition-colors"
                  title="Editar manga"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowDeleteConfirm(manga.id);
                  }}
                  className="p-1.5 bg-black/70 backdrop-blur-sm text-white rounded-full hover:bg-red-500 transition-colors"
                  title="Eliminar manga"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreateModal && (
        <MangaForm
          title="Nuevo Manga"
          submitText="Crear Manga"
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleAddManga}
        />
      )}

      {editingManga && (
        <MangaForm
          title="Editar Manga"
          submitText="Guardar Cambios"
          initialData={mangaList.find(m => m.id === editingManga)}
          onClose={() => setEditingManga(null)}
          onSubmit={async (data: Omit<Manga, 'id' | 'createdAt' | 'userId'>) => {
            try {
              const mangaRef = doc(db, 'manga', editingManga);
              const updatedManga = {
                ...mangaList.find(m => m.id === editingManga),
                ...data,
                id: editingManga
              };
              await setDoc(mangaRef, updatedManga);
              setMangaList(prev => prev.map(m => 
                m.id === editingManga ? updatedManga : m
              ));
              setEditingManga(null);
            } catch (error) {
              console.error('Error updating manga:', error);
              alert('Error al actualizar el manga. Por favor, inténtalo de nuevo.');
            }
          }}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">¿Eliminar manga?</h2>
            <p className="text-gray-300 mb-6">
              ¿Estás seguro de que deseas eliminar este manga? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDeleteManga(showDeleteConfirm)}
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
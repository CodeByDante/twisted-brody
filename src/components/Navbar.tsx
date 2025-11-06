import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Search, Menu, Plus, Trash2, X, History, Clock, Trash, ToggleLeft, ToggleRight, Video, ChevronDown, ChevronUp, Settings, Minus, Home, Compass, Library, Upload, Clock3, Star, Bookmark, Tag, Users, FolderOpen, Book, Image as ImageIcon } from 'lucide-react';
import { useStore } from '../lib/store';

interface NavbarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export default function Navbar({ isSidebarOpen, setIsSidebarOpen }: NavbarProps) {
  const [searchParams] = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { settings } = useStore();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-surface px-4 py-3 z-30">
        <div className="w-full max-w-[2000px] mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-surface-light rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5 md:h-6 md:w-6 text-gray-300" />
            </button>
            
            <Link to="/" className="flex items-center space-x-2">
              <Camera className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              <span className="text-lg md:text-xl font-bold text-primary">TwistedBrody</span>
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="md:hidden p-2 hover:bg-surface-light rounded-lg transition-colors"
            >
              <Search className="h-5 w-5 text-gray-300" />
            </button>

            <form onSubmit={handleSearch} className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar videos..."
                className="w-64 rounded-full bg-surface-light py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </form>
          </div>
        </div>

        {isSearchOpen && (
          <div className="md:hidden px-4 py-2 border-t border-gray-700">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar videos..."
                className="w-full rounded-full bg-surface-light py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </form>
          </div>
        )}
      </nav>

      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-surface transform transition-all duration-300 ease-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-bold">Menú</h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 hover:bg-surface-light rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Link
              to="/shorts"
              className="flex items-center gap-2 p-4 hover:bg-surface-light transition-colors border-b border-gray-700"
              onClick={() => setIsSidebarOpen(false)}
            >
              <Video className="h-5 w-5 text-primary" />
              <span className="font-medium">Brody Twis</span>
            </Link>

            <Link
              to="/comicon"
              className="flex items-center gap-2 p-4 hover:bg-surface-light transition-colors border-b border-gray-700"
              onClick={() => setIsSidebarOpen(false)}
            >
              <Book className="h-5 w-5 text-primary" />
              <span className="font-medium">Manga</span>
            </Link>

            <Link
              to="/gallery"
              className="flex items-center gap-2 p-4 hover:bg-surface-light transition-colors border-b border-gray-700"
              onClick={() => setIsSidebarOpen(false)}
            >
              <ImageIcon className="h-5 w-5 text-primary" />
              <span className="font-medium">Gallery</span>
            </Link>

            <div className="p-4 space-y-4">
              <Link
                to="/"
                className="flex items-center gap-2 p-2 hover:bg-surface-light rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Home className="h-5 w-5 text-gray-400" />
                <span>Inicio</span>
              </Link>

              <Link
                to="/categories"
                className="flex items-center gap-2 p-2 hover:bg-surface-light rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Tag className="h-5 w-5 text-gray-400" />
                <span>Categorías</span>
              </Link>

              <Link
                to="/collections"
                className="flex items-center gap-2 p-2 hover:bg-surface-light rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <FolderOpen className="h-5 w-5 text-gray-400" />
                <span>Colecciones</span>
              </Link>

              <Link
                to="/actresses"
                className="flex items-center gap-2 p-2 hover:bg-surface-light rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Users className="h-5 w-5 text-gray-400" />
                <span>Actrices</span>
              </Link>

              <Link
                to="/explore"
                className="flex items-center gap-2 p-2 hover:bg-surface-light rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Compass className="h-5 w-5 text-gray-400" />
                <span>Explorar</span>
              </Link>

              <Link
                to="/library"
                className="flex items-center gap-2 p-2 hover:bg-surface-light rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Library className="h-5 w-5 text-gray-400" />
                <span>Biblioteca</span>
              </Link>

              <Link
                to="/upload"
                className="flex items-center gap-2 p-2 hover:bg-surface-light rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Upload className="h-5 w-5 text-gray-400" />
                <span>Subir</span>
              </Link>

              <Link
                to="/recent"
                className="flex items-center gap-2 p-2 hover:bg-surface-light rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Clock3 className="h-5 w-5 text-gray-400" />
                <span>Recientes</span>
              </Link>

              <Link
                to="/favorites"
                className="flex items-center gap-2 p-2 hover:bg-surface-light rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Star className="h-5 w-5 text-gray-400" />
                <span>Favoritos</span>
              </Link>

              <Link
                to="/saved"
                className="flex items-center gap-2 p-2 hover:bg-surface-light rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Bookmark className="h-5 w-5 text-gray-400" />
                <span>Guardados</span>
              </Link>

              <Link
                to="/settings"
                className="flex items-center gap-2 p-2 hover:bg-surface-light rounded-lg transition-colors"
                onClick={() => setIsSidebarOpen(false)}
              >
                <Settings className="h-5 w-5 text-gray-400" />
                <span>Ajustes</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
}
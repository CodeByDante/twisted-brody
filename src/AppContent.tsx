import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import VideoPage from './pages/VideoPage';
import EditVideoPage from './pages/EditVideoPage';
import ShortsPage from './pages/ShortsPage';
import ExplorePage from './pages/ExplorePage';
import FavoritesPage from './pages/FavoritesPage';
import SavedPage from './pages/SavedPage';
import SettingsPage from './pages/SettingsPage';
import RecentPage from './pages/RecentPage';
import VideoForm from './components/VideoForm';
import AddVideoButton from './components/AddVideoButton';
import LibraryPage from './pages/LibraryPage';
import WatchLaterPage from './pages/WatchLaterPage';
import PlaylistPage from './pages/PlaylistPage';
import CategoriesPage from './pages/CategoriesPage';
import ActressesPage from './pages/ActressesPage';
import CollectionsPage from './pages/CollectionsPage';
import CreatorsPage from './pages/CreatorsPage';
import ComiconPage from './pages/ComiconPage';
import MangaViewerPage from './pages/MangaViewerPage';
import GalleryPage from './pages/GalleryPage';
import GalleryViewerPage from './pages/GalleryViewerPage';
import { useStore } from './lib/store';
import ErrorMessage from './components/ErrorMessage';
import { Loader2 } from 'lucide-react';

export default function AppContent() {
  const { fetchVideos, fetchCategories, fetchHistory, isInitialized } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const loadData = async () => {
      try {
        await Promise.all([
          fetchVideos(),
          fetchCategories(),
          fetchHistory()
        ]);
      } catch (error) {
        setError('Error al cargar los datos. Por favor, recarga la página.');
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [fetchVideos, fetchCategories, fetchHistory, isInitialized]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Conectando con el servidor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className={`transition-transform duration-300 ease-out ${
        isSidebarOpen && !isMobile ? 'md:scale-90 md:origin-right' : ''
      }`}>
        <main className="w-full max-w-[2000px] mx-auto px-4 py-8 mt-16">
          {error && (
            <div className="mb-6">
              <ErrorMessage
                type="error"
                message={error}
                onClose={() => setError(null)}
              />
            </div>
          )}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/video/:id" element={<VideoPage />} />
            <Route path="/video/:id/edit" element={<EditVideoPage />} />
            <Route path="/shorts" element={<ShortsPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/actresses" element={<ActressesPage />} />
            <Route path="/creators" element={<CreatorsPage />} />
            <Route path="/comicon" element={<ComiconPage />} />
            <Route path="/manga/:id" element={<MangaViewerPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/galleries" element={<GalleryPage />} />
            <Route path="/gallery/:id" element={<GalleryViewerPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/recent" element={<RecentPage />} />
            <Route path="/upload" element={<VideoForm onClose={() => {}} standalone />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/watch-later" element={<WatchLaterPage />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <AddVideoButton />
      </div>
    </div>
  );
}
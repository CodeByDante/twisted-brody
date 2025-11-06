import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronUp, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Manga, MangaVersion } from '../types';
import MangaRecommendations from '../components/MangaRecommendations';

export default function MangaReaderPage() {
  const { id } = useParams<{ id: string }>();
  const [manga, setManga] = useState<Manga | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<MangaVersion | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    const loadManga = async () => {
      if (!id) return;
      
      try {
        const docRef = doc(db, 'manga', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setManga(docSnap.data() as Manga);
          const mangaData = docSnap.data() as Manga;
          // Set default version (first one or the one marked as default)
          const defaultVersion = mangaData.versions?.find(v => v.isDefault) || mangaData.versions?.[0];
          setSelectedVersion(defaultVersion || null);
        }
      } catch (error) {
        console.error('Error loading manga:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadManga();
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentPage(prev => prev > 0 ? prev - 1 : prev);
      } else if (e.key === 'ArrowRight') {
        setCurrentPage(prev => selectedVersion && prev < selectedVersion.pages.length - 1 ? prev + 1 : prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVersion]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Cargando manga...</p>
        </div>
      </div>
    );
  }

  if (!manga || !selectedVersion) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-400">Manga no encontrado</h2>
        <Link to="/comicon" className="text-primary hover:underline mt-4 inline-block">
          Volver a la biblioteca
        </Link>
      </div>
    );
  }

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleNextPage = () => {
    if (currentPage < selectedVersion.pages.length - 1) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePageClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 2) {
      handlePrevPage();
    } else {
      handleNextPage();
    }
  };

  return (
    <div className="min-h-screen bg-black relative" onMouseMove={() => setShowControls(true)}>
      <div className={`fixed top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      } z-20`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to={`/manga/${id}`}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">{manga.title}</span>
          </Link>
          <div className="text-white/80">
            Página {currentPage + 1} de {selectedVersion.pages.length}
          </div>
        </div>
      </div>

      {/* Version Selector Overlay */}
      {manga.versions && manga.versions.length > 1 && (
        <div className={`fixed top-20 left-4 right-4 bg-surface/95 backdrop-blur-sm rounded-lg p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } z-20`}>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Versiones: {selectedVersion.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {manga.versions.map((version) => (
              <button
                key={version.id}
                onClick={() => {
                  setSelectedVersion(version);
                  setCurrentPage(0);
                  window.scrollTo(0, 0);
                }}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  selectedVersion?.id === version.id
                    ? 'bg-primary text-white'
                    : 'bg-surface-light text-gray-300 hover:bg-surface hover:text-white'
                }`}
              >
                {version.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="max-w-4xl mx-auto px-4 cursor-pointer select-none"
        onClick={handlePageClick}
      >
        <img
          src={selectedVersion.pages[currentPage]}
          alt={`Page ${currentPage + 1}`}
          className="w-full h-auto"
        />
      </div>

      {currentPage === selectedVersion.pages.length - 1 && manga.categoryIds && manga.categoryIds.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-12 bg-background/95 backdrop-blur-sm">
          <MangaRecommendations
            currentMangaId={id!}
            categoryIds={manga.categoryIds}
            title="Recomendaciones"
          />
        </div>
      )}

      <div className={`fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      } z-20`}>
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <div className="flex-1 max-w-xs">
            <input
              type="range"
              min={0}
              max={selectedVersion.pages.length - 1}
              value={currentPage}
              onChange={(e) => {
                setCurrentPage(parseInt(e.target.value));
                window.scrollTo(0, 0);
              }}
              className="w-full"
            />
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage === selectedVersion.pages.length - 1}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-8 right-8 p-4 bg-primary rounded-full shadow-lg hover:bg-primary/90 transition-all ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        } z-20`}
      >
        <ChevronUp className="h-6 w-6" />
      </button>
    </div>
  );
}
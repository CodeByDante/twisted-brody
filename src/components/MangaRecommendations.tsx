import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sparkles } from 'lucide-react';
import type { Manga } from '../types';
import ImageLoader from './ImageLoader';

interface MangaRecommendationsProps {
  currentMangaId: string;
  categoryIds: string[];
  title?: string;
}

export default function MangaRecommendations({
  currentMangaId,
  categoryIds,
  title = "Recomendaciones"
}: MangaRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Manga[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!categoryIds || categoryIds.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const mangaQuery = query(collection(db, 'manga'));
        const snapshot = await getDocs(mangaQuery);

        const allMangas = snapshot.docs
          .map(doc => ({ ...doc.data(), id: doc.id } as Manga))
          .filter(manga => manga.id !== currentMangaId);

        const relatedMangas = allMangas.filter(manga => {
          if (!manga.categoryIds || manga.categoryIds.length === 0) return false;
          return manga.categoryIds.some(catId => categoryIds.includes(catId));
        });

        const sortedMangas = relatedMangas.sort((a, b) =>
          a.title.localeCompare(b.title)
        );

        setRecommendations(sortedMangas.slice(0, 12));
      } catch (error) {
        console.error('Error loading recommendations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendations();
  }, [currentMangaId, categoryIds]);

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="py-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {recommendations.map((manga) => (
          <Link
            key={manga.id}
            to={`/manga/${manga.id}`}
            className="group relative aspect-[2/3] bg-surface rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all transform hover:scale-105"
          >
            <ImageLoader
              src={manga.coverImage}
              alt={manga.title}
              aspectRatio="aspect-[2/3]"
              className="transition-transform duration-300 group-hover:scale-110"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="font-semibold text-sm line-clamp-2 text-white">
                  {manga.title}
                </h3>
                {manga.theme && (
                  <p className="text-xs text-gray-300 line-clamp-1 mt-1">
                    {manga.theme}
                  </p>
                )}
              </div>
            </div>

            <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs font-medium">
              {manga.versions?.[0]?.pages?.length || 0} págs
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

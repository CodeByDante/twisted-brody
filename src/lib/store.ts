import { create } from 'zustand';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  getDocs,
  query,
  orderBy,
  where,
  writeBatch,
  getDoc,
  setDoc,
  limit,
  onSnapshot,
  increment,
  Firestore
} from 'firebase/firestore';
import { getFirebaseInstances } from './firebase';
import type { Video, Category, User, Playlist, Settings } from '../types';

interface Store {
  isInitialized: boolean;
  db: Firestore | null;
  videos: Video[];
  categories: Category[];
  user: User | null;
  videoHistory: Video[];
  playlists: Playlist[];
  watchLater: string[];
  favorites: string[];
  saved: string[];
  gridColumns: number;
  settings: Settings;
  initialize: () => Promise<void>;
  setSettings: (settings: Partial<Settings>) => Promise<void>;
  setGridColumns: (columns: number) => void;
  setVideos: (videos: Video[]) => void;
  setCategories: (categories: Category[]) => void;
  setUser: (user: User | null) => void;
  addVideo: (video: Video) => Promise<void>;
  removeVideo: (id: string) => Promise<void>;
  addCategory: (category: Category) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  getVideoCategories: () => Category[];
  getMangaCategories: () => Category[];
  getGalleryCategories: () => Category[];
  fetchVideos: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  updateVideo: (id: string, data: Partial<Video>) => Promise<void>;
  addToHistory: (video: Video) => Promise<void>;
  clearHistory: () => Promise<void>;
  getVideo: (id: string) => Promise<Video | null>;
  toggleFavorite: (videoId: string) => Promise<void>;
  toggleSaved: (videoId: string) => Promise<void>;
  toggleWatchLater: (videoId: string) => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<void>;
  updatePlaylist: (id: string, data: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (playlistId: string, videoId: string) => Promise<void>;
  removeFromPlaylist: (playlistId: string, videoId: string) => Promise<void>;
}

export const useStore = create<Store>((set, get) => {
  const userId = 'temp-user';
  const savedSettings = localStorage.getItem('settings');
  const initialSettings: Settings = savedSettings ? 
    JSON.parse(savedSettings) : 
    { 
      showHiddenVideos: false, 
      showHiddenInShorts: false,
      showAddButton: false,
      mangaCarouselMode: false
    };

  return {
    isInitialized: false,
    db: null,
    videos: [],
    categories: [],
    user: null,
    videoHistory: [],
    playlists: [],
    watchLater: [],
    favorites: [],
    saved: [],
    gridColumns: 4,
    settings: initialSettings,

    initialize: async () => {
      try {
        const { db } = await getFirebaseInstances();
        
        // Set up listeners only after Firebase is initialized
        const userDataRef = doc(db, 'userData', userId);
        onSnapshot(userDataRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            set({
              favorites: data.favorites || [],
              watchLater: data.watchLater || [],
              saved: data.saved || []
            });
          }
        });

        const playlistsQuery = query(
          collection(db, 'playlists'),
          where('userId', '==', userId)
        );

        onSnapshot(playlistsQuery, (snapshot) => {
          const playlists = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
          })) as Playlist[];
          set({ playlists });
        });

        set({ db, isInitialized: true });
      } catch (error) {
        console.error('Failed to initialize store:', error);
        throw error;
      }
    },

    setSettings: async (newSettings: Partial<Settings>) => {
      const updatedSettings = {
        ...get().settings,
        ...newSettings
      };
      localStorage.setItem('settings', JSON.stringify(updatedSettings));
      set({ settings: updatedSettings });
    },

    setGridColumns: (columns) => set({ gridColumns: columns }),
    setVideos: (videos) => set({ videos }),
    setCategories: (categories) => set({ categories }),
    setUser: (user) => set({ user }),
    
    fetchVideos: async () => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const videos = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          categoryIds: doc.data().categoryIds || [doc.data().categoryId].filter(Boolean),
          views: doc.data().views || 0,
          isHidden: doc.data().isHidden || false,
          servers: doc.data().servers || []
        })) as Video[];
        set({ videos });
      } catch (error) {
        console.error('Error fetching videos:', error);
      }
    },

    getVideo: async (id: string) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return null;

      try {
        const localVideo = get().videos.find(v => v.id === id);
        if (localVideo) return localVideo;

        const videoDoc = await getDoc(doc(db, 'videos', id));
        if (videoDoc.exists()) {
          const video = {
            ...videoDoc.data(),
            id: videoDoc.id,
            categoryIds: videoDoc.data().categoryIds || [videoDoc.data().categoryId].filter(Boolean),
            views: videoDoc.data().views || 0,
            isHidden: videoDoc.data().isHidden || false,
            servers: videoDoc.data().servers || []
          } as Video;
          
          set(state => ({
            videos: [...state.videos, video]
          }));
          
          return video;
        }
        return null;
      } catch (error) {
        console.error('Error fetching video:', error);
        return null;
      }
    },

    incrementViews: async (videoId: string) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const videoRef = doc(db, 'videos', videoId);
        await updateDoc(videoRef, {
          views: increment(1)
        });

        set(state => ({
          videos: state.videos.map(video => 
            video.id === videoId 
              ? { ...video, views: (video.views || 0) + 1 }
              : video
          )
        }));
      } catch (error) {
        console.error('Error incrementing views:', error);
      }
    },

    fetchCategories: async () => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const q = query(collection(db, 'categories'), orderBy('name'));
        const snapshot = await getDocs(q);
        const categories = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as Category[];
        set({ categories });
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    },

    fetchHistory: async () => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const q = query(
          collection(db, 'history'),
          orderBy('viewedAt', 'desc'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const historyIds = snapshot.docs.map(doc => doc.data().videoId);
        
        const historyVideos = get().videos.filter(video => 
          historyIds.includes(video.id)
        );
        
        set({ videoHistory: historyVideos });
      } catch (error) {
        console.error('Error fetching history:', error);
      }
    },

    addVideo: async (video) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const videoRef = doc(db, 'videos', video.id);
        await setDoc(videoRef, { 
          ...video, 
          views: 0, 
          isHidden: video.isHidden || false,
          servers: video.servers || []
        });
        set(state => ({ videos: [video, ...state.videos] }));
      } catch (error) {
        console.error('Error adding video:', error);
        throw error;
      }
    },

    removeVideo: async (id) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const batch = writeBatch(db);
        
        const videoRef = doc(db, 'videos', id);
        batch.delete(videoRef);
        
        const historyQuery = query(
          collection(db, 'history'),
          where('videoId', '==', id)
        );
        const historySnapshot = await getDocs(historyQuery);
        historySnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        set(state => ({
          videos: state.videos.filter(v => v.id !== id),
          videoHistory: state.videoHistory.filter(v => v.id !== id),
          favorites: state.favorites.filter(videoId => videoId !== id),
          saved: state.saved.filter(videoId => videoId !== id),
          watchLater: state.watchLater.filter(videoId => videoId !== id),
          playlists: state.playlists.map(playlist => ({
            ...playlist,
            videoIds: playlist.videoIds.filter(videoId => videoId !== id)
          }))
        }));
      } catch (error) {
        console.error('Error removing video:', error);
        throw error;
      }
    },

    addCategory: async (category) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const categoryRef = doc(db, 'categories', category.id);
        await setDoc(categoryRef, category);
        set(state => ({
          categories: [...state.categories, category]
        }));
      } catch (error) {
        console.error('Error adding category:', error);
        throw error;
      }
    },

    removeCategory: async (id) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const batch = writeBatch(db);
        
        const categoryRef = doc(db, 'categories', id);
        const category = get().categories.find(c => c.id === id);
        
        if (category?.type === 'video') {
          const videosQuery = query(collection(db, 'videos'), where('categoryIds', 'array-contains', id));
          const videoSnapshot = await getDocs(videosQuery);
          
          videoSnapshot.docs.forEach(videoDoc => {
            const videoRef = doc(db, 'videos', videoDoc.id);
            const video = videoDoc.data();
            batch.update(videoRef, { 
              categoryIds: video.categoryIds.filter((catId: string) => catId !== id)
            });
          });
        } else if (category?.type === 'manga') {
          // Handle manga category removal if needed
          // This would require updating manga documents that use this category
        }
        
        batch.delete(categoryRef);
        
        await batch.commit();
        
        set(state => ({
          categories: state.categories.filter(c => c.id !== id),
          videos: state.videos.map(video => ({
            ...video,
            categoryIds: video.categoryIds.filter(catId => catId !== id)
          }))
        }));
      } catch (error) {
        console.error('Error removing category:', error);
        throw error;
      }
    },

    getVideoCategories: () => {
      return get().categories.filter(category => category.type === 'video');
    },

    getMangaCategories: () => {
      return get().categories.filter(category => category.type === 'manga');
    },
    
    getGalleryCategories: () => {
      return get().categories.filter(category => category.type === 'gallery');
    },

    updateVideo: async (id: string, data: Partial<Video>) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const videoRef = doc(db, 'videos', id);
        const cleanData = Object.fromEntries(
          Object.entries(data).filter(([_, value]) => value !== undefined)
        );
        
        await updateDoc(videoRef, {
          ...cleanData,
          servers: data.servers || []
        });
        
        set(state => {
          const updatedVideos = state.videos.map(v => 
            v.id === id ? { ...v, ...cleanData } : v
          );
          
          const updatedHistory = state.videoHistory.map(v =>
            v.id === id ? { ...v, ...cleanData } : v
          );
          
          return {
            videos: updatedVideos,
            videoHistory: updatedHistory
          };
        });
      } catch (error) {
        console.error('Error updating video:', error);
        throw error;
      }
    },

    addToHistory: async (video) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const historyRef = doc(collection(db, 'history'));
        await setDoc(historyRef, {
          videoId: video.id,
          viewedAt: new Date().toISOString()
        });

        set(state => {
          const existingHistory = state.videoHistory.filter(v => v.id !== video.id);
          return {
            videoHistory: [video, ...existingHistory].slice(0, 10)
          };
        });
      } catch (error) {
        console.error('Error adding to history:', error);
      }
    },

    clearHistory: async () => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const historyQuery = query(collection(db, 'history'));
        const snapshot = await getDocs(historyQuery);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        set({ videoHistory: [] });
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    },

    toggleFavorite: async (videoId: string) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const userDataRef = doc(db, 'userData', userId);
        const favorites = get().favorites;
        const isFavorite = favorites.includes(videoId);
        const newFavorites = isFavorite
          ? favorites.filter(id => id !== videoId)
          : [...favorites, videoId];

        await setDoc(userDataRef, { favorites: newFavorites }, { merge: true });
      } catch (error) {
        console.error('Error toggling favorite:', error);
      }
    },

    toggleSaved: async (videoId: string) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const userDataRef = doc(db, 'userData', userId);
        const saved = get().saved;
        const isSaved = saved.includes(videoId);
        const newSaved = isSaved
          ? saved.filter(id => id !== videoId)
          : [...saved, videoId];

        await setDoc(userDataRef, { saved: newSaved }, { merge: true });
      } catch (error) {
        console.error('Error toggling saved:', error);
      }
    },

    toggleWatchLater: async (videoId: string) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const userDataRef = doc(db, 'userData', userId);
        const watchLater = get().watchLater;
        const isWatchLater = watchLater.includes(videoId);
        const newWatchLater = isWatchLater
          ? watchLater.filter(id => id !== videoId)
          : [...watchLater, videoId];

        await setDoc(userDataRef, { watchLater: newWatchLater }, { merge: true });
      } catch (error) {
        console.error('Error toggling watch later:', error);
      }
    },

    createPlaylist: async (name: string, description?: string) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const playlist: Playlist = {
          id: crypto.randomUUID(),
          name,
          description,
          videoIds: [],
          userId,
          createdAt: new Date().toISOString()
        };

        const playlistRef = doc(db, 'playlists', playlist.id);
        await setDoc(playlistRef, playlist);
      } catch (error) {
        console.error('Error creating playlist:', error);
      }
    },

    updatePlaylist: async (id: string, data: Partial<Playlist>) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const playlistRef = doc(db, 'playlists', id);
        await updateDoc(playlistRef, data);
      } catch (error) {
        console.error('Error updating playlist:', error);
      }
    },

    deletePlaylist: async (id: string) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const playlistRef = doc(db, 'playlists', id);
        await deleteDoc(playlistRef);
      } catch (error) {
        console.error('Error deleting playlist:', error);
      }
    },

    addToPlaylist: async (playlistId: string, videoId: string) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const playlist = get().playlists.find(p => p.id === playlistId);
        if (playlist && !playlist.videoIds.includes(videoId)) {
          const playlistRef = doc(db, 'playlists', playlistId);
          await updateDoc(playlistRef, {
            videoIds: [...playlist.videoIds, videoId]
          });
        }
      } catch (error) {
        console.error('Error adding to playlist:', error);
      }
    },

    removeFromPlaylist: async (playlistId: string, videoId: string) => {
      const { db, isInitialized } = get();
      if (!db || !isInitialized) return;

      try {
        const playlist = get().playlists.find(p => p.id === playlistId);
        if (playlist) {
          const playlistRef = doc(db, 'playlists', playlistId);
          await updateDoc(playlistRef, {
            videoIds: playlist.videoIds.filter(id => id !== videoId)
          });
        }
      } catch (error) {
        console.error('Error removing from playlist:', error);
      }
    }
  };
});
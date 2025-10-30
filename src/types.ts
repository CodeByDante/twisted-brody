export interface VideoServer {
  url: string;
  name: string;
}

export interface Video {
  id: string;
  title: string;
  description?: string;
  url: string;
  servers?: VideoServer[];
  thumbnailUrl?: string;
  customThumbnailUrl?: string;
  hashtags: string[];
  categoryIds: string[];
  userId: string;
  createdAt: string;
  isShort?: boolean;
  actors?: string[];
  mangas?: string[];
  creators?: string[];
  galleryImages?: string[];
  isFavorite?: boolean;
  isSaved?: boolean;
  views: number;
  isHidden?: boolean;
  linkedVideos?: string[];
}

export interface Category {
  id: string;
  name: string;
  userId: string;
  type: 'video' | 'manga' | 'gallery';
}

export interface User {
  id: string;
  email: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  videoIds: string[];
  userId: string;
  createdAt: string;
}

export interface Settings {
  showHiddenVideos: boolean;
  showHiddenInShorts: boolean;
  showAddButton: boolean;
  mangaCarouselMode: boolean;
  galleryName: string;
}

export type VideoProvider = 
  | 'youtube'
  | 'vimeo'
  | 'xvideos'
  | 'pornhub'
  | 'gdrive'
  | 'dropbox'
  | 'terabox'
  | 'telegram'
  | 'catbox';

export interface Manga {
  id: string;
  title: string;
 theme?: string;
  description?: string;
  author?: string;
  genre?: string;
  status?: 'ongoing' | 'completed' | 'hiatus';
  releaseYear?: string;
  coverImage: string;
  versions: MangaVersion[];
  createdAt: string;
  userId: string;
  categoryIds?: string[];
}

export interface MangaVersion {
  id: string;
  name: string;
  pages: string[];
  isDefault?: boolean;
}

export interface Gallery {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  images: string[];
  createdAt: string;
  userId: string;
  categoryIds?: string[];
}
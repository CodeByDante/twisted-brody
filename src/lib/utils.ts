import type { VideoProvider } from '../types';
import { API_CONFIG } from './config';

// Cache para almacenar las miniaturas generadas
const thumbnailCache = new Map<string, string>();

// Cache específico para miniaturas de Vimeo
const vimeoThumbnailCache = new Map<string, string>();

// Default thumbnail for failed video loads
const DEFAULT_THUMBNAIL = 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1920&auto=format&fit=crop&q=100&ixlib=rb-4.0.3';

// Error messages
export const ERROR_MESSAGES = {
  UPLOAD_FAILED: 'Error al subir el archivo. Por favor, inténtalo de nuevo.',
  VIDEO_LOAD_FAILED: 'Error al cargar el video. Por favor, verifica la URL.',
  THUMBNAIL_GENERATION_FAILED: 'No se pudo generar la miniatura.',
  INVALID_URL: 'La URL del video no es válida.',
  UNSUPPORTED_PROVIDER: 'Proveedor de video no soportado.',
  NETWORK_ERROR: 'Error de conexión. Por favor, verifica tu conexión a internet.',
  PERMISSION_DENIED: 'No tienes permisos para realizar esta acción.',
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.'
};

// Función para comprimir imágenes y reducir uso de memoria
export async function compressImage(
  file: File,
  maxWidth: number = 2000,
  maxHeight: number = 3000,
  quality: number = 0.85,
  maxSizeMB: number = 2
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Si el archivo es muy pequeño, no comprimir
    if (file.size <= maxSizeMB * 1024 * 1024) {
      resolve(file);
      return;
    }

    // Usar FileReader para leer el archivo de forma eficiente
    const reader = new FileReader();
    
    reader.onload = (e) => {
      // Crear imagen fuera del DOM para no afectar el renderizado
      const img = new Image();
      
      // Limpiar referencias cuando termine
      const cleanup = () => {
        img.src = '';
        // No es necesario revocar data URLs, se limpian automáticamente
      };

      img.onload = () => {
        try {
          // Calcular nuevas dimensiones manteniendo aspect ratio
          let width = img.width;
          let height = img.height;

          // Solo redimensionar si es necesario
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Crear canvas con dimensiones optimizadas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { 
            alpha: false,
            willReadFrequently: false // Optimizar para escritura
          });
          
          if (!ctx) {
            cleanup();
            reject(new Error('No se pudo obtener el contexto del canvas'));
            return;
          }

          // Optimizar renderizado
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Dibujar imagen de forma eficiente
          ctx.drawImage(img, 0, 0, width, height);

          // Guardar dimensiones antes de liberar
          const imgWidth = width;
          const imgHeight = height;

          // Convertir a blob con compresión
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                cleanup();
                reject(new Error('Error al comprimir la imagen'));
                return;
              }

              // Si después de comprimir sigue siendo muy grande, reducir calidad progresivamente
              if (blob.size > maxSizeMB * 1024 * 1024) {
                // Intentar con menor calidad - redibujar desde la imagen original
                const reducedQuality = Math.max(0.5, quality * 0.7);
                const ctx2 = canvas.getContext('2d', { alpha: false });
                if (ctx2) {
                  // Limpiar canvas y redibujar
                  ctx2.clearRect(0, 0, canvas.width, canvas.height);
                  ctx2.drawImage(img, 0, 0, imgWidth, imgHeight);
                  
                  canvas.toBlob(
                    (smallerBlob) => {
                      // Limpiar recursos
                      canvas.width = 0;
                      canvas.height = 0;
                      cleanup();
                      resolve(new File([smallerBlob || blob], file.name, { type: 'image/jpeg' }));
                    },
                    'image/jpeg',
                    reducedQuality
                  );
                } else {
                  // Limpiar recursos
                  canvas.width = 0;
                  canvas.height = 0;
                  cleanup();
                  resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                }
              } else {
                // Limpiar recursos
                canvas.width = 0;
                canvas.height = 0;
                cleanup();
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
              }
            },
            'image/jpeg',
            quality
          );
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      img.onerror = () => {
        cleanup();
        reject(new Error('Error al cargar la imagen'));
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        cleanup();
        reject(new Error('Error al leer el archivo'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    // Leer como ArrayBuffer para mejor rendimiento en archivos grandes
    reader.readAsDataURL(file);
  });
}

// Función para subir imagen a ImgBB
export async function uploadToImgBB(file: File): Promise<string | null> {
  try {
    if (!file) {
      throw new Error('No se ha seleccionado ningún archivo');
    }
    // Comprimir imagen antes de subir si es necesario
    let fileToUpload = file;
    if (file.size > 1024 * 1024) { // Si es mayor a 1MB, comprimir
      try {
        fileToUpload = await compressImage(file, 2000, 3000, 0.85, 2);
      } catch (error) {
        console.warn('Error al comprimir imagen, subiendo original:', error);
        // Si falla la compresión, intentar subir el original
      }
    }

    if (fileToUpload.size > API_CONFIG.IMGBB.MAX_FILE_SIZE) {
      throw new Error(`El archivo es demasiado grande. Máximo ${API_CONFIG.IMGBB.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    const formData = new FormData();
    formData.append('image', fileToUpload);
    formData.append('key', API_CONFIG.IMGBB.API_KEY);

    const response = await fetch(API_CONFIG.IMGBB.BASE_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.data?.url) {
      throw new Error('No se recibió la URL de la imagen');
    }

    return data.data.url;
  } catch (error) {
    console.error('Error uploading to ImgBB:', error);
    throw new Error(
      error instanceof Error ? error.message : ERROR_MESSAGES.UPLOAD_FAILED
    );
  }
}

// Función para subir imágenes por lotes (batch upload)
export async function uploadImagesInBatches(
  files: File[],
  batchSize: number = 3,
  onProgress?: (index: number, progress: number, status: 'uploading' | 'completed' | 'error') => void
): Promise<(string | null)[]> {
  const results: (string | null)[] = new Array(files.length).fill(null);

  // Procesar en lotes para no sobrecargar la memoria
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchPromises = batch.map(async (file, batchIndex) => {
      const globalIndex = i + batchIndex;
      try {
        onProgress?.(globalIndex, 0, 'uploading');
        const url = await uploadToImgBB(file);
        onProgress?.(globalIndex, 100, 'completed');
        return url;
      } catch (error) {
        console.error(`Error uploading file ${globalIndex}:`, error);
        onProgress?.(globalIndex, 0, 'error');
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach((result, batchIndex) => {
      results[i + batchIndex] = result;
    });

    // Pequeña pausa entre lotes para dar tiempo al GC
    if (i + batchSize < files.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

// Función para formatear descripciones con listas
export function formatDescription(text: string | undefined): string {
  if (!text?.trim()) return '';

  try {
    // Dividir el texto en líneas
    const lines = text.split('\n');
    
    // Procesar cada línea
    const formattedLines = lines.map(line => {
      // Detectar diferentes tipos de viñetas
      const bulletMatch = line.match(/^[-●>•∙⋅⚫⬤◆◇◈○◎●◐◑◒◓◔◕⚪⚫]+\s*/);
      
      if (bulletMatch) {
        // Estandarizar la viñeta y aplicar sangría
        return line.replace(bulletMatch[0], '• ').trim();
      }
      
      return line;
    });

    return formattedLines.join('\n');
  } catch (error) {
    console.error('Error formatting description:', error);
    return text || '';
  }
}

// Función para precargar miniaturas
export async function preloadThumbnails(videos: { url: string, customThumbnailUrl?: string }[]) {
  const promises = videos.map(async ({ url, customThumbnailUrl }) => {
    try {
      if (customThumbnailUrl) {
        const img = new Image();
        img.src = customThumbnailUrl;
        try {
          await img.decode();
        } catch (error) {
          console.warn(`Failed to decode custom thumbnail for ${url}:`, error);
          customThumbnailUrl = undefined;
        }
        return;
      }

      const provider = getVideoProvider(url);
      if (!provider) return;

      // Si ya está en caché, no hacer nada
      if (thumbnailCache.has(url)) {
        return;
      }

      // Para YouTube y Google Drive, precargar la imagen
      if (provider === 'youtube' || provider === 'gdrive') {
        const thumbnail = getVideoThumbnail(url);
        if (thumbnail) {
          const img = new Image();
          img.src = thumbnail;
          try {
            await img.decode();
            thumbnailCache.set(url, thumbnail);
          } catch (error) {
            console.warn(`Failed to decode thumbnail for ${url}:`, error);
            thumbnailCache.set(url, DEFAULT_THUMBNAIL);
          }
        }
      }
      // Para Vimeo, obtener y cachear la miniatura
      else if (provider === 'vimeo') {
        try {
          const thumbnail = await getVimeoThumbnail(url);
          if (thumbnail) {
            const img = new Image();
            img.src = thumbnail;
            await img.decode();
            thumbnailCache.set(url, thumbnail);
          }
        } catch (error) {
          console.warn(`Failed to get or decode Vimeo thumbnail for ${url}:`, error);
          thumbnailCache.set(url, DEFAULT_THUMBNAIL);
        }
      }
    } catch (error) {
      console.warn('Error preloading thumbnail:', error);
      thumbnailCache.set(url, DEFAULT_THUMBNAIL);
    }
  });

  await Promise.allSettled(promises);
}

async function getVimeoThumbnail(url: string): Promise<string | null> {
  try {
    const cachedThumbnail = vimeoThumbnailCache.get(url);
    if (cachedThumbnail) {
      return cachedThumbnail;
    }

    const match = url.match(/vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
    if (!match) {
      throw new Error('Invalid Vimeo URL');
    }

    const videoId = match[1];
    const hash = match[2]; // Hash for private videos
    
    let thumbnail: string | null = null;
    
    // For private videos use oEmbed
    if (hash) {
      const apiUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}/${hash}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      thumbnail = data.thumbnail_url;
    } else {
      // For public videos use the API v2
      const response = await fetch(`https://vimeo.com/api/v2/video/${videoId}.json`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      thumbnail = data[0]?.thumbnail_large;
    }
    
    if (thumbnail) {
      // Ensure maximum quality
      thumbnail = thumbnail.replace('_640', '_1920');
      
      // Cache the thumbnail
      vimeoThumbnailCache.set(url, thumbnail);
      return thumbnail;
    }
    
    throw new Error('No thumbnail found');
  } catch (error) {
    console.error('Error fetching Vimeo thumbnail:', error);
    return null;
  }
}

export async function generateVideoThumbnail(videoUrl: string, provider: VideoProvider): Promise<string> {
  // Check cache first
  const cachedThumbnail = thumbnailCache.get(videoUrl);
  if (cachedThumbnail) {
    return cachedThumbnail;
  }

  // For Dropbox videos, try to generate a thumbnail from the video
  if (provider === 'dropbox' || provider === 'catbox') {
    try {
      let finalUrl = videoUrl;
      
      if (provider === 'dropbox') {
        const directUrl = videoUrl
          .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
          .replace('?dl=0', '')
          .replace('?dl=1', '')
          .split('&')[0];

        const urlObj = new URL(directUrl);
        const rlkey = urlObj.searchParams.get('rlkey');
        finalUrl = `${urlObj.origin}${urlObj.pathname}${rlkey ? `?rlkey=${rlkey}&raw=1` : '?raw=1'}`;
      }

      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.style.display = 'none';
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      document.body.appendChild(video);

      const thumbnailPromise = new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          console.warn('Video metadata timeout');
          resolve(DEFAULT_THUMBNAIL);
        }, 30000);

        const cleanup = () => {
          clearTimeout(timeout);
          if (document.body.contains(video)) {
            document.body.removeChild(video);
          }
          video.removeAttribute('src');
          video.load();
        };

        video.onerror = () => {
          cleanup();
          console.warn('Error loading video');
          resolve(DEFAULT_THUMBNAIL);
        };

        video.onloadedmetadata = async () => {
          try {
            video.currentTime = 1;
            await new Promise<void>((seekResolve) => {
              video.onseeked = () => seekResolve();
            });

            const canvas = document.createElement('canvas');
            const maxWidth = window.innerWidth <= 768 ? 480 : 960;
            const scale = Math.min(1, maxWidth / video.videoWidth);
            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;

            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) {
              throw new Error('Could not get canvas context');
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);

            cleanup();
            resolve(thumbnailUrl);
          } catch (error) {
            cleanup();
            console.warn('Error generating thumbnail:', error);
            resolve(DEFAULT_THUMBNAIL);
          }
        };
      });

      video.src = finalUrl;
      const thumbnail = await thumbnailPromise;
      thumbnailCache.set(videoUrl, thumbnail);
      return thumbnail;
    } catch (error) {
      console.warn('Error generating thumbnail:', error);
      thumbnailCache.set(videoUrl, DEFAULT_THUMBNAIL);
      return DEFAULT_THUMBNAIL;
    }
  }

  // For Vimeo videos, try to get the thumbnail through the API
  if (provider === 'vimeo') {
    try {
      const thumbnail = await getVimeoThumbnail(videoUrl);
      if (thumbnail) {
        thumbnailCache.set(videoUrl, thumbnail);
        return thumbnail;
      }
      throw new Error('No Vimeo thumbnail found');
    } catch (error) {
      console.warn('Error getting Vimeo thumbnail:', error);
      thumbnailCache.set(videoUrl, DEFAULT_THUMBNAIL);
      return DEFAULT_THUMBNAIL;
    }
  }

  // For other providers, use the default thumbnail generation
  const thumbnail = getVideoThumbnail(videoUrl);
  if (thumbnail) {
    thumbnailCache.set(videoUrl, thumbnail);
    return thumbnail;
  }

  return DEFAULT_THUMBNAIL;
}

export function getVideoProvider(url: string): VideoProvider | null {
  if (!url) {
    console.warn('Empty URL provided to getVideoProvider');
    return null;
  }

  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      return 'youtube';
    }
    if (urlObj.hostname.includes('vimeo.com')) {
      return 'vimeo';
    }
    if (urlObj.hostname.includes('xvideos.com')) {
      return 'xvideos';
    }
    if (urlObj.hostname.includes('pornhub.com')) {
      return 'pornhub';
    }
    if (urlObj.hostname.includes('drive.google.com')) {
      return 'gdrive';
    }
    if (urlObj.hostname.includes('dropbox.com')) {
      return 'dropbox';
    }
    if (urlObj.hostname.includes('terabox.com')) {
      return 'terabox';
    }
    if (urlObj.hostname.includes('t.me')) {
      return 'telegram';
    }
    if (urlObj.hostname.includes('catbox.moe')) {
      return 'catbox';
    }
    
    console.warn('Unsupported video provider for URL:', url);
    return null;
  } catch (error) {
    console.warn('Invalid URL provided to getVideoProvider:', url);
    return null;
  }
}

export function getVideoEmbedUrl(url: string): { provider: VideoProvider; embedUrl: string } | null {
  try {
    if (!url) {
      throw new Error('URL is empty');
    }

    const urlObj = new URL(url);
    
    // YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId = '';
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.searchParams.has('v')) {
        videoId = urlObj.searchParams.get('v') || '';
      } else {
        videoId = urlObj.pathname.split('/').pop() || '';
      }
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }
      return {
        provider: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${videoId}`
      };
    }

    // Vimeo
    if (urlObj.hostname.includes('vimeo.com')) {
      const match = url.match(/vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/);
      if (!match) {
        throw new Error('Invalid Vimeo URL');
      }
      const videoId = match[1];
      const hash = match[2];
      return {
        provider: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${videoId}${hash ? `/${hash}` : ''}?h=${hash || ''}&badge=0&autopause=0&player_id=0&app_id=58479&autoplay=0&muted=0&controls=1&loop=0&title=0&byline=0&portrait=0&background=0&transparent=0`
      };
    }

    // XVideos
    if (urlObj.hostname.includes('xvideos.com')) {
      const videoIdMatch = urlObj.pathname.match(/video[._]([^/]+)/);
      if (!videoIdMatch?.[1]) {
        throw new Error('Invalid XVideos URL');
      }
      const videoId = videoIdMatch[1].split('/')[0];
      return {
        provider: 'xvideos',
        embedUrl: `https://www.xvideos.com/embedframe/${videoId}`
      };
    }

    // PornHub
    if (urlObj.hostname.includes('pornhub.com')) {
      const viewkey = urlObj.searchParams.get('viewkey');
      if (!viewkey) {
        throw new Error('Invalid PornHub URL');
      }
      return {
        provider: 'pornhub',
        embedUrl: `https://www.pornhub.com/embed/${viewkey}`
      };
    }

    // Google Drive
    if (urlObj.hostname.includes('drive.google.com')) {
      const match = url.match(/\/d\/([^/]+)/);
      if (!match?.[1]) {
        throw new Error('Invalid Google Drive URL');
      }
      return {
        provider: 'gdrive',
        embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`
      };
    }

    // Dropbox
    if (urlObj.hostname.includes('dropbox.com')) {
      const directUrl = url
        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
        .replace('?dl=0', '')
        .replace('?dl=1', '')
        .split('&')[0];

      const urlObj = new URL(directUrl);
      const rlkey = urlObj.searchParams.get('rlkey');
      const finalUrl = `${urlObj.origin}${urlObj.pathname}${rlkey ? `?rlkey=${rlkey}&raw=1` : '?raw=1'}`;

      return {
        provider: 'dropbox',
        embedUrl: finalUrl
      };
    }

    // TeraBox
    if (urlObj.hostname.includes('terabox.com')) {
      return {
        provider: 'terabox',
        embedUrl: url
      };
    }

    // Telegram
    if (urlObj.hostname.includes('t.me')) {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length < 2) {
        throw new Error('Invalid Telegram URL');
      }
      const channel = parts[0];
      const messageId = parts[1];
      return {
        provider: 'telegram',
        embedUrl: `https://t.me/${channel}/${messageId}`
      };
    }

    // Catbox
    if (urlObj.hostname.includes('catbox.moe')) {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      return {
        provider: 'catbox',
        embedUrl: proxyUrl
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing video URL:', error);
    return null;
  }
}

export function getVideoThumbnail(url: string): string | null {
  try {
    if (!url) {
      return null;
    }

    const urlObj = new URL(url);
    
    // YouTube - Usar la versión maxresdefault para máxima calidad
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId = '';
      if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.searchParams.has('v')) {
        videoId = urlObj.searchParams.get('v') || '';
      }
      if (!videoId) {
        throw new Error('Invalid YouTube video ID');
      }
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    // Vimeo - intentar obtener del cache primero
    if (urlObj.hostname.includes('vimeo.com')) {
      const cachedThumbnail = vimeoThumbnailCache.get(url);
      if (cachedThumbnail) {
        return cachedThumbnail;
      }
      return null;
    }

    // Google Drive - Usar el tamaño máximo disponible
    if (urlObj.hostname.includes('drive.google.com')) {
      const match = url.match(/\/d\/([^/]+)/);
      if (!match?.[1]) {
        throw new Error('Invalid Google Drive file ID');
      }
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w2000`;
    }

    // PornHub - Extraer la miniatura de la URL del video
    if (urlObj.hostname.includes('pornhub.com')) {
      const viewkey = urlObj.searchParams.get('viewkey');
      if (!viewkey) {
        throw new Error('Invalid PornHub viewkey');
      }
      return `https://di.phncdn.com/videos/${viewkey}/(m=eaAaGwObaaaa)(mh=xc_qR95oUCHcYYrV)16.jpg`;
    }

    // XVideos - Extraer la miniatura usando el ID del video
    if (urlObj.hostname.includes('xvideos.com')) {
      const videoIdMatch = urlObj.pathname.match(/video[._]([^/]+)/);
      if (!videoIdMatch?.[1]) {
        throw new Error('Invalid XVideos video ID');
      }
      const videoId = videoIdMatch[1].split('/')[0];
      return `https://img-hw.xvideos-cdn.com/videos/thumbs169/${videoId.charAt(0)}/${videoId.charAt(1)}/${videoId.charAt(2)}/${videoId}/${videoId}_169.jpg`;
    }

    // Dropbox - Check cache first, then try to generate
    if (urlObj.hostname.includes('dropbox.com') || urlObj.hostname.includes('catbox.moe')) {
      const cachedThumbnail = thumbnailCache.get(url);
      if (cachedThumbnail) {
        return cachedThumbnail;
      }
      return null;
    }

    return DEFAULT_THUMBNAIL;
    
  } catch (error) {
    console.error('Error getting video thumbnail:', error);
    return null;
  }
}

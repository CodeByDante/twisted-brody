import React, { useState } from 'react';

interface ImageLoaderProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain';
}

export default function ImageLoader({ 
  src, 
  alt, 
  className = '', 
  onLoad, 
  onError,
  aspectRatio = 'aspect-video',
  objectFit = 'cover'
}: ImageLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
    onError?.();
  };

  return (
    <div className={`relative ${aspectRatio} ${className}`}>
      {/* Loading animation */}
      <div className={`absolute inset-0 bg-black flex items-center justify-center transition-opacity duration-500 ${
        isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>

      {/* Image */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-${objectFit} transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-sm">Error al cargar</div>
          </div>
        </div>
      )}
    </div>
  );
}
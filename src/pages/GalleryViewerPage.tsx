import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, X, Plus, Minus, ChevronLeft, ChevronRight, LayoutGrid, List, Grid2x2 as Grid, Upload, Loader2, Download, FileDown } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ImageLoader from '../components/ImageLoader';
import type { Gallery } from '../types';
import { uploadToImgBB } from '../lib/utils';
import JSZip from 'jszip';
import jsPDF from 'jspdf';

interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

interface ImageViewerProps {
  images: string[];
  onClose: () => void;
  initialIndex?: number;
  galleryName: string;
  currentViewMode: string;
}

function ImageViewer({ images, onClose, initialIndex = 0, galleryName, currentViewMode }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const hideControlsTimeout = React.useRef<NodeJS.Timeout>();

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(1, scale + delta), 4);
    setScale(newScale);
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && scale > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
    }
    
    // Show controls on mouse movement
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  const goToPrevious = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === '0') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Auto-hide controls after 3 seconds
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [onClose, scale, position]);

  const getViewModeLabel = () => {
    switch (currentViewMode) {
      case 'masonry':
        return 'Vista Galería';
      case 'grid':
        return 'Vista Cuadrícula';
      case 'vertical':
        return 'Vista Vertical';
      default:
        return 'Vista Galería';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black" onClick={onClose}>
      {/* Enhanced Header with Gallery Info */}
      <div className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-6 z-10 transition-all duration-500 ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
      }`}>
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-300 backdrop-blur-sm"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          
          {/* Gallery Info Panel */}
          <div className="bg-black/50 backdrop-blur-md rounded-2xl px-6 py-4 border border-white/10">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-1">{galleryName}</h2>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-300">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full"></span>
                  {currentIndex + 1} de {images.length}
                </span>
                <span className="w-px h-4 bg-white/20"></span>
                <span>{getViewModeLabel()}</span>
              </div>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <button
              onClick={() => setScale(prev => Math.max(1, prev - 0.5))}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              disabled={scale <= 1}
            >
              <Minus className="h-4 w-4 text-white" />
            </button>
            <span className="text-white text-sm min-w-[3rem] text-center font-medium">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(prev => Math.min(4, prev + 0.5))}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              disabled={scale >= 4}
            >
              <Plus className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className={`absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-black/50 hover:bg-black/70 rounded-full transition-all duration-500 backdrop-blur-sm border border-white/10 ${
          showControls ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'
        }`}
      >
        <ChevronLeft className="h-8 w-8 text-white" />
      </button>

      <button
        onClick={goToNext}
        className={`absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-black/50 hover:bg-black/70 rounded-full transition-all duration-500 backdrop-blur-sm border border-white/10 ${
          showControls ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
        }`}
      >
        <ChevronRight className="h-8 w-8 text-white" />
      </button>

      {/* Image Container */}
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center cursor-move overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={images[currentIndex]}
          alt={`Imagen ${currentIndex + 1}`}
          className="select-none max-w-full max-h-full object-contain transition-transform duration-300"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }}
          draggable={false}
        />
      </div>

      {/* Enhanced Bottom Progress Bar */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 z-10 transition-all duration-500 ${
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-4">
              <span className="text-white font-medium text-sm whitespace-nowrap">
                {currentIndex + 1}
              </span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min={0}
                  max={images.length - 1}
                  value={currentIndex}
                  onChange={(e) => {
                    const newIndex = parseInt(e.target.value);
                    setCurrentIndex(newIndex);
                    setScale(1);
                    setPosition({ x: 0, y: 0 });
                  }}
                  className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #bb86fc 0%, #bb86fc ${(currentIndex / (images.length - 1)) * 100}%, rgba(255,255,255,0.2) ${(currentIndex / (images.length - 1)) * 100}%, rgba(255,255,255,0.2) 100%)`
                  }}
                />
              </div>
              <span className="text-white font-medium text-sm whitespace-nowrap">
                {images.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GalleryViewerPage() {
  const { id } = useParams<{ id: string }>();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'masonry' | 'grid' | 'vertical'>('grid');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpg' | 'original'>('original');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadGallery = async () => {
      if (!id) return;
      
      try {
        const docRef = doc(db, 'galleries', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setGallery(docSnap.data() as Gallery);
        }
      } catch (error) {
        console.error('Error loading gallery:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGallery();
  }, [id]);

  const convertToFormat = async (imageUrl: string, format: 'png' | 'jpg' | 'original'): Promise<Blob> => {
    if (format === 'original') {
      const response = await fetch(imageUrl);
      return response.blob();
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (format === 'jpg') {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, format === 'jpg' ? 'image/jpeg' : 'image/png', 0.9);
      };
      img.src = imageUrl;
    });
  };

  const downloadAsZip = async () => {
    if (!gallery || isDownloadingZip) return;
    
    setIsDownloadingZip(true);
    setZipProgress(0);
    
    try {
      const zip = new JSZip();
      const folder = zip.folder(gallery.name);
      
      for (let i = 0; i < gallery.images.length; i++) {
        const imageUrl = gallery.images[i];
        try {
          const blob = await convertToFormat(imageUrl, downloadFormat);
          const extension = downloadFormat === 'original' ? 
            (imageUrl.includes('.png') ? 'png' : 'jpg') : 
            downloadFormat;
          folder?.file(`imagen_${i + 1}.${extension}`, blob);
          setZipProgress(((i + 1) / gallery.images.length) * 100);
        } catch (error) {
          console.error(`Error processing image ${i + 1}:`, error);
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${gallery.name}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      alert('Error al crear el archivo ZIP');
    } finally {
      setIsDownloadingZip(false);
      setZipProgress(0);
    }
  };

  const downloadAsPdf = async () => {
    if (!gallery || isDownloadingPdf) return;
    
    setIsDownloadingPdf(true);
    setPdfProgress(0);
    
    try {
      const pdf = new jsPDF();
      let isFirstPage = true;
      
      for (let i = 0; i < gallery.images.length; i++) {
        const imageUrl = gallery.images[i];
        
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
          });
          
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const imgData = canvas.toDataURL('image/jpeg', 0.8);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgAspectRatio = img.width / img.height;
          const pdfAspectRatio = pdfWidth / pdfHeight;
          
          let finalWidth, finalHeight;
          if (imgAspectRatio > pdfAspectRatio) {
            finalWidth = pdfWidth;
            finalHeight = pdfWidth / imgAspectRatio;
          } else {
            finalHeight = pdfHeight;
            finalWidth = pdfHeight * imgAspectRatio;
          }
          
          const x = (pdfWidth - finalWidth) / 2;
          const y = (pdfHeight - finalHeight) / 2;
          
          pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
          setPdfProgress(((i + 1) / gallery.images.length) * 100);
        } catch (error) {
          console.error(`Error processing image ${i + 1}:`, error);
        }
      }
      
      pdf.save(`${gallery.name}.pdf`);
    } catch (error) {
      console.error('Error creating PDF:', error);
      alert('Error al crear el archivo PDF');
    } finally {
      setIsDownloadingPdf(false);
      setPdfProgress(0);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !gallery) return;

    setIsUploading(true);
    setUploadProgress(files.map(file => ({
      file,
      progress: 0,
      status: 'pending'
    })));

    try {
      const uploadPromises = files.map((file, index) => {
        return new Promise<string | null>((resolve) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('image', file);
          formData.append('key', '69a63ae97b7ae6fe8ff551b2ae5be86e');

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 100;
              setUploadProgress(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], progress, status: 'uploading' };
                return updated;
              });
              
              // Update overall progress
              setUploadProgress(prev => {
                const totalProgress = prev.reduce((acc, curr) => acc + curr.progress, 0);
                const overallPercent = totalProgress / prev.length;
                setOverallProgress(overallPercent);
                return prev;
              });
            }
          });

          xhr.onload = () => {
            if (xhr.status === 200) {
              const response = JSON.parse(xhr.responseText);
              if (response.data?.url) {
                setUploadProgress(prev => {
                  const updated = [...prev];
                  updated[index] = { ...updated[index], status: 'completed', progress: 100 };
                  return updated;
                });
                resolve(response.data.url);
              } else {
                setUploadProgress(prev => {
                  const updated = [...prev];
                  updated[index] = { ...updated[index], status: 'error' };
                  return updated;
                });
                resolve(null);
              }
            } else {
              setUploadProgress(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], status: 'error' };
                return updated;
              });
              resolve(null);
            }
          };

          xhr.onerror = () => {
            setUploadProgress(prev => {
              const updated = [...prev];
              updated[index] = { ...updated[index], status: 'error' };
              return updated;
            });
            resolve(null);
          };

          xhr.open('POST', 'https://api.imgbb.com/1/upload');
          xhr.send(formData);
        });
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => url !== null);

      if (validUrls.length > 0) {
        const updatedImages = [...gallery.images, ...validUrls];
        
        // Update gallery in database
        const galleryRef = doc(db, 'galleries', gallery.id);
        await updateDoc(galleryRef, { images: updatedImages });
        
        // Update local state
        setGallery(prev => prev ? { ...prev, images: updatedImages } : null);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error al subir las imágenes. Por favor, inténtalo de nuevo.');
    } finally {
      setIsUploading(false);
      setUploadProgress([]);
      setOverallProgress(0);
    }
  };

  const cycleViewMode = () => {
    setViewMode(prev => {
      switch (prev) {
        case 'masonry':
          return 'grid';
        case 'grid':
          return 'vertical';
        case 'vertical':
          return 'masonry';
        default:
          return 'masonry';
      }
    });
  };

  const getViewModeIcon = () => {
    switch (viewMode) {
      case 'masonry':
        return <LayoutGrid className="h-5 w-5" />;
      case 'grid':
        return <Grid className="h-5 w-5" />;
      case 'vertical':
        return <List className="h-5 w-5" />;
      default:
        return <LayoutGrid className="h-5 w-5" />;
    }
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'masonry':
        return 'Vista Galería';
      case 'grid':
        return 'Vista Cuadrícula';
      case 'vertical':
        return 'Vista Vertical';
      default:
        return 'Vista Galería';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Cargando álbum...</p>
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-400">Álbum no encontrado</h2>
        <Link to="/gallery" className="text-primary hover:underline mt-4 inline-block">
          Volver a álbumes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Enhanced Header */}
      <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-xl border-b border-gray-700/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Link
              to="/gallery"
              className="p-2 hover:bg-surface-light rounded-full transition-all duration-300 hover:scale-110"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {gallery.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>{gallery.images.length} imágenes</span>
                <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                  {getViewModeLabel()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Download Options */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={downloadAsZip}
                  disabled={isDownloadingZip || isDownloadingPdf}
                  className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 relative overflow-hidden text-sm"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {isDownloadingZip 
                      ? `ZIP ${Math.round(zipProgress)}%` 
                      : `ZIP ${downloadFormat.toUpperCase()}`
                    }
                  </span>
                  <span className="sm:hidden">ZIP</span>
                  {isDownloadingZip && (
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300"
                      style={{ width: `${zipProgress}%` }}
                    />
                  )}
                </button>
              </div>
              
              <div className="relative">
                <button
                  onClick={downloadAsPdf}
                  disabled={isDownloadingPdf || isDownloadingZip}
                  className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 relative overflow-hidden text-sm"
                >
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {isDownloadingPdf 
                      ? `PDF ${Math.round(pdfProgress)}%` 
                      : 'PDF'
                    }
                  </span>
                  <span className="sm:hidden">PDF</span>
                  {isDownloadingPdf && (
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300"
                      style={{ width: `${pdfProgress}%` }}
                    />
                  )}
                </button>
              </div>
              
              <select
                value={downloadFormat}
                onChange={(e) => setDownloadFormat(e.target.value as 'png' | 'jpg' | 'original')}
                className="px-2 py-2 bg-surface-light rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                disabled={isDownloadingZip || isDownloadingPdf}
              >
                <option value="original">Original</option>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
            </div>
            
            <button 
              onClick={cycleViewMode}
              className="flex items-center gap-2 px-4 py-2 bg-surface-light hover:bg-surface rounded-lg transition-colors"
              title={`Cambiar a ${getViewModeLabel()}`}
            >
              {getViewModeIcon()}
              <span>{getViewModeLabel()}</span>
            </button>
          </div>
        </div>
        
        {gallery.description && (
          <div className="px-4 pb-4">
            <div className="bg-surface-light/50 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-sm text-gray-300 leading-relaxed">{gallery.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Image Grid */}
      <div className="p-4">
        {viewMode === 'vertical' ? (
          <div className="space-y-3 max-w-3xl mx-auto">
            {/* Upload Button for Vertical View */}
            <div className="bg-surface-light/30 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all duration-300 backdrop-blur-sm">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <div className="relative h-32 flex items-center justify-center">
                <div className="text-center">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-primary font-medium">
                        Subiendo... {Math.round(overallProgress)}%
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="text-sm text-primary font-medium">
                        Haz clic para agregar más imágenes
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Selecciona múltiples archivos
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {gallery.images.map((imageUrl, index) => (
              <div 
                key={index} 
                className="bg-surface-light/30 rounded-2xl overflow-hidden cursor-pointer group relative backdrop-blur-sm border border-gray-700/30 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10"
                onClick={() => setSelectedImageIndex(index)}
              >
                <ImageLoader
                  src={imageUrl}
                  alt={`Imagen ${index + 1}`}
                  className="transition-all duration-500 group-hover:scale-[1.02]"
                  aspectRatio="w-full h-auto"
                  objectFit="contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  {index + 1} / {gallery.images.length}
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'masonry' ? (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-3 space-y-3">
            {/* Upload Button for Masonry View */}
            <div className="bg-surface-light/30 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all duration-300 backdrop-blur-sm break-inside-avoid mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <div className="relative h-32 flex items-center justify-center">
                <div className="text-center">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-xs text-primary font-medium">
                        {Math.round(overallProgress)}%
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <p className="text-xs text-primary font-medium text-center px-2">
                        Agregar imágenes
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {gallery.images.map((imageUrl, index) => (
              <div 
                key={index} 
                className="bg-surface-light/30 rounded-xl overflow-hidden cursor-pointer group relative break-inside-avoid mb-3 backdrop-blur-sm border border-gray-700/30 hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5"
                onClick={() => setSelectedImageIndex(index)}
              >
                <ImageLoader
                  src={imageUrl}
                  alt={`Imagen ${index + 1}`}
                  className="transition-all duration-500 group-hover:scale-105"
                  aspectRatio="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-2 group-hover:translate-y-0">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {/* Upload Button for Grid View */}
            <div className="aspect-square bg-surface-light/30 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all duration-300 backdrop-blur-sm relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-1">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-xs text-primary font-medium">
                        {Math.round(overallProgress)}%
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mx-auto mb-1 text-primary" />
                      <p className="text-xs text-primary font-medium text-center">
                        Agregar
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            {gallery.images.map((imageUrl, index) => (
              <div 
                key={index} 
                className="aspect-square bg-surface-light/30 rounded-xl overflow-hidden cursor-pointer group relative backdrop-blur-sm border border-gray-700/30 hover:border-primary/30 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:scale-[1.02]"
                onClick={() => setSelectedImageIndex(index)}
              >
                <ImageLoader
                  src={imageUrl}
                  alt={`Imagen ${index + 1}`}
                  className="transition-all duration-500 group-hover:scale-110"
                  aspectRatio="aspect-square"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Image Viewer Modal */}
      {selectedImageIndex !== null && (
        <ImageViewer
          images={gallery.images}
          onClose={() => setSelectedImageIndex(null)}
          initialIndex={selectedImageIndex}
          galleryName={gallery.name}
          currentViewMode={getViewModeLabel()}
        />
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #bb86fc;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #bb86fc;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
}

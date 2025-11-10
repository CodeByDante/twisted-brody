import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, FileDown, BookOpen, Tag, X, Plus, Minus, ChevronLeft, ChevronRight, Grid } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Manga, MangaVersion } from '../types';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { useStore } from '../lib/store';
import ImageLoader from '../components/ImageLoader';
import MangaRecommendations from '../components/MangaRecommendations';

interface ImageGalleryViewerProps {
  images: string[];
  onClose: () => void;
  initialIndex?: number;
}

function ImageGalleryViewer({ images, onClose, initialIndex = 0 }: ImageGalleryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(1, scale + delta), 4);
    setScale(newScale);
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
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, scale, position]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <div 
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center cursor-move" 
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-50"
        >
          <X className="h-6 w-6" />
        </button>
        
        <button
          onClick={goToPrevious}
          className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-50"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div 
          className="w-full h-full flex items-center justify-center overflow-hidden"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={images[currentIndex]}
            alt={`Página ${currentIndex + 1}`}
            className="select-none"
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
            draggable={false}
          />
        </div>

        <button
          onClick={goToNext}
          className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-50"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 px-4 py-2 rounded-full text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale(prev => Math.max(1, prev - 0.5))}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
              disabled={scale <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span>{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(prev => Math.min(4, prev + 0.5))}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
              disabled={scale >= 4}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <span>{currentIndex + 1} / {images.length}</span>
        </div>
      </div>
    </div>
  );
}

export default function MangaViewerPage() {
  const { id } = useParams<{ id: string }>();
  const { categories, getMangaCategories, settings } = useStore();
  const [manga, setManga] = useState<Manga | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<MangaVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpg' | 'original'>('original');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'masonry' | 'grid' | 'vertical'>('vertical');

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

  const convertToFormat = async (url: string, format: 'png' | 'jpg'): Promise<Blob> => {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.crossOrigin = 'anonymous';
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error(`Failed to convert to ${format.toUpperCase()}`));
        },
        format === 'png' ? 'image/png' : 'image/jpeg',
        1.0
      );
    });
  };

  const downloadAsZip = async () => {
    if (!manga || !selectedVersion) return;
    setIsDownloadingZip(true);
    setZipProgress(0);

    try {
      const zip = new JSZip();
      const folderName = selectedVersion.name !== manga.title ? 
        `${manga.title} - ${selectedVersion.name}` : 
        manga.title;
      const folder = zip.folder(folderName);
      
      if (!folder) throw new Error('Could not create folder');

      const totalImages = selectedVersion.pages.length;
      let processedImages = 0;

      const imagePromises = selectedVersion.pages.map(async (url, index) => {
        try {
          let blob: Blob;
          let fileExtension: string;
          
          if (downloadFormat === 'original') {
            // Download in original format
            const response = await fetch(url);
            blob = await response.blob();
            
            // Detect original format from blob type or URL
            if (blob.type.includes('png')) {
              fileExtension = 'png';
            } else if (blob.type.includes('jpeg') || blob.type.includes('jpg')) {
              fileExtension = 'jpg';
            } else if (blob.type.includes('webp')) {
              fileExtension = 'webp';
            } else if (blob.type.includes('gif')) {
              fileExtension = 'gif';
            } else {
              // Fallback: try to detect from URL
              const urlLower = url.toLowerCase();
              if (urlLower.includes('.png')) fileExtension = 'png';
              else if (urlLower.includes('.webp')) fileExtension = 'webp';
              else if (urlLower.includes('.gif')) fileExtension = 'gif';
              else fileExtension = 'jpg'; // Default fallback
            }
          } else {
            // Convert to specified format
            blob = await convertToFormat(url, downloadFormat);
            fileExtension = downloadFormat;
          }
          
          const pageNumber = (index + 1).toString().padStart(2, '0');
          const fileName = `${folderName}_${pageNumber}.${fileExtension}`;
          folder.file(fileName, blob);
          processedImages++;
          setZipProgress((processedImages / totalImages) * 80); // 80% for processing images
        } catch (error) {
          console.error(`Error processing image ${index + 1}:`, error);
          // Fallback: download as-is
          const response = await fetch(url);
          const blob = await response.blob();
          const pageNumber = (index + 1).toString().padStart(2, '0');
          const fileName = `${folderName}_${pageNumber}.jpg`; // Fallback extension
          folder.file(fileName, blob);
          processedImages++;
          setZipProgress((processedImages / totalImages) * 80);
        }
      });

      await Promise.all(imagePromises);
      setZipProgress(85); // Images processed, now generating ZIP
      
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'STORE'
      }, (metadata) => {
        // Update progress during ZIP generation (85% to 100%)
        const zipGenerationProgress = 85 + (metadata.percent * 0.15);
        setZipProgress(zipGenerationProgress);
      });
      
      setZipProgress(100);
      const downloadUrl = URL.createObjectURL(content);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error creating ZIP:', error);
      alert('Error al crear el archivo ZIP. Por favor, inténtalo de nuevo.');
    } finally {
      setIsDownloadingZip(false);
      setZipProgress(0);
    }
  };

  const downloadAsPdf = async () => {
    if (!manga || !selectedVersion) return;
    setIsDownloadingPdf(true);
    setPdfProgress(0);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px'
      });

      const totalPages = selectedVersion.pages.length;

      for (let i = 0; i < selectedVersion.pages.length; i++) {
        const url = selectedVersion.pages[i];
        
        // Update progress
        setPdfProgress((i / totalPages) * 90); // 90% for processing pages
        
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgRatio = img.height / img.width;
        
        let imgWidth = pageWidth;
        let imgHeight = imgWidth * imgRatio;

        if (imgHeight > pageHeight) {
          imgHeight = pageHeight;
          imgWidth = imgHeight / imgRatio;
        }

        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(img, 'JPEG', x, y, imgWidth, imgHeight);
        setPdfProgress(((i + 1) / totalPages) * 90);
      }

      setPdfProgress(95); // PDF generation
      const fileName = selectedVersion.name !== manga.title ? 
        `${manga.title} - ${selectedVersion.name}.pdf` : 
        `${manga.title}.pdf`;
      setPdfProgress(100);
      pdf.save(fileName);
    } catch (error) {
      console.error('Error creating PDF:', error);
      alert('Error al crear el archivo PDF. Por favor, inténtalo de nuevo.');
    } finally {
      setIsDownloadingPdf(false);
      setPdfProgress(0);
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

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'masonry':
        return 'Vista galería';
      case 'grid':
        return 'Vista cuadrícula';
      case 'vertical':
        return 'Vista vertical';
      default:
        return 'Vista galería';
    }
  };
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/comicon"
          className="flex items-center gap-2 px-4 py-2 bg-surface rounded-lg hover:bg-surface-light transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Volver</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{manga.title}</h1>
          {manga.theme && (
            <p className="text-lg text-gray-400 mt-1">{manga.theme}</p>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-lg p-6">
        {/* Descripción */}
        {manga.description && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Descripción</h3>
            <p className="text-gray-300 leading-relaxed">{manga.description}</p>
          </div>
        )}

        {/* Categorías/Etiquetas */}
        {manga.categoryIds && manga.categoryIds.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Categorías
            </h3>
            <div className="flex flex-wrap gap-2">
              {manga.categoryIds.map(categoryId => {
                const category = getMangaCategories().find(c => c.id === categoryId);
                return category ? (
                  <Link
                    key={categoryId}
                    to={`/comicon?category=${categoryId}`}
                    className="inline-flex items-center px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-full text-sm transition-colors"
                  >
                    <Tag className="h-3 w-3 mr-1.5" />
                    {category.name}
                  </Link>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Version Selector */}
        {manga.versions && manga.versions.length > 1 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Versiones Disponibles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {manga.versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => setSelectedVersion(version)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedVersion?.id === version.id
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-600 hover:border-primary/50 bg-surface-light hover:bg-surface'
                  }`}
                >
                  <div className="font-medium text-white mb-1">
                    {version.name}
                  </div>
                  <div className="text-sm text-gray-400">
                    {version.pages.length} páginas
                  </div>
                  {selectedVersion?.id === version.id && (
                    <div className="text-xs text-primary mt-2 font-medium">
                      ✓ Versión actual
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Download Options */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Descargar</h3>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={downloadAsZip}
                  disabled={isDownloadingZip || isDownloadingPdf}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 relative overflow-hidden"
                >
                  <Download className="h-5 w-5" />
                  <span>
                    {isDownloadingZip 
                      ? `Descargando ZIP... ${Math.round(zipProgress)}%` 
                      : `Descargar en ${downloadFormat.toUpperCase()}`
                    }
                  </span>
                  {isDownloadingZip && (
                    <div 
                      className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300"
                      style={{ width: `${zipProgress}%` }}
                    />
                  )}
                </button>
              </div>
              <select
                value={downloadFormat}
                onChange={(e) => setDownloadFormat(e.target.value as 'png' | 'jpg' | 'original')}
                className="px-3 py-2 bg-surface-light rounded-lg border border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="original">Original</option>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
            </div>
            <div className="relative">
              <button
                onClick={downloadAsPdf}
                disabled={isDownloadingPdf || isDownloadingZip}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 relative overflow-hidden"
              >
                <FileDown className="h-5 w-5" />
                <span>
                  {isDownloadingPdf 
                    ? `Descargando PDF... ${Math.round(pdfProgress)}%` 
                    : downloadFormat === 'original' 
                      ? 'Descargar en formato original'
                      : `Descargar en ${downloadFormat.toUpperCase()}`
                  }
                </span>
                {isDownloadingPdf && (
                  <div 
                    className="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300"
                    style={{ width: `${pdfProgress}%` }}
                  />
                )}
              </button>
            </div>
            <button
              onClick={cycleViewMode}
              className="flex items-center gap-2 px-4 py-2 bg-surface-light hover:bg-surface rounded-lg transition-colors"
            >
              <Grid className="h-5 w-5" />
              <span>{getViewModeLabel()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      {viewMode === 'vertical' ? (
        <div className="max-w-4xl mx-auto space-y-2">
          {selectedVersion.pages.map((pageUrl, index) => (
            <div 
              key={index} 
              className="group relative bg-gray-900 rounded-lg overflow-hidden shadow-lg"
            >
              <ImageLoader
                src={pageUrl}
                alt={`Página ${index + 1}`}
                aspectRatio="w-full h-auto"
                objectFit="contain"
              />
            </div>
          ))}
        </div>
      ) : viewMode === 'masonry' ? (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-2 space-y-2">
          {selectedVersion.pages.map((pageUrl, index) => (
            <div 
              key={index} 
              className="group relative bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all break-inside-avoid mb-2 shadow-lg hover:shadow-2xl transform hover:scale-[1.02]"
              onClick={() => setSelectedImageIndex(index)}
            >
              <ImageLoader
                src={pageUrl}
                alt={`Página ${index + 1}`}
                className="transition-transform duration-300 group-hover:scale-105"
                aspectRatio="w-full h-auto"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {selectedVersion.pages.map((pageUrl, index) => (
            <div 
              key={index} 
              className="group relative aspect-[2/3] bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all transform hover:scale-[1.02]"
              onClick={() => setSelectedImageIndex(index)}
            >
              <ImageLoader
                src={pageUrl}
                alt={`Página ${index + 1}`}
                className="transition-transform duration-300 group-hover:scale-105"
                aspectRatio="aspect-[2/3]"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
      )}

      {selectedImageIndex !== null && (
        <ImageGalleryViewer
          images={selectedVersion.pages}
          onClose={() => setSelectedImageIndex(null)}
          initialIndex={selectedImageIndex}
        />
      )}

      {manga.categoryIds && manga.categoryIds.length > 0 && (
        <div className="mt-12 border-t border-gray-700 pt-8">
          <MangaRecommendations
            currentMangaId={id!}
            categoryIds={manga.categoryIds}
            title="Recomendaciones"
          />
        </div>
      )}
    </div>
  );
}
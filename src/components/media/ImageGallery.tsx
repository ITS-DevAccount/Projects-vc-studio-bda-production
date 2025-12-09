'use client';

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

interface GalleryImage {
  publicId: string;
  alt: string;
  title?: string;
  caption?: string;
}

interface ImageGalleryProps {
  cloudinaryUrl: string;
  images: GalleryImage[];
  columns?: 2 | 3 | 4 | 5;
  aspectRatio?: 'square' | 'landscape' | 'portrait';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  showCaptions?: boolean;
}

/**
 * ImageGallery Component
 *
 * Reusable component for displaying a grid of Cloudinary images with lightbox functionality
 *
 * @param cloudinaryUrl - Cloudinary base URL (e.g., "https://res.cloudinary.com/your-cloud-name/image/upload")
 * @param images - Array of gallery images with publicId and metadata
 * @param columns - Number of columns in the grid (default: 3)
 * @param aspectRatio - Aspect ratio for images (default: 'landscape')
 * @param gap - Gap size between images (default: 'md')
 * @param className - Additional CSS classes
 * @param showCaptions - Whether to show captions below images (default: true)
 */
export default function ImageGallery({
  cloudinaryUrl,
  images,
  columns = 3,
  aspectRatio = 'landscape',
  gap = 'md',
  className = '',
  showCaptions = true,
}: ImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Column classes map
  const columnClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  };

  // Gap classes map
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  // Aspect ratio map
  const aspectRatioMap = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]',
  };

  // Generate Cloudinary URL with transformations
  const getImageUrl = (publicId: string, transformation: 'thumbnail' | 'full') => {
    const transforms = {
      thumbnail: aspectRatio === 'square' 
        ? 'w_800,h_800,c_fit,q_auto,f_auto' 
        : 'w_800,h_600,c_fill,q_auto,f_auto',
      full: 'w_1920,h_1080,c_fit,q_auto,f_auto',
    };

    // Check if publicId is actually a full URL
    if (publicId.startsWith('http://') || publicId.startsWith('https://')) {
      // It's a full URL, try to inject transformations
      const urlParts = publicId.split('/upload/');
      if (urlParts.length === 2) {
        return `${urlParts[0]}/upload/${transforms[transformation]}/${urlParts[1]}`;
      }
      // Can't parse, return as is
      return publicId;
    }

    // Normal case: construct from base URL and public ID
    return `${cloudinaryUrl}/${transforms[transformation]}/${publicId}`;
  };

  // Open lightbox
  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
  };

  // Close lightbox
  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = 'auto';
  };

  // Navigate to previous image
  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  // Navigate to next image
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') previousImage();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'Escape') closeLightbox();
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
        {images.map((image, index) => (
          <div key={index} className="group cursor-pointer flex flex-col bg-section-light rounded-lg border border-section-border overflow-hidden transition-all duration-300 hover:border-accent-primary hover:shadow-lg" onClick={() => openLightbox(index)}>
            {/* Image Container - Reduced height, maintains square aspect */}
            <div className="relative w-full bg-section-subtle flex items-center justify-center transition-all duration-300" style={{ aspectRatio: '1 / 1', maxHeight: '200px' }}>
              <div className="w-full h-full flex items-center justify-center p-3 sm:p-4">
                <img
                  src={getImageUrl(image.publicId, 'thumbnail')}
                  alt={image.alt}
                  className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="p-3 bg-accent-primary rounded-full">
                  <ZoomIn className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Caption - Increased padding and prominence */}
            {showCaptions && (
              <div className="flex-1 flex flex-col justify-center p-4 sm:p-5 lg:p-6 min-h-[120px] sm:min-h-[140px]">
                {image.title && (
                  <h3 className="text-base sm:text-lg font-bold text-brand-text mb-2 sm:mb-3 line-clamp-2 leading-tight">{image.title}</h3>
                )}
                {image.alt && (
                  <p className="text-sm sm:text-base text-brand-text-light mb-2 sm:mb-3 line-clamp-2 leading-relaxed">{image.alt}</p>
                )}
                {image.caption && (
                  <p className="text-xs sm:text-sm text-brand-text-muted line-clamp-3 leading-relaxed">{image.caption}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-neutral-900/95 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-3 bg-neutral-800/80 hover:bg-neutral-700 rounded-full transition text-white z-10"
            aria-label="Close lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Previous Button */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                previousImage();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-neutral-800/80 hover:bg-neutral-700 rounded-full transition text-white z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Next Button */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-neutral-800/80 hover:bg-neutral-700 rounded-full transition text-white z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image Display */}
          <div
            className="max-w-7xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getImageUrl(images[currentImageIndex].publicId, 'full')}
              alt={images[currentImageIndex].alt}
              className="w-full h-full object-contain rounded-lg shadow-2xl"
            />

            {/* Image Info */}
            <div className="mt-4 text-center">
              {images[currentImageIndex].title && (
                <h3 className="text-lg font-semibold text-white mb-1">
                  {images[currentImageIndex].title}
                </h3>
              )}
              {images[currentImageIndex].caption && (
                <p className="text-sm text-neutral-300">
                  {images[currentImageIndex].caption}
                </p>
              )}
              <p className="text-xs text-neutral-400 mt-2">
                {currentImageIndex + 1} / {images.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

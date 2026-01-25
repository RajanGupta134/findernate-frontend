'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize, Minimize } from 'lucide-react';
import { FeedPost } from '@/types';
import { videoManager } from '@/utils/videoManager';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: FeedPost | null;
}

export default function ImageModal({ isOpen, onClose, post }: ImageModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(true); // Default to fullscreen
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Fullscreen handler function
  const handleEnterFullscreen = () => {
    if (mediaRef.current) {
      if (mediaRef.current.requestFullscreen) {
        mediaRef.current.requestFullscreen();
      } else if ((mediaRef.current as any).webkitRequestFullscreen) {
        (mediaRef.current as any).webkitRequestFullscreen();
      } else if ((mediaRef.current as any).msRequestFullscreen) {
        (mediaRef.current as any).msRequestFullscreen();
      }
    }
  };

  // Reset image index when post changes and auto-enter fullscreen
  useEffect(() => {
    if (post && isOpen) {
      setCurrentImageIndex(0);
      setVideoLoaded(false);
      // Keep zoom at 100% for all media types
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
      
      // Auto-enter fullscreen when modal opens
      setTimeout(() => {
        handleEnterFullscreen();
      }, 100); // Small delay to ensure modal is fully rendered
    }
  }, [post?._id, isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentImageIndex, zoomLevel]);

  // Cleanup video manager registration when modal closes or media changes
  useEffect(() => {
    return () => {
      if (post?._id) {
        videoManager.unregister(`modal-${post._id}-media-${currentImageIndex}`);
      }
    };
  }, [post?._id, currentImageIndex]);

  // Pause all videos when modal closes
  useEffect(() => {
    if (!isOpen) {
      videoManager.pauseAll();
    }
  }, [isOpen]);

  const handlePrevious = () => {
    if (!post?.media || post.media.length === 0) return;
    const newIndex = currentImageIndex === 0 ? post.media.length - 1 : currentImageIndex - 1;
    setCurrentImageIndex(newIndex);
    setVideoLoaded(false);
    // Keep zoom at 100% for all media types
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleNext = () => {
    if (!post?.media || post.media.length === 0) return;
    const newIndex = currentImageIndex === post.media.length - 1 ? 0 : currentImageIndex + 1;
    setCurrentImageIndex(newIndex);
    setVideoLoaded(false);
    // Keep zoom at 100% for all media types
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.8));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on video controls
    const target = e.target as HTMLElement;
    if (target.tagName === 'VIDEO' || target.closest('video')) {
      return;
    }
    
    if (zoomLevel > 1.2) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1.2) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile swipe and zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart(e.targetTouches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoomLevel > 1.2) {
      // Pan when zoomed
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    } else if (e.touches.length === 1) {
      setTouchEnd(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleVideoLoad = () => {
    setVideoLoaded(true);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Don't zoom if hovering over video controls
    const target = e.target as HTMLElement;
    if (target.tagName === 'VIDEO' || target.closest('video')) {
      return;
    }
    
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  if (!isOpen || !post) return null;

  const currentMedia = post.media?.[currentImageIndex];
  const hasMultipleMedia = post.media && post.media.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full mx-4 bg-black rounded-lg shadow-2xl overflow-hidden max-w-6xl max-h-[95vh]">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex items-center gap-2">
            {zoomLevel > 1 && (
              <span className="text-white text-sm font-medium">
                {Math.round(zoomLevel * 100)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.8}
              className="rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors p-2 disabled:opacity-50"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors p-2"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2.5}
              className="rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors p-2 disabled:opacity-50"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleEnterFullscreen}
              className="rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors p-2"
              title="Enter Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Counter - Positioned at bottom right */}
        {hasMultipleMedia && (
          <div className="absolute bottom-4 right-4 z-10 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
            {currentImageIndex + 1} / {post.media.length}
          </div>
        )}

        {/* Media Container */}
        <div 
          className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : zoomLevel > 1.2 ? 'grab' : 'default' }}
        >
          {currentMedia && (
            <div className="w-full h-full flex items-center justify-center p-4 pt-8 bg-black">
              {currentMedia.type === 'video' ? (
                <div 
                  ref={mediaRef}
                  className="w-full h-full flex items-center justify-center relative"
                  style={{ 
                    width: '100%',
                    height: '100%',
                    minHeight: 'calc(95vh - 120px)',
                    minWidth: 'calc(100vw - 80px)'
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                      transformOrigin: 'center center'
                    }}
                  >
                    <video
                      ref={(el) => {
                        videoRef.current = el;

                        // Register with video manager when ref is set
                        if (el && post?._id) {
                          videoManager.register({
                            id: `modal-${post._id}-media-${currentImageIndex}`,
                            videoElement: el,
                            location: 'modal',
                            pauseCallback: () => {
                              if (el && !el.paused) {
                                el.pause();
                              }
                            }
                          });
                        }
                      }}
                      src={currentMedia.url && currentMedia.url.trim() ? currentMedia.url : undefined}
                      controls
                      autoPlay
                      loop
                      muted
                      onLoadedMetadata={handleVideoLoad}
                      onLoadedData={(e) => {
                        const video = e.currentTarget;
                        // Auto-enter video element's native fullscreen when video is loaded
                        setTimeout(() => {
                          try {
                            if (video.requestFullscreen) {
                              video.requestFullscreen();
                            } else if ((video as any).webkitEnterFullscreen) {
                              (video as any).webkitEnterFullscreen();
                            } else if ((video as any).mozRequestFullScreen) {
                              (video as any).mozRequestFullScreen();
                            } else if ((video as any).msRequestFullscreen) {
                              (video as any).msRequestFullscreen();
                            }
                          } catch (error) {
                            //console.log('Auto fullscreen failed:', error);
                          }
                        }, 1500);
                      }}
                      className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                        videoLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        width: '100%',
                        height: '100%',
                        maxHeight: 'calc(95vh - 120px)',
                        maxWidth: 'calc(100vw - 80px)',
                        minWidth: '400px',
                        minHeight: '300px'
                      }}
                      onError={(e) => {
                        console.error('Video failed to load:', currentMedia.url);
                        setVideoLoaded(false);
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  {!videoLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  ref={mediaRef}
                  className="w-full h-full flex items-center justify-center"
                  style={{ 
                    minHeight: 'calc(95vh - 120px)',
                    minWidth: 'calc(100vw - 80px)'
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
                      transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                      transformOrigin: 'center center'
                    }}
                  >
                    <Image
                      src={currentMedia.url && currentMedia.url.trim() ? currentMedia.url : '/placeholderimg.png'}
                      alt="Post image"
                      width={1200}
                      height={900}
                      className="max-w-full max-h-full object-contain"
                      style={{ 
                        maxHeight: 'calc(95vh - 120px)',
                        width: 'auto',
                        height: 'auto',
                        minWidth: '800px',
                        minHeight: '500px'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        {hasMultipleMedia && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Thumbnail Navigation */}
        {hasMultipleMedia && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/30 rounded-lg">
            {post.media.map((media, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentImageIndex(index);
                  // Keep zoom at 100% for all media types
                  setZoomLevel(1);
                  setPosition({ x: 0, y: 0 });
                }}
                className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                  index === currentImageIndex 
                    ? 'border-white scale-110' 
                    : 'border-transparent hover:border-white/50'
                }`}
              >
                {media.type === 'video' ? (
                  <video
                    src={media.url && media.url.trim() ? media.url : undefined}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <Image
                    src={media.url && media.url.trim() ? media.url : '/placeholderimg.png'}
                    alt={`Thumbnail ${index + 1}`}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

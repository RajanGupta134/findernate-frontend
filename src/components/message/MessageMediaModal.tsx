'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Message } from '@/api/message';
import { videoManager } from '@/utils/videoManager';

interface MessageMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}

export default function MessageMediaModal({ isOpen, onClose, message }: MessageMediaModalProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Reset state when message changes
  useEffect(() => {
    if (message) {
      setVideoLoaded(false);
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [message?._id]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
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
  }, [isOpen, zoomLevel]);

  // Register/unregister video with videoManager
  useEffect(() => {
    if (isOpen && message && message.messageType === 'video' && videoRef.current) {
      videoManager.register({
        id: `message-modal-${message._id}`,
        videoElement: videoRef.current,
        location: 'modal',
      });

      return () => {
        videoManager.unregister(`message-modal-${message._id}`);
      };
    }
  }, [isOpen, message?._id, message?.messageType]);

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

  if (!isOpen || !message) return null;

  // Extract media URL from message (same logic as MediaRenderer)
  let mediaUrl = message.mediaUrl;
  
  if (!mediaUrl) {
    const urlRegex = /https?:\/\/[^\s]+/;
    const urlMatch = message.message.match(urlRegex);
    
    if (!urlMatch) return null;
    
    mediaUrl = urlMatch[0];
  }
  
  const isVideo = message.messageType === 'video';

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
              onClick={onClose}
              className="rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Container */}
        <div 
          className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : zoomLevel > 1.2 ? 'grab' : 'default' }}
        >
          <div className="w-full h-full flex items-center justify-center p-4 pt-8 bg-black">
            {isVideo ? (
              <div 
                ref={mediaRef}
                className="w-full h-full flex items-center justify-center relative"
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
                  <video
                    ref={videoRef}
                    src={mediaUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    onLoadedMetadata={handleVideoLoad}
                    className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                      videoLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      maxHeight: 'calc(95vh - 120px)',
                      width: 'auto',
                      height: 'auto',
                      minWidth: '400px',
                      minHeight: '300px'
                    }}
                    onError={() => {
                      console.error('Video failed to load:', mediaUrl);
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
                   <img
                     src={mediaUrl || '/placeholderimg.png'}
                     alt={message.fileName || 'Message image'}
                     className="max-w-full max-h-full object-contain"
                     style={{ 
                       maxHeight: 'calc(95vh - 120px)',
                       width: 'auto',
                       height: 'auto',
                       minWidth: '800px',
                       minHeight: '500px'
                     }}
                     onError={() => {
                       console.error('Image failed to load in modal:', mediaUrl);
                     }}
                   />
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

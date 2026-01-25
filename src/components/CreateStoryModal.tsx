"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { X, Upload, Send, Play, Pause, RotateCcw, Download, Type, Volume2, VolumeX } from "lucide-react";
import { toast } from 'react-toastify';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (media: File, caption?: string) => Promise<boolean>;
}

export default function CreateStoryModal({ isOpen, onClose, onUpload }: CreateStoryModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  // removed unused scroll state
  // Canvas story states
  const [activeTool, setActiveTool] = useState<"none" | "color" | "text" | "draw">("none");
  const [bgIndex, setBgIndex] = useState(0); // default blue preset at index 0
  const [textValue, setTextValue] = useState<string>("Edit This Story");
  const textEditableRef = useRef<HTMLDivElement>(null);
  const [showPlaceholder, setShowPlaceholder] = useState<boolean>(true);
  const [isDrawing] = useState(false); // drawing removed
  const [brushSize, setBrushSize] = useState<number>(5);
  const [brushColor, setBrushColor] = useState<string>("#34d399");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captionInputRef = useRef<HTMLTextAreaElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const isVideo = selectedFile?.type.startsWith('video/');
  const isImageMode = !!selectedFile && !isVideo;
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const maxVideoDuration = 30; // 30 seconds

  // Background presets (as CSS and as color tuples for canvas gradient)
  const backgrounds = useMemo(() => ([
    { css: "from-blue-700 to-cyan-400", colors: ["#1d4ed8", "#22d3ee"] as [string, string] },
    { css: "from-purple-700 to-pink-500", colors: ["#6d28d9", "#ec4899"] as [string, string] },
    { css: "from-emerald-600 to-lime-400", colors: ["#059669", "#a3e635"] as [string, string] },
    { css: "from-orange-500 to-yellow-400", colors: ["#f97316", "#facc15"] as [string, string] },
    { css: "from-slate-800 to-slate-500", colors: ["#1f2937", "#64748b"] as [string, string] },
  ] as const), []);

  // Brush color palette (includes white/black and more variants)
  const brushPalette = useMemo(
    () => [
      '#ffffff', '#000000', '#f87171', '#60a5fa', '#34d399', '#fbbf24',
      '#a78bfa', '#22d3ee', '#fb7185', '#f59e0b', '#64748b', '#10b981'
    ],
    []
  );

  // Prepare drawBackground first so it can be used in resize callback dependencies
  const drawBackground = useCallback(() => {
    const canvas = canvasRef.current;
    const off = offscreenRef.current;
    if (!canvas || !off) return;
    const ctx = canvas.getContext('2d');
    const offCtx = off.getContext('2d');
    if (!ctx || !offCtx) return;
    const [c1, c2] = backgrounds[bgIndex].colors;
    if (isImageMode) {
      // For image mode, keep drawing canvas transparent; offscreen cleared only when switching modes
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    // Canvas-only story: paint gradient background on both canvases
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const og = offCtx.createLinearGradient(0, 0, 0, off.height);
    og.addColorStop(0, c1);
    og.addColorStop(1, c2);
    offCtx.fillStyle = og;
    offCtx.fillRect(0, 0, off.width, off.height);
  }, [bgIndex, backgrounds, isImageMode]);

  // Sync canvas size with container
  const resizeCanvasToContainer = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Prepare offscreen high-res canvas (1080x1920 for download/upload)
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas');
    }
    const off = offscreenRef.current;
    off.width = 1080;
    off.height = 1920;

    // Redraw background after resize
    drawBackground();
  }, [drawBackground]);

  useEffect(() => {
    const onResize = () => resizeCanvasToContainer();
    resizeCanvasToContainer();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [resizeCanvasToContainer]);

  // drawBackground defined above

  useEffect(() => {
    drawBackground();
  }, [drawBackground]);

  // When entering image mode, clear offscreen so we can composite image behind strokes later
  useEffect(() => {
    if (isImageMode && offscreenRef.current) {
      const off = offscreenRef.current;
      const offCtx = off.getContext('2d');
      if (offCtx) offCtx.clearRect(0, 0, off.width, off.height);
    }
  }, [isImageMode]);

  // Drawing handlers (on visible and offscreen simultaneously)
  const isPointerDownRef = useRef(false);
  const prevPointRef = useRef<{ x: number; y: number } | null>(null);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr,
    };
  };

  const strokeTo = (x: number, y: number) => {
    const canvas = canvasRef.current;
    const off = offscreenRef.current;
    if (!canvas || !off) return;
    const ctx = canvas.getContext('2d');
    const offCtx = off.getContext('2d');
    if (!ctx || !offCtx) return;
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize * Math.max(1, Math.floor(window.devicePixelRatio || 1));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    offCtx.strokeStyle = brushColor;
    offCtx.lineWidth = brushSize * 2; // scale for high-res
    offCtx.lineCap = 'round';
    offCtx.lineJoin = 'round';
    const p = prevPointRef.current;
    if (p) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      offCtx.beginPath();
      offCtx.moveTo(p.x * (off.width / canvas.width), p.y * (off.height / canvas.height));
      offCtx.lineTo(x * (off.width / canvas.width), y * (off.height / canvas.height));
      offCtx.stroke();
    }
    prevPointRef.current = { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    isPointerDownRef.current = true;
    prevPointRef.current = getCanvasPoint(e);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isPointerDownRef.current) return;
    const pt = getCanvasPoint(e);
    strokeTo(pt.x, pt.y);
  };
  const handlePointerUp = () => {
    isPointerDownRef.current = false;
    prevPointRef.current = null;
  };

  const cycleBackground = () => {
    setBgIndex((i) => (i + 1) % backgrounds.length);
  };

  const downloadCanvasImage = () => {
    const off = offscreenRef.current;
    if (!off) return;
    const link = document.createElement('a');
    link.download = 'story.png';
    link.href = off.toDataURL('image/png');
    link.click();
  };

  // Focus the on-canvas text editor when text tool is active
  useEffect(() => {
    if (activeTool === 'text') {
      setTimeout(() => {
        const el = textEditableRef.current;
        if (!el) return;
        el.focus();
        // Place caret at end
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }, 0);
    }
  }, [activeTool]);

  const handleTextInputDOM = (e: React.FormEvent<HTMLDivElement>) => {
    const txt = (e.currentTarget.innerText || '').trim();
    setShowPlaceholder(txt.length === 0);
  };
  const syncTextFromDom = () => {
    const txt = (textEditableRef.current?.innerText || '').trim();
    setTextValue(txt);
    setShowPlaceholder(txt.length === 0);
  };

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > maxFileSize) {
      setError("File size must be less than 50MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError("Please select an image or video file");
      return;
    }

    // For videos, validate duration and set up preview
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        setVideoDuration(video.duration);
        
        // Always allow the video, but we'll trim it to 30s in the preview
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        // Hide placeholder on media select; default unmuted
        setShowPlaceholder(false);
        setTextValue('');
        setIsMuted(false);
        
        if (video.duration > maxVideoDuration) {
          // Show warning but don't reject the video
          setError(`Video is ${Math.ceil(video.duration)}s long. Only the first ${maxVideoDuration}s will be used for your story.`);
        }
      };
      
      video.src = URL.createObjectURL(file);
    } else {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      // Hide placeholder on media select
      setShowPlaceholder(false);
      setTextValue('');
    }
  }, [maxFileSize]);

  // Video control functions
  const toggleVideoPlayback = useCallback(() => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  }, [isVideoPlaying]);

  const resetVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setVideoCurrentTime(0);
      setIsVideoPlaying(false);
    }
  }, []);

  // Handle video events
  const handleVideoLoadedData = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      videoRef.current.muted = isMuted;
      // Ensure video doesn't play beyond 30 seconds
      videoRef.current.addEventListener('timeupdate', () => {
        if (videoRef.current && videoRef.current.currentTime >= maxVideoDuration) {
          videoRef.current.pause();
          videoRef.current.currentTime = maxVideoDuration;
          setIsVideoPlaying(false);
        }
        setVideoCurrentTime(videoRef.current?.currentTime || 0);
      });
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    setIsVideoPlaying(false);
  }, []);

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      let uploadOk = false;
      if (!isVideo) {
        // Compose image + overlay + strokes + text on offscreen and upload
        const off = offscreenRef.current;
        if (!off) throw new Error('Canvas not ready');
        const offCtx = off.getContext('2d');
        if (!offCtx) throw new Error('Canvas not ready');
        // Clear first (preserve strokes drawn so far on a temp copy)
        const snapshot = offCtx.getImageData(0, 0, off.width, off.height);
        offCtx.clearRect(0, 0, off.width, off.height);
        // Draw base image scaled to fit
        const bitmap = await createImageBitmap(selectedFile);
        const imgW = bitmap.width;
        const imgH = bitmap.height;
        const targetW = off.width;
        const targetH = off.height;
        const scale = Math.min(targetW / imgW, targetH / imgH);
        const drawW = Math.floor(imgW * scale);
        const drawH = Math.floor(imgH * scale);
        const dx = Math.floor((targetW - drawW) / 2);
        const dy = Math.floor((targetH - drawH) / 2);
        offCtx.drawImage(bitmap, dx, dy, drawW, drawH);
        // Restore strokes on top
        offCtx.putImageData(snapshot, 0, 0);
        // Gradient overlay
        const [c1, c2] = backgrounds[bgIndex].colors;
        const og = offCtx.createLinearGradient(0, 0, 0, off.height);
        og.addColorStop(0, c1);
        og.addColorStop(1, c2);
        offCtx.save();
        offCtx.globalAlpha = 0.25;
        offCtx.fillStyle = og;
        offCtx.fillRect(0, 0, off.width, off.height);
        offCtx.restore();
        // Text overlay
        if (!showPlaceholder && textValue) {
          offCtx.save();
          offCtx.font = 'bold 80px Inter, system-ui, -apple-system, Segoe UI, Roboto';
          offCtx.fillStyle = '#ffffff';
          offCtx.textAlign = 'center';
          offCtx.textBaseline = 'middle';
          offCtx.shadowColor = 'rgba(0,0,0,0.35)';
          offCtx.shadowBlur = 12;
          offCtx.fillText(textValue, off.width / 2, off.height / 2);
          offCtx.restore();
        }
        // Export
        const blob = await new Promise<Blob | null>((resolve) => off.toBlob((b) => resolve(b), 'image/png'));
        if (!blob) throw new Error('Failed to export story');
        const file = new File([blob], 'story.png', { type: 'image/png' });
        uploadOk = await onUpload(file, caption || undefined);
      } else {
        uploadOk = await onUpload(selectedFile, caption || undefined);
      }
      
      if (uploadOk) {
        // Show success toast
        toast.success('Story shared successfully!', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        // Close modal after successful upload
        cleanup();
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption("");
        setError(null);
        setShowCaptionInput(false);
        setIsVideoPlaying(false);
        setVideoCurrentTime(0);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Close the modal
        onClose();
      } else {
        setError("Failed to upload story. Please try again.");
        
        // Show error toast
        toast.error('Failed to upload story. Please try again.', {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch {
      setError("An error occurred while uploading");
      
      // Show error toast
      toast.error('Failed to upload story. Please try again.', {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Upload from canvas when no media chosen
  const handleUploadFromCanvas = async () => {
    const off = offscreenRef.current;
    if (!off) return;
    setIsUploading(true);
    setError(null);
    try {
      // Render text onto offscreen before exporting
      if (!showPlaceholder && textValue) {
        const offCtx = off.getContext('2d');
        if (offCtx) {
          offCtx.save();
          offCtx.font = 'bold 80px Inter, system-ui, -apple-system, Segoe UI, Roboto';
          offCtx.fillStyle = '#ffffff';
          offCtx.textAlign = 'center';
          offCtx.textBaseline = 'middle';
          offCtx.shadowColor = 'rgba(0,0,0,0.35)';
          offCtx.shadowBlur = 12;
          offCtx.fillText(textValue, off.width / 2, off.height / 2);
          offCtx.restore();
        }
      }

      await new Promise<void>((resolve) => setTimeout(() => resolve(), 0));
      const blob = await new Promise<Blob | null>((resolve) => off.toBlob((b) => resolve(b), 'image/png'));
      if (!blob) throw new Error('Failed to export story');
      const file = new File([blob], 'story.png', { type: 'image/png' });
      const success = await onUpload(file, caption || undefined);
      if (success) {
        toast.success('Story shared successfully!', { position: 'top-right', autoClose: 3000 });
        cleanup();
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption('');
        setError(null);
        setShowCaptionInput(false);
        setIsVideoPlaying(false);
        setVideoCurrentTime(0);
        onClose();
      } else {
        setError('Failed to upload story. Please try again.');
        toast.error('Failed to upload story. Please try again.', { position: 'top-right', autoClose: 4000 });
      }
    } catch {
      setError('An error occurred while uploading');
      toast.error('Failed to upload story. Please try again.', { position: 'top-right', autoClose: 4000 });
    } finally {
      setIsUploading(false);
    }
  };

  // Clean up preview URL
  const cleanup = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  // Handle modal close
  const handleClose = () => {
    cleanup();
    onClose();
  };

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/40 bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close when clicking backdrop/outside modal
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => {
          // Prevent clicks inside modal from bubbling up
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">Your Story</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isUploading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedFile ? (
            // Canvas-based story editor (no media selected)
            <div className="relative mx-4 mt-4">
              <div className={`relative aspect-[9/16] rounded-2xl overflow-hidden max-h-[70vh] bg-gradient-to-br from-${backgrounds[bgIndex].css.split(' ')[0]} to-${backgrounds[bgIndex].css.split(' ')[1]}`}
                   ref={containerRef}>
                {/* Gradient background will be drawn on canvas for export consistency */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 touch-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                />

                {/* Centered text overlay (contentEditable) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    ref={textEditableRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleTextInputDOM}
                    onBlur={syncTextFromDom}
                    className={`w-full max-w-full outline-none text-center px-6 font-bold drop-shadow-xl ${activeTool==='text' ? 'cursor-text' : 'cursor-default'} text-white text-3xl sm:text-4xl whitespace-pre-wrap break-words`}
                    style={{ userSelect: 'text' }}
                  >
                    {showPlaceholder ? 'Edit This Story' : textValue}
                  </div>
                </div>

                {/* Toolbar - top overlay (Close on left, tools on right) */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur text-white flex items-center justify-center"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={cycleBackground}
                      className="w-9 h-9 rounded-full border border-white/80 shadow-sm"
                      style={{ backgroundImage: `linear-gradient(135deg, ${backgrounds[bgIndex].colors[0]}, ${backgrounds[bgIndex].colors[1]})` }}
                      title="Change background"
                    />
                    <button
                      onClick={() => { setActiveTool('text'); }}
                      className={`w-9 h-9 rounded-xl bg-black/40 backdrop-blur text-white flex items-center justify-center ${activeTool==='text' ? 'ring-2 ring-white/70' : ''}`}
                      title="Add text"
                    >
                      <Type className="w-5 h-5" />
                    </button>
                    {/* Draw tool removed as requested */}
                    <button
                      onClick={downloadCanvasImage}
                      className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur text-white flex items-center justify-center"
                      title="Download"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* No separate text input overlay; editing happens inline */}

                {/* Draw controls */}
                {isDrawing && (
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur rounded-xl p-2">
                      <label className="text-white text-xs opacity-80 mr-1">Size</label>
                      <input
                        type="range"
                        min={2}
                        max={24}
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                      />
                    </div>
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur rounded-xl p-2">
                      {brushPalette.map((c) => (
                        <button
                          key={c}
                          onClick={() => setBrushColor(c)}
                          className="w-6 h-6 rounded-full border border-white/80 shadow-sm"
                          style={{ backgroundColor: c }}
                          title="Brush color"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Choose media below editor */}
              <div className="px-4 pt-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Choose photo or video</span>
                  </button>
                </div>
              </div>
              {error && (
                <div className="m-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
            </div>
          ) : (
            /* Preview and Upload */
            <div className="flex flex-col h-full">
              {/* Preview Container - Instagram-like */}
              <div className="mx-4 mt-4">
                <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden max-h-[60vh]">
                {/* Media Content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {isVideo ? (
                    <>
                      <video
                        ref={videoRef}
                        src={previewUrl!}
                        className="max-w-full max-h-full object-contain"
                        onLoadedData={handleVideoLoadedData}
                        onEnded={handleVideoEnded}
                        muted={isMuted}
                        playsInline
                      />
                      
                      {/* Video Controls Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                        <button
                          onClick={toggleVideoPlayback}
                          className="bg-white bg-opacity-90 rounded-full p-4 hover:bg-opacity-100 transition-all transform hover:scale-105"
                          disabled={isUploading}
                        >
                          {isVideoPlaying ? (
                            <Pause size={24} className="text-gray-800" />
                          ) : (
                            <Play size={24} className="text-gray-800 ml-1" />
                          )}
                        </button>
                      </div>

                      {/* Video Progress Bar */}
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-white bg-opacity-30 rounded-full h-1">
                          <div 
                            className="bg-white rounded-full h-1 transition-all"
                            style={{ 
                              width: `${Math.min(100, (videoCurrentTime / Math.min(videoDuration, maxVideoDuration)) * 100)}%` 
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-white text-xs mt-1">
                          <span>{Math.floor(videoCurrentTime)}s</span>
                          <span>{Math.min(Math.floor(videoDuration), maxVideoDuration)}s</span>
                        </div>
                      </div>

                      {/* Video Controls Top Row */}
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
                        <button
                          onClick={resetVideo}
                          className="bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70"
                          disabled={isUploading}
                          title="Restart"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setIsMuted((m) => {
                              const next = !m;
                              if (videoRef.current) videoRef.current.muted = next;
                              return next;
                            });
                          }}
                          className="bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70"
                          disabled={isUploading}
                          title={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="relative w-full h-full" ref={containerRef}>
                    <div 
                      ref={imageContainerRef}
                        className="w-full h-full overflow-hidden relative"
                    >
                        <img
                          src={previewUrl!}
                          alt="Story preview"
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                        {/* Gradient overlay on image */}
                        <div className={`absolute inset-0 bg-gradient-to-br opacity-30 pointer-events-none from-${backgrounds[bgIndex].css.split(' ')[0]} to-${backgrounds[bgIndex].css.split(' ')[1]}`} />
                        {/* Drawing canvas overlay */}
                        <canvas
                          ref={canvasRef}
                          className="absolute inset-0 touch-none"
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                        />
                        {/* Centered text overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            ref={textEditableRef}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={handleTextInputDOM}
                            onBlur={syncTextFromDom}
                            className={`w-full max-w-full outline-none text-center px-6 font-bold drop-shadow-xl ${activeTool==='text' ? 'cursor-text' : 'cursor-default'} text-white text-3xl sm:text-4xl whitespace-pre-wrap break-words`}
                            style={{ userSelect: 'text' }}
                          >
                            {showPlaceholder ? 'Edit This Story' : textValue}
                          </div>
                        </div>
                        {/* Toolbar (Close left, tools right) */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur text-white flex items-center justify-center"
                            title="Close"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={cycleBackground}
                              className="w-9 h-9 rounded-full border border-white/80 shadow-sm"
                              style={{ backgroundImage: `linear-gradient(135deg, ${backgrounds[bgIndex].colors[0]}, ${backgrounds[bgIndex].colors[1]})` }}
                              title="Change background"
                            />
                            <button
                              onClick={() => { setActiveTool('text'); }}
                              className={`w-9 h-9 rounded-xl bg-black/40 backdrop-blur text-white flex items-center justify-center ${activeTool==='text' ? 'ring-2 ring-white/70' : ''}`}
                              title="Add text"
                            >
                              <Type className="w-5 h-5" />
                            </button>
                            {/* Draw tool removed as requested */}
                            <button
                              onClick={downloadCanvasImage}
                              className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur text-white flex items-center justify-center"
                              title="Download"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* No separate text input overlay; editing happens inline */}

                        {/* Draw controls */}
                        {isDrawing && (
                          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 bg-black/40 backdrop-blur rounded-xl p-2">
                              <label className="text-white text-xs opacity-80 mr-1">Size</label>
                              <input
                                type="range"
                                min={2}
                                max={24}
                                value={brushSize}
                                onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                              />
                            </div>
                            <div className="flex items-center gap-2 bg-black/40 backdrop-blur rounded-xl p-2">
                              {brushPalette.map((c) => (
                                <button
                                  key={c}
                                  onClick={() => setBrushColor(c)}
                                  className="w-6 h-6 rounded-full border border-white/80 shadow-sm"
                                  style={{ backgroundColor: c }}
                                  title="Brush color"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Change File Button */}
                <button
                  onClick={() => {
                    cleanup();
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setCaption("");
                    setError(null);
                    setShowCaptionInput(false);
                  }}
                  className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-all"
                  disabled={isUploading}
                >
                  <X size={16} />
                </button>

                {/* Caption Overlay (if exists) */}
                {caption && (
                  <div className="absolute bottom-16 left-4 right-4">
                    <div className="bg-white bg-opacity-90 rounded-lg p-3">
                      <p className="text-black text-sm font-medium">{caption}</p>
                    </div>
                  </div>
                )}

                {/* Add Caption Button */}
                <button
                  onClick={() => {
                    setShowCaptionInput(true);
                    setTimeout(() => captionInputRef.current?.focus(), 100);
                  }}
                  className="absolute bottom-4 right-4 bg-white bg-opacity-90 text-gray-800 rounded-full px-4 py-2 text-sm font-medium hover:bg-opacity-100 transition-all"
                  disabled={isUploading || showCaptionInput}
                >
                  {caption ? 'Edit Caption' : 'Add Caption'}
                </button>
                </div>
              </div>

              {/* Caption Input (Slide Up) */}
              {showCaptionInput && (
                <div className="bg-gray-50 p-4 border-t animate-in slide-in-from-bottom">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Add a caption</h4>
                      <button
                        onClick={() => setShowCaptionInput(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <textarea
                      ref={captionInputRef}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write a caption..."
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black"
                      rows={3}
                      maxLength={500}
                      disabled={isUploading}
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">
                        {caption.length}/500 characters
                      </p>
                      <button
                        onClick={() => setShowCaptionInput(false)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Spacer to push button to bottom */}
              <div className="flex-1"></div>

              {/* Error Message */}
              {error && (
                <div className="mx-4 mb-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-amber-800 text-sm">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Share Button - Always at bottom */}
        {selectedFile ? (
          <div className="p-4 border-t bg-white flex-shrink-0">
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3.5 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[0.98] active:scale-95"
                >
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sharing...</span>
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      <span>Share to Story</span>
                    </>
                  )}
                </button>
          </div>
        ) : (
          <div className="p-4 border-t bg-white flex-shrink-0">
            <button
              onClick={handleUploadFromCanvas}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3.5 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[0.98] active:scale-95"
                >
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sharing...</span>
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      <span>Share to Story</span>
                    </>
                  )}
                </button>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
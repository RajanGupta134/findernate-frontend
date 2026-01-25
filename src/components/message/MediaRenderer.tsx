import React, { useRef, useEffect } from 'react';
import { Message } from '@/api/message';
import { videoManager } from '@/utils/videoManager';

interface MediaRendererProps {
  msg: Message;
  onMediaClick?: (message: Message) => void;
}

export const MediaRenderer: React.FC<MediaRendererProps> = ({ msg, onMediaClick }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Register/unregister video with videoManager
  useEffect(() => {
    if (msg.messageType === 'video' && videoRef.current && msg._id) {
      videoManager.register({
        id: `message-${msg._id}`,
        videoElement: videoRef.current,
        location: 'modal',
      });

      return () => {
        videoManager.unregister(`message-${msg._id}`);
      };
    }
  }, [msg._id, msg.messageType]);

  if (!msg.message || msg.messageType === 'text') return null;

  let mediaUrl = msg.mediaUrl;

  if (!mediaUrl) {
    const urlRegex = /https?:\/\/[^\s]+/;
    const urlMatch = msg.message.match(urlRegex);

    if (!urlMatch) return null;

    mediaUrl = urlMatch[0];
  }



  const commonClasses = "max-w-full rounded-lg border border-gray-200";

  switch (msg.messageType) {
    case 'image':
      const isActuallyPDF = mediaUrl.includes('.pdf') || (msg.fileName && msg.fileName.toLowerCase().endsWith('.pdf'));
      
      if (isActuallyPDF) {
        const fileName = msg.fileName || 'Document.pdf';
        return (
          <div className="mb-2">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg border-l-4 border-blue-500 max-w-xs">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {fileName}
                  </p>
                  <p className="text-xs opacity-75 uppercase">
                    PDF file
                  </p>
                  {msg.fileSize && (
                    <p className="text-xs opacity-75">
                      {(msg.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => window.open(mediaUrl, '_blank')}
                  className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                >
                  View PDF
                </button>
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition-colors"
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          </div>
        );
      }
      
      return (
        <div className="mb-2">
            <img
             src={mediaUrl}
             alt={msg.fileName || 'Shared image'}
             className={`${commonClasses} object-cover cursor-pointer hover:opacity-90 transition-opacity w-[1000px] max-h-[400px]`}
             onClick={() => onMediaClick?.(msg)}
             onError={(e) => {
               console.error('Image failed to load:', mediaUrl);
               e.currentTarget.style.display = 'none';
             }}
           />
        </div>
      );

    case 'video':
      return (
        <div className="mb-2">
                     <video
             ref={videoRef}
             src={mediaUrl}
             controls
             className={`${commonClasses} w-[800px] max-h-[400px] cursor-pointer`}
             preload="metadata"
             onClick={() => onMediaClick?.(msg)}
           >
            Your browser does not support the video tag.
          </video>
        </div>
      );

    case 'audio':
      return (
        <div className="mb-2">
          <audio
            src={mediaUrl}
            controls
            className="w-full max-w-sm"
          >
            Your browser does not support the audio tag.
          </audio>
        </div>
      );

    case 'file':
      let fileName = msg.fileName;
      if (!fileName) {
        const urlParts = mediaUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart.includes('.')) {
          fileName = lastPart.split('.')[0] + '.' + lastPart.split('.').pop();
        } else {
          fileName = 'File';
        }
      }
      
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
      const isPDF = fileExtension === 'pdf' || mediaUrl.includes('.pdf');
      const isDoc = ['doc', 'docx'].includes(fileExtension);
      const isExcel = ['xls', 'xlsx'].includes(fileExtension);
      const isPowerPoint = ['ppt', 'pptx'].includes(fileExtension);
      
      let fileIcon = '📄';
      if (isPDF) fileIcon = '📄';
      else if (isDoc) fileIcon = '📝';
      else if (isExcel) fileIcon = '📊';
      else if (isPowerPoint) fileIcon = '📊';
      else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExtension)) fileIcon = '🗜️';
      else if (['txt', 'csv'].includes(fileExtension)) fileIcon = '📝';

      return (
        <div className="mb-2">
          <div className="bg-white bg-opacity-20 p-3 rounded-lg border-l-4 border-blue-500 max-w-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{fileIcon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {fileName}
                </p>
                <p className="text-xs opacity-75 uppercase">
                  {fileExtension} file
                </p>
                {msg.fileSize && (
                  <p className="text-xs opacity-75">
                    {(msg.fileSize / (1024 * 1024)).toFixed(2)} MB
                  </p>
                )}
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              {isPDF ? (
                <>
                  <button
                    onClick={() => {
                      const newWindow = window.open('', '_blank');
                      if (newWindow) {
                        newWindow.document.write(`
                          <html>
                            <head><title>${fileName}</title></head>
                            <body style="margin:0;padding:0;">
                              <iframe src="${mediaUrl}" width="100%" height="100%" style="border:none;"></iframe>
                            </body>
                          </html>
                        `);
                      } else {
                        window.location.href = mediaUrl;
                      }
                    }}
                    className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                  >
                    View PDF
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = mediaUrl;
                      link.target = '_blank';
                      link.rel = 'noopener noreferrer';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-xs bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition-colors"
                  >
                    Open in New Tab
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = mediaUrl;
                      link.target = '_blank';
                      link.rel = 'noopener noreferrer';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = mediaUrl;
                      link.target = '_blank';
                      link.rel = 'noopener noreferrer';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-xs bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition-colors"
                  >
                    Open in New Tab
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};
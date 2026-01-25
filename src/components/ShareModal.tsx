"use client";

import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, ExternalLink, QrCode } from 'lucide-react';
import { UserProfile } from '@/types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: UserProfile;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  userData
}) => {
  const [copied, setCopied] = useState(false);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [sharingQR, setSharingQR] = useState(false);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Reset state when modal opens
      setCopied(false);
      setQrCodeUrl(null);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Auto-generate QR code when modal opens
  useEffect(() => {
    if (isOpen && !qrCodeUrl && !qrCodeLoading) {
      handleGenerateQR();
    }
  }, [isOpen, qrCodeUrl, qrCodeLoading]);

  if (!isOpen) return null;

  const profileUrl = `${window.location.origin}/userprofile/${userData.username}`;

  // Calculate modal width based on URL length
  const getModalWidth = () => {
    const urlLength = profileUrl.length;
    // Base width: 24rem (384px), add 0.5rem for every 10 characters over 40
    const baseWidth = 24; // rem
    const extraWidth = Math.max(0, (urlLength - 40) / 10) * 0.5;
    const maxWidth = 36; // Maximum width in rem
    const minWidth = 24; // Minimum width in rem

    return Math.min(maxWidth, Math.max(minWidth, baseWidth + extraWidth));
  };

  const modalWidth = getModalWidth();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleGenerateQR = async () => {
    if (qrCodeUrl) return; // Already loaded

    setQrCodeLoading(true);
    try {
      // Import axios instance
      const axios = (await import('@/api/base')).default;

      // Try to get the QR code data URL for sharing
      const response = await axios.get(`/qr/share/${userData.username}`);

      if (response.data?.success && response.data?.data?.qrCode?.dataURL) {
        setQrCodeUrl(response.data.data.qrCode.dataURL);
      } else {
        throw new Error('Invalid QR code response');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback: Use public QR endpoint as image URL
      try {
        const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://eckss0cw0ggco0okoocc4wo4.194.164.151.15.sslip.io';
        setQrCodeUrl(`${baseURL}/api/v1/qr/${userData.username}`);
      } catch (fallbackError) {
        console.error('Fallback QR generation failed:', fallbackError);
      }
    } finally {
      setQrCodeLoading(false);
    }
  };

  const createBrandedQRImage = async (qrImageUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Set canvas dimensions for a branded QR card
      const cardWidth = 400;
      const cardHeight = 500;
      canvas.width = cardWidth;
      canvas.height = cardHeight;

      // Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, cardWidth, cardHeight);

      // Header background with gradient
      const gradient = ctx.createLinearGradient(0, 0, cardWidth, 80);
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(1, '#FFC107');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, cardWidth, 80);

      // FinderNate title
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('FINDERNATE', cardWidth / 2, 35);

      // Subtitle
      ctx.font = '14px Arial, sans-serif';
      ctx.fillStyle = '#333333';
      ctx.fillText('Connect & Discover', cardWidth / 2, 55);

      // User info section
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(userData.fullName, cardWidth / 2, 120);

      ctx.font = '16px Arial, sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText(`@${userData.username}`, cardWidth / 2, 145);

      // Load and draw QR code
      const qrImage = new window.Image();
      qrImage.crossOrigin = 'anonymous';
      qrImage.onload = () => {
        try {
          // QR code positioning (centered)
          const qrSize = 200;
          const qrX = (cardWidth - qrSize) / 2;
          const qrY = 170;

          // Draw QR code
          ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

          // Scan instruction
          ctx.fillStyle = '#666666';
          ctx.font = '14px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Scan this QR code to connect', cardWidth / 2, qrY + qrSize + 30);

          // Footer
          ctx.fillStyle = '#999999';
          ctx.font = '12px Arial, sans-serif';
          ctx.fillText('findernate.com', cardWidth / 2, qrY + qrSize + 55);

          // Border around the card
          ctx.strokeStyle = '#E0E0E0';
          ctx.lineWidth = 2;
          ctx.strokeRect(10, 10, cardWidth - 20, cardHeight - 20);

          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          }, 'image/png', 0.9);
        } catch (error) {
          reject(error);
        }
      };

      qrImage.onerror = () => {
        reject(new Error('Failed to load QR image'));
      };

      // Set QR image source
      qrImage.src = qrImageUrl;
    });
  };

  const handleShareQR = async () => {
    if (!qrCodeUrl || sharingQR) return;

    setSharingQR(true);

    try {
      // Create branded QR image
      const brandedBlob = await createBrandedQRImage(qrCodeUrl);
      const file = new File([brandedBlob], `${userData.username}-findernate-qr.png`, { type: 'image/png' });

      // Try native file sharing first (like UPI apps)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${userData.fullName}'s FinderNate Profile`,
          text: `Connect with ${userData.fullName} (@${userData.username}) on FinderNate`,
          files: [file]
        });
        setSharingQR(false);
        return;
      }

      // Fallback 1: Copy branded QR image to clipboard if supported
      if (navigator.clipboard && window.ClipboardItem) {
        const clipboardItem = new ClipboardItem({ 'image/png': brandedBlob });
        await navigator.clipboard.write([clipboardItem]);

        // Show temporary feedback
        const button = document.querySelector('[data-qr-share-btn]');
        if (button) {
          const originalText = button.textContent;
          button.textContent = '✓ Copied to clipboard!';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        }
        setSharingQR(false);
        return;
      }

      // Fallback 2: Download the image (like a manual share)
      const url = URL.createObjectURL(brandedBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${userData.username}-findernate-qr.png`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Clean up safely
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 100);

      // Show feedback for download
      const button = document.querySelector('[data-qr-share-btn]');
      if (button) {
        const originalText = button.textContent;
        button.textContent = '✓ Downloaded!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }

    } catch (error) {
      console.error('Error sharing QR code:', error);

      // Final fallback: Copy profile URL
      try {
        await navigator.clipboard.writeText(profileUrl);
        const button = document.querySelector('[data-qr-share-btn]');
        if (button) {
          const originalText = button.textContent;
          button.textContent = '✓ Link copied!';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        }
      } catch (clipboardError) {
        console.error('Failed to copy fallback link:', clipboardError);
        // Show error feedback
        const button = document.querySelector('[data-qr-share-btn]');
        if (button) {
          const originalText = button.textContent;
          button.textContent = '❌ Share failed';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        }
      }
    } finally {
      setSharingQR(false);
    }
  };


  const handleShareExternal = () => {
    if (navigator.share) {
      navigator.share({
        title: `Check out ${userData.fullName} on FinderNate`,
        text: `Connect with ${userData.fullName} (@${userData.username}) on FinderNate`,
        url: profileUrl,
      }).catch(console.error);
    } else {
      // Fallback for browsers that don't support Web Share API
      window.open(`https://twitter.com/intent/tweet?text=Check out ${userData.fullName} (@${userData.username}) on FinderNate&url=${encodeURIComponent(profileUrl)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg w-full mx-4 p-6"
        style={{ maxWidth: `${modalWidth}rem` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-yellow-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Share Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Profile Preview */}
        <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
          {userData.profileImageUrl ? (
            <img
              src={userData.profileImageUrl}
              alt={userData.fullName}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold">
              {userData.fullName?.charAt(0)?.toUpperCase() || userData.username?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{userData.fullName}</h3>
            <p className="text-sm text-gray-500 truncate">@{userData.username}</p>
          </div>
        </div>

        {/* Share Options */}
        <div className="space-y-3">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Copy className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {copied ? 'Copied!' : 'Copy Link'}
              </div>
              
            </div>
          </button>

          {/* External Share */}
          <button
            onClick={handleShareExternal}
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">Share Externally</div>
              <div className="text-sm text-gray-500">Social media, apps, etc.</div>
            </div>
          </button>
        </div>

        {/* QR Code Display */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
          {qrCodeLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 animate-spin rounded-full border-4 border-yellow-600 border-t-transparent mb-3" />
              <p className="text-gray-600 text-sm">Generating QR Code...</p>
            </div>
          ) : qrCodeUrl ? (
            <>
              <div className="mb-3">
                {/* Use regular img tag instead of Next.js Image to avoid domain configuration issues */}
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  width={200}
                  height={200}
                  className="mx-auto rounded-lg"
                  style={{ maxWidth: '200px', maxHeight: '200px' }}
                />
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleShareQR}
                  data-qr-share-btn
                  disabled={sharingQR}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-md hover:bg-yellow-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sharingQR ? (
                    <>
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      Share QR Code
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <QrCode className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 text-sm">QR Code will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

interface ProfilePictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  userName: string;
}

export default function ProfilePictureModal({ isOpen, onClose, imageUrl, userName }: ProfilePictureModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-800 bg-opacity-50 hover:bg-opacity-75 transition-all duration-200 z-10"
        aria-label="Close"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Profile picture container */}
      <div
        className="relative max-w-3xl max-h-[90vh] w-full mx-4 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full aspect-square">
          <Image
            src={imageUrl}
            alt={`${userName}'s profile picture`}
            fill
            className="rounded-lg object-contain"
            priority
            sizes="(max-width: 768px) 90vw, 768px"
          />
        </div>

        {/* User name label */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 rounded-b-lg">
          <p className="text-white text-center font-semibold">{userName}</p>
        </div>
      </div>
    </div>
  );
}

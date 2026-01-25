"use client";

import React from 'react';
import { X, Ban, AlertTriangle } from 'lucide-react';

interface BlockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  username: string;
  isBlocking?: boolean;
}

const BlockConfirmModal: React.FC<BlockConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  username,
  isBlocking = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Block @{username}?</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isBlocking}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Warning Content */}
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">This action will:</p>
            </div>
          </div>
          
          <ul className="space-y-2 text-sm text-gray-700 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>Prevent <strong>@{username}</strong> from messaging you</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>Hide their posts and stories from your feed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>Remove them from your followers/following list</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>They won't be notified that you blocked them</span>
            </li>
          </ul>
          
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              You can unblock them anytime from your profile settings, but you'll need to follow them again manually.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isBlocking}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isBlocking}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBlocking ? (
              <>
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Blocking...
              </>
            ) : (
              <>
                <Ban className="w-4 h-4" />
                Block @{username}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockConfirmModal;
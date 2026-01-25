import React, { useEffect, useRef, useState } from 'react';
import { Trash2, UserX } from 'lucide-react';

interface ContextMenuProps {
  messageId: string;
  messageTimestamp: string;
  x: number;
  y: number;
  onDelete: (messageId: string, deleteType: 'for_everyone' | 'for_me') => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  messageId,
  messageTimestamp,
  x,
  y,
  onDelete,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  // Check if message is within 24 hours
  const messageTime = new Date(messageTimestamp).getTime();
  const now = Date.now();
  const hoursSinceMessage = (now - messageTime) / (1000 * 60 * 60);
  const canDeleteForEveryone = hoursSinceMessage < 24;

  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      // Check right boundary
      if (x + menuRect.width / 2 > viewportWidth) {
        adjustedX = viewportWidth - menuRect.width / 2 - 10;
      }

      // Check left boundary
      if (x - menuRect.width / 2 < 0) {
        adjustedX = menuRect.width / 2 + 10;
      }

      // Check bottom boundary
      if (y + menuRect.height > viewportHeight) {
        adjustedY = viewportHeight - menuRect.height - 10;
      }

      // Check top boundary
      if (adjustedY < 0) {
        adjustedY = 10;
      }

      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px]"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -10px)'
        }}
      >
        {canDeleteForEveryone && (
          <button
            onClick={() => {
              onDelete(messageId, 'for_everyone');
              onClose();
            }}
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete for Everyone
          </button>
        )}
        <button
          onClick={() => {
            onDelete(messageId, 'for_me');
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
        >
          <UserX className="w-4 h-4" />
          Delete for Me
        </button>
        {!canDeleteForEveryone && (
          <p className="px-3 py-1 text-xs text-gray-500 border-t border-gray-100">
            Can only delete for everyone within 24h
          </p>
        )}
      </div>
    </>
  );
};
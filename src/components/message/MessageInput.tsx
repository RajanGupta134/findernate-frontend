import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { Send, Paperclip, Smile, Trash2, Ban, X, Type, ChevronDown } from 'lucide-react';
import EmojiPicker, { EmojiClickData, EmojiStyle } from 'emoji-picker-react';
import { FontStyle, FontFamily, FontSize } from '@/types';

const fontFamilyOptions: { value: FontFamily; label: string; className: string }[] = [
  { value: 'default', label: 'Default', className: 'font-sans' },
  { value: 'serif', label: 'Serif', className: 'font-serif' },
  { value: 'mono', label: 'Mono', className: 'font-mono' },
  { value: 'cursive', label: 'Cursive', className: 'font-cursive' },
  { value: 'fantasy', label: 'Fantasy', className: 'font-fantasy' },
];

const fontSizeOptions: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'base', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'xl', label: 'XL' },
];

const getFontClasses = (fontStyle: FontStyle): string => {
  const familyClass = fontFamilyOptions.find(f => f.value === fontStyle.fontFamily)?.className || 'font-sans';
  const sizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }[fontStyle.fontSize];
  return `${familyClass} ${sizeClass}`;
};

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: (e: React.FormEvent, fontStyle?: FontStyle) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileUpload: () => void;
  onRemoveFile: () => void;
  onEmojiClick: () => void;
  onEmojiSelect: (emojiData: EmojiClickData) => void;
  sendingMessage: boolean;
  uploadingFile: boolean;
  selectedFile: File | null;
  filePreview: string | null;
  showEmojiPicker: boolean;
  emojiPickerRef: React.RefObject<HTMLDivElement | null>;
  messageInputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isBlocked?: boolean;
  blockedUserInfo?: {
    username: string;
    onUnblock: () => void;
    isUnblocking?: boolean;
  };
  keyboardVisible?: boolean;
  onScrollToBottom?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  onInputChange,
  onFileSelect,
  onFileUpload,
  onRemoveFile,
  onEmojiClick,
  onEmojiSelect,
  sendingMessage,
  uploadingFile,
  selectedFile,
  filePreview,
  showEmojiPicker,
  emojiPickerRef,
  messageInputRef,
  fileInputRef,
  isBlocked = false,
  blockedUserInfo,
  keyboardVisible = false,
  onScrollToBottom
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [fontStyle, setFontStyle] = useState<FontStyle>({ fontFamily: 'default', fontSize: 'base' });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-font-button]')) {
          setShowFontDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent keyboard from dismissing on mobile by keeping focus
    // Store current focus state before any async operations
    const inputElement = messageInputRef.current;

    // Use requestAnimationFrame to ensure focus is maintained smoothly
    // This prevents the keyboard from flickering on mobile devices
    if (inputElement) {
      // Keep input focused during send to prevent keyboard dismiss
      inputElement.focus();
    }

    onSendMessage(e, fontStyle);

    // Re-ensure focus after send completes (for async operations)
    requestAnimationFrame(() => {
      if (inputElement) {
        inputElement.focus();
      }
      // Scroll to bottom after sending
      onScrollToBottom?.();
    });
  };

  // Show blocked user message instead of input
  if (isBlocked && blockedUserInfo) {
    return (
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Ban className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-gray-700 text-sm mb-1">
              You have blocked <span className="font-medium">@{blockedUserInfo.username}</span>
            </p>
            <p className="text-gray-500 text-xs mb-4">
              Unblock them to send messages
            </p>
            <button
              onClick={blockedUserInfo.onUnblock}
              disabled={blockedUserInfo.isUnblocking}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              {blockedUserInfo.isUnblocking ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Unblocking...
                </>
              ) : (
                <>
                  Unblock @{blockedUserInfo.username}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fontClasses = getFontClasses(fontStyle);

  return (
    <div
      ref={containerRef}
      className="pl-4 pr-2 py-3 sm:px-4 sm:pb-4 border-t border-gray-200 bg-white relative"
      style={{
        paddingBottom: keyboardVisible ? '0.75rem' : 'max(0.75rem, env(safe-area-inset-bottom))',
        transition: 'padding-bottom 0.1s ease-out'
      }}
    >
      {selectedFile && (
        <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {filePreview ? (
                <Image
                  src={filePreview}
                  alt="File preview"
                  width={32}
                  height={32}
                  className="rounded object-cover w-8 h-8 sm:w-10 sm:h-10"
                />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded flex items-center justify-center">
                  <Paperclip className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={onRemoveFile}
              className="p-0.5 sm:p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onFileUpload}
          disabled={uploadingFile}
          className="p-1 sm:p-2 shrink-0 text-gray-500 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
        >
          <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          onChange={onFileSelect}
          className="hidden"
          accept="image/*,video/*"
        />

        <div className="relative flex-1 min-w-0">
          <input
            ref={messageInputRef}
            type="text"
            placeholder={selectedFile ? "Caption..." : "Message..."}
            value={newMessage}
            onChange={onInputChange}
            disabled={uploadingFile}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            className={`w-full py-2.5 sm:py-3 pl-3 sm:pl-4 pr-14 sm:pr-20 border border-gray-300 rounded-full focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 text-black placeholder-gray-400 text-sm sm:text-base ${fontClasses}`}
          />
          <div className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={onEmojiClick}
              disabled={uploadingFile}
              className={`p-0.5 sm:p-1 rounded transition-colors disabled:opacity-50 ${
                showEmojiPicker
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-font-button
              onClick={() => setShowFontDropdown(!showFontDropdown)}
              disabled={uploadingFile}
              className={`p-0.5 sm:p-1 rounded transition-colors disabled:opacity-50 flex items-center ${
                showFontDropdown
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Type className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 hidden sm:inline-block" />
            </button>
          </div>

          {/* Font Dropdown */}
          {showFontDropdown && (
            <div
              ref={fontDropdownRef}
              className="absolute right-0 bottom-full mb-2 z-[10000] bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px]"
            >
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Font Style</label>
                <div className="space-y-1">
                  {fontFamilyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFontStyle({ ...fontStyle, fontFamily: option.value })}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${option.className} ${
                        fontStyle.fontFamily === option.value
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Size</label>
                <div className="flex gap-1">
                  {fontSizeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFontStyle({ ...fontStyle, fontSize: option.value })}
                      className={`flex-1 px-2 py-1.5 rounded text-xs transition-colors ${
                        fontStyle.fontSize === option.value
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={(!newMessage.trim() && !selectedFile) || uploadingFile}
          className="p-2 sm:p-3 shrink-0 bg-[#DBB42C] hover:bg-yellow-500 text-white rounded-full transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {uploadingFile ? (
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>
      </form>

      {showEmojiPicker && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-[9999] sm:hidden"
            onClick={onEmojiClick}
          />

          <div
            ref={emojiPickerRef}
            className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:left-auto sm:right-8 z-[10000] max-w-full sm:max-w-none"
          >
            <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl border-t sm:border border-gray-200 overflow-hidden">
              {/* Close button */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                <span className="text-sm font-medium text-gray-700">Select Emoji</span>
                <button
                  onClick={onEmojiClick}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-600 hover:text-gray-900"
                  aria-label="Close emoji picker"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <EmojiPicker
                onEmojiClick={onEmojiSelect}
                width="100%"
                height={400}
                searchDisabled={false}
                skinTonesDisabled={false}
                previewConfig={{
                  showPreview: true
                }}
                emojiStyle={EmojiStyle.GOOGLE}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

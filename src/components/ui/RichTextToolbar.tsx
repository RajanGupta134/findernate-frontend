'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Smile, Type, ChevronDown } from 'lucide-react';
import EmojiPicker, { EmojiClickData, EmojiStyle } from 'emoji-picker-react';

export type FontFamily = 'default' | 'serif' | 'mono' | 'cursive' | 'fantasy';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface FontStyle {
  fontFamily: FontFamily;
  fontSize: FontSize;
}

interface RichTextToolbarProps {
  onEmojiSelect: (emoji: string) => void;
  onFontChange: (fontStyle: FontStyle) => void;
  currentFont: FontStyle;
  showEmojiPicker?: boolean;
  showFontPicker?: boolean;
  disabled?: boolean;
  className?: string;
}

const fontFamilyOptions: { value: FontFamily; label: string; className: string }[] = [
  { value: 'default', label: 'Default', className: 'font-sans' },
  { value: 'serif', label: 'Serif', className: 'font-serif' },
  { value: 'mono', label: 'Mono', className: 'font-mono' },
  { value: 'cursive', label: 'Cursive', className: 'font-cursive' },
  { value: 'fantasy', label: 'Fantasy', className: 'font-fantasy' },
];

const fontSizeOptions: { value: FontSize; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'base', label: 'Normal' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
];

export const getFontClasses = (fontStyle: FontStyle): string => {
  const familyClass = fontFamilyOptions.find(f => f.value === fontStyle.fontFamily)?.className || 'font-sans';
  const sizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }[fontStyle.fontSize];
  return `${familyClass} ${sizeClass}`;
};

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  onEmojiSelect,
  onFontChange,
  currentFont,
  showEmojiPicker: enableEmoji = true,
  showFontPicker: enableFont = true,
  disabled = false,
  className = '',
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fontDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        const isEmojiButton = target.closest('[data-emoji-button]');
        if (!isEmojiButton) {
          setShowEmojiPicker(false);
        }
      }
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        const isFontButton = target.closest('[data-font-button]');
        if (!isFontButton) {
          setShowFontDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Emoji Button */}
      {enableEmoji && (
        <div className="relative">
          <button
            type="button"
            data-emoji-button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className={`p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              showEmojiPicker
                ? 'bg-yellow-100 text-yellow-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Add emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          {showEmojiPicker && (
            <>
              {/* Mobile backdrop */}
              <div
                className="fixed inset-0 bg-black/20 z-[9999] sm:hidden"
                onClick={() => setShowEmojiPicker(false)}
              />
              <div
                ref={emojiPickerRef}
                className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto sm:left-0 sm:top-full sm:mt-1 z-[10000]"
              >
                <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl border-t sm:border border-gray-200 overflow-hidden">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width={window.innerWidth < 640 ? '100%' : 320}
                    height={350}
                    searchDisabled={false}
                    skinTonesDisabled={false}
                    previewConfig={{ showPreview: false }}
                    emojiStyle={EmojiStyle.GOOGLE}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Font Button */}
      {enableFont && (
        <div className="relative">
          <button
            type="button"
            data-font-button
            onClick={() => setShowFontDropdown(!showFontDropdown)}
            disabled={disabled}
            className={`p-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-0.5 ${
              showFontDropdown
                ? 'bg-yellow-100 text-yellow-600'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Font options"
          >
            <Type className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </button>

          {showFontDropdown && (
            <div
              ref={fontDropdownRef}
              className="absolute left-0 top-full mt-1 z-[10000] bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px]"
            >
              {/* Font Family */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Font Style</label>
                <div className="space-y-1">
                  {fontFamilyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onFontChange({ ...currentFont, fontFamily: option.value });
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${option.className} ${
                        currentFont.fontFamily === option.value
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Font Size</label>
                <div className="flex gap-1">
                  {fontSizeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onFontChange({ ...currentFont, fontSize: option.value });
                      }}
                      className={`flex-1 px-2 py-1.5 rounded text-xs transition-colors ${
                        currentFont.fontSize === option.value
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
      )}
    </div>
  );
};

export default RichTextToolbar;

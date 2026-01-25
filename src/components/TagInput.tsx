'use client'
import React, { useState, useRef, useEffect } from 'react'
import { Smile, Type, ChevronDown } from 'lucide-react'
import EmojiPicker, { EmojiClickData, EmojiStyle } from 'emoji-picker-react'

export type FontFamily = 'default' | 'serif' | 'mono' | 'cursive' | 'fantasy';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface FontStyle {
  fontFamily: FontFamily;
  fontSize: FontSize;
}

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

interface TagInputProps {
  tags: string[]
  setTags: (tags: string[]) => void
  enableEmoji?: boolean
  enableFontCustomization?: boolean
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  setTags,
  enableEmoji = true,
  enableFontCustomization = true
}) => {
  const [tagInput, setTagInput] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showFontDropdown, setShowFontDropdown] = useState(false)
  const [fontStyle, setFontStyle] = useState<FontStyle>({ fontFamily: 'default', fontSize: 'base' })
  const [isMobile, setIsMobile] = useState(false)
  const MAX_TAGS = 15;

  const inputRef = useRef<HTMLInputElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const fontDropdownRef = useRef<HTMLDivElement>(null)

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setTagInput(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;

    if (tags.length >= MAX_TAGS) {
      return;
    }

    const rawTags = tagInput.split(/[,;\s]+/);

    const formattedTags = rawTags
      .map(tag => tag.trim())
      .map(tag => tag.replace(/^#+/, ''))
      .filter(tag => tag !== '')
      .map(tag => tag.toLowerCase());

    const uniqueTags = Array.from(new Set([...tags, ...formattedTags]));
    const limitedTags = uniqueTags.slice(0, MAX_TAGS);

    setTags(limitedTags);
    setTagInput('');
  };

  const handleRemove = (i: number) => {
    const updated = [...tags]
    updated.splice(i, 1)
    setTags(updated)
  }

  const isAtLimit = tags.length >= MAX_TAGS;
  const showToolbar = enableEmoji || enableFontCustomization;
  const fontClasses = showToolbar ? getFontClasses(fontStyle) : '';

  // Responsive placeholder text
  const getPlaceholder = () => {
    if (isAtLimit) return "Maximum tags reached";
    if (isMobile) {
      return "Add tags...";
    }
    return "Add tags separated by commas or spaces";
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-1">
        <label className="block text-sm font-medium text-gray-700">Tags</label>
        <span className={`text-xs ${isAtLimit ? 'text-red-500' : 'text-gray-500'}`}>
          {tags.length}/{MAX_TAGS}
        </span>
      </div>
      <div className="flex gap-1 sm:gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isAtLimit && handleAddTag()}
            placeholder={getPlaceholder()}
            disabled={isAtLimit}
            className={`w-full px-3 sm:px-4 py-2 text-sm sm:text-base ${showToolbar ? 'pr-16 sm:pr-16' : ''} border rounded-md focus:outline-none focus:ring-2 ${fontClasses} ${
              isAtLimit
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-black focus:ring-yellow-500'
            }`}
          />

          {/* Toolbar Icons */}
          {showToolbar && !isAtLimit && (
            <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1">
              {enableEmoji && (
                <button
                  type="button"
                  data-emoji-button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-1 rounded transition-colors ${
                    showEmojiPicker
                      ? 'text-yellow-500 hover:text-yellow-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Smile className="w-4 h-4" />
                </button>
              )}

              {enableFontCustomization && (
                <button
                  type="button"
                  data-font-button
                  onClick={() => setShowFontDropdown(!showFontDropdown)}
                  className={`p-1 rounded transition-colors flex items-center ${
                    showFontDropdown
                      ? 'text-yellow-500 hover:text-yellow-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Type className="w-4 h-4" />
                  <ChevronDown className="w-3 h-3 hidden sm:inline-block" />
                </button>
              )}
            </div>
          )}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <>
              <div
                className="fixed inset-0 bg-black/20 z-[9999] sm:hidden"
                onClick={() => setShowEmojiPicker(false)}
              />
              <div
                ref={emojiPickerRef}
                className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-full sm:mt-1 z-[10000]"
              >
                <div className="bg-white rounded-t-2xl sm:rounded-lg shadow-2xl border-t sm:border border-gray-200 overflow-hidden">
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    width={typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : 320}
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

          {/* Font Dropdown */}
          {showFontDropdown && (
            <div
              ref={fontDropdownRef}
              className="absolute right-0 top-full mt-1 z-[10000] bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px]"
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
          type="button"
          onClick={handleAddTag}
          disabled={isAtLimit || !tagInput.trim()}
          className={`px-3 sm:px-4 py-2 rounded-md transition-colors text-sm sm:text-base whitespace-nowrap ${
            isAtLimit || !tagInput.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-yellow-500 text-black hover:bg-yellow-600'
          }`}
        >
          Add
        </button>
      </div>
      {isAtLimit && (
        <p className="text-xs text-red-500 mt-1">
          Maximum of {MAX_TAGS} tags allowed. Remove some tags to add new ones.
        </p>
      )}

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className={`flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm ${fontClasses}`}
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="ml-2 text-yellow-600 hover:text-yellow-800"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default TagInput

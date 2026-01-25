'use client';

import React, { forwardRef, TextareaHTMLAttributes, useState, useRef, useEffect } from 'react';
import { Smile, Type, ChevronDown } from 'lucide-react';
import EmojiPicker, { EmojiClickData, EmojiStyle } from 'emoji-picker-react';

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

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id?: string;
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  textareaClassName?: string;
  enableEmoji?: boolean;
  enableFontCustomization?: boolean;
  fontStyle?: FontStyle;
  onFontStyleChange?: (fontStyle: FontStyle) => void;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    id,
    label,
    value,
    onChange,
    placeholder,
    error,
    className,
    textareaClassName,
    enableEmoji = false,
    enableFontCustomization = false,
    fontStyle: externalFontStyle,
    onFontStyleChange,
    rows = 3,
    ...rest
  }: TextareaProps, ref) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showFontDropdown, setShowFontDropdown] = useState(false);
    const [internalFontStyle, setInternalFontStyle] = useState<FontStyle>({ fontFamily: 'default', fontSize: 'base' });
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const fontDropdownRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const fontStyle = externalFontStyle || internalFontStyle;
    const setFontStyle = onFontStyleChange || setInternalFontStyle;

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
      const newValue = value + emojiData.emoji;
      const syntheticEvent = {
        target: { value: newValue, name: rest.name || '' },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      onChange(syntheticEvent);
      setShowEmojiPicker(false);
      const textareaElement = (ref as React.RefObject<HTMLTextAreaElement>)?.current || textareaRef.current;
      textareaElement?.focus();
    };

    const showToolbar = enableEmoji || enableFontCustomization;
    const fontClasses = showToolbar ? getFontClasses(fontStyle) : '';

    const baseTextareaClasses = `
      w-full px-4 py-3 pr-16
      text-black placeholder:text-gray-400
      border border-gray-300 rounded-lg
      focus:ring-2 focus:ring-yellow-500 focus:border-transparent
      outline-none transition-all resize-none
    `;

    const errorTextareaClasses = error ? `border-red-500 focus:ring-red-500 focus:border-red-500` : '';
    const errorMessageClasses = `mt-1 text-sm text-red-600`;

    const finalTextareaClasses = `${baseTextareaClasses} ${errorTextareaClasses} ${fontClasses} ${textareaClassName || ''}`.trim();

    return (
      <>
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className={`mb-3 ${className || ''}`}>
          <div className="relative">
            <textarea
              id={id}
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              className={finalTextareaClasses}
              ref={ref || textareaRef}
              rows={rows}
              {...rest}
            />

            {/* Toolbar Icons */}
            {showToolbar && (
              <div className="absolute right-3 top-3 flex items-center gap-1">
                {enableEmoji && (
                  <button
                    type="button"
                    data-emoji-button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={rest.disabled}
                    className={`p-1 rounded transition-colors disabled:opacity-50 ${
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
                    disabled={rest.disabled}
                    className={`p-1 rounded transition-colors disabled:opacity-50 flex items-center ${
                      showFontDropdown
                        ? 'text-yellow-500 hover:text-yellow-600'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Type className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3" />
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
          {error && <p className={errorMessageClasses}>{error}</p>}
        </div>
      </>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BusinessPostFormProps } from '@/types';
import { Smile, Type, ChevronDown } from 'lucide-react';
import EmojiPicker, { EmojiClickData, EmojiStyle } from 'emoji-picker-react';

type FontFamily = 'default' | 'serif' | 'mono' | 'cursive' | 'fantasy';
type FontSize = 'sm' | 'base' | 'lg' | 'xl';

interface FontStyle {
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

interface RichInputProps {
  type?: 'text' | 'number' | 'date';
  name: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  isTextarea?: boolean;
  rows?: number;
  min?: string;
  max?: string;
  fontStyle: FontStyle;
  onFontStyleChange: (style: FontStyle) => void;
}

const RichInput: React.FC<RichInputProps> = ({
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  isTextarea = false,
  rows = 3,
  min,
  max,
  fontStyle,
  onFontStyleChange,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-emoji-button]')) {
          setShowEmojiPicker(false);
        }
      }
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

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    const newValue = String(value) + emojiData.emoji;
    const syntheticEvent = {
      target: { name, value: newValue, type: 'text' },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const fontClasses = getFontClasses(fontStyle);
  const isNumericOrDate = type === 'number' || type === 'date';

  const baseClasses = `w-full p-3 text-black border border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 ${fontClasses}`;

  return (
    <div className="relative">
      {isTextarea ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`${baseClasses} pr-16`}
          rows={rows}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          className={`${baseClasses} ${!isNumericOrDate ? 'pr-16' : ''}`}
        />
      )}

      {/* Toolbar Icons - only for text inputs */}
      {!isNumericOrDate && (
        <div className={`absolute right-3 ${isTextarea ? 'top-3' : 'top-1/2 -translate-y-1/2'} flex items-center gap-1`}>
          <button
            type="button"
            data-emoji-button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-1 rounded transition-colors ${
              showEmojiPicker ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Smile className="w-4 h-4" />
          </button>
          <button
            type="button"
            data-font-button
            onClick={() => setShowFontDropdown(!showFontDropdown)}
            className={`p-1 rounded transition-colors flex items-center ${
              showFontDropdown ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Type className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[9999] sm:hidden" onClick={() => setShowEmojiPicker(false)} />
          <div
            ref={emojiPickerRef}
            className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-auto sm:right-0 sm:top-full sm:mt-1 z-[10000]"
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
                  onClick={() => onFontStyleChange({ ...fontStyle, fontFamily: option.value })}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${option.className} ${
                    fontStyle.fontFamily === option.value ? 'bg-yellow-100 text-yellow-800' : 'hover:bg-gray-100 text-gray-700'
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
                  onClick={() => onFontStyleChange({ ...fontStyle, fontSize: option.value })}
                  className={`flex-1 px-2 py-1.5 rounded text-xs transition-colors ${
                    fontStyle.fontSize === option.value ? 'bg-yellow-100 text-yellow-800' : 'hover:bg-gray-100 text-gray-700'
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
  );
};

const BusinessDetailsForm: React.FC<BusinessPostFormProps> = ({
  formData,
  onChange,
}) => {
  const isActive = ['Active', 'inactive'];
  const [fontStyle, setFontStyle] = useState<FontStyle>({ fontFamily: 'default', fontSize: 'base' });

  const safeOnChange = (onChange ??
    (() => {})) as (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

  return (
    <div className="bg-white p-6 rounded-xl shadow mb-6 border-2 border-yellow-500">
      <h3 className="text-lg text-black font-semibold mb-4">Business Details</h3>

      {/* Basic Business Information */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Name
          </label>
          <RichInput
            name="businessName"
            placeholder="e.g., Priya Enterprises"
            value={formData.business.businessName}
            onChange={safeOnChange}
            fontStyle={fontStyle}
            onFontStyleChange={setFontStyle}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Link
          </label>
          <RichInput
            name="link"
            placeholder="https://yourbusiness.com"
            value={formData.business.link}
            onChange={safeOnChange}
            fontStyle={fontStyle}
            onFontStyleChange={setFontStyle}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Description
          </label>
          <RichInput
            name="description"
            placeholder="Describe your business, services, and what makes you unique..."
            value={formData.business.description}
            onChange={safeOnChange}
            isTextarea
            rows={3}
            fontStyle={fontStyle}
            onFontStyleChange={setFontStyle}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Announcement
          </label>
          <RichInput
            name="announcement"
            placeholder="Share any special announcements, updates, or news about your business..."
            value={formData.business.announcement}
            onChange={safeOnChange}
            isTextarea
            rows={3}
            fontStyle={fontStyle}
            onFontStyleChange={setFontStyle}
          />
        </div>
      </div>

      {/* Location Information */}
      <div className="mb-6">
        <h4 className="text-md text-black font-semibold mb-3">Location</h4>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Address
          </label>
          <RichInput
            name="address"
            placeholder="e.g., 123 Main Street, Mumbai, India"
            value={formData.business?.location?.address || ''}
            onChange={safeOnChange}
            fontStyle={fontStyle}
            onFontStyleChange={setFontStyle}
          />
        </div>
      </div>

      {/* Promotions Section */}
      <div className="mb-6">
        <h4 className="text-md text-black font-semibold mb-3">Promotions (Optional)</h4>
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount (%)
              </label>
              <RichInput
                type="number"
                name="discount"
                placeholder="Enter discount percentage"
                min="0"
                max="100"
                value={(formData.business?.promotions?.[0]?.discount ?? 0).toString()}
                onChange={safeOnChange}
                fontStyle={fontStyle}
                onFontStyleChange={setFontStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Promotion Status
              </label>
              <select
                name="isActive"
                value={(formData.business?.promotions?.[0]?.isActive ? 'Active' : 'inactive')}
            onChange={safeOnChange}
                className='w-full p-3 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500'
              >
                {isActive.map((active) => (
                  <option key={active} value={active}>{active}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valid Until
            </label>
            <RichInput
              type="date"
              name="validUntil"
              placeholder="Select expiry date"
              value={formData.business?.promotions?.[0]?.validUntil ?? ''}
                onChange={safeOnChange}
              fontStyle={fontStyle}
              onFontStyleChange={setFontStyle}
            />
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Type
          </label>
          <RichInput
            name="businessType"
            placeholder="e.g., Retail, Service, Restaurant"
            value={formData.business.businessType}
            onChange={safeOnChange}
            fontStyle={fontStyle}
            onFontStyleChange={setFontStyle}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <RichInput
              name="category"
              placeholder="e.g., Food & Beverage"
              value={formData.business.category}
              onChange={safeOnChange}
              fontStyle={fontStyle}
              onFontStyleChange={setFontStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcategory
            </label>
            <RichInput
              name="subcategory"
              placeholder="e.g., Restaurant"
              value={formData.business.subcategory}
              onChange={safeOnChange}
              fontStyle={fontStyle}
              onFontStyleChange={setFontStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessDetailsForm;

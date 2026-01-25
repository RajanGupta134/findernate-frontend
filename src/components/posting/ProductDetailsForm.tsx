'use client';

import { ProductDetailsFormProps } from '@/types';
import React, { useState, useEffect, useRef } from 'react';
import { getProductPreviousData } from '@/api/serviceAutofill';
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
  type?: 'text' | 'number';
  name: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  min?: string;
  fontStyle: FontStyle;
  onFontStyleChange: (style: FontStyle) => void;
}

const RichInput: React.FC<RichInputProps> = ({
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  min,
  fontStyle,
  onFontStyleChange,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  const isNumeric = type === 'number';

  const baseClasses = `w-full p-3 border text-gray-900 border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 ${fontClasses}`;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        className={`${baseClasses} ${!isNumeric ? 'pr-16' : ''}`}
      />

      {!isNumeric && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
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

const ProductDetailsForm: React.FC<ProductDetailsFormProps> = ({
  formData,
  onChange,
}) => {
  const currency = ['INR', 'USD', 'EUR'];
  const [autofillData, setAutofillData] = useState<any>(null);
  const [isLoadingAutofill, setIsLoadingAutofill] = useState(false);
  const [fontStyle, setFontStyle] = useState<FontStyle>({ fontFamily: 'default', fontSize: 'base' });

  useEffect(() => {
    const fetchAutofillData = async () => {
      try {
        setIsLoadingAutofill(true);
        const response = await getProductPreviousData();

        console.log('Product Autofill API Response:', response);

        if (response?.data?.autoFillEnabled && response?.data?.data) {
          console.log('Product autofill data available:', response.data.data);
          setAutofillData(response.data.data);
        } else {
          console.log('Product autofill disabled or no previous data');
          setAutofillData(null);
        }
      } catch (error) {
        console.error('Failed to fetch product autofill data:', error);
        setAutofillData(null);
      } finally {
        setIsLoadingAutofill(false);
      }
    };

    fetchAutofillData();
  }, []);

  useEffect(() => {
    if (autofillData && !isLoadingAutofill) {
      console.log('Automatically applying product autofill with data:', autofillData);

      const fields = [
        { name: 'name', value: autofillData.productName || '' },
        { name: 'price', value: autofillData.price || 0 },
        { name: 'currency', value: autofillData.currency || 'INR' },
      ];

      console.log('Product fields to autofill:', fields);

      fields.forEach(field => {
        const syntheticEvent = {
          target: {
            name: field.name,
            value: field.value,
            type: field.name === 'price' ? 'number' : 'text'
          }
        } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

        console.log('Triggering onChange for field:', field.name, 'with value:', field.value);
        onChange(syntheticEvent);
      });

      console.log('Product autofill completed automatically');
    }
  }, [autofillData, isLoadingAutofill]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md mb-6 border-2 border-yellow-500">
      <div className="mb-4">
        <h3 className="text-lg text-black font-semibold">Product Details</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
          <RichInput
            name="name"
            placeholder="e.g., Handcrafted Silk Saree"
            value={formData.product.name}
            onChange={onChange}
            fontStyle={fontStyle}
            onFontStyleChange={setFontStyle}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
          <RichInput
            type="number"
            name="price"
            min="0"
            placeholder="Enter price"
            value={formData.product.price === 0 ? '' : formData.product.price}
            onChange={onChange}
            fontStyle={fontStyle}
            onFontStyleChange={setFontStyle}
          />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
        <select
          name="currency"
          value={formData.product.currency}
          onChange={onChange}
          className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500
            ${formData.product.currency === '' ? 'text-black' : 'text-gray-900'}`}
        >
          <option value="" disabled className='text-black'>Select currency</option>
          {currency.map((curr: string) => (
            <option key={curr} value={curr}>{curr}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Product Link</label>
        <RichInput
          name="link"
          value={formData.product.link}
          onChange={onChange}
          fontStyle={fontStyle}
          onFontStyleChange={setFontStyle}
        />
      </div>

      <div className="flex items-center mt-4">
        <input
          type="checkbox"
          name="inStock"
          checked={formData.product.inStock}
          onChange={onChange}
          className="mr-2"
        />
        <label className="text-sm text-gray-700">In Stock</label>
      </div>
    </div>
  );
};

export default ProductDetailsForm;

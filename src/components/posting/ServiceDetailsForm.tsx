'use client';

import { ServiceDetailsFormProps } from '@/types';
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Smile, Type } from 'lucide-react';
import { getServicePreviousData } from '@/api/serviceAutofill';
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
  type?: 'text' | 'number' | 'time';
  name: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  required?: boolean;
  disabled?: boolean;
  fontStyle: FontStyle;
  onFontStyleChange: (style: FontStyle) => void;
}

const RichInput: React.FC<RichInputProps> = ({
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  required,
  disabled,
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
  const isNumericOrTime = type === 'number' || type === 'time';

  const baseClasses = `w-full p-3 border text-black border-gray-300 rounded-lg placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 ${fontClasses}`;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`${baseClasses} ${!isNumericOrTime && !disabled ? 'pr-16' : ''} ${disabled ? 'bg-gray-100' : ''}`}
      />

      {!isNumericOrTime && !disabled && (
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

const daysOfWeek = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

const ServiceDetailsForm: React.FC<ServiceDetailsFormProps> = ({
  formData,
  onChange,
}) => {
  const currency = ['INR', 'USD', 'EUR'];
  const [showSchedule, setShowSchedule] = useState(false);
  const [autofillData, setAutofillData] = useState<any>(null);
  const [isLoadingAutofill, setIsLoadingAutofill] = useState(false);
  const [fontStyle, setFontStyle] = useState<FontStyle>({ fontFamily: 'default', fontSize: 'base' });

  const [schedule, setSchedule] = useState(
    daysOfWeek.reduce((acc, day) => {
      acc[day] = { isClosed: false, startTime: '09:00', endTime: '18:00' };
      return acc;
    }, {} as Record<string, { isClosed: boolean; startTime: string; endTime: string }>)
  );

  const handleScheduleChange = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const toggleClosed = (day: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isClosed: !prev[day].isClosed,
      },
    }));
  };

  useEffect(() => {
    const fetchAutofillData = async () => {
      try {
        setIsLoadingAutofill(true);
        const response = await getServicePreviousData();

        console.log('Autofill API Response:', response);

        if (response?.data?.autoFillEnabled && response?.data?.data) {
          console.log('Autofill data available:', response.data.data);
          setAutofillData(response.data.data);
        } else {
          console.log('Autofill disabled or no previous data');
          setAutofillData(null);
        }
      } catch (error) {
        console.error('Failed to fetch autofill data:', error);
        setAutofillData(null);
      } finally {
        setIsLoadingAutofill(false);
      }
    };

    fetchAutofillData();
  }, []);

  useEffect(() => {
    if (autofillData && !isLoadingAutofill) {
      console.log('Automatically applying autofill with data:', autofillData);

      const fields = [
        { name: 'name', value: autofillData.serviceName || '' },
        { name: 'description', value: autofillData.description || '' },
        { name: 'price', value: autofillData.price || 0 },
        { name: 'currency', value: autofillData.currency || 'INR' },
        { name: 'address', value: autofillData.location?.address || '' },
        { name: 'city', value: autofillData.location?.city || '' },
        { name: 'state', value: autofillData.location?.state || '' },
        { name: 'country', value: autofillData.location?.country || '' }
      ];

      console.log('Fields to autofill:', fields);

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

      console.log('Autofill completed automatically');
    }
  }, [autofillData, isLoadingAutofill]);

  return (
    <div className="bg-white p-6 rounded-xl shadow mb-6 border-2 border-yellow-500">
      <div className="mb-4">
        <h3 className="text-lg text-black font-bold">Service Details</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
          <RichInput
            name="name"
            placeholder="e.g., Plumbing, Tutoring"
            value={formData.service.name}
            onChange={onChange}
            required
            fontStyle={fontStyle}
            onFontStyleChange={setFontStyle}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
          <RichInput
            type="number"
            name="price"
            placeholder="Enter price"
            value={formData.service.price === 0 ? '' : formData.service.price}
            onChange={onChange}
            required
            fontStyle={fontStyle}
            onFontStyleChange={setFontStyle}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <RichInput
          name="description"
          placeholder="Service Description..."
          value={formData.service.description}
          onChange={onChange}
          required
          fontStyle={fontStyle}
          onFontStyleChange={setFontStyle}
        />
        <select
          name="currency"
          value={formData.service.currency}
          onChange={onChange}
          className={`w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500
            ${formData.service.currency === '' ? 'text-gray-500' : 'text-gray-900'}`}
          required
        >
          <option value="" disabled>Select currency</option>
          {currency.map((curr) => (
            <option key={curr} value={curr}>{curr}</option>
          ))}
        </select>
      </div>
      <div className='mb-4'>
        <label className="block text-sm font-medium text-gray-700 mb-1">Service Link</label>
        <RichInput
          name="link"
          value={formData.service.link}
          onChange={onChange}
          required
          fontStyle={fontStyle}
          onFontStyleChange={setFontStyle}
        />
      </div>

      {/* Schedule Section - Collapsible */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black">Schedule (Optional)</h3>
          <button
            type="button"
            onClick={() => setShowSchedule(!showSchedule)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all text-sm font-medium border border-gray-300"
          >
            <span>{showSchedule ? 'Hide Schedule' : 'Add Schedule'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showSchedule ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showSchedule && (
          <div className="border border-gray-300 rounded-lg p-4 space-y-4 bg-gray-50">
            {daysOfWeek.map(day => (
              <div key={day} className="border border-yellow-300 rounded-lg shadow-sm p-4 bg-white">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-md text-black font-semibold">{day}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">{schedule[day].isClosed ? 'Closed' : 'Open'}</span>
                    <button
                      type="button"
                      onClick={() => toggleClosed(day)}
                      className={`w-10 h-5 rounded-full transition-colors duration-300 ${
                        schedule[day].isClosed ? 'bg-gray-400' : 'bg-yellow-500'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-300 ${
                          schedule[day].isClosed ? 'translate-x-0' : 'translate-x-5'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="startTime"
                    type="time"
                    disabled={schedule[day].isClosed}
                    value={schedule[day].startTime}
                    onChange={(e) => handleScheduleChange(day, 'startTime', e.target.value)}
                    placeholder="Start Time"
                    className="w-full p-2 border text-gray-900 border-gray-300 rounded-md focus:ring-yellow-500 disabled:bg-gray-100"
                  />
                  <input
                    name="endTime"
                    type="time"
                    disabled={schedule[day].isClosed}
                    value={schedule[day].endTime}
                    onChange={(e) => handleScheduleChange(day, 'endTime', e.target.value)}
                    placeholder="End Time"
                    className="w-full p-2 border text-gray-900 border-gray-300 rounded-md focus:ring-yellow-500 disabled:bg-gray-100"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-black mb-4">Location Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <RichInput
              name="address"
              placeholder="Enter address"
              value={formData.service.location.address}
              onChange={onChange}
              required
              fontStyle={fontStyle}
              onFontStyleChange={setFontStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Place/City</label>
            <RichInput
              name="city"
              placeholder='Enter city'
              value={formData.service.location.city}
              onChange={onChange}
              required
              fontStyle={fontStyle}
              onFontStyleChange={setFontStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <RichInput
              name="state"
              placeholder="Enter state"
              value={formData.service.location.state}
              onChange={onChange}
              required
              fontStyle={fontStyle}
              onFontStyleChange={setFontStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <RichInput
              name="country"
              placeholder='Enter country'
              value={formData.service.location.country}
              onChange={onChange}
              required
              fontStyle={fontStyle}
              onFontStyleChange={setFontStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
            <RichInput
              name="requirements"
              placeholder="Enter requirements for your services"
              value={formData.service.requirements.join(', ')}
              onChange={onChange}
              required
              fontStyle={fontStyle}
              onFontStyleChange={setFontStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deliverables</label>
            <RichInput
              name="deliverables"
              placeholder='Enter deliverables for your services'
              value={formData.service.deliverables.join(', ')}
              onChange={onChange}
              required
              fontStyle={fontStyle}
              onFontStyleChange={setFontStyle}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailsForm;

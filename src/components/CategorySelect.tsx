'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  className?: string;
}

const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  categories,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (category: string) => {
    onChange(category);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ zIndex: 'auto' }}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 border border-gray-300 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white flex items-center justify-between"
      >
        <span className="text-left flex-1 truncate">{value}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg overflow-y-auto"
          style={{
            top: '100%',
            marginTop: '4px',
            maxHeight: '256px',
            zIndex: 10002,
            position: 'absolute'
          }}
        >
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => handleSelect(category)}
              className={`
                w-full text-left px-4 py-3 transition-colors
                hover:bg-gray-100 active:bg-gray-200
                ${value === category ? 'bg-yellow-50 text-yellow-700 font-medium' : 'text-gray-900'}
                border-b border-gray-100 last:border-b-0
              `}
            >
              {category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategorySelect;

'use client';
import { Search } from 'lucide-react';
import { forwardRef } from 'react';

interface searchBarProps {
  onChange: React.ChangeEventHandler<HTMLElement>;
  placeholder: string;
  className?: string;
  value?: string;
  disabled?: boolean;
}

const SearchBar = forwardRef<HTMLInputElement, searchBarProps>(({
  onChange,
  placeholder,
  className,
  value,
  disabled = false
}, ref) => {
  return (
    <div className="relative w-full max-w-[54rem]">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600">
        <Search className="w-4 h-4" />
      </div>
      <input
        ref={ref}
        type="text"
        onChange={onChange}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pl-14 pr-12 py-6 text-black placeholder-gray-500 rounded-2xl border border-gray-200 bg-white/70 backdrop-blur-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-yellow-300/40 focus:border-yellow-400 transition-all duration-200 hover:shadow-md ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      />
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;

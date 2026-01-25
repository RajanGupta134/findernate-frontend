import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { Chat, messageAPI } from '@/api/message';

interface ChatThemeColorPickerProps {
  selected: Chat;
  onThemeChange?: (themeColor: string) => void;
}

// Wide range of vibrant and subtle colors for chat themes
const THEME_COLORS = [
  // Default and classic colors
  { name: 'Golden Yellow', color: '#DBB42C' },
  { name: 'Blue', color: '#3B82F6' },
  { name: 'Purple', color: '#9333EA' },
  { name: 'Pink', color: '#EC4899' },
  { name: 'Red', color: '#EF4444' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Green', color: '#10B981' },
  { name: 'Teal', color: '#14B8A6' },
  { name: 'Indigo', color: '#6366F1' },

  // Vibrant colors
  { name: 'Hot Pink', color: '#FF1493' },
  { name: 'Coral', color: '#FF6B6B' },
  { name: 'Lime', color: '#84CC16' },
  { name: 'Cyan', color: '#06B6D4' },
  { name: 'Violet', color: '#8B5CF6' },
  { name: 'Rose', color: '#F43F5E' },
  { name: 'Amber', color: '#F59E0B' },

  // Subtle and elegant colors
  { name: 'Slate Blue', color: '#6B7280' },
  { name: 'Sage', color: '#84A98C' },
  { name: 'Lavender', color: '#A78BFA' },
  { name: 'Peach', color: '#FDBA74' },
  { name: 'Mint', color: '#6EE7B7' },
  { name: 'Sky', color: '#7DD3FC' },
  { name: 'Mauve', color: '#C084FC' },
  { name: 'Salmon', color: '#FCA5A5' },

  // Deep and rich colors
  { name: 'Navy', color: '#1E3A8A' },
  { name: 'Burgundy', color: '#991B1B' },
  { name: 'Forest', color: '#166534' },
  { name: 'Plum', color: '#6B21A8' },
  { name: 'Chocolate', color: '#92400E' },
  { name: 'Crimson', color: '#DC2626' },

  // Modern and trendy colors
  { name: 'Turquoise', color: '#2DD4BF' },
  { name: 'Fuchsia', color: '#D946EF' },
  { name: 'Emerald', color: '#059669' },
  { name: 'Ruby', color: '#BE123C' },
  { name: 'Sapphire', color: '#1D4ED8' },
  { name: 'Gold', color: '#CA8A04' },
];

export const ChatThemeColorPicker: React.FC<ChatThemeColorPickerProps> = ({
  selected,
  onThemeChange
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState(selected.themeColor || '#DBB42C');
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastColorRef = useRef<string>(selected.themeColor || '#DBB42C');
  const isUpdatingRef = useRef<boolean>(false);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColorPicker && colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        const isColorButton = target.closest('button')?.querySelector('svg')?.classList.contains('lucide-palette');

        if (!isColorButton) {
          setShowColorPicker(false);
        }
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  // Update local selected color when chat changes (but not during active updates)
  useEffect(() => {
    if (!isUpdatingRef.current) {
      setSelectedColor(selected.themeColor || '#DBB42C');
      lastColorRef.current = selected.themeColor || '#DBB42C';
    }
  }, [selected.themeColor]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  const handleColorSelect = (color: string) => {
    // Mark that we're actively updating to prevent external overrides
    isUpdatingRef.current = true;

    // ALWAYS update UI immediately - no blocking!
    setSelectedColor(color);
    lastColorRef.current = color;

    // Optimistically update the UI immediately
    if (onThemeChange) {
      onThemeChange(color);
    }

    // Debounce API calls - wait 300ms for rapid clicks to finish
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }

    updateTimerRef.current = setTimeout(async () => {
      try {
        // Send the last selected color to backend
        await messageAPI.updateChatTheme(selected._id, lastColorRef.current);
        // Update complete - allow external updates again
        isUpdatingRef.current = false;
      } catch (error) {
        console.error('Failed to update chat theme:', error);
        // Revert to the original color on error
        const originalColor = selected.themeColor || '#DBB42C';
        setSelectedColor(originalColor);
        lastColorRef.current = originalColor;
        if (onThemeChange) {
          onThemeChange(originalColor);
        }
        // Allow external updates again
        isUpdatingRef.current = false;
      }
    }, 300);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowColorPicker(!showColorPicker)}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Change chat theme color"
        title="Change chat theme color"
      >
        <Palette
          className="w-5 h-5 text-gray-600"
          style={{ color: selectedColor }}
        />
      </button>

      {showColorPicker && (
        <div
          ref={colorPickerRef}
          className="absolute right-0 top-12 z-[10000] bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-80"
        >
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">Chat Theme Color</h3>
            <p className="text-xs text-gray-500">Choose a color for your message bubbles</p>
          </div>

          <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
            {THEME_COLORS.map((themeColor) => (
              <button
                key={themeColor.color}
                onClick={() => handleColorSelect(themeColor.color)}
                className="relative w-10 h-10 rounded-full transition-all hover:scale-110 focus:outline-none active:scale-95"
                style={{
                  backgroundColor: themeColor.color,
                  boxShadow: `0 0 0 2px white, 0 0 0 4px ${themeColor.color}33`
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 2px white, 0 0 0 4px ${themeColor.color}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 2px white, 0 0 0 4px ${themeColor.color}33`;
                }}
                title={themeColor.name}
                aria-label={`Select ${themeColor.name} theme`}
              >
                {selectedColor === themeColor.color && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white drop-shadow-lg" strokeWidth={3} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

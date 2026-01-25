import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  currentRating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showRateButton?: boolean;
  onRateClick?: () => void;
}

const StarRating: React.FC<StarRatingProps> = ({
  currentRating = 0,
  onRatingChange,
  readonly = false,
  size = 'sm',
  showRateButton = false,
  onRateClick
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleStarClick = (rating: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(rating);
    }
  };

  const handleStarHover = (rating: number) => {
    if (!readonly) {
      setHoverRating(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0);
    }
  };

  const displayRating = hoverRating || currentRating;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1" onMouseLeave={handleMouseLeave}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= displayRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            } ${
              readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'
            }`}
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => handleStarHover(star)}
          />
        ))}
      </div>
      
      {currentRating > 0 && (
        <span className="text-sm text-gray-600 font-medium">
          {currentRating.toFixed(1)}
        </span>
      )}

      {showRateButton && (
        <button
          onClick={onRateClick}
          className="ml-2 px-3 py-1 text-xs bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors"
        >
          Rate
        </button>
      )}
    </div>
  );
};

export default StarRating;

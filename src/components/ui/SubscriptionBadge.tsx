import React from 'react';
import { SubscriptionBadge as SubscriptionBadgeType } from '@/api/subscription';

interface SubscriptionBadgeProps {
  badge: SubscriptionBadgeType | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
  badge,
  size = 'md',
  className = ''
}) => {
  if (!badge || !badge.isPaid) return null;

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Determine badge color and title based on type
  const isSmallBusiness = badge.type === 'small_business';
  const badgeColor = isSmallBusiness ? '#22C55E' : '#3B82F6'; // Green for small business, Blue for corporate
  const badgeTitle = isSmallBusiness
    ? 'Small Business - Verified Account'
    : 'Corporate - Verified Account';

  return (
    <span
      className={`inline-flex items-center ${className}`}
      title={badgeTitle}
    >
      <svg
        className={iconSizes[size]}
        viewBox="0 0 24 24"
        fill={badgeColor}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Instagram-style verification checkmark badge */}
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
    </span>
  );
};

export default SubscriptionBadge;

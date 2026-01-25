/**
 * Formats timestamp as relative time for social media feeds
 * Examples: "just now", "5m ago", "2h ago", "3d ago", "2w ago"
 * Similar to Instagram, Twitter, Facebook
 */
export function formatRelativeTime(dateStr: string): string {
  const postDate = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - postDate.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  // Handle future dates or very recent posts (within 5 seconds)
  if (seconds < 5) {
    return 'just now';
  }

  // Less than 1 minute
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  // Less than 1 hour
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  // Less than 24 hours
  if (hours < 24) {
    return `${hours}h ago`;
  }

  // Less than 7 days
  if (days < 7) {
    return `${days}d ago`;
  }

  // Less than 4 weeks
  if (weeks < 4) {
    return `${weeks}w ago`;
  }

  // Less than 12 months
  if (months < 12) {
    return `${months}mo ago`;
  }

  // 1 year or more
  return `${years}y ago`;
}

/**
 * Formats timestamp as exact date and time for profile and post detail views
 * Format: "January 6, 2025 at 2:30 PM"
 * Similar to Instagram post detail view
 */
export function formatExactDateTime(dateStr: string): string {
  const date = new Date(dateStr);

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const formattedDate = date.toLocaleDateString('en-US', dateOptions);
  const formattedTime = date.toLocaleTimeString('en-US', timeOptions);

  return `${formattedDate} at ${formattedTime}`;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use formatRelativeTime() instead
 */
function formatPostDate(dateStr: string) {
  const postDate = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - postDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      // Ensure minimum of 0 minutes for very recent comments
      const minutes = Math.max(0, diffMinutes);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(diffHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
  } else {
    return postDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

export default formatPostDate;
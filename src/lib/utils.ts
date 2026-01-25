import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'text-green-600 bg-green-50';
    case 'pending':
      return 'text-yellow-600 bg-yellow-50';
    case 'suspended':
    case 'rejected':
      return 'text-red-600 bg-red-50';
    case 'deleted':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    spam: 'Spam',
    harassment: 'Harassment',
    nudity: 'Nudity',
    violence: 'Violence',
    fake_news: 'Fake News',
    other: 'Other'
  };
  return labels[reason] || reason;
}

export function getContentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    normal: 'Normal Post',
    service: 'Service',
    product: 'Product',
    business: 'Business'
  };
  return labels[type] || type;
}
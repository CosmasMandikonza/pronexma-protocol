// frontend/src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Status to color mapping
export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'amber';
    case 'FUNDED':
    case 'ACTIVE':
      return 'primary';
    case 'IN_REVIEW':
      return 'primary';
    case 'VERIFIED':
      return 'emerald';
    case 'RELEASED':
    case 'COMPLETED':
      return 'emerald';
    case 'REFUNDED':
    case 'CANCELLED':
      return 'text-muted';
    case 'DISPUTED':
    case 'FAILED':
      return 'red';
    default:
      return 'text-muted';
  }
}

// Status display label
export function getStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return 'Pending';
    case 'FUNDED':
      return 'Funded';
    case 'ACTIVE':
      return 'Active';
    case 'IN_REVIEW':
      return 'In Review';
    case 'VERIFIED':
      return 'Verified';
    case 'RELEASED':
      return 'Released';
    case 'COMPLETED':
      return 'Completed';
    case 'REFUNDED':
      return 'Refunded';
    case 'CANCELLED':
      return 'Cancelled';
    case 'DISPUTED':
      return 'Disputed';
    case 'FAILED':
      return 'Failed';
    default:
      return status;
  }
}

// Format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format date with time
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Calculate percentage
export function calculatePercentage(part: string, total: string): number {
  const partNum = BigInt(part);
  const totalNum = BigInt(total);
  if (totalNum === BigInt(0)) return 0;
  return Number((partNum * BigInt(100)) / totalNum);
}

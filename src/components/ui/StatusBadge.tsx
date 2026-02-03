'use client';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  INITIATED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-500',
  DRAFT: 'bg-yellow-100 text-yellow-800',
  PENDING_REVIEW: 'bg-orange-100 text-orange-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  SUPERSEDED: 'bg-gray-100 text-gray-600',
  OWNER: 'bg-blue-100 text-blue-800',
  COLLABORATOR: 'bg-purple-100 text-purple-800',
  REVIEWER: 'bg-amber-100 text-amber-800',
  VIEWER: 'bg-gray-100 text-gray-800'
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.INITIATED;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style} ${className}`}>
      {status}
    </span>
  );
}

'use client';

// FLM Component Suite - Phase 2: Supporting Components
// ArtefactStatusBadge - Status indicator component

interface ArtefactStatusBadgeProps {
  status: 'DRAFT' | 'PENDING_REVIEW' | 'CONFIRMED' | 'SUPERSEDED';
  className?: string;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-300',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  CONFIRMED: 'bg-green-100 text-green-800 border-green-300',
  SUPERSEDED: 'bg-red-100 text-red-800 border-red-300'
};

const statusLabels = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
  CONFIRMED: 'Confirmed',
  SUPERSEDED: 'Superseded'
};

export default function ArtefactStatusBadge({ status, className = '' }: ArtefactStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[status]} ${className}`}
    >
      {statusLabels[status]}
    </span>
  );
}

'use client';

import React from 'react';
import * as LucideIcons from 'lucide-react';

export interface CardProps {
  title: string;
  icon?: string; // Icon name from lucide-react (e.g., 'Building', 'ShoppingBag')
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow' | 'indigo' | 'pink' | 'gray';
  children: React.ReactNode;
  className?: string;
}

const colorClasses = {
  blue: 'border-blue-500 bg-blue-50',
  green: 'border-green-500 bg-green-50',
  purple: 'border-purple-500 bg-purple-50',
  orange: 'border-orange-500 bg-orange-50',
  red: 'border-red-500 bg-red-50',
  yellow: 'border-yellow-500 bg-yellow-50',
  indigo: 'border-indigo-500 bg-indigo-50',
  pink: 'border-pink-500 bg-pink-50',
  gray: 'border-gray-500 bg-gray-50',
};

const colorIconClasses = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  purple: 'text-purple-600',
  orange: 'text-orange-600',
  red: 'text-red-600',
  yellow: 'text-yellow-600',
  indigo: 'text-indigo-600',
  pink: 'text-pink-600',
  gray: 'text-gray-600',
};

/**
 * Reusable card component with icon and color theming
 * Used by viewer components to display structured data sections
 */
export default function Card({ title, icon, color = 'blue', children, className = '' }: CardProps) {
  // Get icon component from lucide-react
  const IconComponent = icon && (LucideIcons as any)[icon] 
    ? (LucideIcons as any)[icon] 
    : LucideIcons.Building; // Default icon

  const borderColorClass = colorClasses[color] || colorClasses.blue;
  const iconColorClass = colorIconClasses[color] || colorIconClasses.blue;

  return (
    <div className={`border-l-4 ${borderColorClass} p-6 rounded-lg shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <IconComponent className={`w-5 h-5 ${iconColorClass}`} />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="text-gray-700">
        {children}
      </div>
    </div>
  );
}








































'use client';

import React from 'react';

export interface SectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  spacing?: 'small' | 'medium' | 'large';
}

const spacingClasses = {
  small: 'space-y-2',
  medium: 'space-y-4',
  large: 'space-y-6',
};

/**
 * Reusable section wrapper component
 * Provides consistent spacing and layout for viewer sections
 */
export default function Section({ 
  title, 
  children, 
  className = '',
  spacing = 'medium' 
}: SectionProps) {
  return (
    <div className={`${spacingClasses[spacing]} ${className}`}>
      {title && (
        <h4 className="text-md font-semibold text-gray-900 mb-2">{title}</h4>
      )}
      {children}
    </div>
  );
}








































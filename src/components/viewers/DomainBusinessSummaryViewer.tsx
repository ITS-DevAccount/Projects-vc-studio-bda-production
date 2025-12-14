'use client';

import Card from './shared/Card';
import ValueDisplay from './shared/ValueDisplay';

export interface DomainBusinessSummaryViewerProps {
  data: {
    schema?: any; // JSON Schema definition (might want to hide this)
    prefill?: {
      business_identity?: any;
      products_services?: any;
      target_market?: any;
      supply_chain?: any;
      revenue_model?: any;
      key_differentiators?: any;
      [key: string]: any;
    };
    [key: string]: any;
  };
  config?: {
    component_type?: string;
    layout?: {
      columns?: number;
      spacing?: 'small' | 'medium' | 'large';
      responsive?: boolean;
    };
    sections?: Array<{
      key: string;
      title: string;
      icon?: string;
      color?: string;
    }>;
    field_rendering?: {
      arrays?: 'bullet_list' | 'nested_cards' | 'paragraph';
      objects?: 'nested_cards' | 'bullet_list' | 'paragraph';
      strings?: 'paragraph' | 'bullet_list';
      hide_schema?: boolean;
    };
    [key: string]: any;
  };
}

/**
 * Viewer for Domain Business Summary (DBS) output from BVS_TO_DBS prompt
 * Renders business information as beautiful structured cards
 */
export default function DomainBusinessSummaryViewer({ data, config = {} }: DomainBusinessSummaryViewerProps) {
  // Ensure config is always an object (handle null case)
  const safeConfig = config || {};
  
  // Extract prefill data (actual business info)
  // Hide schema by default if configured
  const fieldRendering = safeConfig.field_rendering || {};
  const hideSchema = fieldRendering.hide_schema !== false; // Default to true

  const businessData = data.prefill || data;
  
  // Remove schema if we should hide it
  const displayData = hideSchema && businessData.schema 
    ? { ...businessData, schema: undefined }
    : businessData;

  // Get sections from config or use defaults
  const sections = safeConfig.sections || getDefaultSections();
  
  // Get layout config
  const layout = safeConfig.layout || {};
  const columns = layout.columns || 2;
  const spacing = layout.spacing || 'large';
  const responsive = layout.responsive !== false; // Default to true

  const spacingClasses = {
    small: 'gap-4',
    medium: 'gap-6',
    large: 'gap-6',
  };

  // Map columns to Tailwind classes (dynamic classes don't work with JIT)
  const gridColsMap: Record<number, string> = {
    1: responsive ? 'grid-cols-1' : 'grid-cols-1',
    2: responsive ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2',
    3: responsive ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-3',
    4: responsive ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-4',
  };

  const gridCols = gridColsMap[columns] || gridColsMap[2];

  return (
    <div className={`grid ${gridCols} ${spacingClasses[spacing]}`}>
      {sections.map((section) => {
        const sectionData = displayData[section.key];
        
        // Skip if no data for this section
        if (!sectionData || (typeof sectionData === 'object' && Object.keys(sectionData).length === 0)) {
          return null;
        }

        return (
          <Card
            key={section.key}
            title={section.title}
            icon={section.icon}
            color={section.color as any}
          >
            <ValueDisplay 
              value={sectionData} 
              renderingRule={getRenderingRule(section.key, fieldRendering)}
            />
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Get default sections configuration
 */
function getDefaultSections() {
  return [
    {
      key: 'business_identity',
      title: 'Business Identity',
      icon: 'Building',
      color: 'blue',
    },
    {
      key: 'products_services',
      title: 'Products & Services',
      icon: 'ShoppingBag',
      color: 'green',
    },
    {
      key: 'target_market',
      title: 'Target Market',
      icon: 'Users',
      color: 'purple',
    },
    {
      key: 'supply_chain',
      title: 'Supply Chain',
      icon: 'Truck',
      color: 'orange',
    },
    {
      key: 'revenue_model',
      title: 'Revenue Model',
      icon: 'DollarSign',
      color: 'green',
    },
    {
      key: 'key_differentiators',
      title: 'Key Differentiators',
      icon: 'Star',
      color: 'yellow',
    },
  ];
}

/**
 * Get rendering rule for a specific section
 */
function getRenderingRule(sectionKey: string, fieldRendering: any): 'bullet_list' | 'nested_cards' | 'paragraph' | 'auto' {
  // Check if there's a section-specific rule
  if (fieldRendering[sectionKey]) {
    return fieldRendering[sectionKey];
  }

  // Use general rules
  if (fieldRendering.arrays) {
    return fieldRendering.arrays;
  }

  // Default to auto
  return 'auto';
}


/**
 * Sprint 1d.4: Template Selector Modal
 * Displays pre-built function templates for selection
 */

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { FUNCTION_TEMPLATES } from '@/lib/templates/function-templates';
import type { FunctionTemplate } from '@/lib/templates/template-types';
import TemplateCustomizationForm from './TemplateCustomizationForm';

interface TemplateSelectorModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function TemplateSelectorModal({ onClose, onCreated }: TemplateSelectorModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<FunctionTemplate | null>(null);

  const handleTemplateSelect = (template: FunctionTemplate) => {
    setSelectedTemplate(template);
  };

  const handleBack = () => {
    setSelectedTemplate(null);
  };

  // If a template is selected, show customization form
  if (selectedTemplate) {
    return (
      <TemplateCustomizationForm
        template={selectedTemplate}
        onClose={onClose}
        onBack={handleBack}
        onCreated={onCreated}
      />
    );
  }

  // Otherwise show template selector
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create from Template</h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose a pre-built template to get started quickly
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Template Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FUNCTION_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => handleTemplateSelect(template)}
              >
                {/* Icon */}
                <div className="text-4xl mb-4">{template.icon}</div>

                {/* Name and Description */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>

                {/* Category Badge */}
                <div className="mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                    {template.category}
                  </span>
                </div>

                {/* Example Use Cases */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Example use cases:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {template.exampleUseCases.slice(0, 2).map((useCase, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-gray-400">•</span>
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Button */}
                <button
                  className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition group-hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateSelect(template);
                  }}
                >
                  Use This Template
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{FUNCTION_TEMPLATES.length} templates available</span>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

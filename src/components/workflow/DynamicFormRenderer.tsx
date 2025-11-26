// Sprint 1d.7: FLM Building Workflow - Dynamic Form Renderer
// Phase B: Workflow Components

'use client';

import { useState } from 'react';

interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  enum?: any[];
  format?: string;
  title?: string;
  description?: string;
}

interface DynamicFormRendererProps {
  schema: JSONSchema;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

export default function DynamicFormRenderer({
  schema,
  initialData = {},
  onSubmit,
  onCancel,
  readOnly = false
}: DynamicFormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (schema.required) {
      schema.required.forEach((field) => {
        if (!formData[field] || formData[field] === '') {
          newErrors[field] = 'This field is required';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const renderField = (fieldName: string, fieldSchema: any) => {
    const isRequired = schema.required?.includes(fieldName);
    const value = formData[fieldName] || '';
    const error = errors[fieldName];

    // Handle different field types
    const fieldType = fieldSchema.type;
    const fieldFormat = fieldSchema.format;

    const commonProps = {
      id: fieldName,
      name: fieldName,
      disabled: readOnly,
      className: `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`
    };

    // String with enum = dropdown
    if (fieldType === 'string' && fieldSchema.enum) {
      return (
        <select
          {...commonProps}
          value={value}
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
        >
          <option value="">-- Select --</option>
          {fieldSchema.enum.map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    // Number or integer
    if (fieldType === 'number' || fieldType === 'integer') {
      return (
        <input
          {...commonProps}
          type="number"
          step={fieldType === 'integer' ? '1' : 'any'}
          value={value}
          onChange={(e) =>
            handleFieldChange(
              fieldName,
              fieldType === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value)
            )
          }
        />
      );
    }

    // Boolean = checkbox
    if (fieldType === 'boolean') {
      return (
        <input
          type="checkbox"
          id={fieldName}
          name={fieldName}
          checked={!!value}
          disabled={readOnly}
          onChange={(e) => handleFieldChange(fieldName, e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      );
    }

    // Date format
    if (fieldFormat === 'date' || fieldFormat === 'date-time') {
      return (
        <input
          {...commonProps}
          type={fieldFormat === 'date-time' ? 'datetime-local' : 'date'}
          value={value}
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
        />
      );
    }

    // Currency format (custom)
    if (fieldFormat === 'currency') {
      return (
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">£</span>
          <input
            {...commonProps}
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, parseFloat(e.target.value))}
            className={`${commonProps.className} pl-8`}
          />
        </div>
      );
    }

    // Textarea for long strings
    if (fieldSchema.maxLength && fieldSchema.maxLength > 200) {
      return (
        <textarea
          {...commonProps}
          rows={4}
          value={value}
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
          maxLength={fieldSchema.maxLength}
        />
      );
    }

    // Array = multiple text inputs
    if (fieldType === 'array') {
      const arrayValue = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {arrayValue.map((item: any, index: number) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const newArray = [...arrayValue];
                  newArray[index] = e.target.value;
                  handleFieldChange(fieldName, newArray);
                }}
                className={commonProps.className}
                disabled={readOnly}
              />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    const newArray = arrayValue.filter((_: any, i: number) => i !== index);
                    handleFieldChange(fieldName, newArray);
                  }}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <button
              type="button"
              onClick={() => handleFieldChange(fieldName, [...arrayValue, ''])}
              className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm"
            >
              + Add Item
            </button>
          )}
        </div>
      );
    }

    // Default: text input
    return (
      <input
        {...commonProps}
        type="text"
        value={value}
        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
        maxLength={fieldSchema.maxLength}
      />
    );
  };

  if (!schema.properties) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4">
        Invalid schema: No properties defined
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {Object.entries(schema.properties).map(([fieldName, fieldSchema]: [string, any]) => {
        const isRequired = schema.required?.includes(fieldName);
        const isBooleanField = fieldSchema.type === 'boolean';

        return (
          <div key={fieldName}>
            <label
              htmlFor={fieldName}
              className={`block text-sm font-medium text-gray-700 mb-1 ${
                isBooleanField ? 'inline-flex items-center gap-2' : ''
              }`}
            >
              {isBooleanField && renderField(fieldName, fieldSchema)}
              <span>
                {fieldSchema.title || fieldName}
                {isRequired && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>

            {!isBooleanField && (
              <>
                {renderField(fieldName, fieldSchema)}
                {fieldSchema.description && (
                  <p className="text-xs text-gray-500 mt-1">{fieldSchema.description}</p>
                )}
              </>
            )}

            {errors[fieldName] && (
              <p className="text-xs text-red-600 mt-1">{errors[fieldName]}</p>
            )}
          </div>
        );
      })}

      {!readOnly && (
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Submit
          </button>
        </div>
      )}
    </form>
  );
}

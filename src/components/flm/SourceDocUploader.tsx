'use client';

// FLM Component Suite - Phase 2: Supporting Components
// SourceDocUploader - Document upload component for FLM source documents

import { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import FileUploader from '@/components/files/FileUploader';

interface SourceDocument {
  id: string;
  file_path: string;
  document_type: string;
  uploaded_at: string;
}

interface SourceDocUploaderProps {
  flmModelId: string;
  onUploadComplete?: (document: SourceDocument) => void;
  existingDocuments?: SourceDocument[];
  onDelete?: (documentId: string) => void;
}

export default function SourceDocUploader({
  flmModelId,
  onUploadComplete,
  existingDocuments = [],
  onDelete
}: SourceDocUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, category: string) => {
    setUploading(true);
    setError(null);

    try {
      // Upload file using existing FileUploader component
      // For now, this is a placeholder - actual upload logic would integrate with nodes table
      const response = await fetch(`/api/vc-models/flm/${flmModelId}/source-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_path: `/flm/${flmModelId}/documents/${file.name}`,
          document_type: category
        })
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      const document = await response.json();
      
      if (onUploadComplete) {
        onUploadComplete(document);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Source Documents</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload supporting documents to provide context for FLM generation
        </p>
        
        <FileUploader
          config={{
            allowedTypes: [
              'application/pdf',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'text/csv'
            ],
            maxFileSize: 50 * 1024 * 1024, // 50MB
            categorization: {
              business_plan: 'Business Plan',
              financial_model: 'Financial Model',
              market_research: 'Market Research',
              pitch_deck: 'Pitch Deck',
              other: 'Other'
            }
          }}
          onUpload={handleFileUpload}
          stakeholderId={''} // Will be set by parent component
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {existingDocuments.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Uploaded Documents</h4>
          <div className="space-y-2">
            {existingDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.document_type}</p>
                    <p className="text-xs text-gray-500">{doc.file_path}</p>
                    <p className="text-xs text-gray-400">
                      Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {onDelete && (
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                    title="Delete document"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

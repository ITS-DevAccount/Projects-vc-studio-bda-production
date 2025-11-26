// Sprint 1d.7: FLM Building Workflow - Review Gate Component
// Phase B: Workflow Components

'use client';

import { useState } from 'react';
import JsonView from '@uiw/react-json-view';

interface ReviewContent {
  data: any;
  displayFormat?: 'raw' | 'formatted' | 'comparison';
  previousVersion?: any;
}

interface ReviewGateProps {
  title: string;
  description?: string;
  content: ReviewContent;
  contentType: 'json' | 'markdown' | 'document';

  // Routing
  allowedReviewers: ('client' | 'admin' | 'system')[];
  currentReviewer: string;

  // Actions
  onApprove: () => void;
  onRequestChanges: (feedback: string) => void;
  onReject?: () => void;

  // Edit capability
  allowEdit?: boolean;
  onEdit?: (editedContent: any) => void;
}

export default function ReviewGate({
  title,
  description,
  content,
  contentType,
  allowedReviewers,
  currentReviewer,
  onApprove,
  onRequestChanges,
  onReject,
  allowEdit = false,
  onEdit
}: ReviewGateProps) {
  const [feedback, setFeedback] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(content.data);
  const [showingComparison, setShowingComparison] = useState(false);

  const handleApprove = () => {
    onApprove();
  };

  const handleRequestChanges = () => {
    if (!feedback.trim()) {
      alert('Please provide feedback for the requested changes');
      return;
    }
    onRequestChanges(feedback);
  };

  const handleReject = () => {
    if (!onReject) return;
    if (confirm('Are you sure you want to reject this? This action cannot be undone.')) {
      onReject();
    }
  };

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(editedData);
      setIsEditing(false);
    }
  };

  const renderContent = () => {
    // JSON content
    if (contentType === 'json') {
      if (isEditing) {
        return (
          <div>
            <textarea
              value={JSON.stringify(editedData, null, 2)}
              onChange={(e) => {
                try {
                  setEditedData(JSON.parse(e.target.value));
                } catch (err) {
                  // Invalid JSON, keep as string
                }
              }}
              className="w-full h-96 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
            />
          </div>
        );
      }

      if (showingComparison && content.previousVersion) {
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Previous Version</h4>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <JsonView value={content.previousVersion} />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Version</h4>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <JsonView value={content.data} />
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <JsonView value={content.data} />
        </div>
      );
    }

    // Markdown content
    if (contentType === 'markdown') {
      if (isEditing) {
        return (
          <textarea
            value={editedData}
            onChange={(e) => setEditedData(e.target.value)}
            className="w-full h-96 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
          />
        );
      }

      return (
        <div className="prose max-w-none border border-gray-200 rounded-lg p-6 bg-white">
          <pre className="whitespace-pre-wrap">{content.data}</pre>
        </div>
      );
    }

    // Document/Text content
    return (
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(content.data, null, 2)}</pre>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            {description && <p className="text-gray-600 mt-1">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {content.previousVersion && !isEditing && (
              <button
                onClick={() => setShowingComparison(!showingComparison)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {showingComparison ? 'Hide Comparison' : 'Show Comparison'}
              </button>
            )}
            {allowEdit && onEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Content for Review</h3>
        {renderContent()}

        {isEditing && (
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedData(content.data);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Feedback/Actions */}
      {!isEditing && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Actions</h3>

          {/* Feedback Input */}
          <div className="mb-4">
            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
              Feedback (required for requesting changes)
            </label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Provide feedback or comments..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            {onReject && (
              <button
                onClick={handleReject}
                className="px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
              >
                Reject
              </button>
            )}
            <button
              onClick={handleRequestChanges}
              className="px-6 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50"
            >
              Request Changes
            </button>
            <button
              onClick={handleApprove}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Approve
            </button>
          </div>
        </div>
      )}

      {/* Reviewer Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-900">
          <strong>Current Reviewer:</strong> {currentReviewer}
          {' | '}
          <strong>Allowed Reviewers:</strong> {allowedReviewers.join(', ')}
        </div>
      </div>
    </div>
  );
}

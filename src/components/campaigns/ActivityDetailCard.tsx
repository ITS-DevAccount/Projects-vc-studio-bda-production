// ============================================================================
// BuildBid: Activity Detail Card Component
// Displays a single planned/completed activity within a stage
// ============================================================================

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ActivityDetail {
  id: string;
  planned_action_type: 'email' | 'call' | 'meeting' | 'demo';
  planned_action_date: string;
  planned_notes: string;
  actual_action_type?: 'email' | 'call' | 'meeting' | 'demo' | null;
  actual_action_date?: string | null;
  actual_notes?: string | null;
  status: 'planned' | 'completed' | 'cancelled';
}

interface ActivityDetailCardProps {
  detail: ActivityDetail;
  onComplete: (params: {
    actualActionType: 'email' | 'call' | 'meeting' | 'demo';
    actualActionDate: string;
    actualNotes: string;
  }) => Promise<void>;
  isProcessing?: boolean;
}

const actionIcons = {
  email: '📧',
  call: '📞',
  meeting: '📅',
  demo: '🎯',
};

const actionLabels = {
  email: 'Email',
  call: 'Call',
  meeting: 'Meeting',
  demo: 'Demo',
};

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not scheduled';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export default function ActivityDetailCard({
  detail,
  onComplete,
  isProcessing = false,
}: ActivityDetailCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [actualActionType, setActualActionType] = useState<'email' | 'call' | 'meeting' | 'demo'>(
    detail.actual_action_type || detail.planned_action_type
  );
  const [actualActionDate, setActualActionDate] = useState('');
  const [actualNotes, setActualNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleComplete = async () => {
    if (!actualActionDate || !actualNotes.trim()) {
      alert('Please fill in actual date and notes');
      return;
    }

    setProcessing(true);
    try {
      await onComplete({
        actualActionType,
        actualActionDate,
        actualNotes,
      });
      setIsEditing(false);
      // Reset form
      setActualActionDate('');
      setActualNotes('');
    } catch (error) {
      console.error('Error completing activity:', error);
    } finally {
      setProcessing(false);
    }
  };

  const isDisabled = processing || isProcessing;

  return (
    <div
      className={`border rounded-lg p-4 mb-3 transition-all ${
        detail.status === 'completed'
          ? 'border-green-500 bg-green-50'
          : detail.status === 'cancelled'
          ? 'border-red-500 bg-red-50 opacity-70'
          : 'border-gray-300 bg-white'
      }`}
    >
      {/* Planned Activity */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{actionIcons[detail.planned_action_type]}</span>
          <span className="font-semibold text-sm">
            {detail.status === 'planned' ? 'Planned' : 'Planned'}: {actionLabels[detail.planned_action_type]}
          </span>
          <span className="text-xs text-gray-500 ml-auto">
            {formatDate(detail.planned_action_date)}
          </span>
        </div>
        <p className="text-sm text-gray-700">{detail.planned_notes}</p>
      </div>

      {/* Actual Activity (if completed) */}
      {detail.status === 'completed' && detail.actual_action_type && (
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600 font-semibold text-sm">→ Completed</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{actionIcons[detail.actual_action_type]}</span>
            <span className="font-semibold text-sm">{actionLabels[detail.actual_action_type]}</span>
            <span className="text-xs text-gray-500 ml-auto">
              {formatDate(detail.actual_action_date)}
            </span>
          </div>
          <p className="text-sm text-gray-700">{detail.actual_notes}</p>
        </div>
      )}

      {/* Complete Activity Form (if planned and not editing) */}
      {detail.status === 'planned' && !isEditing && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <Button
            onClick={() => setIsEditing(true)}
            disabled={isDisabled}
            className="bg-[#902ed1] hover:bg-[#7c2d9c] text-white text-sm"
            size="sm"
          >
            Complete Activity
          </Button>
        </div>
      )}

      {/* Complete Activity Form (editing) */}
      {isEditing && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Action Type</label>
            <Select
              value={actualActionType}
              onValueChange={(value) => setActualActionType(value as typeof actualActionType)}
              disabled={isDisabled}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">📧 Email</SelectItem>
                <SelectItem value="call">📞 Call</SelectItem>
                <SelectItem value="meeting">📅 Meeting</SelectItem>
                <SelectItem value="demo">🎯 Demo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Actual Date & Time</label>
            <Input
              type="datetime-local"
              value={actualActionDate}
              onChange={(e) => setActualActionDate(e.target.value)}
              disabled={isDisabled}
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">What happened?</label>
            <Textarea
              value={actualNotes}
              onChange={(e) => setActualNotes(e.target.value)}
              placeholder="Describe what actually happened..."
              rows={3}
              disabled={isDisabled}
              className="text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleComplete}
              disabled={isDisabled}
              className="bg-[#902ed1] hover:bg-[#7c2d9c] text-white text-sm flex-1"
              size="sm"
            >
              {processing ? 'Saving...' : 'Save'}
            </Button>
            <Button
              onClick={() => {
                setIsEditing(false);
                setActualActionDate('');
                setActualNotes('');
              }}
              disabled={isDisabled}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

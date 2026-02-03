// ============================================================================
// BuildBid: Add Activity Form Component
// Form for scheduling new planned activities
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export interface StakeholderForActivity {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  website?: string | null;
}

interface AddActivityFormProps {
  interactionId: string;
  stakeholder: StakeholderForActivity;
  onSave: () => void;
  onCancel: () => void;
  onStakeholderPhoneUpdated?: () => void;
  isProcessing?: boolean;
}

const actionTypes: Array<{ value: 'email' | 'call' | 'meeting' | 'demo'; label: string; icon: string }> = [
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'call', label: 'Call', icon: '📞' },
  { value: 'meeting', label: 'Meeting', icon: '📅' },
  { value: 'demo', label: 'Demo', icon: '🎯' },
];

const isPhoneNC = (phone: string | null | undefined) =>
  !phone || String(phone).trim() === '' || String(phone).toUpperCase() === 'NC';

export default function AddActivityForm({
  interactionId,
  stakeholder,
  onSave,
  onCancel,
  onStakeholderPhoneUpdated,
  isProcessing = false,
}: AddActivityFormProps) {
  const [actionType, setActionType] = useState<'email' | 'call' | 'meeting' | 'demo'>('email');
  const [actionDate, setActionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [phonePopupOpen, setPhonePopupOpen] = useState(false);
  const [phonePopupValue, setPhonePopupValue] = useState('');
  const [phonePopupSaving, setPhonePopupSaving] = useState(false);

  // When date/time is chosen, prefill notes with telephone if available
  useEffect(() => {
    if (!actionDate) return;
    if (notes.trim() !== '') return; // Don't overwrite user notes
    if (!isPhoneNC(stakeholder.phone)) {
      setNotes(`Tel: ${stakeholder.phone}`);
    }
  }, [actionDate, stakeholder.phone]);

  const showPhoneIcon = Boolean(actionDate) && isPhoneNC(stakeholder.phone);

  const handleOpenPhonePopup = () => {
    setPhonePopupValue(stakeholder.phone && stakeholder.phone !== 'NC' ? stakeholder.phone : '');
    setPhonePopupOpen(true);
  };

  const handleSavePhone = async () => {
    setPhonePopupSaving(true);
    try {
      const res = await fetch(`/api/stakeholders/${stakeholder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phonePopupValue.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update phone');
      }
      setPhonePopupOpen(false);
      onStakeholderPhoneUpdated?.();
    } catch (e: any) {
      console.error('Error updating stakeholder phone:', e);
      alert(e.message || 'Failed to update phone');
    } finally {
      setPhonePopupSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!actionDate) {
      alert('Please select a date and time');
      return;
    }

    if (!notes.trim()) {
      alert('Please add notes about this action');
      return;
    }

    setProcessing(true);
    try {
      // Get current stakeholder ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: stakeholder } = await supabase
        .from('stakeholders')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!stakeholder) {
        throw new Error('Stakeholder not found');
      }

      // Create interaction detail via API
      const response = await fetch(`/api/campaigns/interactions/${interactionId}/details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planned_action_type: actionType,
          planned_action_date: actionDate,
          planned_notes: notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Check if this is a "table not found" error (503 status)
        if (response.status === 503 && error.code === 'TABLE_NOT_FOUND') {
          alert('Activity tracking is not available. This feature requires database migrations to be run. Please contact your administrator.');
          return; // Don't throw, just show message and return
        }
        
        throw new Error(error.error || 'Failed to create activity');
      }

      // Clear form
      setActionType('email');
      setActionDate('');
      setNotes('');

      // Notify parent
      onSave();
    } catch (error: any) {
      console.error('Error creating activity:', error);
      alert(error.message || 'Failed to create activity');
    } finally {
      setProcessing(false);
    }
  };

  const isDisabled = processing || isProcessing;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
      <h4 className="text-base font-semibold mb-4 text-gray-900">Schedule Next Action</h4>

      {/* Action Type Buttons */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 mb-2 block">Action Type</label>
        <div className="grid grid-cols-4 gap-2">
          {actionTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setActionType(type.value)}
              disabled={isDisabled}
              className={`
                p-3 rounded-lg border-2 text-center text-sm transition-all min-h-[60px] flex flex-col items-center justify-center gap-1
                ${actionType === type.value
                  ? 'bg-[#902ed1] text-white border-[#902ed1] font-semibold'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-[#902ed1]'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-lg">{type.icon}</span>
              <span>{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date & Time */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 mb-2 block">Date & Time</label>
        <Input
          type="datetime-local"
          value={actionDate}
          onChange={(e) => setActionDate(e.target.value)}
          disabled={isDisabled}
          className="text-sm"
          min={new Date(Date.now() - 2 * 60 * 1000).toISOString().slice(0, 16)}
        />
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-700 mb-2 block">Notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this action..."
          rows={3}
          disabled={isDisabled}
          className="text-sm resize-none"
        />
        {showPhoneIcon && (
          <button
            type="button"
            onClick={handleOpenPhonePopup}
            className="mt-2 flex items-center gap-2 text-sm text-[#902ed1] hover:text-[#7c2d9c] focus:outline-none focus:ring-2 focus:ring-[#902ed1] focus:ring-offset-1 rounded p-1"
            title="Add or update telephone number"
          >
            <Phone className="h-4 w-4" />
            <span>Add telephone number</span>
          </button>
        )}
      </div>

      {/* Phone popup (when phone is NC) */}
      <Dialog open={phonePopupOpen} onOpenChange={setPhonePopupOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Stakeholder contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p><span className="font-medium text-gray-700">Name:</span> {stakeholder.name}</p>
            <p><span className="font-medium text-gray-700">Email:</span> {stakeholder.email}</p>
            {stakeholder.website != null && stakeholder.website !== '' && (
              <p><span className="font-medium text-gray-700">Website:</span> {stakeholder.website}</p>
            )}
            <div>
              <label className="font-medium text-gray-700 block mb-1">Telephone number</label>
              <Input
                type="tel"
                value={phonePopupValue}
                onChange={(e) => setPhonePopupValue(e.target.value)}
                placeholder="Enter phone number"
                disabled={phonePopupSaving}
                className="text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setPhonePopupOpen(false)} disabled={phonePopupSaving}>
              Cancel
            </Button>
            <Button onClick={handleSavePhone} disabled={phonePopupSaving} className="bg-[#902ed1] hover:bg-[#7c2d9c] text-white">
              {phonePopupSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Actions */}
      <div className="flex gap-2 justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isDisabled}
          className="bg-[#902ed1] hover:bg-[#7c2d9c] text-white"
        >
          {processing ? 'Scheduling...' : 'Schedule Activity'}
        </Button>
        <Button
          onClick={onCancel}
          disabled={isDisabled}
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

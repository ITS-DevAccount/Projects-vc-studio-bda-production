/**
 * Sprint 1d.6: Audit History Tab
 * Shows chronological event trail for workflows
 */

'use client';

import { useState, useEffect } from 'react';
import { Download, Search, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import type { AuditHistoryResponse } from '@/lib/types/monitoring';

export default function AuditHistoryTab() {
  const [selectedInstanceId, setSelectedInstanceId] = useState('');
  const [data, setData] = useState<AuditHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const [instances, setInstances] = useState<any[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(true);

  // Fetch instances list
  useEffect(() => {
    fetchInstances();
  }, []);

  const fetchInstances = async () => {
    try {
      const response = await fetch('/api/monitoring/instances?limit=100');
      if (!response.ok) throw new Error('Failed to fetch instances');

      const result = await response.json();
      setInstances(result.instances || []);
    } catch (err) {
      console.error('Error fetching instances:', err);
    } finally {
      setLoadingInstances(false);
    }
  };

  const fetchAuditHistory = async () => {
    if (!selectedInstanceId) {
      setError('Please select a workflow instance');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (eventTypeFilter) params.set('event_type', eventTypeFilter);

      const response = await fetch(
        `/api/monitoring/audit/${selectedInstanceId}?${params.toString()}`
      );
      if (!response.ok) throw new Error('Failed to fetch audit history');

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error('Error fetching audit history:', err);
      setError(err.message || 'Failed to load audit history');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'CSV' | 'JSON') => {
    if (!selectedInstanceId) return;

    try {
      const response = await fetch('/api/monitoring/audit/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instance_id: selectedInstanceId,
          format,
          event_type: eventTypeFilter || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to export audit trail');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${selectedInstanceId.slice(0, 8)}.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting audit trail:', err);
      alert('Failed to export audit trail');
    }
  };

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('FAILED') || eventType.includes('ERROR'))
      return 'text-red-600 bg-red-50';
    if (eventType.includes('COMPLETED')) return 'text-green-600 bg-green-50';
    if (eventType.includes('STARTED') || eventType.includes('CREATED'))
      return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-6">
      {/* Instance Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Workflow Instance
        </label>
        <div className="flex gap-3">
          <select
            value={selectedInstanceId}
            onChange={(e) => setSelectedInstanceId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={loadingInstances}
          >
            <option value="">-- Select an instance --</option>
            {instances.map((instance) => (
              <option key={instance.id} value={instance.id}>
                {instance.instance_name || instance.workflow_name} ({instance.status}) - Created:{' '}
                {new Date(instance.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
          <button
            onClick={fetchAuditHistory}
            disabled={!selectedInstanceId || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:bg-gray-400"
          >
            <Search className="w-4 h-4" />
            Load Audit Trail
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Filters and Export */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Event Type:</label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Events</option>
                <option value="INSTANCE_CREATED">Instance Created</option>
                <option value="NODE_TRANSITION">Node Transition</option>
                <option value="TASK_CREATED">Task Created</option>
                <option value="TASK_COMPLETED">Task Completed</option>
                <option value="TASK_FAILED">Task Failed</option>
                <option value="SERVICE_CALLED">Service Called</option>
                <option value="WORKFLOW_COMPLETED">Workflow Completed</option>
              </select>
              <button
                onClick={fetchAuditHistory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('CSV')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => handleExport('JSON')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
            </div>
          </div>

          {/* Events List */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Audit Events ({data.count})
              </h3>
            </div>

            {data.events.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                No audit events found for the selected criteria
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {data.events.map((event) => (
                  <div key={event.id} className="p-4 hover:bg-gray-50">
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() =>
                        setExpandedEventId(expandedEventId === event.id ? null : event.id)
                      }
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(
                              event.event_type
                            )}`}
                          >
                            {event.event_type}
                          </span>
                          <span className="text-sm text-gray-600">
                            {new Date(event.event_timestamp).toLocaleString()}
                          </span>
                          {event.node_name && (
                            <span className="text-sm text-gray-500">Node: {event.node_name}</span>
                          )}
                          {event.stakeholder_name && (
                            <span className="text-sm text-gray-500">
                              By: {event.stakeholder_name}
                            </span>
                          )}
                        </div>
                        {event.error_message && (
                          <div className="mt-2 text-sm text-red-600">{event.error_message}</div>
                        )}
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        {expandedEventId === event.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {expandedEventId === event.id && (
                      <div className="mt-4 space-y-3">
                        {event.event_data && Object.keys(event.event_data).length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">
                              Event Data:
                            </div>
                            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                              {JSON.stringify(event.event_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {event.previous_state && (
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">
                              Previous State:
                            </div>
                            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                              {JSON.stringify(event.previous_state, null, 2)}
                            </pre>
                          </div>
                        )}
                        {event.new_state && (
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">New State:</div>
                            <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                              {JSON.stringify(event.new_state, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading audit history...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}

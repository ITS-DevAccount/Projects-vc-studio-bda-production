// Sprint 1d.5: Service Task Execution System
// Service Execution Logs Page

'use client';

import { useState, useEffect } from 'react';
import {
  ServiceExecutionLog,
  ServiceExecutionLogsResponse,
  ExecutionStatus,
} from '@/lib/types/service';

export default function ServiceExecutionLogsPage() {
  const [logs, setLogs] = useState<ServiceExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    status?: ExecutionStatus;
    service_name?: string;
  }>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ServiceExecutionLog | null>(null);

  const pageSize = 50;

  useEffect(() => {
    loadLogs();
  }, [filter, page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.service_name) params.set('service_name', filter.service_name);
      params.set('page', String(page));
      params.set('page_size', String(pageSize));

      const response = await fetch(`/api/services/logs?${params}`);
      if (!response.ok) throw new Error('Failed to load logs');

      const data: ServiceExecutionLogsResponse = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Service Execution Logs</h1>
        <p className="text-gray-600">
          View audit trail of all service executions (REAL and MOCK)
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 items-center">
        <input
          type="text"
          placeholder="Filter by service name..."
          value={filter.service_name || ''}
          onChange={(e) => setFilter({ ...filter, service_name: e.target.value })}
          className="border rounded px-3 py-2 w-64"
        />

        <select
          value={filter.status || ''}
          onChange={(e) =>
            setFilter({ ...filter, status: e.target.value as ExecutionStatus | undefined })
          }
          className="border rounded px-3 py-2"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="TIMEOUT">Timeout</option>
          <option value="ERROR">Error</option>
        </select>

        <button
          onClick={() => loadLogs()}
          className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
        >
          Refresh
        </button>

        <div className="ml-auto text-sm text-gray-600">
          Total: {total} logs
        </div>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : error ? (
        <div className="text-red-600 py-8">Error: {error}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No logs found.
        </div>
      ) : (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Execution Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    HTTP Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Retry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.log_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.service_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.status === 'SUCCESS'
                            ? 'bg-green-100 text-green-800'
                            : log.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : log.status === 'TIMEOUT'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.execution_time_ms ? `${log.execution_time_ms}ms` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.http_status_code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.retry_attempt > 0 ? `Retry ${log.retry_attempt}` : 'First attempt'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {Math.ceil(total / pageSize)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / pageSize)}
              className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Execution Log Details</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700">Service</h3>
                  <p className="text-gray-900">{selectedLog.service_name}</p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700">Status</h3>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedLog.status === 'SUCCESS'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedLog.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700">Timestamp</h3>
                  <p className="text-gray-900">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-700">Execution Time</h3>
                  <p className="text-gray-900">{selectedLog.execution_time_ms}ms</p>
                </div>

                {selectedLog.http_status_code && (
                  <div>
                    <h3 className="font-medium text-gray-700">HTTP Status Code</h3>
                    <p className="text-gray-900">{selectedLog.http_status_code}</p>
                  </div>
                )}

                {selectedLog.request_data && (
                  <div>
                    <h3 className="font-medium text-gray-700">Request Data</h3>
                    <pre className="mt-1 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.request_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.response_data && (
                  <div>
                    <h3 className="font-medium text-gray-700">Response Data</h3>
                    <pre className="mt-1 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.response_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.error_message && (
                  <div>
                    <h3 className="font-medium text-gray-700">Error Message</h3>
                    <p className="mt-1 p-3 bg-red-50 text-red-900 rounded text-sm">
                      {selectedLog.error_message}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

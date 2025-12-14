/**
 * Sprint 1d.6: Compliance Reporting Tab
 * Generates compliance reports for audit and governance
 */

'use client';

import { useState } from 'react';
import { Shield, FileText, Download, CheckCircle } from 'lucide-react';
import type { ComplianceReportRequest, ComplianceReportResponse } from '@/lib/types/monitoring';

export default function ComplianceTab() {
  const [reportType, setReportType] = useState<ComplianceReportRequest['report_type']>('FULL_AUDIT_TRAIL');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ComplianceReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reportTypes = [
    {
      value: 'FULL_AUDIT_TRAIL' as const,
      label: 'Full Audit Trail',
      description: 'Complete event history for all workflows',
    },
    {
      value: 'DATA_LINEAGE' as const,
      label: 'Data Lineage',
      description: 'Track which data touched which tasks',
    },
    {
      value: 'USER_ACTIONS' as const,
      label: 'User Actions',
      description: 'All stakeholder actions and changes',
    },
    {
      value: 'MULTI_TENANT_ISOLATION' as const,
      label: 'Multi-Tenant Isolation',
      description: 'Verify app_uuid isolation compliance',
    },
    {
      value: 'SERVICE_INTEGRATION_AUDIT' as const,
      label: 'Service Integration Audit',
      description: 'All external service calls and responses',
    },
  ];

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const requestBody: ComplianceReportRequest = {
        report_type: reportType,
        include_pii: false, // Default to false for security
      };

      const response = await fetch('/api/monitoring/compliance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('Failed to generate compliance report');

      const result = await response.json();
      setReport(result);
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message || 'Failed to generate compliance report');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${report.metadata.report_type}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    // Safely remove the element if it still exists
    // Use setTimeout to ensure click completes before removal
    setTimeout(() => {
      try {
        if (a && a.parentNode === document.body) {
          document.body.removeChild(a);
        }
      } catch (err) {
        console.warn('Error removing download element:', err);
      }
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Report Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setReportType(type.value)}
              className={`p-4 border-2 rounded-lg text-left transition ${
                reportType === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">{type.label}</span>
              </div>
              <p className="text-sm text-gray-600">{type.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={generateReport}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:bg-gray-400"
        >
          <FileText className="w-5 h-5" />
          {loading ? 'Generating Report...' : 'Generate Report'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Generating compliance report...</p>
        </div>
      )}

      {/* Report Results */}
      {report && !loading && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Report Generated</h3>
              </div>
              <button
                onClick={downloadReport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download JSON
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="px-6 py-4 border-b border-gray-200">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Report ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{report.metadata.report_id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Report Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{report.metadata.report_type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Generated At</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(report.metadata.generated_at).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Generated By</dt>
                <dd className="mt-1 text-sm text-gray-900">{report.metadata.generated_by}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Record Count</dt>
                <dd className="mt-1 text-sm text-gray-900 font-semibold">
                  {report.metadata.record_count} records
                </dd>
              </div>
            </dl>
          </div>

          {/* Data Preview */}
          <div className="px-6 py-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Data Preview (First 5 records)</h4>
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs">{JSON.stringify(report.data.slice(0, 5), null, 2)}</pre>
            </div>
            {report.data.length > 5 && (
              <p className="text-sm text-gray-600 mt-3">
                Showing 5 of {report.data.length} total records. Download full report to view all data.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Compliance Reporting</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• All reports are read-only and cannot be modified</li>
              <li>• PII data is redacted by default for security</li>
              <li>• Reports are generated in real-time from the audit trail</li>
              <li>• Multi-tenant isolation is automatically verified</li>
              <li>• Export reports for external compliance audits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

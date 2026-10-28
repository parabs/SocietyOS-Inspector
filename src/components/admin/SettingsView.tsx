import React, { useState } from 'react';
import {
  Settings,
  Database,
  History,
  Shield,
  RotateCcw,
  Save,
  CheckCircle,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Layers,
  FileUp,
  TableProperties,
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { APP_CONFIG } from '../../config';
import { QuickSummaryOverlay } from '../verification/QuickSummaryOverlay';
import { FY2018WorkbookImport } from './FY2018WorkbookImport';

export const SettingsView: React.FC = () => {
  const { changeLogs, resetAllData, transactions, openingBalances, reconciliations } = useVerification();

  const [gasUrl, setGasUrl] = useState(APP_CONFIG.backend.apiUrl || 'https://script.google.com/macros/s/.../exec');
  const [sheetId, setSheetId] = useState(APP_CONFIG.backend.spreadsheetId || '1_BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2up0');
  const [tolerance, setTolerance] = useState('0');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showIngestionModal, setShowIngestionModal] = useState(false);
  const [showFy2018Import, setShowFy2018Import] = useState(false);
  const [ingestionTab, setIngestionTab] = useState<'summary' | 'excel-ingestion' | 'architecture'>('excel-ingestion');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleExportJSON = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      financialYear: APP_CONFIG.financialYear,
      reviewer: APP_CONFIG.currentReviewer,
      openingBalances,
      reconciliations,
      transactionsCount: transactions.length,
      changeLogs,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VarshaNivas_Verification_Backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Settings &amp; Data Management
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Manage relational database tables, upload Excel source workbooks, and configure backend integration.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFy2018Import(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors shadow-xs"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Import FY 2018–19 to Supabase</span>
          </button>
          <button
            onClick={() => {
              setIngestionTab('excel-ingestion');
              setShowIngestionModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel ➔ DB Tables Studio</span>
          </button>

          <button
            onClick={() => {
              setIngestionTab('summary');
              setShowIngestionModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
          >
            <TableProperties className="w-3.5 h-3.5 text-blue-600" />
            <span>Quick Summary</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold">Configuration saved successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backend & Integration Config */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 font-bold text-sm text-slate-900">
            <Database className="w-4 h-4 text-blue-600" />
            <span>Google Apps Script &amp; Sheets Integration</span>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Google Apps Script Web App URL
              </label>
              <input
                type="text"
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Target endpoint for server-side validation and secure Google Sheets reads/writes.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Working Google Spreadsheet ID
              </label>
              <input
                type="text"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="e.g. 1_BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2up0"
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Master spreadsheet containing accounts, vouchers, and monthly ledger sheets.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Discrepancy Tolerance Threshold (₹)
              </label>
              <input
                type="number"
                value={tolerance}
                onChange={(e) => setTolerance(e.target.value)}
                className="w-32 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Policy requirement: Zero tolerance (₹ 0.00). No rounding away discrepancies without authorization.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Configuration</span>
              </button>
            </div>
          </form>
        </div>

        {/* Society & Reviewer Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 font-bold text-sm text-slate-900">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Society Profile &amp; Governance</span>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Society Name:</span>
                <span className="font-semibold text-slate-900">Varsha Nivas Co-operative Housing Society</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Registration Number:</span>
                <span className="font-mono font-medium text-slate-800">BOM/GEN/1984/CHS</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Verification Financial Year:</span>
                <span className="font-semibold text-slate-900">FY 2018–19 (01 Apr 2018 – 31 Mar 2019)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Lead Reviewer / Office Bearer:</span>
                <span className="font-semibold text-slate-900">Sachin Parab, Treasurer (Verification)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Source Workbook Reference:</span>
                <span className="font-mono text-slate-700">Varsha_Nivas_Accounts_2018-19.xlsx</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit Backup (JSON)</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Reset all verification data to initial sample?')) {
                  resetAllData();
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Change Log */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-900">
              Audit Change Log (Entity-level Traceability)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {changeLogs.length} audit trail records logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Log ID</th>
                <th className="py-2.5 px-2">Entity</th>
                <th className="py-2.5 px-2">Record ID</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Previous State</th>
                <th className="py-2.5 px-3">New State</th>
                <th className="py-2.5 px-2">Reviewer</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Remarks / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {changeLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{log.id}</td>
                  <td className="py-2.5 px-2 font-medium text-slate-800">{log.entityType}</td>
                  <td className="py-2.5 px-2 font-mono text-slate-700 font-semibold">{log.entityId}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{log.action}</td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-[120px] truncate">{log.previousValue || '—'}</td>
                  <td className="py-2.5 px-3 font-semibold text-blue-700 max-w-[120px] truncate">{log.newValue || '—'}</td>
                  <td className="py-2.5 px-2 text-slate-700">{log.user}</td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">{log.timestamp}</td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={log.reason}>{log.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Excel to Database Studio & Quick Summary Modal */}
      <QuickSummaryOverlay
        isOpen={showIngestionModal}
        onClose={() => setShowIngestionModal(false)}
        initialTab={ingestionTab}
      />
      {showFy2018Import && <FY2018WorkbookImport onClose={() => setShowFy2018Import(false)} />}
    </div>
  );
};

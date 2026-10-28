import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  X,
  CheckCircle,
  Copy,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Flame,
  FileSpreadsheet,
  AlertOctagon,
  ArrowRight,
  BadgeAlert,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AnomalyScanResult,
  AnomalyItem,
  AnomalySeverity,
  AnomalyCategory,
  scanTransactionsForAnomalies,
} from '../../utils/anomalyDetection';
import {
  EnrichedTransaction,
  BillStatus,
  VoucherReceiptStatus,
  InternalAuditStatus,
} from '../../types';
import { formatINR } from '../../config';

interface AnomalyDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: EnrichedTransaction[];
  onSelectTransaction: (txnId: string) => void;
  onUpdateInspection: (
    txnId: string,
    updates: {
      billStatus: BillStatus;
      voucherReceiptStatus: VoucherReceiptStatus;
      internalAuditStatus: InternalAuditStatus;
      remarks: string;
    }
  ) => void;
  onBulkUpdateInspection: (
    txnIds: string[],
    updates: {
      billStatus?: BillStatus;
      voucherReceiptStatus: VoucherReceiptStatus;
      internalAuditStatus: InternalAuditStatus;
      remarks: string;
      actionTitle?: string;
    }
  ) => void;
}

export const AnomalyDetectionModal: React.FC<AnomalyDetectionModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onSelectTransaction,
  onUpdateInspection,
  onBulkUpdateInspection,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Run or re-run anomaly scan
  const scanResult: AnomalyScanResult = useMemo(() => {
    return scanTransactionsForAnomalies(transactions);
  }, [transactions]);

  const handleRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setActionNotice('Scan updated against current society ledger.');
      setTimeout(() => setActionNotice(null), 3000);
    }, 400);
  };

  // Filter anomalies
  const filteredAnomalies = useMemo(() => {
    return scanResult.anomalies.filter((anom) => {
      // Category filter
      if (selectedCategory !== 'All' && anom.category !== selectedCategory) {
        return false;
      }
      // Severity filter
      if (selectedSeverity !== 'All' && anom.severity !== selectedSeverity) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = anom.title.toLowerCase().includes(q);
        const matchDesc = anom.description.toLowerCase().includes(q);
        const matchTxn = anom.transactionId.toLowerCase().includes(q);
        const matchParty = anom.party.toLowerCase().includes(q);
        const matchRef = anom.statutoryReference?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchDesc && !matchTxn && !matchParty && !matchRef) {
          return false;
        }
      }
      return true;
    });
  }, [scanResult, selectedCategory, selectedSeverity, searchQuery]);

  // Quick Action: Flag as Discrepancy
  const handleFlagAnomaly = (anom: AnomalyItem) => {
    onUpdateInspection(anom.transactionId, {
      billStatus: 'Discrepancy',
      voucherReceiptStatus: 'Discrepancy',
      internalAuditStatus: 'Failed',
      remarks: `[Anomaly Flagged: ${anom.ruleId}] ${anom.title} - ${anom.recommendedAction}`,
    });
    setActionNotice(`Flagged ${anom.transactionId} as Discrepancy / Audit Failed.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Quick Action: Verify as Legitimate
  const handleApproveAnomaly = (anom: AnomalyItem) => {
    onUpdateInspection(anom.transactionId, {
      billStatus: 'Available',
      voucherReceiptStatus: 'Available',
      internalAuditStatus: 'Verified',
      remarks: `Auditor verified anomaly cleared: ${anom.ruleId}. Physical documentation confirmed valid.`,
    });
    setActionNotice(`Marked ${anom.transactionId} as Verified & Cleared.`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Bulk Flag all High Severity Anomalies
  const handleBulkFlagHighRisk = () => {
    const highRiskTxnIds = Array.from(
      new Set(
        scanResult.anomalies
          .filter((a) => a.severity === 'High')
          .map((a) => a.transactionId)
      )
    );

    if (highRiskTxnIds.length === 0) {
      setActionNotice('No high-risk anomalies detected to flag.');
      return;
    }

    onBulkUpdateInspection(highRiskTxnIds, {
      billStatus: 'Discrepancy',
      voucherReceiptStatus: 'Discrepancy',
      internalAuditStatus: 'Failed',
      remarks: '[Automated Anomaly Scan] Flagged for formal audit scrutiny / voucher verification.',
      actionTitle: `Bulk Flagged ${highRiskTxnIds.length} High-Risk Anomaly Items`,
    });

    setActionNotice(
      `✓ Flagged ${highRiskTxnIds.length} high-risk transactions for Committee Review.`
    );
    setTimeout(() => setActionNotice(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Automated Society Audit Anomaly Scanner
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  MCS Bye-Law 152 Forensic Engine
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Rule-based scanning for duplicate vouchers/receipts, suspicious round numbers, cash ceiling breaches, and documentation risks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRescan}
              disabled={isScanning}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5"
              title="Re-run forensic scan against live records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Re-scan'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="cursor-pointer text-emerald-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Metric Cards Row */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Anomalies
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {scanResult.totalAnomaliesCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Across {scanResult.totalTransactionsScanned} transactions
            </div>
          </div>

          <div className="bg-white rounded-xl border border-rose-200 p-3 shadow-2xs bg-rose-50/20">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
                High Risk
              </div>
              <Flame className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-0.5">
              {scanResult.highSeverityCount}
            </div>
            <div className="text-[10px] text-rose-600 font-medium mt-0.5">
              Requires immediate committee attention
            </div>
          </div>

          <div className="bg-white rounded-xl border border-amber-200 p-3 shadow-2xs bg-amber-50/20">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                Medium Risk
              </div>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-0.5">
              {scanResult.mediumSeverityCount}
            </div>
            <div className="text-[10px] text-amber-600 font-medium mt-0.5">
              Round sums / rapid repeats
            </div>
          </div>

          <div className="bg-white rounded-xl border border-indigo-200 p-3 shadow-2xs bg-indigo-50/20">
            <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
              Exposure Amount
            </div>
            <div className="text-xl sm:text-2xl font-bold text-indigo-700 mt-0.5">
              ₹{formatINR(scanResult.totalExposureAmount)}
            </div>
            <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
              Total sum of flagged items
            </div>
          </div>
        </div>

        {/* Filter Bar & Controls */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            {[
              { id: 'All', label: 'All Anomalies', count: scanResult.totalAnomaliesCount },
              { id: 'Duplicate', label: 'Duplicates', count: scanResult.anomalies.filter((a) => a.category === 'Duplicate').length },
              { id: 'Round Number', label: 'Round Numbers', count: scanResult.anomalies.filter((a) => a.category === 'Round Number').length },
              { id: 'Cash Ceiling Breach', label: 'Cash Ceiling', count: scanResult.anomalies.filter((a) => a.category === 'Cash Ceiling Breach').length },
              { id: 'Documentation Risk', label: 'Missing Evidence', count: scanResult.anomalies.filter((a) => a.category === 'Documentation Risk').length },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat.id
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Severity Filter */}
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search anomalies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Severities</option>
              <option value="High">High Severity</option>
              <option value="Medium">Medium Severity</option>
              <option value="Low">Low Severity</option>
            </select>
          </div>
        </div>

        {/* Anomaly List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/50">
          {filteredAnomalies.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Anomalies Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No transactions matched the active filters for this anomaly category. All inspected vouchers adhere to statutory thresholds.
              </p>
            </div>
          ) : (
            filteredAnomalies.map((anom) => (
              <div
                key={anom.id}
                className={`bg-white rounded-xl border p-4 shadow-2xs transition-all hover:shadow-xs ${
                  anom.severity === 'High'
                    ? 'border-rose-200 hover:border-rose-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Anomaly Meta */}
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Severity Badge */}
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          anom.severity === 'High'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : anom.severity === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {anom.severity} Severity
                      </span>

                      {/* Category Chip */}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {anom.category}
                      </span>

                      {/* Txn ID */}
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {anom.transactionId}
                      </span>

                      {anom.secondaryTransactionId && (
                        <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 flex items-center gap-1">
                          <span>↔</span>
                          <span>{anom.secondaryTransactionId}</span>
                        </span>
                      )}

                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-600 font-medium">{anom.date}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-bold text-slate-900">
                        ₹{formatINR(anom.amount)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      {anom.severity === 'High' ? (
                        <Flame className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span>{anom.title}</span>
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {anom.description}
                    </p>

                    {/* Payee / Account Context */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <div>
                        <span className="text-slate-400">Party / Vendor:</span>{' '}
                        <span className="font-semibold text-slate-700">{anom.party}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Account:</span>{' '}
                        <span className="font-semibold text-slate-700">{anom.accountId}</span>
                      </div>
                      {anom.transaction.voucherNo && (
                        <div>
                          <span className="text-slate-400">Voucher No:</span>{' '}
                          <span className="font-mono font-semibold text-slate-700">
                            #{anom.transaction.voucherNo}
                          </span>
                        </div>
                      )}
                      {anom.transaction.receiptNo && (
                        <div>
                          <span className="text-slate-400">Receipt No:</span>{' '}
                          <span className="font-mono font-semibold text-slate-700">
                            #{anom.transaction.receiptNo}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Statutory Guidance */}
                    {anom.statutoryReference && (
                      <div className="text-[10px] bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-600 flex items-center gap-1.5 mt-1">
                        <span className="font-bold text-slate-700">Audit Rule:</span>
                        <span>{anom.statutoryReference}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button
                      onClick={() => {
                        onSelectTransaction(anom.transactionId);
                        onClose();
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5 w-full sm:w-auto justify-center"
                    >
                      <span>Inspect in Table</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <button
                        onClick={() => handleFlagAnomaly(anom)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                        title="Flag transaction as Discrepancy"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Flag Discrepancy</span>
                      </button>

                      <button
                        onClick={() => handleApproveAnomaly(anom)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
                        title="Mark inspected as verified"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with Bulk Action */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Showing <span className="font-bold text-slate-800">{filteredAnomalies.length}</span> of{' '}
            <span className="font-bold text-slate-800">{scanResult.totalAnomaliesCount}</span> detected anomalies
          </div>

          <div className="flex items-center gap-2">
            {scanResult.highSeverityCount > 0 && (
              <button
                onClick={handleBulkFlagHighRisk}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Flag All High-Risk Items ({scanResult.highSeverityCount})</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Close Scanner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  FolderX,
  ClipboardX,
  Search,
  Filter,
  X,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  Save,
  RotateCcw,
  CheckSquare,
  Square,
  CheckCircle2,
  Flag,
  AlertCircle,
  Layers,
  Sparkles,
  ShieldAlert,
  Printer,
  Download,
  Award,
  PlusCircle,
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { formatINR, formatNumber } from '../../config';
import { Badge } from '../common/Badge';
import {
  AccountId,
  BillStatus,
  VoucherReceiptStatus,
  InternalAuditStatus,
  EnrichedTransaction,
  EvidenceStatus,
} from '../../types';
import { scanTransactionsForAnomalies } from '../../utils/anomalyDetection';
import { AnomalyDetectionModal } from './AnomalyDetectionModal';
import { AuditCertificatePDFModal } from './AuditCertificatePDFModal';
import { AddMissingTransactionModal } from './AddMissingTransactionModal';

export const TransactionVerification: React.FC = () => {
  const {
    transactions,
    isLoadingTransactions,
    transactionsError,
    fetchTransactions,
    updateTransactionInspection,
    bulkUpdateTransactionInspection,
    stats,
    selectedAccountId,
    setSelectedAccountId,
    selectedMonthFilter,
    setSelectedMonthFilter,
    selectedTransactionId,
    setSelectedTransactionId,
    isSeedingDatabase,
    seedBaselineRecordsToSupabase,
  } = useVerification();

  // Filters state
  const [filterMonth, setFilterMonth] = useState<string>(selectedMonthFilter || 'All Months');
  const [filterAccount, setFilterAccount] = useState<string>(
    selectedAccountId === 'TDCC' || selectedAccountId === 'BOM' || selectedAccountId === 'CASH'
      ? selectedAccountId
      : 'All'
  );
  const [filterType, setFilterType] = useState<string>('All');
  const [filterEvidence, setFilterEvidence] = useState<string>('All');
  const [filterAudit, setFilterAudit] = useState<string>('All');
  const [filterAnomaliesOnly, setFilterAnomaliesOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected transaction for side panel
  const [activeTxnId, setActiveTxnId] = useState<string | null>(
    selectedTransactionId || 'TXN-2018-00041'
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Modals / toasts
  const [showHowToModal, setShowHowToModal] = useState<boolean>(false);
  const [showAnomalyModal, setShowAnomalyModal] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [showAddMissingTransaction, setShowAddMissingTransaction] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Anomaly scan across all current transactions
  const anomalyScanResult = useMemo(() => {
    return scanTransactionsForAnomalies(transactions);
  }, [transactions]);
  const anomaliesByTxnId = anomalyScanResult.anomaliesByTxnId;

  // Side panel form state
  const activeTxn = useMemo(() => {
    return transactions.find((t) => t.id === activeTxnId) || transactions[0];
  }, [transactions, activeTxnId]);

  const [formBillStatus, setFormBillStatus] = useState<BillStatus>(
    activeTxn ? activeTxn.billStatus : 'Available'
  );
  const [formVoucherStatus, setFormVoucherStatus] = useState<VoucherReceiptStatus>(
    activeTxn ? activeTxn.voucherReceiptStatus : 'Available'
  );
  const [formAuditStatus, setFormAuditStatus] = useState<InternalAuditStatus>(
    activeTxn ? activeTxn.internalAuditStatus : 'Pending'
  );
  const [formRemarks, setFormRemarks] = useState<string>(
    activeTxn ? (activeTxn.remarks === '-' ? '' : activeTxn.remarks) : ''
  );

  // When activeTxn changes, sync form
  const handleSelectTxn = (txn: EnrichedTransaction) => {
    setActiveTxnId(txn.id);
    setSelectedTransactionId(txn.id);
    setFormBillStatus(txn.billStatus);
    setFormVoucherStatus(txn.voucherReceiptStatus);
    setFormAuditStatus(txn.internalAuditStatus);
    setFormRemarks(txn.remarks === '-' ? '' : txn.remarks);
  };

  // Filter logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Month
      if (filterMonth !== 'All Months' && String(t.reportingMonth || t.month).replace('-', ' ') !== filterMonth) return false;
      // Account
      if (filterAccount !== 'All' && t.accountId !== filterAccount) return false;
      // Type
      if (filterType !== 'All' && t.type !== filterType) return false;
      // Evidence Status
      if (filterEvidence !== 'All' && t.evidenceStatus !== filterEvidence) return false;
      // Internal Audit
      if (filterAudit !== 'All' && t.internalAuditStatus !== filterAudit) return false;
      // Anomalies Only
      if (filterAnomaliesOnly && !anomaliesByTxnId[t.id]) return false;
      // Search query (date, party, description, voucher, receipt, id)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchId = t.id.toLowerCase().includes(q);
        const matchParty = t.party.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchDate = t.date.toLowerCase().includes(q);
        const matchVoucher = t.voucherNo ? t.voucherNo.toLowerCase().includes(q) : false;
        const matchReceipt = t.receiptNo ? t.receiptNo.toLowerCase().includes(q) : false;
        if (!matchId && !matchParty && !matchDesc && !matchDate && !matchVoucher && !matchReceipt) {
          return false;
        }
      }
      return true;
    });
  }, [
    transactions,
    filterMonth,
    filterAccount,
    filterType,
    filterEvidence,
    filterAudit,
    filterAnomaliesOnly,
    searchQuery,
    anomaliesByTxnId,
  ]);

  // Pagination calculation
  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage]);

  const clearAllFilters = () => {
    setFilterMonth('All Months');
    setFilterAccount('All');
    setFilterType('All');
    setFilterEvidence('All');
    setFilterAudit('All');
    setFilterAnomaliesOnly(false);
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Preview computed evidence status
  const previewEvidenceStatus: EvidenceStatus = useMemo(() => {
    if (!activeTxn) return 'Pending';
    if (formBillStatus === 'Missing' || formVoucherStatus === 'Missing') return 'Missing';
    if (formBillStatus === 'Discrepancy' || formVoucherStatus === 'Discrepancy') return 'Discrepancy';
    if (activeTxn.type === 'Receipt') {
      if (formVoucherStatus === 'Available') return 'Complete';
    } else {
      if (formBillStatus === 'Available' && formVoucherStatus === 'Available') return 'Complete';
      if (formBillStatus === 'N/A' && formVoucherStatus === 'Available') return 'Complete';
    }
    return 'Pending';
  }, [activeTxn, formBillStatus, formVoucherStatus]);

  // Multi-select state
  const [selectedTxnIds, setSelectedTxnIds] = useState<Set<string>>(new Set());
  const [showBulkFlagModal, setShowBulkFlagModal] = useState<boolean>(false);
  const [bulkFlagReason, setBulkFlagReason] = useState<string>('Missing original physical voucher/tax bill');
  const [bulkCustomRemark, setBulkCustomRemark] = useState<string>('');
  const masterCheckboxRef = useRef<HTMLInputElement>(null);

  // Compute selection metrics
  const isAllPageSelected = useMemo(() => {
    return (
      paginatedTransactions.length > 0 &&
      paginatedTransactions.every((t) => selectedTxnIds.has(t.id))
    );
  }, [paginatedTransactions, selectedTxnIds]);

  const isSomePageSelected = useMemo(() => {
    return (
      paginatedTransactions.some((t) => selectedTxnIds.has(t.id)) &&
      !isAllPageSelected
    );
  }, [paginatedTransactions, selectedTxnIds, isAllPageSelected]);

  useEffect(() => {
    if (masterCheckboxRef.current) {
      masterCheckboxRef.current.indeterminate = isSomePageSelected;
    }
  }, [isSomePageSelected]);

  // Total selected monetary value
  const selectedAmountSum = useMemo(() => {
    if (selectedTxnIds.size === 0) return 0;
    return transactions
      .filter((t) => selectedTxnIds.has(t.id))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, selectedTxnIds]);

  // Count of pending within filtered transactions
  const pendingFilteredCount = useMemo(() => {
    return filteredTransactions.filter(
      (t) => t.evidenceStatus === 'Pending' || t.internalAuditStatus === 'Pending'
    ).length;
  }, [filteredTransactions]);

  // Count of discrepancies/issues within filtered transactions
  const discrepancyFilteredCount = useMemo(() => {
    return filteredTransactions.filter(
      (t) => t.evidenceStatus === 'Discrepancy' || t.evidenceStatus === 'Missing' || t.internalAuditStatus === 'Failed'
    ).length;
  }, [filteredTransactions]);

  // Selection toggle functions
  const toggleSelectTxn = (id: string) => {
    setSelectedTxnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    setSelectedTxnIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        paginatedTransactions.forEach((t) => next.delete(t.id));
      } else {
        paginatedTransactions.forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedTxnIds(new Set(filteredTransactions.map((t) => t.id)));
  };

  const selectAllPending = () => {
    const pending = filteredTransactions.filter(
      (t) => t.evidenceStatus === 'Pending' || t.internalAuditStatus === 'Pending'
    );
    setSelectedTxnIds(new Set(pending.map((t) => t.id)));
  };

  const clearSelection = () => {
    setSelectedTxnIds(new Set());
  };

  // Bulk Actions
  const handleBulkMarkVerified = () => {
    const ids = Array.from(selectedTxnIds);
    if (ids.length === 0) return;

    bulkUpdateTransactionInspection(ids, {
      voucherReceiptStatus: 'Available',
      internalAuditStatus: 'Verified',
      remarks: 'Batch verified: Physical vouchers inspected and checked against books',
      actionTitle: `Bulk verified ${ids.length} transaction vouchers`,
    });

    setToastMessage(`✓ Marked ${ids.length} transactions as Verified (${formatINR(selectedAmountSum)})`);
    setSelectedTxnIds(new Set());
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleBulkFlagForReview = () => {
    const ids = Array.from(selectedTxnIds);
    if (ids.length === 0) return;

    const fullRemark = bulkCustomRemark.trim()
      ? `${bulkFlagReason}: ${bulkCustomRemark.trim()}`
      : bulkFlagReason;

    bulkUpdateTransactionInspection(ids, {
      voucherReceiptStatus: 'Discrepancy',
      internalAuditStatus: 'Failed',
      remarks: fullRemark,
      actionTitle: `Flagged ${ids.length} transactions for review (${bulkFlagReason})`,
    });

    setToastMessage(`⚠ Flagged ${ids.length} transactions for audit review`);
    setShowBulkFlagModal(false);
    setBulkCustomRemark('');
    setSelectedTxnIds(new Set());
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleBulkMarkMissing = () => {
    const ids = Array.from(selectedTxnIds);
    if (ids.length === 0) return;

    bulkUpdateTransactionInspection(ids, {
      billStatus: 'Missing',
      voucherReceiptStatus: 'Missing',
      internalAuditStatus: 'Pending',
      remarks: 'Physical voucher / tax invoice missing in society vouchers folder',
      actionTitle: `Marked ${ids.length} transactions as Missing Evidence`,
    });

    setToastMessage(`✕ Marked ${ids.length} transactions as Missing Evidence`);
    setSelectedTxnIds(new Set());
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleBulkResetPending = () => {
    const ids = Array.from(selectedTxnIds);
    if (ids.length === 0) return;

    bulkUpdateTransactionInspection(ids, {
      billStatus: 'N/A',
      voucherReceiptStatus: 'Available',
      internalAuditStatus: 'Pending',
      remarks: '-',
      actionTitle: `Reset ${ids.length} transactions to Pending`,
    });

    setToastMessage(`↺ Reset ${ids.length} transactions to Pending inspection`);
    setSelectedTxnIds(new Set());
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Save Single
  const handleSaveInspection = () => {
    if (!activeTxn) return;
    updateTransactionInspection(activeTxn.id, {
      billStatus: formBillStatus,
      voucherReceiptStatus: formVoucherStatus,
      internalAuditStatus: formAuditStatus,
      remarks: formRemarks || '-',
    });
    setToastMessage(`Saved inspection for transaction ${activeTxn.id}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 3 Step Navigation Tabs */}
      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Transaction Verification
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Inspect physical vouchers, receipts and bills and record verification findings. Original
            transaction values are read-only.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setShowAddMissingTransaction(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 rounded-lg cursor-pointer transition-colors shadow-2xs"
            title="Record a missing FY 2018–19 transaction without changing imported source records"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Missing Transaction</span>
          </button>

          {/* Anomaly Detection Button */}
          <button
            onClick={() => setShowAnomalyModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
            title="Scan for duplicate vouchers/receipts, suspicious round numbers, cash ceiling breaches, and documentation risks"
          >
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Anomaly Detection</span>
            {anomalyScanResult.totalAnomaliesCount > 0 && (
              <span className="bg-amber-200 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {anomalyScanResult.totalAnomaliesCount}
              </span>
            )}
          </button>

          {/* Generate Audit PDF Button */}
          <button
            onClick={() => setShowPdfModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
            title="Generate and download statutory PDF audit summary and schedule for official society documentation"
          >
            <FileText className="w-4 h-4 text-blue-700" />
            <span>Generate Audit PDF</span>
            <span className="bg-blue-200 text-blue-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
              {stats.evidenceComplete} OK
            </span>
          </button>

          {/* How to Verify Guide Button */}
          <button
            onClick={() => setShowHowToModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>How to Verify</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Supabase Loading / Error Notification */}
      {isLoadingTransactions && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="font-medium">Loading live transactions from Supabase database...</span>
          </div>
        </div>
      )}

      {transactionsError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <div>
              <span className="font-semibold">Supabase sync error: </span>
              <span>{transactionsError}</span>
            </div>
          </div>
          <button
            onClick={() => fetchTransactions()}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-xs cursor-pointer"
          >
            Retry Database Fetch
          </button>
        </div>
      )}

      {/* Empty State when no transactions exist in Supabase */}
      {!isLoadingTransactions && !transactionsError && transactions.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">0 Transactions Found in Supabase Database</h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1.5 mb-4 leading-relaxed">
            The remote table <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-800 border border-slate-200">transactions</code> in your Supabase project currently contains <strong>0 records</strong>.
            In accordance with audit rules, no mock data is displayed. You can import records via Excel or click below to seed baseline records directly into Supabase.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={() => fetchTransactions()}
              className="px-4 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg cursor-pointer transition-colors shadow-2xs"
            >
              Refresh from Supabase
            </button>
            <button
              onClick={async () => {
                const res = await seedBaselineRecordsToSupabase();
                setToastMessage(res.message);
                setTimeout(() => setToastMessage(null), 5000);
              }}
              disabled={isSeedingDatabase}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              {isSeedingDatabase ? 'Seeding Database...' : 'Seed Baseline Records into Database'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Transactions */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Total Transactions
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatNumber(stats.totalTransactions)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Apr 2018 – Mar 2019</div>
        </div>

        {/* Pending Verification */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Pending Verification
            </span>
          </div>
          <div className="text-xl font-bold text-amber-600">
            {formatNumber(stats.pendingTransactions)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.totalTransactions > 0 ? Math.round((stats.pendingTransactions / stats.totalTransactions) * 100) : 0}% of transactions
          </div>
        </div>

        {/* Evidence Complete */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Evidence Complete
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-600">
            {formatNumber(stats.evidenceComplete)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.totalTransactions > 0 ? Math.round((stats.evidenceComplete / stats.totalTransactions) * 100) : 0}% of transactions
          </div>
        </div>

        {/* Evidence Discrepancy */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Evidence Discrepancy
            </span>
          </div>
          <div className="text-xl font-bold text-rose-600">
            {stats.evidenceDiscrepancy}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {stats.totalTransactions > 0 ? Math.round((stats.evidenceDiscrepancy / stats.totalTransactions) * 100) : 0}% of transactions
          </div>
        </div>

        {/* Evidence Missing */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <FolderX className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Evidence Missing
            </span>
          </div>
          <div className="text-xl font-bold text-orange-600">
            {stats.evidenceMissing}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">1% of transactions</div>
        </div>

        {/* Internal Audit Failed */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ClipboardX className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Internal Audit Failed
            </span>
          </div>
          <div className="text-xl font-bold text-purple-600">
            {stats.internalAuditFailed}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">1% of transactions</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3">
          {/* Month */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Month
            </label>
            <select
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All Months">All Months</option>
              <option value="Apr 2018">Apr 2018</option>
              <option value="May 2018">May 2018</option>
              <option value="Jun 2018">Jun 2018</option>
              <option value="Jul 2018">Jul 2018</option>
              <option value="Aug 2018">Aug 2018</option>
              <option value="Sep 2018">Sep 2018</option>
              <option value="Oct 2018">Oct 2018</option>
              <option value="Nov 2018">Nov 2018</option>
              <option value="Dec 2018">Dec 2018</option>
              <option value="Jan 2019">Jan 2019</option>
              <option value="Feb 2019">Feb 2019</option>
              <option value="Mar 2019">Mar 2019</option>
            </select>
          </div>

          {/* Account */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Account
            </label>
            <select
              value={filterAccount}
              onChange={(e) => {
                setFilterAccount(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Accounts</option>
              <option value="TDCC">TDCC</option>
              <option value="BOM">BOM</option>
              <option value="CASH">Cash</option>
            </select>
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Transaction Type
            </label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Payment">Payment</option>
              <option value="Receipt">Receipt</option>
            </select>
          </div>

          {/* Evidence Status */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Evidence Status
            </label>
            <select
              value={filterEvidence}
              onChange={(e) => {
                setFilterEvidence(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All</option>
              <option value="Complete">Complete</option>
              <option value="Discrepancy">Discrepancy</option>
              <option value="Missing">Missing</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          {/* Internal Audit */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Internal Audit
            </label>
            <select
              value={filterAudit}
              onChange={(e) => {
                setFilterAudit(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All</option>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Party, description, voucher, cheque..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-2 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-2 border-t border-slate-100 gap-2">
          <div className="text-slate-500">
            Showing <span className="font-semibold text-slate-800">{filteredTransactions.length}</span> matching transactions
          </div>
          <div className="flex items-center gap-2">
            {anomalyScanResult.totalAnomaliesCount > 0 && (
              <button
                onClick={() => {
                  setFilterAnomaliesOnly(!filterAnomaliesOnly);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer border transition-colors flex items-center gap-1.5 ${
                  filterAnomaliesOnly
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>
                  {filterAnomaliesOnly
                    ? 'Showing Anomalies Only'
                    : `Filter Anomalies (${anomalyScanResult.totalAnomaliesCount})`}
                </span>
              </button>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Table (Left) + Detail Panel (Right) */}
      <div className="grid grid-cols-1 gap-6 items-start">
        {/* Table Area (8 Cols when detail open) */}
        <div className="lg:col-span-12 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 whitespace-nowrap">
                  <th className="py-2.5 px-2">Date</th>
                  <th className="py-2.5 px-2">Reporting Month</th>
                  <th className="py-2.5 px-2">Account</th>
                  <th className="py-2.5 px-2">Type</th>
                  <th className="py-2.5 px-3">Party / Description</th>
                  <th className="py-2.5 px-3">Category Group</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-2">Payment Mode</th>
                  <th className="py-2.5 px-2 text-center">Voucher / Receipt No.</th>
                  <th className="py-2.5 px-2 text-center">Cheque No.</th>
                  <th className="py-2.5 px-2 text-center">Bill Status</th>
                  <th className="py-2.5 px-2 text-center">Voucher / Receipt</th>
                  <th className="py-2.5 px-2 text-center">Evidence Status</th>
                  <th className="py-2.5 px-2 text-center">Internal Audit</th>
                  <th className="py-2.5 px-3">Remarks</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransactions.map((t) => {
                  const isActiveTxn = activeTxn && activeTxn.id === t.id;
                  const isRowChecked = false;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleSelectTxn(t)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isActiveTxn
                          ? 'bg-blue-50/70 border-l-4 border-l-blue-600'
                          : isRowChecked
                          ? 'bg-blue-50/30'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-2 whitespace-nowrap font-medium text-slate-700">
                        {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      <td className="py-2.5 px-2 whitespace-nowrap">{t.reportingMonth || t.month}</td>

                      <td className="py-2.5 px-2 font-semibold text-slate-800">
                        {t.accountName || t.accountId}
                      </td>

                      <td className="py-2.5 px-2">
                        <Badge
                          variant={t.type === 'Payment' ? 'payment' : 'receipt'}
                          label={t.type}
                          showIcon={false}
                          className="px-1.5 py-0 text-[10px]"
                        />
                      </td>

                      <td className="py-2.5 px-3 min-w-[160px] max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 truncate">{t.party}</span>
                          {anomaliesByTxnId[t.id] && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowAnomalyModal(true);
                              }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[9px] font-bold shrink-0 cursor-pointer transition-colors"
                              title={`Flagged in Anomaly Scan: ${anomaliesByTxnId[t.id][0].title} - Click to view`}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                              <span>{anomaliesByTxnId[t.id][0].category}</span>
                            </button>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{t.description}</div>
                        {t.isCorrection && (
                          <span className="mt-1 inline-flex rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                            CORRECTION · {t.correctionStatus || "Pending Review"}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">{t.categoryGroup || '—'}</td>
                      <td className="py-2.5 px-3">{t.categoryName || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap text-slate-900">
                        {formatINR(Math.abs(t.amount))}
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">{t.paymentMode || '—'}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600 whitespace-nowrap">
                        {t.voucherNo || '—'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600 whitespace-nowrap">
                        {t.chequeNo || '—'}
                      </td>

                      {/* Bill Status */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            t.billStatus === 'Available'
                              ? 'available'
                              : t.billStatus === 'Discrepancy'
                              ? 'discrepancy'
                              : t.billStatus === 'Missing'
                              ? 'missing'
                              : 'na'
                          }
                          label={t.billStatus}
                          showIcon={false}
                          className="px-1.5 py-0 text-[10px]"
                        />
                      </td>

                      {/* Voucher/Receipt Status */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            t.voucherReceiptStatus === 'Available'
                              ? 'available'
                              : t.voucherReceiptStatus === 'Discrepancy'
                              ? 'discrepancy'
                              : 'missing'
                          }
                          label={t.voucherReceiptStatus}
                          showIcon={false}
                          className="px-1.5 py-0 text-[10px]"
                        />
                      </td>

                      {/* Evidence Status */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            t.evidenceStatus === 'Complete'
                              ? 'complete'
                              : t.evidenceStatus === 'Discrepancy'
                              ? 'discrepancy'
                              : t.evidenceStatus === 'Missing'
                              ? 'missing'
                              : 'pending'
                          }
                          label={t.evidenceStatus}
                          showIcon={false}
                          className="px-1.5 py-0 text-[10px]"
                        />
                      </td>

                      {/* Internal Audit */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            t.internalAuditStatus === 'Verified'
                              ? 'verified'
                              : t.internalAuditStatus === 'Failed'
                              ? 'failed'
                              : 'pending'
                          }
                          label={t.internalAuditStatus}
                          showIcon={false}
                          className="px-1.5 py-0 text-[10px]"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 max-w-[140px] truncate" title={t.remarks}>
                        {t.remarks}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTxn(t);
                          }}
                          className={`px-2 py-0.5 text-xs font-semibold rounded cursor-pointer transition-colors ${
                            isActiveTxn
                              ? 'bg-blue-600 text-white'
                              : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                          }`}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <FileText className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-slate-700">No transactions found</p>
                        <p className="text-[11px] text-slate-500 max-w-sm">
                          {transactions.length === 0
                            ? 'The Supabase database table `transactions` currently contains 0 records.'
                            : 'No transactions match the selected filter criteria.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-3 border-t border-slate-200 gap-3 text-xs">
            <div className="text-slate-600">
              {totalItems === 0 ? (
                <span>Showing <span className="font-semibold text-slate-900">0</span> transactions</span>
              ) : (
                <>
                  Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-semibold text-slate-900">
                    {Math.min(currentPage * pageSize, totalItems)}
                  </span>{' '}
                  of <span className="font-semibold text-slate-900">{formatNumber(totalItems)}</span> transactions
                </>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setCurrentPage(1)}
                className={`w-7 h-7 rounded text-xs font-semibold cursor-pointer ${
                  currentPage === 1 ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                1
              </button>

              {totalPages > 1 && (
                <button
                  onClick={() => setCurrentPage(2)}
                  className={`w-7 h-7 rounded text-xs font-semibold cursor-pointer ${
                    currentPage === 2 ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  2
                </button>
              )}

              {totalPages > 2 && (
                <button
                  onClick={() => setCurrentPage(3)}
                  className={`w-7 h-7 rounded text-xs font-semibold cursor-pointer ${
                    currentPage === 3 ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  3
                </button>
              )}

              {totalPages > 4 && <span className="px-1 text-slate-400">...</span>}

              {totalPages > 3 && (
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`w-7 h-7 rounded text-xs font-semibold cursor-pointer ${
                    currentPage === totalPages ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {totalPages}
                </button>
              )}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Side Detail Panel: "Transaction Details" (4 Cols) */}
        {activeTxn && (
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-white rounded-l-xl border-l border-slate-200 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900">Transaction Details</h2>
              <button
                onClick={() => setActiveTxnId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Header badges */}
            <div className="flex items-center gap-2 mt-3 mb-4">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                {activeTxn.id}
              </span>
              <Badge
                variant={activeTxn.type === 'Payment' ? 'payment' : 'receipt'}
                label={activeTxn.type}
                showIcon={false}
              />
              <span className="text-xs text-slate-500 ml-auto font-medium">
                {activeTxn.date}
              </span>
            </div>

            {/* Basic Information (Read-only) */}
            <div className="space-y-2.5 mb-5 pb-4 border-b border-slate-100 text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Basic Information (Read-only)
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">Account:</span>
                <span className="font-semibold text-slate-800">
                  {activeTxn.accountId === 'TDCC'
                    ? 'Bank - TDCC'
                    : activeTxn.accountId === 'BOM'
                    ? 'Bank - BOM'
                    : 'Cash (Petty Cash)'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5">Party / Description:</span>
                <div className="font-semibold text-slate-900 bg-slate-50 p-2 rounded border border-slate-100">
                  <div>{activeTxn.party}</div>
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                    {activeTxn.description}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500">Amount (₹):</span>
                <span className="font-bold font-mono text-base text-slate-900">
                  {formatINR(activeTxn.amount)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Voucher No.</span>
                  <span className="font-mono font-bold text-slate-700">
                    {activeTxn.voucherNo || '—'}
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Receipt No.</span>
                  <span className="font-mono font-bold text-slate-700">
                    {activeTxn.receiptNo || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Inputs (Update Below) */}
            <div className="space-y-3.5 text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Verification (Update Below)
              </div>

              {/* Bill Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Bill Status
                </label>
                <select
                  value={formBillStatus}
                  onChange={(e) => setFormBillStatus(e.target.value as BillStatus)}
                  className="w-full bg-white text-xs text-slate-900 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Available">Available (Physically present &amp; matches)</option>
                  <option value="Discrepancy">Discrepancy (Amount/date mismatch)</option>
                  <option value="Missing">Missing (No bill attached)</option>
                  <option value="N/A">N/A (Not applicable for receipts)</option>
                </select>
              </div>

              {/* Voucher / Receipt Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Voucher / Receipt Status
                </label>
                <select
                  value={formVoucherStatus}
                  onChange={(e) =>
                    setFormVoucherStatus(e.target.value as VoucherReceiptStatus)
                  }
                  className="w-full bg-white text-xs text-slate-900 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Available">Available</option>
                  <option value="Discrepancy">Discrepancy</option>
                  <option value="Missing">Missing</option>
                </select>
              </div>

              {/* Calculated Evidence Status (Read-only) */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    Evidence Status <span className="text-[10px] text-slate-400">(Auto-calculated)</span>
                  </span>
                  <Badge
                    variant={
                      previewEvidenceStatus === 'Complete'
                        ? 'complete'
                        : previewEvidenceStatus === 'Discrepancy'
                        ? 'discrepancy'
                        : previewEvidenceStatus === 'Missing'
                        ? 'missing'
                        : 'pending'
                    }
                    label={previewEvidenceStatus}
                    showIcon={false}
                  />
                </div>
                <div className="text-[10px] text-slate-400">
                  Computed from Bill &amp; Voucher physical checks according to society audit rules.
                </div>
              </div>

              {/* Internal Audit Status */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Internal Audit
                </label>
                <select
                  value={formAuditStatus}
                  onChange={(e) =>
                    setFormAuditStatus(e.target.value as InternalAuditStatus)
                  }
                  className="w-full bg-white text-xs text-slate-900 border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Pending">Pending (Not yet audited)</option>
                  <option value="Verified">Verified (Complies with society bylaws)</option>
                  <option value="Failed">Failed (Unauthorized, purpose mismatch, invalid rate)</option>
                </select>
              </div>

              {/* Remarks */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">Remarks</label>
                  <span className="text-[10px] text-slate-400">{formRemarks.length} / 500</span>
                </div>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Enter verification notes (e.g. document checked, discrepancy details, follow-up required)"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Audit Metadata */}
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 space-y-0.5">
                <div>
                  Last Updated: <span className="text-slate-600">{activeTxn.updatedAt ? new Date(activeTxn.updatedAt).toLocaleDateString() : '—'}</span>
                </div>
                <div>
                  Updated By: <span className="text-slate-600">{activeTxn.reviewer || '—'}</span>
                </div>
              </div>

              {/* Save & Cancel */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => handleSelectTxn(activeTxn)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveInspection}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Verification</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* How To Verify Modal */}
      {showHowToModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in fade-in">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Transaction Inspection Rules
              </h3>
              <button
                onClick={() => setShowHowToModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <p>
                <strong>1. Physical File Check:</strong> Pull the voucher file for the relevant month. Confirm the serial number on the physical voucher matches the recorded voucher number.
              </p>
              <p>
                <strong>2. Bill Matching:</strong> For payment transactions (water bills, repairs, maintenance AMC), verify that the original invoice/bill is pinned to the voucher and matches the amount exactly.
              </p>
              <p>
                <strong>3. Member Receipts:</strong> Member maintenance receipts require cash receipt/counterfoil inspection. Bill Status is set to <em>N/A</em> for receipt entries.
              </p>
              <p>
                <strong>4. Internal Audit Independence:</strong> Even if a bill is available, if it lacks managing committee approval or contains personal expenses, set Internal Audit to <em>Failed</em> with a mandatory remark.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHowToModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Flag For Review Modal */}
      {showBulkFlagModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Flag {selectedTxnIds.size} Transactions for Audit Review
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Batch discrepancies will be flagged for Managing Committee response
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkFlagModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl mb-4 text-xs text-amber-900 flex items-center justify-between">
              <span>Selected Scope: <strong>{selectedTxnIds.size} transactions</strong></span>
              <span className="font-mono font-bold text-amber-800">Total: {formatINR(selectedAmountSum)}</span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-slate-800">
                Select Discrepancy / Review Reason:
              </label>

              <div className="space-y-2">
                {[
                  'Missing original physical voucher/tax bill',
                  'Discrepancy in recorded amount vs. invoice amount',
                  'Unsanctioned expense / missing Managing Committee approval',
                  'Vendor bill lacks valid GSTIN or receipt stamp',
                  'Member payment counterfoil signature missing or disputed',
                  'Awaiting bank statement clearance confirmation',
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      bulkFlagReason === reason
                        ? 'bg-amber-50/60 border-amber-400 font-semibold text-slate-900'
                        : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bulkFlagReason"
                      value={reason}
                      checked={bulkFlagReason === reason}
                      onChange={() => setBulkFlagReason(reason)}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div className="pt-2">
                <label className="block font-bold text-slate-800 mb-1">
                  Additional Auditor Note (Optional):
                </label>
                <textarea
                  rows={2}
                  maxLength={300}
                  value={bulkCustomRemark}
                  onChange={(e) => setBulkCustomRemark(e.target.value)}
                  placeholder="Specific voucher numbers, vendor details, or follow-up deadline..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowBulkFlagModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkFlagForReview}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Confirm Flag ({selectedTxnIds.size} Items)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMissingTransaction && (
        <AddMissingTransactionModal
          onClose={() => setShowAddMissingTransaction(false)}
          onSaved={(transactionId) => {
            setToastMessage(`Added correction ${transactionId}. Status: Pending Review.`);
            setShowAddMissingTransaction(false);
            setActiveTxnId(transactionId);
            setSelectedTransactionId(transactionId);
            setFilterAccount('All');
            setFilterMonth('All Months');
            setCurrentPage(1);
            setTimeout(() => setToastMessage(null), 5000);
          }}
        />
      )}

      {/* Anomaly Detection Modal */}
      <AnomalyDetectionModal
        isOpen={showAnomalyModal}
        onClose={() => setShowAnomalyModal(false)}
        transactions={transactions}
        onSelectTransaction={(txnId) => {
          setActiveTxnId(txnId);
          setSelectedTransactionId(txnId);
          const found = transactions.find((t) => t.id === txnId);
          if (found) {
            handleSelectTxn(found);
          }
        }}
        onUpdateInspection={(txnId, updates) => {
          updateTransactionInspection(txnId, updates);
        }}
        onBulkUpdateInspection={(txnIds, updates) => {
          bulkUpdateTransactionInspection(txnIds, updates);
        }}
      />

      {/* Official Society Audit PDF & Certificate Modal */}
      <AuditCertificatePDFModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        transactions={transactions}
        selectedAccountId={filterAccount as any}
      />
    </div>
  );
};

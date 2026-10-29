import React, { useState, useMemo } from 'react';
import {
  Landmark,
  FileText,
  CheckCircle,
  AlertTriangle,
  FolderX,
  ClipboardX,
  PieChart,
  ArrowRight,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  X,
  BookOpen,
  Info,
  Activity,
  History,
  FileCheck2,
  BarChart3,
  Clock,
  User,
  Search,
  Filter,
  Tag,
  XCircle,
  RotateCcw,
  StickyNote,
  TableProperties,
  FileSpreadsheet,
  Database,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { useVerification } from '../../context/VerificationContext';
import { formatINR, formatNumber } from '../../config';
import { Badge } from '../common/Badge';
import { AuditQuickNotesDrawer } from './AuditQuickNotesDrawer';
import { QuickSummaryOverlay } from './QuickSummaryOverlay';
import { AuditModuleKey } from '../../types';

// Custom Tooltip for Recharts Pie Chart
const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs backdrop-blur-xs min-w-[210px] z-50">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.payload.color }} />
          <span className="font-bold text-slate-100">{data.name}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300 font-mono mb-1">
          <span>Count:</span>
          <span className="font-bold text-white text-sm">{formatNumber(data.value)}</span>
        </div>
        <div className="flex justify-between items-center text-slate-300 font-mono mb-1.5">
          <span>Percentage:</span>
          <span className="font-bold text-emerald-400">{data.payload.percentage}</span>
        </div>
        <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1.5 leading-snug">
          {data.payload.description}
        </div>
      </div>
    );
  }
  return null;
};

export const VerificationDashboard: React.FC = () => {
  const {
    setCurrentScreen,
    setSelectedAccountId,
    setSelectedMonthFilter,
    setSelectedTransactionId,
    stats,
    issues,
    monthlySummaries,
    changeLogs,
    navigateToIssue,
    auditNotes,
    isSeedingDatabase,
    seedBaselineRecordsToSupabase,
    refetchFromSupabase,
  } = useVerification();

  const [seedToast, setSeedToast] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAllIssuesModal, setShowAllIssuesModal] = useState(false);
  const [showAuditLogModal, setShowAuditLogModal] = useState(false);

  // Quick Summary Overlay & Ingestion Studio State
  const [showQuickSummaryModal, setShowQuickSummaryModal] = useState(false);
  const [quickSummaryTab, setQuickSummaryTab] = useState<'summary' | 'excel-ingestion' | 'audit-trail' | 'database-info' | 'architecture'>('summary');

  // Quick Notes Drawer State
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [notesDrawerFilter, setNotesDrawerFilter] = useState<'all' | AuditModuleKey>('all');

  // Search & Category Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'modules' | 'issues' | 'high-priority' | 'months'>('all');
  const [accountFilter, setAccountFilter] = useState<'all' | 'TDCC' | 'BOM' | 'CASH'>('all');

  // Pie Chart View Mode State
  const [chartViewMode, setChartViewMode] = useState<'status' | 'verified-vs-pending' | 'modules'>('status');

  // Recharts Pie Chart Data for Verification Distribution
  const pieDataConfig = useMemo(() => {
    if (chartViewMode === 'verified-vs-pending') {
      const verified = stats.evidenceComplete;
      const issuesCount = stats.evidenceDiscrepancy + stats.evidenceMissing + stats.internalAuditFailed;
      const pending = stats.pendingTransactions;
      const total = stats.totalTransactions;

      return {
        title: 'Verified vs. Pending Transactions',
        subtitle: 'Macro distribution of audited complete vs. pending & discrepant transactions',
        centerCount: total > 0 ? `${Math.round((verified / total) * 100)}%` : '0%',
        centerLabel: 'Verified',
        totalItems: total,
        data: [
          {
            name: 'Verified Complete',
            value: verified,
            color: '#10b981',
            percentage: total > 0 ? `${((verified / total) * 100).toFixed(1)}%` : '0%',
            description: 'Vouchers physically inspected and confirmed matching original records',
          },
          {
            name: 'Pending Verification',
            value: pending,
            color: '#3b82f6',
            percentage: total > 0 ? `${((pending / total) * 100).toFixed(1)}%` : '0%',
            description: 'Physical records pending voucher-by-voucher examination',
          },
          {
            name: 'Action Required (Issues)',
            value: issuesCount,
            color: '#f43f5e',
            percentage: total > 0 ? `${((issuesCount / total) * 100).toFixed(1)}%` : '0%',
            description: 'Flagged with discrepancies, missing bills, or audit scrutiny issues',
          },
        ],
      };
    }

    if (chartViewMode === 'modules') {
      const verifiedOpening = stats.openingBalancesVerified;
      const verifiedTxn = stats.evidenceComplete;
      const verifiedRecon = stats.reconciledAccountMonths;
      const totalVerified = verifiedOpening + verifiedTxn + verifiedRecon;

      const openIssuesCount = issues.length;
      const pendingOpening = stats.openingBalancesTotal - stats.openingBalancesVerified;
      const pendingTxn = stats.pendingTransactions;
      const pendingRecon = stats.totalAccountMonths - stats.reconciledAccountMonths;
      const totalPending = pendingOpening + pendingTxn + pendingRecon;
      const grandTotal = totalVerified + openIssuesCount + totalPending;

      return {
        title: 'Verification Tasks Across All 3 Modules',
        subtitle: 'Task distribution across Opening Balances, Transactions & Monthly Reconciliation',
        centerCount: grandTotal > 0 ? `${Math.round((totalVerified / grandTotal) * 100)}%` : '0%',
        centerLabel: 'Completed',
        totalItems: grandTotal,
        data: [
          {
            name: 'Verified Tasks',
            value: totalVerified,
            color: '#10b981',
            percentage: grandTotal > 0 ? `${((totalVerified / grandTotal) * 100).toFixed(1)}%` : '0%',
            description: `${verifiedOpening} Opening Bal + ${verifiedTxn} Transactions + ${verifiedRecon} Monthly Reconciliations`,
          },
          {
            name: 'Pending Audit Tasks',
            value: totalPending,
            color: '#3b82f6',
            percentage: grandTotal > 0 ? `${((totalPending / grandTotal) * 100).toFixed(1)}%` : '0%',
            description: `${pendingOpening} Opening Bal + ${pendingTxn} Transactions + ${pendingRecon} Monthly Reconciliations`,
          },
          {
            name: 'Open Discrepancies & Issues',
            value: openIssuesCount,
            color: '#f43f5e',
            percentage: grandTotal > 0 ? `${((openIssuesCount / grandTotal) * 100).toFixed(1)}%` : '0%',
            description: `${openIssuesCount} Open Issues flagged in database`,
          },
        ],
      };
    }

    // Default: 'status' (Detailed Transaction Status Breakdown)
    const total = stats.totalTransactions;
    return {
      title: 'Transaction Audit Verification Distribution',
      subtitle: `Breakdown of ${formatNumber(stats.totalTransactions)} transactions in Supabase by evidence status and audit findings`,
      centerCount: `${formatNumber(stats.inspectedTransactions)}`,
      centerLabel: 'Inspected',
      totalItems: total,
      data: [
        {
          name: 'Verified & Complete',
          value: stats.evidenceComplete,
          color: '#10b981',
          percentage: total > 0 ? `${((stats.evidenceComplete / total) * 100).toFixed(1)}%` : '0%',
          description: 'Physical voucher located, amount matched, full supporting evidence',
        },
        {
          name: 'Pending Inspection',
          value: stats.pendingTransactions,
          color: '#94a3b8',
          percentage: total > 0 ? `${((stats.pendingTransactions / total) * 100).toFixed(1)}%` : '0%',
          description: 'Awaiting physical retrieval and verification from record binders',
        },
        {
          name: 'Discrepancy Found',
          value: stats.evidenceDiscrepancy,
          color: '#f43f5e',
          percentage: total > 0 ? `${((stats.evidenceDiscrepancy / total) * 100).toFixed(1)}%` : '0%',
          description: 'Amount mismatch, missing supporting bill, or unauthorized rate',
        },
        {
          name: 'Missing Evidence',
          value: stats.evidenceMissing,
          color: '#f97316',
          percentage: total > 0 ? `${((stats.evidenceMissing / total) * 100).toFixed(1)}%` : '0%',
          description: 'Voucher not present in box file; requires managing committee trace',
        },
        {
          name: 'Internal Audit Failed',
          value: stats.internalAuditFailed,
          color: '#ef4444',
          percentage: total > 0 ? `${((stats.internalAuditFailed / total) * 100).toFixed(1)}%` : '0%',
          description: 'Failed society bylaw rule, missing quotation, or non-compliant payment',
        },
      ],
    };
  }, [chartViewMode, stats, issues]);

  // Master definition of all 3 audit modules for quick search & navigation
  const allModules = useMemo(() => [
    {
      id: 'mod-1',
      title: 'Opening Balance Verification',
      screen: 'opening-balances' as const,
      description: 'Audit closing balance of FY 2017-18 vs. verified opening balances of Bank of Maharashtra, TDCC and Cash.',
      accounts: 'Cash, TDCC, BOM',
      progress: stats.openingBalancesTotal > 0 ? `${Math.round((stats.openingBalancesVerified / stats.openingBalancesTotal) * 100)}% Verified` : '0% Verified',
      statusText: `${stats.openingBalancesVerified} of ${stats.openingBalancesTotal} verified`,
      tags: ['opening', 'balances', 'audit', 'cash', 'tdcc', 'bom', 'starting', 'passbook'],
      icon: Landmark,
      color: 'blue',
    },
    {
      id: 'mod-2',
      title: 'Transaction Verification',
      screen: 'transaction-verification' as const,
      description: `Inspect physical vouchers, receipts and bills for ${formatNumber(stats.totalTransactions)} transactions in Supabase. Record evidence & audit results.`,
      accounts: 'Cash, TDCC, BOM',
      progress: stats.totalTransactions > 0 ? `${Math.round((stats.inspectedTransactions / stats.totalTransactions) * 100)}% Inspected` : '0% Inspected',
      statusText: `${stats.evidenceComplete} Complete • ${stats.evidenceDiscrepancy} Discrepancies • ${stats.internalAuditFailed} Failed`,
      tags: ['transactions', 'vouchers', 'receipts', 'bills', 'inspection', 'audit failed', 'complete', 'missing', 'water', 'electricity', 'amc'],
      icon: FileCheck2,
      color: 'emerald',
    },
    {
      id: 'mod-3',
      title: 'Account-wise Monthly Reconciliation',
      screen: 'monthly-reconciliation' as const,
      description: 'Validate month-by-month account movements, opening carry forwards, debits, credits and closing balances.',
      accounts: 'TDCC, BOM, Cash',
      progress: stats.totalAccountMonths > 0 ? `${Math.round((stats.reconciledAccountMonths / stats.totalAccountMonths) * 100)}% Reconciled` : '0% Reconciled',
      statusText: `${stats.reconciledAccountMonths} of ${stats.totalAccountMonths} reconciled`,
      tags: ['monthly', 'reconciliation', 'passbook', 'credits', 'debits', 'adjustments', 'closing balance', 'tdcc', 'bom', 'cash', 'jul 2018'],
      icon: BarChart3,
      color: 'purple',
    },
  ], [stats]);

  // Filtered Action Items (Issues)
  const filteredActionItems = useMemo(() => {
    return issues.filter((issue) => {
      if (accountFilter !== 'all' && issue.account !== accountFilter) return false;
      if (categoryFilter === 'high-priority' && issue.priority !== 'High') return false;
      if (categoryFilter === 'modules' || categoryFilter === 'months') return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = issue.issue.toLowerCase().includes(q);
        const matchSource = issue.source.toLowerCase().includes(q);
        const matchAcc = issue.account.toLowerCase().includes(q);
        const matchMonth = issue.month.toLowerCase().includes(q);
        const matchAmount = issue.amount.toString().includes(q);
        if (!matchTitle && !matchSource && !matchAcc && !matchMonth && !matchAmount) {
          return false;
        }
      }
      return true;
    });
  }, [issues, searchQuery, categoryFilter, accountFilter]);

  // Filtered Modules matching search
  const filteredModules = useMemo(() => {
    if (categoryFilter === 'issues' || categoryFilter === 'high-priority' || categoryFilter === 'months') {
      return [];
    }
    return allModules.filter((mod) => {
      if (accountFilter !== 'all' && !mod.accounts.toLowerCase().includes(accountFilter.toLowerCase())) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchTitle = mod.title.toLowerCase().includes(q);
        const matchDesc = mod.description.toLowerCase().includes(q);
        const matchTags = mod.tags.some((t) => t.includes(q));
        return matchTitle || matchDesc || matchTags;
      }
      return true;
    });
  }, [allModules, searchQuery, categoryFilter, accountFilter]);

  // Filtered Months matching search
  const filteredMonths = useMemo(() => {
    if (categoryFilter === 'modules' || categoryFilter === 'high-priority') return [];
    return monthlySummaries.filter((m) => {
      if (categoryFilter === 'months' || searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchMonth = m.month.toLowerCase().includes(q);
        const matchStatus = m.overallStatus.toLowerCase().includes(q);
        return matchMonth || matchStatus || (categoryFilter === 'months' && m.openIssues > 0);
      }
      return false;
    });
  }, [monthlySummaries, searchQuery, categoryFilter]);

  const isFilteringActive = searchQuery.trim() !== '' || categoryFilter !== 'all' || accountFilter !== 'all';
  const totalResultsCount = filteredModules.length + filteredActionItems.length + filteredMonths.length;

  // Consolidated High-Level Cross-Module Audit Summary Metrics
  const auditSummaryMetrics = useMemo(() => {
    const obTotal = stats.openingBalancesTotal;
    const obVerified = stats.openingBalancesVerified;
    const obPending = obTotal - obVerified;

    const txnTotal = stats.totalTransactions;
    const txnVerified = stats.evidenceComplete;
    const txnPending = stats.pendingTransactions;
    const txnIssues = stats.evidenceDiscrepancy + stats.evidenceMissing + stats.internalAuditFailed;

    const reconTotal = stats.totalAccountMonths;
    const reconVerified = stats.reconciledAccountMonths;
    const reconPending = reconTotal - reconVerified;

    const totalRecords = obTotal + txnTotal + reconTotal;
    const totalVerified = obVerified + txnVerified + reconVerified;
    const totalPending = obPending + txnPending + reconPending;
    const totalIssues = issues.length;

    const verifiedPercentage = totalRecords > 0 ? Math.round((totalVerified / totalRecords) * 100) : 0;
    const pendingPercentage = totalRecords > 0 ? Math.max(1, Math.round((totalPending / totalRecords) * 100)) : 0;

    const obPercentage = obTotal > 0 ? Math.round((obVerified / obTotal) * 100) : 0;
    const txnPercentage = txnTotal > 0 ? Math.round((stats.inspectedTransactions / txnTotal) * 100) : 0;
    const reconPercentage = reconTotal > 0 ? Math.round((reconVerified / reconTotal) * 100) : 0;

    return {
      totalRecords,
      totalVerified,
      totalPending,
      totalIssues,
      verifiedPercentage,
      pendingPercentage,
      modules: {
        openingBalances: {
          total: obTotal,
          verified: obVerified,
          pending: obPending,
          percentage: obPercentage,
        },
        transactions: {
          total: txnTotal,
          verified: txnVerified,
          pending: txnPending,
          issues: txnIssues,
          percentage: txnPercentage,
        },
        reconciliation: {
          total: reconTotal,
          verified: reconVerified,
          pending: reconPending,
          percentage: reconPercentage,
        },
      },
    };
  }, [stats]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Verification Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Verify opening balances, inspect transactions and reconcile monthly account movements
            before relying on financial reports.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => {
              setQuickSummaryTab('summary');
              setShowQuickSummaryModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg cursor-pointer transition-colors shadow-2xs hover:border-slate-400"
            title="Open Quick Summary Overlay: Pending vs. Completed across all modules"
          >
            <TableProperties className="w-4 h-4 text-blue-600" />
            <span>Quick Summary</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full font-mono">
              Matrix
            </span>
          </button>


          <button
            onClick={() => {
              setQuickSummaryTab('audit-trail');
              setShowQuickSummaryModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
            title="Open Immutable Audit Trail & Accountability Log"
          >
            <History className="w-4 h-4 text-purple-600" />
            <span>Audit Trail</span>
            <span className="text-[10px] bg-purple-200 text-purple-900 font-bold px-1.5 py-0.2 rounded-full font-mono">
              {changeLogs.length}
            </span>
          </button>

          <button
            onClick={() => {
              setNotesDrawerFilter('all');
              setIsNotesDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
            title="Open Auditor Quick Notes & Observations Drawer"
          >
            <StickyNote className="w-4 h-4 text-amber-500" />
            <span>Auditor Notes</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full font-mono">
              {auditNotes.length}
            </span>
          </button>

          <button
            onClick={() => setShowHelpModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Help</span>
          </button>
        </div>
      </div>

      {/* Toast Notification after Database Operations */}
      {seedToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{seedToast}</span>
          </div>
          <button onClick={() => setSeedToast(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Supabase Empty Database Notice */}
      {stats.totalTransactions === 0 && stats.openingBalancesTotal === 0 && (
        <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">
                    Connected to Supabase (0 Records Found in Database)
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>REST API Connected</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Your live Supabase database is connected (<code className="bg-white px-1 py-0.5 rounded text-[11px] font-mono border border-blue-200">hklibokniuwurdxndxfd.supabase.co</code>).
                  All tables are reachable, but currently have <strong>0 rows</strong>. No mock data is presented as live records. Use Settings & Data Management to import the approved FY 2018–19 workbook.
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2">
              Import available under Settings &amp; Data Management
            </span>
          </div>
        </div>
      )}

      {/* High-Level Audit Status Summary Card (Verified vs. Pending across all modules) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-700/80 relative overflow-hidden">
        {/* Decorative background glow elements */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Audit Status Master Summary
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>{auditSummaryMetrics.verifiedPercentage}% Verified</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Consolidated verification audit status across all 3 society modules (Opening Balances, Transactions, Monthly Reconciliation)
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setQuickSummaryTab('summary');
                setShowQuickSummaryModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg cursor-pointer transition-colors shrink-0 self-start sm:self-auto backdrop-blur-xs shadow-xs"
            >
              <TableProperties className="w-3.5 h-3.5 text-blue-300" />
              <span>Open Detailed Matrix</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>

          {/* High-Level Counters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Records */}
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/70">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Audit Scope
              </span>
              <div className="text-2xl font-bold text-white mt-1 font-mono">
                {formatNumber(auditSummaryMetrics.totalRecords)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Records across 3 modules</div>
            </div>

            {/* Total Verified */}
            <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
                  Total Verified
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {auditSummaryMetrics.verifiedPercentage}%
                </span>
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                {formatNumber(auditSummaryMetrics.totalVerified)}
              </div>
              <div className="text-[10px] text-emerald-300/80 mt-0.5">Passed physical examination</div>
            </div>

            {/* Total Pending */}
            <div className="bg-amber-950/40 rounded-xl p-3 border border-amber-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
                  Total Pending
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {auditSummaryMetrics.pendingPercentage}%
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                {formatNumber(auditSummaryMetrics.totalPending)}
              </div>
              <div className="text-[10px] text-amber-300/80 mt-0.5">Awaiting inspection or review</div>
            </div>

            {/* Discrepancies / Attention */}
            <div className="bg-rose-950/40 rounded-xl p-3 border border-rose-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider block">
                  Action Required
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {auditSummaryMetrics.totalIssues} Items
                </span>
              </div>
              <div className="text-2xl font-bold text-rose-400 mt-1 font-mono">
                {auditSummaryMetrics.totalIssues}
              </div>
              <div className="text-[10px] text-rose-300/80 mt-0.5">Discrepancies / missing bills</div>
            </div>
          </div>

          {/* Master Multi-Segment Visual Progress Bar */}
          <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200">
                Master Audit Verification Progress
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                {formatNumber(auditSummaryMetrics.totalVerified)} of {formatNumber(auditSummaryMetrics.totalRecords)} records verified ({auditSummaryMetrics.verifiedPercentage}%)
              </span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${auditSummaryMetrics.verifiedPercentage}%` }}
                title={`Verified: ${formatNumber(auditSummaryMetrics.totalVerified)} (${auditSummaryMetrics.verifiedPercentage}%)`}
              />
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${auditSummaryMetrics.pendingPercentage}%` }}
                title={`Pending: ${formatNumber(auditSummaryMetrics.totalPending)} (${auditSummaryMetrics.pendingPercentage}%)`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${Math.max(1, Math.round((auditSummaryMetrics.totalIssues / auditSummaryMetrics.totalRecords) * 100))}%` }}
                title={`Discrepancies: ${auditSummaryMetrics.totalIssues}`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">Verified Complete: {formatNumber(auditSummaryMetrics.totalVerified)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-slate-300">Pending Review: {formatNumber(auditSummaryMetrics.totalPending)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-slate-300">Discrepancies: {auditSummaryMetrics.totalIssues}</span>
                </span>
              </div>
              <span className="text-slate-400 font-mono">Zero Discrepancy Standard (₹0.00)</span>
            </div>
          </div>

          {/* Visual Progress Indicators for Each Verification Category with Status Badges */}
          <div className="pt-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Category Verification Progress &amp; Status Badges
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Category 1: Opening Balances */}
              <div
                onClick={() => setCurrentScreen('opening-balances')}
                className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/90 hover:border-blue-500/50 rounded-xl p-3 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                      <Landmark className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                      Opening Balances
                    </span>
                  </div>

                  {/* Status Badge showing completion percentage */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      auditSummaryMetrics.modules.openingBalances.percentage === 100
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : auditSummaryMetrics.modules.openingBalances.percentage >= 50
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    <span>{auditSummaryMetrics.modules.openingBalances.percentage}% Verified</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-700/80 rounded-full h-2 overflow-hidden mb-1.5 flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${auditSummaryMetrics.modules.openingBalances.percentage}%` }}
                  />
                  <div className="bg-rose-500 h-full" style={{ width: '33.3%' }} />
                  <div className="bg-amber-400 h-full" style={{ width: '33.3%' }} />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{stats.openingBalancesVerified} of {stats.openingBalancesTotal} accounts verified</span>
                  <span className="text-amber-300 font-medium">{auditSummaryMetrics.modules.openingBalances.pending} pending / diff</span>
                </div>
              </div>

              {/* Category 2: Transaction Evidence */}
              <div
                onClick={() => setCurrentScreen('transaction-verification')}
                className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/90 hover:border-emerald-500/50 rounded-xl p-3 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">
                      <FileCheck2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                      Transactions
                    </span>
                  </div>

                  {/* Status Badge showing completion percentage */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      auditSummaryMetrics.modules.transactions.percentage >= 95
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}
                  >
                    <span>{auditSummaryMetrics.modules.transactions.percentage}% Inspected</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-700/80 rounded-full h-2 overflow-hidden mb-1.5 flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${auditSummaryMetrics.modules.transactions.percentage}%` }}
                  />
                  <div
                    className="bg-rose-500 h-full"
                    style={{ width: `${(stats.evidenceDiscrepancy / stats.totalTransactions) * 100}%` }}
                  />
                  <div
                    className="bg-amber-400 h-full"
                    style={{ width: `${(stats.pendingTransactions / stats.totalTransactions) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{formatNumber(stats.evidenceComplete)} complete</span>
                  <span className="text-amber-300 font-medium">{formatNumber(stats.pendingTransactions)} pending</span>
                </div>
              </div>

              {/* Category 3: Monthly Reconciliation */}
              <div
                onClick={() => setCurrentScreen('monthly-reconciliation')}
                className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/90 hover:border-purple-500/50 rounded-xl p-3 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                      Reconciliation
                    </span>
                  </div>

                  {/* Status Badge showing completion percentage */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      auditSummaryMetrics.modules.reconciliation.percentage === 100
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : auditSummaryMetrics.modules.reconciliation.percentage >= 50
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    <span>{auditSummaryMetrics.modules.reconciliation.percentage}% Reconciled</span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-700/80 rounded-full h-2 overflow-hidden mb-1.5 flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${auditSummaryMetrics.modules.reconciliation.percentage}%` }}
                  />
                  <div className="bg-rose-500 h-full" style={{ width: '16.7%' }} />
                  <div className="bg-amber-400 h-full" style={{ width: '50%' }} />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{stats.reconciledAccountMonths} of {stats.totalAccountMonths} months done</span>
                  <span className="text-amber-300 font-medium">{auditSummaryMetrics.modules.reconciliation.pending} to reconcile</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* 1. Opening Balances */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Opening Balances
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {stats.openingBalancesVerified} / {stats.openingBalancesTotal}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Accounts Verified</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${(stats.openingBalancesVerified / stats.openingBalancesTotal) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 2. Total Transactions */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Total Transactions
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatNumber(stats.totalTransactions)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {formatNumber(stats.inspectedTransactions)} inspected ({Math.round((stats.inspectedTransactions / stats.totalTransactions) * 100)}%)
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${(stats.inspectedTransactions / stats.totalTransactions) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 3. Evidence Complete */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2 mb-2">
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
          <div className="text-[11px] text-slate-500 mt-0.5">
            {Math.round((stats.evidenceComplete / stats.totalTransactions) * 100)}% of transactions
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${(stats.evidenceComplete / stats.totalTransactions) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 4. Evidence Discrepancies */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2 mb-2">
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
          <div className="text-[11px] text-slate-500 mt-0.5">
            {Math.max(1, Math.round((stats.evidenceDiscrepancy / stats.totalTransactions) * 100))}% of transactions
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-rose-500 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${(stats.evidenceDiscrepancy / stats.totalTransactions) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 5. Missing Documents */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <FolderX className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Missing Documents
            </span>
          </div>
          <div className="text-xl font-bold text-orange-600">
            {stats.evidenceMissing}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">1% of transactions</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${(stats.evidenceMissing / stats.totalTransactions) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 6. Internal Audit Failed */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center gap-2 mb-2">
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
          <div className="text-[11px] text-slate-500 mt-0.5">1% of transactions</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${(stats.internalAuditFailed / stats.totalTransactions) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 7. Monthly Reconciliation */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:border-slate-300 transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Monthly Reconciled
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {stats.reconciledAccountMonths} / {stats.totalAccountMonths}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Account-months (33%)</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-cyan-600 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${(stats.reconciledAccountMonths / stats.totalAccountMonths) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Search Bar & Category Filters Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit modules, action items, discrepancy vouchers, or accounts (e.g. BOM, July, Lift AMC, TDCC)..."
              className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 hover:bg-slate-50/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none transition-all placeholder:text-slate-400 text-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                title="Clear search"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Account Filter & Reset */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-600">A/c:</span>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value as any)}
                aria-label="Filter by account"
                className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
              >
                <option value="all">All Accounts</option>
                <option value="TDCC">TDCC Bank</option>
                <option value="BOM">Bank of Maharashtra (BOM)</option>
                <option value="CASH">Cash (Petty Cash)</option>
              </select>
            </div>

            {isFilteringActive && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setAccountFilter('all');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                title="Reset all search queries and category filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills & Quick Keyword Shortcuts */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-1 border-t border-slate-100">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Category:
            </span>

            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>All Items</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                categoryFilter === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {allModules.length + issues.length}
              </span>
            </button>

            <button
              onClick={() => setCategoryFilter('modules')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === 'modules'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Landmark className="w-3 h-3" />
              <span>Audit Modules</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                categoryFilter === 'modules' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {filteredModules.length}
              </span>
            </button>

            <button
              onClick={() => setCategoryFilter('issues')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === 'issues'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Pending Action Items</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                categoryFilter === 'issues' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {filteredActionItems.length}
              </span>
            </button>

            <button
              onClick={() => setCategoryFilter('high-priority')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === 'high-priority'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
              <span>High Priority</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                categoryFilter === 'high-priority' ? 'bg-rose-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {issues.filter((i) => i.priority === 'High').length}
              </span>
            </button>

            <button
              onClick={() => setCategoryFilter('months')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                categoryFilter === 'months'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              <span>Monthly Schedules</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                categoryFilter === 'months' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {monthlySummaries.filter((m) => m.openIssues > 0).length}
              </span>
            </button>
          </div>

          {/* Quick Keywords */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <span className="text-[10px] font-semibold text-slate-400">Quick Searches:</span>
            {[
              { label: 'BOM Mismatch', query: 'BOM' },
              { label: 'Lift AMC', query: 'Lift AMC' },
              { label: 'July 2018', query: 'July' },
              { label: 'Missing Bill', query: 'Missing' },
              { label: 'Water Tanker', query: 'Water' },
            ].map((kw) => (
              <button
                key={kw.label}
                onClick={() => setSearchQuery(kw.query)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  searchQuery.toLowerCase() === kw.query.toLowerCase()
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                }`}
              >
                #{kw.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Spotlight / Search & Filter Results Panel (When filtering is active) */}
      {isFilteringActive && (
        <div className="bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 rounded-xl border border-blue-200 p-5 shadow-xs animate-in fade-in space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-200/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span>Filtered Search Results</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    {totalResultsCount} found
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {searchQuery ? `Matching query: "${searchQuery}"` : 'Filtered by selected category and account'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setAccountFilter('all');
              }}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear search &amp; show full overview</span>
            </button>
          </div>

          {totalResultsCount === 0 ? (
            <div className="py-8 text-center space-y-2 bg-white rounded-lg border border-slate-200">
              <FolderX className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="font-bold text-sm text-slate-800">No matching items found</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No audit modules, action items, or monthly schedules matched your search "{searchQuery}". Try searching for account names ("BOM", "TDCC"), expense types ("Water", "Lift"), or clear filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setAccountFilter('all');
                }}
                className="mt-2 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer"
              >
                Clear Search Query
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Matched Audit Modules */}
              {filteredModules.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-blue-600" />
                    <span>Matched Audit Modules ({filteredModules.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {filteredModules.map((mod) => {
                      const Icon = mod.icon;
                      return (
                        <div
                          key={mod.id}
                          className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <h4 className="font-bold text-xs text-slate-900">{mod.title}</h4>
                              </div>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono">
                                {mod.progress}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">
                              {mod.description}
                            </p>
                            <div className="text-[10px] text-slate-400 font-medium mb-3">
                              Accounts: <span className="text-slate-700 font-semibold">{mod.accounts}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => setCurrentScreen(mod.screen)}
                            className="w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-md flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Open {mod.title.split(' ')[0]} Module</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matched Action Items / Issues */}
              {filteredActionItems.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Matched Pending Action Items ({filteredActionItems.length})</span>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-2">Issue / Description</th>
                            <th className="py-2 px-2">Audit Source</th>
                            <th className="py-2 px-2">Account</th>
                            <th className="py-2 px-2">Month</th>
                            <th className="py-2 px-2 text-right">Amount (₹)</th>
                            <th className="py-2 px-2 text-center">Priority</th>
                            <th className="py-2 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredActionItems.slice(0, 6).map((issue, idx) => (
                            <tr key={issue.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-2 font-medium text-slate-900">
                                <div>{issue.issue}</div>
                                <div className="text-[10px] text-slate-400 font-normal">Status: {issue.status}</div>
                              </td>
                              <td className="py-2 px-2 text-slate-600 whitespace-nowrap text-[11px]">
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                  {issue.source}
                                </span>
                              </td>
                              <td className="py-2 px-2 font-semibold text-slate-800">{issue.account}</td>
                              <td className="py-2 px-2 text-slate-600 whitespace-nowrap">{issue.month}</td>
                              <td className="py-2 px-2 text-right font-mono font-semibold text-slate-900">
                                {formatNumber(issue.amount)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <Badge
                                  variant={issue.priority === 'High' ? 'high' : 'medium'}
                                  label={issue.priority}
                                  showIcon={false}
                                  className="px-1.5 py-0 text-[10px]"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => navigateToIssue(issue)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                                >
                                  {issue.source === 'Opening Balance' ? 'Investigate' : 'Resolve'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {filteredActionItems.length > 6 && (
                      <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                        <button
                          onClick={() => setShowAllIssuesModal(true)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          View all {filteredActionItems.length} matching action items →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Matched Monthly Schedules */}
              {filteredMonths.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                    <span>Matched Monthly Schedules ({filteredMonths.length})</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {filteredMonths.map((m) => (
                      <div
                        key={m.month}
                        onClick={() => {
                          setSelectedMonthFilter(m.month);
                          setCurrentScreen('monthly-reconciliation');
                        }}
                        className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs hover:border-purple-300 transition-all cursor-pointer text-center group"
                      >
                        <div className="font-bold text-xs text-slate-900 group-hover:text-purple-600">{m.month}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{m.transactionsInspected}/{m.transactionsTotal} txns</div>
                        <div className="mt-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            m.openIssues > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {m.openIssues > 0 ? `${m.openIssues} Issues` : 'Reconciled'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Audit Modules Overall Progress Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Audit Modules Task Completion Progress
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live percentage of completed inspection tasks across all 3 audit modules
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 self-start sm:self-auto">
            Overall Readiness: <span className="text-blue-600 font-bold">{stats.readinessPercentage}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Module 1: Opening Balances */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Landmark className="w-4 h-4 text-blue-600" />
                <span>1. Opening Balances</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>{auditSummaryMetrics.modules.openingBalances.percentage}% Verified</span>
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${(stats.openingBalancesVerified / stats.openingBalancesTotal) * 100}%`,
                }}
                title={`Verified: ${stats.openingBalancesVerified} of ${stats.openingBalancesTotal}`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${(1 / stats.openingBalancesTotal) * 100}%` }}
                title="Discrepancy: 1 account"
              />
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${(1 / stats.openingBalancesTotal) * 100}%` }}
                title="Pending: 1 account"
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2 pt-1 border-t border-slate-100">
              <span className="font-medium">{stats.openingBalancesVerified} of {stats.openingBalancesTotal} accounts</span>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">1 Verified</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 text-[10px] font-semibold">1 Diff</span>
              </div>
            </div>
          </div>

          {/* Module 2: Transactions */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>2. Transaction Evidence</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{auditSummaryMetrics.modules.transactions.percentage}% Inspected</span>
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${(stats.evidenceComplete / stats.totalTransactions) * 100}%`,
                }}
                title={`Complete: ${stats.evidenceComplete}`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{
                  width: `${(stats.evidenceDiscrepancy / stats.totalTransactions) * 100}%`,
                }}
                title={`Discrepancy: ${stats.evidenceDiscrepancy}`}
              />
              <div
                className="bg-orange-500 h-full transition-all duration-500"
                style={{
                  width: `${(stats.evidenceMissing / stats.totalTransactions) * 100}%`,
                }}
                title={`Missing: ${stats.evidenceMissing}`}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2 pt-1 border-t border-slate-100">
              <span className="font-medium">{formatNumber(stats.inspectedTransactions)} / {formatNumber(stats.totalTransactions)} txns</span>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">{formatNumber(stats.evidenceComplete)} OK</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold">{formatNumber(stats.pendingTransactions)} Pending</span>
              </div>
            </div>
          </div>

          {/* Module 3: Reconciliation */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-purple-300 transition-all shadow-2xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span>3. Monthly Reconciliation</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>{auditSummaryMetrics.modules.reconciliation.percentage}% Reconciled</span>
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${(stats.reconciledAccountMonths / stats.totalAccountMonths) * 100}%`,
                }}
                title={`Reconciled: ${stats.reconciledAccountMonths}`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${(6 / stats.totalAccountMonths) * 100}%` }}
                title="Differences: 6 account-months"
              />
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${(18 / stats.totalAccountMonths) * 100}%` }}
                title="Pending: 18 account-months"
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2 pt-1 border-t border-slate-100">
              <span className="font-medium">{stats.reconciledAccountMonths} of {stats.totalAccountMonths} months</span>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">{stats.reconciledAccountMonths} Done</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold">24 Left</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts Pie Chart: Audit Verification Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 leading-none">
                  {pieDataConfig.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  {pieDataConfig.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto text-xs font-semibold">
            <button
              onClick={() => setChartViewMode('status')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                chartViewMode === 'status'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Detailed Status
            </button>
            <button
              onClick={() => setChartViewMode('verified-vs-pending')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                chartViewMode === 'verified-vs-pending'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Verified vs. Pending
            </button>
            <button
              onClick={() => setChartViewMode('modules')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                chartViewMode === 'modules'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All 3 Modules
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Recharts Donut Pie Chart */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieDataConfig.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={66}
                    outerRadius={96}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {pieDataConfig.data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="transition-all duration-200 cursor-pointer hover:opacity-85"
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomPieTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tight leading-none">
                  {pieDataConfig.centerCount}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  {pieDataConfig.centerLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Interactive Legend & Distribution Breakdown */}
          <div className="lg:col-span-7 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {pieDataConfig.data.map((item) => (
                <div
                  key={item.name}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold font-mono text-slate-900 shrink-0">
                      {formatNumber(item.value)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                    <span className="truncate pr-1 text-[10px] text-slate-400">
                      {item.description.length > 38 ? `${item.description.slice(0, 38)}...` : item.description}
                    </span>
                    <span className="font-bold text-slate-700 font-mono shrink-0">
                      {item.percentage}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action Footer inside Chart Card */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] text-slate-500">
                Total Audit Scope: <strong className="text-slate-800 font-mono">{formatNumber(pieDataConfig.totalItems)}</strong> items
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedMonthFilter('All');
                    setCurrentScreen('transaction-verification');
                  }}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-md flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                >
                  <span>Open Transaction Register ({formatNumber(stats.pendingTransactions)} Pending)</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Row: Left Monthly Table, Right Outstanding Issues + Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Monthly Verification Status Table (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                Monthly Verification Status (Apr 2018 – Mar 2019)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Saved verification progress across months and accounts
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Verified/Complete
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> In Progress
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Issues
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300" /> Not Started
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-2 text-center">Opening Bal.</th>
                  <th className="py-2.5 px-2 text-center" colSpan={3}>
                    Transactions (Total / Insp / %)
                  </th>
                  <th className="py-2.5 px-2 text-center" colSpan={3}>
                    Reconciliation (Cash / TDCC / BOM)
                  </th>
                  <th className="py-2.5 px-2 text-center">Open Issues</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlySummaries.map((m) => {
                  return (
                    <tr key={m.month} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {m.month}
                      </td>

                      {/* Opening Balance */}
                      <td className="py-2.5 px-2 text-center">
                        {m.openingBalanceStatus === 'complete' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 inline-block" />
                        ) : (
                          <span className="text-slate-300 font-bold">—</span>
                        )}
                      </td>

                      {/* Transactions Total, Insp, % */}
                      <td className="py-2.5 px-1.5 text-center text-slate-600 font-mono">
                        {m.transactionsTotal}
                      </td>
                      <td className="py-2.5 px-1.5 text-center text-slate-800 font-semibold font-mono">
                        {m.transactionsInspected}
                      </td>
                      <td className="py-2.5 px-1.5 text-center">
                        <span
                          className={`font-semibold ${
                            m.transactionsPercent === 100
                              ? 'text-emerald-600'
                              : m.transactionsPercent > 0
                              ? 'text-blue-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {m.transactionsPercent}%
                        </span>
                      </td>

                      {/* Reconciliation Cash */}
                      <td className="py-2.5 px-1 text-center">
                        <span
                          title={`Cash: ${m.reconciliationCash}`}
                          className={`w-2 h-2 rounded-full inline-block ${
                            m.reconciliationCash === 'reconciled'
                              ? 'bg-emerald-500'
                              : m.reconciliationCash === 'difference'
                              ? 'bg-rose-500'
                              : m.reconciliationCash === 'pending'
                              ? 'bg-amber-400'
                              : 'bg-slate-300'
                          }`}
                        />
                      </td>

                      {/* Reconciliation TDCC */}
                      <td className="py-2.5 px-1 text-center">
                        <span
                          title={`TDCC: ${m.reconciliationTDCC}`}
                          className={`w-2 h-2 rounded-full inline-block ${
                            m.reconciliationTDCC === 'reconciled'
                              ? 'bg-emerald-500'
                              : m.reconciliationTDCC === 'difference'
                              ? 'bg-rose-500'
                              : m.reconciliationTDCC === 'pending'
                              ? 'bg-amber-400'
                              : 'bg-slate-300'
                          }`}
                        />
                      </td>

                      {/* Reconciliation BOM */}
                      <td className="py-2.5 px-1 text-center">
                        <span
                          title={`BOM: ${m.reconciliationBOM}`}
                          className={`w-2 h-2 rounded-full inline-block ${
                            m.reconciliationBOM === 'reconciled'
                              ? 'bg-emerald-500'
                              : m.reconciliationBOM === 'difference'
                              ? 'bg-rose-500'
                              : m.reconciliationBOM === 'pending'
                              ? 'bg-amber-400'
                              : 'bg-slate-300'
                          }`}
                        />
                      </td>

                      {/* Open Issues */}
                      <td className="py-2.5 px-2 text-center">
                        {m.openIssues > 0 ? (
                          <span className="px-1.5 py-0.5 rounded font-semibold text-[11px] bg-rose-100 text-rose-700">
                            {m.openIssues}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* Overall Status */}
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          variant={
                            m.overallStatus === 'Verified'
                              ? 'verified'
                              : m.overallStatus === 'In Progress'
                              ? 'in-progress'
                              : m.overallStatus === 'Issues'
                              ? 'issues'
                              : 'not-started'
                          }
                          label={m.overallStatus}
                          showIcon={false}
                        />
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedMonthFilter(m.month);
                            setCurrentScreen('monthly-reconciliation');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {/* Total Summary Row */}
                <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <td className="py-2.5 px-3">Total</td>
                  <td className="py-2.5 px-2 text-center">—</td>
                  <td className="py-2.5 px-1.5 text-center font-mono">1,478</td>
                  <td className="py-2.5 px-1.5 text-center font-mono">352</td>
                  <td className="py-2.5 px-1.5 text-center text-blue-600">24%</td>
                  <td className="py-2.5 px-1 text-center">—</td>
                  <td className="py-2.5 px-1 text-center">—</td>
                  <td className="py-2.5 px-1 text-center">—</td>
                  <td className="py-2.5 px-2 text-center text-rose-700">30</td>
                  <td className="py-2.5 px-3 text-center">—</td>
                  <td className="py-2.5 px-3 text-right">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Outstanding Issues & Readiness Indicator (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Outstanding Issues Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">Outstanding Issues</h3>
                {isFilteringActive && (
                  <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Filtered ({filteredActionItems.length})
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowAllIssuesModal(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-500 font-semibold border-b border-slate-100">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 px-2">Issue</th>
                    <th className="py-2 px-2">Source</th>
                    <th className="py-2 px-2">A/c</th>
                    <th className="py-2 px-2">Month</th>
                    <th className="py-2 px-2 text-right">Amount (₹)</th>
                    <th className="py-2 px-2 text-center">Priority</th>
                    <th className="py-2 pl-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(isFilteringActive ? filteredActionItems : issues).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-xs text-slate-400">
                        No outstanding issues match active search filters.
                      </td>
                    </tr>
                  ) : (
                    (isFilteringActive ? filteredActionItems : issues).slice(0, 5).map((issue, idx) => (
                      <tr key={issue.id} className="hover:bg-slate-50">
                        <td className="py-2 pr-2 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-2 font-medium text-slate-900 max-w-[130px] truncate" title={issue.issue}>
                          {issue.issue}
                        </td>
                        <td className="py-2 px-2 text-slate-500 text-[11px] whitespace-nowrap">
                          {issue.source}
                        </td>
                        <td className="py-2 px-2 font-semibold text-slate-700">
                          {issue.account}
                        </td>
                        <td className="py-2 px-2 text-slate-600 whitespace-nowrap text-[11px]">
                          {issue.month}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-900 font-medium">
                          {formatNumber(issue.amount)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge
                            variant={issue.priority === 'High' ? 'high' : 'medium'}
                            label={issue.priority}
                            showIcon={false}
                            className="px-1.5 py-0 text-[10px]"
                          />
                        </td>
                        <td className="py-2 pl-2 text-right">
                          <button
                            onClick={() => navigateToIssue(issue)}
                            className="px-2 py-0.5 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                          >
                            {issue.source === 'Opening Balance' ? 'Investigate' : 'View'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity Widget */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-none">
                    Recent Activity
                  </h3>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Last 5 verification actions performed
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAuditLogModal(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center gap-1"
              >
                <span>Audit Trail</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {changeLogs.slice(0, 5).map((log, idx) => {
                const isOpening = log.entityType === 'OpeningBalance';
                const isTxn = log.entityType === 'Transaction';

                return (
                  <div key={log.id || idx} className="relative group">
                    {/* Node Dot / Icon */}
                    <div
                      className={`absolute -left-[19px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white shadow-xs ${
                        isOpening
                          ? 'bg-blue-600 text-white'
                          : isTxn
                          ? 'bg-emerald-600 text-white'
                          : 'bg-purple-600 text-white'
                      }`}
                    >
                      {isOpening ? (
                        <Landmark className="w-2.5 h-2.5" />
                      ) : isTxn ? (
                        <FileCheck2 className="w-2.5 h-2.5" />
                      ) : (
                        <BarChart3 className="w-2.5 h-2.5" />
                      )}
                    </div>

                    <div className="bg-slate-50/80 hover:bg-slate-50 p-2.5 rounded-lg border border-slate-100 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <button
                          onClick={() => {
                            if (isOpening) {
                              if (log.entityId === 'BOM' || log.entityId === 'TDCC' || log.entityId === 'CASH') {
                                setSelectedAccountId(log.entityId);
                              }
                              setCurrentScreen('opening-balances');
                            } else if (isTxn) {
                              setSelectedTransactionId(log.entityId);
                              setCurrentScreen('transaction-verification');
                            } else {
                              setCurrentScreen('monthly-reconciliation');
                            }
                          }}
                          className="font-semibold text-xs text-slate-900 text-left hover:text-blue-600 cursor-pointer line-clamp-1"
                        >
                          {log.action}
                        </button>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium whitespace-nowrap">
                          {log.timestamp.includes(',') ? log.timestamp.split(',')[1].trim() : log.timestamp}
                        </span>
                      </div>

                      {log.reason && (
                        <p className="text-[11px] text-slate-600 line-clamp-1 mb-1.5 italic">
                          "{log.reason}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <User className="w-3 h-3 text-slate-400" />
                          {log.user}
                        </span>
                        <span className="font-mono text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                          {log.entityId}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verification Readiness for Financial Reports */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-3">
              Verification Readiness for Financial Reports
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-5 mb-4">
              {/* Circular Gauge */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-blue-600 transition-all duration-500 ease-out"
                    strokeDasharray={`${stats.readinessPercentage}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-slate-900 leading-none">
                    {stats.readinessPercentage}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">
                    Ready for Reports
                  </span>
                </div>
              </div>

              {/* Criteria Checklist */}
              <div className="space-y-2 text-xs flex-1">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Readiness Criteria
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="text-rose-500 font-bold">✕</span> All opening balances verified
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600">
                    {stats.openingBalancesVerified} of {stats.openingBalancesTotal}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="text-rose-500 font-bold">✕</span> Major transaction evidence complete
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600">
                    {Math.round((stats.evidenceComplete / stats.totalTransactions) * 100)}% ({stats.evidenceComplete} of {formatNumber(stats.totalTransactions)})
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="text-rose-500 font-bold">✕</span> Critical discrepancies resolved
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600">
                    30 open issues
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="text-rose-500 font-bold">✕</span> Monthly reconciliation completed
                  </span>
                  <span className="text-[11px] font-semibold text-rose-600">
                    {stats.reconciledAccountMonths} of {stats.totalAccountMonths}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning Callout */}
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs flex items-start gap-2.5 text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">
                  Financial reports are not yet available for this financial year.
                </span>
                <span>
                  Please complete the verification steps and resolve open issues before generating audited reports.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in fade-in">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Verification Guidelines &amp; Audit Rules
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-1">Phase 1 Objective</h4>
                <p>
                  Verify historical financial records for FY 2018–19 from original physical vouchers, cash book, and bank passbooks before relying on financial management dashboards.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800">1. Opening Balances</h4>
                <p>
                  Must reconcile with the audited closing balance of FY 2017-18 as per the statutory audit report. Physical cash book and bank passbooks must be inspected.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800">2. Physical Transaction Inspection</h4>
                <p>
                  Every voucher and bill must be physically located. Original financial amounts and dates are read-only. Inspection findings (Available, Discrepancy, Missing, Failed) are saved separately in the audit log.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800">3. Monthly Account Reconciliation</h4>
                <p>
                  Calculated Opening + Credits − Debits + Adjustments = Calculated Closing Balance. Differences must be investigated and not hidden with adjustments.
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-800">4. Report Readiness Discipline</h4>
                <p>
                  Financial reports and balance sheets remain locked until 100% of controls pass.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View All Issues Modal */}
      {showAllIssuesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in fade-in">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    All Outstanding Issues ({isFilteringActive ? filteredActionItems.length : issues.length})
                  </h3>
                  {isFilteringActive && (
                    <span className="text-xs text-blue-600 font-normal">
                      Filtered by active search: "{searchQuery || categoryFilter}" ({filteredActionItems.length} of {issues.length})
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowAllIssuesModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="py-2 px-3">Issue</th>
                    <th className="py-2 px-2">Source</th>
                    <th className="py-2 px-2">Account</th>
                    <th className="py-2 px-2">Month</th>
                    <th className="py-2 px-2 text-right">Amount (₹)</th>
                    <th className="py-2 px-2 text-center">Priority</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(isFilteringActive ? filteredActionItems : issues).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                        No action items match the active search filter.
                      </td>
                    </tr>
                  ) : (
                    (isFilteringActive ? filteredActionItems : issues).map((issue) => (
                      <tr key={issue.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{issue.issue}</td>
                        <td className="py-2.5 px-2 text-slate-600">{issue.source}</td>
                        <td className="py-2.5 px-2 font-semibold text-slate-800">{issue.account}</td>
                        <td className="py-2.5 px-2 text-slate-600">{issue.month}</td>
                        <td className="py-2.5 px-2 text-right font-mono font-medium">
                          {formatINR(issue.amount)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <Badge
                            variant={issue.priority === 'High' ? 'high' : 'medium'}
                            label={issue.priority}
                            showIcon={false}
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => {
                              setShowAllIssuesModal(false);
                              navigateToIssue(issue);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer"
                          >
                            Resolve
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowAllIssuesModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Audit Log Modal */}
      {showAuditLogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in fade-in">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Audit Trail &amp; Verification History
                  </h3>
                  <span className="text-xs text-slate-500 font-normal">
                    Complete chronological change log of verified records
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAuditLogModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="py-2.5 px-3">Log ID</th>
                    <th className="py-2.5 px-2">Entity</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-2">Previous → New</th>
                    <th className="py-2.5 px-2">Reviewer</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {changeLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{log.id}</td>
                      <td className="py-2.5 px-2 font-medium text-slate-800">{log.entityType}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{log.action}</td>
                      <td className="py-2.5 px-2 text-slate-600 text-[11px] whitespace-nowrap">
                        <span className="text-slate-400">{log.previousValue || '—'}</span> →{' '}
                        <span className="font-semibold text-blue-700">{log.newValue || '—'}</span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-700">{log.user}</td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">{log.timestamp}</td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-xs truncate" title={log.reason}>
                        {log.reason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Total records: <strong className="text-slate-800">{changeLogs.length}</strong>
              </span>
              <button
                onClick={() => setShowAuditLogModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auditor Quick Notes Side Drawer */}
      <AuditQuickNotesDrawer
        isOpen={isNotesDrawerOpen}
        onClose={() => setIsNotesDrawerOpen(false)}
        activeModuleFilter={notesDrawerFilter}
        setActiveModuleFilter={setNotesDrawerFilter}
      />

      {/* Quick Summary Overlay & Ingestion Studio */}
      <QuickSummaryOverlay
        isOpen={showQuickSummaryModal}
        onClose={() => setShowQuickSummaryModal(false)}
        initialTab={quickSummaryTab}
      />
    </div>
  );
};

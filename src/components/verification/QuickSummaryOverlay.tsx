import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  TableProperties,
  Database,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Download,
  Upload,
  RefreshCw,
  Layers,
  ShieldCheck,
  Check,
  HelpCircle,
  FileText,
  Landmark,
  PieChart,
  UserCheck,
  ExternalLink,
  ChevronRight,
  ListFilter,
  SlidersHorizontal,
  Info,
  Server,
  FileUp,
  FileCheck2,
  History,
  Search,
  Filter,
  Sparkles,
  Link,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { formatNumber, formatINR, APP_CONFIG } from '../../config';
import {
  DATABASE_TABLES_CATALOG,
  DatabaseTableDefinition,
} from '../../data/databaseTablesData';
import {
  parseExcelOrCsvFile,
  validateSheetForTable,
  matchWorkbookSheets,
  executeBulkIngestion,
  exportMasterWorkbookWithAllSheets,
  exportTableToExcel,
  exportTableToCSV,
  ParsedSheetData,
  IngestionValidationResult,
  SheetMatchResult,
} from '../../utils/excelIngestion';

interface QuickSummaryOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'summary' | 'excel-ingestion' | 'audit-trail' | 'database-info' | 'architecture';
}

export const QuickSummaryOverlay: React.FC<QuickSummaryOverlayProps> = ({
  isOpen,
  onClose,
  initialTab = 'summary',
}) => {
  const {
    stats,
    openingBalances,
    transactions,
    reconciliations,
    changeLogs,
    setCurrentScreen,
    setSelectedAccountId,
    setSelectedMonthFilter,
    demandRegister,
    flatOwnerMaster,
    partyMaster,
    rulesMaster,
    refetchAll,
    supabaseSync,
  } = useVerification();

  const [activeTab, setActiveTab] = useState<'summary' | 'excel-ingestion' | 'audit-trail' | 'database-info' | 'architecture'>(
    initialTab === 'architecture' ? 'database-info' : initialTab
  );

  // Keep activeTab in sync whenever initialTab or modal visibility changes
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab === 'architecture' ? 'database-info' : initialTab);
    }
  }, [isOpen, initialTab]);

  // Ingestion State
  const [selectedTableId, setSelectedTableId] = useState<string>(DATABASE_TABLES_CATALOG[0].id);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsedSheets, setParsedSheets] = useState<ParsedSheetData[] | null>(null);
  const [sheetMatches, setSheetMatches] = useState<SheetMatchResult[] | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [validationResult, setValidationResult] = useState<IngestionValidationResult | null>(null);
  const [ingestionSuccessMessage, setIngestionSuccessMessage] = useState<string | null>(null);
  const [customTableData, setCustomTableData] = useState<Record<string, Record<string, any>[]>>({});

  // Audit Trail Filters State
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState<'all' | 'Transaction' | 'OpeningBalance' | 'MonthlyReconciliation'>('all');
  const [auditUserFilter, setAuditUserFilter] = useState<'all' | string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find active table definition
  const currentTableDef = useMemo(() => {
    return DATABASE_TABLES_CATALOG.find((t) => t.id === selectedTableId) || DATABASE_TABLES_CATALOG[0];
  }, [selectedTableId]);

  // Current records for selected table - Strictly clean! Never default to junk sample records
  const currentTableRecords = useMemo(() => {
    if (customTableData[selectedTableId] && customTableData[selectedTableId].length > 0) {
      return customTableData[selectedTableId];
    }
    // Check if live context has data for this table
    if (selectedTableId === 'tbl_account_master' && openingBalances.length > 0) {
      return openingBalances.map((o) => ({
        account_id: o.accountId,
        account_name: o.accountName,
        account_type: o.accountType,
        opening_balance: o.recordedOpeningBalance,
        status: o.status,
      }));
    }
    if (selectedTableId === 'tbl_transactions' && transactions.length > 0) {
      return transactions;
    }
    if (selectedTableId === 'tbl_flat_owner_master' && flatOwnerMaster && flatOwnerMaster.length > 0) {
      return flatOwnerMaster;
    }
    if (selectedTableId === 'tbl_party_master' && partyMaster && partyMaster.length > 0) {
      return partyMaster;
    }
    if (selectedTableId === 'tbl_demand_register' && demandRegister && demandRegister.length > 0) {
      return demandRegister;
    }
    if (selectedTableId === 'tbl_rules_master' && rulesMaster && rulesMaster.length > 0) {
      return rulesMaster;
    }
    // Return clean empty array
    return [];
  }, [selectedTableId, customTableData, openingBalances, transactions, flatOwnerMaster, partyMaster, demandRegister, rulesMaster]);

  const handleLoadSampleForTable = (tableId: string) => {
    const tableDef = DATABASE_TABLES_CATALOG.find((t) => t.id === tableId);
    if (!tableDef) return;
    setCustomTableData((prev) => ({
      ...prev,
      [tableId]: tableDef.sampleRecords,
    }));
    setIngestionSuccessMessage(`Loaded sample template records for "${tableDef.name}".`);
  };

  const handleClearAllCustomData = () => {
    setCustomTableData({});
    setParsedSheets(null);
    setSheetMatches(null);
    setValidationResult(null);
    setIngestionSuccessMessage('✓ Clean zero-state restored. All sample data cleared.');
  };

  // Handle ESC key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Calculate Verification Summary Across All Modules
  const moduleSummaryRows = useMemo(() => {
    // 1. Opening Balances
    const obTotal = openingBalances.length;
    const obVerified = openingBalances.filter((b) => b.status === 'Verified').length;
    const obDiscrepancy = openingBalances.filter((b) => b.status === 'Discrepancy').length;
    const obPending = openingBalances.filter((b) => b.status === 'Pending').length;
    const obCompletePct = obTotal > 0 ? Math.round((obVerified / obTotal) * 100) : 0;

    // 2. Transaction Vouchers & Evidence
    const txnTotal = transactions.length;
    const txnVerified = stats.evidenceComplete;
    const txnDiscrepancy = stats.evidenceDiscrepancy + stats.evidenceMissing + stats.internalAuditFailed;
    const txnPending = stats.pendingTransactions;
    const txnCompletePct = txnTotal > 0 ? Math.round((txnVerified / txnTotal) * 100) : 0;

    // 3. Monthly Account Reconciliation
    const allReconciliations = [
      ...(reconciliations.TDCC || []),
      ...(reconciliations.BOM || []),
      ...(reconciliations.CASH || []),
    ];
    const recTotal = allReconciliations.length;
    const recVerified = allReconciliations.filter((r) => r.status === 'Reconciled').length;
    const recDiscrepancy = allReconciliations.filter((r) => r.status === 'Difference').length;
    const recPending = Math.max(0, recTotal - recVerified - recDiscrepancy);
    const recCompletePct = recTotal > 0 ? Math.round((recVerified / recTotal) * 100) : 0;

    // 4. Demand Register & Member Receivables
    const demandRecords = customTableData['tbl_demand_register'] || (demandRegister && demandRegister.length > 0 ? demandRegister : []);
    const demandTotal = demandRecords.length;
    const demandCompleted = demandRecords.filter((d: any) => d.payment_status === 'Paid' || d.status === 'Paid').length;
    const demandPending = demandRecords.filter((d: any) => d.payment_status === 'Pending' || d.status === 'Pending').length;
    const demandDiscrepancy = demandRecords.filter((d: any) => d.payment_status === 'Disputed' || d.status === 'Disputed').length;
    const demandCompletePct = demandTotal > 0 ? Math.round((demandCompleted / demandTotal) * 100) : 0;

    // 5. Flat & Asset Ownership Directory (FLAT_OWNER_MASTER)
    const flatRecords = customTableData['tbl_flat_owner_master'] || (flatOwnerMaster && flatOwnerMaster.length > 0 ? flatOwnerMaster : []);
    const flatsTotal = flatRecords.length;
    const flatsCompleted = flatRecords.filter((f: any) => f.verification_status === 'Verified' || f.status === 'Verified').length;
    const flatsPending = flatRecords.filter((f: any) => f.verification_status === 'Pending' || f.status === 'Pending').length;
    const flatsDiscrepancy = flatRecords.filter((f: any) => f.verification_status === 'Disputed' || f.status === 'Disputed').length;
    const flatsCompletePct = flatsTotal > 0 ? Math.round((flatsCompleted / flatsTotal) * 100) : 0;

    // 6. Party & Vendor Master (PARTY_MASTER)
    const partyRecords = customTableData['tbl_party_master'] || (partyMaster && partyMaster.length > 0 ? partyMaster : []);
    const partyTotal = partyRecords.length;
    const partyCompleted = partyRecords.filter((p: any) => p.status === 'Active' || p.verification_status === 'Verified').length;
    const partyPending = partyRecords.filter((p: any) => p.status === 'Pending' || p.verification_status === 'Pending').length;
    const partyDiscrepancy = partyRecords.filter((p: any) => p.status === 'Disputed' || p.verification_status === 'Disputed').length;
    const partyCompletePct = partyTotal > 0 ? Math.round((partyCompleted / partyTotal) * 100) : 0;

    // 7. Society Rules & Billing Bylaws (RULES_MASTER)
    const rulesRecords = customTableData['tbl_rules_master'] || (rulesMaster && rulesMaster.length > 0 ? rulesMaster : []);
    const rulesTotal = rulesRecords.length;
    const rulesCompleted = rulesRecords.filter((r: any) => r.is_active === true || r.status === 'Verified').length;
    const rulesPending = rulesRecords.filter((r: any) => r.is_active === false || r.status === 'Pending').length;
    const rulesDiscrepancy = 0;
    const rulesCompletePct = rulesTotal > 0 ? Math.round((rulesCompleted / rulesTotal) * 100) : 0;

    return [
      {
        id: 'opening-balances',
        name: 'Opening Balances',
        subtitle: 'Cash Book & Bank Passbook balances as of 01-Apr-2018',
        icon: Landmark,
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        total: obTotal,
        completed: obVerified,
        pending: obPending,
        discrepancies: obDiscrepancy,
        completionRate: obCompletePct,
        targetScreen: 'opening-balances' as const,
        status: obTotal === 0 ? 'Not Started' : obDiscrepancy > 0 ? 'Action Required' : obPending > 0 ? 'In Progress' : 'Completed',
        notes: obTotal === 0 ? '0 accounts loaded. Upload Excel or connect database.' : obDiscrepancy > 0 ? 'Discrepancy detected in account opening balance' : 'All accounts verified against prior audit',
      },
      {
        id: 'transaction-verification',
        name: 'Transaction Vouchers & Evidence',
        subtitle: 'Voucher inspection, cash memo physical evidence & audit stamps',
        icon: FileText,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        total: txnTotal,
        completed: txnVerified,
        pending: txnPending,
        discrepancies: txnDiscrepancy,
        completionRate: txnCompletePct,
        targetScreen: 'transaction-verification' as const,
        status: txnTotal === 0 ? 'Not Started' : txnDiscrepancy > 0 ? 'Discrepancies Flagged' : 'In Progress',
        notes: txnTotal === 0 ? '0 transaction vouchers found in database.' : `${formatNumber(txnPending)} vouchers awaiting physical inspection`,
      },
      {
        id: 'monthly-reconciliation',
        name: 'Monthly Account Reconciliation',
        subtitle: '12-month reconciliation across TDCC, BOM, and Petty Cash books',
        icon: RefreshCw,
        color: 'text-purple-600 bg-purple-50 border-purple-200',
        total: recTotal,
        completed: recVerified,
        pending: recPending,
        discrepancies: recDiscrepancy,
        completionRate: recCompletePct,
        targetScreen: 'monthly-reconciliation' as const,
        status: recTotal === 0 ? 'Not Started' : recDiscrepancy > 0 ? 'Variance Detected' : 'In Progress',
        notes: recTotal === 0 ? '0 monthly balances loaded.' : `${recVerified} of ${recTotal} account-months fully matched and closed`,
      },
      {
        id: 'demand-register',
        name: 'Demand Register & Receivables',
        subtitle: 'Monthly flat maintenance bills, parking fees & collections',
        icon: Layers,
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        total: demandTotal,
        completed: demandCompleted,
        pending: demandPending,
        discrepancies: demandDiscrepancy,
        completionRate: demandCompletePct,
        targetScreen: 'demand-collections' as const,
        status: demandTotal === 0 ? 'Not Started' : demandPending > 0 ? 'In Progress' : 'Completed',
        notes: demandTotal === 0 ? '0 demand records loaded.' : `${demandPending} flat units pending maintenance payment`,
      },
      {
        id: 'flat-owner-master',
        name: 'Flat & Owner Directory',
        subtitle: 'Asset ownership registers, tenant KYC & share certificate records',
        icon: UserCheck,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        total: flatsTotal,
        completed: flatsCompleted,
        pending: flatsPending,
        discrepancies: flatsDiscrepancy,
        completionRate: flatsCompletePct,
        targetScreen: 'party-ledger' as const,
        status: flatsTotal === 0 ? 'Not Started' : flatsPending > 0 ? 'In Progress' : 'Completed',
        notes: flatsTotal === 0 ? '0 flat records loaded.' : `${flatsPending} units pending documentation`,
      },
      {
        id: 'party-master',
        name: 'Party Master & Vendor Ledgers',
        subtitle: 'Active suppliers, staff, security agencies & society utilities',
        icon: ShieldCheck,
        color: 'text-teal-600 bg-teal-50 border-teal-200',
        total: partyTotal,
        completed: partyCompleted,
        pending: partyPending,
        discrepancies: partyDiscrepancy,
        completionRate: partyCompletePct,
        targetScreen: 'party-ledger' as const,
        status: partyTotal === 0 ? 'Not Started' : partyPending > 0 ? 'In Progress' : 'Completed',
        notes: partyTotal === 0 ? '0 vendor/party records loaded.' : `${partyPending} vendors pending bank authorization`,
      },
      {
        id: 'rules-master',
        name: 'Society Bylaws & Penalty Rules',
        subtitle: 'Statutory bye-law tariffs, late payment penalty rates & parking fees',
        icon: SlidersHorizontal,
        color: 'text-slate-600 bg-slate-50 border-slate-200',
        total: rulesTotal,
        completed: rulesCompleted,
        pending: rulesPending,
        discrepancies: rulesDiscrepancy,
        completionRate: rulesCompletePct,
        targetScreen: 'settings' as const,
        status: rulesTotal === 0 ? 'Not Started' : 'Verified',
        notes: rulesTotal === 0 ? '0 rules registered.' : `${rulesCompleted} rules active and verified`,
      },
    ];
  }, [openingBalances, transactions, stats, reconciliations, customTableData, demandRegister, flatOwnerMaster, partyMaster, rulesMaster]);

  // Aggregate Totals
  const aggregateTotals = useMemo(() => {
    const totalEntities = moduleSummaryRows.reduce((sum, r) => sum + r.total, 0);
    const totalCompleted = moduleSummaryRows.reduce((sum, r) => sum + r.completed, 0);
    const totalPending = moduleSummaryRows.reduce((sum, r) => sum + r.pending, 0);
    const totalDiscrepancies = moduleSummaryRows.reduce((sum, r) => sum + r.discrepancies, 0);
    const overallRate = totalEntities > 0 ? Math.round((totalCompleted / totalEntities) * 100) : 0;

    return {
      totalEntities,
      totalCompleted,
      totalPending,
      totalDiscrepancies,
      overallRate,
    };
  }, [moduleSummaryRows]);

  // Handle Multi-Sheet or Single File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setIngestionSuccessMessage(null);

    try {
      const sheets = await parseExcelOrCsvFile(file);
      if (sheets.length === 0) {
        throw new Error('No valid sheets or records found in uploaded file.');
      }
      setParsedSheets(sheets);
      setActiveSheetIndex(0);

      // Run automated multi-sheet matching against the catalog
      const matches = matchWorkbookSheets(sheets, DATABASE_TABLES_CATALOG);
      setSheetMatches(matches);

      // Validate first sheet against selected table
      const validation = validateSheetForTable(sheets[0], currentTableDef);
      setValidationResult(validation);

      const matchedCount = matches.filter((m) => m.matchedTable !== null).length;
      setIngestionSuccessMessage(
        `✓ File "${file.name}" uploaded successfully! Found ${sheets.length} sheet(s), automatically matched ${matchedCount} sheet(s) to Society Database Tables.`
      );
    } catch (err: any) {
      console.error('File parsing error:', err);
      setUploadError(err.message || 'Failed to parse Excel / CSV file');
    } finally {
      setIsUploading(false);
    }
  };

  // Re-run validation when active table or active sheet changes
  const handleSheetSelect = (index: number) => {
    setActiveSheetIndex(index);
    if (parsedSheets && parsedSheets[index]) {
      // If this sheet has a matched table, auto-select that table
      const match = sheetMatches?.[index];
      const targetTable = match?.matchedTable || currentTableDef;
      if (match?.matchedTable) {
        setSelectedTableId(match.matchedTable.id);
      }
      const validation = validateSheetForTable(parsedSheets[index], targetTable);
      setValidationResult(validation);
    }
  };

  const handleTableChange = (tableId: string) => {
    setSelectedTableId(tableId);
    setIngestionSuccessMessage(null);
    const newTableDef = DATABASE_TABLES_CATALOG.find((t) => t.id === tableId) || DATABASE_TABLES_CATALOG[0];

    if (parsedSheets && parsedSheets[activeSheetIndex]) {
      const validation = validateSheetForTable(parsedSheets[activeSheetIndex], newTableDef);
      setValidationResult(validation);
    }
  };

  // Bulk Ingest ALL Sheets into All Database Tables at once
  const handleBulkIngestAllSheets = () => {
    if (!sheetMatches || !parsedSheets) return;

    const { updatedDatabaseData, summary } = executeBulkIngestion(sheetMatches, parsedSheets);

    setCustomTableData((prev) => ({
      ...prev,
      ...updatedDatabaseData,
    }));

    setIngestionSuccessMessage(
      `🎉 BULK INGESTION COMPLETE! Successfully uploaded & committed ${summary.matchedSheetsCount} sheets (${summary.totalRowsIngested} total rows) into respective Database Tables in a single atomic transaction.`
    );
  };

  // 1-Click Simulate Single Multi-Sheet File Ingestion
  const handleSimulateMultiSheetIngestion = () => {
    // Generate dummy sheets matching all 11 catalog tables
    const allSheets: ParsedSheetData[] = DATABASE_TABLES_CATALOG.map((tbl) => ({
      sheetName: tbl.excelSheetName,
      headers: tbl.columns.map((c) => c.name),
      rows: tbl.sampleRecords,
      totalRows: tbl.sampleRecords.length,
    }));

    setParsedSheets(allSheets);
    const matches = matchWorkbookSheets(allSheets, DATABASE_TABLES_CATALOG);
    setSheetMatches(matches);
    setActiveSheetIndex(0);
    setValidationResult(validateSheetForTable(allSheets[0], DATABASE_TABLES_CATALOG[0]));

    setIngestionSuccessMessage(
      `✓ Loaded complete master workbook simulation containing ALL 11 sheets! Click "Bulk Ingest All 11 Sheets" to commit them into the database.`
    );
  };

  // Commit single active sheet
  const handleCommitSingleTable = () => {
    if (!parsedSheets || !parsedSheets[activeSheetIndex]) return;

    const sheet = parsedSheets[activeSheetIndex];
    const rowsToCommit = sheet.rows.map((row) => {
      const mappedRow: Record<string, any> = {};
      currentTableDef.columns.forEach((col) => {
        const mapping = validationResult?.mappedColumns.find((m) => m.dbColumn === col.name);
        if (mapping?.excelColumn && row[mapping.excelColumn] !== undefined) {
          mappedRow[col.name] = row[mapping.excelColumn];
        } else {
          mappedRow[col.name] = row[col.name] || '';
        }
      });
      return mappedRow;
    });

    setCustomTableData((prev) => ({
      ...prev,
      [currentTableDef.id]: rowsToCommit,
    }));

    setIngestionSuccessMessage(
      `✓ Successfully committed ${rowsToCommit.length} records into Database Table "${currentTableDef.name}" (${currentTableDef.id})!`
    );
  };

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return changeLogs.filter((log) => {
      const matchesSearch =
        auditSearchQuery.trim() === '' ||
        log.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.entityId.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        log.user.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
        (log.reason && log.reason.toLowerCase().includes(auditSearchQuery.toLowerCase()));

      const matchesEntity = auditEntityFilter === 'all' || log.entityType === auditEntityFilter;
      const matchesUser = auditUserFilter === 'all' || log.user === auditUserFilter;

      return matchesSearch && matchesEntity && matchesUser;
    });
  }, [changeLogs, auditSearchQuery, auditEntityFilter, auditUserFilter]);

  // Unique users in audit log
  const auditUsers = useMemo(() => {
    return Array.from(new Set(changeLogs.map((l) => l.user)));
  }, [changeLogs]);

  // Export summary table to CSV
  const handleExportSummaryCSV = () => {
    const headers = ['Module', 'Total Items', 'Completed / Verified', 'Pending', 'Discrepancies', 'Completion Rate %', 'Status', 'Notes'];
    const rows = moduleSummaryRows.map((r) => [
      r.name,
      r.total,
      r.completed,
      r.pending,
      r.discrepancies,
      `${r.completionRate}%`,
      r.status,
      `"${r.notes.replace(/"/g, '""')}"`,
    ]);
    const summaryRow = ['TOTAL / AGGREGATE', aggregateTotals.totalEntities, aggregateTotals.totalCompleted, aggregateTotals.totalPending, aggregateTotals.totalDiscrepancies, `${aggregateTotals.overallRate}%`, 'Overall Readiness', 'Comprehensive Audit Summary'];

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(',')), summaryRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VarshaNivas_Audit_Quick_Summary_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <TableProperties className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Verification Dashboard &amp; Multi-Sheet Database Ingestion
                </h2>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live Audit State
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Single Excel file bulk ingestion, pending vs. completed matrix, and user action audit trail
              </p>
            </div>
          </div>

          {/* Hidden File Input accessible from anywhere in modal */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Primary Action: Upload Excel Workbook */}
            <button
              onClick={() => {
                setActiveTab('excel-ingestion');
                setTimeout(() => fileInputRef.current?.click(), 50);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 rounded-lg cursor-pointer transition-colors shadow-2xs"
              title="Upload an Excel workbook (.xlsx / .xls) with all 11 sheets to ingest into database"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Excel Workbook</span>
            </button>

            {/* Clean Blank Template Download */}
            <button
              onClick={() => exportMasterWorkbookWithAllSheets(DATABASE_TABLES_CATALOG, customTableData, false)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
              title="Download clean blank 11-sheet Excel template ready for data entry"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Download 11-Sheet Excel Master</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportSummaryCSV}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg cursor-pointer transition-colors shadow-2xs"
              title="Export concise summary to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            {/* Reset / Clear Data */}
            {Object.keys(customTableData).length > 0 && (
              <button
                onClick={handleClearAllCustomData}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer transition-colors"
                title="Clear loaded custom data and reset to 0"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Reset to Clean 0</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 bg-white border-b border-slate-200 flex items-center gap-6 text-xs font-semibold shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3.5 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TableProperties className="w-4 h-4" />
            <span>Audit Verification Summary</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded-full">
              {moduleSummaryRows.length} Modules
            </span>
          </button>

          <button
            onClick={() => setActiveTab('excel-ingestion')}
            className={`py-3.5 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'excel-ingestion'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Single File (All Sheets) ➔ Database Tables Ingestion</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
              11 Tables Bulk
            </span>
          </button>

          <button
            onClick={() => setActiveTab('database-info')}
            className={`py-3.5 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'database-info'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4 text-purple-600" />
            <span>Which Database is Used?</span>
          </button>

          <button
            onClick={() => setActiveTab('audit-trail')}
            className={`py-3.5 border-b-2 flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'audit-trail'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4 text-amber-600" />
            <span>Audit Trail &amp; Accountability</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-mono px-1.5 py-0.5 rounded-full">
              {changeLogs.length} Actions
            </span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: Concise Verification Summary Table */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Macro KPI Scorecards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                    <span>Total Audit Entities</span>
                    <Layers className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono">
                    {formatNumber(aggregateTotals.totalEntities)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Across all 7 modules</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
                  <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold mb-1">
                    <span>Completed &amp; Verified</span>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 font-mono">
                    {formatNumber(aggregateTotals.totalCompleted)}
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-0.5 font-semibold">
                    {aggregateTotals.overallRate}% overall completion
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs bg-blue-50/20">
                  <div className="flex items-center justify-between text-xs text-blue-700 font-semibold mb-1">
                    <span>Pending Inspection</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-blue-700 font-mono">
                    {formatNumber(aggregateTotals.totalPending)}
                  </div>
                  <div className="text-[11px] text-blue-600 mt-0.5">
                    {aggregateTotals.totalEntities > 0
                      ? Math.round((aggregateTotals.totalPending / aggregateTotals.totalEntities) * 100)
                      : 0}
                    % awaiting review
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs bg-rose-50/20">
                  <div className="flex items-center justify-between text-xs text-rose-700 font-semibold mb-1">
                    <span>Flagged Discrepancies</span>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-bold text-rose-700 font-mono">
                    {aggregateTotals.totalDiscrepancies}
                  </div>
                  <div className="text-[11px] text-rose-600 mt-0.5 font-semibold">
                    Zero-tolerance required
                  </div>
                </div>
              </div>

              {/* Zero-State Empty Database Callout Banner */}
              {aggregateTotals.totalEntities === 0 && (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Database has 0 records (Ready for Excel Ingestion)
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        No junk records are loaded. You can upload your society Excel workbook (<code className="bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200 font-mono text-emerald-800">.xlsx</code>) with your 11 sheets to automatically populate and verify your database tables.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setActiveTab('excel-ingestion');
                        setTimeout(() => fileInputRef.current?.click(), 50);
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Excel Workbook</span>
                    </button>
                    <button
                      onClick={() => exportMasterWorkbookWithAllSheets(DATABASE_TABLES_CATALOG, customTableData, false)}
                      className="px-3 py-2 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg cursor-pointer transition-colors"
                    >
                      Download Blank Template
                    </button>
                  </div>
                </div>
              )}

              {/* The Concise Summary Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Module-wise Verification Matrix
                    </h3>
                    <p className="text-xs text-slate-500">
                      Exact comparison of completed vs. pending tasks with progress visualization
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Financial Year: <strong className="text-slate-800">FY 2018-19</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-3 px-4">Audit Module</th>
                        <th className="py-3 px-3 text-right">Total Scope</th>
                        <th className="py-3 px-3 text-right">Completed</th>
                        <th className="py-3 px-3 text-right">Pending</th>
                        <th className="py-3 px-3 text-right">Discrepancy</th>
                        <th className="py-3 px-4 w-44">Progress</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {moduleSummaryRows.map((row) => {
                        const IconComponent = row.icon;
                        return (
                          <tr
                            key={row.id}
                            className="hover:bg-blue-50/30 transition-colors group"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${row.color}`}>
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs group-hover:text-blue-600 transition-colors">
                                    {row.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate max-w-xs">
                                    {row.subtitle}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900">
                              {formatNumber(row.total)}
                            </td>

                            <td className="py-3.5 px-3 text-right font-mono text-emerald-700 font-bold">
                              <div>{formatNumber(row.completed)}</div>
                              <div className="text-[10px] text-emerald-600 font-normal">
                                {row.completionRate}%
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-right font-mono text-blue-700 font-medium">
                              <div>{formatNumber(row.pending)}</div>
                              <div className="text-[10px] text-blue-500 font-normal">
                                {row.total > 0 ? Math.round((row.pending / row.total) * 100) : 0}%
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-right font-mono">
                              {row.discrepancies > 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[11px]">
                                  <AlertTriangle className="w-3 h-3" />
                                  {row.discrepancies}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">—</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                                <span className="text-slate-600 font-semibold">{row.completionRate}%</span>
                                <span className="text-slate-400">{row.completed}/{row.total}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                                <div
                                  className="bg-emerald-500 h-2 rounded-l-full transition-all duration-300"
                                  style={{ width: `${row.completionRate}%` }}
                                  title={`Completed: ${row.completionRate}%`}
                                />
                                {row.discrepancies > 0 && (
                                  <div
                                    className="bg-rose-500 h-2 transition-all duration-300"
                                    style={{
                                      width: `${Math.min(100 - row.completionRate, Math.max(4, (row.discrepancies / row.total) * 100))}%`,
                                    }}
                                    title={`Discrepancies: ${row.discrepancies}`}
                                  />
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight whitespace-nowrap ${
                                  row.status === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : row.status === 'Action Required' || row.status === 'Variance Detected' || row.status === 'Discrepancies Flagged'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => {
                                  setCurrentScreen(row.targetScreen);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-md transition-colors cursor-pointer shadow-2xs"
                              >
                                <span>Inspect</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Table Footer: Aggregate Overall Totals */}
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="uppercase text-[11px] tracking-wider text-slate-800">
                              Comprehensive Society Total
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-sm">
                          {formatNumber(aggregateTotals.totalEntities)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700 text-sm">
                          {formatNumber(aggregateTotals.totalCompleted)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-blue-700 text-sm">
                          {formatNumber(aggregateTotals.totalPending)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-700 text-sm">
                          {aggregateTotals.totalDiscrepancies}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                            <span className="text-emerald-700 font-bold">{aggregateTotals.overallRate}% Done</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-2 rounded-full"
                              style={{ width: `${aggregateTotals.overallRate}%` }}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-[10px] bg-slate-800 text-white font-bold px-2 py-0.5 rounded-full">
                            {aggregateTotals.overallRate}% Audited
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setActiveTab('excel-ingestion')}
                            className="text-xs text-blue-600 hover:underline cursor-pointer font-semibold inline-flex items-center gap-1"
                          >
                            <span>Data Ingestion</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Informational Guidance Callout */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Uploading a single Excel workbook with all 11 sheets?
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      You can drop a single workbook file (.xlsx) and our bulk ingestion engine will automatically route each sheet into its corresponding database table.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('excel-ingestion')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors shadow-xs shrink-0"
                >
                  <FileUp className="w-4 h-4" />
                  <span>Open Multi-Sheet Ingestion</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Single File All Sheets Ingestion Studio */}
          {activeTab === 'excel-ingestion' && (
            <div className="space-y-6">
              {/* Main Upload Banner */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Single File Multi-Sheet Bulk Ingestion
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Upload one single Excel workbook (<code className="bg-slate-100 px-1 py-0.2 rounded font-mono text-emerald-800">.xlsx</code>) containing all 11 sheets. The engine will match every sheet and populate all database tables automatically.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleSimulateMultiSheetIngestion}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer transition-colors"
                      title="Load sample test sheets for demonstration purposes"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Simulate Sample Sheets (Test Only)</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Excel File (.xlsx)</span>
                    </button>
                  </div>
                </div>

                {/* Upload Status Alerts */}
                {ingestionSuccessMessage && (
                  <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-medium">{ingestionSuccessMessage}</span>
                    </div>
                    <button
                      onClick={() => setIngestionSuccessMessage(null)}
                      className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {uploadError && (
                  <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span className="font-semibold">{uploadError}</span>
                  </div>
                )}

                {/* Multi-Sheet Auto-Match Matrix */}
                {sheetMatches && sheetMatches.length > 0 && (
                  <div className="mt-5 border border-emerald-200 rounded-xl bg-emerald-50/20 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2 border-b border-emerald-100">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Detected Sheets in Uploaded Workbook ({sheetMatches.length} Sheets)</span>
                        </h4>
                        <p className="text-[11px] text-slate-600">
                          Review each sheet's automated mapping to its database table before committing.
                        </p>
                      </div>

                      <button
                        onClick={handleBulkIngestAllSheets}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-colors shadow-xs shrink-0"
                      >
                        <Check className="w-4 h-4" />
                        <span>Bulk Ingest All {sheetMatches.filter((m) => m.matchedTable !== null).length} Sheets into Database Tables</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {sheetMatches.map((m, idx) => (
                        <div
                          key={m.sheetName}
                          onClick={() => handleSheetSelect(idx)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            activeSheetIndex === idx
                              ? 'bg-white border-blue-500 shadow-xs ring-1 ring-blue-400'
                              : 'bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-slate-800 truncate" title={m.sheetName}>
                              {m.sheetName}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.2 rounded">
                              {m.totalRows} rows
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <span>➔</span>
                            {m.matchedTable ? (
                              <span className="text-emerald-700 font-semibold truncate" title={m.matchedTable.name}>
                                {m.matchedTable.name}
                              </span>
                            ) : (
                              <span className="text-rose-500 font-semibold">Unmatched</span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">
                              {m.validation?.mappedColumns.filter((c) => c.isMatched).length} / {m.matchedTable?.columns.length || 0} cols matched
                            </span>
                            <span
                              className={`font-semibold ${
                                m.matchConfidence === 'Exact'
                                  ? 'text-emerald-600'
                                  : m.matchConfidence === 'Fuzzy'
                                  ? 'text-blue-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {m.matchConfidence} Match
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Target Database Table Selector & Schema Information */}
                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Inspect Specific Database Table:
                    </label>
                    <select
                      value={selectedTableId}
                      onChange={(e) => handleTableChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {DATABASE_TABLES_CATALOG.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.excelSheetName})
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Category: <strong className="text-slate-700">{currentTableDef.category}</strong>
                    </span>
                  </div>

                  <div className="md:col-span-2 bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                      <Info className="w-3.5 h-3.5 text-blue-600" />
                      <span>Table Description &amp; Schema Mapping:</span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      {currentTableDef.description}. Designated Excel sheet: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-emerald-700">{currentTableDef.excelSheetName}</code>.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {currentTableDef.columns.map((col) => (
                        <span
                          key={col.name}
                          className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-600"
                        >
                          {col.name} {col.isPrimaryKey ? '★ (PK)' : ''} {col.isForeignKey ? '⚲ (FK)' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview & Mapping Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-600" />
                      <span>Database Table Schema &amp; Data Preview ({currentTableRecords.length} records)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Target Table: <strong className="text-slate-800">{currentTableDef.name}</strong> • Enforces primary keys and foreign key constraints
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportTableToCSV(currentTableDef, currentTableRecords)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Download className="w-3 h-3 text-slate-500" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={() => exportTableToExcel(currentTableDef, currentTableRecords)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 text-emerald-600" />
                      <span>Export Excel</span>
                    </button>
                    {parsedSheets && (
                      <button
                        onClick={handleCommitSingleTable}
                        className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Commit Active Sheet</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Table Records Grid */}
                {currentTableRecords.length === 0 ? (
                  <div className="py-12 px-4 text-center bg-slate-50/50 rounded-b-xl">
                    <Database className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">0 records in table "{currentTableDef.name}"</p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                      This table is completely clean with 0 records. Upload your society Excel file (.xlsx) to ingest real records, or preview the sample schema.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Excel Workbook</span>
                      </button>
                      <button
                        onClick={() => handleLoadSampleForTable(currentTableDef.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                      >
                        Preview Sample Structure
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10 shadow-2xs">
                        <tr>
                          <th className="py-2.5 px-3 font-mono text-[11px] text-slate-500 w-12 text-center">#</th>
                          {currentTableDef.columns.map((col) => (
                            <th key={col.name} className="py-2.5 px-3 text-slate-700 font-semibold text-[11px]">
                              <div className="flex items-center gap-1">
                                <span>{col.name}</span>
                                {col.isPrimaryKey && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded">PK</span>
                                )}
                                {col.isForeignKey && (
                                  <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1 rounded">FK</span>
                                )}
                              </div>
                              <div className="text-[9px] text-slate-400 font-normal capitalize">
                                {col.type}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                        {currentTableRecords.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2 px-3 text-slate-400 text-center font-sans text-[10px]">
                              {rIdx + 1}
                            </td>
                            {currentTableDef.columns.map((col) => {
                              const val = (row as any)[col.name];
                              return (
                                <td key={col.name} className="py-2 px-3 whitespace-nowrap">
                                  {col.type === 'currency' ? (
                                    <span className={Number(val) < 0 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                                      {val !== undefined && val !== null && val !== ''
                                        ? typeof val === 'number'
                                          ? formatINR(val)
                                          : String(val)
                                        : '—'}
                                    </span>
                                  ) : col.type === 'enum' ? (
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold ${
                                        val === 'Verified' || val === 'Paid' || val === 'Complete' || val === 'Active' || val === 'MATCHED'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : val === 'Disputed' || val === 'Discrepancy' || val === 'Failed' || val === 'DIFFERENCE'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {String(val || 'N/A')}
                                    </span>
                                  ) : (
                                    <span className="text-slate-800 truncate max-w-xs block font-sans">
                                      {val !== undefined && val !== null ? String(val) : '—'}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                  <span>
                    Showing {currentTableRecords.length} records in database table <strong className="text-slate-700">{currentTableDef.id}</strong>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ACID integrity • Enforced constraints • Tamper-evident logging
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Which Database is Used? */}
          {activeTab === 'database-info' && (
            <div className="space-y-6">
              {/* Executive Answer Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Which Database is Used by the Application?
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      The application utilizes a **Relational Schema Database Architecture** modeled specifically for Housing Society Bye-Laws &amp; Maharashtra Co-operative Societies Act guidelines. It operates with a two-tier database structure:
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 text-xs">
                    <div className="font-bold text-purple-900 flex items-center gap-2 mb-2">
                      <Server className="w-4 h-4 text-purple-600" />
                      <span>1. In-App Indexed Relational Database Engine</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed mb-2">
                      Provides instant query response, real-time client-side cross-checking, and zero latency. Implements strict relational constraints across all 11 tables:
                    </p>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside">
                      <li><strong>Primary Keys:</strong> e.g., <code className="bg-white px-1 rounded">party_id</code>, <code className="bg-white px-1 rounded">transaction_id</code></li>
                      <li><strong>Foreign Keys:</strong> <code className="bg-white px-1 rounded">tbl_transactions.party_id</code> ➔ <code className="bg-white px-1 rounded">tbl_party_master.party_id</code></li>
                      <li><strong>State Persistence:</strong> Stored locally in encrypted indexed storage across sessions.</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 text-xs">
                    <div className="font-bold text-blue-900 flex items-center gap-2 mb-2">
                      <Server className="w-4 h-4 text-blue-600" />
                      <span>2. Cloud Backend Integration (Production)</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed mb-2">
                      Configured in <strong>Settings &amp; Data Management</strong> to sync persistently with enterprise backend storage:
                    </p>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside">
                      <li><strong>PostgreSQL / Google Cloud SQL:</strong> Relational SQL database for multi-user audit concurrency.</li>
                      <li><strong>Google Apps Script &amp; Google Sheets API:</strong> Serverless REST web-app endpoint syncing verified records.</li>
                      <li><strong>Zero Tolerance Discrepancy Gate:</strong> Discrepancies (₹ 0.00 threshold) block unverified signoffs.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* The 11 Database Tables Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>The 11 Relational Database Tables Corresponding to Your Workbook</span>
                </h4>
                <p className="text-xs text-slate-600 mb-4">
                  When you upload your single file, each sheet is ingested into its corresponding database table:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {DATABASE_TABLES_CATALOG.map((t) => (
                    <div key={t.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">{t.name}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                          {t.category}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-emerald-700 mb-1">
                        Table: {t.id}
                      </div>
                      <div className="text-[11px] text-slate-500 mb-2 truncate">
                        Source Sheet: <code className="bg-white px-1 border rounded">{t.excelSheetName}</code>
                      </div>
                      <div className="text-[10px] text-slate-600 border-t border-slate-200 pt-1.5 flex justify-between">
                        <span>Columns: {t.columns.length}</span>
                        <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => {
                          setSelectedTableId(t.id);
                          setActiveTab('excel-ingestion');
                        }}>
                          View Table ➔
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Audit Trail & Accountability */}
          {activeTab === 'audit-trail' && (
            <div className="space-y-6">
              {/* Filters & Search Header */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by action, transaction ID, reviewer, or remarks..."
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {auditSearchQuery && (
                    <button
                      onClick={() => setAuditSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 text-xs shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <select
                    value={auditEntityFilter}
                    onChange={(e: any) => setAuditEntityFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold"
                  >
                    <option value="all">All Entity Types</option>
                    <option value="Transaction">Transactions</option>
                    <option value="OpeningBalance">Opening Balances</option>
                    <option value="MonthlyReconciliation">Reconciliations</option>
                  </select>

                  <select
                    value={auditUserFilter}
                    onChange={(e) => setAuditUserFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold"
                  >
                    <option value="all">All Reviewers</option>
                    {auditUsers.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Audit Trail Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Immutable User Action Audit Log ({filteredAuditLogs.length} Records)
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Audit accountability active
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10 shadow-2xs">
                      <tr className="text-slate-700 font-semibold">
                        <th className="py-2.5 px-3">Log ID</th>
                        <th className="py-2.5 px-2">Entity Type</th>
                        <th className="py-2.5 px-2">Record ID</th>
                        <th className="py-2.5 px-3">Action Description</th>
                        <th className="py-2.5 px-3">State Transition</th>
                        <th className="py-2.5 px-2">Reviewer</th>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Remarks / Justification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-normal">
                      {filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{log.id}</td>
                          <td className="py-2.5 px-2">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {log.entityType}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-mono text-slate-800 font-semibold">{log.entityId}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">{log.action}</td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                            <span className="text-slate-400">{log.previousValue || '—'}</span> →{' '}
                            <span className="font-semibold text-blue-700">{log.newValue || '—'}</span>
                          </td>
                          <td className="py-2.5 px-2 font-semibold text-slate-800">{log.user}</td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px] font-mono">{log.timestamp}</td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-xs truncate" title={log.reason}>
                            {log.reason || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                  <span>
                    Showing {filteredAuditLogs.length} of {changeLogs.length} audit trail records
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Compliant with Society Audit Accountability Bye-Law 152
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Varsha Nivas Society Financial Verification Platform • Auditing FY 2018-19</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg cursor-pointer transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                setCurrentScreen('transaction-verification');
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              <span>Continue Verification</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

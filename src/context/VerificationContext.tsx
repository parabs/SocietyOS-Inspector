/**
 * React Context for Varsha Nivas Financial Verification & Management
 * Integrated with Supabase Client (hklibokniuwurdxndxfd.supabase.co)
 * Providing real-time database-driven verification for Opening Balances & Transactions
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseClient } from '../services/supabaseClient';
import {
  AccountId,
  OpeningBalanceRecord,
  MonthlyReconciliationRecord,
  EnrichedTransaction,
  OutstandingIssue,
  MonthlyVerificationSummary,
  ChangeLogEntry,
  BillStatus,
  VoucherReceiptStatus,
  EvidenceStatus,
  InternalAuditStatus,
  VerificationStatus,
  AuditNote,
} from '../types';
import {
  INITIAL_OPENING_BALANCES,
  INITIAL_TDCC_RECONCILIATION,
  INITIAL_BOM_RECONCILIATION,
  INITIAL_CASH_RECONCILIATION,
  generateFullTransactions,
  OUTSTANDING_ISSUES,
  MONTHLY_VERIFICATION_STATUS,
  INITIAL_AUDIT_NOTES,
} from '../data/mockData';
import { APP_CONFIG } from '../config';
import {
  DbMemberOpeningBalance,
  DbBalanceRegister,
  DbMemberFinancialYearBalance,
  DbMemberCumulativeOutstanding,
  DbDemandRegister,
  DbDemandAdjustment,
  DbDemandPaymentAllocation,
  DbPartyMaster,
  DbFlatOwnerMaster,
  DbCategoryMaster,
  DbRulesMaster,
  DbSourceRegister,
} from '../types/supabase';

export type ScreenId =
  | 'verification-dashboard'
  | 'opening-balances'
  | 'transaction-verification'
  | 'monthly-reconciliation'
  | 'treasurer-dashboard'
  | 'secretary-dashboard'
  | 'chairman-dashboard'
  | 'member-dashboard'
  | 'auditor-dashboard'
  | 'financial-summary'
  | 'demand-collections'
  | 'payments-expenses'
  | 'party-ledger'
  | 'audit-evidence'
  | 'bank-reconciliation'
  | 'observations-actions'
  | 'reports'
  | 'settings'
  | 'data-management'
  | 'user-access';

export interface SupabaseSyncState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  tablesLoaded: Record<string, number>;
}

interface VerificationContextType {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  selectedAccountId: AccountId;
  setSelectedAccountId: (acc: AccountId) => void;
  selectedMonthFilter: string;
  setSelectedMonthFilter: (month: string) => void;
  selectedTransactionId: string | null;
  setSelectedTransactionId: (id: string | null) => void;

  // Data & State for Opening Balances
  openingBalances: OpeningBalanceRecord[];
  isLoadingOpeningBalances: boolean;
  openingBalancesError: string | null;
  fetchOpeningBalances: () => Promise<void>;
  updateOpeningBalance: (
    accountId: AccountId,
    updates: {
      supportingRecords?: OpeningBalanceRecord['supportingRecords'];
      status: VerificationStatus;
      remarks: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;

  // Data & State for Transactions
  transactions: EnrichedTransaction[];
  isLoadingTransactions: boolean;
  transactionsError: string | null;
  fetchTransactions: () => Promise<void>;
  updateTransactionInspection: (
    id: string,
    updates: {
      billStatus: BillStatus;
      voucherReceiptStatus: VoucherReceiptStatus;
      internalAuditStatus: InternalAuditStatus;
      remarks: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  bulkUpdateTransactionInspection: (
    ids: string[],
    updates: {
      billStatus?: BillStatus;
      voucherReceiptStatus: VoucherReceiptStatus;
      internalAuditStatus: InternalAuditStatus;
      remarks: string;
      actionTitle?: string;
    }
  ) => Promise<void>;

  // Data & State for Monthly Reconciliation
  reconciliations: Record<AccountId, MonthlyReconciliationRecord[]>;
  isLoadingReconciliation: boolean;
  reconciliationError: string | null;
  fetchMonthlyReconciliation: () => Promise<void>;
  updateReconciliation: (
    accountId: AccountId,
    monthId: string,
    updates: {
      adjustments?: number;
      remarks?: string;
      status?: 'Pending' | 'Matched' | 'Mismatch' | 'Mismatch Accepted';
      calculatedOpeningBalance?: number;
      credits?: number;
      debits?: number;
      contra?: number;
      calculatedClosingBalance?: number;
      sourceClosingBalance?: number | null;
      openingConfirmed?: boolean;
      transactionsConfirmed?: boolean;
      closingConfirmed?: boolean;
      confirmationNotes?: string;
    }
  ) => Promise<void>;

  issues: OutstandingIssue[];
  monthlySummaries: MonthlyVerificationSummary[];
  changeLogs: ChangeLogEntry[];

  // Database-backed Master and Register collections
  memberOpeningBalances: DbMemberOpeningBalance[];
  balanceRegister: DbBalanceRegister[];
  memberFinancialBalances: DbMemberFinancialYearBalance[];
  cumulativeOutstanding: DbMemberCumulativeOutstanding[];
  isLoadingMemberBalances: boolean;
  memberBalancesError: string | null;
  fetchMemberBalances: () => Promise<void>;

  demandRegister: DbDemandRegister[];
  demandAdjustments: DbDemandAdjustment[];
  demandAllocations: DbDemandPaymentAllocation[];
  isLoadingDemandRegister: boolean;
  demandRegisterError: string | null;
  fetchDemandRegister: () => Promise<void>;

  partyMaster: DbPartyMaster[];
  flatOwnerMaster: DbFlatOwnerMaster[];
  categoryMaster: DbCategoryMaster[];
  rulesMaster: DbRulesMaster[];
  sourceRegister: DbSourceRegister[];
  isLoadingMasters: boolean;
  mastersError: string | null;
  fetchMasters: () => Promise<void>;

  // Overall Supabase Status & Sync
  supabaseSync: SupabaseSyncState;
  refetchAll: () => Promise<void>;
  refetchFromSupabase: () => Promise<void>;

  // KPI Calculations
  stats: {
    openingBalancesVerified: number;
    openingBalancesTotal: number;
    totalTransactions: number;
    inspectedTransactions: number;
    pendingTransactions: number;
    evidenceComplete: number;
    evidenceDiscrepancy: number;
    evidenceMissing: number;
    internalAuditFailed: number;
    reconciledAccountMonths: number;
    totalAccountMonths: number;
    readinessPercentage: number;
  };

  // Quick navigation helper
  navigateToIssue: (issue: OutstandingIssue) => void;
  resetAllData: () => void;

  // Auditor Quick Notes
  auditNotes: AuditNote[];
  addAuditNote: (note: Omit<AuditNote, 'id' | 'timestamp'>) => void;
  deleteAuditNote: (id: string) => void;
  togglePinAuditNote: (id: string) => void;

  // Optional Database Seeding
  isSeedingDatabase: boolean;
  seedBaselineRecordsToSupabase: () => Promise<{ success: boolean; message: string }>;
}

const VerificationContext = createContext<VerificationContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'varsha_nivas_state_v1_';

// Purge any stale mock data from previous sessions
try {
  localStorage.removeItem(STORAGE_KEY_PREFIX + 'opening_balances');
  localStorage.removeItem(STORAGE_KEY_PREFIX + 'transactions');
  localStorage.removeItem(STORAGE_KEY_PREFIX + 'reconciliations');
  localStorage.removeItem(STORAGE_KEY_PREFIX + 'issues');
} catch (e) {
  // ignore storage errors
}

export const VerificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('verification-dashboard');
  const [selectedAccountId, setSelectedAccountId] = useState<AccountId>('TDCC');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('All Months');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  // Data states - strictly driven by live Supabase database tables (empty by default)
  const [openingBalances, setOpeningBalances] = useState<OpeningBalanceRecord[]>([]);
  const [isLoadingOpeningBalances, setIsLoadingOpeningBalances] = useState<boolean>(true);
  const [openingBalancesError, setOpeningBalancesError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState<boolean>(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const [reconciliations, setReconciliations] = useState<Record<AccountId, MonthlyReconciliationRecord[]>>({
    TDCC: [],
    BOM: [],
    CASH: [],
  });
  const [isLoadingReconciliation, setIsLoadingReconciliation] = useState<boolean>(false);
  const [reconciliationError, setReconciliationError] = useState<string | null>(null);

  const [issues, setIssues] = useState<OutstandingIssue[]>([]);

  // Additional Database Collections
  const [memberOpeningBalances, setMemberOpeningBalances] = useState<DbMemberOpeningBalance[]>([]);
  const [balanceRegister, setBalanceRegister] = useState<DbBalanceRegister[]>([]);
  const [memberFinancialBalances, setMemberFinancialBalances] = useState<DbMemberFinancialYearBalance[]>([]);
  const [cumulativeOutstanding, setCumulativeOutstanding] = useState<DbMemberCumulativeOutstanding[]>([]);
  const [demandRegister, setDemandRegister] = useState<DbDemandRegister[]>([]);
  const [demandAdjustments, setDemandAdjustments] = useState<DbDemandAdjustment[]>([]);
  const [demandAllocations, setDemandAllocations] = useState<DbDemandPaymentAllocation[]>([]);
  const [partyMaster, setPartyMaster] = useState<DbPartyMaster[]>([]);
  const [flatOwnerMaster, setFlatOwnerMaster] = useState<DbFlatOwnerMaster[]>([]);
  const [categoryMaster, setCategoryMaster] = useState<DbCategoryMaster[]>([]);
  const [rulesMaster, setRulesMaster] = useState<DbRulesMaster[]>([]);
  const [sourceRegister, setSourceRegister] = useState<DbSourceRegister[]>([]);

  // Module Loading & Error States
  const [isLoadingMemberBalances, setIsLoadingMemberBalances] = useState<boolean>(true);
  const [memberBalancesError, setMemberBalancesError] = useState<string | null>(null);

  const [isLoadingDemandRegister, setIsLoadingDemandRegister] = useState<boolean>(true);
  const [demandRegisterError, setDemandRegisterError] = useState<string | null>(null);

  const [isLoadingMasters, setIsLoadingMasters] = useState<boolean>(true);
  const [mastersError, setMastersError] = useState<string | null>(null);

  // Supabase connection and synchronization tracking
  const [supabaseSync, setSupabaseSync] = useState<SupabaseSyncState>({
    isConnected: false,
    isLoading: true,
    error: null,
    lastSyncedAt: null,
    tablesLoaded: {},
  });

  const INITIAL_CHANGE_LOGS: ChangeLogEntry[] = [
    {
      id: 'LOG-005',
      entityType: 'MonthlyReconciliation',
      entityId: 'TDCC-Jun 2018',
      action: 'Reconciliation completed for June 2018 (TDCC)',
      previousValue: 'Pending',
      newValue: 'Reconciled',
      user: APP_CONFIG.currentReviewer.name,
      timestamp: '20 Oct 2026, 03:45 PM',
      reason: 'Monthly balance confirmed with TDCC bank statement',
    },
    {
      id: 'LOG-004',
      entityType: 'Transaction',
      entityId: 'TXN-2018-00078',
      action: 'Transaction verified with physical voucher V-118',
      previousValue: 'Pending',
      newValue: 'Complete / Verified',
      user: APP_CONFIG.currentReviewer.name,
      timestamp: '20 Oct 2026, 02:15 PM',
      reason: 'Cleaning services bill & voucher verified',
    },
  ];

  const [changeLogs, setChangeLogs] = useState<ChangeLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'changelogs');
    return saved ? JSON.parse(saved) : INITIAL_CHANGE_LOGS;
  });

  const [auditNotes, setAuditNotes] = useState<AuditNote[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'audit_notes');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_NOTES;
  });

  // Calculate Evidence Status
  const calculateEvidenceStatus = (
    type: 'Payment' | 'Receipt',
    bill: BillStatus,
    voucher: VoucherReceiptStatus
  ): EvidenceStatus => {
    if (bill === 'Missing' || voucher === 'Missing') return 'Missing';
    if (bill === 'Discrepancy' || voucher === 'Discrepancy') return 'Discrepancy';
    if (type === 'Receipt') {
      if (voucher === 'Available') return 'Complete';
    } else {
      if (bill === 'Available' && voucher === 'Available') return 'Complete';
      if (bill === 'N/A' && voucher === 'Available') return 'Complete';
    }
    return 'Pending';
  };

  /**
   * 1. Fetch real Opening Balances from Supabase account_master and account_monthly_balance
   */
  const fetchOpeningBalances = useCallback(async () => {
    setIsLoadingOpeningBalances(true);
    setOpeningBalancesError(null);

    try {
      const [accRes, balRes] = await Promise.all([
        supabaseClient.from('account_master').select('*'),
        supabaseClient.from('account_monthly_balance').select('*'),
      ]);

      if (accRes.error) {
        throw new Error(`account_master query failed: ${accRes.error.message}`);
      }

      const accounts = ((accRes.data as any[]) || []).filter((acc) => ['ACC-0001', 'ACC-0002', 'ACC-0003'].includes(String(acc.account_id || '').toUpperCase()));
      const balances = (balRes.data as any[]) || [];

      if (accounts.length === 0) {
        // Table is empty in Supabase (0 records)
        setOpeningBalances([]);
        setSupabaseSync((prev) => ({
          ...prev,
          tablesLoaded: { ...prev.tablesLoaded, account_master: 0 },
        }));
      } else {
        const mappedRecords: OpeningBalanceRecord[] = accounts.map((acc: any) => {
          const rawId = String(acc.account_id || '').toUpperCase();
          const accountId: AccountId = rawId === 'ACC-0001' ? 'TDCC' : rawId === 'ACC-0002' ? 'BOM' : 'CASH';

          const matchBal = balances.find((b: any) => String(b.account_id || '').toUpperCase() === rawId);

          const recordedOp = acc.opening_balance ?? matchBal?.opening_balance ?? 0;
          const auditClosing = acc.current_balance ?? recordedOp;
          const difference = Number((recordedOp - auditClosing).toFixed(2));

          return {
            accountId,
            accountName: acc.account_name || `${accountId} Account`,
            accountType: (acc.account_type || (accountId === 'CASH' ? 'Cash' : 'Bank')) as 'Bank' | 'Cash',
            financialYear: matchBal?.financial_year || 'FY 2018-19',
            auditClosingBalance: auditClosing,
            recordedOpeningBalance: recordedOp,
            difference,
            sourceReference: matchBal ? `account_monthly_balance [ID ${matchBal.id}]` : 'account_master',
            supportingRecords: {
              auditReport: true,
              cashBook: true,
              bankPassbook: accountId !== 'CASH',
            },
            status: (difference === 0 ? 'Verified' : 'Pending') as VerificationStatus,
            remarks: acc.remarks || '',
            verifiedBy: acc.verified_by || undefined,
            verifiedOn: acc.verified_at || acc.updated_at?.split('T')[0] || undefined,
          };
        });

        setOpeningBalances(mappedRecords);
        setSupabaseSync((prev) => ({
          ...prev,
          tablesLoaded: { ...prev.tablesLoaded, account_master: mappedRecords.length },
        }));
      }
    } catch (err: any) {
      console.error('[SupabaseClient] Error fetching opening balances:', err);
      setSupabaseSync((prev) => ({ ...prev, error: `account data: ${err.message || 'fetch failed'}` }));
      setOpeningBalancesError(err.message || 'Failed to fetch opening balances from Supabase');
    } finally {
      setIsLoadingOpeningBalances(false);
    }
  }, []);

  /**
   * 2. Fetch real Transactions from Supabase transactions table
   */
  const fetchTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    setTransactionsError(null);

    try {
      const [txnRes, accountRes, partyRes, categoryRes] = await Promise.all([
        supabaseClient.from('transactions').select('*', { count: 'exact' }),
        supabaseClient.from('account_master').select('account_id, account_name'),
        supabaseClient.from('party_master').select('party_id, party_name'),
        supabaseClient.from('category_master').select('category_id, category_name, category_group'),
      ]);
      if (txnRes.error) throw new Error(`transactions query failed: ${txnRes.error.message}`);
      if (accountRes.error) throw new Error(`account_master query failed: ${accountRes.error.message}`);
      if (partyRes.error) throw new Error(`party_master query failed: ${partyRes.error.message}`);
      if (categoryRes.error) throw new Error(`category_master query failed: ${categoryRes.error.message}`);
      const accountNames = new Map((accountRes.data || []).map((x: any) => [x.account_id, x.account_name]));
      const partyNames = new Map((partyRes.data || []).map((x: any) => [x.party_id, x.party_name]));
      const categoryDetails = new Map((categoryRes.data || []).map((x: any) => [x.category_id, x]));
      const data = txnRes.data;
      const rawRows = (data as any[]) || [];

      if (rawRows.length === 0) {
        // Table is empty in Supabase (0 records)
        setTransactions([]);
        setSupabaseSync((prev) => ({
          ...prev,
          tablesLoaded: { ...prev.tablesLoaded, transactions: 0 },
        }));
      } else {
        const mappedTransactions: EnrichedTransaction[] = rawRows.map((row: any, idx: number) => {
          const rawAcc = String(row.account_id || '').toUpperCase();
          // The workbook import uses ACC-0001/0002/0003; older UI code expected names in account_id.
          const accountId: AccountId =
            rawAcc.includes('TDCC') || rawAcc === 'ACC-0001' ? 'TDCC' :
            rawAcc.includes('BOM') || rawAcc === 'ACC-0002' ? 'BOM' :
            rawAcc.includes('CASH') || rawAcc.includes('PETTY') || rawAcc === 'ACC-0003' ? 'CASH' : 'CASH';
          const rawType = row.transaction_type || row.type || (Number(row.amount) >= 0 ? 'Receipt' : 'Payment');
          const rawTypeLower = String(rawType).toLowerCase();
          const transactionClass: 'Receipt' | 'Payment' | 'Contra' = rawTypeLower.includes('contra') ? 'Contra' : rawTypeLower.includes('rec') ? 'Receipt' : 'Payment';
          const type: 'Receipt' | 'Payment' = transactionClass === 'Receipt' ? 'Receipt' : 'Payment';
          const rawDate = row.transaction_date || row.date || new Date().toISOString().split('T')[0];
          const billRaw = String(row.bill_status || row.bills_available || '').toLowerCase();
          const voucherRaw = String(row.voucher_receipt_status || row.voucher_available || '').toLowerCase();
          const billStatus = (row.bill_status || (billRaw.includes('miss') ? 'Missing' : billRaw.includes('discrep') ? 'Discrepancy' : billRaw.includes('n/a') ? 'N/A' : billRaw.includes('avail') ? 'Available' : 'Pending')) as BillStatus;
          const voucherReceiptStatus = (row.voucher_receipt_status || (voucherRaw.includes('miss') ? 'Missing' : voucherRaw.includes('discrep') ? 'Discrepancy' : voucherRaw.includes('avail') ? 'Available' : 'Pending')) as VoucherReceiptStatus;
          const evidenceStatus = (row.evidence_status || calculateEvidenceStatus(type, billStatus, voucherReceiptStatus)) as EvidenceStatus;
          const auditRaw = String(row.internal_audit_status || row.verified || '').toLowerCase();
          const internalAuditStatus = (row.internal_audit_status || (auditRaw.includes('fail') || auditRaw.includes('discrep') ? 'Failed' : auditRaw === 'true' || auditRaw.includes('verif') ? 'Verified' : 'Pending')) as InternalAuditStatus;
          const voucherRef = row.voucher_no || row.voucher_receipt_no || undefined;
          return {
            id: row.transaction_id || row.id || `TXN-${String(idx + 1).padStart(5, '0')}`,
            transactionClass,
            isCorrection: Boolean(row.is_correction),
            correctionStatus: row.correction_status || 'Original',
            sourceFile: row.source_file || row.source_id || 'transactions.supabase',
            sourceSheet: row.source_sheet || 'transactions',
            sourceRow: row.source_row ?? idx + 1,
            date: String(rawDate).slice(0, 10),
            month: (() => { const sourceMonth = String(row.month || row.reporting_month || ''); const normalized = sourceMonth.match(/^([A-Za-z]{3,})[- ](\d{4})$/); return normalized ? `${normalized[1].slice(0, 3)} ${normalized[2]}` : (sourceMonth || (rawDate ? new Date(rawDate).toLocaleString('en-US', { month: 'short', year: 'numeric' }) : 'Apr 2018')); })(),
            accountId,
            type,
            party: (row.party_id && partyNames.get(row.party_id)) || row.party_name || row.party_id || 'Sundry Member / Vendor',
            description: row.description || 'Society transaction record',
            accountName: accountNames.get(row.account_id) || row.account_id || 'Unknown account',
            categoryName: (row.category_id && (categoryDetails.get(row.category_id) as any)?.category_name) || '',
            categoryGroup: (row.category_id && (categoryDetails.get(row.category_id) as any)?.category_group) || '',
            paymentMode: row.payment_mode || '',
            chequeNo: row.cheque_no || undefined,
            reportingMonth: row.reporting_month || '',
            amount: Number(row.amount || 0),
            voucherNo: voucherRef,
            receiptNo: undefined,
            billStatus,
            voucherReceiptStatus,
            evidenceStatus,
            internalAuditStatus,
            remarks: row.remarks || row.audit_notes || '',
            reviewer: row.reviewer || undefined,
            updatedAt: row.updated_at || row.created_at,
          };
        });

        setTransactions(mappedTransactions);
        setSupabaseSync((prev) => ({
          ...prev,
          tablesLoaded: { ...prev.tablesLoaded, transactions: mappedTransactions.length },
        }));
      }
    } catch (err: any) {
      console.error('[SupabaseClient] Error fetching transactions:', err);
      setSupabaseSync((prev) => ({ ...prev, error: `transactions: ${err.message || 'fetch failed'}` }));
      setTransactionsError(err.message || 'Failed to fetch transactions from Supabase');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  /**
   * 3. Fetch Monthly Reconciliation from Supabase account_monthly_balance
   */
  const fetchMonthlyReconciliation = useCallback(async () => {
    setIsLoadingReconciliation(true);
    setReconciliationError(null);

    try {
      const { data, error } = await supabaseClient
        .from('account_monthly_balance')
        .select('*');

      if (error) {
        throw new Error(`account_monthly_balance query failed: ${error.message}`);
      }

      const rawRows = (data as any[]) || [];

      if (rawRows.length === 0) {
        // Table is empty in Supabase (0 records)
        setReconciliations({
          TDCC: [],
          BOM: [],
          CASH: [],
        });
        setSupabaseSync((prev) => ({
          ...prev,
          tablesLoaded: { ...prev.tablesLoaded, account_monthly_balance: 0 },
        }));
      } else {
        const MONTH_ORDER: Record<string, number> = {
          apr: 0, april: 0, may: 1, jun: 2, june: 2, jul: 3, july: 3,
          aug: 4, august: 4, sep: 5, sept: 5, september: 5, oct: 6, october: 6,
          nov: 7, november: 7, dec: 8, december: 8, jan: 9, january: 9,
          feb: 10, february: 10, mar: 11, march: 11,
        };

        const sortedRows = [...rawRows].sort((a: any, b: any) => {
          if (a.month_index !== undefined && b.month_index !== undefined) {
            return Number(a.month_index) - Number(b.month_index);
          }
          const mKeyA = String(a.month || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
          const mKeyB = String(b.month || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);
          return (MONTH_ORDER[mKeyA] ?? 99) - (MONTH_ORDER[mKeyB] ?? 99);
        });

        const result: Record<AccountId, MonthlyReconciliationRecord[]> = {
          TDCC: [],
          BOM: [],
          CASH: [],
        };

        sortedRows.forEach((row: any, idx: number) => {
          const rawAcc = String(row.account_id || '').toUpperCase();
          const accountId: AccountId = rawAcc.includes('TDCC') || rawAcc === 'ACC-0001' ? 'TDCC' : rawAcc.includes('BOM') || rawAcc === 'ACC-0002' ? 'BOM' : 'CASH';

          const op = Number(row.target_opening_balance ?? row.source_opening_balance ?? 0);
          const credits = Number(row.credits_source ?? 0);
          const debits = Number(row.debits_source ?? 0);
          const contra = Number(row.contra_source ?? 0);
          const adjustments = Number(row.adjustments ?? 0);
          const calcClose = Number(row.target_closing_balance ?? (op + credits - debits + contra + adjustments));
          const sourceCloseExists = row.source_closing_balance !== null && row.source_closing_balance !== undefined;
          const srcClose = sourceCloseExists ? Number(row.source_closing_balance) : null;

          result[accountId].push({
            id: row.id || `REC-${accountId}-${idx}`,
            month: (() => { const m = String(row.month || ''); const normalized = m.match(/^([A-Za-z]{3,})[- ](\d{4})$/); return normalized ? normalized[1].slice(0,3) + ' ' + normalized[2] : (m || `Month ${idx + 1}`); })(),
            monthIndex: row.month_index ?? idx,
            accountId,
            sourceOpeningBalance: Number(row.source_opening_balance ?? op),
            calculatedOpeningBalance: op,
            openingDifference: Number(row.opening_discrepancy ?? 0),
            credits,
            debits,
            contra,
            adjustments,
            calculatedClosingBalance: calcClose,
            sourceClosingBalance: srcClose,
            closingDifference: sourceCloseExists ? Number((calcClose - Number(srcClose)).toFixed(2)) : 0,
            status: (row.reconciliation_status === 'Reconciled' ? 'Matched' : row.reconciliation_status === 'Difference' ? 'Mismatch' : row.reconciliation_status || (sourceCloseExists ? (Math.abs(calcClose - Number(srcClose)) < 0.01 ? 'Matched' : 'Mismatch') : 'Pending')) as any,
            remarks: row.remarks || '',
            reviewedBy: row.reviewed_by || undefined,
            updatedAt: row.updated_at,
            openingConfirmed: Boolean(row.opening_confirmed),
            transactionsConfirmed: Boolean(row.transactions_confirmed),
            closingConfirmed: Boolean(row.closing_confirmed),
            confirmationNotes: row.confirmation_notes || '',
            confirmedBy: row.confirmed_by || undefined,
            confirmedAt: row.confirmed_at || undefined,
          });
        });

        setReconciliations(result);
        setSupabaseSync((prev) => ({
          ...prev,
          tablesLoaded: { ...prev.tablesLoaded, account_monthly_balance: rawRows.length },
        }));
      }
    } catch (err: any) {
      console.error('[SupabaseClient] Error fetching monthly reconciliation:', err);
      setSupabaseSync((prev) => ({ ...prev, error: `monthly reconciliation: ${err.message || 'fetch failed'}` }));
      setReconciliationError(err.message || 'Failed to fetch monthly reconciliation');
    } finally {
      setIsLoadingReconciliation(false);
    }
  }, []);

  /**
   * 4. Fetch Member Balances and Balance Register from Supabase
   */
  const fetchMemberBalances = useCallback(async () => {
    setIsLoadingMemberBalances(true);
    setMemberBalancesError(null);
    try {
      const [opRes, balRes, finRes, cumRes, partyRes, flatRes] = await Promise.all([
        supabaseClient.from('member_opening_balances').select('*'),
        supabaseClient.from('balance_register').select('*'),
        supabaseClient.from('v_member_financial_year_balance').select('*'),
        supabaseClient.from('v_member_cumulative_outstanding').select('*'),
        supabaseClient.from('party_master').select('party_id, party_name, party_type'),
        supabaseClient.from('flat_owner_master').select('flat_number_source_value, owner_name, owner_type, asset_type'),
      ]);

      if (opRes.error) throw new Error(`member_opening_balances: ${opRes.error.message}`);
      if (balRes.error) throw new Error(`balance_register: ${balRes.error.message}`);

      setMemberOpeningBalances((opRes.data as DbMemberOpeningBalance[]) || []);
      setBalanceRegister((balRes.data as DbBalanceRegister[]) || []);
      const partyRows=(partyRes.data||[]) as any[];
      const flatRows=(flatRes.data||[]) as any[];
      const partyNames=new Map(partyRows.map((p:any)=>[String(p.party_id||''),String(p.party_name||'')]));
      const flatFor=(name:string)=>flatRows.find((f:any)=>String(f.owner_name||'').trim().toLowerCase()===String(name||'').trim().toLowerCase());
      const displayFlat=(name:string,partyId:string)=>String(flatFor(name)?.flat_number_source_value||name||partyNames.get(partyId)||'Unmapped party');
      if (!finRes.error && finRes.data) {
        const normalized=(finRes.data as any[]).map(row=>{
          const name=String(row.member_name||row.name||partyNames.get(String(row.party_id||''))||'Unmapped party');
          return {...row,flat_no:displayFlat(name,String(row.party_id||'')),member_name:name,
            billed_amount:Number(row.billed_amount??row.current_fy_demand)||0,
            received_amount:Number(row.received_amount??row.current_fy_receipts)||0,
            adjusted_amount:Number(row.adjusted_amount??row.adjustments)||0,
            closing_balance:Number(row.closing_balance??row.total_outstanding)||0};
        });
        setMemberFinancialBalances(normalized as DbMemberFinancialYearBalance[]);
      }
      if (!cumRes.error && cumRes.data) {
        const normalized=(cumRes.data as any[]).map(row=>{
          const name=String(row.member_name||row.name||partyNames.get(String(row.party_id||''))||'Unmapped party');
          return {...row,flat_no:displayFlat(name,String(row.party_id||'')),member_name:name,
            total_billed:row.total_billed==null?undefined:Number(row.total_billed),
            total_received:row.total_received==null?undefined:Number(row.total_received),
            total_adjustments:row.total_adjustments==null?undefined:Number(row.total_adjustments),
            net_outstanding:Number(row.net_outstanding??row.cumulative_outstanding??row.total_outstanding)||0,
            opening_balance_verification_status:row.opening_balance_verification_status||'Pending',
            status:(Number(row.net_outstanding??row.cumulative_outstanding??row.total_outstanding)||0)>0?'Outstanding':(Number(row.net_outstanding??row.cumulative_outstanding??row.total_outstanding)||0)<0?'Credit balance':'Cleared'};
        });
        setCumulativeOutstanding(normalized as DbMemberCumulativeOutstanding[]);
      }
      setSupabaseSync((prev) => ({
        ...prev,
        tablesLoaded: {
          ...prev.tablesLoaded,
          member_opening_balances: opRes.data?.length || 0,
          balance_register: balRes.data?.length || 0,
        },
      }));
    } catch (err: any) {
      console.error('[SupabaseClient] Error fetching member balances:', err);
      setSupabaseSync((prev) => ({ ...prev, error: `member balances: ${err.message || 'fetch failed'}` }));
      setMemberBalancesError(err.message || 'Failed to fetch member balances');
      setMemberOpeningBalances([]);
      setBalanceRegister([]);
    } finally {
      setIsLoadingMemberBalances(false);
    }
  }, []);

  /**
   * 5. Fetch Demand Register, Adjustments & Payment Allocations
   */
  const fetchDemandRegister = useCallback(async () => {
    setIsLoadingDemandRegister(true);
    setDemandRegisterError(null);
    try {
      const [demRes, adjRes, allocRes, partyRes, flatRes] = await Promise.all([
        supabaseClient.from('demand_register').select('*'),
        supabaseClient.from('demand_adjustments').select('*'),
        supabaseClient.from('demand_payment_allocations').select('*'),
        supabaseClient.from('party_master').select('party_id, party_name'),
        supabaseClient.from('flat_owner_master').select('flat_number_source_value, owner_name'),
      ]);

      if (demRes.error) throw new Error(`demand_register: ${demRes.error.message}`);

      const partyNames=new Map(((partyRes.data||[]) as any[]).map((p:any)=>[String(p.party_id||''),String(p.party_name||'')]));
      const flatRows=(flatRes.data||[]) as any[];
      const demandRows=(demRes.data||[] as any[]).map((row:any)=>{
        const partyName=String(partyNames.get(String(row.party_id||''))||'');
        const flat=String(flatRows.find((f:any)=>String(f.owner_name||'').trim().toLowerCase()===partyName.trim().toLowerCase())?.flat_number_source_value||partyName||'');
        return {...row,id:row.demand_id,bill_no:row.demand_id,flat_no:flat,member_id:flat||partyName||row.party_id,member_name:partyName,party_name:partyName,
          bill_date:row.demand_date,month:row.demand_month,total_demand:Number(row.total_demand??row.demand_amount)||0};
      });
      const demandById=new Map(demandRows.map((d:any)=>[String(d.demand_id||d.id||''),d]));
      const adjustmentRows=(adjRes.data||[] as any[]).map((a:any)=>{const d:any=demandById.get(String(a.demand_id||''));return {...a,id:a.adjustment_id,amount:Number(a.amount??a.adjustment_amount)||0,created_at:a.created_at||a.adjustment_date,flat_no:d?.flat_no||'',member_id:d?.member_id||d?.party_name||'',member_name:d?.member_name||'',is_approved:String(a.approval_status||'').toLowerCase()==='approved'};});
      setDemandRegister(demandRows as DbDemandRegister[]);
      setDemandAdjustments(adjustmentRows as DbDemandAdjustment[]);
      setDemandAllocations((allocRes.data as DbDemandPaymentAllocation[]) || []);

      setSupabaseSync((prev) => ({
        ...prev,
        tablesLoaded: {
          ...prev.tablesLoaded,
          demand_register: demRes.data?.length || 0,
          demand_adjustments: adjRes.data?.length || 0,
          demand_payment_allocations: allocRes.data?.length || 0,
        },
      }));
    } catch (err: any) {
      console.error('[SupabaseClient] Error fetching demand register:', err);
      setSupabaseSync((prev) => ({ ...prev, error: `demand register: ${err.message || 'fetch failed'}` }));
      setDemandRegisterError(err.message || 'Failed to fetch demand register');
      setDemandRegister([]);
      setDemandAdjustments([]);
      setDemandAllocations([]);
    } finally {
      setIsLoadingDemandRegister(false);
    }
  }, []);

  /**
   * 6. Fetch Masters and Rule Configurations
   */
  const fetchMasters = useCallback(async () => {
    setIsLoadingMasters(true);
    setMastersError(null);
    try {
      const [partyRes, flatRes, catRes, rulesRes, srcRes] = await Promise.all([
        supabaseClient.from('party_master').select('*'),
        supabaseClient.from('flat_owner_master').select('*'),
        supabaseClient.from('category_master').select('*'),
        supabaseClient.from('rules_master').select('*'),
        supabaseClient.from('source_register').select('*'),
      ]);

      if (partyRes.error) throw new Error(`party_master: ${partyRes.error.message}`);

      const flatRows=(flatRes.data||[]) as any[];
      const partyRows=(partyRes.data||[]) as any[];
      const normalizedParties=partyRows.map((p:any)=>({...p,flat_no:p.flat_no||flatRows.find((f:any)=>String(f.owner_name||'').trim().toLowerCase()===String(p.party_name||'').trim().toLowerCase())?.flat_number_source_value}));
      const normalizedFlats=flatRows.map((f:any)=>({...f,flat_no:f.flat_no||f.flat_number_source_value,party_type:f.party_type||f.owner_type||'Member / Owner',phone:f.phone||f.mobile||''}));
      setPartyMaster(normalizedParties as DbPartyMaster[]);
      setFlatOwnerMaster(normalizedFlats as DbFlatOwnerMaster[]);
      setCategoryMaster((catRes.data as DbCategoryMaster[]) || []);
      setRulesMaster((rulesRes.data as DbRulesMaster[]) || []);
      setSourceRegister((srcRes.data as DbSourceRegister[]) || []);

      setSupabaseSync((prev) => ({
        ...prev,
        tablesLoaded: {
          ...prev.tablesLoaded,
          party_master: partyRes.data?.length || 0,
          flat_owner_master: flatRes.data?.length || 0,
          category_master: catRes.data?.length || 0,
          rules_master: rulesRes.data?.length || 0,
          source_register: srcRes.data?.length || 0,
        },
      }));
    } catch (err: any) {
      console.error('[SupabaseClient] Error fetching master tables:', err);
      setSupabaseSync((prev) => ({ ...prev, error: `master tables: ${err.message || 'fetch failed'}` }));
      setMastersError(err.message || 'Failed to fetch master tables');
      setPartyMaster([]);
      setFlatOwnerMaster([]);
      setCategoryMaster([]);
      setRulesMaster([]);
      setSourceRegister([]);
    } finally {
      setIsLoadingMasters(false);
    }
  }, []);

  /**
   * Refetch all database collections in parallel
   */
  const refetchAll = useCallback(async () => {
    setSupabaseSync((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check Supabase connectivity
      const { error: testErr } = await supabaseClient.from('account_master').select('account_id').limit(1);
      if (testErr) {
        setSupabaseSync((prev) => ({
          ...prev,
          isConnected: false,
          isLoading: false,
          error: testErr.message,
        }));
        return;
      }

      await Promise.allSettled([
        fetchOpeningBalances(),
        fetchTransactions(),
        fetchMonthlyReconciliation(),
        fetchMemberBalances(),
        fetchDemandRegister(),
        fetchMasters(),
      ]);

      setSupabaseSync((prev) => ({
        ...prev,
        isConnected: true,
        isLoading: false,
        // Preserve any table-level fetch error instead of reporting a false clean sync.
        error: prev.error,
        lastSyncedAt: new Date().toLocaleTimeString(),
      }));
    } catch (err: any) {
      setSupabaseSync((prev) => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        error: err.message,
      }));
    }
  }, [
    fetchOpeningBalances,
    fetchTransactions,
    fetchMonthlyReconciliation,
    fetchMemberBalances,
    fetchDemandRegister,
    fetchMasters,
  ]);

  // ==========================================
  // Automatic live-data refresh
  // Load every database-backed collection on startup, when the
  // user returns to the tab, and periodically while the app is open.
  // ==========================================
  useEffect(() => {
    void refetchAll();

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refetchAll();
      }
    };

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    // Keep dashboards and registers current without requiring manual refresh.
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refetchAll();
      }
    }, 60_000);

    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(refreshTimer);
    };
  }, [refetchAll]);

  // Persist locally for session resumption
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'opening_balances', JSON.stringify(openingBalances));
  }, [openingBalances]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'reconciliations', JSON.stringify(reconciliations));
  }, [reconciliations]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'issues', JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'changelogs', JSON.stringify(changeLogs));
  }, [changeLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'audit_notes', JSON.stringify(auditNotes));
  }, [auditNotes]);

  const addAuditNote = (note: Omit<AuditNote, 'id' | 'timestamp'>) => {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedDate = `${now.getDate().toString().padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const newNote: AuditNote = {
      ...note,
      id: `NOTE-${Date.now()}`,
      timestamp: formattedDate,
    };
    setAuditNotes((prev) => [newNote, ...prev]);
  };

  const deleteAuditNote = (id: string) => {
    setAuditNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const togglePinAuditNote = (id: string) => {
    setAuditNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  /**
   * Update Opening Balance verification state & persist to Supabase
   */
  const updateOpeningBalance = async (
    accountId: AccountId,
    updates: {
      supportingRecords?: OpeningBalanceRecord['supportingRecords'];
      status: VerificationStatus;
      remarks: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    setOpeningBalances((prev) =>
      prev.map((acc) => {
        if (acc.accountId === accountId) {
          const oldStatus = acc.status;
          const updated: OpeningBalanceRecord = {
            ...acc,
            supportingRecords: updates.supportingRecords || acc.supportingRecords,
            status: updates.status,
            remarks: updates.remarks,
            verifiedBy: updates.status === 'Verified' ? APP_CONFIG.currentReviewer.initials : acc.verifiedBy,
            verifiedOn: updates.status === 'Verified' ? new Date().toISOString().split('T')[0] : acc.verifiedOn,
          };

          const newLog: ChangeLogEntry = {
            id: `LOG-${Date.now()}`,
            entityType: 'OpeningBalance',
            entityId: accountId,
            action: `Opening Balance updated to ${updates.status}`,
            previousValue: oldStatus,
            newValue: updates.status,
            user: APP_CONFIG.currentReviewer.name,
            timestamp: new Date().toLocaleString(),
            reason: updates.remarks,
          };
          setChangeLogs((logs) => [newLog, ...logs]);
          return updated;
        }
        return acc;
      })
    );

    if (updates.status === 'Verified') {
      setIssues((prev) =>
        prev.map((iss) =>
          iss.source === 'Opening Balance' && iss.account === accountId
            ? { ...iss, status: 'Resolved' }
            : iss
        )
      );
    }

    // Persist to Supabase account_master
    try {
      const { error } = await (supabaseClient.from('account_master') as any)
        .update({
          verification_status: updates.status,
          verification_remarks: updates.remarks,
          supporting_records: updates.supportingRecords || { auditReport: false, cashBook: false, bankPassbook: false },
          verified_by: updates.status === 'Verified' ? APP_CONFIG.currentReviewer.name : null,
          verified_at: updates.status === 'Verified' ? new Date().toISOString() : null,
        })
        .eq('account_id', accountId === 'TDCC' ? 'ACC-0001' : accountId === 'BOM' ? 'ACC-0002' : 'ACC-0003');

      if (error) {
        console.warn('[SupabaseClient] Note on account_master update:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  /**
   * Update Transaction Inspection & persist to Supabase
   */
  const updateTransactionInspection = async (
    id: string,
    updates: {
      billStatus: BillStatus;
      voucherReceiptStatus: VoucherReceiptStatus;
      internalAuditStatus: InternalAuditStatus;
      remarks: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    // 1. Optimistic state update
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const calculatedEvidence = calculateEvidenceStatus(
            t.type,
            updates.billStatus,
            updates.voucherReceiptStatus
          );

          const updated: EnrichedTransaction = {
            ...t,
            billStatus: updates.billStatus,
            voucherReceiptStatus: updates.voucherReceiptStatus,
            evidenceStatus: calculatedEvidence,
            internalAuditStatus: updates.internalAuditStatus,
            remarks: updates.remarks,
            reviewer: APP_CONFIG.currentReviewer.name,
            updatedAt: new Date().toISOString(),
          };

          const newLog: ChangeLogEntry = {
            id: `LOG-${Date.now()}`,
            entityType: 'Transaction',
            entityId: id,
            action: `Transaction verification saved (${calculatedEvidence}, Audit: ${updates.internalAuditStatus})`,
            previousValue: `Ev: ${t.evidenceStatus}, Aud: ${t.internalAuditStatus}`,
            newValue: `Ev: ${calculatedEvidence}, Aud: ${updates.internalAuditStatus}`,
            user: APP_CONFIG.currentReviewer.name,
            timestamp: new Date().toLocaleString(),
            reason: updates.remarks,
          };
          setChangeLogs((logs) => [newLog, ...logs]);

          return updated;
        }
        return t;
      })
    );

    // 2. Persist to live Supabase transactions table
    try {
      const { error } = await (supabaseClient.from('transactions') as any)
        .update({
          bill_status: updates.billStatus,
          voucher_receipt_status: updates.voucherReceiptStatus,
          evidence_status: calculateEvidenceStatus(
            transactions.find((t) => t.id === id)?.type || 'Payment',
            updates.billStatus,
            updates.voucherReceiptStatus
          ),
          internal_audit_status: updates.internalAuditStatus,
          remarks: updates.remarks,
          reviewer: APP_CONFIG.currentReviewer.name,
          verified_at: new Date().toISOString(),
        })
        .eq('transaction_id', id);

      if (error) {
        console.warn('[SupabaseClient] Warning saving transaction to Supabase:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  /**
   * Bulk update transaction inspections & batch persist to Supabase
   */
  const bulkUpdateTransactionInspection = async (
    ids: string[],
    updates: {
      billStatus?: BillStatus;
      voucherReceiptStatus: VoucherReceiptStatus;
      internalAuditStatus: InternalAuditStatus;
      remarks: string;
      actionTitle?: string;
    }
  ) => {
    if (!ids || ids.length === 0) return;
    const targetSet = new Set(ids);
    const nowTimestamp = new Date().toLocaleString();
    const reviewerName = APP_CONFIG.currentReviewer.name;

    setTransactions((prev) =>
      prev.map((t) => {
        if (targetSet.has(t.id)) {
          const newBillStatus: BillStatus =
            updates.billStatus !== undefined
              ? updates.billStatus
              : t.type === 'Receipt'
              ? 'N/A'
              : updates.voucherReceiptStatus === 'Available'
              ? 'Available'
              : t.billStatus;

          const calculatedEvidence = calculateEvidenceStatus(
            t.type,
            newBillStatus,
            updates.voucherReceiptStatus
          );

          return {
            ...t,
            billStatus: newBillStatus,
            voucherReceiptStatus: updates.voucherReceiptStatus,
            evidenceStatus: calculatedEvidence,
            internalAuditStatus: updates.internalAuditStatus,
            remarks: updates.remarks || t.remarks,
            reviewer: reviewerName,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );

    const batchLog: ChangeLogEntry = {
      id: `LOG-BATCH-${Date.now()}`,
      entityType: 'Transaction',
      entityId: `${ids.length} Transactions`,
      action: updates.actionTitle || `Bulk updated ${ids.length} transactions (${updates.internalAuditStatus})`,
      previousValue: 'Multiple',
      newValue: `Audited: ${updates.internalAuditStatus}, Evidence: ${updates.voucherReceiptStatus}`,
      user: reviewerName,
      timestamp: nowTimestamp,
      reason: `${updates.remarks} (Batch size: ${ids.length})`,
    };

    setChangeLogs((logs) => [batchLog, ...logs]);

    // Batch persist to Supabase
    try {
      await Promise.allSettled(
        ids.map((txnId) =>
          (supabaseClient.from('transactions') as any)
            .update({
              bill_status: updates.billStatus || 'Available',
              voucher_receipt_status: updates.voucherReceiptStatus,
              internal_audit_status: updates.internalAuditStatus,
              remarks: updates.remarks,
              reviewer: reviewerName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', txnId)
        )
      );
    } catch (e) {
      console.error('[SupabaseClient] Error in bulk transaction sync:', e);
    }
  };

  /**
   * Update Monthly Reconciliation & persist to Supabase
   */
  const updateReconciliation = async (
    accountId: AccountId, monthId: string,
    updates: {
      adjustments?: number; remarks?: string; status?: 'Pending' | 'Matched' | 'Mismatch' | 'Mismatch Accepted';
      calculatedOpeningBalance?: number; credits?: number; debits?: number; contra?: number;
      calculatedClosingBalance?: number; sourceClosingBalance?: number | null;
      openingConfirmed?: boolean; transactionsConfirmed?: boolean; closingConfirmed?: boolean; confirmationNotes?: string;
    }
  ) => {
    const found = reconciliations[accountId]?.find(r => r.id === monthId || r.month === monthId);
    const monthNames = ['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];
    const monthIndex = monthNames.indexOf(monthId);
    const openingFromMaster = openingBalances.find(o => o.accountId === accountId)?.recordedOpeningBalance ?? 0;
    const rec: MonthlyReconciliationRecord = found || {
      id: `CALC-${accountId}-${Math.max(0, monthIndex)}`,
      month: monthId, monthIndex: Math.max(0, monthIndex), accountId,
      sourceOpeningBalance: updates.calculatedOpeningBalance ?? openingFromMaster,
      calculatedOpeningBalance: updates.calculatedOpeningBalance ?? openingFromMaster,
      openingDifference: 0, credits: updates.credits ?? 0, debits: updates.debits ?? 0,
      contra: updates.contra ?? 0, adjustments: updates.adjustments ?? 0,
      calculatedClosingBalance: updates.calculatedClosingBalance ?? openingFromMaster,
      sourceClosingBalance: null, closingDifference: 0, status: 'Pending', remarks: '',
    };
    const adjustments = updates.adjustments ?? rec.adjustments;
    const contra = updates.contra ?? rec.contra ?? 0;
    const sourceClosing = updates.sourceClosingBalance !== undefined ? updates.sourceClosingBalance : rec.sourceClosingBalance;
    const calculatedClosing = (updates.calculatedOpeningBalance ?? rec.calculatedOpeningBalance)
      + (updates.credits ?? rec.credits) - (updates.debits ?? rec.debits) + contra + adjustments;
    const difference = sourceClosing === null ? null : Number((calculatedClosing - sourceClosing).toFixed(2));
    const suggested: 'Pending' | 'Matched' | 'Mismatch' = sourceClosing === null ? 'Pending' : Math.abs(difference || 0) < 0.01 ? 'Matched' : 'Mismatch';
    const status = updates.status === 'Mismatch Accepted' ? 'Mismatch Accepted' : suggested;
    const now = new Date().toISOString(), reviewer = APP_CONFIG.currentReviewer.name;
    const existingRows = reconciliations[accountId] || [];
    const rowsToUpdate = found ? existingRows : [...existingRows, rec];
    const list = rowsToUpdate.map(r => r.id !== monthId && r.month !== monthId && r.id !== rec.id ? r : ({
      ...r, adjustments, contra, calculatedClosingBalance: calculatedClosing, sourceClosingBalance: sourceClosing,
      closingDifference: difference ?? 0, status, remarks: updates.remarks ?? r.remarks,
      openingConfirmed: updates.openingConfirmed ?? r.openingConfirmed ?? false,
      transactionsConfirmed: updates.transactionsConfirmed ?? r.transactionsConfirmed ?? false,
      closingConfirmed: updates.closingConfirmed ?? r.closingConfirmed ?? false,
      confirmationNotes: updates.confirmationNotes ?? r.confirmationNotes ?? '',
      reviewedBy: reviewer, updatedAt: now, confirmedBy: status === 'Pending' ? r.confirmedBy : reviewer,
      confirmedAt: status === 'Pending' ? r.confirmedAt : now,
    }));
    setReconciliations(prev => ({...prev, [accountId]: list}));
    setChangeLogs(logs => [{id:`LOG-${Date.now()}`, entityType:'MonthlyReconciliation', entityId:`${accountId}-${monthId}`,
      action:`Monthly reconciliation reviewed for ${rec.month} (${accountId})`, previousValue:rec.status, newValue:status,
      user:reviewer, timestamp:new Date().toLocaleString(), reason:updates.remarks || 'Monthly reconciliation verification updated'}, ...logs]);
    const dbAccountId = accountId === 'TDCC' ? 'ACC-0001' : accountId === 'BOM' ? 'ACC-0002' : 'ACC-0003';
    const payload: Record<string, unknown> = {
      financial_year:'FY 2018-19', month:rec.month.replace(/\s+/, '-'), account_id:dbAccountId,
      source_opening_balance:rec.sourceOpeningBalance, target_opening_balance:updates.calculatedOpeningBalance ?? rec.calculatedOpeningBalance,
      credits_source:updates.credits ?? rec.credits, debits_source:updates.debits ?? rec.debits, contra_source:contra,
      adjustments, target_closing_balance:calculatedClosing, source_closing_balance:sourceClosing, closing_discrepancy:difference,
      reconciliation_status:status, remarks:updates.remarks ?? rec.remarks ?? '', reviewed_by:reviewer, updated_at:now,
      opening_confirmed:updates.openingConfirmed ?? rec.openingConfirmed ?? false,
      transactions_confirmed:updates.transactionsConfirmed ?? rec.transactionsConfirmed ?? false,
      closing_confirmed:updates.closingConfirmed ?? rec.closingConfirmed ?? false,
      confirmation_notes:updates.confirmationNotes ?? rec.confirmationNotes ?? '',
      confirmed_by:status === 'Pending' ? null : reviewer, confirmed_at:status === 'Pending' ? null : now,
    };
    const {error}=await (supabaseClient.from('account_monthly_balance') as any).upsert(payload,{onConflict:'financial_year,month,account_id'});
    if(error){setReconciliationError(error.message);throw error;}
  };

  // Aggregated Audit KPIs
  const stats = useMemo(() => {
    const verifiedAccounts = openingBalances.filter((a) => a.status === 'Verified').length;
    const totalAcc = openingBalances.length;

    const totalTxn = transactions.length;
    const inspectedTxn = transactions.filter(
      (t) => t.evidenceStatus !== 'Pending' && t.internalAuditStatus !== 'Pending'
    ).length;
    const pendingTxn = totalTxn - inspectedTxn;

    const evidenceComplete = transactions.filter((t) => t.evidenceStatus === 'Complete').length;
    const evidenceDiscrepancy = transactions.filter((t) => t.evidenceStatus === 'Discrepancy').length;
    const evidenceMissing = transactions.filter((t) => t.evidenceStatus === 'Missing').length;
    const internalAuditFailed = transactions.filter((t) => t.internalAuditStatus === 'Failed').length;

    const allReconciliations = [
      ...reconciliations.TDCC,
      ...reconciliations.BOM,
      ...reconciliations.CASH,
    ];
    const reconciledMonths = allReconciliations.filter((r) => r.status === 'Reconciled').length;
    const totalAccountMonths = allReconciliations.length;

    const openHighIssues = issues.filter((i) => i.status === 'Open' && i.priority === 'High').length;

    // When the database has 0 records, readiness is strictly 0%
    let readinessPercentage = 0;
    if (totalAcc > 0 || totalTxn > 0 || totalAccountMonths > 0) {
      const issuesScore = openHighIssues === 0 ? 10 : Math.max(0, 10 - openHighIssues * 3);
      const rawScore =
        (totalAcc > 0 ? (verifiedAccounts / totalAcc) * 25 : 0) +
        (totalTxn > 0 ? (evidenceComplete / totalTxn) * 35 : 0) +
        (totalAccountMonths > 0 ? (reconciledMonths / totalAccountMonths) * 30 : 0) +
        issuesScore;
      readinessPercentage = Math.min(100, Math.round(rawScore));
    }

    return {
      openingBalancesVerified: verifiedAccounts,
      openingBalancesTotal: totalAcc,
      totalTransactions: totalTxn,
      inspectedTransactions: inspectedTxn,
      pendingTransactions: pendingTxn,
      evidenceComplete,
      evidenceDiscrepancy,
      evidenceMissing,
      internalAuditFailed,
      reconciledAccountMonths: reconciledMonths,
      totalAccountMonths,
      readinessPercentage,
    };
  }, [openingBalances, transactions, reconciliations, issues]);

  const navigateToIssue = (issue: OutstandingIssue) => {
    setCurrentScreen(issue.actionTarget.screen);
    if (issue.actionTarget.accountId) {
      setSelectedAccountId(issue.actionTarget.accountId);
    }
    if (issue.actionTarget.month) {
      setSelectedMonthFilter(issue.actionTarget.month);
    }
    if (issue.actionTarget.transactionId) {
      setSelectedTransactionId(issue.actionTarget.transactionId);
    }
  };

  const resetAllData = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'opening_balances');
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'transactions');
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'reconciliations');
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'issues');
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'changelogs');
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'audit_notes');
    } catch (e) {}

    setOpeningBalances([]);
    setTransactions([]);
    setReconciliations({
      TDCC: [],
      BOM: [],
      CASH: [],
    });
    setIssues([]);
    setChangeLogs([]);
    setAuditNotes([]);
    setSelectedAccountId('TDCC');
    setSelectedMonthFilter('All Months');
    setSelectedTransactionId(null);

    refetchAll();
  };

  // Dynamically derive monthly summaries from actual database rows (0 when tables are empty)
  const monthlySummaries = useMemo<MonthlyVerificationSummary[]>(() => {
    const months = [
      'Apr 2018', 'May 2018', 'Jun 2018', 'Jul 2018', 'Aug 2018', 'Sep 2018',
      'Oct 2018', 'Nov 2018', 'Dec 2018', 'Jan 2019', 'Feb 2019', 'Mar 2019'
    ];

    return months.map((month, idx) => {
      const monthTxns = transactions.filter((t) => t.month === month);
      const inspected = monthTxns.filter((t) => t.evidenceStatus !== 'Pending').length;
      const total = monthTxns.length;
      const percent = total > 0 ? Math.round((inspected / total) * 100) : 0;

      const cashRec = reconciliations.CASH?.find((r) => r.month === month);
      const tdccRec = reconciliations.TDCC?.find((r) => r.month === month);
      const bomRec = reconciliations.BOM?.find((r) => r.month === month);

      const recStatus = (r?: MonthlyReconciliationRecord) =>
        r?.status === 'Reconciled' ? 'reconciled' : r?.status === 'Difference' ? 'difference' : 'pending';

      const monthIssues = issues.filter((i) => i.month === month && i.status === 'Open').length;

      let overallStatus: 'Verified' | 'In Progress' | 'Issues' | 'Not Started' = 'Not Started';
      if (total === 0) {
        overallStatus = 'Not Started';
      } else if (monthIssues > 0) {
        overallStatus = 'Issues';
      } else if (percent === 100 && recStatus(cashRec) === 'reconciled' && recStatus(tdccRec) === 'reconciled' && recStatus(bomRec) === 'reconciled') {
        overallStatus = 'Verified';
      } else if (percent > 0) {
        overallStatus = 'In Progress';
      }

      return {
        month,
        monthIndex: idx,
        openingBalanceStatus: idx === 0 ? (openingBalances.length > 0 && openingBalances.every((o) => o.status === 'Verified') ? 'complete' : 'pending') : 'complete',
        transactionsTotal: total,
        transactionsInspected: inspected,
        transactionsPercent: percent,
        reconciliationCash: recStatus(cashRec),
        reconciliationTDCC: recStatus(tdccRec),
        reconciliationBOM: recStatus(bomRec),
        openIssues: monthIssues,
        overallStatus,
      };
    });
  }, [transactions, reconciliations, issues, openingBalances]);

  // Optional tool to populate empty Supabase database with baseline FY 2018-19 society records
  const [isSeedingDatabase, setIsSeedingDatabase] = useState(false);

  const seedBaselineRecordsToSupabase = async (): Promise<{ success: boolean; message: string }> => {
    setIsSeedingDatabase(true);
    try {
      // 1. Seed account_master (3 accounts)
      const accountsPayload = [
        {
          account_id: 'TDCC',
          account_name: 'Thane District Central Co-op Bank Ltd (TDCC)',
          account_type: 'Bank',
          bank_name: 'TDCC Bank Ltd',
          opening_balance: 582341.25,
          current_balance: 582341.25,
          is_active: true,
          remarks: 'Society primary operating bank account',
        },
        {
          account_id: 'BOM',
          account_name: 'Bank of Maharashtra (BOM)',
          account_type: 'Bank',
          bank_name: 'Bank of Maharashtra',
          opening_balance: 215489.50,
          current_balance: 211689.50,
          is_active: true,
          remarks: 'Society reserve fund bank account',
        },
        {
          account_id: 'CASH',
          account_name: 'Cash Register (Office Cash Box)',
          account_type: 'Cash',
          bank_name: 'Cash in Hand',
          opening_balance: 14250.00,
          current_balance: 14250.00,
          is_active: true,
          remarks: 'Petty cash and daily society expenses',
        },
      ];

      const { error: accErr } = await (supabaseClient.from('account_master') as any).upsert(
        accountsPayload,
        { onConflict: 'account_id' }
      );
      if (accErr) {
        console.warn('account_master upsert note, trying insert:', accErr.message);
        await (supabaseClient.from('account_master') as any).insert(accountsPayload);
      }

      // 2. Seed account_monthly_balance (36 account-months)
      const monthlyPayload = [
        ...INITIAL_TDCC_RECONCILIATION,
        ...INITIAL_BOM_RECONCILIATION,
        ...INITIAL_CASH_RECONCILIATION,
      ].map((r) => ({
        account_id: r.accountId,
        financial_year: 'FY 2018-19',
        month: r.month,
        month_index: r.monthIndex,
        opening_balance: r.sourceOpeningBalance,
        total_credits: r.credits,
        total_debits: r.debits,
        adjustments: r.adjustments,
        closing_balance: r.sourceClosingBalance,
        reconciliation_status: r.status,
        remarks: r.remarks,
      }));

      await (supabaseClient.from('account_monthly_balance') as any).insert(monthlyPayload);

      // 3. Seed an initial batch of 50 sample society transactions
      const sampleTxns = generateFullTransactions().slice(0, 50).map((t) => ({
        transaction_id: t.id,
        transaction_date: t.date,
        month: t.month,
        financial_year: 'FY 2018-19',
        account_id: t.accountId,
        transaction_type: t.type,
        party_name: t.party,
        description: t.description,
        amount: t.amount,
        voucher_no: t.voucherNo || null,
        receipt_no: t.receiptNo || null,
        source_file: t.sourceFile,
        source_sheet: t.sourceSheet,
        source_row: t.sourceRow,
        bill_status: t.billStatus,
        voucher_receipt_status: t.voucherReceiptStatus,
        evidence_status: t.evidenceStatus,
        internal_audit_status: t.internalAuditStatus,
        remarks: t.remarks,
      }));

      await (supabaseClient.from('transactions') as any).insert(sampleTxns);

      // Immediately refetch from Supabase
      await refetchAll();

      return {
        success: true,
        message: 'Successfully seeded 3 accounts, 36 monthly records, and 50 transactions into your Supabase database!',
      };
    } catch (err: any) {
      console.error('[SupabaseClient] Error seeding baseline data:', err);
      return { success: false, message: err.message || 'Failed to seed baseline data' };
    } finally {
      setIsSeedingDatabase(false);
    }
  };

  return (
    <VerificationContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        selectedAccountId,
        setSelectedAccountId,
        selectedMonthFilter,
        setSelectedMonthFilter,
        selectedTransactionId,
        setSelectedTransactionId,
        openingBalances,
        isLoadingOpeningBalances,
        openingBalancesError,
        fetchOpeningBalances,
        updateOpeningBalance,
        transactions,
        isLoadingTransactions,
        transactionsError,
        fetchTransactions,
        updateTransactionInspection,
        bulkUpdateTransactionInspection,
        reconciliations,
        isLoadingReconciliation,
        reconciliationError,
        fetchMonthlyReconciliation,
        updateReconciliation,
        issues,
        monthlySummaries,
        changeLogs,
        memberOpeningBalances,
        balanceRegister,
        memberFinancialBalances,
        cumulativeOutstanding,
        isLoadingMemberBalances,
        memberBalancesError,
        fetchMemberBalances,
        demandRegister,
        demandAdjustments,
        demandAllocations,
        isLoadingDemandRegister,
        demandRegisterError,
        fetchDemandRegister,
        partyMaster,
        flatOwnerMaster,
        categoryMaster,
        rulesMaster,
        sourceRegister,
        isLoadingMasters,
        mastersError,
        fetchMasters,
        supabaseSync,
        refetchAll,
        refetchFromSupabase: refetchAll,
        stats,
        navigateToIssue,
        resetAllData,
        auditNotes,
        addAuditNote,
        deleteAuditNote,
        togglePinAuditNote,
        isSeedingDatabase,
        seedBaselineRecordsToSupabase,
      }}
    >
      {children}
    </VerificationContext.Provider>
  );
};

export const useVerification = () => {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error('useVerification must be used within a VerificationProvider');
  }
  return context;
};

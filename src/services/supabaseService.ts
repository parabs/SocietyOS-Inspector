import { supabase } from './supabase';
import {
  DbAccountMaster,
  DbAccountMonthlyBalance,
  DbTransaction,
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
import {
  OpeningBalanceRecord,
  EnrichedTransaction,
  MonthlyReconciliationRecord,
  AccountId,
  BillStatus,
  VoucherReceiptStatus,
  EvidenceStatus,
  InternalAuditStatus,
  VerificationStatus,
  ReconciliationStatus,
} from '../types';

export interface DataFetchResult<T> {
  data: T | null;
  error: string | null;
  count?: number;
}

export class SupabaseDataService {
  /**
   * Health check and connectivity verification across core Supabase tables
   */
  static async checkConnection(): Promise<{ connected: boolean; message: string; details?: any }> {
    try {
      const { data, error } = await supabase.from('account_master').select('*').limit(1);
      if (error) {
        return { connected: false, message: error.message, details: error };
      }
      return { connected: true, message: 'Connected to Supabase successfully' };
    } catch (err: any) {
      return { connected: false, message: err?.message || 'Connection failed' };
    }
  }

  // ==========================================
  // 1. Account Master & Opening Balances
  // ==========================================
  static async getAccountMaster(): Promise<DataFetchResult<DbAccountMaster[]>> {
    const { data, error, count } = await supabase
      .from('account_master')
      .select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    return { data: (data as DbAccountMaster[]) || [], error: null, count: count ?? 0 };
  }

  static async getAccountMonthlyBalances(accountId?: string): Promise<DataFetchResult<DbAccountMonthlyBalance[]>> {
    let query = supabase.from('account_monthly_balance').select('*', { count: 'exact' });
    if (accountId) {
      query = query.eq('account_id', accountId);
    }
    const { data, error, count } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data as DbAccountMonthlyBalance[]) || [], error: null, count: count ?? 0 };
  }

  static async getOpeningBalances(): Promise<DataFetchResult<OpeningBalanceRecord[]>> {
    try {
      const [accRes, balRes] = await Promise.all([
        supabase.from('account_master').select('*'),
        supabase.from('account_monthly_balance').select('*'),
      ]);

      if (accRes.error) {
        return { data: null, error: `Error fetching account_master: ${accRes.error.message}` };
      }

      const accounts = (accRes.data as any[]) || [];
      const balances = (balRes.data as any[]) || [];

      // Map Supabase rows to OpeningBalanceRecord
      const records: OpeningBalanceRecord[] = accounts.map((acc) => {
        const id = (acc.account_code || acc.id || acc.account_id || '').toUpperCase() as AccountId;
        const normId: AccountId = id.includes('TDCC') ? 'TDCC' : id.includes('BOM') ? 'BOM' : 'CASH';
        
        // Find early balance record or master opening balance
        const accBal = balances.find((b) => (b.account_id || '').toUpperCase().includes(normId));
        const recordedOp = acc.opening_balance ?? accBal?.opening_balance ?? 0;
        const auditClosing = acc.current_balance ?? recordedOp;

        return {
          accountId: normId,
          accountName: acc.account_name || acc.name || normId,
          accountType: (acc.account_type || (normId === 'CASH' ? 'Cash' : 'Bank')) as 'Bank' | 'Cash',
          financialYear: accBal?.financial_year || 'FY 2018-19',
          auditClosingBalance: auditClosing,
          recordedOpeningBalance: recordedOp,
          difference: Number((recordedOp - auditClosing).toFixed(2)),
          sourceReference: accBal ? `account_monthly_balance [ID ${accBal.id || ''}]` : 'account_master',
          supportingRecords: {
            auditReport: true,
            cashBook: true,
            bankPassbook: normId !== 'CASH',
          },
          status: (recordedOp === auditClosing ? 'Verified' : 'Pending') as VerificationStatus,
          remarks: acc.remarks || 'Loaded from Supabase account_master',
          verifiedBy: acc.verified_by || 'Auditor',
          verifiedOn: acc.updated_at || new Date().toISOString().split('T')[0],
        };
      });

      return { data: records, error: null, count: records.length };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to fetch opening balances from Supabase' };
    }
  }

  // ==========================================
  // 2. Transactions Verification
  // ==========================================
  static async getTransactions(): Promise<DataFetchResult<EnrichedTransaction[]>> {
    const { data, error, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' });

    if (error) {
      return { data: null, error: `Error fetching transactions: ${error.message}` };
    }

    const rows = (data as any[]) || [];
    rows.sort((a, b) => String(a.transaction_date || a.date || '').localeCompare(String(b.transaction_date || b.date || '')));
    const transactions: EnrichedTransaction[] = rows.map((row, idx) => {
      const rawAcc = (row.account_id || row.account || 'CASH').toUpperCase();
      const accountId: AccountId = rawAcc.includes('TDCC') ? 'TDCC' : rawAcc.includes('BOM') ? 'BOM' : 'CASH';
      const txnType = (row.type || (row.amount >= 0 ? 'Receipt' : 'Payment')) as 'Receipt' | 'Payment';

      const billStatus = (row.bill_status || 'Available') as BillStatus;
      const voucherReceiptStatus = (row.voucher_receipt_status || 'Available') as VoucherReceiptStatus;
      const internalAuditStatus = (row.internal_audit_status || 'Verified') as InternalAuditStatus;
      const evidenceStatus = (row.evidence_status || 'Complete') as EvidenceStatus;

      return {
        id: row.id || row.transaction_id || `TXN-${String(idx + 1).padStart(5, '0')}`,
        sourceFile: row.source_file || 'transactions.supabase',
        sourceSheet: row.source_sheet || 'transactions',
        sourceRow: row.source_row ?? idx + 1,
        date: row.date || new Date().toISOString().split('T')[0],
        month: row.month || (row.date ? new Date(row.date).toLocaleString('default', { month: 'short', year: 'numeric' }) : 'Apr 2018'),
        accountId,
        type: txnType,
        party: row.party_name || row.party || 'Sundry Member/Vendor',
        description: row.description || row.narration || 'General society transaction',
        amount: Math.abs(Number(row.amount || 0)),
        voucherNo: row.voucher_no || row.voucher_number || undefined,
        receiptNo: row.receipt_no || row.receipt_number || undefined,
        billStatus,
        voucherReceiptStatus,
        evidenceStatus,
        internalAuditStatus,
        remarks: row.remarks || '',
        reviewer: row.reviewer || undefined,
        updatedAt: row.updated_at || row.created_at,
      };
    });

    return { data: transactions, error: null, count: count ?? transactions.length };
  }

  static async updateTransactionInspection(
    transactionId: string,
    updates: {
      billStatus: BillStatus;
      voucherReceiptStatus: VoucherReceiptStatus;
      internalAuditStatus: InternalAuditStatus;
      remarks: string;
      reviewer?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await (supabase.from('transactions') as any)
        .update({
          bill_status: updates.billStatus,
          voucher_receipt_status: updates.voucherReceiptStatus,
          internal_audit_status: updates.internalAuditStatus,
          remarks: updates.remarks,
          reviewer: updates.reviewer || 'Auditor',
          updated_at: new Date().toISOString(),
        })
        .match({ id: transactionId });

      if (error) {
        // If column does not exist or matches 0 rows, capture error cleanly
        console.warn('[Supabase] Transaction update response:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // 3. Monthly Reconciliation
  // ==========================================
  static async getMonthlyReconciliation(): Promise<DataFetchResult<Record<AccountId, MonthlyReconciliationRecord[]>>> {
    const { data, error } = await supabase
      .from('account_monthly_balance')
      .select('*');

    if (error) {
      return { data: null, error: `Error fetching account_monthly_balance: ${error.message}` };
    }

    const rows = (data as any[]) || [];
    const result: Record<AccountId, MonthlyReconciliationRecord[]> = {
      TDCC: [],
      BOM: [],
      CASH: [],
    };

    rows.forEach((row, idx) => {
      const rawAcc = (row.account_id || '').toUpperCase();
      const accountId: AccountId = rawAcc.includes('TDCC') ? 'TDCC' : rawAcc.includes('BOM') ? 'BOM' : 'CASH';

      const op = Number(row.opening_balance || 0);
      const credits = Number(row.total_credits || row.credits || 0);
      const debits = Number(row.total_debits || row.debits || 0);
      const adjustments = Number(row.adjustments || 0);
      const calcClose = op + credits - debits + adjustments;
      const srcClose = Number(row.closing_balance ?? calcClose);

      const record: MonthlyReconciliationRecord = {
        id: row.id || `REC-${accountId}-${idx}`,
        month: row.month || `Month ${idx + 1}`,
        monthIndex: row.month_index ?? idx,
        accountId,
        sourceOpeningBalance: op,
        calculatedOpeningBalance: op,
        openingDifference: 0,
        credits,
        debits,
        adjustments,
        calculatedClosingBalance: calcClose,
        sourceClosingBalance: srcClose,
        closingDifference: Number((calcClose - srcClose).toFixed(2)),
        status: (row.reconciliation_status as ReconciliationStatus) || (Math.abs(calcClose - srcClose) < 0.01 ? 'Reconciled' : 'Difference'),
        remarks: row.remarks || '',
        reviewedBy: row.reviewed_by || 'Auditor',
        updatedAt: row.updated_at,
      };

      result[accountId].push(record);
    });

    return { data: result, error: null };
  }

  // ==========================================
  // 4. Member Opening Balances & Ledgers
  // ==========================================
  static async getMemberOpeningBalances(): Promise<DataFetchResult<DbMemberOpeningBalance[]>> {
    const { data, error, count } = await supabase
      .from('member_opening_balances')
      .select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    return { data: (data as DbMemberOpeningBalance[]) || [], error: null, count: count ?? 0 };
  }

  static async getBalanceRegister(): Promise<DataFetchResult<DbBalanceRegister[]>> {
    const { data, error, count } = await supabase
      .from('balance_register')
      .select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    return { data: (data as DbBalanceRegister[]) || [], error: null, count: count ?? 0 };
  }

  static async getMemberFinancialYearBalances(): Promise<DataFetchResult<DbMemberFinancialYearBalance[]>> {
    const { data, error, count } = await supabase
      .from('v_member_financial_year_balance')
      .select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    return { data: (data as DbMemberFinancialYearBalance[]) || [], error: null, count: count ?? 0 };
  }

  static async getMemberCumulativeOutstanding(): Promise<DataFetchResult<DbMemberCumulativeOutstanding[]>> {
    const { data, error, count } = await supabase
      .from('v_member_cumulative_outstanding')
      .select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    const records = (data as DbMemberCumulativeOutstanding[]) || [];
    records.sort((a, b) => Number(b.net_outstanding || 0) - Number(a.net_outstanding || 0));
    return { data: records, error: null, count: count ?? 0 };
  }

  // ==========================================
  // 5. Demands, Adjustments & Payment Allocations
  // ==========================================
  static async getDemandRegister(): Promise<DataFetchResult<DbDemandRegister[]>> {
    const { data, error, count } = await supabase
      .from('demand_register')
      .select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    return { data: (data as DbDemandRegister[]) || [], error: null, count: count ?? 0 };
  }

  static async getDemandAdjustments(): Promise<DataFetchResult<DbDemandAdjustment[]>> {
    const { data, error, count } = await supabase
      .from('demand_adjustments')
      .select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    return { data: (data as DbDemandAdjustment[]) || [], error: null, count: count ?? 0 };
  }

  static async getDemandPaymentAllocations(): Promise<DataFetchResult<DbDemandPaymentAllocation[]>> {
    const { data, error, count } = await supabase
      .from('demand_payment_allocations')
      .select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    return { data: (data as DbDemandPaymentAllocation[]) || [], error: null, count: count ?? 0 };
  }

  // ==========================================
  // 6. Master Data
  // ==========================================
  static async getPartyMaster(): Promise<DataFetchResult<DbPartyMaster[]>> {
    const { data, error, count } = await supabase.from('party_master').select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    return { data: (data as DbPartyMaster[]) || [], error: null, count: count ?? 0 };
  }

  static async getFlatOwnerMaster(): Promise<DataFetchResult<DbFlatOwnerMaster[]>> {
    const { data, error, count } = await supabase.from('flat_owner_master').select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    return { data: (data as DbFlatOwnerMaster[]) || [], error: null, count: count ?? 0 };
  }

  static async getCategoryMaster(): Promise<DataFetchResult<DbCategoryMaster[]>> {
    const { data, error, count } = await supabase.from('category_master').select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    return { data: (data as DbCategoryMaster[]) || [], error: null, count: count ?? 0 };
  }

  static async getRulesMaster(): Promise<DataFetchResult<DbRulesMaster[]>> {
    const { data, error, count } = await supabase.from('rules_master').select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    return { data: (data as DbRulesMaster[]) || [], error: null, count: count ?? 0 };
  }

  static async getSourceRegister(): Promise<DataFetchResult<DbSourceRegister[]>> {
    const { data, error, count } = await supabase.from('source_register').select('*', { count: 'exact' });
    if (error) return { data: null, error: error.message };
    return { data: (data as DbSourceRegister[]) || [], error: null, count: count ?? 0 };
  }
}

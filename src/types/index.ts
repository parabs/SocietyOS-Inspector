/**
 * Data Models for Varsha Nivas Financial Verification & Management Platform
 * Based on Society Financial Guidelines and Specifications
 */

export type AccountId = 'TDCC' | 'BOM' | 'CASH';

export interface AccountMaster {
  id: AccountId;
  name: string;
  code: string;
  type: 'Bank' | 'Cash';
  accountNumber?: string;
  currentBalance: number;
  balanceDate: string;
  isActive: boolean;
}

export type TransactionType = 'Receipt' | 'Payment';

export type BillStatus = 'Available' | 'Discrepancy' | 'Missing' | 'N/A';
export type VoucherReceiptStatus = 'Available' | 'Discrepancy' | 'Missing';
export type EvidenceStatus = 'Complete' | 'Discrepancy' | 'Missing' | 'Pending' | 'N/A';
export type InternalAuditStatus = 'Pending' | 'Verified' | 'Failed';

export interface TransactionSourceRecord {
  id: string; // e.g., 'TXN-2018-00041'
  sourceFile: string;
  sourceSheet: string;
  sourceRow: number;
  date: string; // YYYY-MM-DD
  month: string; // 'Apr 2018', etc.
  accountId: AccountId;
  type: TransactionType;
  party: string;
  description: string;
  accountName?: string;
  categoryName?: string;
  categoryGroup?: string;
  paymentMode?: string;
  chequeNo?: string;
  reportingMonth?: string;
  amount: number;
  voucherNo?: string;
  receiptNo?: string;
  isCorrection?: boolean;
  correctionStatus?: 'Original' | 'Pending Review' | 'Approved' | 'Rejected';
}

export interface TransactionInspection {
  transactionId?: string;
  billStatus: BillStatus;
  voucherReceiptStatus: VoucherReceiptStatus;
  evidenceStatus: EvidenceStatus;
  internalAuditStatus: InternalAuditStatus;
  remarks: string;
  reviewer?: string;
  updatedAt?: string;
}

export interface EnrichedTransaction extends TransactionSourceRecord, TransactionInspection {}

export type VerificationStatus = 'Verified' | 'Pending' | 'Discrepancy';

export interface SupportingRecordsVerified {
  auditReport: boolean;
  cashBook: boolean;
  bankPassbook: boolean;
}

export interface OpeningBalanceRecord {
  accountId: AccountId;
  accountName: string;
  accountType: 'Bank' | 'Cash';
  financialYear: string;
  auditClosingBalance: number; // Reference (A) as of 31 Mar 2018
  recordedOpeningBalance: number; // Recorded (B) as of 01 Apr 2018
  difference: number; // B - A
  sourceReference: string;
  supportingRecords: SupportingRecordsVerified;
  status: VerificationStatus;
  remarks: string;
  verifiedBy?: string;
  verifiedOn?: string;
}

export type ReconciliationStatus = 'Reconciled' | 'Difference' | 'Pending';

export interface MonthlyReconciliationRecord {
  id: string;
  month: string; // 'Apr 2018'
  monthIndex: number; // 0 to 11
  accountId: AccountId;
  sourceOpeningBalance: number; // (A)
  calculatedOpeningBalance: number; // (B)
  openingDifference: number; // (B - A)
  credits: number; // Receipts
  debits: number; // Payments
  adjustments: number; // default 0
  calculatedClosingBalance: number; // (C) = B + Credits - Debits + Adjustments
  sourceClosingBalance: number; // (D)
  closingDifference: number; // (C - D)
  status: ReconciliationStatus;
  remarks: string;
  reviewedBy?: string;
  updatedAt?: string;
}

export interface ChangeLogEntry {
  id: string;
  entityType: 'OpeningBalance' | 'Transaction' | 'MonthlyReconciliation';
  entityId: string;
  action: string;
  previousValue?: string;
  newValue?: string;
  user: string;
  timestamp: string;
  reason?: string;
}

export interface OutstandingIssue {
  id: string;
  issue: string;
  source: 'Opening Balance' | 'Transaction' | 'Reconciliation';
  account: AccountId;
  month: string;
  amount: number;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Investigating' | 'Resolved';
  actionTarget: {
    screen: 'opening-balances' | 'transaction-verification' | 'monthly-reconciliation';
    accountId?: AccountId;
    transactionId?: string;
    month?: string;
  };
}

export interface MonthlyVerificationSummary {
  month: string;
  monthIndex: number;
  openingBalanceStatus: 'complete' | 'pending' | 'issues';
  transactionsTotal: number;
  transactionsInspected: number;
  transactionsPercent: number;
  reconciliationCash: 'reconciled' | 'difference' | 'pending' | 'not-started';
  reconciliationTDCC: 'reconciled' | 'difference' | 'pending' | 'not-started';
  reconciliationBOM: 'reconciled' | 'difference' | 'pending' | 'not-started';
  openIssues: number;
  overallStatus: 'Verified' | 'In Progress' | 'Issues' | 'Not Started';
}

export type AuditModuleKey = 'opening-balances' | 'transaction-verification' | 'monthly-reconciliation';

export interface AuditNote {
  id: string;
  moduleId: AuditModuleKey;
  moduleTitle: string;
  title: string;
  content: string;
  author: string;
  role?: string;
  timestamp: string;
  priority: 'High' | 'Medium' | 'Low';
  tag?: string;
  isPinned?: boolean;
}

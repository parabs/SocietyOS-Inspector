/**
 * Anomaly Detection Engine for Varsha Nivas CHS Ltd. Audit Platform
 * Implements rule-based forensic scanning for duplicate entries,
 * suspicious round-number transactions, cash ceiling breaches, and documentation risks.
 * 
 * Rules align with Maharashtra Co-operative Societies (MCS) Act 1960,
 * Model Bye-Laws (Bye-Law 152), and standard cooperative society accounting principles.
 */

import { EnrichedTransaction } from '../types';

export type AnomalySeverity = 'High' | 'Medium' | 'Low';
export type AnomalyCategory = 
  | 'Duplicate'
  | 'Round Number'
  | 'Cash Ceiling Breach'
  | 'Documentation Risk'
  | 'Unusual Pattern';

export interface AnomalyItem {
  id: string;
  ruleId: string;
  severity: AnomalySeverity;
  category: AnomalyCategory;
  title: string;
  description: string;
  transactionId: string;
  transaction: EnrichedTransaction;
  secondaryTransactionId?: string;
  secondaryTransaction?: EnrichedTransaction;
  amount: number;
  date: string;
  party: string;
  accountId: string;
  recommendedAction: string;
  statutoryReference?: string;
}

export interface AnomalyScanResult {
  timestamp: string;
  totalTransactionsScanned: number;
  totalAnomaliesCount: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
  totalExposureAmount: number;
  anomalies: AnomalyItem[];
  anomaliesByTxnId: Record<string, AnomalyItem[]>;
}

/**
 * Checks if an amount is a suspicious round number in cooperative accounting.
 * Typically round multiples of 1,000, 5,000, 10,000, 25,000, 50,000, etc.
 * that lack odd paise or specific billing denominations.
 */
function isSuspiciousRoundNumber(amount: number): boolean {
  if (amount < 2000) return false;
  // Multiple of 5000, 10000, 25000, 50000, 100000
  if (amount % 5000 === 0) return true;
  if (amount % 1000 === 0 && amount >= 5000) return true;
  return false;
}

/**
 * Calculates day difference between two YYYY-MM-DD date strings
 */
function dayDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1).getTime();
  const d2 = new Date(dateStr2).getTime();
  if (isNaN(d1) || isNaN(d2)) return 999;
  return Math.abs(Math.round((d1 - d2) / (1000 * 60 * 60 * 24)));
}

/**
 * Normalizes party name for fuzzy duplicate comparison
 */
function normalizeParty(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Run comprehensive anomaly detection across transactions
 */
export function scanTransactionsForAnomalies(
  transactions: EnrichedTransaction[]
): AnomalyScanResult {
  const anomalies: AnomalyItem[] = [];
  const anomaliesByTxnId: Record<string, AnomalyItem[]> = {};

  const addAnomaly = (item: AnomalyItem) => {
    anomalies.push(item);
    if (!anomaliesByTxnId[item.transactionId]) {
      anomaliesByTxnId[item.transactionId] = [];
    }
    anomaliesByTxnId[item.transactionId].push(item);
  };

  // 1. DUPLICATE SCANNING
  // Group by voucher number
  const voucherMap = new Map<string, EnrichedTransaction[]>();
  // Group by receipt number
  const receiptMap = new Map<string, EnrichedTransaction[]>();
  // Group by date + amount + party
  const exactMatchMap = new Map<string, EnrichedTransaction[]>();

  transactions.forEach((txn) => {
    // Voucher duplicate check
    if (txn.voucherNo && txn.voucherNo !== '-' && txn.voucherNo.trim() !== '') {
      const vKey = txn.voucherNo.trim().toUpperCase();
      const existing = voucherMap.get(vKey) || [];
      existing.push(txn);
      voucherMap.set(vKey, existing);
    }

    // Receipt duplicate check
    if (txn.receiptNo && txn.receiptNo !== '-' && txn.receiptNo.trim() !== '') {
      const rKey = txn.receiptNo.trim().toUpperCase();
      const existing = receiptMap.get(rKey) || [];
      existing.push(txn);
      receiptMap.set(rKey, existing);
    }

    // Exact match key
    const matchKey = `${txn.date}_${txn.amount}_${txn.accountId}_${normalizeParty(txn.party)}_${txn.type}`;
    const existingMatches = exactMatchMap.get(matchKey) || [];
    existingMatches.push(txn);
    exactMatchMap.set(matchKey, existingMatches);
  });

  // Flag duplicate vouchers
  voucherMap.forEach((txns, vNo) => {
    if (txns.length > 1) {
      for (let i = 0; i < txns.length; i++) {
        const primary = txns[i];
        const secondary = txns[(i + 1) % txns.length];
        addAnomaly({
          id: `ANOM-VOUCHER-${primary.id}-${vNo}`,
          ruleId: 'DUPLICATE_VOUCHER_NO',
          severity: 'High',
          category: 'Duplicate',
          title: `Duplicate Voucher No. #${vNo}`,
          description: `Voucher #${vNo} is assigned to multiple transactions (${primary.id} and ${secondary.id}). Under MCS accounting rules, voucher numbers must be strictly sequential and unique.`,
          transactionId: primary.id,
          transaction: primary,
          secondaryTransactionId: secondary.id,
          secondaryTransaction: secondary,
          amount: primary.amount,
          date: primary.date,
          party: primary.party,
          accountId: primary.accountId,
          recommendedAction: `Inspect physical voucher book to verify if ${primary.id} or ${secondary.id} has an erroneous voucher entry.`,
          statutoryReference: 'MCS Act Rule 65 - Maintenance of Accounts & Vouchers',
        });
      }
    }
  });

  // Flag duplicate receipts
  receiptMap.forEach((txns, rNo) => {
    if (txns.length > 1) {
      for (let i = 0; i < txns.length; i++) {
        const primary = txns[i];
        const secondary = txns[(i + 1) % txns.length];
        addAnomaly({
          id: `ANOM-RECEIPT-${primary.id}-${rNo}`,
          ruleId: 'DUPLICATE_RECEIPT_NO',
          severity: 'High',
          category: 'Duplicate',
          title: `Duplicate Receipt No. #${rNo}`,
          description: `Receipt #${rNo} is recorded on multiple transactions (${primary.id} and ${secondary.id}). Each society member receipt must correspond to a distinct counterfoil.`,
          transactionId: primary.id,
          transaction: primary,
          secondaryTransactionId: secondary.id,
          secondaryTransaction: secondary,
          amount: primary.amount,
          date: primary.date,
          party: primary.party,
          accountId: primary.accountId,
          recommendedAction: 'Verify member receipt counterfoil book and resolve receipt numbering collision.',
          statutoryReference: 'MCS Bye-Law 152(b) - Member Maintenance Receipts',
        });
      }
    }
  });

  // Flag exact duplicate entries
  exactMatchMap.forEach((txns) => {
    if (txns.length > 1) {
      for (let i = 0; i < txns.length; i++) {
        const primary = txns[i];
        const secondary = txns[(i + 1) % txns.length];
        addAnomaly({
          id: `ANOM-EXACT-${primary.id}`,
          ruleId: 'EXACT_DUPLICATE_RECORD',
          severity: 'High',
          category: 'Duplicate',
          title: 'Potential Double Entry / Duplicate Transaction',
          description: `Identical transaction detected: Same date (${primary.date}), account (${primary.accountId}), party (${primary.party}), and amount (₹${primary.amount.toLocaleString('en-IN')}) with ${secondary.id}.`,
          transactionId: primary.id,
          transaction: primary,
          secondaryTransactionId: secondary.id,
          secondaryTransaction: secondary,
          amount: primary.amount,
          date: primary.date,
          party: primary.party,
          accountId: primary.accountId,
          recommendedAction: 'Cross-check bank statement / cash book to confirm whether this payment/receipt cleared twice or was posted twice in error.',
          statutoryReference: 'MCS Bye-Law 152 - Double Entry Prevention',
        });
      }
    }
  });

  // 2. SAME-PARTY RAPID REPEATS (Within 3 days with identical or near amount)
  for (let i = 0; i < transactions.length; i++) {
    const t1 = transactions[i];
    if (t1.type !== 'Payment') continue;

    for (let j = i + 1; j < transactions.length; j++) {
      const t2 = transactions[j];
      if (t2.type !== 'Payment') continue;
      if (t1.accountId !== t2.accountId) continue;

      const norm1 = normalizeParty(t1.party);
      const norm2 = normalizeParty(t2.party);
      if (norm1.length > 3 && (norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1))) {
        const diff = dayDifference(t1.date, t2.date);
        if (diff <= 3 && Math.abs(t1.amount - t2.amount) === 0) {
          // Check if not already caught in exact match
          if (t1.date !== t2.date) {
            addAnomaly({
              id: `ANOM-RAPID-${t1.id}-${t2.id}`,
              ruleId: 'RAPID_REPEAT_PAYMENT',
              severity: 'Medium',
              category: 'Duplicate',
              title: 'Rapid Consecutive Payment to Same Payee',
              description: `Two identical payments of ₹${t1.amount.toLocaleString('en-IN')} issued to "${t1.party}" within ${diff} day(s) (${t1.date} and ${t2.date}). Potential split voucher or duplicate disbursement.`,
              transactionId: t1.id,
              transaction: t1,
              secondaryTransactionId: t2.id,
              secondaryTransaction: t2,
              amount: t1.amount,
              date: t1.date,
              party: t1.party,
              accountId: t1.accountId,
              recommendedAction: 'Verify vendor work orders and bills to ensure both distinct jobs were executed and authorized.',
              statutoryReference: 'MCS Bye-Law 145 - Disbursement Sanctions',
            });
          }
        }
      }
    }
  }

  // 3. SUSPICIOUS ROUND-NUMBER SCAN & CASH CEILING CHECKS
  transactions.forEach((txn) => {
    // Rule: Cash Ceiling Breach (MCS statutory ceiling is ₹5,000 per cash voucher)
    if (txn.accountId === 'CASH' && txn.type === 'Payment' && txn.amount > 5000) {
      addAnomaly({
        id: `ANOM-CASH-CEIL-${txn.id}`,
        ruleId: 'CASH_CEILING_BREACH',
        severity: 'High',
        category: 'Cash Ceiling Breach',
        title: `Statutory Cash Ceiling Exceeded (₹${txn.amount.toLocaleString('en-IN')} > ₹5,000)`,
        description: `Cash disbursement of ₹${txn.amount.toLocaleString('en-IN')} exceeds the statutory cash payment ceiling of ₹5,000 under Maharashtra Co-operative Societies Rules. Statutory guideline mandates account-payee cheque / banking channel.`,
        transactionId: txn.id,
        transaction: txn,
        amount: txn.amount,
        date: txn.date,
        party: txn.party,
        accountId: txn.accountId,
        recommendedAction: 'Require special Managing Committee sanction resolution and verify recipient identification / revenue stamp.',
        statutoryReference: 'MCS Bye-Law 143 & IT Act Sec 40A(3) - Cash Ceiling Restriction',
      });
    }

    // Rule: Suspicious Round-Number Payments
    if (txn.type === 'Payment' && isSuspiciousRoundNumber(txn.amount)) {
      const isLargeRound = txn.amount >= 20000;
      const isMissingDoc = txn.billStatus === 'Missing' || txn.voucherReceiptStatus === 'Missing';
      
      addAnomaly({
        id: `ANOM-ROUND-${txn.id}`,
        ruleId: 'SUSPICIOUS_ROUND_NUMBER',
        severity: isLargeRound || isMissingDoc ? 'High' : 'Medium',
        category: 'Round Number',
        title: `Suspicious Round-Sum Payment (₹${txn.amount.toLocaleString('en-IN')})`,
        description: `Payment of exactly ₹${txn.amount.toLocaleString('en-IN')} appears to be an unitemized round estimate or advance rather than a precise contractor tax bill breakdown.`,
        transactionId: txn.id,
        transaction: txn,
        amount: txn.amount,
        date: txn.date,
        party: txn.party,
        accountId: txn.accountId,
        recommendedAction: 'Inspect detailed measurement sheets, labor rolls, or tax invoices to verify actual expense incurred against round figure.',
        statutoryReference: 'Standard Audit Guidance - Round Estimate Scrutiny',
      });
    }

    // Rule: High-Value Payment Missing Documentation (> ₹10,000)
    if (
      txn.type === 'Payment' &&
      txn.amount >= 10000 &&
      (txn.billStatus === 'Missing' || txn.voucherReceiptStatus === 'Missing' || txn.evidenceStatus === 'Missing')
    ) {
      addAnomaly({
        id: `ANOM-HIGHVAL-MISSING-${txn.id}`,
        ruleId: 'HIGH_VALUE_UNVERIFIED',
        severity: 'High',
        category: 'Documentation Risk',
        title: `High-Value Payment Missing Physical Bill (₹${txn.amount.toLocaleString('en-IN')})`,
        description: `Major society expenditure of ₹${txn.amount.toLocaleString('en-IN')} to "${txn.party}" has missing original vendor tax invoice or physical payment voucher.`,
        transactionId: txn.id,
        transaction: txn,
        amount: txn.amount,
        date: txn.date,
        party: txn.party,
        accountId: txn.accountId,
        recommendedAction: 'Escalate to Managing Committee to procure duplicate bill from vendor or hold audit certification.',
        statutoryReference: 'MCS Act Sec 81 - Vouching & Physical Verification',
      });
    }

    // Rule: Failed Internal Audit Flagged as Risk
    if (txn.internalAuditStatus === 'Failed' && txn.evidenceStatus !== 'Discrepancy') {
      addAnomaly({
        id: `ANOM-AUDIT-FAILED-${txn.id}`,
        ruleId: 'INTERNAL_AUDIT_FAILED',
        severity: 'Medium',
        category: 'Unusual Pattern',
        title: `Audit Query Pending Resolution (${txn.id})`,
        description: `Transaction was marked 'Failed' in internal audit with remarks: "${txn.remarks || 'No remarks provided'}". Requires auditor attention prior to society sign-off.`,
        transactionId: txn.id,
        transaction: txn,
        amount: txn.amount,
        date: txn.date,
        party: txn.party,
        accountId: txn.accountId,
        recommendedAction: 'Review auditor remarks and obtain society explanation before finalizing session.',
        statutoryReference: 'MCS Bye-Law 152(g) - Discrepancy Rectification',
      });
    }
  });

  // Calculate totals
  const highSeverityCount = anomalies.filter((a) => a.severity === 'High').length;
  const mediumSeverityCount = anomalies.filter((a) => a.severity === 'Medium').length;
  const lowSeverityCount = anomalies.filter((a) => a.severity === 'Low').length;

  // Total exposure (unique transactions involved in anomalies)
  const uniqueTxnIds = new Set(anomalies.map((a) => a.transactionId));
  const totalExposureAmount = transactions
    .filter((t) => uniqueTxnIds.has(t.id))
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    timestamp: new Date().toISOString(),
    totalTransactionsScanned: transactions.length,
    totalAnomaliesCount: anomalies.length,
    highSeverityCount,
    mediumSeverityCount,
    lowSeverityCount,
    totalExposureAmount,
    anomalies,
    anomaliesByTxnId,
  };
}

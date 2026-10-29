/**
 * Typed Definitions for Supabase Database Schema
 * Matching the Varsha Nivas Society OS Supabase Database objects
 */

export interface DbAccountMaster {
  id?: string;
  account_id?: string;
  account_code?: string;
  account_name?: string;
  account_type?: 'Bank' | 'Cash' | string;
  bank_name?: string;
  account_number?: string;
  opening_balance?: number;
  current_balance?: number;
  balance_date?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DbAccountMonthlyBalance {
  id?: string;
  account_id?: string;
  financial_year?: string;
  month?: string;
  month_index?: number;
  opening_balance?: number;
  total_credits?: number;
  total_debits?: number;
  adjustments?: number;
  closing_balance?: number;
  reconciliation_status?: string;
  remarks?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbTransaction {
  id: string;
  transaction_id?: string;
  date?: string;
  month?: string;
  financial_year?: string;
  account_id?: string;
  type?: 'Receipt' | 'Payment' | string;
  party_name?: string;
  party_id?: string;
  category_id?: string;
  category_name?: string;
  description?: string;
  amount?: number;
  voucher_no?: string;
  receipt_no?: string;
  source_file?: string;
  source_sheet?: string;
  source_row?: number;
  bill_status?: string;
  voucher_receipt_status?: string;
  evidence_status?: string;
  internal_audit_status?: string;
  remarks?: string;
  reviewer?: string;
  verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbMemberOpeningBalance {
  id?: string;
  flat_no?: string;
  member_id?: string;
  member_name?: string;
  financial_year?: string;
  opening_balance?: number;
  interest_due?: number;
  principal_due?: number;
  verified_status?: string;
  remarks?: string;
  created_at?: string;
}

export interface DbBalanceRegister {
  id?: string;
  financial_year?: string;
  flat_no?: string;
  member_id?: string;
  opening_balance?: number;
  total_demands?: number;
  total_collections?: number;
  total_adjustments?: number;
  closing_balance?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbMemberFinancialYearBalance {
  flat_no: string;
  member_name?: string;
  financial_year: string;
  opening_balance?: number;
  billed_amount?: number;
  received_amount?: number;
  adjusted_amount?: number;
  closing_balance?: number;
}

export interface DbMemberCumulativeOutstanding {
  flat_no: string;
  member_name?: string;
  contact_number?: string;
  total_billed?: number;
  total_received?: number;
  total_adjustments?: number;
  net_outstanding?: number;
  last_payment_date?: string;
  status?: string;
}

export interface DbDemandRegister {
  id?: string;
  bill_no?: string;
  flat_no?: string;
  member_id?: string;
  bill_date?: string;
  due_date?: string;
  month?: string;
  financial_year?: string;
  maintenance_charge?: number;
  sinking_fund?: number;
  repair_fund?: number;
  interest_charge?: number;
  other_charges?: number;
  total_demand?: number;
  payment_status?: string;
  created_at?: string;
}

export interface DbDemandAdjustment {
  id?: string;
  adjustment_id?: string;
  flat_no?: string;
  member_id?: string;
  demand_id?: string;
  adjustment_type?: string;
  amount?: number;
  reason?: string;
  approved_by?: string;
  is_approved?: boolean;
  approval_date?: string;
  created_at?: string;
}

export interface DbDemandPaymentAllocation {
  id?: string;
  payment_id?: string;
  transaction_id?: string;
  demand_id?: string;
  allocated_amount?: number;
  allocation_date?: string;
  created_at?: string;
}

export interface DbPartyMaster {
  id?: string;
  party_id?: string;
  party_name?: string;
  party_type?: 'Member' | 'Vendor' | 'Bank' | 'Authority' | string;
  flat_no?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  pan_number?: string;
  gstin?: string;
  is_active?: boolean;
}

export interface DbFlatOwnerMaster {
  id?: string;
  flat_no?: string;
  owner_name?: string;
  co_owner_name?: string;
  wing?: string;
  carpet_area?: number;
  email?: string;
  phone?: string;
  is_resident?: boolean;
  possession_date?: string;
}

export interface DbCategoryMaster {
  id?: string;
  category_code?: string;
  category_name?: string;
  /** Optional reporting group when supplied by the connected category master. */
  category_group?: string;
  type?: 'Income' | 'Expense' | 'Asset' | 'Liability' | string;
  description?: string;
}

export interface DbRulesMaster {
  id?: string;
  rule_code?: string;
  rule_title?: string;
  category?: string;
  rule_formula?: string;
  description?: string;
  is_active?: boolean;
}

export interface DbSourceRegister {
  id?: string;
  source_file?: string;
  sheet_name?: string;
  financial_year?: string;
  row_count?: number;
  imported_at?: string;
  status?: string;
}

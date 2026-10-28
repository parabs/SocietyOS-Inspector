import { createClient } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      account_master: {
        Row: {
          id: string;
          account_id?: string | null;
          account_code?: string | null;
          account_name?: string | null;
          account_type?: string | null;
          bank_name?: string | null;
          account_number?: string | null;
          opening_balance?: number | null;
          current_balance?: number | null;
          balance_date?: string | null;
          is_active?: boolean | null;
          verified_by?: string | null;
          verified_at?: string | null;
          remarks?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: string;
          account_id?: string | null;
          account_code?: string | null;
          account_name?: string | null;
          account_type?: string | null;
          bank_name?: string | null;
          account_number?: string | null;
          opening_balance?: number | null;
          current_balance?: number | null;
          balance_date?: string | null;
          is_active?: boolean | null;
          verified_by?: string | null;
          verified_at?: string | null;
          remarks?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          account_id?: string | null;
          account_code?: string | null;
          account_name?: string | null;
          account_type?: string | null;
          bank_name?: string | null;
          account_number?: string | null;
          opening_balance?: number | null;
          current_balance?: number | null;
          balance_date?: string | null;
          is_active?: boolean | null;
          verified_by?: string | null;
          verified_at?: string | null;
          remarks?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      account_monthly_balance: {
        Row: {
          id: string;
          account_id: string;
          financial_year?: string | null;
          month?: string | null;
          month_index?: number | null;
          opening_balance?: number | null;
          total_credits?: number | null;
          total_debits?: number | null;
          adjustments?: number | null;
          closing_balance?: number | null;
          reconciliation_status?: string | null;
          remarks?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: string;
          account_id: string;
          financial_year?: string | null;
          month?: string | null;
          month_index?: number | null;
          opening_balance?: number | null;
          total_credits?: number | null;
          total_debits?: number | null;
          adjustments?: number | null;
          closing_balance?: number | null;
          reconciliation_status?: string | null;
          remarks?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          account_id?: string;
          financial_year?: string | null;
          month?: string | null;
          month_index?: number | null;
          opening_balance?: number | null;
          total_credits?: number | null;
          total_debits?: number | null;
          adjustments?: number | null;
          closing_balance?: number | null;
          reconciliation_status?: string | null;
          remarks?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          transaction_id?: string | null;
          date?: string | null;
          month?: string | null;
          financial_year?: string | null;
          account_id?: string | null;
          type?: string | null;
          party_name?: string | null;
          party_id?: string | null;
          category_id?: string | null;
          category_name?: string | null;
          description?: string | null;
          amount?: number | null;
          voucher_no?: string | null;
          receipt_no?: string | null;
          source_file?: string | null;
          source_sheet?: string | null;
          source_row?: number | null;
          bill_status?: string | null;
          voucher_receipt_status?: string | null;
          evidence_status?: string | null;
          internal_audit_status?: string | null;
          remarks?: string | null;
          reviewer?: string | null;
          verified_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: string;
          transaction_id?: string | null;
          date?: string | null;
          month?: string | null;
          financial_year?: string | null;
          account_id?: string | null;
          type?: string | null;
          party_name?: string | null;
          party_id?: string | null;
          category_id?: string | null;
          category_name?: string | null;
          description?: string | null;
          amount?: number | null;
          voucher_no?: string | null;
          receipt_no?: string | null;
          source_file?: string | null;
          source_sheet?: string | null;
          source_row?: number | null;
          bill_status?: string | null;
          voucher_receipt_status?: string | null;
          evidence_status?: string | null;
          internal_audit_status?: string | null;
          remarks?: string | null;
          reviewer?: string | null;
          verified_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          transaction_id?: string | null;
          date?: string | null;
          month?: string | null;
          financial_year?: string | null;
          account_id?: string | null;
          type?: string | null;
          party_name?: string | null;
          party_id?: string | null;
          category_id?: string | null;
          category_name?: string | null;
          description?: string | null;
          amount?: number | null;
          voucher_no?: string | null;
          receipt_no?: string | null;
          source_file?: string | null;
          source_sheet?: string | null;
          source_row?: number | null;
          bill_status?: string | null;
          voucher_receipt_status?: string | null;
          evidence_status?: string | null;
          internal_audit_status?: string | null;
          remarks?: string | null;
          reviewer?: string | null;
          verified_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      member_opening_balances: {
        Row: {
          id: string;
          flat_no?: string | null;
          member_id?: string | null;
          member_name?: string | null;
          financial_year?: string | null;
          opening_balance?: number | null;
          principal_due?: number | null;
          interest_due?: number | null;
          verified_status?: string | null;
          remarks?: string | null;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          flat_no?: string | null;
          member_id?: string | null;
          member_name?: string | null;
          financial_year?: string | null;
          opening_balance?: number | null;
          principal_due?: number | null;
          interest_due?: number | null;
          verified_status?: string | null;
          remarks?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          flat_no?: string | null;
          member_id?: string | null;
          member_name?: string | null;
          financial_year?: string | null;
          opening_balance?: number | null;
          principal_due?: number | null;
          interest_due?: number | null;
          verified_status?: string | null;
          remarks?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      balance_register: {
        Row: {
          id: string;
          financial_year?: string | null;
          flat_no?: string | null;
          member_id?: string | null;
          opening_balance?: number | null;
          total_demands?: number | null;
          total_collections?: number | null;
          total_adjustments?: number | null;
          closing_balance?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: string;
          financial_year?: string | null;
          flat_no?: string | null;
          member_id?: string | null;
          opening_balance?: number | null;
          total_demands?: number | null;
          total_collections?: number | null;
          total_adjustments?: number | null;
          closing_balance?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          financial_year?: string | null;
          flat_no?: string | null;
          member_id?: string | null;
          opening_balance?: number | null;
          total_demands?: number | null;
          total_collections?: number | null;
          total_adjustments?: number | null;
          closing_balance?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      demand_register: {
        Row: {
          id: string;
          bill_no?: string | null;
          flat_no?: string | null;
          member_id?: string | null;
          bill_date?: string | null;
          due_date?: string | null;
          month?: string | null;
          financial_year?: string | null;
          maintenance_charge?: number | null;
          sinking_fund?: number | null;
          repair_fund?: number | null;
          interest_charge?: number | null;
          other_charges?: number | null;
          total_demand?: number | null;
          payment_status?: string | null;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          bill_no?: string | null;
          flat_no?: string | null;
          member_id?: string | null;
          bill_date?: string | null;
          due_date?: string | null;
          month?: string | null;
          financial_year?: string | null;
          maintenance_charge?: number | null;
          sinking_fund?: number | null;
          repair_fund?: number | null;
          interest_charge?: number | null;
          other_charges?: number | null;
          total_demand?: number | null;
          payment_status?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          bill_no?: string | null;
          flat_no?: string | null;
          member_id?: string | null;
          bill_date?: string | null;
          due_date?: string | null;
          month?: string | null;
          financial_year?: string | null;
          maintenance_charge?: number | null;
          sinking_fund?: number | null;
          repair_fund?: number | null;
          interest_charge?: number | null;
          other_charges?: number | null;
          total_demand?: number | null;
          payment_status?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      demand_adjustments: {
        Row: {
          id: string;
          adjustment_id?: string | null;
          flat_no?: string | null;
          member_id?: string | null;
          demand_id?: string | null;
          adjustment_type?: string | null;
          amount?: number | null;
          reason?: string | null;
          approved_by?: string | null;
          is_approved?: boolean | null;
          approval_date?: string | null;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          adjustment_id?: string | null;
          flat_no?: string | null;
          member_id?: string | null;
          demand_id?: string | null;
          adjustment_type?: string | null;
          amount?: number | null;
          reason?: string | null;
          approved_by?: string | null;
          is_approved?: boolean | null;
          approval_date?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          adjustment_id?: string | null;
          flat_no?: string | null;
          member_id?: string | null;
          demand_id?: string | null;
          adjustment_type?: string | null;
          amount?: number | null;
          reason?: string | null;
          approved_by?: string | null;
          is_approved?: boolean | null;
          approval_date?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      demand_payment_allocations: {
        Row: {
          id: string;
          payment_id?: string | null;
          transaction_id?: string | null;
          demand_id?: string | null;
          allocated_amount?: number | null;
          allocation_date?: string | null;
          created_at?: string | null;
        };
        Insert: {
          id?: string;
          payment_id?: string | null;
          transaction_id?: string | null;
          demand_id?: string | null;
          allocated_amount?: number | null;
          allocation_date?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          payment_id?: string | null;
          transaction_id?: string | null;
          demand_id?: string | null;
          allocated_amount?: number | null;
          allocation_date?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      party_master: {
        Row: {
          id: string;
          party_id?: string | null;
          party_name?: string | null;
          party_type?: string | null;
          flat_no?: string | null;
          contact_person?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          pan_number?: string | null;
          gstin?: string | null;
          is_active?: boolean | null;
        };
        Insert: {
          id?: string;
          party_id?: string | null;
          party_name?: string | null;
          party_type?: string | null;
          flat_no?: string | null;
          contact_person?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          pan_number?: string | null;
          gstin?: string | null;
          is_active?: boolean | null;
        };
        Update: {
          id?: string;
          party_id?: string | null;
          party_name?: string | null;
          party_type?: string | null;
          flat_no?: string | null;
          contact_person?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          pan_number?: string | null;
          gstin?: string | null;
          is_active?: boolean | null;
        };
        Relationships: [];
      };
      flat_owner_master: {
        Row: {
          id: string;
          flat_no?: string | null;
          owner_name?: string | null;
          co_owner_name?: string | null;
          wing?: string | null;
          carpet_area?: number | null;
          email?: string | null;
          phone?: string | null;
          is_resident?: boolean | null;
          possession_date?: string | null;
        };
        Insert: {
          id?: string;
          flat_no?: string | null;
          owner_name?: string | null;
          co_owner_name?: string | null;
          wing?: string | null;
          carpet_area?: number | null;
          email?: string | null;
          phone?: string | null;
          is_resident?: boolean | null;
          possession_date?: string | null;
        };
        Update: {
          id?: string;
          flat_no?: string | null;
          owner_name?: string | null;
          co_owner_name?: string | null;
          wing?: string | null;
          carpet_area?: number | null;
          email?: string | null;
          phone?: string | null;
          is_resident?: boolean | null;
          possession_date?: string | null;
        };
        Relationships: [];
      };
      category_master: {
        Row: {
          id: string;
          category_code?: string | null;
          category_name?: string | null;
          type?: string | null;
          description?: string | null;
        };
        Insert: {
          id?: string;
          category_code?: string | null;
          category_name?: string | null;
          type?: string | null;
          description?: string | null;
        };
        Update: {
          id?: string;
          category_code?: string | null;
          category_name?: string | null;
          type?: string | null;
          description?: string | null;
        };
        Relationships: [];
      };
      rules_master: {
        Row: {
          id: string;
          rule_code?: string | null;
          rule_title?: string | null;
          category?: string | null;
          rule_formula?: string | null;
          description?: string | null;
          is_active?: boolean | null;
        };
        Insert: {
          id?: string;
          rule_code?: string | null;
          rule_title?: string | null;
          category?: string | null;
          rule_formula?: string | null;
          description?: string | null;
          is_active?: boolean | null;
        };
        Update: {
          id?: string;
          rule_code?: string | null;
          rule_title?: string | null;
          category?: string | null;
          rule_formula?: string | null;
          description?: string | null;
          is_active?: boolean | null;
        };
        Relationships: [];
      };
      source_register: {
        Row: {
          id: string;
          source_file?: string | null;
          sheet_name?: string | null;
          financial_year?: string | null;
          row_count?: number | null;
          imported_at?: string | null;
          status?: string | null;
        };
        Insert: {
          id?: string;
          source_file?: string | null;
          sheet_name?: string | null;
          financial_year?: string | null;
          row_count?: number | null;
          imported_at?: string | null;
          status?: string | null;
        };
        Update: {
          id?: string;
          source_file?: string | null;
          sheet_name?: string | null;
          financial_year?: string | null;
          row_count?: number | null;
          imported_at?: string | null;
          status?: string | null;
        };
        Relationships: [];
      };
      options: {
        Row: {
          id: string | number;
          option_name?: string | null;
          option_value?: Json | string | null;
          autoload?: boolean | string | null;
          created_at?: string | null;
          updated_at?: string | null;
          [key: string]: any;
        };
        Insert: {
          id?: string | number;
          option_name?: string | null;
          option_value?: Json | string | null;
          autoload?: boolean | string | null;
          created_at?: string | null;
          updated_at?: string | null;
          [key: string]: any;
        };
        Update: {
          id?: string | number;
          option_name?: string | null;
          option_value?: Json | string | null;
          autoload?: boolean | string | null;
          created_at?: string | null;
          updated_at?: string | null;
          [key: string]: any;
        };
        Relationships: [];
      };
      OPTIONS: {
        Row: {
          id: string | number;
          option_name?: string | null;
          option_value?: Json | string | null;
          autoload?: boolean | string | null;
          created_at?: string | null;
          updated_at?: string | null;
          [key: string]: any;
        };
        Insert: {
          id?: string | number;
          option_name?: string | null;
          option_value?: Json | string | null;
          autoload?: boolean | string | null;
          created_at?: string | null;
          updated_at?: string | null;
          [key: string]: any;
        };
        Update: {
          id?: string | number;
          option_name?: string | null;
          option_value?: Json | string | null;
          autoload?: boolean | string | null;
          created_at?: string | null;
          updated_at?: string | null;
          [key: string]: any;
        };
        Relationships: [];
      };
    };
    Views: {
      v_member_financial_year_balance: {
        Row: {
          flat_no: string;
          member_name?: string | null;
          financial_year: string;
          opening_balance?: number | null;
          billed_amount?: number | null;
          received_amount?: number | null;
          adjusted_amount?: number | null;
          closing_balance?: number | null;
        };
      };
      v_member_cumulative_outstanding: {
        Row: {
          flat_no: string;
          member_name?: string | null;
          contact_number?: string | null;
          total_billed?: number | null;
          total_received?: number | null;
          total_adjustments?: number | null;
          net_outstanding?: number | null;
          last_payment_date?: string | null;
          status?: string | null;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hklibokniuwurdxndxfd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_m6ab_-TqTPpqdwvbLeRP_A_RVbLVlSr';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[SupabaseClient] Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not configured.');
}

/**
 * Reusable Supabase client with comprehensive database schema typing
 */
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const supabase = supabaseClient;
export default supabaseClient;

// ==========================================
// Basic TypeScript Interfaces for Database Tables & Views
// ==========================================
export type AccountMaster = Database['public']['Tables']['account_master']['Row'];
export type AccountMasterInsert = Database['public']['Tables']['account_master']['Insert'];
export type AccountMasterUpdate = Database['public']['Tables']['account_master']['Update'];

export type AccountMonthlyBalance = Database['public']['Tables']['account_monthly_balance']['Row'];
export type AccountMonthlyBalanceInsert = Database['public']['Tables']['account_monthly_balance']['Insert'];
export type AccountMonthlyBalanceUpdate = Database['public']['Tables']['account_monthly_balance']['Update'];

export type TransactionRecord = Database['public']['Tables']['transactions']['Row'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

export type MemberOpeningBalance = Database['public']['Tables']['member_opening_balances']['Row'];
export type MemberOpeningBalanceInsert = Database['public']['Tables']['member_opening_balances']['Insert'];
export type MemberOpeningBalanceUpdate = Database['public']['Tables']['member_opening_balances']['Update'];

export type BalanceRegister = Database['public']['Tables']['balance_register']['Row'];
export type BalanceRegisterInsert = Database['public']['Tables']['balance_register']['Insert'];
export type BalanceRegisterUpdate = Database['public']['Tables']['balance_register']['Update'];

export type DemandRegister = Database['public']['Tables']['demand_register']['Row'];
export type DemandRegisterInsert = Database['public']['Tables']['demand_register']['Insert'];
export type DemandRegisterUpdate = Database['public']['Tables']['demand_register']['Update'];

export type DemandAdjustment = Database['public']['Tables']['demand_adjustments']['Row'];
export type DemandAdjustmentInsert = Database['public']['Tables']['demand_adjustments']['Insert'];
export type DemandAdjustmentUpdate = Database['public']['Tables']['demand_adjustments']['Update'];

export type DemandPaymentAllocation = Database['public']['Tables']['demand_payment_allocations']['Row'];
export type DemandPaymentAllocationInsert = Database['public']['Tables']['demand_payment_allocations']['Insert'];
export type DemandPaymentAllocationUpdate = Database['public']['Tables']['demand_payment_allocations']['Update'];

export type PartyMaster = Database['public']['Tables']['party_master']['Row'];
export type PartyMasterInsert = Database['public']['Tables']['party_master']['Insert'];
export type PartyMasterUpdate = Database['public']['Tables']['party_master']['Update'];

export type FlatOwnerMaster = Database['public']['Tables']['flat_owner_master']['Row'];
export type FlatOwnerMasterInsert = Database['public']['Tables']['flat_owner_master']['Insert'];
export type FlatOwnerMasterUpdate = Database['public']['Tables']['flat_owner_master']['Update'];

export type CategoryMaster = Database['public']['Tables']['category_master']['Row'];
export type CategoryMasterInsert = Database['public']['Tables']['category_master']['Insert'];
export type CategoryMasterUpdate = Database['public']['Tables']['category_master']['Update'];

export type RulesMaster = Database['public']['Tables']['rules_master']['Row'];
export type RulesMasterInsert = Database['public']['Tables']['rules_master']['Insert'];
export type RulesMasterUpdate = Database['public']['Tables']['rules_master']['Update'];

export type SourceRegister = Database['public']['Tables']['source_register']['Row'];
export type SourceRegisterInsert = Database['public']['Tables']['source_register']['Insert'];
export type SourceRegisterUpdate = Database['public']['Tables']['source_register']['Update'];

export type MemberFinancialYearBalance = Database['public']['Views']['v_member_financial_year_balance']['Row'];
export type MemberCumulativeOutstanding = Database['public']['Views']['v_member_cumulative_outstanding']['Row'];

export type OptionRecord = Database['public']['Tables']['options']['Row'];
export type OptionInsert = Database['public']['Tables']['options']['Insert'];
export type OptionUpdate = Database['public']['Tables']['options']['Update'];


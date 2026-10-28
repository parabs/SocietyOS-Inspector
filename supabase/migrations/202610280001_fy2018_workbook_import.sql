-- Society OS FY 2018-19 workbook import support.
-- Additive migration: retains the existing application columns and records.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS reporting_month text,
  ADD COLUMN IF NOT EXISTS transaction_type text,
  ADD COLUMN IF NOT EXISTS voucher_receipt_no text,
  ADD COLUMN IF NOT EXISTS cheque_no text,
  ADD COLUMN IF NOT EXISTS payment_mode text,
  ADD COLUMN IF NOT EXISTS category_group text,
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS voucher_available text,
  ADD COLUMN IF NOT EXISTS bills_available text,
  ADD COLUMN IF NOT EXISTS bank_verified text NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS verified text,
  ADD COLUMN IF NOT EXISTS audit_notes text;

COMMENT ON COLUMN public.transactions.cheque_no IS 'Cheque number or bank reference imported from the approved source workbook; text preserves leading zeroes.';
COMMENT ON COLUMN public.transactions.bank_verified IS 'Bank statement reconciliation status: Pending, Verified, Not Verified, or Not Applicable. This is separate from evidence verification.';

ALTER TABLE public.account_master
  ADD COLUMN IF NOT EXISTS opening_balance_date date,
  ADD COLUMN IF NOT EXISTS account_number_masked text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.party_master
  ADD COLUMN IF NOT EXISTS mobile text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS flat_owner_id text;

ALTER TABLE public.flat_owner_master
  ADD COLUMN IF NOT EXISTS flat_owner_id text,
  ADD COLUMN IF NOT EXISTS asset_type text,
  ADD COLUMN IF NOT EXISTS flat_number_source_value text,
  ADD COLUMN IF NOT EXISTS owner_type text,
  ADD COLUMN IF NOT EXISTS ownership_start_date date,
  ADD COLUMN IF NOT EXISTS ownership_end_date date,
  ADD COLUMN IF NOT EXISTS occupancy_status text,
  ADD COLUMN IF NOT EXISTS verification_status text,
  ADD COLUMN IF NOT EXISTS documentation_status text,
  ADD COLUMN IF NOT EXISTS share_certificate_status text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.category_master
  ADD COLUMN IF NOT EXISTS category_id text,
  ADD COLUMN IF NOT EXISTS category_group text,
  ADD COLUMN IF NOT EXISTS transaction_type text,
  ADD COLUMN IF NOT EXISTS active text,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.rules_master
  ADD COLUMN IF NOT EXISTS rule_id text,
  ADD COLUMN IF NOT EXISTS rule_name text,
  ADD COLUMN IF NOT EXISTS rule_type text,
  ADD COLUMN IF NOT EXISTS applicable_to text,
  ADD COLUMN IF NOT EXISTS asset_type text,
  ADD COLUMN IF NOT EXISTS regular_charge numeric,
  ADD COLUMN IF NOT EXISTS penalised_charge numeric,
  ADD COLUMN IF NOT EXISTS charge_frequency text,
  ADD COLUMN IF NOT EXISTS accounting_treatment text,
  ADD COLUMN IF NOT EXISTS party_rule text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS category_id text,
  ADD COLUMN IF NOT EXISTS demand_creation_rule text,
  ADD COLUMN IF NOT EXISTS demand_period_rule text,
  ADD COLUMN IF NOT EXISTS payment_matching_rule text,
  ADD COLUMN IF NOT EXISTS review_required text,
  ADD COLUMN IF NOT EXISTS rule_area text,
  ADD COLUMN IF NOT EXISTS implementation text,
  ADD COLUMN IF NOT EXISTS review_exception text,
  ADD COLUMN IF NOT EXISTS source_sheet text;

ALTER TABLE public.source_register
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS reporting_month text,
  ADD COLUMN IF NOT EXISTS original_file_name text,
  ADD COLUMN IF NOT EXISTS source_file_link text,
  ADD COLUMN IF NOT EXISTS source_status text,
  ADD COLUMN IF NOT EXISTS audit_inspection_status text,
  ADD COLUMN IF NOT EXISTS source_quality_notes text,
  ADD COLUMN IF NOT EXISTS pending_activities text;

ALTER TABLE public.balance_register
  ADD COLUMN IF NOT EXISTS balance_register_id text,
  ADD COLUMN IF NOT EXISTS party_id text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS party_type text,
  ADD COLUMN IF NOT EXISTS credit numeric,
  ADD COLUMN IF NOT EXISTS debit numeric,
  ADD COLUMN IF NOT EXISTS penalty numeric,
  ADD COLUMN IF NOT EXISTS cheque_bounce numeric,
  ADD COLUMN IF NOT EXISTS other numeric,
  ADD COLUMN IF NOT EXISTS balance numeric,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.demand_register
  ADD COLUMN IF NOT EXISTS demand_id text,
  ADD COLUMN IF NOT EXISTS demand_month text,
  ADD COLUMN IF NOT EXISTS demand_date date,
  ADD COLUMN IF NOT EXISTS party_id text,
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS rule_id text,
  ADD COLUMN IF NOT EXISTS category_id text,
  ADD COLUMN IF NOT EXISTS demand_amount numeric,
  ADD COLUMN IF NOT EXISTS adjustment_amount numeric,
  ADD COLUMN IF NOT EXISTS net_demand numeric,
  ADD COLUMN IF NOT EXISTS paid_amount numeric,
  ADD COLUMN IF NOT EXISTS outstanding_amount numeric,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE TABLE IF NOT EXISTS public.society_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file text NOT NULL,
  financial_year text NOT NULL,
  status text NOT NULL DEFAULT 'Started',
  row_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_summary text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by text
);

COMMENT ON TABLE public.society_import_batches IS 'Audit log for explicit Society OS workbook imports. Does not store the workbook itself.';

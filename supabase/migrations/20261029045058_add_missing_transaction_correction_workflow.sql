-- Controlled missing-transaction correction workflow for FY 2018-19 audit verification.
-- Original imported transactions remain unchanged. New entries are clearly marked and require review.
CREATE SEQUENCE IF NOT EXISTS public.society_correction_transaction_seq;

CREATE TABLE IF NOT EXISTS public.transaction_correction_register (
  correction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL UNIQUE REFERENCES public.transactions(transaction_id),
  correction_type text NOT NULL DEFAULT 'Missing Transaction'
    CHECK (correction_type IN ('Missing Transaction', 'Import Omission')),
  reason text NOT NULL,
  supporting_reference text,
  status text NOT NULL DEFAULT 'Pending Review'
    CHECK (status IN ('Pending Review', 'Approved', 'Rejected')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  reviewer_remarks text,
  CONSTRAINT transaction_correction_reason_not_blank CHECK (length(trim(reason)) > 0)
);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_correction boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS correction_status text NOT NULL DEFAULT 'Original'
    CHECK (correction_status IN ('Original', 'Pending Review', 'Approved', 'Rejected'));

ALTER TABLE public.transaction_correction_register ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS society_os_admin_all ON public.transaction_correction_register;
CREATE POLICY society_os_admin_all ON public.transaction_correction_register
  FOR ALL TO authenticated
  USING (public.is_society_admin())
  WITH CHECK (public.is_society_admin());

GRANT SELECT, INSERT, UPDATE ON public.transaction_correction_register TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.society_correction_transaction_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.add_missing_transaction(
  p_transaction_date date,
  p_transaction_type text,
  p_amount numeric,
  p_account_id text,
  p_party_id text,
  p_category_id text,
  p_description text,
  p_voucher_receipt_no text,
  p_payment_mode text,
  p_reason text,
  p_supporting_reference text,
  p_reporting_month text DEFAULT NULL
)
RETURNS TABLE(transaction_id text, correction_id uuid, correction_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_transaction_id text;
  v_correction_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_society_admin() THEN
    RAISE EXCEPTION 'Only an authenticated Society OS administrator can add correction transactions.';
  END IF;

  IF p_transaction_date IS NULL OR p_transaction_date < DATE '2018-04-01'
     OR p_transaction_date > DATE '2019-03-31' THEN
    RAISE EXCEPTION 'Transaction date must fall within FY 2018-19 (01 Apr 2018 to 31 Mar 2019).';
  END IF;
  IF lower(trim(coalesce(p_transaction_type, ''))) NOT IN ('receipt', 'payment') THEN
    RAISE EXCEPTION 'Transaction type must be Receipt or Payment.';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero. Enter the absolute amount; transaction type determines the accounting direction.';
  END IF;
  IF nullif(trim(coalesce(p_account_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Select an account.';
  END IF;
  IF nullif(trim(coalesce(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A correction reason is required.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.account_master a WHERE a.account_id = p_account_id) THEN
    RAISE EXCEPTION 'Selected account was not found in Account Master.';
  END IF;
  IF p_party_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.party_master p WHERE p.party_id = p_party_id) THEN
    RAISE EXCEPTION 'Selected party was not found in Party Master.';
  END IF;
  IF p_category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.category_master c WHERE c.category_id = p_category_id) THEN
    RAISE EXCEPTION 'Selected category was not found in Category Master.';
  END IF;

  v_transaction_id := 'FY1819-CORR-' || lpad(nextval('public.society_correction_transaction_seq')::text, 5, '0');

  INSERT INTO public.transactions (
    transaction_id, reporting_month, transaction_date, transaction_type,
    voucher_receipt_no, party_id, category_id, description, amount, payment_mode,
    account_id, notes, voucher_available, bills_available, verified, audit_notes,
    source_id, source_sheet, source_row, bank_verified, is_correction, correction_status
  ) VALUES (
    v_transaction_id,
    coalesce(nullif(trim(p_reporting_month), ''), to_char(p_transaction_date, 'Mon YYYY')),
    p_transaction_date::timestamp,
    initcap(lower(trim(p_transaction_type))),
    nullif(trim(coalesce(p_voucher_receipt_no, '')), ''),
    nullif(trim(coalesce(p_party_id, '')), ''),
    nullif(trim(coalesce(p_category_id, '')), ''),
    trim(p_description),
    CASE WHEN lower(trim(p_transaction_type)) = 'payment' THEN -abs(p_amount) ELSE abs(p_amount) END,
    nullif(trim(coalesce(p_payment_mode, '')), ''),
    p_account_id,
    'Added as a missing transaction for audit rectification; original imported records were not changed.',
    'Pending', 'Pending', 'Pending',
    trim(p_reason) || CASE WHEN nullif(trim(coalesce(p_supporting_reference, '')), '') IS NOT NULL
      THEN ' | Evidence: ' || trim(p_supporting_reference) ELSE '' END,
    NULL, 'CORRECTION_REGISTER', NULL, 'Pending', true, 'Pending Review'
  );

  INSERT INTO public.transaction_correction_register (
    transaction_id, correction_type, reason, supporting_reference, status, created_by
  ) VALUES (
    v_transaction_id, 'Missing Transaction', trim(p_reason),
    nullif(trim(coalesce(p_supporting_reference, '')), ''), 'Pending Review', auth.uid()
  ) RETURNING transaction_correction_register.correction_id INTO v_correction_id;

  RETURN QUERY SELECT v_transaction_id, v_correction_id, 'Pending Review'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_missing_transaction(date, text, numeric, text, text, text, text, text, text, text, text, text) TO authenticated;

COMMENT ON TABLE public.transaction_correction_register IS
  'Audit trail for missing/import-omission transactions. Original imported transactions are preserved; correction entries require review.';

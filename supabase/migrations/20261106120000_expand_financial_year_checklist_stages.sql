-- Expand the legacy financial year checklist stage constraint for the guided AGM workflow.
-- Preserve all legacy workflow values while allowing the new guided annual stages.
ALTER TABLE public.financial_year_checklist
  DROP CONSTRAINT IF EXISTS financial_year_checklist_stage_check;

ALTER TABLE public.financial_year_checklist
  ADD CONSTRAINT financial_year_checklist_stage_check
  CHECK (
    stage = ANY (ARRAY[
      'FY Review',
      'Account Closure',
      'Internal Audit',
      'Statutory Audit',
      'Final Approval',
      'Pre-Audit Readiness',
      'Plan & Appoint',
      'Verify Accounts',
      'Compile Evidence',
      'Handover to Auditor',
      'Finalise Accounts & AGM'
    ]::text[])
  );

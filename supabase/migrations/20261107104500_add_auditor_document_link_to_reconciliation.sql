alter table public.financial_year_audit_reconciliations
  add column if not exists auditor_document_id uuid references public.financial_year_audit_documents(document_id) on delete restrict;

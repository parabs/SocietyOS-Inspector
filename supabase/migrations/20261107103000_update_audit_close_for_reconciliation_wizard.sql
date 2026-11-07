-- The reconciliation wizard stores line-level matches and documented variances.
-- A resolved variance is not forced to zero; the resolution trail is the control.
create or replace function public.guard_simple_financial_year_audit_close()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  total_lines integer;
  pending_lines integer;
begin
  if old.status = 'Closed' then
    raise exception 'This financial year is closed. Use a separately approved restatement process.';
  end if;
  if new.status = 'Closed' then
    if new.audit_status <> 'Completed' or new.audit_completion_date is null or nullif(trim(new.auditor_name),'') is null then
      raise exception 'Record statutory audit completion and auditor details before closing the financial year.';
    end if;
    if not exists (select 1 from public.financial_year_audit_documents d where d.financial_year=new.financial_year and d.document_type='Statutory Audit Report')
       or not exists (select 1 from public.financial_year_audit_documents d where d.financial_year=new.financial_year and d.document_type='Audited Financial Statements')
       or not exists (select 1 from public.financial_year_audit_documents d where d.financial_year=new.financial_year and d.document_type='AGM Report') then
      raise exception 'Upload the statutory audit report, audited financial statements and AGM report before closure.';
    end if;
    select count(*), count(*) filter (where resolution_status = 'Pending')
      into total_lines, pending_lines
      from public.financial_year_audit_reconciliations
      where financial_year = new.financial_year;
    if total_lines = 0 or pending_lines > 0 then
      raise exception 'Complete all account-wise audit reconciliation lines before closing the financial year.';
    end if;
    if not new.balances_confirmed or new.confirmed_at is null then
      raise exception 'Save the completed audit reconciliation before closing the financial year.';
    end if;
    if new.closing_snapshot is null or new.closed_at is null then
      raise exception 'A closing snapshot and closure timestamp are required.';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;
revoke all on function public.guard_simple_financial_year_audit_close() from public, anon, authenticated;

-- Keep the closure guard as an invoker-only trigger function, not an exposed RPC.
create or replace function public.guard_simple_financial_year_audit_close()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
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
    if not new.balances_confirmed or new.confirmed_at is null then
      raise exception 'Confirm audited balances before closing the financial year.';
    end if;
    if jsonb_array_length(new.balance_comparison) <> 4 or exists (
      select 1 from jsonb_array_elements(new.balance_comparison) item
      where item->>'difference' is null or abs((item->>'difference')::numeric) > 0.01
    ) then
      raise exception 'Every balance comparison must contain a verified zero difference before closure.';
    end if;
    if new.closing_snapshot is null or new.closed_at is null then
      raise exception 'A closing snapshot and closure timestamp are required.';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;

revoke all on function public.guard_simple_financial_year_audit_close() from public, anon, authenticated;

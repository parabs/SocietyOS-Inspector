-- Prevent adding or replacing audit evidence after the financial year has been frozen.
create or replace function public.guard_financial_year_audit_document_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (
    select 1 from public.financial_year_audit_closures c
    where c.financial_year = new.financial_year and c.status = 'Closed'
  ) then
    raise exception 'This financial year is closed. Use the approved restatement process to add later evidence.';
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_financial_year_audit_document_insert on public.financial_year_audit_documents;
create trigger trg_guard_financial_year_audit_document_insert
before insert on public.financial_year_audit_documents
for each row execute function public.guard_financial_year_audit_document_insert();

revoke all on function public.guard_financial_year_audit_document_insert() from public, anon, authenticated;

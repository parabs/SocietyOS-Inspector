-- Allow named statutory-audit evidence schedules and immutable re-upload versions.
alter table public.financial_year_audit_documents
  add column if not exists document_name text,
  add column if not exists version_no integer not null default 1,
  add column if not exists supersedes_document_id uuid references public.financial_year_audit_documents(document_id) on delete restrict,
  add column if not exists verification_status text not null default 'Needs Review',
  add column if not exists verification_summary text,
  add column if not exists observation_count integer not null default 0;

-- Existing three fixed labels remain valid, but audit evidence may be any named schedule.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.financial_year_audit_documents'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%document_type%'
  loop
    execute format('alter table public.financial_year_audit_documents drop constraint %I', c.conname);
  end loop;
end $$;

update public.financial_year_audit_documents
set document_name = coalesce(nullif(document_name,''), document_type),
    verification_status = coalesce(verification_status, 'Needs Review')
where document_name is null or document_name = '';

alter table public.financial_year_audit_documents
  alter column document_name set not null;

create index if not exists idx_fy_audit_documents_fy_name_version
  on public.financial_year_audit_documents(financial_year, document_name, version_no desc);

-- Closure now requires one or more named evidence documents, not three hard-coded file types.
create or replace function public.guard_simple_financial_year_audit_close()
returns trigger language plpgsql security invoker set search_path=public as $$
declare total_lines integer; pending_lines integer;
begin
  if old.status = 'Closed' then
    raise exception 'This financial year is closed. Use a separately approved restatement process.';
  end if;
  if new.status = 'Closed' then
    if new.audit_status <> 'Completed' or new.audit_completion_date is null or nullif(trim(new.auditor_name),'') is null then
      raise exception 'Record statutory audit completion and auditor details before closing the financial year.';
    end if;
    if not exists (select 1 from public.financial_year_audit_documents d where d.financial_year=new.financial_year) then
      raise exception 'Upload at least one named statutory audit evidence document before closure.';
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

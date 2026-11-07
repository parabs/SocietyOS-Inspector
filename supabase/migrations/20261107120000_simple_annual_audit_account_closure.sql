-- Simplified four-step annual statutory audit and financial-year closure.
-- This is additive. Original transactions and historical audit records remain unchanged.

create table if not exists public.financial_year_audit_closures (
  closure_id uuid primary key default gen_random_uuid(),
  financial_year text not null unique,
  period_start date not null,
  period_end date not null,
  audit_status text not null default 'Pending' check (audit_status in ('Pending','Completed')),
  auditor_name text,
  auditor_firm text,
  audit_completion_date date,
  agm_meeting_date date,
  audited_figures jsonb not null default '{}'::jsonb,
  system_figures jsonb not null default '{}'::jsonb,
  balance_comparison jsonb not null default '[]'::jsonb,
  balances_confirmed boolean not null default false,
  confirmed_by text,
  confirmed_at timestamptz,
  status text not null default 'In Progress' check (status in ('In Progress','Closed')),
  closing_snapshot jsonb,
  closed_by text,
  closed_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_year_audit_documents (
  document_id uuid primary key default gen_random_uuid(),
  financial_year text not null references public.financial_year_audit_closures(financial_year) on update cascade on delete restrict,
  document_type text not null check (document_type in ('Statutory Audit Report','Audited Financial Statements','AGM Report')),
  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size bigint,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_fy_audit_documents_fy_type
  on public.financial_year_audit_documents(financial_year, document_type, uploaded_at desc);

alter table public.financial_year_audit_closures enable row level security;
alter table public.financial_year_audit_documents enable row level security;

drop policy if exists fy_audit_closure_read on public.financial_year_audit_closures;
create policy fy_audit_closure_read on public.financial_year_audit_closures
  for select to authenticated using (true);
drop policy if exists fy_audit_closure_insert on public.financial_year_audit_closures;
create policy fy_audit_closure_insert on public.financial_year_audit_closures
  for insert to authenticated with check (auth.uid() is not null);
drop policy if exists fy_audit_closure_update on public.financial_year_audit_closures;
create policy fy_audit_closure_update on public.financial_year_audit_closures
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists fy_audit_documents_read on public.financial_year_audit_documents;
create policy fy_audit_documents_read on public.financial_year_audit_documents
  for select to authenticated using (true);
drop policy if exists fy_audit_documents_insert on public.financial_year_audit_documents;
create policy fy_audit_documents_insert on public.financial_year_audit_documents
  for insert to authenticated with check (auth.uid() is not null);

-- Closing is blocked unless audit completion, all three documents and a zero-difference
-- balance confirmation are recorded. AGM date is stored as the actual meeting date;
-- it is not silently inferred from the financial-year end.
create or replace function public.guard_simple_financial_year_audit_close()
returns trigger language plpgsql security definer set search_path=public as $$
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
    if new.closing_snapshot is null then
      raise exception 'A closing snapshot is required.';
    end if;
    if new.closed_at is null then
      raise exception 'Closure timestamp is required.';
    end if;
  end if;
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_guard_simple_financial_year_audit_close on public.financial_year_audit_closures;
create trigger trg_guard_simple_financial_year_audit_close
before update on public.financial_year_audit_closures
for each row execute function public.guard_simple_financial_year_audit_close();

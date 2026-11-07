-- Durable line-by-line reconciliation between Society OS schedules and signed auditor documents.
create table if not exists public.financial_year_audit_reconciliations (
  reconciliation_id uuid primary key default gen_random_uuid(),
  financial_year text not null references public.financial_year_audit_closures(financial_year) on update cascade on delete restrict,
  reconciliation_key text not null,
  schedule_name text not null,
  line_item text not null,
  system_report_name text not null,
  system_amount numeric(16,2) not null,
  audited_amount numeric(16,2),
  variance numeric(16,2) generated always as (case when audited_amount is null then null else system_amount - audited_amount end) stored,
  auditor_document_id uuid references public.financial_year_audit_documents(document_id) on delete restrict,
  audited_page_reference text,
  resolution_status text not null default 'Pending' check (resolution_status in ('Pending','Matched','Resolved')),
  resolution_type text check (resolution_type in ('Source Correction','Auditor Adjustment','Accepted Explanation')),
  resolution_reference text,
  resolution_note text,
  resolved_by text,
  resolved_at timestamptz,
  system_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(financial_year, reconciliation_key),
  check (
    (resolution_status = 'Pending' and resolution_type is null and resolved_at is null)
    or (resolution_status = 'Matched' and audited_amount is not null and abs(system_amount-audited_amount) <= 0.01)
    or (resolution_status = 'Resolved' and audited_amount is not null and resolution_type is not null and nullif(trim(resolution_note),'') is not null and resolved_at is not null)
  )
);

alter table public.financial_year_audit_reconciliations enable row level security;
grant select, insert, update on public.financial_year_audit_reconciliations to authenticated;
drop policy if exists fy_audit_reconciliation_read on public.financial_year_audit_reconciliations;
create policy fy_audit_reconciliation_read on public.financial_year_audit_reconciliations
  for select to authenticated using (true);
drop policy if exists fy_audit_reconciliation_insert on public.financial_year_audit_reconciliations;
create policy fy_audit_reconciliation_insert on public.financial_year_audit_reconciliations
  for insert to authenticated with check (auth.uid() is not null);
drop policy if exists fy_audit_reconciliation_update on public.financial_year_audit_reconciliations;
create policy fy_audit_reconciliation_update on public.financial_year_audit_reconciliations
  for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

create or replace function public.guard_financial_year_audit_reconciliation_write()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if exists (
    select 1 from public.financial_year_audit_closures c
    where c.financial_year = coalesce(new.financial_year, old.financial_year) and c.status = 'Closed'
  ) then
    raise exception 'This financial year is closed. Use the approved restatement process.';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists trg_guard_financial_year_audit_reconciliation_write on public.financial_year_audit_reconciliations;
create trigger trg_guard_financial_year_audit_reconciliation_write
before insert or update on public.financial_year_audit_reconciliations
for each row execute function public.guard_financial_year_audit_reconciliation_write();
revoke all on function public.guard_financial_year_audit_reconciliation_write() from public, anon, authenticated;

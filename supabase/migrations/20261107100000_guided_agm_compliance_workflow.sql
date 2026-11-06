-- Guided AGM and annual compliance workflow.
-- Additive only: preserves existing checklist rows, obligations, instances and audit records.

alter table public.financial_year_checklist
  add column if not exists task_code text,
  add column if not exists sequence_no integer,
  add column if not exists guidance text,
  add column if not exists completion_criteria text,
  add column if not exists owner_role text,
  add column if not exists approver_role text,
  add column if not exists dependency_codes text[] not null default '{}',
  add column if not exists approval_status text not null default 'Not Required',
  add column if not exists submitted_by uuid,
  add column if not exists submitted_at timestamptz,
  add column if not exists approval_notes text;

create unique index if not exists financial_year_checklist_task_code_uidx
  on public.financial_year_checklist(financial_year, task_code)
  where task_code is not null;

create table if not exists public.governance_task_approvals (
  approval_id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.financial_year_checklist(checklist_id) on delete restrict,
  financial_year text not null,
  decision text not null check (decision in ('Approved','Rejected','Returned for Changes')),
  approver_role text not null check (approver_role in ('Treasurer','Secretary','Chairman','Managing Committee')),
  approver_name text not null,
  approver_user_id uuid default auth.uid(),
  comments text,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists governance_task_approvals_checklist_idx
  on public.governance_task_approvals(checklist_id, decided_at desc);

alter table public.governance_task_approvals enable row level security;

drop policy if exists "Authenticated users can read governance task approvals" on public.governance_task_approvals;
create policy "Authenticated users can read governance task approvals"
  on public.governance_task_approvals for select to authenticated using (true);

drop policy if exists "Authenticated users can insert governance task approvals" on public.governance_task_approvals;
create policy "Authenticated users can insert governance task approvals"
  on public.governance_task_approvals for insert to authenticated with check (auth.uid() = approver_user_id);

-- This table records the approval event and authenticated actor. Role authorization
-- must be tightened when the society's user-to-role assignments are provisioned.

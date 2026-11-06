-- Financial Year Review, Account Closure and Audit Workflow
-- Additive only: does not modify posted transactions, demands, masters or existing balances.
create extension if not exists pgcrypto;

create table if not exists public.financial_year_reviews (
  review_id uuid primary key default gen_random_uuid(),
  financial_year text not null unique,
  status text not null default 'In Progress' check (status in ('In Progress','Review Ready','Closure In Progress','Internal Audit','Statutory Audit','Awaiting Approval','Frozen','Restated')),
  period_start date not null,
  period_end date not null,
  prepared_by text,
  review_notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_year_checklist (
  checklist_id uuid primary key default gen_random_uuid(),
  financial_year text not null,
  stage text not null check (stage in ('FY Review','Account Closure','Internal Audit','Statutory Audit','Final Approval')),
  work_area text not null,
  task text not null,
  status text not null default 'Pending' check (status in ('Pending','In Progress','Completed','Not Applicable','Exception Disclosed')),
  owner_name text,
  due_date date,
  evidence_reference text,
  remarks text,
  completed_by text,
  completed_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(financial_year, stage, work_area, task)
);

create table if not exists public.audit_observations (
  observation_id uuid primary key default gen_random_uuid(),
  observation_no text not null,
  financial_year text not null,
  audit_stage text not null check (audit_stage in ('FY Review','Internal Audit','Statutory Audit')),
  audit_area text not null,
  reference_type text,
  reference_id text,
  title text not null,
  finding text not null,
  risk_level text not null default 'Medium' check (risk_level in ('Critical','High','Medium','Low')),
  recommendation text,
  management_response text,
  corrective_action text,
  target_date date,
  status text not null default 'Open' check (status in ('Open','Management Responded','Action In Progress','Pending Verification','Closed','Accepted Risk','Carried Forward')),
  auditor_conclusion text,
  closure_evidence_reference text,
  raised_by text,
  closed_by text,
  closed_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(financial_year, observation_no)
);

create table if not exists public.audit_observation_updates (
  update_id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.audit_observations(observation_id) on delete restrict,
  update_type text not null check (update_type in ('Management Response','Corrective Action','Auditor Review','Evidence Added','Status Change')),
  update_text text not null,
  evidence_reference text,
  actor_name text,
  actor_role text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_queries (
  query_id uuid primary key default gen_random_uuid(),
  query_no text not null,
  financial_year text not null,
  handover_id uuid,
  raised_by text,
  raised_on date not null default current_date,
  reference_area text,
  reference_id text,
  query_text text not null,
  priority text not null default 'Normal' check (priority in ('Critical','High','Normal','Low')),
  management_response text,
  response_evidence_reference text,
  auditor_conclusion text,
  status text not null default 'Open' check (status in ('Open','Response Submitted','Further Information Required','Accepted','Closed')),
  responded_by text,
  responded_at timestamptz,
  closed_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(financial_year, query_no)
);

create table if not exists public.audit_adjustment_proposals (
  proposal_id uuid primary key default gen_random_uuid(),
  proposal_no text not null,
  financial_year text not null,
  proposed_by text,
  proposed_by_role text,
  proposal_date date not null default current_date,
  adjustment_type text not null check (adjustment_type in ('Reclassification','Accrual','Provision','Depreciation','Prior Period','Demand Correction','Receipt Allocation','Other')),
  account_debit text,
  account_credit text,
  amount numeric(14,2) not null check (amount > 0),
  narration text not null,
  supporting_reference text,
  management_decision text not null default 'Pending' check (management_decision in ('Pending','Accepted','Rejected','Modified')),
  approval_reference text,
  posted_journal_reference text,
  posted_at timestamptz,
  auditor_verified boolean not null default false,
  auditor_remarks text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(financial_year, proposal_no)
);

create table if not exists public.audit_handover_packages (
  handover_id uuid primary key default gen_random_uuid(),
  financial_year text not null,
  package_version integer not null default 1,
  status text not null default 'Draft' check (status in ('Draft','Internal Audit Signed','Ready for External Auditor','Issued','Auditor Acknowledged','Superseded')),
  prepared_by text,
  internal_auditor_name text,
  internal_auditor_signed_at timestamptz,
  internal_audit_opinion text,
  internal_audit_remarks text,
  handover_manifest jsonb not null default '{}'::jsonb,
  exception_disclosure jsonb not null default '[]'::jsonb,
  issued_to text,
  issued_at timestamptz,
  acknowledged_by text,
  acknowledged_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique(financial_year, package_version)
);

create table if not exists public.audit_handover_documents (
  document_id uuid primary key default gen_random_uuid(),
  handover_id uuid not null references public.audit_handover_packages(handover_id) on delete restrict,
  section_code text not null,
  document_name text not null,
  source_module text,
  source_reference text,
  document_status text not null default 'Pending' check (document_status in ('Pending','Generated','Attached','Not Applicable','Exception Disclosed')),
  file_path text,
  checksum text,
  generated_at timestamptz,
  remarks text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique(handover_id, section_code, document_name)
);

create table if not exists public.closure_approvals (
  approval_id uuid primary key default gen_random_uuid(),
  financial_year text not null,
  approval_stage text not null check (approval_stage in ('Treasurer Certification','Secretary Certification','Internal Audit Sign-off','Statutory Audit Completion','Committee Approval','AGM Adoption','System Freeze Authorization','Restatement Approval')),
  decision text not null check (decision in ('Approved','Approved with Exceptions','Rejected','Deferred')),
  signatory_name text not null,
  signatory_role text not null,
  approval_reference text,
  attestation text not null,
  exception_count integer not null default 0,
  signed_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.financial_year_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  financial_year text not null,
  snapshot_version integer not null,
  snapshot_status text not null check (snapshot_status in ('Provisional','Internal Audit Reviewed','Statutory Audit Adjusted','Committee Approved','AGM Adopted','Frozen','Restated')),
  as_of_date date not null,
  snapshot_data jsonb not null,
  checksum text,
  supersedes_snapshot_id uuid references public.financial_year_snapshots(snapshot_id) on delete restrict,
  created_by_name text,
  created_at timestamptz not null default now(),
  unique(financial_year, snapshot_version)
);

create table if not exists public.audit_workflow_activity (
  activity_id uuid primary key default gen_random_uuid(),
  financial_year text not null,
  entity_type text not null,
  entity_id text,
  action text not null,
  actor_name text,
  actor_role text,
  details jsonb not null default '{}'::jsonb,
  actor_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_fyr_checklist_fy_stage on public.financial_year_checklist(financial_year, stage, status);
create index if not exists idx_audit_obs_fy_status on public.audit_observations(financial_year, status, risk_level);
create index if not exists idx_audit_updates_observation on public.audit_observation_updates(observation_id, created_at desc);
create index if not exists idx_audit_queries_fy_status on public.audit_queries(financial_year, status);
create index if not exists idx_audit_adjustments_fy_status on public.audit_adjustment_proposals(financial_year, management_decision);
create index if not exists idx_handover_fy_version on public.audit_handover_packages(financial_year, package_version desc);
create index if not exists idx_handover_documents_package on public.audit_handover_documents(handover_id, section_code);
create index if not exists idx_closure_approvals_fy_stage on public.closure_approvals(financial_year, approval_stage, signed_at desc);
create index if not exists idx_fy_snapshots_fy_version on public.financial_year_snapshots(financial_year, snapshot_version desc);
create index if not exists idx_audit_activity_fy_time on public.audit_workflow_activity(financial_year, created_at desc);

-- Read access for authenticated society users; changes are attributable to auth.uid().
-- Role-specific write restrictions should be tightened after the society's user-role matrix is connected.
do $$
declare t text;
begin
  foreach t in array array[
    'financial_year_reviews','financial_year_checklist','audit_observations','audit_observation_updates',
    'audit_queries','audit_adjustment_proposals','audit_handover_packages','audit_handover_documents',
    'closure_approvals','financial_year_snapshots','audit_workflow_activity'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists audit_workflow_read on public.%I', t);
    execute format('create policy audit_workflow_read on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;

-- Operational review records are writable by authenticated users. The application enforces
-- role-specific controls; approval and sign-off records are insert-only.
do $$
declare t text;
begin
  foreach t in array array[
    'financial_year_reviews','financial_year_checklist','audit_observations','audit_observation_updates',
    'audit_queries','audit_adjustment_proposals','audit_handover_packages','audit_handover_documents'
  ] loop
    execute format('drop policy if exists audit_workflow_insert on public.%I', t);
    execute format('create policy audit_workflow_insert on public.%I for insert to authenticated with check (auth.uid() is not null)', t);
    execute format('drop policy if exists audit_workflow_update on public.%I', t);
    execute format('create policy audit_workflow_update on public.%I for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)', t);
  end loop;
end $$;

drop policy if exists audit_approvals_insert on public.closure_approvals;
create policy audit_approvals_insert on public.closure_approvals for insert to authenticated with check (auth.uid() is not null);
drop policy if exists audit_snapshots_insert on public.financial_year_snapshots;
create policy audit_snapshots_insert on public.financial_year_snapshots for insert to authenticated with check (auth.uid() is not null);
drop policy if exists audit_activity_insert on public.audit_workflow_activity;
create policy audit_activity_insert on public.audit_workflow_activity for insert to authenticated with check (auth.uid() is not null);

-- Handover release cannot bypass internal-audit sign-off for the same FY.
create or replace function public.guard_audit_handover_release()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status in ('Ready for External Auditor','Issued','Auditor Acknowledged')
     and not exists (
       select 1 from public.closure_approvals a
       where a.financial_year=new.financial_year
         and a.approval_stage='Internal Audit Sign-off'
         and a.decision in ('Approved','Approved with Exceptions')
     ) then
    raise exception 'Internal Audit Sign-off is required before releasing the statutory audit handover.';
  end if;
  if new.status='Issued' and (new.issued_to is null or new.issued_at is null) then
    raise exception 'Recipient and issue timestamp are required before issuing the handover.';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_audit_handover_release on public.audit_handover_packages;
create trigger trg_guard_audit_handover_release before insert or update on public.audit_handover_packages
for each row execute function public.guard_audit_handover_release();

-- Freeze requires committee approval and AGM adoption. Internal audit and statutory audit
-- completion remain separate approvals and are not inferred from the freeze action.
create or replace function public.guard_financial_year_freeze()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.snapshot_status='Frozen' then
    if not exists (select 1 from public.closure_approvals a where a.financial_year=new.financial_year and a.approval_stage='Committee Approval' and a.decision in ('Approved','Approved with Exceptions')) then
      raise exception 'Managing Committee approval is required before freeze.';
    end if;
    if not exists (select 1 from public.closure_approvals a where a.financial_year=new.financial_year and a.approval_stage='AGM Adoption' and a.decision in ('Approved','Approved with Exceptions')) then
      raise exception 'AGM adoption is required before freeze.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_financial_year_freeze on public.financial_year_snapshots;
create trigger trg_guard_financial_year_freeze before insert or update on public.financial_year_snapshots
for each row execute function public.guard_financial_year_freeze();

-- Approval and snapshot rows are immutable once written; corrections use new records/versions.
create or replace function public.prevent_audit_record_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'This audit trail record is immutable. Create a new version or follow-up record.';
end $$;
drop trigger if exists trg_closure_approvals_immutable on public.closure_approvals;
create trigger trg_closure_approvals_immutable before update or delete on public.closure_approvals
for each row execute function public.prevent_audit_record_mutation();
drop trigger if exists trg_financial_snapshots_immutable on public.financial_year_snapshots;
create trigger trg_financial_snapshots_immutable before update or delete on public.financial_year_snapshots
for each row execute function public.prevent_audit_record_mutation();
drop trigger if exists trg_audit_activity_immutable on public.audit_workflow_activity;
create trigger trg_audit_activity_immutable before update or delete on public.audit_workflow_activity
for each row execute function public.prevent_audit_record_mutation();


-- Private evidence bucket. Files are accessible only to authenticated society users via
-- short-lived signed URLs; the document index stores the object path, not a public URL.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'audit-evidence',
  'audit-evidence',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/csv',
    'image/png',
    'image/jpeg'
  ]
)
on conflict(id) do update set
  public=false,
  file_size_limit=26214400,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists audit_evidence_read on storage.objects;
create policy audit_evidence_read on storage.objects
for select to authenticated using (bucket_id='audit-evidence');
drop policy if exists audit_evidence_insert on storage.objects;
create policy audit_evidence_insert on storage.objects
for insert to authenticated with check (bucket_id='audit-evidence' and auth.uid() is not null);
drop policy if exists audit_evidence_update on storage.objects;
create policy audit_evidence_update on storage.objects
for update to authenticated using (bucket_id='audit-evidence') with check (bucket_id='audit-evidence');


-- Internal audit sign-off is permitted only after the audit programme checklist is
-- completed, marked not applicable, or explicitly disclosed as an exception.
create or replace function public.guard_internal_audit_signoff()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_total integer; v_open integer;
begin
  if new.approval_stage='Internal Audit Sign-off' then
    select count(*),count(*) filter (where status not in ('Completed','Not Applicable','Exception Disclosed'))
      into v_total,v_open
    from public.financial_year_checklist
    where financial_year=new.financial_year and stage='Internal Audit';
    if v_total=0 then raise exception 'Initialize the FY workflow and internal audit checklist before sign-off.'; end if;
    if v_open>0 then raise exception 'Complete or explicitly disclose every internal audit checklist item before sign-off.'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_internal_audit_signoff on public.closure_approvals;
create trigger trg_guard_internal_audit_signoff before insert on public.closure_approvals
for each row execute function public.guard_internal_audit_signoff();

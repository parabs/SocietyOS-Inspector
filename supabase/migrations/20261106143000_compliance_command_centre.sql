-- Compliance command centre: versioned obligation library and evidence-backed compliance register.
-- Seeded entries are review prompts from the supplied 2014 Model Bye-laws, not legally verified obligations.
create extension if not exists pgcrypto;

create table if not exists public.compliance_obligations (
  obligation_id uuid primary key default gen_random_uuid(),
  obligation_code text not null unique,
  title text not null,
  domain text not null,
  source_type text not null default 'Model Bye-laws',
  source_name text not null,
  source_reference text not null,
  requirement_summary text not null,
  applicability text not null default 'To Verify' check (applicability in ('Applicable','Not Applicable','To Verify')),
  frequency text not null default 'As Required',
  due_rule text,
  owner_role text,
  reviewer_role text,
  evidence_required text,
  legal_status text not null default 'Draft - Verify' check (legal_status in ('Draft - Verify','Verified Current','Superseded','Society Policy')),
  effective_from date,
  effective_to date,
  source_version text not null default '2014 Model Bye-laws copy supplied by Society',
  verified_by text,
  verified_on date,
  verification_notes text,
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.compliance_obligation_instances (
  instance_id uuid primary key default gen_random_uuid(),
  obligation_id uuid not null references public.compliance_obligations(obligation_id) on delete restrict,
  period_key text not null,
  period_start date,
  period_end date,
  due_date date,
  status text not null default 'Not Started' check (status in ('Not Started','In Progress','Awaiting Approval','Submitted','Accepted','Overdue','Not Applicable','Exception')),
  owner_name text,
  owner_role text,
  reviewer_name text,
  completed_on date,
  submission_reference text,
  outcome_notes text,
  exception_reason text,
  next_action text,
  next_action_due date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(obligation_id, period_key)
);

create table if not exists public.compliance_evidence (
  evidence_id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.compliance_obligation_instances(instance_id) on delete restrict,
  evidence_name text not null,
  evidence_type text not null default 'Document',
  storage_path text,
  external_reference text,
  notes text,
  uploaded_by uuid default auth.uid(),
  uploaded_at timestamptz not null default now()
);

create table if not exists public.compliance_activity (
  activity_id uuid primary key default gen_random_uuid(),
  instance_id uuid references public.compliance_obligation_instances(instance_id) on delete restrict,
  obligation_id uuid references public.compliance_obligations(obligation_id) on delete restrict,
  action text not null,
  previous_value jsonb,
  new_value jsonb,
  actor_name text,
  actor_role text,
  actor_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_compliance_obligations_domain on public.compliance_obligations(domain, active, applicability);
create index if not exists idx_compliance_instances_period_status on public.compliance_obligation_instances(period_key, status, due_date);
create index if not exists idx_compliance_evidence_instance on public.compliance_evidence(instance_id, uploaded_at desc);
create index if not exists idx_compliance_activity_instance on public.compliance_activity(instance_id, created_at desc);

insert into public.compliance_obligations
(obligation_code,title,domain,source_name,source_reference,requirement_summary,frequency,owner_role,reviewer_role,evidence_required)
values
('GOV-001','Annual General Body Meeting','Governance','2014 Model Bye-laws copy supplied by Society','Bye-laws 93-94','Plan and document the annual meeting, required business, accounts and reports placed before members. Verify current statutory timing and notice requirements.','Annual','Secretary','Managing Committee','Notice, service proof, agenda, attendance, quorum, minutes and resolutions'),
('GOV-002','Special General Body Meeting','Governance','2014 Model Bye-laws copy supplied by Society','Bye-laws 95-98','Record requisition or decision, authority, notice, agenda, attendance, minutes and resolutions. Verify current notice periods and exceptions.','As Required','Secretary','Managing Committee','Requisition/decision, notice proof, agenda, minutes and resolutions'),
('GOV-003','Managing Committee Meetings','Governance','2014 Model Bye-laws copy supplied by Society','Bye-laws 131-139','Maintain meeting notices, attendance, minutes, decisions, conflicts and action follow-up. Verify exact registered text.','As Required','Secretary','Chairman / Committee','Notice, attendance, minutes, resolution and action register'),
('FIN-001','Books of Account and Registers','Financial Records','2014 Model Bye-laws copy supplied by Society','Bye-laws 140-146; MCS Rules Rule 61 (verify current text)','Maintain prescribed accounting books, registers and annual statements with source traceability and custody controls.','Continuous / Annual','Treasurer','Secretary / Committee','Books, registers, annual statements and review evidence'),
('FIN-002','Annual Financial Statements','Financial Records','MCS Rules, 1961 (reference to verify)','Rule 61','Prepare annual receipts and disbursements, income and expenditure and balance sheet statements for audit. Confirm current prescribed forms and instructions.','Annual','Treasurer','Managing Committee','Signed statements, schedules, trial balance and supporting ledgers'),
('AUD-001','Statutory Auditor Appointment','Audit','2014 Model Bye-laws copy supplied by Society','Bye-law 150; MCS Act Section 81; Rule 69 (verify current text)','Record appointment through the legally competent process and verify auditor eligibility/panel status and applicable tenure restrictions.','Annual','Secretary','General Body','Meeting resolution, auditor consent, panel/eligibility proof and engagement details'),
('AUD-002','Statutory Audit Completion','Audit','MCS Act, 1960 (current text to verify)','Section 81; Rule 69','Track statutory audit completion against the current applicable deadline and retain auditor report and schedules. Do not use a deadline copied from an older model bye-law without verification.','Annual','Managing Committee','General Body','Auditor report, schedules, appointment and submission proof'),
('AUD-003','Audit Rectification Report','Audit','2014 Model Bye-laws copy supplied by Society','Bye-law 152; MCS Rules Rule 73; MCS Act Section 82 (verify current text)','Register every audit objection, management response, corrective action, evidence, approval, verification and statutory submission acknowledgement.','Per Audit Report','Secretary','Managing Committee / Auditor','Original audit report, rectification report, committee approval and submission receipt'),
('FIN-003','Fund Constitution and Utilisation','Financial Records','2014 Model Bye-laws copy supplied by Society','Bye-laws 12-15','Maintain fund-wise balances and trace every transfer or utilisation to its purpose, approval and ledger evidence.','Continuous / Annual','Treasurer','Managing Committee','Fund ledger, bank/investment evidence, approval and utilisation schedule'),
('FIN-004','Write-off of Irrecoverable Dues','Financial Records','2014 Model Bye-laws copy supplied by Society','Bye-laws 148-149','Do not write off member dues without the required auditor certification and competent approvals. Verify current statutory conditions before action.','As Required','Treasurer','Managing Committee / General Body','Auditor certification, General Body sanction and required authority approvals'),
('MEM-001','Member and Share Register','Statutory Registers','2014 Model Bye-laws copy supplied by Society','Bye-laws 16-40 and 140-146 (verify exact clauses)','Maintain verified member particulars, shareholding, admission and transfer history with supporting resolutions and documents.','Continuous','Secretary','Managing Committee','Member register, applications, share certificates and resolutions'),
('MEM-002','Nomination Register','Statutory Registers','2014 Model Bye-laws copy supplied by Society','Bye-law 31','Maintain nomination records and supporting forms; protect member personal information and track changes.','Event Based','Secretary','Managing Committee','Nomination forms, acknowledgements and register'),
('MEM-003','Transfer of Shares and Interest','Statutory Registers','2014 Model Bye-laws copy supplied by Society','Bye-laws 37-40','Track transfer applications, dues, approvals, prescribed documents and register updates. Verify current rules and forms.','Event Based','Secretary','Managing Committee','Application, transfer documents, dues clearance and resolution'),
('MEM-004','Member Inspection and Copies','Member Rights','2014 Model Bye-laws copy supplied by Society','Bye-law 23','Track lawful member requests for inspection/copies, response, fees if applicable and delivery evidence. Verify current rights and timelines.','On Request','Secretary','Managing Committee','Request, acknowledgement, decision and delivery proof'),
('OPS-001','Member Complaint Redressal','Member Service','2014 Model Bye-laws copy supplied by Society','Bye-laws 171-173','Register complaints, acknowledge, investigate, record committee decision, communicate outcome and preserve escalation rights.','On Complaint','Secretary','Managing Committee','Complaint, acknowledgement, investigation, decision and response'),
('OPS-002','Procurement and Vendor Controls','Internal Control','Society QMS draft supplied by Society','QMS procurement control (internal policy; approval required)','Record scope, quotations, comparison, conflict declarations, approval, work order, invoice and completion verification.','Per Procurement','Assigned Coordinator','Treasurer / Committee','Quotations, comparison, declarations, approval, work order and completion proof'),
('OPS-003','Asset and Preventive Maintenance Register','Internal Control','Society QMS draft supplied by Society','QMS asset management (internal policy; approval required)','Maintain common asset inventory, inspection history, warranties, service schedules, risk and work completion evidence.','Continuous / Periodic','Assigned Coordinator','Managing Committee','Asset register, inspection reports, service records and work orders'),
('GOV-004','Resolution and Action Register','Governance','Society QMS draft supplied by Society','Internal control mapped to Bye-laws 93-98 and 131-139','Link every committee/general body resolution to an owner, due date, implementation evidence and closure verification.','Per Meeting','Secretary','Chairman / Committee','Approved minutes, resolution text, owner and closure evidence'),
('AUD-004','Auditor Records and Information Access','Audit','2014 Model Bye-laws copy supplied by Society','Bye-law 151','Track books and records made available to internal/statutory auditor, requests, responses and missing items.','Per Audit','Secretary','Managing Committee','Auditor request list, delivery index and acknowledgement'),
('FIN-005','Cash and Bank Reconciliation','Financial Records','Society QMS draft supplied by Society','QMS financial control (internal policy; approval required)','Reconcile each bank account and cash book periodically; age unmatched items and record independent review.','Monthly','Treasurer','Independent Reviewer','Bank statements, cash book, reconciliation and reviewer sign-off'),
('GOV-005','Annual Report and Accounts Presentation','Governance','MCS Act, 1960 (current text to verify)','Section 75; applicable Rules and bye-laws','Track preparation and placing of annual reports, audited statements and audit report before the competent General Body. Verify current statutory requirements.','Annual','Secretary','Managing Committee','Annual report, audited statements, notice, agenda and minutes'),
('GOV-006','Statutory Returns and Registrar Submissions','Statutory Filings','MCS Act and Rules (current text to verify)','Applicable provisions, forms and Registrar directions','Maintain a verified register of returns, filings, acknowledgements and correspondence applicable to this Society. Do not assume every return applies.','As Applicable','Secretary','Managing Committee','Filed form, supporting papers, acknowledgement and correspondence'),
('FIN-006','Budget and Expenditure Approval','Financial Records','Society QMS draft supplied by Society','Internal control mapped to financial and committee powers','Record approved budget, deviations, spending authority, approval evidence and actual-versus-budget review.','Annual / Per Expense','Treasurer','Managing Committee','Approved budget, approval, invoice and variance review'),
('OPS-004','Insurance and Statutory Safety Records','Operational Compliance','Society QMS draft supplied by Society','Applicable laws, contracts and professional advice to be identified','Maintain applicable insurance, lift/fire/electrical and other safety inspection records with expiry dates and responsible owners.','Periodic / As Applicable','Assigned Coordinator','Managing Committee','Policy, inspection certificate, renewal and corrective action')
on conflict(obligation_code) do nothing;

alter table public.compliance_obligations enable row level security;
alter table public.compliance_obligation_instances enable row level security;
alter table public.compliance_evidence enable row level security;
alter table public.compliance_activity enable row level security;

-- Initial access follows the existing authenticated Society OS workspace policy.
-- Role/committee/auditor-specific restrictions remain a production security task.
drop policy if exists compliance_obligations_read on public.compliance_obligations;
create policy compliance_obligations_read on public.compliance_obligations for select to authenticated using (true);
drop policy if exists compliance_obligations_write on public.compliance_obligations;
create policy compliance_obligations_write on public.compliance_obligations for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists compliance_instances_read on public.compliance_obligation_instances;
create policy compliance_instances_read on public.compliance_obligation_instances for select to authenticated using (true);
drop policy if exists compliance_instances_write on public.compliance_obligation_instances;
create policy compliance_instances_write on public.compliance_obligation_instances for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists compliance_evidence_read on public.compliance_evidence;
create policy compliance_evidence_read on public.compliance_evidence for select to authenticated using (true);
drop policy if exists compliance_evidence_write on public.compliance_evidence;
create policy compliance_evidence_write on public.compliance_evidence for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists compliance_activity_read on public.compliance_activity;
create policy compliance_activity_read on public.compliance_activity for select to authenticated using (true);
drop policy if exists compliance_activity_insert on public.compliance_activity;
create policy compliance_activity_insert on public.compliance_activity for insert to authenticated with check (auth.uid() is not null);

grant select, insert, update, delete on public.compliance_obligations to authenticated;
grant select, insert, update, delete on public.compliance_obligation_instances to authenticated;
grant select, insert, update, delete on public.compliance_evidence to authenticated;
grant select, insert on public.compliance_activity to authenticated;

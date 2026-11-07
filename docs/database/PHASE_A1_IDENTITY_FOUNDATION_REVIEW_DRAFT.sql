-- Society OS Phase A1 — additive identity foundation
-- REVIEW DRAFT ONLY. Do not apply directly to production.
-- No society rows, memberships, role grants, financial tenant keys, backfill,
-- tenant authorization functions, or permissive policies are created here.
-- New public tables are RLS-enabled with no policies (deny by default).

begin;

create table if not exists public.societies (
  society_id uuid primary key default gen_random_uuid(),
  tenant_code text not null unique,
  legal_name text not null,
  display_name text not null,
  registration_number text,
  timezone text not null default 'Asia/Kolkata',
  status text not null default 'setup'
    check (status in ('setup', 'active', 'suspended', 'archived')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint societies_tenant_code_nonblank check (length(btrim(tenant_code)) > 0),
  constraint societies_legal_name_nonblank check (length(btrim(legal_name)) > 0),
  constraint societies_display_name_nonblank check (length(btrim(display_name)) > 0)
);

create table if not exists public.society_memberships (
  membership_id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(society_id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended', 'ended')),
  valid_from date not null default current_date,
  valid_until date,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint society_memberships_valid_dates check (valid_until is null or valid_until >= valid_from),
  constraint society_memberships_id_society_unique unique (membership_id, society_id)
);
create index if not exists idx_society_memberships_user_society
  on public.society_memberships (user_id, society_id);
create index if not exists idx_society_memberships_society_status
  on public.society_memberships (society_id, status);

create table if not exists public.permission_catalog (
  permission_code text primary key,
  description text not null,
  permission_group text not null,
  created_at timestamptz not null default now(),
  constraint permission_catalog_code_nonblank check (length(btrim(permission_code)) > 0)
);

create table if not exists public.society_roles (
  role_id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(society_id) on delete restrict,
  role_code text not null,
  role_name text not null,
  is_system_role boolean not null default false,
  created_at timestamptz not null default now(),
  constraint society_roles_society_role_code_unique unique (society_id, role_code),
  constraint society_roles_id_society_unique unique (role_id, society_id),
  constraint society_roles_code_nonblank check (length(btrim(role_code)) > 0),
  constraint society_roles_name_nonblank check (length(btrim(role_name)) > 0)
);

create table if not exists public.society_role_permissions (
  role_id uuid not null references public.society_roles(role_id) on delete restrict,
  permission_code text not null references public.permission_catalog(permission_code) on delete restrict,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  primary key (role_id, permission_code)
);

create table if not exists public.society_membership_roles (
  membership_id uuid not null,
  society_id uuid not null,
  role_id uuid not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  valid_from date not null default current_date,
  valid_until date,
  primary key (membership_id, role_id, valid_from),
  constraint society_membership_roles_membership_fk
    foreign key (membership_id, society_id)
    references public.society_memberships(membership_id, society_id) on delete restrict,
  constraint society_membership_roles_role_fk
    foreign key (role_id, society_id)
    references public.society_roles(role_id, society_id) on delete restrict,
  constraint society_membership_roles_valid_dates
    check (valid_until is null or valid_until >= valid_from)
);

create table if not exists public.party_user_links (
  party_user_link_id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(society_id) on delete restrict,
  party_id text not null references public.party_master(party_id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  relationship_code text not null,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'revoked')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  valid_from date not null default current_date,
  valid_until date,
  created_at timestamptz not null default now(),
  constraint party_user_links_valid_dates check (valid_until is null or valid_until >= valid_from),
  constraint party_user_links_relationship_nonblank check (length(btrim(relationship_code)) > 0),
  constraint party_user_links_verification_consistency
    check ((status = 'verified' and verified_at is not null) or status <> 'verified')
);
create index if not exists idx_party_user_links_user_society
  on public.party_user_links (user_id, society_id);
create index if not exists idx_party_user_links_party
  on public.party_user_links (party_id, status);

create table if not exists public.society_buildings (
  building_id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(society_id) on delete restrict,
  building_code text not null,
  building_name text not null,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint society_buildings_society_code_unique unique (society_id, building_code),
  constraint society_buildings_id_society_unique unique (building_id, society_id),
  constraint society_buildings_code_nonblank check (length(btrim(building_code)) > 0),
  constraint society_buildings_name_nonblank check (length(btrim(building_name)) > 0)
);

create table if not exists public.society_membership_audit (
  audit_id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(society_id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action_code text not null,
  target_type text not null,
  target_id uuid,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now(),
  constraint society_membership_audit_action_nonblank check (length(btrim(action_code)) > 0),
  constraint society_membership_audit_target_nonblank check (length(btrim(target_type)) > 0)
);

-- Seed only the permission vocabulary. No society-specific roles or grants.
insert into public.permission_catalog (permission_code, description, permission_group)
values
  ('society.settings.manage', 'Manage society settings', 'society'),
  ('society.members.manage', 'Invite and manage society memberships', 'society'),
  ('society.roles.manage', 'Manage society roles and permission grants', 'society'),
  ('party.read_linked', 'Read explicitly linked party records', 'party'),
  ('member.directory.read', 'Read the permitted member directory', 'member'),
  ('finance.read', 'Read authorised financial records', 'finance'),
  ('finance.import.manage', 'Manage financial imports', 'finance'),
  ('finance.correct.request', 'Request a financial correction', 'finance'),
  ('finance.correct.approve', 'Approve a financial correction', 'finance'),
  ('member.payment.submit', 'Submit a member payment claim', 'member_payment'),
  ('member.payment.read_own', 'Read own payment claims', 'member_payment'),
  ('treasurer.payment.verify', 'Verify member payment claims', 'member_payment'),
  ('treasurer.receipt.issue', 'Issue official receipts for verified payments', 'member_payment'),
  ('expense.request.create', 'Create an expense request', 'expense'),
  ('expense.request.read_own', 'Read own expense requests', 'expense'),
  ('expense.request.review', 'Review expense requests', 'expense'),
  ('expense.payment.record', 'Record payment against an approved expense', 'expense'),
  ('committee.expense.approve', 'Approve expense requests under delegated authority', 'expense'),
  ('auditor.workflow.read', 'Read authorised audit and compliance workflows', 'audit')
on conflict (permission_code) do nothing;

alter table public.societies enable row level security;
alter table public.society_memberships enable row level security;
alter table public.permission_catalog enable row level security;
alter table public.society_roles enable row level security;
alter table public.society_role_permissions enable row level security;
alter table public.society_membership_roles enable row level security;
alter table public.party_user_links enable row level security;
alter table public.society_buildings enable row level security;
alter table public.society_membership_audit enable row level security;

commit;

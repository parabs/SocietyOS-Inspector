# Society OS — Phase A Tenant Foundation: Implementation Design

**Status:** Design only — not an executable migration and not applied  
**Repository:** `parabs/SocietyOS-Inspector`  
**Branch:** `foundation/sprint-1-domain-architecture`  
**Depends on:** `WORKFLOW_DATABASE_DESIGN_AND_MIGRATION_PROPOSAL.md` and `WORKFLOW_LIVE_SCHEMA_AND_APPLICATION_IMPACT_ASSESSMENT.md`

## 1. Purpose and release boundary

Phase A establishes the legal society tenant, society-scoped user membership, role/permission grants, explicit user-to-party links, and the building directory. It also prepares a safe path for attaching the existing single-society financial dataset to its tenant.

Phase A does **not** implement member payment submissions, receipt issuance, expense requests, approval workflows, or member-facing access to financial records. Those remain later phases.

No production DDL, data backfill, RLS change, storage-policy change, or application change is authorised by this design document.

## 2. Verified current state

Read-only inspection of Supabase project `hklibokniuwurdxndxfd` on 2026-11-07 found:

- No `societies`, society membership, society role, building, or party-user-link table.
- One Auth user.
- `party_master`: 58 rows; `transactions`: 731; `demand_register`: 729.
- `account_master`: 8; `category_master`: 47; `rules_master`: 19; `flat_owner_master`: 39.
- Existing financial tables do not carry a `society_id`.
- Current RLS is not a tenant boundary. The `is_society_admin()` check relies on a global JWT role claim, not active membership in a particular society.
- The latest recorded database migration at inspection was `20261107044303 named_statutory_audit_documents`.

These facts mean that adding a membership table alone would not make the existing financial data tenant-safe.

## 3. Core identity model

Keep these concepts separate:

1. **Auth user** — the Supabase login identity (`auth.users.id`).
2. **Society** — the legal/operating tenant.
3. **Society membership** — a user's active or historical relationship with one society.
4. **Society role** — a society-scoped responsibility such as Treasurer, Secretary, Chairman, Committee Member, Member, Auditor, or Society Admin.
5. **Permission** — the action a role may perform; role names alone are not authorisation.
6. **Party** — a person or organisation in the existing Party Master.
7. **Party-user link** — an explicitly verified link allowing a login to act for/read the permitted party record.
8. **Building** — a physical building/block within a society; optional for a single-building society.

A login is not automatically a party, owner, tenant, occupant, or member. Never link a user to a party solely by matching mobile number or email.

## 4. Proposed additive schema

Use UUID primary keys for new identity/tenant tables. Keep existing text business IDs unchanged.

### 4.1 `societies`

- `society_id uuid primary key default gen_random_uuid()`
- `tenant_code text not null unique` — immutable internal code, not derived from a mutable display name.
- `legal_name text not null`
- `display_name text not null`
- `registration_number text null` — optional until verified.
- `timezone text not null default 'Asia/Kolkata'`
- `status text not null check (status in ('setup','active','suspended','archived'))`
- `settings jsonb not null default '{}'`
- `created_at, updated_at timestamptz not null`

Do not invent a registration number, address, registration date, or legal suffix. Store only details confirmed by the society.

### 4.2 `society_memberships`

- `membership_id uuid primary key`
- `society_id uuid not null references societies`
- `user_id uuid not null references auth.users(id)`
- `status text not null check (status in ('invited','active','suspended','ended'))`
- `valid_from date not null default current_date`
- `valid_until date null`
- `invited_by uuid null references auth.users(id)`
- `created_at, updated_at timestamptz not null`

Indexes: `(society_id,user_id)`, active membership lookup by `user_id,society_id`. Prevent overlapping active memberships for the same user and society through a controlled constraint/trigger or a single-row lifecycle policy. Do not prevent a user from belonging to multiple different societies.

### 4.3 Permission catalogue and role grants

Use data-driven permissions rather than hard-coded JWT role claims.

- `permission_catalog(permission_code text primary key, description text not null, permission_group text not null)`
- `society_roles(role_id uuid primary key, society_id uuid not null, role_code text not null, role_name text not null, is_system_role boolean not null default false, created_at timestamptz not null, unique(society_id,role_code), unique(role_id,society_id))`
- `society_role_permissions(role_id uuid not null, permission_code text not null, granted_at timestamptz not null, granted_by uuid null, primary key(role_id,permission_code))`
- `society_membership_roles(membership_id uuid not null, role_id uuid not null, granted_at timestamptz not null, granted_by uuid null, valid_from date not null, valid_until date null, primary key(membership_id,role_id,valid_from))`

Use composite foreign keys so a membership cannot be assigned a role from another society. Role changes must be auditable. Seed a conservative role catalogue, but do not automatically grant every permission to the first user. Configure the initial society admin explicitly after the identity mapping is approved.

Initial permission codes should be action-oriented and granular, for example:

- `society.settings.manage`
- `society.members.manage`
- `society.roles.manage`
- `party.read_linked`
- `member.directory.read`
- `finance.read`
- `finance.import.manage`
- `finance.correct.request`
- `finance.correct.approve`
- `member.payment.submit`
- `member.payment.read_own`
- `treasurer.payment.verify`
- `treasurer.receipt.issue`
- `expense.request.create`
- `expense.request.read_own`
- `expense.request.review`
- `expense.payment.record`
- `committee.expense.approve`
- `auditor.workflow.read`

Later phases may add permissions without changing the membership model. Auditor access is read-only by default. The virtual accountant is not a human membership or role and receives no posting permission.

### 4.4 `party_user_links`

- `party_user_link_id uuid primary key`
- `society_id uuid not null`
- `party_id text not null` — FK to the existing `party_master.party_id`
- `user_id uuid not null references auth.users(id)`
- `relationship_code text not null` — e.g. member, owner_representative, authorised_representative, billing_contact.
- `status text not null check (status in ('pending','verified','revoked'))`
- `verified_by uuid null references auth.users(id)`
- `verified_at timestamptz null`
- `valid_from date not null default current_date`
- `valid_until date null`
- `created_at timestamptz not null`

Use a composite FK to ensure the party belongs to the same society once tenant keys are added to Party Master. Permit multiple users per party and multiple parties per user when explicitly verified. Do not assume one flat = one owner = one login.

### 4.5 `society_buildings`

- `building_id uuid primary key`
- `society_id uuid not null references societies`
- `building_code text not null`
- `building_name text not null`
- `status text not null check (status in ('active','inactive'))`
- `created_at, updated_at timestamptz not null`
- Unique `(society_id,building_code)` and `(building_id,society_id)`.

A single-building society can have one building row. Building is not itself a tenant. Flat and parking assets, ownership, occupancy and allotment relationships are a subsequent domain layer; parking must remain an independent asset type.

### 4.6 Auditability

Add an append-only `society_membership_audit` (or a shared audit event table with equivalent guarantees) for invitations, activation, suspension, role grants/revocations, party-link verification/revocation, and society status changes. Capture actor, timestamp, action, target IDs, reason, and before/after values. Ordinary application roles must not update/delete audit events.

## 5. Tenant key strategy for existing financial data

Do not use a client-supplied tenant ID as proof of access.

The financial tables currently lack `society_id`. The implementation migration must inventory and cover every society-owned table, not only `transactions`. At minimum the inventory includes:

- `party_master`, `account_master`, `category_master`, `rules_master`, `flat_owner_master`
- `transactions`, `demand_register`, `demand_payment_allocations`, `demand_adjustments`, `member_opening_balances`, `account_monthly_balance`
- `source_register`, `society_import_batches`, `society_correction_log`, `party_category_rules`, `society_dropdown_options`
- `transaction_correction_register`, `transaction_verification_records`, `account_opening_verification`, `data_quality_exceptions`, `data_management_change_log`
- Any further table or view discovered to expose or mutate society-owned records.

For tables with direct society ownership, add nullable `society_id` first, then backfill from an explicit reviewed mapping. For child tables, prefer deriving tenant ownership through a validated parent FK where practical; where direct `society_id` is stored for RLS/performance, enforce consistency with composite foreign keys or triggers. Never allow a child row's society ID to disagree with its parent.

Do not add `society_id` to calculation views as an arbitrary constant. Update views only after base-table ownership and regression tests are proven.

## 6. Legacy tenant mapping — mandatory approval gate

The current app/database is being used for Pearl Meadows ‘C’ Type ‘C’ Wing CHS Ltd. Treat that as a candidate legal tenant label, not permission to silently create or map a tenant.

Before backfill, obtain/confirm:
- Exact registered/legal society name and the intended tenant display name.
- Whether this database contains records exclusively for that one legal society, including all master, import, audit and correction tables.
- The explicit current-society mapping and the designated initial administrator.
- Whether the existing building label is the society itself or a building within a larger registered society. Do not infer the legal boundary from “C Wing”.

Prepare a dry-run report listing every table, total rows, rows mapped, unmapped rows, cross-parent mismatches, and duplicate/business-key conflicts. The backfill must abort if any row is ambiguous or unmapped. No default tenant UUID, guessed tenant code, name matching, or implicit “all rows belong here” update is allowed.

If records from multiple societies are found, stop and prepare a row-level mapping plan. Do not use one-tenant backfill.

## 7. RLS and application rollout

Tenant isolation must be enforced in the database, not merely by frontend filters.

1. Create a security-reviewed helper such as `has_society_permission(p_society_id uuid, p_permission_code text)` that checks `auth.uid()`, active membership, active role grants, effective dates and permission catalogue. Avoid recursive RLS by using carefully owned, fixed-search-path security-definer functions with restricted execute grants.
2. Do not treat `app_metadata.role = 'society_admin'` as tenant membership. JWT claims may cache display hints but are not the authorisation source.
3. For each table, define explicit SELECT/INSERT/UPDATE/DELETE policies by permission and action. Deny direct member writes to financial transactions, demand allocation, receipt number, approval decisions and audit events.
4. Scope storage object access to both society and workflow, using private buckets and verified metadata. Do not reuse the existing broad `audit-evidence` policies for member evidence.
5. Maintain an explicit, temporary compatibility policy for the existing trusted admin app only if required during rollout. It must not grant member access or bypass tenant boundaries indefinitely. Document its owner and removal condition.
6. Update application queries/services to pass an active society context and handle membership/permission errors. Backend policy remains authoritative.
7. Enable member-facing access only after cross-society isolation tests pass.

Do not change existing production RLS policies as part of a design-only commit.

## 8. Migration sequence and gates

### A0 — Preflight (read-only)

- Reconfirm current schema, policies, storage policies, functions, views and latest migration version.
- Inventory all base tables, foreign keys, views and service-role/background jobs that read/write society-owned records.
- Confirm legal society identity, current data ownership and initial administrator.
- Save baseline row counts and FY 2018–19 report outputs.

**Gate:** No migration until the tenant boundary and legacy mapping are explicitly approved.

### A1 — Additive identity foundation

- Create tenant, membership, permission, role, role-grant, party-link, building and audit tables.
- Seed only permission catalogue/system role definitions; do not assign user roles without approved mapping.
- Add nullable tenant columns and required indexes to the agreed base tables only after the inventory is complete.
- Do not activate tenant RLS or member access yet.
- Apply in a development Supabase branch first.

### A2 — Dry-run and controlled backfill

- Insert the confirmed society and initial building only from approved values.
- Backfill tenant keys using an explicit mapping manifest.
- Verify all rows mapped exactly once; verify child-parent tenant consistency; check no duplicate IDs/constraints.
- Record mapping manifest, counts and checksums in migration evidence.
- Abort on any mismatch; no financial data values or business IDs are rewritten.

### A3 — Enforce tenant boundary

- Make required tenant keys NOT NULL after clean backfill.
- Add composite tenant-aware unique/FK constraints where required.
- Add and test permission helpers and per-table RLS.
- Remove/restrict broad legacy policies only after replacement policies and existing admin-app compatibility are verified.
- Tighten storage policies in a separate reviewed step.
- No new member access until all tests pass.

### A4 — Application compatibility and release

- Update auth/session context, active-society selection, data services, imports, background jobs and storage access.
- Keep the current single-society app working throughout transition.
- Add role/membership administration UI only after backend policy tests pass.
- Deploy behind a feature flag; no member-facing rollout until acceptance.

Phase B workflow tables and Phase C/D payment/expense tables are explicitly out of this Phase A migration.

## 9. Required test matrix

- Unauthenticated user cannot read tenant data.
- Authenticated user with no membership cannot read any society data.
- Active member of Society A cannot read or mutate Society B records.
- Suspended/ended/expired membership loses access immediately.
- Role grant in Society A does not grant the same role in Society B.
- Member can access only explicitly verified linked party records.
- Pending/revoked party link grants no access.
- Auditor can read authorised records but cannot write or approve.
- Treasurer can perform only granted finance actions.
- A client-supplied different society ID cannot bypass RLS.
- Cross-tenant child-parent FK mismatch is rejected.
- Service-role jobs and imports preserve correct tenant ownership.
- Existing admin app can still read/write the approved current society during rollout.
- FY 2018–19 baseline reports, balances, demand totals, receipt totals, ledgers and imports remain unchanged.
- No historical transaction, demand, allocation, party ID, account ID or category ID is rewritten by tenant backfill.

## 10. Rollback and operational safeguards

- Develop and test on a Supabase development branch; do not use production as the first migration target.
- Additive DDL first. No destructive drops, table renames, truncations, financial recalculation or bulk rewriting.
- Take and verify a recoverable database backup before production rollout.
- Keep tenant-key backfill in a separately reviewable migration/operation with explicit row counts.
- If A3 RLS causes app regressions, revert to the documented temporary admin compatibility policy; do not disable RLS globally.
- Never merge/apply a production migration solely because the SQL compiles.

## 11. Decisions and remaining approval gates

### Established legal identity from prior explicit user statements

The user has previously identified C Wing as a separate registered cooperative housing society and used the legal name **“PEARL MEADOWS C-TYPE WING CO-OPERATIVE HOUSING SOCIETY LTD.”** (also referred to as “Pearl Meadows 'C' Type 'C' Wing Chs Ltd.”). Therefore, for the tenant identity design, treat C Wing as the society tenant itself, not merely as a building within a larger society. Do not create a separate parent society based on the Pearl Meadows name. Store the legal name exactly as confirmed; use a separate building row only if the society confirms an internal building/block structure.

### Still required before any data backfill or administrator grant

1. Confirm that every existing record in this Supabase project belongs exclusively to this one registered society. The historical use of the project for Pearl Meadows is not sufficient proof for an automatic all-row backfill.
2. Designate the initial Society Admin. There is one Auth user in the project, but the user has not explicitly designated that account; do not grant it admin membership automatically.
3. Confirm the building name/code only if a building record is needed now. This can remain empty for the first migration if the society is modelled as a single operating unit.
4. Approve the A1/A2/A3 rollout sequence after reviewing the dry-run mapping report.

**Next deliverable:** prepare the additive A1 identity-table migration without inserting a society, assigning memberships/roles, backfilling financial records, or enabling tenant RLS. Prepare the A2 dry-run mapping separately. Target development first; production application requires a separate explicit approval.

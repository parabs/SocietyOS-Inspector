# Phase A — End-to-end execution readiness and verified blockers

**Inspection date:** 2026-11-07  
**Production project:** `hklibokniuwurdxndxfd`  
**Repository:** `parabs/SocietyOS-Inspector`  
**Status:** Pre-implementation security gate. This document records live evidence and the exact work required to complete Phase A. It does not authorize a partial production rollout.

## Executive status

Phase A is **not complete**. The design contracts for identity, roles, workflows, onboarding and historical import are documented, and the Google OAuth preparation change is CI-validated. However, production tenant identity, membership-based authorization, screen/action enforcement, row-level tenant isolation, secure views, RPC grants, storage object authorization and end-to-end tests are not implemented.

The production database is still a single-society schema without tenant keys. A role claim in the JWT cannot safely be used as the long-term authorization model. The current AuthGate only checks for a non-empty trusted `app_metadata.role(s)` claim; it does not validate active membership, society scope, permissions, record scope, workflow state or separation of duties.

**Release decision:** keep PR #89 draft and do not deploy it as a completed Phase A security solution. Do not apply the identity SQL draft or change production grants/RLS/views/storage until canonical migration history and a tested coordinated cutover exist.

## Owner decisions already confirmed

1. Google OAuth authentication is available to all Google users.
2. Authentication is not authorization. Application access requires a role explicitly assigned by the Society Admin.
3. Retain the existing sole Google-linked account carrying trusted `society_admin` app metadata as the initial Society Admin.
4. Use the existing eight Phase A3 role presets: Society Admin, Treasurer, Secretary, Chairman, Auditor, Member, Requester and Caretaker.
5. A registered society is the tenant boundary. Buildings/wings inside one legally registered society are not separate tenants.
6. Preserve Pearl Meadows C Wing FY 2018–19 data, source facts and accepted financial calculations.
7. No paid Supabase projects or branches. No cost-bearing test environment is approved.

The owner has not yet specified per-society approval limits, signatory combinations, full-ledger visibility defaults for Secretary/Chairman, or auditor assignment duration. These must remain configurable and deny-by-default, not guessed.

## Verified production baseline

Read-only checks against the live Supabase project on 2026-11-07 found:

| Area | Verified result | Consequence |
|---|---:|---|
| Public base tables | 46 | Every existing table must be classified as tenant-owned, shared reference, platform, or archive |
| Tables with RLS enabled | 46 | RLS is enabled everywhere, but this does not prove correct authorization |
| Tables with FORCE RLS | 0 | Table owners can bypass ordinary RLS |
| Tables with at least one policy | 40 | Six tables are deny-by-default because they have no policies |
| Public base tables with `society_id` | 0 | No existing base table currently carries the proposed tenant key |
| Owner-privileged financial views | 11 | View grants and definitions need coordinated lockdown |
| Publicly executable SECURITY DEFINER functions | 4 | Function execution grants need review and restriction |
| Mutable search-path functions flagged | 1 | `prevent_audit_record_mutation()` needs a pinned search path |
| Storage buckets observed | `audit-evidence` (private) | Private bucket status alone does not enforce society/record permissions |

### Six RLS-enabled tables without policies

- `account_monthly_balance`
- `demand_adjustments`
- `demand_payment_allocations`
- `demand_register_backup_20261030`
- `society_os_execution_test`
- `transaction_demand_mapping_backup_20261030`

These currently fail closed for roles governed by RLS, but their intended consumers and retention status must be documented before any policy is added. Do not make backup/test tables broadly readable merely to clear an advisor warning.

### Eleven owner-privileged financial views

- `v_account_monthly_movement`
- `v_opening_balance_register`
- `v_member_financial_year_balance`
- `balance_register`
- `v_account_financial_year_balance`
- `v_demand_transaction_reconciliation`
- `v_member_financial_year_balance_calculated`
- `v_transaction_cutoff_exceptions`
- `v_party_financial_year_balance`
- `v_transaction_financial_year_movement`
- `v_member_cumulative_outstanding`

Previous read-only role tests confirmed anonymous `SELECT count(*)` access to these views. Observed row counts were respectively 33, 44, 88, 88, 16, 729, 88, 4, 112, 731 and 44. Counts are exposure evidence only; no member-level records were exported in that check.

The correct fix is not blindly changing every view to `security_invoker=true`: first map each view's UI/API/export consumers, ensure the caller has the required base-table grants and tenant-scoped RLS, test calculations, and then apply a coordinated view/grant migration. Where that cannot be safely achieved in the same cutover, revoke public/anon access and keep the view unavailable until a safe consumer is ready.

### Four SECURITY DEFINER functions executable by anon and authenticated

- `guard_audit_handover_release()`
- `guard_financial_year_freeze()`
- `guard_internal_audit_signoff()`
- `log_data_management_change()`

Inspect exact definitions and trigger dependencies before altering them. Revoke direct API execution unless a deliberate authenticated API contract requires it. Trigger-only functions should not remain exposed as public RPCs. Any retained SECURITY DEFINER function must have a pinned search path, explicit actor/membership checks and narrowly granted execute privileges.

## Migration history — hard blocker to local replay and production migration

Production currently records 38 migrations. The repository's tracked `supabase/migrations/` directory contains 27 SQL files.

- Exact version-and-name matches: 4.
- Production migration names present in the repo but with a different version: 22.
- Production migration source files missing by name: 12.
- Repository-only migration name: `guided_agm_compliance_workflow`.
- Production records `expand_financial_year_checklist_stages_for_guided_agm`; repository instead has a separately named guided AGM migration.
- The repository has two files with the same version prefix `20261107100000`, so local migration ordering is ambiguous.

The four exact matches are:
- `20261029045058_add_missing_transaction_correction_workflow.sql`
- `20261107031614_simple_annual_audit_account_closure.sql`
- `20261107031800_harden_annual_audit_close_guard.sql`
- `20261107031834_lock_audit_documents_after_fy_close.sql`

The 12 production migration sources missing by name are:
1. `20261029025439_society_import_single_active_batch_guard`
2. `20261029032138_remove_demand_due_date_check_for_historical_reporting`
3. `20261029053639_add_separate_verification_records`
4. `20261029054112_persist_audit_verification_findings`
5. `20261029055012_add_reconciliation_review_fields`
6. `20261029065021_add_monthly_reconciliation_review_confirmations`
7. `20261029082155_monthly_reconciliation_source_balance_contra_review`
8. `20261030103538_add_transaction_demand_mapping`
9. `20261103053350_correct_member_balance_sign_convention`
10. `20261104024135_audit_quality_exception_resolutions`
11. `20261104024239_audit_option_catalog_changes`
12. `20261106115244_expand_financial_year_checklist_stages_for_guided_agm`

A bounded search of available repository branches and commit history did not recover these source files. The live migration ledger exposes version/name metadata, not the original SQL bodies. An end-state schema dump cannot reliably reconstruct original data transformations, ordering, intent or rollback assumptions.

**Required source:** the original developer workspace/deployment artifact or a trusted backup containing the exact production migration SQL. Do not fabricate, rename, mark-as-applied or infer migration files. Do not run a local reset against the incomplete history and call it production-equivalent.

## Application access-path findings

The current application structure was inspected on the auth-gate branch:

- `src/App.tsx` routes all screen IDs through one shared application shell.
- `src/components/layout/Sidebar.tsx` renders the same navigation for every admitted user. No role/permission predicate is applied.
- `src/components/auth/AuthGate.tsx` admits any user with a non-empty `app_metadata.role` or `app_metadata.roles` string. This is a temporary admission check, not full authorization.
- `src/context/VerificationContext.tsx` performs shared reads and writes across financial, audit, reconciliation and master-data domains.
- `src/services/supabaseService.ts` and related service modules access tables and views directly.
- `src/components/admin/SettingsView.tsx` currently presents a generic settings/data-management page, not a working society-scoped membership and role assignment console.
- The settings page contains a hard-coded Varsha Nivas identity while the intended tenant for this work is Pearl Meadows C Wing. Society identity must come from the selected, authorized database tenant—not a static UI constant.
- The current navigation exposes administration, imports, transactions, audit evidence, reports and compliance screens without per-role screen/action checks.

A UI permission matrix must be derived from actual actions and data dependencies in each component, not merely from screen names. Direct table/view/RPC calls must be checked against the database policy independently. Hiding a menu item is not authorization.

## Phase A implementation sequence and acceptance gates

### A1 — Identity foundation
- Reconcile deployed schema and migration history first.
- Introduce society, membership, role, permission and membership-role assignment records using the reviewed Phase A1 draft as a starting point—not as ready-to-run SQL.
- Preserve Auth user, Party and society membership as distinct entities.
- Retain the confirmed existing Google-linked user as initial Society Admin only after a verified society membership and tenant association are created.
- Do not create `party_user_links` until existing party records can be mapped unambiguously to a society.
- Add active/suspended/expired membership lifecycle and audited role changes.
- Acceptance: no user gains access merely by signing in or by setting user-editable metadata.

### A2 — Database and API tenant security
- Classify every base table, view, RPC, trigger, Edge Function, storage bucket/object path and export as tenant-owned, shared reference, platform or archive.
- Add verified tenant association to every tenant-owned record and parent/child relationship.
- Backfill existing Pearl Meadows rows only after counts, foreign keys and orphan checks prove one-to-one ownership. Do not backfill unknown records by assumption.
- Implement membership/permission helpers with pinned search paths and deny-by-default behavior.
- Replace broad `true`, `auth.uid() IS NOT NULL` and global-admin-only policies with tenant membership + action + record-scope policies.
- Set FORCE RLS where appropriate after owner/service-role access patterns and triggers are verified.
- Harden the 11 financial views and all four flagged functions in the same tested release.
- Acceptance: anonymous, unassigned, suspended and cross-society users cannot read or mutate tenant data through any API path.

### A3 — Role and permission model
Use the existing eight Phase A3 presets. Permissions remain society-scoped and configurable; role names are not security boundaries by themselves. Apply permission verbs: `read`, `create_draft`, `edit_draft`, `submit`, `review`, `approve`, `post`, `reverse`, `sign_off`, `export`, `manage`. Enforce record scopes `own`, `linked_party`, `assigned`, `society`, `audit`.

Required invariants:
- A member can see only verified linked-party records.
- A member cannot see another member's balance or ledger.
- A requester cannot approve their own expense, even when multiple roles are assigned.
- Approval and payment execution are distinct.
- Treasurer posting/reversal is a trusted server-side operation with idempotency and audit evidence.
- Auditor access is time-bound and read-only for source financial records; auditor sign-off is independent.
- Role assignment/revocation is audited and takes effect promptly; stale JWT claims cannot preserve revoked access.

### A4 — Workflow contracts
Implement the already documented member payment and expense lifecycle contracts. Do not treat a screenshot as settlement proof, an approved expense as paid, or an ambiguous demand allocation as resolved. Use trusted posting operations, idempotency keys, append-only events and explicit reversals/corrections.

### A5 — Guided society onboarding
Implement onboarding so a new society is created with its own tenant identity, verified first admin membership, configurable role presets, buildings/units and onboarding status. A wing/building remains within its registered society unless it is itself a separate legal society. Do not let an unverified user self-claim ownership of an existing society.

### A6 — Historical import and provenance
Preserve source workbook checksum, sheet/row identity, parser/rule version, master mapping decisions and commit actor. Dry-run and review are read-only. Unmatched party/category/account/rule/demand references remain explicitly unidentified. Import commit is a separate authorized idempotent operation. Preserve all FY2018–19 raw facts and accepted report calculations.

## Required test matrix

Use synthetic data only for cross-tenant tests. The test matrix must include:

| Actor / scenario | Expected result |
|---|---|
| Anonymous | No tenant financial view, table, RPC or storage access |
| Google-authenticated but unassigned | Sign-in succeeds; no society data or application workspace |
| Society Admin in Society A | Manage memberships and permitted setup in A; no access to B |
| Treasurer in A | Financial read and permitted verified posting; cannot self-approve |
| Secretary in A | Governance and approved summaries; no ungranted posting |
| Chairman in A | Delegated approvals only within limits; no ungranted posting |
| Auditor in A | Time-bound read-only audit scope; cannot edit source financial records |
| Member linked to Party A | Own/linked-party data only |
| Requester | Own requests only; cannot approve own request |
| Caretaker | Assigned operational tasks only |
| Suspended/expired membership | Access denied immediately on server-side checks |
| User with roles in A and B | Permissions remain distinct by society |
| Cross-society foreign key/object ID | Rejected, including nested relationships and signed storage URLs |
| Multi-role requester/approver | Conflict-of-interest rule still blocks self-approval |
| Duplicate payment post retry | Exactly one financial posting/receipt |
| FY2018–19 regression | Balances, demands, receipts, allocations, ledgers and cash/bank totals unchanged |

Tests must cover REST table access, views, RPCs, Edge Functions, storage object reads/writes, CSV/Excel/PDF exports, nested relation queries and client-side route/action controls. Run database tests with role-specific JWTs and synthetic society A/B fixtures. A successful frontend build alone is not security validation.

## Current safe state

- PR #89 Google OAuth/admission preparation remains draft; latest reported CI run #625 passed build, typecheck and FY2018 import batch validation.
- PR #90 role inventory documentation is merged.
- PR #77 Phase A design package remains draft.
- The existing Society Admin Auth account has been identified read-only; no new membership/tenant rows have been created.
- No production DDL, grants, policies, view definitions, Auth metadata, storage policies, financial rows or migration ledger entries were changed during this execution.
- No paid Supabase branch or project was created.

## What is still needed to finish safely

1. Exact canonical SQL sources for the 12 missing production migrations and reconciliation of all 38 production migration versions against the repository.
2. A no-cost local PostgreSQL/Supabase test environment with the canonical schema and synthetic fixtures. No paid branch/project is required or approved.
3. Verified Pearl Meadows tenant backfill mapping for every tenant-owned table and dependent object.
4. Final society-specific approval limits/signatory combinations, Secretary/Chairman ledger visibility and auditor scope/expiry defaults.
5. A tested coordinated migration, rollback plan and FY2018–19 regression report.

Until these are satisfied, Phase A cannot honestly be marked complete or safely opened to additional users. The correct interim state is Google authentication preparation with no claim of full authorization.


## Additional Edge Function inspection — FY2018 workbook importer

The only active production Edge Function returned by the project inventory is `import-fy2018-workbook`, version 3, with JWT verification enabled. Its deployed source was inspected read-only. It uses the service-role key for all database writes, so database RLS does not constrain the function's writes. It currently authorizes by a global `app_metadata.role(s) = society_admin` claim, not by active membership in a selected society.

Additional hardening required before multi-society use:
- Replace the global role-claim authorization with server-validated active society membership and the import permission for the explicit target society.
- Bind each batch to a society ID and validate every referenced party, account, category, demand, transaction and related master against that same society.
- Restrict allowed request origins instead of returning wildcard CORS for a privileged service-role endpoint; CORS is defense-in-depth, not the authorization control.
- Make batch reservation atomic. The current read-then-insert check for a running batch is race-prone unless the deployed unique constraint fully covers the intended scope.
- Validate the complete row schema and allowed columns per table, not only a short required-field list.
- Verify the selected table is in the batch, row counts cannot be exceeded, and batch status remains Running at the point of each write.
- Make progress updates concurrency-safe; read-modify-write JSON row_counts can lose increments when concurrent chunks arrive.
- Scope status/count responses to the requesting society and avoid returning global operational counts.
- Ensure stale-batch cleanup is scoped, audited and safe under concurrent imports.
- Ensure all service-role paths write trusted actor, membership, society, batch and provenance metadata.
- Add adversarial tests for forged society IDs, arbitrary columns, duplicate/replayed chunks, concurrent starts, stale cleanup races, finish/retry races and cross-society foreign keys.

Do not deploy a replacement importer until the tenant schema, membership helper and importer contracts are in place. The existing version 3 function was not changed by this inspection.


## Recovery check against the user's Library

A Library search for the exact missing production migration filenames and migration SQL archives did not locate those production migration sources. It returned older schema-rebuild scripts, including scripts explicitly marked destructive (DROP/recreate operational tables). Those files are not canonical migration history and are not safe substitutes. They were not materialized, executed or edited. The production migration-source blocker therefore remains open.

# Phase A — Production tenant isolation and database security findings

**Inspection date:** 2026-11-07  
**Production project:** `hklibokniuwurdxndxfd`  
**Repository:** `parabs/SocietyOS-Inspector`  
**Inspection type:** Read-only Supabase catalog, policy, storage and advisor review  
**Purpose:** Establish the current security boundary before multi-society enablement. This document records findings and a remediation sequence; it does not authorize or apply production changes.

## Executive result

The current production database is **not tenant-isolated**. Row-level security is enabled on all 46 public base tables, but none of those tables contains a `society_id` column. The main financial-table policy is a global `society_admin` JWT claim, not membership in a particular society.

There is also a more immediate exposure: all 11 public financial views are selectable by both `anon` and `authenticated`, and Supabase's security advisor identifies all 11 as SECURITY DEFINER views. Their owner is `postgres`, the underlying tables do not have FORCE ROW LEVEL SECURITY enabled, and the views have no `security_invoker=true` option. As currently configured, these views can evaluate underlying queries with the view owner's permissions rather than the caller's RLS permissions. Anonymous access to these financial views must be treated as a high-priority exposure until reviewed and remediated.

No production schema, policy, storage object, function, key, migration history or financial record was changed during this review.

## 1. Tenant boundary inventory

| Check | Live result |
|---|---:|
| Public base tables | 46 |
| Base tables with RLS enabled | 46 |
| Base tables with `society_id` | 0 |
| Public views | 11 |
| Views selectable by `anon` | 11 |
| Views selectable by `authenticated` | 11 |
| Base tables with RLS enabled but no policy | 6 |
| Public RLS policies | 76 |
| Policies with unrestricted authenticated SELECT predicate (`true`) | 20 |
| Write policies whose condition is only that `auth.uid()` is non-null | 33 |

The six RLS-enabled/no-policy tables reported by Supabase are:

- `account_monthly_balance`
- `demand_adjustments`
- `demand_payment_allocations`
- `demand_register_backup_20261030`
- `society_os_execution_test`
- `transaction_demand_mapping_backup_20261030`

These tables are not directly accessible to ordinary authenticated clients under their current RLS policy set. Their use through service-role code or privileged views must be reviewed separately.

## 2. Current policy model

### Core financial tables

The main financial and master tables use the policy `society_os_admin_all`, with both USING and WITH CHECK calling `is_society_admin()`. That function checks only:

- `auth.jwt()->'app_metadata'->>'role' = 'society_admin'`, or
- whether `society_admin` appears in `app_metadata.roles`.

It does not check a society membership table, an active membership, a selected society, or a row's society ownership. This is a global application role, not a tenant boundary.

### Audit and compliance workflow tables

A number of workflow policies allow every authenticated user to read all rows (`USING (true)`) and allow inserts or updates whenever `auth.uid()` is non-null. The affected groups include audit observations, audit queries, audit handover packages/documents, audit adjustment proposals, closure approvals, financial-year audit workflow, and compliance records.

Authentication proves who the user is; it does not prove that the user belongs to the society or is authorized for that workflow action. These predicates are insufficient for a multi-society product and are too broad for many privileged audit actions even in the current deployment.

## 3. Financial view exposure

Supabase's security advisor reports 11 ERROR-level `security_definer_view` findings. Catalog inspection confirms that all 11 views are owned by `postgres`, have no `security_invoker=true` reloption, and grant SELECT to both `anon` and `authenticated`.

Affected views:

- `balance_register`
- `v_account_financial_year_balance`
- `v_account_monthly_movement`
- `v_demand_transaction_reconciliation`
- `v_member_cumulative_outstanding`
- `v_member_financial_year_balance`
- `v_member_financial_year_balance_calculated`
- `v_opening_balance_register`
- `v_party_financial_year_balance`
- `v_transaction_cutoff_exceptions`
- `v_transaction_financial_year_movement`

These views expose member balances, demands, receipts, party details, account movements and transaction reconciliation data. The underlying public tables have RLS enabled but not FORCE RLS. The combination of owner-context views and anonymous SELECT grants means the base-table policies cannot be relied on to protect these view results.

**Priority:** Restrict anonymous access to financial views and ensure view queries execute under the caller's intended security boundary. The exact change must be tested against every frontend report before production deployment; do not blindly revoke all view grants because the authenticated application currently consumes these views.

Supabase advisor reference: [Security Definer View (lint 0010)](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view).

## 4. Storage policy scope

The `audit-evidence` bucket is private, with a 25 MiB limit and a restricted document/image MIME allow-list. However, the three current `storage.objects` policies for this bucket allow any authenticated user to:

- insert an object into the bucket;
- read any object in the bucket;
- update any object in the bucket.

The policies check the bucket ID and authentication only. They do not check society membership, society-specific folder prefixes, document ownership, or audit-workflow permissions. The bucket being private prevents anonymous access, but it does not isolate one society's evidence from another authenticated user.

Before multi-society rollout, object paths and storage policies must bind each object to a society and verify active membership and role. Existing object paths must be inventoried before any path migration.

## 5. SECURITY DEFINER functions and advisor findings

Supabase's security advisor reported four SECURITY DEFINER trigger functions executable by both `anon` and `authenticated` roles:

- `guard_audit_handover_release()`
- `guard_financial_year_freeze()`
- `guard_internal_audit_signoff()`
- `log_data_management_change()`

These are trigger functions, so the advisor's direct RPC warning should be validated against the actual invocation behavior. Nevertheless, the EXECUTE grants should be narrowed to the minimum required for trigger creation/operation and the intended owner; do not change grants until dependencies and trigger behavior have been tested.

Additional advisor findings:

- `public.prevent_audit_record_mutation()` has a mutable search path.
- Leaked-password protection is disabled in Supabase Auth.
- Six tables have RLS enabled without policies (listed above).

Advisor references:
- [Mutable function search path (lint 0011)](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Anon can execute SECURITY DEFINER function (lint 0028)](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Authenticated can execute SECURITY DEFINER function (lint 0029)](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [RLS enabled without policy (lint 0008)](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)

## 6. Importer interaction

The FY2018 workbook importer uses the service-role key for database writes after checking a global `society_admin` app-metadata claim. Service-role access bypasses RLS. The recently merged source-only row-budget fix prevents a rejected oversized chunk from being upserted, but it does not create tenant isolation or solve concurrent chunk reservation.

Before the importer is used by multiple societies, it must:
1. resolve and validate the caller's active society membership server-side;
2. bind each batch to exactly one society;
3. validate every row and every referenced parent record against that society;
4. scope status, stale-batch cleanup, chunk updates and finish transitions to that society and batch;
5. reserve row budget and persist progress atomically;
6. verify actor attribution and reject cross-society batch/record IDs.

The deployed Edge Function was still version 3 at the last check; the source-only fix merged in PR #79 has not been deployed. No deployment is performed by this review.

## 7. Recommended remediation sequence

This is a design sequence, not an instruction to run production SQL immediately.

### Gate 0 — Protect current data

- Preserve the current single-society production records and export a verified backup before security changes.
- Identify which reports and screens depend on each public view.
- Test view access with anonymous, ordinary authenticated, society-admin and service-role contexts.
- Inspect current storage object paths and the frontend's upload/download call sites.
- Keep production financial records unchanged during the security work.

### Gate 1 — Restore a safe single-society security boundary

- Remove anonymous SELECT from financial views unless a specific view is intentionally public and contains no private data.
- Convert appropriate views to caller-context execution (for example, `security_invoker=true` where supported) and verify underlying grants/RLS.
- Replace broad authenticated workflow policies with explicit role/action authorization.
- Restrict storage operations to intended roles and object paths.
- Narrow direct EXECUTE grants for trigger-only SECURITY DEFINER functions and set a safe search path on every privileged function.
- Verify that current society-admin functionality still works after each change.

### Gate 2 — Establish tenant model without breaking current records

- Introduce a canonical societies table and a society-membership table with active/inactive status and explicit roles.
- Choose the active-society resolution contract (server-validated membership; never trust a client-supplied society ID by itself).
- Build a table-by-table ownership map before adding tenant keys. This includes master data, financial records, import batches, audit workflow, compliance, activity logs, corrections, and evidence.
- Backfill the existing Pearl Meadows data to one canonical society ID only after row counts, relationships, and financial totals have been reconciled.
- Add composite tenant-aware uniqueness and foreign-key constraints where identifiers or references must be unique within a society.
- Ensure every child row's society matches its referenced parent; do not rely on a client filter.

### Gate 3 — Enforce and test tenant isolation

- Add society-scoped RLS predicates based on active membership and role.
- Apply the same scope to views, RPCs, Edge Functions, storage paths and background jobs.
- Add automated cross-tenant tests for SELECT, INSERT, UPDATE, DELETE, RPC, import batches, and file access.
- Include tests for a user who belongs to two societies, a revoked member, a pending member, and a user with no membership.
- Only enable a second society after negative cross-tenant tests pass and the existing Pearl Meadows financial regression suite remains green.

## 8. Explicit non-actions and release blockers

- No production DDL/DML, policy change, grant change, key rotation, storage move, Edge Function deployment or migration-ledger change was made.
- No new Supabase project or paid branch was created.
- The 12 missing production migration SQL bodies documented in the migration reconciliation report remain a separate replay blocker. Do not invent or apply replacement SQL to work around that history gap.
- Do not launch multi-society access until tenant membership, view security, storage isolation and importer scope are enforced and tested.
- Any production security change that can affect current users or reports requires an explicit go-ahead after the proposed migration and rollback plan is presented.

## 9. Evidence and scope limitations

Evidence came from read-only inspection of the live production PostgreSQL catalogs (`pg_class`, `pg_attribute`, `pg_policies`, `pg_proc`, `pg_constraint`, `information_schema.triggers`), Storage bucket metadata and the Supabase security advisor on 2026-11-07.

This report does not claim that every application route or every external integration has been penetration-tested. The next safe step is to map view/storage consumers in the repository and prepare a tested remediation plan, not to infer that a policy change is safe from catalog inspection alone.


## 10. Frontend dependency and evidence-path review

A repository review confirms that the browser application initializes Supabase with the public anon/publishable key and persists the user's Supabase session. This is expected for a browser client; it means database security must be correct at the database/API boundary and cannot depend on hiding the public key.

The current audit screens consume the exposed views and directly query workflow tables:

- `VerificationContext` reads `v_account_financial_year_balance`, `balance_register`, `v_member_financial_year_balance`, `v_party_financial_year_balance`, `v_member_cumulative_outstanding`, and `v_demand_transaction_reconciliation`.
- `FinancialYearGovernance` directly reads and writes review, checklist, observation, query, adjustment, handover, approval, snapshot, transaction, demand and account-balance tables. The main filters shown in the inspected code are financial-year filters, not society filters.
- `AnnualAuditAccountClosure` directly reads/writes closure, document and reconciliation tables and consumes `v_account_financial_year_balance`.

This means a view-security or policy correction must be validated against these consumers. In particular, the six RLS-enabled/no-policy tables are queried directly by the app in some workflows; their current policy state may produce access errors for normal authenticated users. Do not solve that by granting broad access. Add the intended role and membership checks first.

### Evidence upload paths

Two frontend upload paths were inspected:

- Financial-year governance handover evidence: `<financial-year>/<handover-id>/<document-id>_<filename>`.
- Annual audit closure evidence: `<financial-year>/annual-audit/<timestamp>_<filename>`.

Neither path begins with a society identifier. Current storage policies also do not validate a society folder prefix. A multi-society path convention should use a server-validated society ID as the first path segment, for example `<society-id>/<financial-year>/...`, with policies verifying both membership and object-path scope. Existing paths need an explicit migration plan so prior evidence links are not broken.

### Client-supplied audit attribution

The inspected `FinancialYearGovernance` handlers submit actor display names and roles from client-side form state (with fallback labels such as `Society OS User`). These fields are useful as a human-readable attestation, but must not be treated as verified identity or authorization. The authenticated user ID should be derived server-side from `auth.uid()`; role and society membership must be checked independently. Preserve the entered signatory name as an attestation field, clearly distinct from the authenticated actor.

### Impact on remediation order

1. First, restrict anonymous financial-view access and test every listed view consumer with a real authenticated session.
2. Next, redesign audit/compliance policies so read and write rights are role-specific; use verified user IDs for audit actor attribution.
3. Then migrate storage paths and policies in a backwards-compatible way.
4. Only after the single-society experience is regression-tested should the society membership model and tenant keys be introduced across the schema.

## 11. Additional evidence and scope limitations

The frontend review covered `src/services/supabaseClient.ts`, `src/context/VerificationContext.tsx`, `src/components/financial/FinancialYearGovernance.tsx`, and `src/components/financial/AnnualAuditAccountClosure.tsx` on the repository's `main` branch. It was a static source review, not a browser penetration test or a test with an anonymous JWT against production endpoints.


## 12. Application-wide authentication and role presentation

The current application shell does not establish an authenticated session before rendering the workspace:

- `src/App.tsx` wraps the application in `VerificationProvider`; there is no application-wide auth/session gate or protected-route check.
- The browser Supabase client uses the public anon/publishable key, which is expected, but anonymous database permissions therefore matter.
- `src/config/index.ts` contains a fixed `APP_CONFIG.currentReviewer` name, role, initials and email.
- `src/components/layout/Header.tsx` renders that fixed reviewer identity and labels it "Authorized Reviewer"; it does not derive the displayed identity from `auth.getUser()`.
- `src/components/layout/Sidebar.tsx` displays the navigation without role-based guards. The `user-access` screen is routed to the same `SettingsView` as `settings`; it is not a separate user/role administration module in the inspected route map.

This is not a criticism of the public anon key itself. It means the application is currently a single-workspace UI with static reviewer presentation, not an authenticated multi-user workspace. Combined with anonymous SELECT on the 11 owner-context financial views, an unauthenticated visitor may be able to query financial view data through the Supabase API even if the UI is later hidden behind a login screen. A UI login screen alone would not fix the database exposure.

**Required before any public multi-user release:** implement a real session gate, derive user identity from the verified Supabase session, enforce route/action permissions in the database, and independently remove anonymous access to private financial datasets. Do not rely on sidebar visibility, a hard-coded reviewer label, or client-supplied actor fields as security controls.


## 13. Anonymous-role view access — direct database verification

A follow-up read-only test explicitly switched the SQL session to the PostgreSQL `anon` role inside a transaction, queried row counts only, and rolled the transaction back. No row contents were selected or exported.

The direct test returned the following visible row counts:

| Public financial view | Rows visible to `anon` |
|---|---:|
| `balance_register` | 88 |
| `v_account_financial_year_balance` | 16 |
| `v_account_monthly_movement` | 33 |
| `v_demand_transaction_reconciliation` | 729 |
| `v_member_cumulative_outstanding` | 44 |
| `v_member_financial_year_balance` | 88 |
| `v_member_financial_year_balance_calculated` | 88 |
| `v_opening_balance_register` | 44 |
| `v_party_financial_year_balance` | 112 |
| `v_transaction_cutoff_exceptions` | 4 |
| `v_transaction_financial_year_movement` | 731 |

A corresponding count query against `public.transactions` under the same `anon` role returned zero rows. This confirms that the underlying table's RLS boundary is not protecting the owner-context view results.

**Severity update:** this is a verified anonymous financial-data exposure, not merely a static advisor warning. It should be treated as a priority incident for the current single-society deployment as well as a blocker to multi-society rollout.

**No mitigation was applied.** Removing anonymous view grants or changing view execution mode is a production permission/schema change and could affect current report consumers. The safe next step is to prepare and test the least-disruptive view/grant correction, with a rollback plan, then obtain explicit approval before applying it to production.

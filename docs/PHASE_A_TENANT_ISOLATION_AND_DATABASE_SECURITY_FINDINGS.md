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

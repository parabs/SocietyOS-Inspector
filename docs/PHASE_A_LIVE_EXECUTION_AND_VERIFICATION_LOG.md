# Phase A — live execution and verification log

**Updated:** 2026-11-07  
**Production project:** `hklibokniuwurdxndxfd`  
**Repository:** `parabs/SocietyOS-Inspector`

## Production change completed

Applied migration `20261107174146_phase_a_revoke_anon_financial_views_and_lock_trigger_functions`.

- Removed `PUBLIC` and `anon` privileges from all 11 financial reporting views.
- Preserved authenticated `SELECT` access temporarily so the existing signed-in admin application is not intentionally cut off before its consumers are migrated.
- Removed authenticated write-style privileges from those views.
- Set an empty `search_path` on five trigger-only functions whose object references are schema-qualified.
- Revoked direct `EXECUTE` from `PUBLIC`, `anon` and `authenticated` on those trigger functions. Database trigger invocation remains the intended execution path.

## Additional production change completed

Applied migration `20261107174331_phase_a_restrict_legacy_rpc_and_trigger_function_execution`.

- Removed direct client execution from three trigger-only functions and set a fixed empty search path on the governance activity trigger.
- Restricted the legacy missing-transaction correction RPC to authenticated callers. Its existing internal Society Admin check remains a legacy global-claim check and must be replaced before multi-society use.
- Kept the `is_society_admin()` helper callable only by authenticated users because current RLS policies still depend on it.

## Additional production change completed

Applied migration `20261107174556_phase_a_lock_unscoped_audit_evidence_storage`.

- Removed the three broad authenticated policies from the private `audit-evidence` bucket.
- Preflight confirmed zero objects in the bucket and zero populated evidence paths in the three linked evidence tables.
- The bucket remains private. Evidence upload/download is intentionally blocked until society + record + permission-scoped storage paths and signed URL checks are implemented.

## Verification

The post-migration catalog query confirmed:
- Anonymous `SELECT` is false for all 11 financial views.
- Authenticated `SELECT` remains true for all 11 views.
- Authenticated INSERT/UPDATE/DELETE are false for all 11 views.
- Direct anon/authenticated EXECUTE is false for the five trigger functions.
- Migration ledger contains the new migration version.

The matching assertion script is `supabase/tests/phase_a_security_containment_assertions.sql`.

## Important residual risk — not yet solved

This is containment, not complete tenant authorization. Authenticated users can still read the existing security-definer views, and those views still derive data from legacy tables without society keys. Do not enable member, auditor, requester or caretaker access, and do not treat the app's current role-claim gate as full authorization.

The next coordinated phases remain:
1. Add and test society identity, memberships, society-scoped roles and permission catalogue.
2. Verify and seed the Pearl Meadows tenant/admin membership through a controlled, auditable process.
3. Add tenant keys and enforce same-society relationships on all tenant-owned base records.
4. Replace global/authenticated-only RLS with active-membership and permission checks.
5. Convert financial views to invoker-safe or narrowly scoped server-side read paths only after source lineage and FY2018–19 regression tests pass.
6. Scope storage objects, Edge Functions, imports, exports and privileged RPCs.
7. Complete positive and negative tests for all eight roles, unassigned users, removed memberships and cross-society attempts.

## Migration history reconciliation

The live Supabase migration ledger currently contains 39 entries. It records all 12 previously identified missing production migration names/versions. Their original SQL bodies have not yet been recovered from the connected Git repository branches inspected so far. Do not fabricate those historical files or mark replacement migrations as applied. The new forward migration above is separately recorded and source-controlled here.

## Cost and data safeguards

No paid Supabase branch/project was created. This migration did not alter financial rows, existing society masters, Auth metadata, memberships, storage objects or historical calculations.

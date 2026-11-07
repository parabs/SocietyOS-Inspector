# Phase A — FY2018 import Edge Function security and integrity review

**Inspection date:** 2026-11-07  
**Production project:** `hklibokniuwurdxndxfd`  
**Function:** `import-fy2018-workbook`  
**Deployed version:** 3  
**Method:** Read-only deployed-function retrieval, GitHub source comparison, and catalog inspection  
**Production changes:** None

## Executive result

The deployed Edge Function source matches `supabase/functions/import-fy2018-workbook/index.ts` on GitHub `main` byte-for-byte at inspection time (10,872 characters). Supabase reports `verify_jwt=true`.

The function is designed for the current single-society admin import. It is **not yet a tenant-aware import boundary** and must not be reused for multi-society imports without authorization and data-scope changes.

## Current execution model

1. The function validates the incoming bearer token with Supabase Auth.
2. It checks the user's `app_metadata.role` or `app_metadata.roles` for the global `society_admin` marker.
3. It then creates a Supabase client using the service-role key.
4. It performs batch status, batch creation, upsert, and completion operations with that privileged client.

The live RLS policies on the relevant import and financial tables use `is_society_admin()`, which also checks the global JWT app-metadata role. The function's authorization model is therefore consistent with the existing single-society admin model, but it does not establish active membership in a selected society.

Because the service-role client bypasses RLS, tenant validation cannot be delegated to table policies. The Edge Function or a trusted database operation must explicitly validate the active society and every target row before a multi-tenant rollout.

## Findings

| Priority | Finding | Consequence | Required treatment |
|---|---|---|---|
| P0 before multi-tenant import | Authorization checks only a global `society_admin` app-metadata claim; there is no active-society membership check. | A platform-level admin claim is not a tenant boundary. | Require authenticated active membership and an explicit society context; verify permission for the import operation. |
| P0 before multi-tenant import | The service-role client performs all writes and bypasses RLS. | Any missing Edge Function scope check can cross tenant boundaries. | Validate batch society, allowed tables, and every row's society/parent relationships before writes. Prefer one trusted transactional posting/import operation. |
| P1 data integrity | The original batch handler checked whether a chunk exceeded the declared row count **after** the upsert. | An over-budget request could return HTTP 400 after target records had already been written. | Source fix prepared in PR #79: prevalidate the next chunk before the upsert. Not deployed. |
| P1 data integrity | Chunk progress is a read-modify-write of the batch JSON field with no atomic reservation/lock. | Concurrent chunk requests can race, lose progress updates, or both pass a stale row-budget check. | Replace with a transactional RPC or locked database operation that reserves the chunk budget and writes rows atomically. |
| P1 data integrity | The upsert allow-lists table names and required fields, but does not define a strict allowed-column schema for every table. | A caller with import permission can submit additional writable columns to the service-role upsert. | Validate and project each row against explicit per-table column allow-lists and types. |
| P1 workflow integrity | Stale-batch cleanup does not check the update error before continuing. | The function can proceed without knowing whether stale batches were successfully closed. | Check and handle the cleanup result before testing for an active batch. |
| P1 workflow integrity | Batch completion updates by batch ID without a conditional `status = 'Running'` predicate or a verified affected-row result. | Concurrent finish requests can race. | Make completion a conditional, transactional state transition and verify exactly one row changed. |
| P2 exposure reduction | CORS allows every origin (`*`). | Browser callers from any origin can reach the endpoint, although authentication is still required. | Restrict origins to the deployed application domains where practical; do not treat CORS as an authorization control. |
| P0 before multi-tenant import | `status` counts all rows across import tables and returns the active batch without society scope. Stale-batch cleanup is also global. | Future tenants could see aggregate operational metadata or affect each other's import state. | Scope status, counts, stale cleanup, and active-batch uniqueness to the selected society. |

## Existing database guard

The live policy inventory shows `society_import_batches`, `transactions`, `demand_register`, `party_master`, `society_dropdown_options`, `society_correction_log`, and `party_category_rules` protected by the same authenticated `is_society_admin()` policy. This is the current single-society policy, not a membership-based tenant policy.

The database has a trigger-based change logger on `party_master` and `transactions`. The import path uses service-role writes, and the logger attributes changes from the request JWT context only when the relevant JWT context is available to the database session. Audit attribution should be explicitly tested for the service-role import path before relying on it as a complete actor trail.

## Source correction prepared

PR #79 moves the row-budget check ahead of the target-table upsert and adds five focused tests for the pure validation helper. The five helper tests passed under Node 22's TypeScript type-stripping support.

This patch does **not** solve concurrent chunk reservation, tenant scoping, strict per-table column validation, or atomic completion. It has not been merged or deployed. Deno is not installed in the current environment, so a full Edge Runtime integration test was not run.

## Release gate

Do not deploy a multi-tenant version of this function until:
1. active society membership and import permission are checked server-side;
2. the batch is bound to one society and the caller's permitted scope;
3. row/table allow-lists and parent/child tenant consistency are enforced;
4. chunk budget reservation, upsert and progress update are atomic;
5. finish/stale transitions are conditional and concurrency-safe;
6. import actor attribution is verified;
7. cross-tenant tests prove that one society cannot inspect or alter another society's batches or financial records.

## Safety status

- Deployed function retrieved read-only; no function deployment performed.
- GitHub source retrieved read-only before the source-only PR.
- No financial rows, import batches, schema, migration history, policies, keys or secrets were changed.

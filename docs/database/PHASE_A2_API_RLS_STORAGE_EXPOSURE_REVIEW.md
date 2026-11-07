# Phase A2 — API, RLS and evidence-storage exposure review

**Inspection date:** 2026-11-07  
**Project:** `hklibokniuwurdxndxfd`  
**Method:** Read-only PostgreSQL catalog queries.  
**Change class:** Review document only. No production changes.

## Executive result

The access-control review found that the view concern is part of a wider issue. Current policies on core financial tables use a global JWT role helper, while several workflow tables allow any authenticated user to read or write based only on being signed in. The private audit-evidence bucket is also not scoped to an owner, society, workflow record, or object path.

Do not expose member, tenant, auditor, or committee access until a consistent active-society membership boundary is implemented across tables, views, storage and server-side functions.

## 1. Financial view grants — confirmed

For each of the 11 public financial views listed in `PHASE_A2_FINANCIAL_VIEW_SECURITY_REVIEW.md`, `information_schema.role_table_grants` confirms that both `anon` and `authenticated` have all of these privileges:

- SELECT
- INSERT
- UPDATE
- DELETE
- TRUNCATE
- TRIGGER
- REFERENCES

The views are owned by `postgres` and are not configured with `security_invoker=true`. This is an excessive privilege surface. Whether a specific write operation succeeds also depends on view updatability and underlying privileges; the grant itself is still unnecessarily broad.

**Required design:** no anonymous financial view access; no write-style view grants; no blanket authenticated SELECT. Preserve existing admin use only through a narrowly reviewed compatibility path until membership-aware RLS is ready.

## 2. Core financial table policies

Read-only policy inspection confirms these core tables use a policy named `society_os_admin_all` for `authenticated`, with both USING and WITH CHECK calling `is_society_admin()`:

- `account_master`
- `category_master`
- `demand_register`
- `flat_owner_master`
- `member_opening_balances`
- `party_master`
- `rules_master`
- `transactions`

The helper reads global JWT `app_metadata.role/roles`. It does not validate that the user has an active membership in the society whose records are being accessed. It is therefore a single-global-admin gate, not a multi-tenant authorization model.

The policy names and predicate do not themselves prove that all other financial tables have equivalent controls. Every table, including allocation, adjustment, correction, verification, import and source evidence tables, needs an explicit access classification.

## 3. Workflow policies that only check authentication

The following exact policies were observed:

| Table | Policy | Operation | Predicate | Risk |
|---|---|---|---|---|
| `compliance_obligations` | `compliance_obligations_read` | SELECT | `true` | Every authenticated user can read all rows. |
| `compliance_obligations` | insert/update/delete policies | INSERT/UPDATE/DELETE | `auth.uid() IS NOT NULL` | Any authenticated user can mutate records. |
| `financial_year_checklist` | `audit_workflow_read` | SELECT | `true` | Every authenticated user can read all checklist rows. |
| `financial_year_checklist` | audit workflow insert/update | INSERT/UPDATE | `auth.uid() IS NOT NULL` | Any authenticated user can change checklist rows. |
| `governance_task_activity` | read activity | SELECT | `true` | Activity history is globally readable to authenticated users. |
| `governance_task_activity` | insert activity | INSERT | actor id must equal `auth.uid()` | Actor identity is constrained, but society/task authorization is not established. |

Other audit, compliance, governance and FY workflow tables also have authenticated policies. These must be reviewed individually for read, insert, update, delete, approval, sign-off and immutable-history semantics. Authentication alone is not authorization.

## 4. Evidence storage

The live storage catalog shows one private bucket:

- Bucket: `audit-evidence`
- Public: false

Its object policies currently allow:

- INSERT for authenticated users when `bucket_id = 'audit-evidence'` and `auth.uid() IS NOT NULL`.
- SELECT for authenticated users when `bucket_id = 'audit-evidence'`.
- UPDATE for authenticated users when `bucket_id = 'audit-evidence'`.

The predicates do not bind the object to a society, an uploader, a workflow entity, or a permitted role. The bucket is private at the bucket metadata level, but the authenticated object policies still permit broad access through the storage API. The catalog query found no object rows in the bucket at inspection time; confirm this again before any storage migration.

**Required design:**
1. Use an opaque, tenant-scoped object key such as `societies/{society_id}/{workflow}/{record_id}/{object_id}`.
2. Validate active society membership and role for upload, read, update and delete.
3. Prefer immutable evidence objects after submission; corrections should create a new version or replacement record with an audit trail.
4. Link each object to a typed evidence record with society ownership and lifecycle status.
5. Never rely on a client-supplied path segment or actor field as authorization.
6. Test signed URL issuance, expiry, object enumeration and cross-society path guessing.

Do not simply add a folder prefix check unless the server verifies that the prefix's society matches the caller's active membership and the referenced record.

## 5. Repository consumer investigation — limitation

A GitHub code-search pass for the exact view names and common Supabase view-query patterns returned no indexed matches. This does **not** establish that the views are unused. The repository code-search index may be incomplete, queries may not match generated access paths, and some consumers may be in Edge Functions, deployment configuration, generated bundles, or external scripts.

Before any grant change, inspect a complete checkout and search all source files, Edge Functions, SQL, migrations, exports, scripts and deployment configuration for:
- exact view names;
- `supabase.from(...)`, `client.from(...)`, RPC calls and raw SQL;
- reporting and dashboard hooks;
- service-role jobs and scheduled functions.

The local checkout/CLI is still unavailable in this environment. No consumer was declared unused.

## 6. Consolidated remediation priority

### P0 — before any member or multi-tenant access
1. No anon access to financial views; remove unnecessary write grants after confirming admin consumer paths.
2. Replace global-admin-only and authentication-only policies with active-society membership and explicit permission checks.
3. Enforce tenant ownership on every base-table relationship used by views.
4. Tenant-scope evidence storage and signed URL issuance.
5. Review Edge Functions and SECURITY DEFINER functions for service-role bypasses.
6. Add negative cross-tenant tests for reads, writes, exports, evidence and derived views.

### P1 — before enabling committee/auditor workflows
1. Define role/permission matrix for Society Admin, Treasurer, Secretary, Chairman, Auditor, Member, requester and caretaker.
2. Separate read, propose, approve, post, reverse, sign-off and release privileges.
3. Keep immutable audit and financial evidence history append-only.
4. Ensure audit close/financial-year freeze guards cannot be bypassed by direct table writes or function invocation.

### P2 — operational hardening
1. Set appropriate storage object size/MIME limits and validate server-side.
2. Add upload/download audit events and evidence retention controls.
3. Review leaked-password protection with the project owner.
4. Review unindexed FKs, RLS initplan warnings and duplicate indexes only after migration provenance is reconciled.

## 7. Production restrictions

No policy, grant, view, function, bucket, object, record, Auth setting or migration history was changed. This is a read-only findings document. It does not authorize production security changes.

Canonical production migration SQL remains necessary before a faithful local replay. Do not create a replacement migration history from current catalog state.

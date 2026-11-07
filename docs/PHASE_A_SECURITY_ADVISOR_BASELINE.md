# Phase A — Supabase security and performance advisor baseline

**Inspection date:** 2026-11-07  
**Project:** `hklibokniuwurdxndxfd`  
**Method:** Supabase advisors, read-only  
**No changes:** No SQL, grants, policies, functions, views, storage or data were modified.

## Executive result

The live advisor run reports important pre-existing security findings that must be resolved before any member-facing access or multi-tenant rollout. The findings do not mean that the new Phase A1 identity tables have been deployed; they have not.

## Security advisor findings

| Advisor | Count | Level | Meaning / next action |
|---|---:|---|---|
| RLS enabled, no policy | 6 | Info | Includes empty allocation/adjustment/monthly-balance tables, dated backups and the test table. Confirm intended access and archival treatment; do not add broad policies merely to silence the advisor. |
| SECURITY DEFINER views | 11 | Error | All 11 current financial views are flagged. Review view definitions and grants; use invoker security where compatible with the required calculation access, or restrict view access and expose through a trusted server path. Do not mass-convert without report regression tests. |
| Mutable function search_path | 1 | Warning | `public.prevent_audit_record_mutation()` has a role-mutable search path. Inspect exact function body and trigger dependencies; harden with a fixed search path in a separately tested change. |
| SECURITY DEFINER function executable by anon | 4 | Warning | Trigger functions `guard_audit_handover_release()`, `guard_financial_year_freeze()`, `guard_internal_audit_signoff()`, and `log_data_management_change()` are callable by anon according to grants. Review and revoke unnecessary direct EXECUTE exposure while preserving trigger operation. |
| SECURITY DEFINER function executable by authenticated | 4 | Warning | Same four functions are callable by authenticated users according to grants. They are trigger functions; direct RPC execution should not be needed. Verify trigger behavior before changing grants. |
| Leaked password protection disabled | 1 | Warning | Auth setting should be reviewed by the project owner and enabled if compatible with the account/password policy. No Auth setting was changed. |

### Flagged views

1. `balance_register`
2. `v_account_financial_year_balance`
3. `v_account_monthly_movement`
4. `v_demand_transaction_reconciliation`
5. `v_member_cumulative_outstanding`
6. `v_member_financial_year_balance`
7. `v_member_financial_year_balance_calculated`
8. `v_opening_balance_register`
9. `v_party_financial_year_balance`
10. `v_transaction_cutoff_exceptions`
11. `v_transaction_financial_year_movement`

The view advisor identifies SECURITY DEFINER behavior, which can cause underlying table access to follow the view owner's privileges/RLS rather than the querying user's. This is a material tenant-isolation concern. Each view's source tables, joins, filters, grants and consumer paths must be reviewed individually.

## Performance advisor findings

| Advisor | Count | Level | Next action |
|---|---:|---|---|
| Unindexed foreign keys | 11 | Info | Review query patterns and add covering indexes where justified. Several relate to empty workflow/child tables; do not index blindly. |
| Auth RLS initplan | 27 | Warning | Existing policies call auth/current-setting functions per row. When revising policies, use scalar subselect form such as `(select auth.uid())` where appropriate. |
| Tables without primary key | 2 | Info | Both are dated historical backup tables. Preserve their evidence; do not add keys or mutate them without an archival decision. |
| Unused indexes | 9 | Info | Do not drop based solely on current usage; low-volume and newly introduced features may not yet exercise them. |
| Duplicate indexes | 2 | Warning | Duplicate pairs reported on `member_opening_balances` and `society_import_batches`. Review constraints, dependencies and migration provenance before removing either index. |

## Prioritised remediation sequence

### P0 — before member access or multi-tenant enablement
1. Review and secure all 11 SECURITY DEFINER views.
2. Review the four SECURITY DEFINER trigger functions' direct EXECUTE grants; remove unnecessary RPC exposure without breaking trigger execution.
3. Review existing broad authenticated policies and replace them only with active-society membership authorization after local tests.
4. Keep member-facing features disabled until views, base tables, storage, functions and Edge Functions all enforce the same tenant boundary.

### P1 — before production identity/tenant rollout
1. Fix the mutable search path on `prevent_audit_record_mutation()` after reviewing its dependencies.
2. Review storage bucket policies and object path design for society/workflow scoping.
3. Rework auth RLS initplan patterns as policies are replaced.
4. Add indexes for tenant-scoped and FK joins based on actual query plans.

### P2 — maintenance
1. Review duplicate indexes and migration provenance.
2. Review unused indexes after representative usage.
3. Confirm archival handling for backup tables and the test artifact.
4. Ask the project owner to review leaked-password protection.

## Important implementation cautions

- Do not change every view to `security_invoker = true` in one migration. Some existing views may depend on owner privileges and would stop working; test each view with the real application role and report totals.
- Do not assume revoking EXECUTE from trigger functions breaks triggers; PostgreSQL checks trigger-function EXECUTE at trigger creation, but verify the actual deployment behavior and preserve migration reproducibility.
- Do not modify or drop duplicate/unused indexes until canonical production migration history is recovered.
- Do not use a SECURITY DEFINER helper in exposed `public` as a shortcut for tenant checks.
- Existing single-society admin workflows must continue to work during the transition; security tightening needs a compatibility and rollback plan.

## Status

This is an advisor snapshot, not a remediation migration. No production setting, grant, policy, function, view, index, storage policy, row or migration record was changed.


## Additional catalog inspection — view grants and trigger function definitions

A read-only catalog query confirmed that all 11 public views:
- are owned by `postgres`;
- have no `security_invoker=true` reloption (the reloptions are empty);
- grant SELECT and broad table-style privileges (including INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER and REFERENCES) to both `anon` and `authenticated`.

The effective ability to mutate a particular view depends on whether PostgreSQL considers it automatically updatable and on underlying privileges/rules. Nevertheless, these grants are unnecessarily broad and, combined with owner-context view behavior, create an avoidable exposure. The remediation must explicitly reduce view grants to the minimum required (normally SELECT for the intended authenticated application role, and no anon access) after identifying current application consumers. Do not assume all views should be readable by all authenticated users in the eventual multi-tenant model.

Catalog inspection of the four flagged SECURITY DEFINER trigger functions confirmed:
- Each is a trigger-returning function, not a business RPC intended for direct clients.
- Each has `search_path=public`.
- `anon` and `authenticated` currently have EXECUTE privilege.
- The three guard functions read audit/closure workflow tables to enforce sign-off/release/freeze requirements.
- `log_data_management_change()` writes actor attribution using JWT email or `auth.uid()` into the data-management change log.

A separate function, `prevent_audit_record_mutation()`, is SECURITY INVOKER but has no fixed `search_path`; its body raises an immutable-record exception. Its search path should be fixed as a low-risk hardening change only after confirming the trigger binding and canonical migration source.

The existing `is_society_admin()` helper is SECURITY INVOKER and reads `app_metadata.role/roles` from the JWT. This confirms it is a global-role helper, not an active-society membership authorization check.

**Priority update:** the combination of SECURITY DEFINER views, `postgres` ownership, missing security-invoker options, and anon/authenticated grants means public-view access should be treated as a P0 security gate. Before exposing any new member or tenant functionality, inspect the actual API exposure and application paths, then prepare a least-privilege view/grant migration with report regression tests.

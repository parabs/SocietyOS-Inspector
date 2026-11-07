# Phase A2 — Base-table RLS coverage snapshot

**Inspection date:** 2026-11-07  
**Project:** `hklibokniuwurdxndxfd`  
**Method:** Read-only catalog inventory of public base tables and RLS policies.

## Coverage snapshot

- Public base tables inspected: **46**
- RLS enabled: **46 of 46**
- RLS forced: **0 of 46**
- Tables with at least one policy: **40**
- Tables with no policy: **6**

RLS being enabled is not equivalent to tenant isolation. The existing policy predicates still need to be checked for active-society membership, and SECURITY DEFINER views/functions and service-role paths must be reviewed separately. The current global `is_society_admin()` predicate does not provide active-society tenant authorization.

## Six tables with RLS enabled but no policy

| Table | Initial treatment |
|---|---|
| `account_monthly_balance` | Empty/derived financial table per prior row-count snapshot. Keep deny-by-default until its intended consumer and refresh path are confirmed. |
| `demand_adjustments` | Empty adjustment workflow table per prior row-count snapshot. Keep deny-by-default; later define explicit propose/approve/read permissions. |
| `demand_payment_allocations` | Empty central allocation table per prior row-count snapshot. Keep deny-by-default; only trusted allocation workflow should write. |
| `demand_register_backup_20261030` | Historical backup evidence. Preserve; decide archival access separately. |
| `society_os_execution_test` | Test artifact. Confirm purpose and whether it should remain in production; do not expose by default. |
| `transaction_demand_mapping_backup_20261030` | Historical mapping backup evidence. Preserve; decide archival access separately. |

## Policy-bearing tables

The remaining 41 tables have one or more policies. This does not mean all policies are safe. The current inventory identified:
- Core financial masters/transactions protected by a global JWT role helper.
- Several compliance and FY workflow policies that allow all authenticated users to read or mutate rows.
- Governance activity read access that is globally available to authenticated users.
- Audit and closure workflow policies that require separate permission and immutability review.

See `PHASE_A2_API_RLS_STORAGE_EXPOSURE_REVIEW.md` for the exact sampled policy expressions and `PHASE_A_SECURITY_ADVISOR_BASELINE.md` for the wider advisor findings.

## Enforcement implications

1. Do not add broad policies to the six no-policy tables just to remove advisor notices.
2. Do not blindly set FORCE ROW LEVEL SECURITY on every table; review owners, service-role paths, migration jobs, views and trusted maintenance workflows first.
3. For every society-owned table, define a tenant ownership key and a trusted path for validating it.
4. Ensure child rows cannot reference a parent from another society; use tenant-aware composite relationships or guarded write paths.
5. Distinguish global product configuration, society-owned operational records, immutable historical backups and test artifacts.
6. Keep member access disabled until negative cross-tenant tests cover direct table queries, views, RPCs, storage and exports.

## Status

This is an inventory only. No RLS policy, table setting, grant, row or schema object was changed. Canonical production migration SQL remains required before faithful local replay.

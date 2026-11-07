# Society OS — Phase A approvals and A2 preflight status

**Repository:** `parabs/SocietyOS-Inspector`  
**Branch:** `foundation/sprint-1-domain-architecture`  
**Status:** User confirmations received; production data and schema unchanged.

## Confirmed by the user

1. Every existing record in Supabase project `hklibokniuwurdxndxfd` belongs exclusively to **PEARL MEADOWS C-TYPE WING CO-OPERATIVE HOUSING SOCIETY LTD.**
2. The existing Auth user is designated as the initial Society Admin.
3. The product is a non-profit initiative; the user declined the additional recurring cost of a Supabase development branch. Phase A validation must use local tooling and read-only production checks.

Read-only Auth lookup identified exactly one user:
- Auth UUID: `3f0cb220-de2d-4c08-9380-39a160842afd`
- Account email is intentionally not copied into this repository document.

## Current database baseline (2026-11-07)

The public schema inventory returned 47 base tables. Selected financial and source tables:

| Table | Rows |
|---|---:|
| party_master | 58 |
| account_master | 8 |
| category_master | 47 |
| rules_master | 19 |
| flat_owner_master | 39 |
| source_register | 12 |
| transactions | 731 |
| demand_register | 729 |
| member_opening_balances | 44 |
| demand_adjustments | 0 |
| demand_payment_allocations | 0 |
| account_monthly_balance | 0 |
| society_import_batches | 5 |
| society_correction_log | 0 |
| party_category_rules | 0 |
| society_dropdown_options | 0 |
| transaction_correction_register | 0 |
| transaction_verification_records | 0 |
| account_opening_verification | 0 |
| data_quality_exceptions | 0 |
| data_management_change_log | 1 |

Other tables include audit, compliance, governance, configuration, execution-test, and backup records. Their tenant ownership and access requirements must be classified explicitly.

### Classification rules

- **Society-owned operational records:** financial masters, transactions, demands, allocations, opening balances, imports, corrections, audit/reconciliation and society governance/compliance records.
- **Global application configuration:** `OPTIONS` and `data_management_options` require code/configuration review; do not tenant-backfill by default.
- **Historical backups:** `demand_register_backup_20261030` and `transaction_demand_mapping_backup_20261030` are retained evidence. Do not modify them automatically; decide whether they remain immutable global archival snapshots or become tenant-scoped archival records.
- **Execution/test artifacts:** `society_os_execution_test` is not assumed to be business data; review its purpose before tenant migration.
- **Views/functions/storage:** never add tenant keys to views by constant. Review base-table lineage, view security, functions, triggers, storage buckets and service jobs separately.

## Preflight SQL

`PHASE_A2_READ_ONLY_INVENTORY.sql` reports:
- exact row counts for all public base tables;
- whether each table has a `society_id` column and, if so, populated/null counts;
- existing foreign-key relationships;
- public view definitions for security and lineage review.

It creates only a session-scoped temporary table and does not change persistent schema or data.

## Revised validation sequence — no paid branch

1. Inspect the repository's Supabase CLI configuration, migration history, application auth/session logic, and test scripts.
2. Validate the proposed identity schema locally using the repository's migration conventions and a local Supabase stack, if Docker is available.
3. Run synthetic multi-society membership, RLS, cross-tenant, storage, view, and function tests locally.
4. Prepare an explicit mapping manifest for every society-owned base table.
5. Re-read production row counts and perform read-only dry-run checks for unmapped rows, duplicate keys, and parent/child tenant mismatches.
6. Compare FY 2018–19 report outputs before and after local changes.
7. Submit the migration, mapping report, test evidence, and recovery plan for review.
8. Obtain separate explicit approval before each production stage: additive identity schema, society/admin seed, tenant backfill, and tenant RLS/application enforcement.

The detailed no-cost procedure is in `PHASE_A_LOCAL_VALIDATION_AND_ZERO_COST_PLAN.md`.

## Production status and restrictions

**No production DDL, society row, membership, role grant, tenant-key backfill, or RLS policy change has been applied.**

No Supabase development branch or second paid project is authorised or to be created. If local Docker/Supabase is unavailable, continue static SQL review and read-only production inspection; do not substitute production writes for local validation.

The user's confirmation that all current records belong to the named society establishes the intended mapping, but it does not waive dry-run validation or the separate production approval gates.


## Follow-on review completed (2026-11-07)

### A1 draft hardening
The review draft was updated without executing it:
- Prevent duplicate invited/active memberships for the same user and society while preserving ended membership history.
- Add a society-leading index for membership-role lookup.
- Change polymorphic audit `target_id` from UUID to text so it can identify existing text-key records as well.
- Explicitly require trusted application/RPC write paths to maintain `updated_at`.
- Declare permission catalogue access server-side only, with no client-facing policy.

Still open:
- Role grant dates/status must be enforced by a trusted write path before grants are enabled.
- Party-user links must remain inactive until party-to-society tenant mapping can be enforced.
- Canonical production migrations must be recovered before faithful local replay.

Review artifacts:
- `docs/database/PHASE_A1_IDENTITY_FOUNDATION_REVIEW_DRAFT.sql`
- `docs/database/PHASE_A1_IDENTITY_FOUNDATION_REVIEW_FINDINGS.md`

### Security advisor baseline
A read-only Supabase advisor review found 11 SECURITY DEFINER views, 4 SECURITY DEFINER trigger functions executable by anon/authenticated, one mutable-search-path trigger function, and broad grants on all 11 views. These are P0 security gates before member access or multi-tenant rollout.

See `docs/PHASE_A_SECURITY_ADVISOR_BASELINE.md` for the findings and staged remediation guidance.

No production schema, grants, policies, views, functions, storage policies, rows, or migration history were changed during this follow-on review.

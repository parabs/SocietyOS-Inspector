# Society OS — Phase A approvals and A2 preflight status

**Repository:** `parabs/SocietyOS-Inspector`  
**Branch:** `foundation/sprint-1-domain-architecture`  
**Status:** User confirmations received; production data and schema unchanged.

## Confirmed by the user

1. Every existing record in Supabase project `hklibokniuwurdxndxfd` belongs exclusively to **PEARL MEADOWS C-TYPE WING CO-OPERATIVE HOUSING SOCIETY LTD.**
2. The existing Auth user is designated as the initial Society Admin.

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

## Required sequence

1. Review the inventory and explicitly classify every public base table.
2. Validate the A1 identity schema against live foreign keys and naming conventions.
3. Prepare an explicit mapping manifest for each society-owned base table.
4. Dry-run tenant assignment and report mapped, unmapped, duplicate-key and parent/child mismatch counts.
5. Review the report before any persistent backfill.
6. Only after separate approval: apply A1 on a development database, insert the society and initial membership/role grant, then backfill in a separate controlled migration.
7. Enforce tenant RLS only after app compatibility and cross-tenant tests pass.

**No production DDL, society row, membership, role grant, tenant-key backfill, or RLS policy change has been applied.**

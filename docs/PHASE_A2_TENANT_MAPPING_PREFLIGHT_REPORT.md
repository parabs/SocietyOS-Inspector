# Society OS — Phase A2 Tenant Mapping Preflight Report

**Project:** `hklibokniuwurdxndxfd`  
**Repository branch:** `foundation/sprint-1-domain-architecture`  
**Inspection date:** 2026-11-07  
**Status:** Read-only preflight complete; no production data/schema changes.

## 1. User approvals recorded

The user explicitly confirmed:
- All existing records in this Supabase project belong exclusively to **PEARL MEADOWS C-TYPE WING CO-OPERATIVE HOUSING SOCIETY LTD.**
- The sole existing Auth user is to be the initial Society Admin.

Read-only Auth query returned exactly one account:
- User UUID: `3f0cb220-de2d-4c08-9380-39a160842afd`
- Email intentionally omitted from this implementation report.

The approval is sufficient to prepare a single-society mapping plan. It does not authorise an unreviewed production migration or immediate RLS changes.

## 2. Live schema baseline

Latest recorded migration: `20261107044303 named_statutory_audit_documents`.

The public schema contains **47 base tables, 11 views and 33 foreign-key constraints**. No existing public table currently has a `society_id` column.

### 2.1 Table inventory and proposed ownership classification

| Table | Rows | Classification | Tenant treatment proposal |
|---|---:|---|---|
| `party_master` | 58 | Financial master | Direct society key |
| `account_master` | 8 | Financial master | Direct society key |
| `category_master` | 47 | Financial master | Direct society key |
| `rules_master` | 19 | Financial master | Direct society key |
| `flat_owner_master` | 39 | Member/asset master | Direct society key |
| `source_register` | 12 | Import/source provenance | Direct society key |
| `transactions` | 731 | Financial ledger | Direct society key |
| `demand_register` | 729 | Financial ledger | Direct society key |
| `member_opening_balances` | 44 | Financial ledger | Direct society key |
| `demand_adjustments` | 0 | Financial ledger child | Direct key + parent consistency |
| `demand_payment_allocations` | 0 | Financial ledger child | Direct key + demand/transaction consistency |
| `account_monthly_balance` | 0 | Financial ledger child | Direct key + account consistency |
| `society_import_batches` | 5 | Import audit | Direct society key |
| `society_correction_log` | 0 | Import audit | Direct key + batch consistency |
| `party_category_rules` | 0 | Mapping configuration | Direct society key |
| `society_dropdown_options` | 0 | Society configuration | Direct society key |
| `transaction_correction_register` | 0 | Financial audit | Direct key + transaction consistency |
| `transaction_verification_records` | 0 | Financial audit | Direct key + transaction consistency |
| `account_opening_verification` | 0 | Financial audit | Direct key + account consistency |
| `data_quality_exceptions` | 0 | Data quality audit | Direct society key |
| `data_management_change_log` | 1 | Data governance audit | Direct society key |
| `financial_year_reviews` | 0 | Statutory/audit workflow | Direct society key |
| `financial_year_checklist` | 30 | Statutory/governance workflow | Direct society key |
| `audit_observations` | 0 | Audit workflow | Direct society key |
| `audit_observation_updates` | 0 | Audit workflow child | Direct key + observation consistency |
| `audit_queries` | 0 | Audit workflow | Direct society key |
| `audit_adjustment_proposals` | 0 | Audit workflow | Direct society key |
| `audit_handover_packages` | 0 | Audit workflow | Direct society key |
| `audit_handover_documents` | 0 | Audit workflow child | Direct key + handover consistency |
| `closure_approvals` | 0 | Audit workflow | Direct society key |
| `financial_year_snapshots` | 0 | Audit snapshot | Direct society key |
| `audit_workflow_activity` | 0 | Audit activity | Direct society key |
| `compliance_obligations` | 24 | Compliance catalogue/workflow | Society-owned in current app; direct key |
| `compliance_obligation_instances` | 0 | Compliance workflow child | Direct key + obligation consistency |
| `compliance_evidence` | 0 | Compliance workflow child | Derive/check through instance; direct key if RLS requires it |
| `compliance_activity` | 0 | Compliance activity | Direct key + parent consistency |
| `governance_task_approvals` | 0 | Governance workflow child | Direct key + checklist consistency |
| `governance_task_activity` | 1 | Governance activity child | Direct key + checklist consistency |
| `financial_year_audit_closures` | 0 | Statutory/audit workflow | Direct society key |
| `financial_year_audit_documents` | 0 | Statutory/audit workflow child | Direct key + closure consistency |
| `financial_year_audit_reconciliations` | 0 | Statutory/audit workflow child | Direct key + closure/document consistency |
| `demand_register_backup_20261030` | 583 | Historical backup | Preserve unchanged; archive classification required |
| `transaction_demand_mapping_backup_20261030` | 316 | Historical backup | Preserve unchanged; archive classification required |
| `OPTIONS` | 58 | Global application configuration | Exclude from tenant backfill unless code proves society ownership |
| `data_management_options` | 18 | Application/data-management configuration | Exclude from tenant backfill pending code review |
| `society_os_execution_test` | 0 | Test artifact | Exclude from production tenant data; confirm whether table can be retired separately |

**Classification note:** the table list above is a proposed mapping classification, not a claim that every listed table must receive a tenant key. The two historical backup tables, global configuration tables and test artifact must remain outside the automatic backfill. Any change to their treatment requires a separately documented reason.

## 3. Views

The 11 public views are:
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

Do not add a literal society ID to these views. Their definitions and security-invoker behavior must be reviewed after base-table tenant keys and policies are designed.

## 4. Foreign-key relationship review

The 33 live foreign keys include these important financial parent/child chains:

- `transactions` → party, account, category, source register, demand.
- `demand_register` → party, category, rules.
- `demand_payment_allocations` → demand and transaction.
- `demand_adjustments` → demand.
- `member_opening_balances` → party and source register.
- Import correction/mapping tables → import batch or transaction.
- Audit, compliance and governance child records → their parent workflow records.
- Financial-year audit documents/reconciliations → closure and document records.

These are existing relational links. The tenant-aware migration must preserve them and enforce that child and parent rows cannot carry different society IDs. A table's current FK does not itself prove tenant consistency.

## 5. Security findings — do not enable member access yet

The live `pg_policies` inspection shows:
- Financial master and transaction tables use `is_society_admin()`, which is based on a global JWT role rather than active membership in a society.
- Several audit, compliance, governance and financial-year workflow tables have authenticated SELECT policies with `USING (true)`.
- Several workflow writes are permitted to any authenticated user, subject only to `auth.uid() IS NOT NULL` or self-asserted actor fields.

This confirms the existing RLS is not a multi-tenant security boundary. Do not grant member-facing access, and do not simply add membership tables while retaining broad policies as the final security model.

The existing admin application may depend on these policies. Replacement policies and compatibility must be tested before any tightening. Storage policies and privileged functions remain separate required inspection items.

## 6. Proposed mapping manifest

Once the A1 identity schema has been validated and deployed to a development database, create one confirmed society record and use its generated UUID as the mapping target.

| Mapping group | Tables | Expected action |
|---|---|---|
| Core financial masters | party, account, category, rules, flat owner | Map all rows to the confirmed society |
| Financial activity | transactions, demands, opening balances, adjustments, allocations, monthly balances | Map all rows; validate existing FK links and parent/child tenant consistency |
| Source/import provenance | source register, import batches, society dropdown options, party category rules | Map society-owned rows; preserve import IDs and source references |
| Corrections and quality | correction log/registers, verification, quality exceptions, change log, opening verification | Map rows; retain immutable audit history |
| Audit/statutory/compliance/governance | all workflow, closure, snapshot, compliance and governance tables | Map rows; verify child-parent links |
| Historical backups | two dated backup tables | Exclude from writes; preserve as immutable snapshots pending explicit archival design |
| Global/configuration/test | OPTIONS, data_management_options, society_os_execution_test | Exclude from tenant mapping pending code-level confirmation |

All expected row counts must be re-read immediately before backfill. The numbers in this report are a baseline, not a substitute for transactionally guarded row counts during migration.

## 7. Remaining technical gates

1. **A1 SQL validation:** the current A1 file is a review draft. Validate all FK target types, constraints, indexes, RLS behavior, grants and naming against the live database before making it an executable migration.
2. **Development environment:** no Supabase development branch was created because branch creation may incur hourly charges and no cost approval was given. Do not use production as the first migration target.
3. **Storage/functions:** inspect storage bucket policies, security-definer functions, triggers, scheduled jobs and Edge Functions for society data access before RLS rollout.
4. **Application compatibility:** inspect current app queries/services for tables and views in the inventory; preserve the existing single-society workflow while moving to active-society context.
5. **Regression baseline:** capture FY 2018–19 key report totals and balances before any schema rollout and compare after each stage.

## 8. Explicitly not performed

- No DDL or DML was run against production.
- No society row was inserted.
- No membership or Society Admin role was granted.
- No `society_id` column was added or populated.
- No existing RLS or Storage policy was changed.
- No financial calculations, IDs, transactions, demands or allocations were modified.

**Next implementation step:** validate the A1 schema against the full live schema and prepare a development-only executable migration plus a separate, reviewed tenant backfill manifest. Production execution remains a distinct approval.


## 9. Additional security and storage preflight (read-only, 2026-11-07)

### Functions and triggers

The live database has the following relevant privileged functions:
- `guard_audit_handover_release()` — SECURITY DEFINER trigger function on audit handover release.
- `guard_financial_year_freeze()` — SECURITY DEFINER trigger function on financial-year snapshot freeze.
- `guard_internal_audit_signoff()` — SECURITY DEFINER trigger function on closure approval.
- `log_data_management_change()` — SECURITY DEFINER trigger function writing change-log rows.
- `is_society_admin()` — SECURITY INVOKER SQL function reading the global JWT `app_metadata.role/roles` claims.

The three audit guard functions and the change logger use a fixed `search_path` of `public`. Their table access and execute privileges must be reviewed before tenant rollout. Do not casually convert trigger functions to invoker mode or change their search path without regression tests; do not introduce a new SECURITY DEFINER tenant helper into the exposed `public` schema.

Existing triggers also include immutable audit/snapshot guards, governance activity logging, and data-management change logging on core master/transaction tables. Tenant backfill and future updates must be tested with these triggers active. In particular, ensure tenant-key backfill does not create misleading user-attributed business-change events or mutate immutable records.

### Storage

The project has one private bucket, `audit-evidence`, with a 25 MiB file limit and document/image MIME allow-list. Its current authenticated policies scope only to the bucket, not to a society or a specific workflow/record. These policies are not tenant-safe. Do not reuse this bucket for member payment proof or expense submissions. A separate tenant/workflow-scoped storage design and policy migration are required.

### Additional rollout warning

Existing public audit/compliance/governance tables with `USING (true)` or authenticated-only write policies remain a current exposure. A1 identity-table creation does not fix these. Do not enable member features or treat the existing policy set as an acceptable multi-tenant baseline.

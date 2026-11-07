# Phase A — Migration reconciliation findings

**Inspection date:** 2026-11-07  
**Production project:** `hklibokniuwurdxndxfd`  
**Repository:** `parabs/SocietyOS-Inspector`  
**Repository branch for this report update:** `docs/phase-a-migration-reconciliation-evidence`  
**Inspection type:** Read-only GitHub and Supabase inspection

## Executive result

The live Supabase migration ledger and the repository's tracked migration directory are **not replay-equivalent**. The GitHub review has now gone beyond the current `main` tree: the migration-folder commit history and relevant feature branches were inspected.

| Check | Result |
|---|---:|
| Migrations recorded in production | 38 |
| SQL migration files in repository `main` | 27 |
| Exact version + name matches | 4 |
| Production migrations with a same-name repository file but different version | 22 |
| Production migrations with no same-name repository file | 12 |
| Repository-only migration file with no same-name production entry | 1 |
| Commits touching `supabase/migrations/` in GitHub path history | 35 |

The 26 same-name matches are **filename/name matches only**. Except for the four exact version matches, the SQL contents have not been proven equivalent to the SQL applied in production. A filename match is not migration equivalence.

## 1. Exact production/repository matches

These four tracked files have the exact production version and migration name:

- `20261029045058_add_missing_transaction_correction_workflow.sql`
- `20261107031614_simple_annual_audit_account_closure.sql`
- `20261107031800_harden_annual_audit_close_guard.sql`
- `20261107031834_lock_audit_documents_after_fy_close.sql`

## 2. Same-name files with different versions

The repository has a file with the same migration name for each production entry below, but its version prefix differs:

| Production version | Production name | Repository file |
|---|---|---|
| 20261028111942 | fy2018_workbook_import | 202610280001_fy2018_workbook_import.sql |
| 20261104024006 | data_management_governance | 202611040001_data_management_governance.sql |
| 20261104162657 | central_financial_calculation_layer | 20261104170000_central_financial_calculation_layer.sql |
| 20261104163053 | party_financial_year_balance | 20261104180000_party_financial_year_balance.sql |
| 20261104163121 | exclude_member_bank_charges_from_receivable | 20261104181000_exclude_member_bank_charges_from_receivable.sql |
| 20261104163457 | use_all_party_payment_transactions | 20261104182000_use_all_party_payment_transactions.sql |
| 20261104163534 | preserve_opening_balance_source_status | 20261104183000_preserve_opening_balance_source_status.sql |
| 20261104163912 | separate_cash_receipts_from_demand_year | 20261104184000_separate_cash_receipts_from_demand_year.sql |
| 20261104164033 | expose_unallocated_receipts_in_member_ledger | 20261104185000_expose_unallocated_receipts_in_member_ledger.sql |
| 20261104164653 | account_financial_year_balance | 20261104190000_account_financial_year_balance.sql |
| 20261104165037 | roll_forward_account_opening_cutoff | 20261104191000_roll_forward_account_opening_cutoff.sql |
| 20261104165249 | opening_evidence_and_cutoff_exceptions | 20261104193000_opening_evidence_and_cutoff_exceptions.sql |
| 20261104165440 | limit_cutoff_exceptions_to_fy_mismatch | 20261104194000_limit_cutoff_exceptions_to_fy_mismatch.sql |
| 20261106071630 | financial_year_audit_workflow | 20261106120000_financial_year_audit_workflow.sql |
| 20261106072609 | compliance_command_centre | 20261106143000_compliance_command_centre.sql |
| 20261106072712 | compliance_rls_policy_cleanup | 20261106150000_compliance_rls_policy_cleanup.sql |
| 20261106122253 | allow_governance_task_workflow_statuses | 20261106123000_allow_governance_task_workflow_statuses.sql |
| 20261106125026 | governance_task_activity_log | 20261106140000_governance_task_activity_log.sql |
| 20261107042505 | financial_year_audit_reconciliation_wizard | 20261107100000_financial_year_audit_reconciliation_wizard.sql |
| 20261107042618 | update_audit_close_for_reconciliation_wizard | 20261107103000_update_audit_close_for_reconciliation_wizard.sql |
| 20261107042634 | add_auditor_document_link_to_reconciliation | 20261107104500_add_auditor_document_link_to_reconciliation.sql |
| 20261107044303 | named_statutory_audit_documents | 20261107113000_named_statutory_audit_documents.sql |

These pairs require content-level comparison against the resulting live schema and, where available, original deployment artifacts. Do not rename the repository files to production versions until semantic equivalence and ordering are proven.

## 3. Production migrations with no same-name repository file

The following 12 production migration names have no corresponding SQL file in the current repository migration directory:

1. `20261029025439_society_import_single_active_batch_guard`
2. `20261029032138_remove_demand_due_date_check_for_historical_reporting`
3. `20261029053639_add_separate_verification_records`
4. `20261029054112_persist_audit_verification_findings`
5. `20261029055012_add_reconciliation_review_fields`
6. `20261029065021_add_monthly_reconciliation_review_confirmations`
7. `20261029082155_monthly_reconciliation_source_balance_contra_review`
8. `20261030103538_add_transaction_demand_mapping`
9. `20261103053350_correct_member_balance_sign_convention`
10. `20261104024135_audit_quality_exception_resolutions`
11. `20261104024239_audit_option_catalog_changes`
12. `20261106115244_expand_financial_year_checklist_stages_for_guided_agm`

The repository contains `20261107100000_guided_agm_compliance_workflow.sql`, but that is a differently named migration. It must not be treated as a replacement for `expand_financial_year_checklist_stages_for_guided_agm` without SQL-level evidence.

## 4. Repository-only migration

The one repository migration with no same-name production ledger entry is:

- `20261107100000_guided_agm_compliance_workflow.sql`

It may be a later or alternate implementation related to the production guided-AGM checklist migration. That relationship remains unproven. Do not apply it to production or mark it as already applied based on the similar topic.

## 5. GitHub recovery work completed

Read-only checks performed:

- Confirmed the repository is accessible and its default branch is `main`.
- Inspected the recursive Git trees for `main` and `foundation/sprint-1-domain-architecture`; both expose the same 27 migration SQL files.
- Inspected relevant FY2018 import, data-management, audit-workflow, compliance and audit-reconciliation feature branches. They did not expose additional migration files that fill the 12 missing production names.
- Queried GitHub's commit history for the `supabase/migrations/` path. It returned 35 commits. The history includes the original FY2018 migration, subsequent edits, and migration filename alignment commits for the three audit-close migrations.
- Retrieved original commit diffs for the FY2018 import, correction-register and data-management migrations. This confirms that some tracked SQL source is recoverable from Git history, but does not recover the 12 missing production migration bodies.
- Queried the missing production migration paths in GitHub commit history; no commits were returned for the tested exact paths.
- The repository's `supabase/config.toml` is absent from the inspected `main` branch as well as the previously inspected foundation branch.

This is a substantially wider GitHub check than the earlier targeted fetches, but it is not a claim that every inaccessible external workspace or backup has been searched.

## 6. Why a faithful local replay remains blocked

The repository migration directory does not represent the production migration ledger. A local reset/replay from the current files could omit production changes, replay changes at different versions, or apply the repository-only guided-AGM migration in the wrong place.

The current execution environment also has no Docker, Supabase CLI or `psql` executable. Therefore a local Supabase replay cannot be run here at present.

Do not:

- run `supabase db reset` against the incomplete history and claim it represents production;
- rename files or mark migrations as applied merely to silence version mismatches;
- recreate the 12 missing migration files from guessed SQL;
- apply reconstructed SQL to production as a workaround;
- change production schema, migration history, RLS policies or financial records to make local validation easier.

## 7. Safe next route

1. Preserve the 27 tracked migration files and production ledger unchanged.
2. Obtain original SQL for the 12 missing production migrations from the trusted deployment/workspace artifact if it becomes available; do not ask for it again until the remaining connected-source recovery routes have been exhausted.
3. For the 22 timestamp mismatches, compare repository SQL with the live schema, function/view definitions, constraints, triggers and policies to identify compatibility, while clearly recording that this is end-state comparison rather than proof of original migration equivalence.
4. Build a schema snapshot / reconciliation manifest from read-only production catalog inspection as a separate recovery artifact. Do not present it as the original migration history.
5. Restore a canonical migration history only from trusted source files. Then validate locally with synthetic data and cross-tenant tests.
6. Keep production approval gates separate: additive identity schema, society/admin seed, tenant backfill, RLS/storage/function enforcement, and any financial data change.

## 8. Current safety status

- No production DDL or DML performed during this reconciliation.
- No production migration ledger altered.
- No Supabase development branch or second paid project created.
- No existing FY 2018–19 transactions, demands, allocations, balances or reports modified.
- The A1 identity SQL remains a review draft, not an executable production migration.
- Existing multi-tenant security blockers remain open; member-facing access must not be enabled until views, policies, functions and storage are tenant-safe.

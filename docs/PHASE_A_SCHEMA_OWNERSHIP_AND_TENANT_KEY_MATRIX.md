# Phase A — Proposed data ownership and tenant-key matrix

**Inspection date:** 2026-11-07  
**Production project:** `hklibokniuwurdxndxfd`  
**Repository:** `parabs/SocietyOS-Inspector`  
**Scope:** Read-only inventory of 46 public base tables, columns, foreign keys, RLS state and proposed ownership boundaries.

## Executive result

The production schema currently has 46 public base tables. None has a `society_id` column, and the inspected schema contains no canonical `societies` or society-membership table. All 46 base tables have RLS enabled, but RLS currently relies on global admin checks or broad authenticated-user predicates rather than a tenant key.

The database therefore represents a single society/workspace, not a safely isolated multi-society data model.

This document proposes ownership classes to guide design. It does **not** assert that every existing table is already correctly classified, and it does not authorize a production schema change.

## 1. Proposed ownership classes

| Ownership class | Meaning | Recommended enforcement |
|---|---|---|
| Society-owned operational data | Records created and maintained by one housing society | Mandatory `society_id`; active membership + role RLS |
| Society-owned financial data | Books, masters, demands, receipts, allocations, balances and source evidence | Mandatory `society_id`; stricter role permissions; tenant-safe FKs and views |
| Society-owned governance data | Audit, year-end closure, compliance instances, task approvals and evidence | Mandatory `society_id`; role-specific workflow authorization |
| Shared product reference data | Platform-wide templates and immutable legal/industry reference catalogues | Global read access; controlled platform-admin writes; society-specific overrides stored separately |
| Platform configuration | Application-wide constants/options, not society data | Keep outside society financial data; no member-facing access |
| Operational/test/backup data | Temporary tests, migration backups and recovery snapshots | Restrict to platform operators; never expose through member reports |

## 2. Table-by-table proposed scope

### Society-owned financial and master data

These are the authoritative society-specific records. Each should carry a non-null `society_id` after a controlled backfill.

- `account_master`
- `account_monthly_balance`
- `account_opening_verification`
- `category_master`
- `demand_adjustments`
- `demand_payment_allocations`
- `demand_register`
- `flat_owner_master`
- `member_opening_balances`
- `party_category_rules`
- `party_master`
- `rules_master`
- `source_register`
- `transaction_correction_register`
- `transaction_verification_records`
- `transactions`

The ownership is not determined by the fact that a row has a financial year or party ID. These are all scoped to the society whose books and members they describe.

### Society-owned audit, year-end and governance data

These records contain financial-year reviews, auditor queries, approvals, evidence references, closure snapshots and governance task history. They must be owned by the same society as the financial books they review.

- `audit_adjustment_proposals`
- `audit_handover_documents`
- `audit_handover_packages`
- `audit_observation_updates`
- `audit_observations`
- `audit_queries`
- `audit_workflow_activity`
- `closure_approvals`
- `financial_year_audit_closures`
- `financial_year_audit_documents`
- `financial_year_audit_reconciliations`
- `financial_year_checklist`
- `financial_year_reviews`
- `financial_year_snapshots`
- `governance_task_activity`
- `governance_task_approvals`

Do not treat `financial_year` as a tenant identifier. Many societies can have the same financial year.

### Society-owned compliance instances and evidence

The following are records of a society's actual obligations, submissions and evidence:

- `compliance_activity`
- `compliance_evidence`
- `compliance_obligation_instances`

The `compliance_obligations` table needs a deliberate product decision. Its columns look like a catalogue of obligation definitions and legal references, so the preferred model is a platform-managed shared template catalogue plus society-specific applicability/override records. If existing rows contain society-specific interpretations or verification notes, migrate those into society-owned override records rather than making the shared catalogue writable by every society.

### Society-owned operations and data quality

These should be tenant-scoped or restricted to platform operations:

- `data_management_change_log` — society-scoped change audit; actor identity must be `auth.uid()`, not a client-provided name.
- `data_quality_exceptions` — society-scoped findings and resolution history.
- `society_correction_log` — society-scoped import/correction evidence.
- `society_dropdown_options` — likely society-specific imported dropdown choices; confirm whether any values are platform-wide before assigning scope.
- `society_import_batches` — mandatory society binding and creator identity; batch IDs must not permit cross-society access.

### Platform configuration and unresolved legacy scope

These require explicit classification before the tenant migration:

- `OPTIONS` — legacy generic options table. Determine whether it is application-wide configuration or society-maintained options; do not expose broadly while unresolved.
- `data_management_options` — likely application configuration for import/data-management UI. Decide whether options are global defaults, society overrides, or both.
- `compliance_obligations` — proposed shared statutory template catalogue as described above.

### Backup and test objects

These must not become tenant-facing application data:

- `demand_register_backup_20261030`
- `transaction_demand_mapping_backup_20261030`
- `society_os_execution_test`

Keep backups restricted to trusted platform operators and ensure that restoring a backup preserves the original society ownership key. The execution-test table should be moved to a non-production test environment or removed only after confirming it contains no required evidence.

## 3. Relationship integrity: current foreign keys are not tenant-aware

The production schema has foreign keys for core relationships, but they reference a single business identifier without including a society key. Examples include:

- `transactions.party_id → party_master.party_id`
- `transactions.account_id → account_master.account_id`
- `transactions.category_id → category_master.category_id`
- `transactions.demand_id → demand_register.demand_id`
- `demand_register.party_id → party_master.party_id`
- `demand_register.category_id → category_master.category_id`
- `demand_register.rule_id → rules_master.rule_id`
- `demand_payment_allocations.transaction_id → transactions.transaction_id`
- `demand_payment_allocations.demand_id → demand_register.demand_id`
- `member_opening_balances.party_id → party_master.party_id`
- `account_monthly_balance.account_id → account_master.account_id`
- `transaction_verification_records.transaction_id → transactions.transaction_id`
- `audit_handover_documents.handover_id → audit_handover_packages.handover_id`
- `audit_observation_updates.observation_id → audit_observations.observation_id`
- `financial_year_audit_reconciliations.auditor_document_id → financial_year_audit_documents.document_id`
- `financial_year_audit_reconciliations.financial_year → financial_year_audit_closures.financial_year`
- `compliance_obligation_instances.obligation_id → compliance_obligations.obligation_id`
- `compliance_evidence.instance_id → compliance_obligation_instances.instance_id`

The current FKs protect referential existence, but do not prove that both records belong to the same society.

### Required tenant-safe relationship pattern

For society-owned parent records, add a unique constraint on `(society_id, business_id)` and use composite foreign keys such as:

```sql
UNIQUE (society_id, party_id)

FOREIGN KEY (society_id, party_id)
  REFERENCES party_master (society_id, party_id)
```

Apply this to all tenant-owned relationships, not only the main transactions table. The same-society rule must also be enforced for parent/child workflow records, document references, allocation records, evidence, correction logs and audit history.

A simple client-side filter or a foreign key on `party_id` alone is not sufficient.

## 4. Proposed canonical identity model

The target model should have:

1. `societies`: one canonical row per registered society/workspace, with stable UUID, legal name, registration number, status and created timestamp.
2. `society_memberships`: `society_id`, `user_id`, role, membership status, invitation/approval metadata, and unique `(society_id,user_id)`.
3. A controlled active-society selection mechanism validated against the authenticated user's active membership. A client-supplied society UUID must never grant access by itself.
4. Role/action authorization at the database boundary. Suggested initial roles: platform operator, society admin, treasurer, secretary, chairman/committee, auditor, read-only member. Permissions should be defined by actions, not only by labels.
5. An immutable authenticated actor ID on audit/activity records, separate from any entered signatory name or attestation.

Do not encode a society ID or role as an unverified user-editable JWT field. If JWT claims are used for performance, membership changes and revocations must invalidate or refresh claims promptly; database membership remains authoritative.

## 5. Backfill and enforcement order

1. Freeze the target inventory and choose the canonical society record for the existing Pearl Meadows data.
2. Verify that each existing business identifier is unique in the current single-society dataset; identify collisions before adding composite keys.
3. Create the society and membership tables in a reviewed additive migration.
4. Backfill the same canonical society ID into all society-owned tables in dependency order, preserving every existing primary key and financial value.
5. Add composite unique keys and tenant-aware foreign keys. Validate that no child points to a parent in another society.
6. Update views to use caller-context execution and include tenant scope; review RPCs, triggers, Edge Functions and storage policies.
7. Replace global-admin RLS policies with membership- and role-aware policies. Retain a separate platform-operator path for maintenance.
8. Run negative cross-society tests for every table, view, RPC, import action and storage object operation.
9. Re-run the FY2018-19 financial regression checks and compare all totals to the current verified baseline before enabling another society.

## 6. Important unresolved decisions

These require design review, not assumptions:

- Is `OPTIONS` global application configuration or per-society data?
- Are `data_management_options` global defaults, society overrides, or both?
- Should `compliance_obligations` be a shared immutable catalogue with society-specific overrides?
- Should audit firms/users be members of a society with a limited auditor role, or receive time-bound audit engagements?
- Does one login user need simultaneous membership in multiple societies? The design should support this without relying on one global active-society JWT claim.
- What is the platform-operator break-glass procedure, including approval, audit logging and expiry?

## 7. Current safety status

- Catalog inventory and FK review were read-only.
- All 46 public base tables currently have RLS enabled; none has a `society_id` column.
- No canonical society or membership table was found in the inspected public schema.
- No production DDL/DML, policy, grant, view, function, storage or migration-ledger changes were made.
- No financial values, source records, demands, receipts, transactions or allocations were altered.
- This matrix is a proposed design classification and must be reviewed before schema implementation.

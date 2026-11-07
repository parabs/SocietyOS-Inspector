# Migration version collision — repository replay blocker

**Inspection date:** 2026-11-07  
**Repository:** `parabs/SocietyOS-Inspector`  
**Production project:** `hklibokniuwurdxndxfd`  
**Inspection type:** Read-only GitHub tree and Supabase migration-ledger comparison

## Finding

Two distinct SQL files in the current `main` branch share the same 14-digit Supabase migration version prefix:

- `supabase/migrations/20261107100000_financial_year_audit_reconciliation_wizard.sql`
- `supabase/migrations/20261107100000_guided_agm_compliance_workflow.sql`

Their contents are different migrations. The first creates the durable financial-year audit reconciliation table, policies and write guard. The second extends the financial-year checklist and creates governance task approvals.

Supabase migration version identifiers must be unique. A repository containing two different files with the same version cannot be relied on as a deterministic migration sequence. Depending on CLI behavior, one file may be rejected, treated as already applied, or cause an ambiguous replay. This must be resolved before a clean local reset/replay or any new migration deployment.

## Production ledger comparison

The production migration ledger contains neither a `20261107100000` version nor a migration named `guided_agm_compliance_workflow`.

It does contain these related entries under different production versions/names:

- `20261107042505 financial_year_audit_reconciliation_wizard`
- `20261106115244 expand_financial_year_checklist_stages_for_guided_agm`

The repository file names therefore resemble already-applied production changes, but their version prefixes do not match. The guided AGM repository file has a different name from the production ledger entry. Similar subject matter is not proof that the SQL bodies are equivalent.

## Required handling

1. Do not apply either file to production based on the current filenames.
2. Do not mark either version as applied to resolve the collision.
3. Do not simply change one timestamp without checking migration dependencies, the actual production schema, and the order in which the changes were deployed.
4. Recover original deployment SQL or trusted CI/deployment artifacts where possible.
5. Compare both file bodies against live table columns, constraints, indexes, policies, triggers and function definitions.
6. Once equivalence and ordering are established, assign unique canonical version identifiers in a controlled migration-history repair branch and test a complete local replay.

## Safety status

- Read-only inspection only.
- No production schema, data, policies, functions, storage objects or migration history changed.
- No repository migration file renamed or edited as part of this finding.
- The existing 12 missing production migration SQL bodies remain unresolved.
- Local replay remains blocked by the broader repository/production migration mismatch and the unavailable local Docker/Supabase CLI/psql toolchain.

## Conclusion

This is an additional, independently verifiable migration-history defect. The repository's migration directory is not currently a safe source for production replay. The right next step is source recovery and semantic reconciliation, not a production migration or a blind timestamp rename.


## Live schema cross-check completed

Read-only production catalog checks confirm that both repository SQL files have corresponding objects in the live database:

### Audit reconciliation wizard

- `financial_year_audit_reconciliations` exists with the expected 20 columns, including generated `variance`, `system_snapshot`, and resolution metadata.
- The live table has the unique key on `(financial_year, reconciliation_key)`, the auditor-document and financial-year foreign keys, the resolution status/type checks, and the resolution consistency check.
- The three policies from the repository SQL are present with the same broad predicates: authenticated SELECT `true`, INSERT `auth.uid() IS NOT NULL`, UPDATE `auth.uid() IS NOT NULL`.
- The `trg_guard_financial_year_audit_reconciliation_write` trigger is present for INSERT and UPDATE.

### Guided AGM workflow

- `financial_year_checklist` contains the added task code, sequence, guidance, completion criteria, owner/approver roles, dependency, submission and approval fields.
- `governance_task_approvals` exists with the expected approval fields and checklist foreign key.
- The checklist task-code index and governance-approval checklist index are present.
- The broad authenticated checklist read/insert/update policies are present. The approval table has authenticated read-all and insert-own-actor policies.
- The governance task activity trigger is present on checklist INSERT and UPDATE.

**Interpretation:** the production end state is consistent with the principal DDL and policy intent visible in these two repository files. This is useful end-state evidence, but it is not proof that these exact file bytes were the SQL applied in production. The production ledger records the related migrations under different versions/names, and the duplicate repository version still makes the current migration directory ambiguous.

This cross-check also confirms that the duplicate-version files are not simply unused drafts: their principal database objects already exist in production. Do not replay them.

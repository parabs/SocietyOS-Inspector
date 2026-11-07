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

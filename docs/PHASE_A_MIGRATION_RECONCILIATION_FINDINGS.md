# Phase A — Migration reconciliation findings

**Inspection date:** 2026-11-07  
**Production project:** `hklibokniuwurdxndxfd`  
**Repository branch:** `foundation/sprint-1-domain-architecture`  
**Inspection type:** Read-only

## Result

The production migration history and the repository's tracked `supabase/migrations/` directory are not replay-equivalent.

| Check | Result |
|---|---:|
| Migrations recorded in production | 38 |
| SQL migration files tracked in repository | 27 |
| Exact migration version matches | 4 |
| Production versions with no exact file in repository | 34 |
| Repository versions not recorded in production | 23 |

Only these four files have versions that exactly match production:
- `20261029045058_add_missing_transaction_correction_workflow.sql`
- `20261107031614_simple_annual_audit_account_closure.sql`
- `20261107031800_harden_annual_audit_close_guard.sql`
- `20261107031834_lock_audit_documents_after_fy_close.sql`

A further 15 migration names have a corresponding production migration by name but a different version. The remaining differences include production-only migrations and a repository-only `guided_agm_compliance_workflow` file. In particular, production records `expand_financial_year_checklist_stages_for_guided_agm`, while the repository contains a separately named guided AGM migration at a later local timestamp. These must not be assumed equivalent without SQL-level review.

The repository's `supabase/config.toml` is absent on the inspected feature branch.

## Why local replay is blocked

A local Supabase reset/replay from the current tracked migration directory would not faithfully reproduce production. It could omit production changes, apply changes that production does not have, or apply semantically duplicate migrations. Creating a new config file alone does not fix this history drift.

Do not:
- run `supabase db reset` against this incomplete migration history and treat it as production-equivalent;
- rename migration files merely to match production version numbers;
- mark migrations as applied to silence version mismatches;
- reconstruct missing migration files from guessed SQL;
- apply any migration to production as a workaround.

## Required remediation

1. Obtain the authoritative migration source for all 38 production migration versions from the original developer workspace, deployment artifact, or trusted version-control history.
2. Compare each source file against the production migration name/version and inspect semantic equivalence, especially migrations with different timestamps/names.
3. Reconcile the repository migration directory to one canonical history without changing production.
4. Add a reviewed `supabase/config.toml` consistent with the project's actual local Supabase requirements.
5. Run local Supabase replay and schema comparison only after the canonical migration history is restored.
6. Then test the Phase A1 identity foundation locally, with synthetic society/user data and cross-tenant access tests.

## Current safe state

- No Supabase development branch created.
- No production DDL or data writes performed.
- No production migration history altered.
- No local replay claimed or performed.
- Existing FY 2018–19 data and calculations remain untouched.

## Next input needed to complete the reconciliation

The missing migration source files must come from a trusted source. The live migration ledger exposes version/name metadata, not the original SQL bodies. A schema dump can help compare end-state structure but cannot reliably recreate the original migration intent, ordering, data transformations, or rollback assumptions.

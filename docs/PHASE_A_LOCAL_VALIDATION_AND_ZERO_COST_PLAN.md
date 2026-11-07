# Society OS — Phase A local validation plan

**Status:** Approved working approach; no paid Supabase development branch.
**Production project:** `hklibokniuwurdxndxfd`
**Feature branch:** `foundation/sprint-1-domain-architecture`

## Cost decision

The product is being developed as a non-profit initiative. Do not create a Supabase development branch or a second paid project for this phase. Use local tooling and read-only production inspection wherever possible.

This decision does not authorise production DDL, data writes, policy changes, or deployment.

## Validation environment

Use the repository's existing Supabase CLI configuration and migrations with a local Supabase stack (Docker required). Do not introduce a new cloud environment.

Before running commands:
1. Confirm the repository's Supabase CLI version and configuration.
2. Confirm the local Docker engine is available.
3. Inspect the migration directory and ordering; do not assume documentation SQL is an executable migration.
4. Check for local secrets and ensure production credentials are not copied into local files or committed.
5. Use synthetic test identities and synthetic tenant data for cross-tenant tests.

If local Supabase/Docker is unavailable, continue static SQL review and read-only production checks; do not substitute production writes for missing local infrastructure.

## Work sequence

### A. Repository and migration baseline
- Inspect `supabase/config.toml`, migration history, generated types, app auth/session logic, and existing test scripts.
- Compare migration files with the live migration history.
- Identify drift before preparing any executable migration.
- Keep the A1 identity SQL in the review-draft location until it has been reconciled with the repository's actual migration conventions.

### B. Local database validation
- Start the local Supabase stack.
- Apply the repository's existing migrations to the local database.
- Confirm the local schema matches the expected application baseline.
- Apply the proposed identity foundation only as a local test migration after review.
- Verify foreign keys, unique constraints, indexes, default privileges, RLS enablement, and deny-by-default behaviour.
- Test membership-based access with at least two synthetic societies and users: active member, removed member, non-member, and cross-tenant access attempts.
- Verify the initial admin grant can only be derived from a valid membership and role assignment, not a global JWT role claim.

### C. Tenant mapping dry-run
- Keep production inspection read-only.
- Re-read production table counts immediately before producing the mapping manifest.
- Produce an explicit table-by-table classification and mapping manifest.
- Check primary-key coverage, duplicate keys, null tenant assignment, parent/child tenant consistency, and excluded/global/archive tables.
- Do not write tenant IDs to production during the dry-run.
- Do not change financial IDs, transaction/demand links, amounts, dates, or historical calculations.

### D. Application compatibility
- Trace current login, society selection, user profile, financial queries, report views, storage access, RPCs, triggers, and background jobs.
- Identify every query that currently assumes one global society or uses a global JWT admin claim.
- Add tenant context only through validated active membership.
- Review each view and SECURITY DEFINER function individually; do not assume table RLS automatically protects every access path.
- Scope storage object paths and authorisation to society membership before enabling member-facing evidence uploads/downloads.

### E. Regression and security checks
- Compare existing FY 2018–19 report outputs before and after local identity/tenant changes.
- Validate balances, demand totals, receipts, payments, party ledgers, account ledgers, and demand allocations.
- Confirm historical financial calculations are unchanged.
- Test cross-tenant reads, writes, RPC execution, storage reads/writes, and indirect access through views/functions.
- Test unauthorised role escalation and self-asserted actor fields.
- Record test evidence and unresolved risks.

## Production approval gates

Separate explicit approval is required before each production stage:
1. Additive identity schema migration.
2. Create the Pearl Meadows C-Wing society record and initial admin membership.
3. Tenant-key backfill of existing society-owned records.
4. RLS, storage, function, trigger, and application enforcement.
5. Any production data correction or financial recalculation.

The user's confirmation that all current records belong to the named society establishes the intended mapping, but it does not waive dry-run validation or the approval gates above.

## Non-goals

- No Supabase development branch or second paid project.
- No production schema or data mutation as part of local validation.
- No automatic tenant assignment to global configuration, historical backups, or test artifacts.
- No guessed party, member, building, ownership share, parking, or historical relationship.
- No financial recalculation or alteration of existing FY 2018–19 records.

## Completion evidence

The phase is ready for a production approval review only when the repository contains:
- a reviewed executable migration (separate from design SQL);
- successful local migration and rollback/recovery notes;
- automated membership/RLS and cross-tenant tests;
- a complete mapping manifest and dry-run report;
- a passing FY 2018–19 regression comparison;
- an application impact checklist covering views, functions, storage, jobs, and client queries;
- a concise production change plan and recovery plan.

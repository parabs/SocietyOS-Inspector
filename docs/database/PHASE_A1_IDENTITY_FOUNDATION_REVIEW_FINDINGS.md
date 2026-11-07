# Phase A1 — Identity foundation static review findings

**Review date:** 2026-11-07  
**Branch:** `foundation/sprint-1-domain-architecture`  
**Inputs:** Phase A1 review-draft SQL and read-only live public-schema inventory  
**Scope:** Static design/schema compatibility review only; no SQL execution

## Overall assessment

The nine-table additive identity model is directionally compatible with the inspected production schema. In particular, `party_master.party_id` is a text primary key, so the proposed `party_user_links.party_id` text foreign key matches the live type.

This is not yet a production-ready migration. The findings below should be resolved in the draft and then validated against a clean local database after the canonical production migration history is recovered.

## Findings to resolve before local execution

| ID | Severity | Finding | Required treatment |
|---|---|---|---|
| A1-01 | High | `society_memberships` has no constraint preventing two simultaneous active memberships for the same user in the same society. | Add a partial unique index for the intended active/invited lifecycle, or explicitly document a supported multi-membership model. Preserve ended membership history. |
| A1-02 | High | `society_membership_roles` can reference a valid membership and role in the same society, but its date window is not constrained to the membership's own active period/status. | Enforce membership/role grant validity in a controlled write path or trigger; test ended/suspended memberships and future-dated grants. |
| A1-03 | High | `party_user_links` references `party_master` and carries `society_id`, but there is no database-level proof that the party belongs to that society. The current party master has no `society_id`. | Defer activation until the tenant mapping for party records exists. Then enforce the society/party relationship with a tenant-aware relation/FK or guarded write path. Do not infer a link from matching names. |
| A1-04 | Medium | `society_membership_roles` has a composite PK beginning with `membership_id`; there is no index beginning with `society_id` for tenant-scoped lookup. | Add a `society_id`-leading index if RLS predicates and query plans use society filtering. Validate with EXPLAIN locally. |
| A1-05 | Medium | Several tables carry `updated_at`, but the draft defines no update trigger. | Either add a consistent timestamp trigger or state that every write path must set `updated_at`; test both direct and RPC writes. |
| A1-06 | Medium | `society_membership_audit.target_id` is UUID-only and not FK-bound to a target table. | Keep it polymorphic only if audit retention requires it; document allowed target types and validate target IDs in trusted write paths. |
| A1-07 | Medium | Permission catalog is RLS-enabled with no policies. This is fail-closed, but client-side role/permission discovery will not be able to read it. | Keep permission evaluation server-side, or add a deliberately public read-only policy only if the catalog is confirmed non-sensitive. Do not open write access. |

## Deliberate safeguards — retain

- New tables are RLS-enabled and have no permissive policies. This is deny-by-default, not an omission to fix with broad authenticated policies.
- No society/admin seed or role grant is included in the draft.
- No existing financial table is altered and no historic record is backfilled.
- The existing Auth user is not hard-coded into a migration.
- `party_user_links` is not activated before tenant-aware party mapping is implemented.
- The permission vocabulary is seeded idempotently using `ON CONFLICT DO NOTHING`.

## Compatibility observations

- Live `party_master.party_id` is `text` and is the primary key; the draft's party FK type is compatible.
- Live schema contains no `society_id` column in existing public tables, so a party-to-society FK cannot yet be expressed against the existing master.
- The new identity tables should not be treated as a substitute for tenant scoping of the 47 existing base tables.
- The existing global-JWT `is_society_admin()` helper is not sufficient for the intended active-society membership authorization model.
- Views, SECURITY DEFINER functions, audit triggers, and the private `audit-evidence` bucket need separate security review; adding identity tables alone does not make existing access tenant-safe.

## Next safe sequence

1. Revise this draft for A1-01, A1-02, A1-04, A1-05 and A1-06.
2. Keep A1-03 blocked until the tenant mapping relation is designed.
3. Decide whether permission catalog access is server-only.
4. Recover canonical production migrations before any local replay that claims to represent production.
5. Run SQL syntax, FK, index, RLS-deny, and membership lifecycle tests against a clean local stack with synthetic data.
6. Only after local evidence, prepare separate production approval packages for additive identity tables, society/admin seed, tenant mapping/backfill, and RLS enforcement.

## Safety status

This review did not execute the draft SQL, change the repository's migration directory, create a Supabase branch/project, or modify production data/schema/migration history.

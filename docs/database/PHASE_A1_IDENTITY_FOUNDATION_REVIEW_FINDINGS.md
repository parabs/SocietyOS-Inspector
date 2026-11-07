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
| A1-01 | Resolved in draft | `society_memberships` originally allowed duplicate live memberships. | Added a partial unique index on `(society_id, user_id)` for `invited` and `active` rows; ended history remains allowed. |
| A1-02 | High — remains open | `society_membership_roles` can reference a valid membership and role in the same society, but its date window is not constrained to the membership's own active period/status. | Enforce membership/role grant validity in a controlled trusted write path before role grants are enabled; test ended/suspended memberships and future-dated grants. Do not add a broad SECURITY DEFINER trigger as a shortcut. |
| A1-03 | High — remains open | `party_user_links` references `party_master` and carries `society_id`, but there is no database-level proof that the party belongs to that society. The current party master has no `society_id`. | Keep party-user link writes disabled until tenant mapping exists. Then enforce the society/party relationship with a tenant-aware relation/FK or guarded write path. Do not infer a link from matching names. |
| A1-04 | Resolved in draft | `society_membership_roles` lacked a society-leading lookup index. | Added `(society_id, membership_id)` index; validate query plans locally once the tenant policies exist. |
| A1-05 | Resolved by explicit draft contract | Several tables carry `updated_at`, but no shared repository trigger convention was found. | Draft now states that trusted application/RPC write paths must set `updated_at`. A database trigger is deferred until a shared convention can be selected and tested. |
| A1-06 | Resolved in draft | `society_membership_audit.target_id` was UUID-only despite being polymorphic. | Changed `target_id` to text so it can record UUID and existing text-key targets. Allowed target types/IDs must still be validated by trusted write paths. |
| A1-07 | Resolved by explicit design decision | Permission catalog is RLS-enabled with no policies. | Draft now explicitly treats the catalogue as trusted server-side authorization data. No client-facing read or write policy is added. |

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

1. A1-01, A1-04, A1-05, A1-06 and A1-07 have been addressed in the review draft.
2. Keep A1-02 open until membership/role validity is enforced in a trusted write path.
3. Keep A1-03 blocked until the tenant mapping relation is designed and validated.
4. Recover canonical production migrations before any local replay that claims to represent production.
5. Run SQL syntax, FK, index, RLS-deny, and membership lifecycle tests against a clean local stack with synthetic data.
6. Only after local evidence, prepare separate production approval packages for additive identity tables, society/admin seed, tenant mapping/backfill, and RLS enforcement.

## Safety status

This review did not execute the draft SQL, change the repository's migration directory, create a Supabase branch/project, or modify production data/schema/migration history.

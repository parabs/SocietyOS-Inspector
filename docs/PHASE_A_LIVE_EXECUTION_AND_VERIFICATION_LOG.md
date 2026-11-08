# Phase A — Live Execution and Verification Log

**Production project:** `hklibokniuwurdxndxfd`  
**Repository:** `parabs/SocietyOS-Inspector`  
**Tenant:** Pearl Meadows C-Type Wing Co-operative Housing Society Ltd.  
**Execution date:** 7 November 2026  
**Cost boundary:** No paid Supabase branch or project was created.

## Executive status

Phase A's production tenant boundary, membership/role model, RLS, financial view protection, evidence-storage policy boundary and corresponding frontend access gate have been implemented. Production database migrations are applied and their exact SQL files are retained in `supabase/migrations/` on this branch. The frontend was merged to `main` in commit `e85a0ddb69afa4c5c4ed06beb0b4dae659e0661d`. GitHub Actions run #679 passed build/typecheck and the GitHub Pages deployment run #42401999353 completed successfully, including build, artifact upload and deploy.

The existing Google-linked account with trusted `app_metadata.role = society_admin` was retained and mapped to the Society Admin membership. No Auth metadata was edited. Google sign-in alone does not grant application access: an active society membership and assigned role are required. Users without a role remain outside the app. Requester and Caretaker roles are also held outside the current UI because their dedicated workspaces are not yet implemented.

## Applied production migrations

| Version | Migration |
|---|---|
| 20261107174146 | Revoke anonymous financial view access and lock trigger functions |
| 20261107174331 | Restrict legacy RPC and trigger execution |
| 20261107174556 | Lock unscoped audit evidence storage |
| 20261107174800 | Identity foundation |
| 20261107174859 | Seed Pearl Meadows tenant and role presets |
| 20261107175122 | Add society keys and backfill legacy data |
| 20261107175213 | Enforce same-society relationships |
| 20261107175302 | Tenant permission helpers and access RPC |
| 20261107175402 | Expand tenant permission helpers |
| 20261107175509 | Replace legacy policies with tenant permissions |
| 20261107175613 | Convert financial views to security invoker |
| 20261107175803 | Hide access resolver behind private schema |
| 20261107175828 | Restrict direct financial and import writes |
| 20261107175927 | Scope import batch guard per society |
| 20261107180158 | Secure membership, role and party-link workflows |
| 20261107180310 | Membership invitation and directory RPC |
| 20261107180835 | Enforce active-society request context |
| 20261107181546 | Move privileged membership workflows to private schema |
| 20261107181606 | Revoke public/anonymous grants on public tables and sequences |
| 20261107181816 | Index uncovered tenant and legacy foreign keys |
| 20261107181842 | Remove duplicate member opening-balance unique constraint |
| 20261107182245 | Scope audit evidence storage by society |
| 20261107182427 | Record anonymous storage-object grant revocation attempt |

No production migration was marked applied manually and the migration ledger was not rewritten.

## Identity, roles and permissions

- Tenant boundary is the registered society; buildings/wings remain within the legal society.
- Eight role presets: Society Admin, Treasurer, Secretary, Chairman, Auditor, Member, Requester and Caretaker.
- Permission catalogue: 62 codes; role-permission mappings: 77.
- One active membership and one active Society Admin grant exist: the owner-confirmed existing Google-linked account.
- Memberships, role grants, permission grants and verified party-user links are separate records.
- Grant/revoke, membership status, invitation acceptance and party-user verification are audited workflows.
- Self-role assignment is blocked. The last active Society Admin cannot be revoked, suspended or ended.
- Party-user links can only be verified by an authorized membership manager and must reference a party in the same society.
- Role and membership tables have no direct browser write policies.

## Tenant isolation and database enforcement

- 52 tenant-owned public tables have non-null `society_id`.
- 37 validated composite same-society foreign keys protect tenant-owned relationships.
- RLS is enabled on all 52 tenant-owned tables; legacy broad policies were replaced with permission-based policies.
- Each PostgREST request must include the selected `x-society-id` header. The database independently verifies active membership and role permission for that society. A client-supplied tenant ID cannot grant access.
- Access claims are derived from database memberships and roles, not user-editable metadata.
- All 11 financial reporting views use `security_invoker=true`; anonymous financial view access is denied.
- PUBLIC/anon grants on public-schema tables and sequences were revoked. Backups, permission catalogue and execution-test tables remain deliberately deny-by-default.
- Direct client writes to posted financial records, import batch control rows, role/membership records and party-user links are blocked. Controlled RPC/Edge Function paths are used.

## Storage

- `audit-evidence` is private.
- Required object path: `<society_uuid>/<module>/<filename>`.
- Read/upload policies validate the society UUID in the path against active membership and permissions.
- No update/delete policy exists for evidence objects; an existing storage trigger also blocks deletion.
- No evidence objects existed at verification time.
- Supabase-managed storage ACL entries are owned by `supabase_storage_admin`; the connected role could not remove those owner-issued ACL entries. RLS has no anonymous policy and no update/delete policy, so those operations remain denied by RLS. This is covered by the storage assertions.

## Application and Edge Functions in this branch

- `AuthGate` checks `get_my_society_access()` and pending invitations. It does not authorize from a global JWT role claim.
- Google sign-in is available; unassigned users see an access-required state. Invited users can accept an invitation. Roles without a released workspace do not enter financial screens.
- `SocietyAccessContext` pins PostgREST requests to the active society with `x-society-id`.
- Sidebar and screen routing are permission-filtered. Header shows active society and database-assigned roles and supports a society selector.
- User & Role Access screen supports invitations/role assignment, role revocation and membership suspension/reactivation.
- FY2018 importer sends the selected society ID and requires society-scoped import permission.
- `import-fy2018-workbook` and `manage-society-members` are deployed with JWT verification enabled. The member-management function checks both membership and role-management permissions before inviting/assigning.

## Financial data preservation

Tenant keys and relationships were backfilled; financial values and historical calculations were not recalculated or edited.

| Record set | Rows |
|---|---:|
| Transactions | 731 |
| Demand register | 729 |
| Party master | 58 |
| Category master | 47 |
| Account master | 8 |
| Member opening balances | 44 |
| Flat owner master | 39 |
| Source register | 12 |
| Rules master | 19 |
| Demand backup | 583 |
| Transaction-demand mapping backup | 316 |

At verification: one tenant, one building, eight role presets, 62 permission codes, 77 role-permission mappings, one active membership, one active role grant, one membership audit event and zero audit-evidence objects.

## Verification performed

These rollback-only SQL assertion scripts were run successfully against production:

- `supabase/tests/phase_a_tenant_rls_assertions.sql`
- `supabase/tests/phase_a_member_scope_assertions.sql`
- `supabase/tests/phase_a_membership_workflow_assertions.sql`
- `supabase/tests/phase_a_importer_contract_assertions.sql`
- `supabase/tests/phase_a_storage_containment_assertions.sql`

Coverage: Society Admin financial row-count regression; missing/wrong tenant header denial; unassigned user denial; member linked-party-only scope; self-role and last-admin protections; party-user verification; per-society import guard; blocked direct import writes; private evidence bucket, path validation and no update/delete policy.

Supabase security advisor no longer reports anonymous financial view exposure, public SECURITY DEFINER RPC exposure, broad public RLS policies or mutable-search-path trigger functions. Remaining security warning: leaked-password protection disabled in Supabase Auth. Performance advisor no longer reports unindexed foreign keys or duplicate indexes; the two archived backup tables intentionally have no primary key.

## Remaining release gates

1. Enable Supabase Auth leaked-password protection in project Auth security settings. The connected Supabase tools do not expose this setting.
2. Verify Auth Site URL/redirect allow-list includes `https://parabs.github.io/SocietyOS-Inspector/`.
3. Complete a real Google invitation/acceptance test with a second account and verify role-specific access. No second account was created or invited during this pass.
4. Complete a real Storage API upload/read and cross-society denial test. SQL policy tests passed; no evidence file was created.
5. Confirm the deployed GitHub Pages site is reachable and complete a signed-in smoke test against the new frontend. The main-branch deployment completed successfully, but this tool session could not access the public Pages URL to verify browser rendering and sign-in end-to-end.

## Explicitly not done

- No paid Supabase branch/project.
- No changes to transaction/demand/receipt amounts, categories, allocations or balances.
- No Auth metadata rewrite.
- No bulk invitations or new user accounts.
- No real evidence upload.
- No fabricated migration history or destructive rebuild.

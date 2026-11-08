# Phase A3 — Tenant authorization and permission matrix (review draft)

**Status:** Design only; no production policy, grant, schema, financial or Auth change.
**Scope:** Multi-society Society OS, guided onboarding, small and medium CHS. Existing Pearl Meadows C-Type Wing society remains one independent tenant.

## Authorization contract
- Deny by default. Evaluate `auth.uid()` -> active `society_memberships` for requested `society_id` -> active society-scoped role assignment -> permission -> record scope -> workflow state -> separation-of-duties.
- Never authorize by global JWT `app_metadata.role`, client-supplied role, self-asserted actor ID or merely `auth.uid() IS NOT NULL`.
- Every tenant-owned record has a trustworthy society association; cross-tenant parent/child links are rejected. Historical records remain unchanged until a verified backfill.
- A person may have different roles in different societies. An Auth user, Party and member are separate identities.
- Roles are presets, not hard-coded privilege guarantees. Multiple roles may be assigned; explicit conflict-of-interest checks still override accumulated privileges.
- Permissions distinguish `read`, `create_draft`, `edit_draft`, `submit`, `review`, `approve`, `post`, `reverse`, `sign_off`, `export`, `manage`. A UI-hidden action is not security enforcement.
- Read scope: `own` (own claims/requests), `linked_party` (verified party-user association), `assigned` (work items assigned), `society` (authorized society-wide), `audit` (auditor approved scope). Sensitive documents additionally require object/record authorization.
- Financial posting, reversals, membership/role grants and final audit sign-off go through trusted server-side transactions/RPCs with immutable audit events, not unrestricted direct table writes.

## Baseline role presets
| Role | Baseline authority | Restrictions |
|---|---|---|
| Society Admin | Setup, invite users, configure role assignments, manage non-financial master drafts | No automatic right to approve own payment, post/reverse money or sign auditor opinion. Initial admin is not a global platform admin. |
| Treasurer | Society-wide financial read; verify receipts; prepare/record authorized financial entries; manage reconciliations | Expense approval separate from payment execution; no self-approval. No audit sign-off. |
| Secretary | Governance, notices, meetings, compliance submissions, society-wide approved financial summaries | No default posting/reversing money or approving own expense. |
| Chairman | Governance oversight, approve expenditure within delegated policy, review financial summaries | No default direct transaction posting or unilateral audit sign-off. |
| Auditor | Time-bound, read-only financial/audit evidence and export; record independent observations and auditor sign-off where formally assigned | Cannot edit source financial entries, approve expenditure or administer roles. |
| Member | Read linked-party bills, balances, receipts and permitted notices; submit payment claim, query or expense request | No other member's records or society-wide financial ledger by default. |
| Requester | Submit/read own expense requests and supporting evidence; respond to clarification | No approval or posting. May overlap with other roles but cannot approve own request. |
| Caretaker | Assigned operational tasks; submit/read own or assigned requests, limited vendor/contact details | No general member balances, financial ledger or financial approvals. |

## Record/action matrix
Legend: R=read; D=create/edit draft; S=submit; V=verify/review; A=approve; P=post; X=reverse/correct; O=oversight; G=governance sign-off; I=independent auditor sign-off; M=manage; E=export. Qualifiers: own/linked/assigned/society. A dash means no default access. All privileges subject to society membership, state, limits, delegation and separation of duties.

| Record/workflow | Admin | Treasurer | Secretary | Chairman | Auditor | Member | Requester | Caretaker |
|---|---|---|---|---|---|---|---|---|
| Society identity, buildings, onboarding | R,M | R | R | R | R | R limited | — | — |
| Memberships, role grants | M audited | R limited | R limited | R limited | R audit | R own | R own | R own |
| Parties, units, parking, linked-party contacts | M drafts | R,D | R,D | R | R audit | R linked | R own | R assigned |
| Rules and charge configuration | M draft | R,D | R,V | R,A delegated | R audit | R published | — | — |
| Demands, bills, opening balances | R | R,D,P authorized | R | R | R,E | R linked | — | — |
| Payment claims and evidence | R | R,V | R summary | R summary | R,E | R,D,S own | — | — |
| Receipts and demand allocations | R | R,P,X controlled | R summary | R summary | R,E | R linked | — | — |
| Expense requests and supporting evidence | R | R,D,S,V | R,D,S,V | R,V,A delegated | R,E | D,S own | R,D,S own | R,D,S assigned |
| Expense approval decisions | R | R,V,A only if delegated and not requester | R,A if delegated and not requester | R,A if delegated and not requester | R | R own status | R own status | R own status |
| Payment execution and payment register | R | R,P,X controlled | R summary | R summary | R,E | — | R own status | R assigned status |
| Bank reconciliation and corrections | R | R,V,P,X controlled | R summary | R summary | R,E | — | — | — |
| Financial reports, ledgers and exports | R,E | R,E | R,E scoped | R,E scoped | R,E audit | R linked statements | — | — |
| AGM, committee meetings and notices | R,M | R | R,D,S,G delegated | R,V,G delegated | R audit | R published | — | R assigned |
| Statutory compliance and FY close | R,O | R,D,V | R,D,G delegated | R,V,G delegated | R,I independently assigned | R published | — | — |
| Audit findings and evidence | R audit | R,respond | R,respond | R,respond | R,D,I | — | — | — |
| Security/audit event history | R scoped | R financial scoped | R governance scoped | R oversight scoped | R audit scoped | R own event status | R own | R own |

**Critical clarifications:** `P` is trusted posting, not arbitrary SQL write. `X` is controlled cancellation/reversal/replacement with preserved history, not deletion. Role matrix is a starting policy, not a claim about current production privileges. Rules approval and expenditure approval require explicit configured delegation and financial limits.

## Workflow gates
1. **Member payment:** linked member submits claim -> treasurer verifies actual settlement/reference -> trusted posting creates receipt and deterministic allocation -> PDF receipt issued. Uncertain allocation stays on-account/unallocated. No receipt from screenshot alone.
2. **Expense:** requester submits -> reviewer validates -> authorized independent approver approves -> treasurer records verified actual payment -> payment register updated. Approved is not paid. Track requested, approved and paid amounts separately.
3. **Corrections:** original remains immutable; authorized correction references original, reason, evidence and approver when required. Cross-period changes and closed-year actions require special controls.
4. **Financial year close:** Treasurer prepares and reconciles; authorized office bearers perform governance approvals; independent auditor signs audit opinion if applicable. No self-sign-off through accumulated roles.
5. **Small society exception:** one-person administration is configurable only via an explicit, logged exception for unavoidable dual control; display exception in oversight/audit reports. Never silently bypass separation-of-duties. Independent audit remains independent.
6. **Tenant-scoped evidence:** storage paths, metadata and signed download flows enforce society + record + permission. Object upload alone never establishes a financial transaction.

## Policy implementation order (not authorized to deploy)
1. Inventory every consumer of 11 existing financial views, SECURITY DEFINER functions, storage bucket, direct API and Edge Functions.
2. Resolve canonical production migrations and inspect actual deployed SQL.
3. Add and validate identity foundation in an isolated no-cost local test environment when available.
4. Establish verified tenant keys and membership links; dry-run historical backfill with counts and reconciliation.
5. Introduce tenant-aware helper functions and permissions; test positive and negative cases for every role and cross-society access.
6. Harden views, base RLS, grants, functions, storage, RPCs, exports and service-role paths as a coordinated change.
7. Regression-test FY2018–19 balances, demands, receipts, allocations, ledgers and audit closure before production approval.

## Required test cases
- Member A cannot read Member B's private financial records; linked-party relationship is effective-dated.
- User in Society A cannot read/write Society B through tables, views, RPCs, storage URLs, exports or nested FK IDs.
- Removed/suspended membership immediately loses access; expired delegation cannot approve.
- Requester cannot approve own request, even if Treasurer/Chairman/Admin roles are also assigned.
- Treasurer cannot issue receipt without verified settlement or duplicate-post same external reference.
- Expense approval does not create a payment; partial payment preserves outstanding approved amount.
- Auditor cannot mutate financial records or grant permissions; audit evidence remains available under authorized scope.
- Anon cannot access tenant financial views or storage objects.
- A malicious client cannot assert society_id, actor_id, role, payment state or approval amount.
- Existing FY18–19 calculations are unchanged after security migration.

## Open decisions before production
- Approval limits and delegated signatory combinations per society.
- Whether Secretary/Chairman receive full ledgers or restricted summaries by default.
- Scope and expiry of auditor assignments.
- How to verify the initial Auth user's membership and society association without assuming email-based identity.
- Canonical migration source and a tested deployment/rollback plan.

**Production gate:** no application of this design without explicit user confirmation and a verified migration/test plan.

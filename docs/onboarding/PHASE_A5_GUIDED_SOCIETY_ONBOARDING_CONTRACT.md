# Phase A5 — Guided society onboarding and first-admin setup

**Status:** Product and implementation contract only. No Auth, schema, membership or production data changed.
**Product direction:** Both small and medium societies; guided setup; one configurable product. Pearl Meadows C-Type Wing remains its own registered society, not a child of a parent Pearl Meadows tenant.

## 1. Onboarding goals
A new society should reach a safe, usable starting point without needing an accountant or developer to understand database internals. The flow collects only information needed for setup, explains optional steps, validates before activation and preserves an auditable setup history.

The same guided flow supports:
- Small society: one primary admin/treasurer, minimal users and optional approval configuration.
- Medium society: committee users, separate review/approval/payment roles, delegated approval limits and auditor access.
- Multiple buildings/wings within one registered society.
- Separate registered societies as separate tenants, even when they share a property brand or parent development name.

## 2. Society identity and tenant creation
Collect and verify:
- Registered legal name exactly as on registration certificate.
- Society type and registration number (where applicable).
- Registered address and operational address if different.
- State, city, PIN code, time zone and financial year start/end.
- Currency (default INR; confirm).
- Contact channels and official correspondence details.
- Building/wing structure only where applicable.
- Registration certificate or supporting evidence where available.

Rules:
1. A building, wing, phase or property brand is not automatically a separate society or a parent tenant.
2. Create a separate tenant only when a distinct legal/operational society is confirmed.
3. Do not silently normalize or abbreviate the legal identity; store display name separately from registered legal name.
4. Registration identifiers are unique only within a clearly defined issuing jurisdiction/type; do not assume global uniqueness.
5. Do not infer legal name, registration number, address, ownership or society relationships from email domain or property branding.
6. Society creation and activation are separate states: Draft -> Identity Review -> Active / Rejected / Suspended.
7. Preserve who created, reviewed and activated the society and what evidence supported it.

## 3. First administrator invitation and claim
1. Create society in Draft/Identity Review state.
2. Invite the intended first administrator using a verified email or supported identity-provider flow.
3. User authenticates independently; the system binds the authenticated user UUID to the invitation.
4. Verify the user's authority to administer the society using a documented evidence/attestation process appropriate to the onboarding channel.
5. Create an active society membership and assign the Society Admin role through a trusted server-side action.
6. Record invitation, acceptance, verification, role grant and activation events.
7. Do not put email addresses, user UUIDs, secrets or access tokens in public repository documentation.
8. Do not grant a global platform-admin role to make the first user a society administrator.
9. If the invitation is expired, revoked or accepted by a different account, do not silently transfer it; restart a controlled invitation.
10. A user can be an admin of one society and a member/auditor of another under independent memberships.

**Existing Pearl Meadows case:** The existing Auth user is the intended initial Society Admin according to the user's instruction. This is a pending identity/membership mapping to validate through a trusted process, not permission to insert a membership or alter production Auth metadata automatically.

## 4. Guided setup steps

### Step 1 — Legal identity
Confirm legal identity, society address, jurisdiction, financial year, currency and society status. Explain why a separate legal society must have a separate tenant.

### Step 2 — Buildings and assets
Add buildings/wings and unit numbering conventions. Optionally import flats/shops and parking assets. A parking asset is independent of flat ownership; allow separate allottee/user and multiple relationships. Do not fabricate owner, tenant, area, share or asset links.

### Step 3 — Parties and relationships
Import or add owners, co-owners, tenants, occupants, organisations, vendors and authorised representatives. Distinguish Party from Auth user and membership. Permit unknown or pending relationships with explicit status; do not force equal ownership shares when unknown. Use effective dates for changes.

### Step 4 — Committee and staff
Invite Treasurer, Secretary, Chairman, committee members, caretakers, requesters and auditor. Assign role presets, then review permissions and scope. Make auditor assignment time-bound and read-only by default. Require conflict-of-interest and separation-of-duties review.

### Step 5 — Financial configuration
Configure chart/accounts, categories, recurring charges, due dates, late fee rules, payment channels, approval limits and receipt numbering. Rules are versioned/effective-dated. Explain the difference between current rules and historical rules; never retroactively rewrite old demands.

### Step 6 — Opening data and imports
Offer a guided import with template, preview, column mapping, validation and dry-run. Preserve source files, batch ID, row-level source references and import results. Distinguish:
- Valid and matched records.
- Valid but unresolved records.
- Duplicate candidates.
- Invalid rows requiring correction.
- Records intentionally excluded with reason.

No import should auto-invent Party IDs, Account IDs, Category IDs, Demand IDs, owners or demand allocations. Unresolved rows remain visible in an exception queue and can be mapped later.

### Step 7 — Review and activate
Show a readiness summary:
- Legal identity and admin verification.
- Membership/role coverage.
- Asset/party relationship completeness.
- Financial configuration and effective dates.
- Opening balances and import exceptions.
- Payment/expense approval controls.
- Backup/export and audit settings.

Require an explicit authorized activation action. Activation must not imply historical data is audited or reconciled.

## 5. Setup modes and defaults
| Capability | Small society preset | Medium society preset |
|---|---|---|
| Admin | One primary admin | Multiple admins optional |
| Finance | Treasurer handles routine work | Treasurer + reviewer/payer separation |
| Expense approvals | Simple configurable threshold; self-approval prohibited | Multi-tier limits and delegation |
| Governance | Basic office bearer roles | Committee roles and approval groups |
| Auditor | Read-only when assigned | Time-bound read-only access and evidence scope |
| Buildings | Optional | Optional, multi-building supported |
| Imports | Guided template and validation | Same, with batch review and delegated cleanup |
| Virtual accountant | Read-only/advisory | Read-only/advisory with role-scoped context |

These are presets, not different codebases. Every preset is editable through explicit, audited configuration.

## 6. Virtual accountant guardrails
- Read-only and advisory in initial release.
- Can explain balances, identify anomalies, suggest category/party mapping and prepare draft reports or correction proposals.
- Cannot post, delete, approve, reverse, change rules, grant roles or close audit items.
- Recommendations cite source records and show confidence/uncertainty.
- Unidentified items remain unidentified until a human confirms the mapping.
- Sensitive financial context is limited to the requesting user's active society permissions.

## 7. Recovery and lifecycle
- Draft onboarding can be resumed by authorized invitees.
- Expired invitations can be reissued without duplicating memberships.
- Society suspension blocks normal user operations but preserves historical/audit access for authorized roles.
- Society closure is a controlled legal/retention process, not deletion of its financial history.
- Transfer of office bearer roles uses end-dated old membership-role assignments and new audited grants.
- Role removal takes effect immediately for new requests; existing in-flight approvals are re-evaluated against current authority before completion.

## 8. Acceptance tests
- Two registered societies in the same property development are separate tenants.
- One society with multiple wings remains one tenant when legally one society.
- First admin invitation cannot be claimed by another account.
- Auth user, Party and membership remain distinct.
- A user with roles in two societies sees only the currently authorized tenant context.
- Suspended/expired membership cannot access data or approve workflows.
- Parking allotment does not require flat ownership.
- Multiple owners and tenants can be represented without fabricated shares.
- Unknown party/category/account mappings survive import as explicit exceptions.
- Dry-run import produces no financial writes.
- Activation does not recalculate or rewrite imported historical data.
- Small and medium presets use the same authorization and workflow engine.
- Virtual accountant suggestions cannot mutate source records.

## 9. Open implementation dependencies
- Canonical production migration SQL and current repository checkout.
- Verified first-admin identity and legal authority process for each onboarding channel.
- Final legal identity fields and evidence-retention policy.
- Existing account/category/rule master compatibility and import contract.
- Tenant-aware authorization and storage design.
- Tested export, backup, suspension and closure procedures.

## 10. Implementation boundary
This document is not authorization to create tenants, invitations, memberships, role grants, imports, migrations or production data. Those operations require verified identity, schema reconciliation, test evidence and explicit production approval.

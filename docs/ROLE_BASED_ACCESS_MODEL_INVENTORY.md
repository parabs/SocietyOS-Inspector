# Role-Based Access Model — Current Inventory and Decisions

**Status:** Discovery document; no permissions or production policies are changed by this document.

## 1. Authentication and authorization are separate

The agreed product model is:

- Every user signs in with their Google account.
- A successful Google sign-in establishes identity only.
- The user's assigned role determines which screens, actions, records, and approvals they may access.
- Role checks must be enforced by the database for data access and by the application for navigation and user experience. Hiding a button is not a security boundary.

The application authentication gate is being prepared separately. It must not be treated as completion of role-based authorization or tenant isolation.

## 2. What currently exists in the production schema

Read-only inspection of the current production schema found **no canonical user-role assignment table, role catalogue, permission catalogue, society membership table, or society tenant key**.

Role-like columns currently exist as workflow assignment/attribution fields:

| Table / field | Existing role labels or purpose |
|---|---|
| `financial_year_checklist.owner_role` | Chairman, Internal Auditor, Secretary, Treasurer |
| `financial_year_checklist.approver_role` | Chairman, Managing Committee, Secretary, Treasurer |
| `compliance_obligations.owner_role` | Assigned Coordinator, Managing Committee, Secretary, Treasurer |
| `compliance_obligations.reviewer_role` | Chairman / Committee, General Body, Independent Reviewer, Managing Committee, Auditor and combined reviewer labels |
| `governance_task_approvals.approver_role` | Constrained to Treasurer, Secretary, Chairman, Managing Committee |

These fields describe who is responsible for a workflow task or approval. They do **not** prove that a Google account has been assigned that role, and must not be used as an account authorization source.

The existing `app_metadata` society-admin claim is a global claim, not a society-scoped membership record. A global claim alone is insufficient for a multi-society product.

## 3. Candidate role catalogue to validate

The following are role labels observed in workflow data or the current admin concept. This is an inventory, not an approved permission matrix:

- Society Admin
- Chairman
- Secretary
- Treasurer
- Managing Committee
- Internal Auditor
- Independent Reviewer
- Auditor
- Assigned Coordinator
- General Body

Combined labels such as “Chairman / Committee” and “Secretary / Committee” are workflow reviewer descriptions, not necessarily standalone account roles. They should be normalized only after the owner confirms the intended role catalogue.

## 4. Required authorization design

Before implementing role policies, establish:

1. **Society membership:** a user can belong to one or more societies; every membership is scoped to a society.
2. **Role assignment:** each membership has one or more roles from a controlled catalogue; role assignment and revocation are auditable.
3. **Permission matrix:** each role is mapped to view, create, update, approve, export, and administer capabilities by functional area.
4. **Separation of duties:** a user must not approve their own work where independent approval is required.
5. **Tenant isolation:** every society-owned record and storage object is scoped to a society; policies validate the user's active membership in that society.
6. **Database enforcement:** RLS, view grants, and storage policies enforce the same permissions. Frontend routing is supplementary only.
7. **Safe onboarding:** Google-authenticated users without an assigned membership/role receive no society data access until an authorized administrator assigns access.

## 5. Suggested permission areas for the matrix

The permission matrix should explicitly cover:

- Financial reports and ledgers — view/export
- Transactions and source data — view/create/update/correct
- Demand and receipt mapping — view/create/update/approve
- Masters and configuration — view/manage
- Audit verification and observations — review/update/resolve
- Financial-year close and freeze — prepare/review/approve
- Compliance obligations and evidence — assign/update/review
- Governance approvals — submit/approve/reject
- User and membership administration — invite/assign/revoke roles
- Society configuration — administer

No permissions are inferred from job titles in this document.

## 6. Security release boundary

The current database has financial views and policies that require a coordinated security cutover. Do not deploy a broad authenticated-user gate as the only protection. Do not apply grants, RLS, view, storage, or Auth changes until the membership and role policy is approved and the signed-out, unassigned, ordinary-member, office-bearer, auditor, and administrator cases can be tested.

## 7. Owner decisions required

The owner must confirm:

- The final account-role catalogue (including whether “Society Admin” is a platform role or a per-society role).
- Which roles are allowed to view financial records, and which can modify or approve them.
- Whether ordinary members/flat owners will have individual login accounts and access to only their own records.
- Who can invite users and assign/revoke roles.

Until these decisions are made, this document records findings and a design checklist only.
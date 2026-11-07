# Society OS — Workflow Database Design and Migration Proposal

**Status:** Proposed design for review; not applied  
**Repository:** `parabs/SocietyOS-Inspector`  
**Target branch:** `foundation/sprint-1-domain-architecture`  
**Depends on:** `WORKFLOW_LIVE_SCHEMA_AND_APPLICATION_IMPACT_ASSESSMENT.md`  
**Safety boundary:** This document is not an executable migration. No DDL or data changes have been applied.

## 1. Decisions

1. Preserve the existing financial core: `transactions`, `demand_register`, `demand_payment_allocations`, account/party/category/rule masters and central calculation views.
2. Do not reuse `financial_year_checklist`, `governance_task_approvals` or `governance_task_activity` for member payments or expenses.
3. Model payment claims, verified receipts, receipt issuance, expense requests, approvals and actual payments as distinct states/entities.
4. A workflow approval is not a financial posting. Only a verified receipt or a recorded expense payment creates/links a financial transaction.
5. Build society tenancy and membership authorization before exposing any new workflow data to members.
6. New workflows must be additive. Do not bulk-update historical transactions or demands.
7. Keep all workflow actions auditable and attributable to an authenticated user; use append-only event/decision records for important transitions.

## 2. Existing database constraints that shape this design

The current public schema contains no society/tenant table or membership table. Existing finance tables such as `transactions`, `demand_register`, `party_master` and `account_master` have no `society_id`. Existing policies include broad authenticated-user access in governance tables, and audit evidence object policies are bucket-scoped rather than society/path-scoped.

Therefore, **Phase A (tenant identity and authorization) is a hard prerequisite**. Do not create workflow tables with a fake/default society ID and do not grant member access while the active society boundary is unresolved.

The existing `transactions` table uses:
- primary key: `transaction_id` (text);
- date: `transaction_date`;
- type: `transaction_type`;
- generic receipt/voucher reference: `voucher_receipt_no`;
- amount: `amount`;
- payment method: `payment_mode`;
- financial links: `party_id`, `category_id`, `account_id`, optional `demand_id`.

The existing `demand_payment_allocations` table uses `allocation_id`, `transaction_id`, `demand_id`, `allocated_amount`, `allocation_date` and `notes`. Use the live column names, not stale generated TypeScript aliases.

## 3. Proposed domain model

### 3.1 Tenant and identity foundation

| Entity | Purpose | Important design |
|---|---|---|
| `societies` | Legal/operating society tenant | UUID primary key, unique tenant code, display/legal name, timezone, status, settings |
| `society_memberships` | User membership in a society | FK to society and auth user; status and effective dates; unique active membership per user/society |
| `society_roles` or role grants | Society-scoped capabilities | Roles are scoped to a society, not global JWT claims |
| `party_user_links` | Connect authenticated user to Party Master | Explicitly verified link; one user may represent more than one party only by explicit grant |
| `society_buildings` | Multiple buildings within a society | FK to society; optional until a society needs multiple buildings |

**Important identity separation:**
- Auth user = login identity.
- Party = person/organisation record.
- Asset relationship = owner/tenant/occupant/allottee relationship.
- Society membership = legal/operational membership.
- Society role = permission to perform actions.

Never grant a user access to a party solely because email/mobile matches. A Treasurer is not automatically a member of every party, and a member login is not automatically the sole owner of an asset.

**Migration strategy:** introduce society identity and membership first. For the current Pearl Meadows deployment, a single explicit tenant mapping may be proposed only after confirming the legal society identity and validating that every existing row belongs to it. Do not backfill with an arbitrary constant. New tenant-scoped workflows must not be enabled until the mapping is reviewed.

### 3.2 Shared workflow engine

#### `workflow_instances`

One record per business workflow instance.

| Field | Type / rule | Purpose |
|---|---|---|
| `workflow_id` | UUID PK | Workflow identity |
| `society_id` | UUID FK, NOT NULL | Tenant boundary |
| `workflow_type` | text check: `member_payment`, `expense_request` | Domain type |
| `status` | controlled text | Current summary status |
| `created_by` | UUID auth user | Initiator |
| `created_at`, `updated_at` | timestamptz | Lifecycle |
| `completed_at` | nullable timestamptz | Terminal completion |

Do not put arbitrary table names and row IDs in an unconstrained polymorphic reference. Domain tables should each hold a unique FK to the workflow instance, ensuring a workflow cannot silently point to a missing business record.

#### `workflow_steps`

One row per required action/approval step.

| Field | Type / rule | Purpose |
|---|---|---|
| `step_id` | UUID PK | Step identity |
| `workflow_id` | UUID FK | Parent workflow |
| `step_no` | integer | Ordered sequence |
| `step_type` | text check | Review, approval, verification, payment release |
| `assigned_user_id` | nullable UUID | Specific assignee |
| `assigned_role` | nullable text | Role-based queue |
| `status` | text check | Pending, In Progress, More Info, Approved, Rejected, Skipped |
| `decision_by`, `decision_at` | nullable UUID/timestamptz | Decision attribution |
| `decision_reason` | nullable text | Reason/conditions |
| `created_at`, `updated_at` | timestamptz | History |

Enforce exactly one assignment strategy per step where required: assigned user or assigned society role. Support sequential and parallel steps, but MVP defaults are simple: one Treasurer review/verification for payments; configurable Treasurer/committee approval for expenses.

#### `workflow_events`

Append-only event history for every transition.

- `event_id` UUID PK
- `workflow_id` UUID FK
- `society_id` UUID FK (tenant filter and integrity)
- `event_type` controlled text
- `from_status`, `to_status`
- `actor_user_id` UUID
- `reason` text
- `event_data` JSONB for non-authoritative context only
- `created_at` timestamptz

The event log is the audit history. The current status on the domain/workflow row is a query-friendly summary and must be changed only through controlled transition functions/services. Do not permit users to edit or delete event rows.

#### `workflow_comments` and `workflow_attachments`

Comments and evidence are separately addressable and tenant-scoped:
- comment: workflow, author, body, visibility, created timestamp;
- attachment: workflow, uploaded by, storage object key, file name, MIME type, size, checksum, evidence category, created timestamp, optional superseded reference.

Never store public file URLs for private receipts or payment evidence. Store object keys and generate short-lived authorised links at read time.

### 3.3 Member payment submission

#### `member_payment_submissions`

A member's claim that they have paid. It is **not yet a receipt or a financial transaction**.

| Field | Type / rule | Purpose |
|---|---|---|
| `submission_id` | UUID PK | Submission identity |
| `workflow_id` | UUID unique FK | Shared workflow |
| `society_id` | UUID FK | Tenant |
| `party_id` | text FK to party master | Member party |
| `submitted_by` | UUID FK auth user | Login making claim |
| `amount_claimed` | numeric(14,2), > 0 | Amount member says was paid |
| `payment_method` | controlled text | UPI, bank transfer, cheque, cash, gateway |
| `payment_date` | date | Date paid/reported |
| `bank_value_date` | nullable date | Actual bank value date when known |
| `reference_number` | nullable text | UTR/cheque/gateway reference |
| `member_note` | nullable text | Explanation |
| `status` | controlled text | Submitted, Under Verification, More Information Required, Verified, Rejected, Withdrawn |
| `verified_amount` | nullable numeric | Amount actually confirmed |
| `verified_by` | nullable UUID | Treasurer/reviewer |
| `verified_at` | nullable timestamptz | Confirmation timestamp |
| `rejection_reason` | nullable text | Mandatory on rejection |
| `transaction_id` | nullable text FK to transactions | Set only after successful financial posting |
| `created_at`, `updated_at` | timestamptz | Lifecycle |

Constraints:
- one workflow per submission;
- verified amount must be positive and not exceed the claim unless a controlled exception is approved;
- no `transaction_id` while status is unverified/rejected;
- a posted transaction must be a Receipt and match the verified amount, party and society;
- posting is idempotent: repeated confirmation calls return the already-linked transaction, never create a second receipt transaction;
- no official receipt is issued on screenshot upload alone.

**Partial payment:** member submits the amount actually paid. If they make separate instalments, each is a separate submission/receipt. Do not mark an entire demand as paid because one partial payment arrived.

**Excess/advance payment:** post the confirmed money received. If no safe demand allocation exists, retain it as on-account/unallocated money; do not invent a demand mapping.

### 3.4 Official receipt issuance

#### `receipt_issuances`

One receipt issuance per posted receipt transaction; reprints reference the same issuance. Corrections use cancellation/replacement events, not in-place edits.

| Field | Type / rule | Purpose |
|---|---|---|
| `receipt_issuance_id` | UUID PK | Issuance identity |
| `society_id` | UUID FK | Tenant |
| `transaction_id` | text unique FK | Posted receipt transaction |
| `receipt_number` | text | Human-readable receipt number |
| `sequence_value` | bigint | Sequence value |
| `issued_at` | timestamptz | Official issue time |
| `issued_by` | UUID | Issuing service/user |
| `document_object_key` | text | Private storage key |
| `document_checksum` | text | Immutable document checksum |
| `status` | controlled text | Issued, Cancelled, Superseded |
| `supersedes_receipt_id` | nullable UUID self-FK | Replacement chain |
| `cancellation_reason` | nullable text | Mandatory when cancelled |
| `created_at` | timestamptz | Audit timestamp |

Numbering:
- Sequence must be per society, with optional financial-year partition/configuration.
- Recommended simple default for a new society: `1, 2, 3...`; do not require a complex prefix.
- Enforce uniqueness on `(society_id, receipt_number)` and sequence allocation under a database transaction/locking mechanism.
- Never renumber historical FY 2018–19 voucher references.
- A reprint is not a new issuance and does not consume a new number.
- A cancelled receipt number is never reused.

### 3.5 Expense request and approval

#### `expense_requests`

A request/commitment is not a paid expense.

| Field | Type / rule | Purpose |
|---|---|---|
| `expense_request_id` | UUID PK | Request identity |
| `workflow_id` | UUID unique FK | Shared workflow |
| `society_id` | UUID FK | Tenant |
| `requested_by` | UUID | Requester |
| `payee_name` | text | Vendor/payee |
| `payee_party_id` | nullable text FK | Known vendor party, optional for first request |
| `purpose` | text | Plain-language reason |
| `category_id` | nullable FK | Suggested category |
| `requested_amount` | numeric(14,2), > 0 | Requested amount |
| `approved_amount` | nullable numeric(14,2) | Approved cap |
| `approval_conditions` | nullable text | Conditions |
| `urgency` | controlled text | Routine, Soon, Urgent |
| `needed_by` | nullable date | Needed date |
| `status` | controlled text | Submitted, Under Review, More Information Required, Approved, Partially Approved, Rejected, Cancelled, Payment in Progress, Partially Paid, Paid |
| `decision_reason` | nullable text | Approval/rejection explanation |
| `created_at`, `updated_at` | timestamptz | Lifecycle |

Rules:
- requester cannot approve their own request by default;
- Treasurer cannot self-approve their own request where separation-of-duties is enabled;
- partial approval is allowed; approved amount cannot exceed requested amount without a new/amended request;
- approval creates a commitment/work queue item only; it does not create a transaction or change cash/bank balances;
- rejection reason required;
- amendments after approval must be versioned/re-submitted or explicitly re-approved.

#### `expense_payments`

One row per actual payment/instalment against an approved request.

- `expense_payment_id` UUID PK
- `expense_request_id` UUID FK
- `society_id` UUID FK
- `amount_paid` numeric(14,2), > 0
- `paid_on` date
- `account_id` FK to account master
- `payment_method` controlled text
- `payment_reference` nullable text
- `recorded_by` UUID
- `transaction_id` nullable text FK to transactions, unique when present
- `status`: Recorded, Posted, Reversed
- `created_at` timestamptz

Constraints:
- total posted payments cannot exceed approved amount without an explicit additional approval;
- transaction link must point to a Payment transaction and match amount/account/date;
- payment posting is idempotent;
- a request is Paid only when posted instalments equal the approved amount; otherwise Partially Paid;
- approved-but-unpaid requests never appear as cash/bank payments in financial reports.

## 4. Posting boundary: the critical accounting rule

The domain workflow is not the ledger. The controlled posting service/function is the boundary between an operational decision and the financial record.

### Member payment posting transaction

One atomic database operation should:
1. lock the payment submission row;
2. verify status is eligible and no transaction is already linked;
3. verify the acting user has Treasurer/payment-verification permission in this society;
4. apply separation-of-duties policy or record explicit exception;
5. record verified amount, date and reviewer;
6. insert exactly one `transactions` row with `transaction_type='Receipt'`, positive amount, correct `party_id`, account, payment method, and transaction/payment dates;
7. allocate to demands only where allocation is supported by a deterministic, approved rule; otherwise leave on-account/unallocated;
8. link submission to transaction;
9. allocate next receipt number and insert receipt issuance record only after successful posting;
10. append workflow events;
11. commit all changes together.

If receipt PDF generation is asynchronous, create the issuance record/number transactionally and use an outbox/job status for rendering. Do not lose the receipt number or create another transaction on retry.

### Expense payment posting transaction

One atomic database operation should:
1. lock the expense request/payment row;
2. confirm request approval and available approved amount;
3. verify payer's society permission;
4. insert exactly one `transactions` row with `transaction_type='Payment'` and the correct sign convention used by the existing financial engine;
5. link the payment instalment to the transaction;
6. update paid/partially-paid request status;
7. append workflow events;
8. commit together.

Do not write to balance snapshots or calculate report totals inside this workflow. Existing financial views remain the calculation authority.

## 5. RLS and storage design

No new table should be exposed until a society membership model exists and is tested.

Required helper concepts:
- `is_active_society_member(society_id)`
- `has_society_permission(society_id, permission_code)`
- `current_active_society_id()` only if active-society selection is persisted/validated server-side.

Do not trust a client-supplied `society_id` or a global `society_admin` JWT claim as proof of membership. Verify active membership and permission against database records.

Suggested permission codes:
- `member.payment.submit`
- `member.payment.read_own`
- `treasurer.payment.verify`
- `treasurer.receipt.issue`
- `expense.request.create`
- `expense.request.read_own`
- `expense.request.review`
- `expense.payment.record`
- `committee.expense.approve`
- `auditor.workflow.read`

Access patterns:
- Member: create/read own submissions and receipts for linked party; no direct update of verification, transaction or receipt number.
- Treasurer: read/verify submissions for their society; issue receipts through controlled posting action.
- Requester: create/read own expense requests; no self-approval.
- Approver: decide only assigned society workflow steps.
- Payer/Treasurer: record payment only against approved request and within permission.
- Auditor: read-only access to workflow events, supporting evidence and linked transactions for authorised society.
- Platform support: time-bound, audited support access; no implicit routine access.

Storage:
- Private bucket only.
- Object keys begin with validated society ID and workflow ID.
- Policies verify membership/permission and that object metadata belongs to the same workflow/society.
- No broad `authenticated using (bucket_id = ...)` read policy.
- Use signed URLs for display/download and record download/access events for sensitive evidence if required.

Existing `audit-evidence` policies must be reviewed and tightened as a separate security change before using that bucket for new member payment evidence. Do not assume current policies are safe.

## 6. Status lifecycle

### Member payment

`Submitted → Under Verification → Verified → Receipt Issued`

Alternative transitions:
- `Under Verification → More Information Required → Under Verification`
- `Under Verification → Rejected`
- `Submitted → Withdrawn` (only before verification)
- `Verified → Reversed` only through a controlled financial reversal/correction path, never a direct status edit.

Receipt issuance is a distinct event from payment verification. A verified receipt transaction must not be silently deleted.

### Expense

`Submitted → Under Review → Approved / Partially Approved / Rejected`

Approved path:
`Approved → Payment in Progress → Partially Paid → Paid`

Additional transitions:
- More information required and resubmission;
- cancellation before payment;
- approved request amendment requiring re-approval;
- reversal/correction of posted payment through controlled financial correction process.

## 7. Idempotency, integrity and audit requirements

- Unique transaction linkage on each submission and expense payment.
- Unique receipt number within society (and configured numbering period).
- Idempotency key on external gateway callbacks and client retries.
- Never rely on frontend button disabling for duplicate prevention.
- Row locks or equivalent transactional serialization for verification/posting and receipt numbering.
- Check constraints for positive amounts and valid state combinations.
- Foreign keys with `ON DELETE RESTRICT` for financial/audit records.
- No hard deletes of submitted/approved/posted workflow records.
- Append-only workflow event and decision records.
- Every rejection, exception, reversal, cancellation and amendment requires a reason.
- Evidence checksum and metadata; retain original uploaded evidence.
- All timestamps in timestamptz; retain separate payment date, bank value date, verification time and receipt issue time.

## 8. Migration plan — additive and staged

### Phase A — Tenant and membership foundation (blocking prerequisite)

1. Design and review `societies`, `society_memberships`, role/permission grants, explicit Party Master-to-user links and active-society selection.
2. Confirm the current legal society tenant and mapping to existing Pearl Meadows records.
3. Dry-run a mapping report showing every existing operational/financial row assigned to the intended society; unresolved rows must be listed, not guessed.
4. Add tenant identity columns/relationships only after mapping approval.
5. Add tenant-scoped RLS and test with at least two societies and users with distinct memberships.
6. Tighten storage evidence policies and test cross-society access.
7. Only then enable member-facing workflows.

**No backfill or RLS enforcement should be run until a reviewed table-by-table mapping and rollback plan exist.**

### Phase B — Shared workflow foundation

1. Create `workflow_instances`, `workflow_steps`, `workflow_events`, `workflow_comments`, `workflow_attachments`.
2. Add tenant-scoped indexes, constraints, RLS and immutable-event triggers.
3. Add controlled transition functions/services; revoke direct status mutation from ordinary clients.
4. Add test fixtures for requester, Treasurer, approver, auditor and cross-society access.

### Phase C — Member payment and receipt

1. Create `member_payment_submissions` and `receipt_issuances`.
2. Create a per-society receipt sequence/configuration table.
3. Implement atomic verification/posting and receipt issuance.
4. Integrate with existing `transactions` and `demand_payment_allocations`.
5. Implement private receipt rendering/storage and idempotent reprint/cancel/replace behavior.
6. Add regression tests proving no change to historical transactions, demands, allocations or FY 2018–19 reports.

### Phase D — Expense request and payment

1. Create `expense_requests` and `expense_payments`.
2. Add society-configurable thresholds and approval routing.
3. Implement approval, partial approval and payment posting.
4. Link only actual payments to `transactions`.
5. Test partial payments, unpaid approvals, over-limit attempts, self-approval and reversals.

### Phase E — Application/UI

1. Member: bills, amount due, submit payment, status, receipts.
2. Treasurer: verification queue, evidence comparison, confirm/reject/request info.
3. Requester: create expense request and track status.
4. Approver: assigned approvals and reasons/conditions.
5. Treasurer/payer: record expense payment and evidence.
6. Auditor: read-only trace from request/submission to workflow events, receipt and transaction.
7. Dashboard: waiting actions, overdue tasks, approved-but-unpaid commitments and verified receipts.

## 9. Required test matrix

| Test | Expected result |
|---|---|
| Member submits payment claim | Submission created; no transaction and no receipt |
| Member uploads screenshot only | Remains unverified |
| Treasurer rejects claim | Reason required; no financial transaction |
| Treasurer confirms claim once | One Receipt transaction; one receipt issuance |
| Treasurer double-clicks/retries | Same linked transaction/receipt returned; no duplicate |
| Payment has no clear demand | Receipt posted; amount remains on-account/unallocated |
| Payment covers several demands | Allocation rows sum to verified amount; no over-allocation |
| Member submits partial amount | Only actual amount posted; residual due remains |
| Expense request submitted | No payment transaction or cash/bank movement |
| Expense approved but unpaid | Appears in commitment queue; not in paid expenses |
| Expense partially paid | One transaction per actual instalment; remaining commitment visible |
| Expense exceeds approval | Posting blocked pending additional approval |
| Requester approves own request | Blocked unless explicitly configured exception and audited |
| User from Society A requests Society B record | Denied at database RLS layer |
| Member reads another member's receipt | Denied |
| Auditor reads authorised society workflow | Read-only trace available |
| Existing FY 2018–19 regression | Approved balances/reports unchanged |
| Receipt reprint | Same receipt number/document issuance; no new financial transaction |
| Receipt cancellation/replacement | Original retained, reason and replacement chain recorded |

## 10. Decisions to confirm before executable DDL

The architecture can proceed with these defaults unless the product owner changes them:

1. **Receipt numbering:** per society, simple running sequence `1, 2, 3...`; optional year prefix setting; no reuse after cancellation.
2. **External payment verification:** manual Treasurer confirmation by default; gateway auto-confirmation only after signed provider callback and reconciliation.
3. **Demand allocation:** apply deterministic rules only; allow on-account/unallocated balance; never guess.
4. **Expense approval:** one Treasurer approval default for small societies; configurable thresholds and additional committee approvals for medium societies.
5. **Separation of duties:** requester cannot approve own request by default; small-society exception must be explicit, reasoned and audited.
6. **Multi-society access:** database-enforced membership and permissions before member-facing release.
7. **Receipt corrections:** cancel/reissue with history; never edit or reuse issued number.
8. **Financial posting:** only server-controlled atomic posting path may insert/link new workflow-originated financial transactions.

## 11. Explicit non-goals for these migrations

- No rewrite of FY 2018–19 data.
- No demand regeneration or payment remapping.
- No changes to existing financial calculation views.
- No new accounting ledger or parallel balance table.
- No automatic posting by AI.
- No broad refactor of historical audit verification.
- No public evidence or receipt URLs.
- No enabling multi-society member access before tenant RLS tests pass.

## 12. Review gate

After product/design approval, the next deliverable should be an executable, additive migration set on a dedicated feature branch, starting with Phase A only. The migration must include:
- exact tenant backfill mapping plan;
- RLS policy tests and two-society test fixture;
- storage policy migration;
- rollback/recovery notes;
- verification query showing no change to historical financial row counts and report totals.

Do not apply Phase B–D until Phase A passes and is accepted.

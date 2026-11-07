# Society OS — Shared Approval and Task Workflow Design

**Status:** Proposed technical design for Sprint 1 review  
**Repository scope:** Documentation only; no schema or application changes are authorised by this document.  
**Related documents:** `FOUNDATION_SPRINT_1_ARCHITECTURE.md`, `MVP_PRODUCT_DIRECTION_AND_SPRINT_1_PRIORITIES.md`

## 1. Purpose

Society OS needs two simple, auditable volunteer workflows:

1. A member reports a maintenance payment; the society verifies receipt of money and issues an official receipt.
2. A requester raises an expense; an authorised person approves it; an authorised payer records the actual payment.

Both workflows need queues, assignments, notifications, evidence, decisions and history. They must share reusable workflow infrastructure without collapsing their different financial meanings into one generic approval record.

**Core rule:** a request, a decision, a verified receipt and a completed payment are different business events. Never infer one from another.

## 2. Design principles

- Keep the user-facing language task-oriented: submitted, waiting for review, needs information, approved, paid, receipt ready.
- Preserve distinct domain records for payment submissions and expense requests.
- Reuse workflow infrastructure for routing, assignments, status history, evidence references and notifications.
- Only trusted, authorised actions may create or change financial records.
- Do not write to the existing financial engine until the relevant domain event is confirmed and validated.
- Preserve partial, excess, advance, unmatched and reversed payment scenarios.
- Keep requested, approved, committed and paid expense amounts separate.
- Make every material decision attributable to a user, society, timestamp and reason.
- Support configurable controls for small and medium societies without separate implementations.
- No AI or virtual accountant may approve, verify, post, reverse or pay autonomously.

## 3. Conceptual architecture

Separate the reusable workflow layer from the financial domain layer.

```
Shared workflow infrastructure
  ├── Workflow instance / task
  ├── Assignment and approval steps
  ├── Status transition history
  ├── Comments and clarification
  ├── Evidence / attachment references
  └── Notifications and reminders

Payment domain                         Expense domain
  ├── Payment submission               ├── Expense request
  ├── Verification decision            ├── Approval decision(s)
  ├── Confirmed receipt event           ├── Approved commitment
  ├── Demand allocation                 ├── Payment record(s)
  └── Receipt document                  └── Linked expense transaction
                                           /
                                          /
                Existing financial engine
                  ├── Transactions
                  ├── Demand register
                  ├── Payment allocations
                  ├── Account balances
                  └── Reports and ledgers
```

The workflow layer manages who must act and what is waiting. The domain layer determines what the action means financially. The financial engine remains the authoritative source for posted transactions, demands, allocations, balances and reports.

## 4. Shared workflow entities

These are logical entities, not a final physical schema. Names and keys must be reconciled with the live database before any migration is proposed.

### 4.1 Workflow instance

Represents one actionable process associated with a society and a domain record.

Suggested attributes:
- workflow_id, society_id
- workflow_type: member_payment_verification or expense_approval
- domain_record_type and domain_record_id
- current_status
- current_step / current_assignee where applicable
- created_by, created_at, updated_at
- completed_at, cancelled_at
- priority / due_at where applicable

A workflow instance must reference exactly one domain record. It must not become the financial record itself.

### 4.2 Workflow step / assignment

Represents a review or action required from a person or role.

Suggested attributes:
- step_id, workflow_id, sequence
- step_type: review, verify, approve, clarification, record_payment, exception_review
- assigned_user_id or assigned_role (one or both according to routing rules)
- status: pending, in_progress, completed, skipped, cancelled
- assigned_at, due_at, completed_at
- decision and decision_reason
- delegation / reassignment history

Support sequential and parallel approvals. Do not assume every society needs multiple approval steps.

### 4.3 Workflow event history

Append-only history of important actions:
- workflow created / submitted
- assigned / reassigned
- review started
- information requested / supplied
- approved / partially approved / rejected
- payment verified / verification rejected
- payment recorded
- receipt issued
- cancelled / reversed / reopened

Each event should capture society_id, workflow_id, actor, event type, timestamp, reason, and relevant before/after status. Where financial values change, record the amount and currency context. Corrections create new events; do not erase old events.

### 4.4 Comments and evidence

- Comments belong to a workflow and have author/time.
- Evidence is stored in private, society-scoped storage.
- Keep attachment metadata separate from the file bytes: uploader, uploaded_at, file type, size, purpose, visibility and linked domain record.
- Evidence may be a quotation, invoice, UTR proof, bank/gateway reference or other document.
- Do not expose private evidence to every authenticated user. Access follows society membership and workflow permissions.
- Retain evidence and event history according to the society's retention policy and applicable legal requirements.

### 4.5 Notifications

Notifications are generated from state changes and assignments, not used as the source of truth. A missed email or WhatsApp notification must not lose a task or change its status. The in-app queue remains authoritative.

## 5. Workflow A — Member maintenance payment

### 5.1 Domain record

A payment submission records a member's claim that money has been paid. Suggested attributes:
- payment_submission_id, society_id, party_id and relevant asset/unit reference
- amount, currency, payment_method
- member_reported_payment_date
- bank_value_date (nullable)
- UTR / gateway reference / cheque number / cash reference
- member_note and evidence references
- status and created_by / created_at

A submission may relate to one or more demands, but a member's selected demand allocation is a request, not necessarily the final allocation.

### 5.2 State model

```
Draft
  └── Submitted
       └── Under verification
            ├── Clarification required ──> Submitted / Under verification
            ├── Rejected
            └── Verified
                 ├── Allocation pending
                 └── Receipt issued
                      └── Reversed / refunded (controlled correction)
```

The implementation may represent receipt issuance and allocation as separate sub-statuses/events. This is preferable to a single overloaded status if it avoids ambiguity.

### 5.3 Verification and receipt rules

- Member-submitted screenshots and UTR details are evidence for review, not proof of settlement on their own.
- Treasurer or another authorised verifier confirms the money against bank, gateway, cheque or cash records.
- A trusted payment gateway callback may use a separately configured automated verification path. Validate provider signature, event identity, amount, currency, society/account mapping and idempotency before confirming.
- Duplicate gateway callbacks and duplicate member submissions must not create duplicate receipts.
- Verification must record the verifier, time, source of confirmation and reference.
- A verified receipt records money received. Demand allocation is a separate operation.
- If the demand allocation is uncertain, record the amount as unapplied/on-account and place it in a review queue. Never force a guessed allocation.
- Support partial payment, advance, excess payment, multiple-demand payment and unmatched receipt.
- Keep member-reported date, bank value date, verification date and receipt issue date distinct.
- A receipt number must be unique within the society's configured numbering scope.
- Once issued, a receipt is not silently edited or deleted. Corrections use cancellation/reversal/replacement with a reason and linked history.
- A person must not verify their own payment submission when separation of duties is enabled. Small-society exception requires an explicit permission and audit reason.

### 5.4 Financial engine integration

Only after verification:
1. Create or link the authoritative receipt transaction through the existing financial service / posting path.
2. Link the transaction to the payment submission and preserve idempotency key / external reference.
3. Allocate to demands only using approved matching rules; unresolved amounts remain unapplied.
4. Generate the official receipt from the confirmed transaction and allocation state.
5. Recalculate or refresh existing balance/report views through the current financial calculation layer.

Do not create a parallel receipt ledger or independent balance calculation for this workflow.

## 6. Workflow B — Expense request, approval and payment

### 6.1 Domain record

An expense request records an intention to spend money. It is not a payment transaction.

Suggested attributes:
- expense_request_id, society_id
- requester_user_id and requester_party_id where relevant
- description, purpose, suggested_category_id
- vendor/payee identity and contact details
- requested_amount, currency, requested_date, urgency
- evidence references
- approved_amount (decision history remains authoritative)
- status, created_at, updated_at

Store decisions and payment instalments as separate records/events rather than overwriting the original request.

### 6.2 State model

```
Draft
  └── Submitted
       └── Under review
            ├── More information required ──> Submitted / Under review
            ├── Rejected
            └── Approved / Partially approved
                 └── Payment pending
                      ├── Partially paid
                      └── Paid
```

Cancellation and post-approval amendment are controlled transitions with reasons. If an approved request changes materially (payee, purpose or amount), require re-review according to society policy.

### 6.3 Approval rules

- Approval records approver, time, approved amount, conditions and evidence considered.
- Approval does not create a payment or reduce the bank/cash balance.
- Requested amount, approved amount and paid amount remain distinct.
- Support full, partial and conditional approval; additional committee approval can be configured by amount or policy.
- The requester cannot approve their own request.
- The Treasurer cannot approve their own request where separation of duties is enabled. Small-society exception must be explicit and audited.
- Evidence requirements can vary by amount and category. If a policy permits an exception, capture the reason rather than silently bypassing the requirement.
- Flag potential duplicates, unusual amounts, missing payee details and threshold breaches for review.
- Approved-but-unpaid commitments are shown separately from posted expenses.

### 6.4 Payment recording

An authorised payer records each payment or instalment:
- actual paid amount and payment date
- payee and payment method
- source account / cash account
- bank reference / UTR / cheque details
- proof / supporting evidence
- recorded_by and recorded_at

Only a confirmed payment record may create or link a financial payment transaction. Partial payments remain linked to the same expense request until the approved amount is settled or the request is formally closed. Any amount above approval requires a further approval or documented exception before posting.

### 6.5 Financial engine integration

After payment is confirmed and validated:
1. Create or link the payment transaction using the existing financial service / posting path.
2. Link it to the expense request and the specific payment instalment.
3. Use approved category/account mapping; unresolved mappings enter review rather than being guessed.
4. Update balances and reports through the existing financial calculation layer.
5. Preserve the approval and payment evidence links for committee and audit review.

Do not post an expense transaction at request submission or approval time.

## 7. Status, permissions and separation of duties

Permissions are society-scoped and action-based. UI visibility is not security enforcement.

| Action | Member / requester | Treasurer | Committee approver | Auditor |
|---|---:|---:|---:|---:|
| Submit own maintenance payment | Yes | If also member | If also member | No by default |
| View own payment status / receipt | Yes | Yes, within society role | Policy-based | Read-only scope |
| Verify member payment | No | Yes | Optional policy | Read-only |
| Raise expense request | If authorised | If authorised | If authorised | No by default |
| Approve expense request | No, own request prohibited | Policy-based | Policy-based | No |
| Record expense payment | No by default | If authorised payer | If authorised payer | No |
| View audit evidence/history | Own workflow | Yes | Policy-based | Read-only scope |

Additional controls:
- Role assignments and permissions must be resolved against the active society.
- Reassignment must retain the original assignee and reason.
- Auditors can inspect records and evidence but cannot alter workflow decisions or financial entries.
- Platform support access is separate, restricted and audited.
- Small and medium society defaults may differ, but the same permission model applies.

## 8. Validation, idempotency and exception handling

Before any financial posting:
- Validate society and party/asset scope.
- Validate positive amount, currency and permitted payment method.
- Validate source account and payee where applicable.
- Validate approval / verification state and actor permission.
- Check external reference and idempotency key for duplicates.
- Confirm that the domain record has not already been posted or fully paid.
- Ensure the amount being posted does not exceed the verified/approved amount unless an explicit exception is authorised.

Exception queue should cover:
- duplicate payment reference or duplicate expense evidence
- payment submitted but not found in bank/gateway
- verified payment with no clear demand allocation
- approved expense with missing payee or payment account
- payment amount differing from approved amount
- receipt generation failure after successful posting
- gateway callback replay or out-of-order event
- request/payment reversal or refund

A failure after posting must be recoverable without posting the same transaction twice. Use idempotent posting and reconciliation/retry states.

## 9. Audit and reporting requirements

Provide operational queues:
- Payments awaiting verification
- Clarification requested
- Verified but not fully allocated
- Receipts generated / receipt failures
- Expenses awaiting approval
- Approved but unpaid
- Partially paid expenses
- Rejected / cancelled requests
- Exceptions requiring action

Provide summary indicators without conflating states:
- member payment claims submitted
- money verified and received
- money unapplied / on-account
- receipts issued
- expense amount requested
- expense amount approved
- expense amount paid
- approved commitments not yet paid

Auditors and committee users should be able to trace each financial transaction back to its submission/request, decision, evidence and actor history.

## 10. UX requirements

Every task screen must answer, in plain language:
1. What is waiting?
2. Who needs to act?
3. What evidence or information is needed?
4. What happens after this action?
5. Has money actually moved, or is this only a request/approval?

Use explicit wording:
- "Payment submitted — awaiting verification" (not "Paid")
- "Payment verified — receipt ready" (not "Approved")
- "Expense approved — payment pending" (not "Paid")
- "Expense paid" only after a payment transaction is confirmed and linked.

Do not expose debit/credit, journal, allocation or ledger terminology in the ordinary member/requester journey. Keep detailed accounting traceability available to Treasurer and auditor views.

## 11. Delivery sequence

### Design and impact assessment
1. Map the logical entities to existing tables and services.
2. Identify existing receipt/payment posting paths and reuse them.
3. Identify current transaction, demand allocation, account balance and receipt-number mechanisms.
4. Define state-transition and permission matrices.
5. Define idempotency, evidence access and exception handling.
6. Review effects on existing reports and FY 2018–19 workflows.

### Build sequence after design approval
1. Shared workflow queue, event history and assignment primitives.
2. Member payment submission and Treasurer verification.
3. Receipt generation and unapplied-payment queue.
4. Expense request and approval.
5. Payment recording and financial transaction linkage.
6. Notifications, evidence access, exception queues and audit exports.
7. Regression and tenant-isolation tests.

## 12. Acceptance criteria

The design/build is acceptable only when:
- A submitted member claim cannot appear as confirmed money received.
- A verified payment can issue one official receipt, never duplicates.
- Unclear allocations remain unapplied rather than guessed.
- An expense request or approval cannot reduce cash/bank balances.
- Only a confirmed expense payment creates/links a payment transaction.
- Partial payments and instalments are supported.
- Requester/verifier/approver separation rules are enforced server-side.
- Every transition and financial posting has actor, timestamp and reason/evidence where required.
- Duplicate submissions, callbacks and posting retries are idempotent.
- Existing financial tables, calculations, reports and historical records remain authoritative.
- Small and medium societies can configure approval complexity without separate product implementations.
- Existing FY 2018–19 reports and workflows pass regression checks.

## 13. Explicit non-goals and safety boundary

This document does not authorise:
- production schema changes or migrations;
- changes to existing financial records, receipt numbers, allocations or balances;
- changes to existing reports or calculation logic;
- automatic payment verification from a member-uploaded screenshot;
- autonomous AI approvals or financial posting;
- mandatory multi-step committee approval for every society.

First complete the live schema/service impact assessment and review this design. Only then prepare additive migration and implementation proposals for approval.

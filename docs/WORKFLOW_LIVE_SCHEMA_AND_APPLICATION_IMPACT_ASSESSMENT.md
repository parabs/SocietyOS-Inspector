# Society OS — Live Schema and Application Impact Assessment

**Status:** Read-only inspection completed; findings for design review  
**Inspected:** Supabase project `hklibokniuwurdxndxfd` and repository `parabs/SocietyOS-Inspector` default branch `main`  
**Purpose:** Map the shared approval/payment/expense design to existing systems before proposing schema or application changes.  
**Safety:** Inspection only. No database writes, migrations, financial recalculations, code changes or production settings changes were performed.

## 1. Executive conclusion

The existing system has a usable financial foundation, but it does **not** yet have the member-facing payment submission, official receipt issuance, or expense request/approval/payment workflows described in the MVP.

The correct direction is to preserve the current financial core and introduce separate operational workflow records that link to it only when a financial event is confirmed.

**Do not build yet on top of the existing governance approval tables as-is.** They are specific to financial-year checklist/governance work, and their current read policies are broad. They are not a safe general-purpose approval engine.

## 2. Live database inventory

Current read-only counts at inspection time:

| Table | Rows | Relevance |
|---|---:|---|
| `transactions` | 731 | Existing financial source of truth |
| `demand_register` | 729 | Existing member demand records |
| `demand_payment_allocations` | 0 | Allocation structure exists; currently no rows |
| `transaction_verification_records` | 0 | Existing transaction evidence/review structure |
| `transaction_correction_register` | 0 | Existing controlled correction structure |
| `governance_task_approvals` | 0 | Existing governance checklist approvals |
| `governance_task_activity` | 1 | Existing governance activity history |
| `data_management_change_log` | 1 | Existing generic data-change log |

These are live counts and may change. They are not a statement that all existing historical transactions need reprocessing.

### 2.1 Existing financial tables to retain

- `transactions`: primary financial transaction record, with `transaction_id`, transaction date/type, receipt/voucher reference, party/category/account, amount, payment mode, source provenance, bank/evidence review fields and optional `demand_id`.
- `demand_register`: demand source of truth, including party, rule, category, amount, period and due date.
- `demand_payment_allocations`: links a transaction to a demand with an allocated amount and date. Its foreign keys already reference transactions and demands.
- `account_master`: society cash/bank account identity.
- `party_master`, `category_master`, `rules_master`: existing masters used by the financial layer.
- `v_demand_transaction_reconciliation` and related balance views: existing central calculation layer. New workflows must use this layer rather than calculate balances independently.

### 2.2 Existing verification and correction structures

- `transaction_verification_records` stores bill, voucher/receipt and internal-audit review statuses, reviewer, remarks and verification timestamp. It is an audit/evidence review record for an existing transaction, not a member's pre-receipt payment claim.
- `transaction_correction_register` tracks missing/import-omission transaction corrections and review decisions. Its purpose is historical correction, not ordinary expense approval.
- `data_management_change_log` records before/after data changes. It is useful as a secondary technical audit trail but does not replace domain workflow events.

These structures should remain in their current purpose. Avoid overloading them to represent new business processes.

## 3. Existing approval structures are not reusable unchanged

The live database has:
- `governance_task_approvals`, linked to `financial_year_checklist`, with a constrained set of decisions and office-bearer roles.
- `governance_task_activity`, linked to governance checklist activity.

They are coupled to a financial-year checklist and governance context. They do not provide:
- a generic workflow instance linked to a payment submission or expense request;
- reusable step assignment, routing or parallel approvals;
- clarification/re-submission lifecycle;
- partial approval and multiple expense payment instalments;
- payment verification distinct from approval;
- idempotent linkage to a posted financial transaction;
- private evidence metadata and domain-specific retention/access.

**Recommendation:** create a separate shared workflow/task layer for the MVP, while retaining governance tables for their current governance use. Reuse concepts and UI patterns, not their current table contracts.

## 4. Receipt and payment findings

### 4.1 No dedicated receipt register or receipt issuance service was identified

The live schema has `transactions.voucher_receipt_no`, which is a generic voucher/receipt reference on the financial transaction. The application service inspected reads receipt-like values from legacy aliases, but no dedicated receipt issuance table, receipt-number allocator, official receipt document record or payment submission entity was identified in the inspected paths.

This means the official member receipt flow is a new capability. The eventual design should:
- keep the financial transaction as the authoritative record of money received;
- store a unique receipt issuance record/number and document metadata linked to that transaction;
- enforce idempotency so retries cannot issue duplicate receipts;
- support cancellation/reversal/replacement history rather than editing an issued receipt in place.

Receipt numbering scope and format should be configurable per society; do not hardcode the historic FY 2018–19 voucher format for new societies.

### 4.2 Existing allocation structure is reusable

The existing `demand_payment_allocations` table is the correct financial linkage for a receipt transaction that pays one or more demands. The central calculation migration explicitly uses direct `transactions.demand_id` first and allocation rows as the alternate path when the direct link is absent.

Design implication:
- preserve the direct demand link where it is unambiguous and compatible with current calculations;
- use allocation rows for multi-demand or split allocation;
- allow verified receipts with no allocation yet;
- do not add a fabricated demand link merely to make a receipt appear fully allocated.

### 4.3 No ordinary receipt-creation path was found in inspected application service

The inspected `SupabaseDataService` currently fetches transaction rows and updates audit inspection fields. It does not expose a member payment submission API, a Treasurer verification/posting operation, or an official receipt-generation method.

The current `getTransactions()` mapper also contains legacy field fallbacks (for example `row.type`, `row.date`, `row.receipt_no`) while the live schema uses `transaction_type`, `transaction_date`, and `voucher_receipt_no`. The inspection update method matches on `id`, while the live primary key is `transaction_id`. This is a pre-existing integration mismatch to review separately; do not silently change it as part of this workflow design or rewrite historical records.

## 5. Expense request findings

No expense-request or expense-approval domain table was identified in the inspected live schema. Existing `transactions` can represent a paid expense, but they cannot safely represent a draft request or an approved-but-unpaid commitment.

**Recommendation:** introduce an expense request domain record and one-or-more expense payment records. Only a confirmed payment record should create/link the existing `transactions` payment row. An approved request must not affect cash/bank balances.

The expense request should retain requested amount, approved amount, and paid amount separately. Multiple instalments must link to the same request and each posted transaction must be traceable to its payment instalment.

## 6. Security and RLS findings — MVP blocker

The inspected relevant policies show:
- `transactions`, `transaction_verification_records` and `transaction_correction_register` use `is_society_admin()` for authenticated access.
- `is_society_admin()` checks JWT `app_metadata.role/roles` for a platform-level `society_admin` marker. It does not establish membership in a particular society.
- `governance_task_approvals` and `governance_task_activity` currently have authenticated-user SELECT policies with `USING (true)`.
- The existing operational tables inspected do not yet have society_id tenancy scope.

These policies reflect the current single-society app context; they are not suitable as the final member-facing multi-society access model.

Before enabling member or requester access:
1. Complete the society membership and active-society authorization foundation.
2. Add society scope to new workflow, request, evidence and receipt records.
3. Enforce row access by active society membership and action permission, not merely authenticated status or a global admin claim.
4. Scope private evidence storage paths and policies to society and authorised workflow participants.
5. Test cross-society reads/writes with distinct test identities.
6. Review existing governance broad-read policies separately; do not widen them for the new feature.

No RLS policy was changed during this inspection.

## 7. Recommended logical data model for the next design pass

This is a logical proposal, not approved DDL:

### Shared workflow layer
- `workflow_instances`: society, workflow type, domain record reference, status, timestamps.
- `workflow_steps`: ordered/parallel action, assignee/role, state, due date, decision.
- `workflow_events`: append-only transition history, actor, reason, before/after.
- `workflow_comments`: clarification and discussion.
- `workflow_attachments`: private evidence metadata and storage reference.
- Notification/outbox mechanism: reliable delivery separate from workflow truth.

### Payment domain
- `member_payment_submissions`: member claim, amount, method, reported date, reference, evidence, status.
- `receipt_issuances`: unique society-scoped receipt number, linked transaction, issue/cancel/replacement metadata and document reference.

The final model must distinguish submitted claim, verified money, receipt issuance and demand allocation.

### Expense domain
- `expense_requests`: requester, purpose, payee, requested amount, category suggestion, evidence, status.
- `expense_approval_decisions` (or workflow-step decisions): approver, approved amount, conditions and reason.
- `expense_payments`: each payment/instalment, amount, date, account, reference, evidence and linked financial transaction.

The workflow instance should link to the domain record. Do not use a polymorphic reference without integrity safeguards; consider typed foreign keys or explicit domain link tables so invalid/dangling references are prevented.

## 8. Existing application areas to extend

Inspected repository files:
- `src/services/supabaseService.ts`: current data-access service for transactions, demands, allocations and masters. Add dedicated domain services rather than making this one file responsible for all workflow orchestration.
- `src/context/VerificationContext.tsx`: existing verification state/context. Its audit verification concepts should not be conflated with a member's payment submission or Treasurer's receipt verification.
- `src/components/verification/TransactionVerification.tsx`: historical transaction inspection UI, not the member payment queue.
- `src/components/verification/AddMissingTransactionModal.tsx`: controlled audit correction workflow, not a general expense form.
- `supabase/migrations/20261029045058_add_missing_transaction_correction_workflow.sql`: missing-transaction correction process; keep separate.
- `supabase/migrations/20261104170000_central_financial_calculation_layer.sql`: authoritative calculation layer; integrate through it.

No dedicated member portal payment workflow, expense request UI, or receipt-generation component was identified in the inspected repository paths.

## 9. Proposed implementation sequence

1. **Security and tenant foundation:** define society membership and active-society permission checks before exposing member or requester data.
2. **Shared workflow primitives:** workflow instances, steps, events, comments, attachment metadata and notifications.
3. **Member payment workflow:** submit claim, verify, create financial receipt transaction through one trusted posting path, issue receipt, allocate or leave on-account.
4. **Expense workflow:** request, approval, commitment queue, record payment instalment, create/link payment transaction.
5. **User experiences:** member payment history/receipt; Treasurer verification queue; requester expense status; Treasurer approval/payment queues; auditor traceability.
6. **Regression:** FY 2018–19 balances, demand reconciliation, allocations, ledgers, receipts and reports must match approved outputs.

## 10. Decisions and open questions before DDL

These are design decisions to settle before a migration is drafted:

1. **Receipt numbering:** society-specific sequence and format. Proposed default for new societies: a simple running number such as `1`, `2`, `3`, with society/year prefix optional by configuration. Historical receipts remain unchanged.
2. **Member identity:** member login must be explicitly linked to a Party Master record and relevant asset/membership relationship. Do not grant member access by matching email/mobile alone.
3. **Payment methods:** enable gateway/UPI, bank transfer, cheque and cash per society configuration. A member-entered UTR is not verified settlement.
4. **Verification policy:** manual Treasurer verification by default for external payments; trusted gateway callbacks may use a controlled automated path after signature and reconciliation checks.
5. **Expense thresholds:** society-configurable approval matrix; keep single-approver defaults for small societies and allow additional committee approvals for larger societies.
6. **Separation-of-duties exceptions:** permit only where the society explicitly enables the exception, with reason and audit event.
7. **Receipt document storage:** private society-scoped storage, with immutable issuance metadata and controlled replacement/cancellation history.

## 11. Safety boundary

This assessment authorises no production change. Before DDL:
- confirm the logical entity names and relationships;
- inspect full current RLS, storage policies, auth setup and relevant frontend routing;
- agree the receipt numbering and approval defaults;
- prepare additive migration SQL and rollback plan for review;
- test on a non-production environment first.

Do not modify existing transactions, demand records, allocations, balances, receipts or FY 2018–19 reports as part of this feature foundation.

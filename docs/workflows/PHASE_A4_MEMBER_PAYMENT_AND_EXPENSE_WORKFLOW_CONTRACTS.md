# Phase A4 — Member payment and expense workflow contracts

**Status:** Product/engineering design only. Not a database migration or authorization to change production.
**Applies to:** New Society OS onboarding and future workflows; preserve Pearl Meadows historical transactions and calculations.

## 1. Member payment claim lifecycle

```text
Draft -> Submitted -> Under Review
                     |-> More Information Required -> Submitted
                     |-> Rejected
                     |-> Verified -> Posted
                     |               |-> Receipt Issued
                     |-> On-account / Unallocated (posted receipt, unresolved allocation)
                     |-> Cancelled (only before posting)
Posted/issued -> Correction requested -> Reversal/replacement workflow
```

### State meanings and allowed transitions

| State | Meaning | Allowed next states | Financial effect |
|---|---|---|---|
| Draft | Member is preparing a claim | Submitted, Cancelled | None |
| Submitted | Claim and reference/proof received | Under Review, Cancelled | None |
| Under Review | Treasurer is checking settlement | More Information Required, Rejected, Verified | None |
| More Information Required | Clarification/evidence needed | Submitted, Cancelled | None |
| Rejected | Claim does not represent a verified payment | Closed; new claim may be created | None |
| Verified | Actual settlement independently confirmed | Posted | None until posting |
| Posted | Receipt transaction created exactly once | Receipt Issued, Correction Requested | Creates receipt transaction; allocation may remain unresolved |
| On-account / Unallocated | Posted receipt is real but allocation is not yet determinable | Allocation reviewed/allocated; correction workflow | Receipt exists; no fabricated demand mapping |
| Receipt Issued | Official receipt artifact generated for posted receipt | Correction Requested | No additional financial effect |
| Cancelled | Unposted claim withdrawn | Terminal | None |

**Important:** “Verified” must be supported by bank statement, gateway reconciliation, cheque clearance or controlled cash receipt evidence. A screenshot or member declaration alone is not settlement verification. Cash is supported only where the society has an approved cash-handling procedure and receipt evidence.

### Required payment claim fields
- Claim ID (immutable unique identifier), society ID, claimant user ID, linked party ID, optional unit/asset reference.
- Claimed amount and currency; payment channel/mode; payment date; bank value date when known; submission timestamp.
- UTR/bank reference/gateway payment ID/cheque number/cash voucher reference as applicable.
- Evidence object references, evidence type, uploaded-by and uploaded-at metadata.
- Review status, reviewer, verification timestamp, verification source/reference and reason.
- Related transaction ID once posted; receipt number and receipt artifact version once issued.
- Demand allocation status and allocation record references; unresolved balance reason.
- Idempotency key and duplicate-detection outcome.

Do not store full card credentials, UPI PINs, banking passwords or other authentication secrets.

### Posting invariants
1. A claim cannot post unless society, claimant, party, amount, currency, payment mode and verified settlement reference are validated.
2. Posting is idempotent: retrying the same verified claim cannot create a second transaction or receipt.
3. A unique external reference is enforced within the appropriate payment provider/account scope; legitimate split payments are represented distinctly.
4. Receipt transaction amount equals the verified settled amount, not the amount typed in a screenshot or claim if they differ.
5. Allocation is deterministic and explainable. If demand matching is ambiguous, post as on-account/unallocated; do not guess.
6. Sum of allocations cannot exceed receipt amount; allocations reference demands in the same society and permitted party scope.
7. Partial payment, advance, excess, multi-month and unmatched payments are first-class cases.
8. Receipt PDF is generated only after posting, has a stable receipt number, and is versioned/reissued with an audit trail rather than silently overwritten.
9. Preserve payment date, value date, verification date and receipt issue date as distinct facts.
10. No deletion of posted financial transactions. Correct through linked reversal/replacement records with reason, actor, approver and timestamps.

## 2. Expense request lifecycle

```text
Draft -> Submitted -> Under Review
                     |-> More Information Required -> Submitted
                     |-> Rejected
                     |-> Approved (full or partial)
Approved -> Payment In Progress -> Partially Paid -> Paid
     |              |                 |
     |              |                 -> Paid
     |              -> Payment Failed / Deferred -> Approved
     -> Cancelled (before payment, with reason)
Paid -> Correction / Refund / Reversal workflow
```

### State meanings
| State | Meaning | Financial/reporting treatment |
|---|---|---|
| Draft | Request being prepared | No commitment |
| Submitted | Formal request awaiting review | Pending request, not paid expense |
| Under Review | Evidence, purpose, budget and payee checked | Pending request |
| More Information Required | Clarification required | Pending request |
| Rejected | Request declined with reason | Excluded from approved commitment and paid totals |
| Approved | Authorized amount and terms approved | Commitment; not a paid expense |
| Payment In Progress | Payment instruction initiated | Commitment remains; not yet paid |
| Partially Paid | Some amount actually paid and recorded | Paid portion in expense/payment reports; unpaid approved balance remains committed |
| Paid | Full approved amount settled and recorded | Paid expense |
| Payment Failed / Deferred | Attempt failed or postponed | No additional paid amount; approved commitment remains unless cancelled |
| Cancelled | Remaining approval/request cancelled with reason | Preserve already-paid portion; cancel only unpaid balance |
| Correction / Refund | Post-payment adjustment | Separate linked correction/refund record; never erase original |

### Required expense request fields
- Request ID, society ID, requester user ID, requester party/role, assigned reviewer.
- Description, business purpose, urgency, requested date, expected service/delivery date.
- Vendor/payee party or explicit unidentified payee pending verification; do not invent a vendor.
- Requested amount, currency, tax components if applicable, suggested category, budget/ledger context.
- Quotations, invoice/proforma, photos and other evidence references.
- Review decisions, clarification thread, approval limit/policy version, approver(s), approved amount and conditions.
- Payment schedule/installments, payment references, actual paid amounts/dates, bank account and proof.
- Linked payment transaction IDs and correction/refund references.

### Expense controls
1. Requester cannot approve their own request, even if they hold several roles.
2. Approval and payment execution are distinct events and permissions.
3. Approver must be authorized for the amount, category and purpose under the effective policy.
4. A request above approval limit must escalate to the next configured authority; never silently downgrade or auto-approve.
5. Partial approval records requested and approved amounts separately and communicates the approved scope.
6. Multiple installments create separate payment events linked to one approved request; cumulative paid amount cannot exceed approved amount without a new approval.
7. Vendor/payee changes after approval require re-review where material.
8. Duplicate invoice/reference detection flags likely duplicates; it does not silently discard legitimate recurring bills.
9. Rejection/cancellation requires a reason; no hard deletion.
10. Paid amounts come only from actual verified payment transactions, not from approval records.
11. Any refund, chargeback or returned payment is a separate linked event and updates net paid reporting transparently.

## 3. Cross-workflow event and audit contract
Every state transition records:
- Event ID, society ID, entity type/ID, prior state, new state.
- Authenticated actor ID, effective membership/role/permission used, actor's declared role only as display metadata.
- Timestamp (server generated), reason/comment, evidence references, request correlation/idempotency key.
- Relevant policy/rule version and approval delegation/limit snapshot.
- Related transaction, demand, receipt, payment, vendor or correction references.

Events are append-only to normal application roles. A correction appends a new event; it does not rewrite history. Server timestamps and trusted actor identity are authoritative.

## 4. Notifications and service expectations
- Member: claim submitted, clarification requested, rejected, verified/posted, receipt issued, allocation unresolved/resolved.
- Requester: request submitted, clarification, approved/rejected, payment initiated, partial/full payment and cancellation.
- Treasurer/reviewer: new items, items awaiting evidence, items awaiting approval, failed/duplicate references, stale pending items.
- Office bearers: escalations and exceptions only within their governance scope.
- Notifications never disclose another party's financial data and are not themselves proof of settlement or approval.

## 5. Reporting definitions
- **Payment claims pending:** submitted/under-review/clarification states; no receipt transaction yet.
- **Verified but not posted:** operational exception queue; not included in collections until posted.
- **Collections:** posted receipt transactions, with allocated and unallocated portions separately visible.
- **Approved expense commitment:** approved amount less cancelled unpaid portion; distinct from paid expense.
- **Paid expenses:** actual posted payment transactions linked to expense requests.
- **Outstanding commitment:** approved amount less actual paid amount and valid cancellation.
- **Rejected/cancelled:** retained in workflow audit metrics, excluded from active commitment.
- **Refunds/reversals:** shown gross and net; never hidden by netting away original records.

## 6. Small-society and medium-society configuration
- Same lifecycle and audit requirements for both.
- Small society may configure one operational treasurer/admin, but self-approval remains blocked. Where no second authorized approver exists, define a documented exceptional approval path with reason, independent post-event review and explicit reporting.
- Medium society can configure reviewer, approver and payer separately, multiple approval tiers, category/amount limits and delegated substitutes.
- Configuration changes are effective-dated and do not rewrite historical approvals.

## 7. Acceptance tests before implementation
- Duplicate submit/retry creates one claim and at most one receipt transaction.
- A claim with unverified proof cannot post.
- Verified payment with ambiguous demand matching remains unallocated without losing the receipt.
- Partial, advance, excess and multi-demand allocations reconcile exactly to receipt amount.
- Cross-society party/demand/transaction IDs are rejected.
- Requester cannot approve own expense through any combination of roles.
- Approved expense with no payment is not counted as paid.
- Two partial installments produce correct paid and outstanding commitment balances.
- Failed payment does not inflate paid expenses.
- Refund/reversal preserves original and net reporting.
- Evidence URLs cannot be used by a user lacking record-level permission.
- Every state change has immutable actor, timestamp and reason metadata.
- Existing Pearl Meadows FY2018–19 reports and historical transactions remain unchanged.

## 8. Implementation boundary
This contract does not define final table names, SQL, RLS policies, API routes, receipt numbering sequence or payment gateway integration. Those require reconciliation with canonical production migration SQL and the actual repository implementation. Do not infer schema from this document or apply it directly to production.

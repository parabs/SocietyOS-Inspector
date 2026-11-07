# Society OS — MVP Product Direction and Revised Sprint 1 Priorities

**Decision confirmed:** The first market segment is both small societies (up to approximately 50 flats) and medium societies (approximately 50–200 flats). The primary setup experience is guided, step-by-step onboarding.

This addendum takes precedence wherever the broader foundation architecture could be interpreted as requiring advanced functionality before the MVP can launch.

## 1. Product objective

Society OS is a simplified financial management solution for housing-society volunteers who are not accountants and may have little or no knowledge of accounting or cooperative housing bye-laws.

The product should make routine financial work understandable and safe. Accounting complexity, calculations, matching, validations and report preparation should happen behind the scenes.

The core promise:

**A volunteer treasurer should be able to understand and manage the society's routine finances confidently without needing accounting expertise.**

The product is not positioned initially as a full ERP, a statutory auditor replacement, or a comprehensive legal-compliance platform.

## 2. Initial target customer

Serve both:

- Small societies, typically up to 50 flats, where one or two volunteers manage most financial work.
- Medium societies, typically 50–200 flats, where a treasurer may coordinate with a secretary, committee members and an external accountant or auditor.

The experience should remain simple for small societies while supporting more users, approval steps, buildings and records for medium societies. Do not fork the product into separate editions or code paths for these sizes. Use configuration and permissions to scale the workflow.

## 3. Guided setup is the default

The first-run experience should be a guided wizard with clear progress, plain-language questions, examples, sensible defaults and the ability to save and continue later.

Recommended onboarding sequence:

1. **Society details:** name, address, registration details, financial year and contact information.
2. **Buildings and units:** add one or more buildings / wings, then flats, shops and parking as applicable. Allow Excel import.
3. **People and relationships:** import or add members, owners, tenants and contacts. Explain the difference in everyday language. Do not require users to understand database concepts.
4. **Opening financial position:** guided entry/import of opening balances, cash and bank accounts, with clear warnings and reconciliation steps.
5. **Monthly charges:** ask the society to configure approved maintenance charges, frequency, due date and any approved additional charges. Explain that the user should confirm the society's adopted resolutions / applicable rules.
6. **Payment methods and accounts:** configure bank accounts, cash and supported payment modes.
7. **Review and readiness:** show what is complete, what needs review and what can safely be done next. Do not block the whole product for optional source inspection or non-critical historical gaps.

Excel upload and assisted onboarding may be offered as secondary paths, but they must not replace guided setup as the default experience.

## 4. MVP user-facing jobs

The first release should focus on four jobs:

### A. Collect maintenance
- Configure recurring charges through guided questions.
- Generate monthly demands.
- Show paid, partially paid, unpaid and advance positions in plain language.
- Send reminders and provide member statements.
- Handle payments that cannot yet be confidently matched as unallocated / requiring review rather than guessing.

### B. Record money received and spent
- Record receipts and expenses with a short, guided form.
- Generate numbered receipts and payment records.
- Classify transactions using configured rules and suggested categories.
- Support bank statement import and reconciliation as an early follow-on capability.
- Keep a correction history and approval trail for sensitive changes.

### C. Understand the society's finances
- Show available bank and cash balances, collections, expenses and outstanding dues.
- Explain what changed and why.
- Highlight actionable exceptions, not just charts.
- Distinguish cash/bank position from member receivables, liabilities and restricted funds. Never imply that bank balance alone equals spendable surplus.

### D. Prepare reports
- Member outstanding statement.
- Demand and collection summary.
- Receipts and payments.
- Income and expenditure.
- Cash and bank position.
- Bank reconciliation.
- Auditor-ready supporting registers and evidence exports.

The existing financial engine, registers, views and reports should be reused and simplified through presentation and guided workflows. Do not rebuild working accounting logic just to change the user experience.


## 4A. Signature volunteer workflows: member maintenance payments and expense requests

These two workflows are core MVP differentiators. They create a clear, auditable hand-off between the person initiating an action and the Treasurer who verifies or approves it. They must be designed as simple task flows, not accounting forms.

### Workflow 1 — Member pays maintenance; Treasurer verifies; receipt is generated

**Member experience**

1. Member opens their society account and sees current monthly bills, previous outstanding amount, any approved additional charges, and total payable.
2. Member selects a bill and chooses a payment method:
   - integrated payment gateway / UPI, where enabled;
   - bank transfer / UPI outside the app;
   - cheque or cash, if the society accepts it.
3. For external payments, member enters the payment date, amount, payment reference / UTR and optionally uploads proof. The member can also submit a partial payment or payment against multiple bills where the society's policy permits.
4. The app shows **Payment submitted — awaiting Treasurer verification**. It must not show the payment as confirmed or issue an official receipt merely because a member submitted a claim or screenshot.
5. Member can track the status and receive a notification when verified, rejected or clarification is requested.

**Treasurer experience**

1. Treasurer sees a single **Payments to verify** queue with member, flat/unit, amount, date, method, reference and proof.
2. Treasurer compares the submission with the bank statement / payment gateway settlement / cash or cheque evidence.
3. Treasurer can confirm, reject with a reason, or request more information. Duplicate references and possible duplicate submissions should be highlighted.
4. On confirmation, Society OS records the receipt, applies the payment to the appropriate outstanding demands according to the approved allocation rules, and generates a unique official receipt number and downloadable/shareable receipt.
5. If allocation is uncertain, the receipt can still record money received while the amount remains explicitly unallocated / on-account for later allocation. Never force a guessed demand allocation.
6. The member is notified and can download the receipt and see the updated balance.

**Important control rules**

- Payment submission, payment verification, receipt issuance and demand allocation are distinct states / events.
- Suggested statuses: Draft, Submitted, Under Verification, Clarification Required, Verified, Rejected, Reversed / Refunded.
- A gateway-confirmed payment may follow an automated verification path based on a verified provider callback and reconciliation controls; manual Treasurer approval need not be imposed on every confirmed gateway transaction. The society can configure this policy.
- For bank transfer / UPI proof submitted by a member, the proof is evidence for review, not proof of settlement by itself.
- Do not issue duplicate receipts for the same confirmed payment. Corrections must use cancellation / reversal / replacement workflows with a reason and audit trail, not deletion.
- Partial payments, advance payments, excess payments, payment covering multiple months, and payments without a clear demand match must be supported.
- The system must distinguish payment date, bank value date, verification date and receipt issue date where relevant.
- Treasurer cannot verify their own submitted payment where separation of duties is configured; provide an exception path for very small societies with a recorded reason and optional secondary review.

### Workflow 2 — A person raises an expense; Treasurer approves; payment and accounting follow

The person raising an expense may be a committee member, caretaker, facility volunteer, staff member or another society-authorised requester. This is an **expense request**, not yet an accounting payment.

**Requester / sender experience**

1. Select **Request an expense**.
2. Enter a short description in plain language, amount, purpose, vendor / payee, expense category (suggested by the system), urgency and requested date.
3. Attach a quotation, invoice, bill, photo or other supporting evidence where available.
4. Submit and see status: Submitted, Under Review, More Information Required, Approved, Rejected, Payment in Progress or Paid.
5. The requester can respond to questions and see the decision and reason.

**Treasurer experience**

1. Treasurer sees an **Expenses awaiting approval** queue.
2. Reviews amount, purpose, category, payee, supporting document, available funds and any configured spending limit / approval requirement.
3. Can approve, reject, or request clarification. Approval may be full, partial, conditional, or require an additional committee approver depending on society policy.
4. Approval records who approved, when, the approved amount, any conditions and the supporting evidence.
5. After approval, an authorised payer records or initiates payment and attaches payment proof / transaction reference.
6. Once paid, Society OS creates the payment transaction and links it to the approved expense request. It updates cash / bank balances and reports through the existing financial calculation layer.
7. The requester receives the decision and payment status. The Treasurer can see approved-but-unpaid commitments separately from expenses already paid.

**Important control rules**

- Raising an expense does not create a posted payment or reduce the bank balance.
- Approval is not the same as payment. An approved request remains a commitment / pending payment until payment is recorded.
- Record requested amount, approved amount and paid amount separately; support partial approval and instalment payments.
- Require evidence according to configurable policy and amount thresholds. Do not make a quotation or invoice mandatory for every small expense if society policy permits exceptions; record the reason.
- Flag duplicate invoices / requests, unusual amounts, missing payee details and requests exceeding configured limits.
- The requester should not approve their own request. The Treasurer should not approve their own request where separation of duties applies. Small-society exception rules must be explicit and auditable.
- Bank/cash payment, payment reference, payee, date and evidence must be linked to the approved request.
- Rejection, cancellation, amendment and post-payment correction must preserve history.
- The system should support additional committee approval for high-value or policy-defined expenses without burdening low-value routine expenses.

### Shared approval and audit design

Both workflows should use a reusable approval/task engine with:

- society-scoped requester, reviewer and approver identities;
- configurable approval thresholds and optional multiple approval steps;
- separation-of-duties checks and explicit small-society exception handling;
- immutable status history with actor, timestamp, reason and before/after details;
- attachments stored privately and scoped to the correct society;
- notifications and reminders;
- a clear queue for each person's next action;
- exportable evidence trail for committee review and statutory audit.

The interface should always answer: **What is waiting? Who needs to act? What evidence is needed? What happens next?**

## 5. Plain-language interface rules

- Prefer “Money received” over “Receipts” where context permits.
- Prefer “Money spent” over “Payments” where context permits.
- Prefer “Who still needs to pay?” over “Debtors”.
- Prefer “Monthly bills” over “Demand register”.
- Prefer “Money available in bank and cash” over unexplained accounting balance labels.
- Avoid debit/credit, journal, ledger, contra, accrual and statutory abbreviations in routine volunteer screens.
- Provide “See accounting details” for users who need technical detail; do not remove the underlying records.
- Every warning should explain what happened, why it matters, whether the user needs to act, and what to do next.
- Never show unexplained error codes or raw database terminology to volunteers.

## 6. Virtual Society Accountant — MVP guardrails

The virtual accountant should initially be an explanatory and advisory assistant:

- Answer questions using approved financial data and calculation views.
- Explain a member balance and show the transactions/demands behind it.
- Explain why a report figure changed.
- Identify missing mappings, duplicate candidates, unmatched payments and unusual balances.
- Prepare draft corrections, reconciliations and reports for review.
- Explain which society-approved rule was applied.

It must not silently post, delete, reclassify or reallocate financial records; alter opening balances; change approved rules; approve its own recommendations; or close an audit / financial year. Any write action requires an authorised human, a preview of affected records and an audit event.

## 7. Revised Sprint 1 priorities

Sprint 1 is a foundation sprint, not a mandate to implement every future module. Prioritise only the foundations that reduce MVP launch risk.

### P0 — Must be designed and impact-assessed now

1. **Society tenant boundary:** establish the target multi-society model and identify the records that must be tenant-scoped.
2. **Guided setup domain:** define the minimum setup states, required versus optional fields, resumability and readiness checks.
3. **Party and asset identity:** connect Party Master and Flat Owner Master through a safe relationship model; support flats, shops and independent parking without requiring advanced multi-owner UI in the MVP.
4. **Financial continuity:** map how existing transactions, demands, allocations, accounts, categories, rules and reports remain valid during migration.
5. **Basic user access foundation:** design society membership and minimum roles for treasurer, secretary, chairman, committee, auditor and member. Actual authentication rollout must be staged and tested.
6. **Operational Rules Master:** define how approved rules drive monthly charge generation, import mapping and data-quality checks. Keep historical interpretation separate from current operational policy.
7. **Migration and RLS safety:** inventory dependencies, plan dry-run/backfill, and define cross-tenant isolation tests before enforcement.
8. **Volunteer language and workflow:** document the simple user tasks and the accounting operations performed behind the scenes.

### P1 — Build after P0 design is accepted

1. Guided onboarding wizard for small and medium societies.
2. Simple member / unit / parking import and review workflow.
3. Guided monthly maintenance setup and demand generation.
4. Simple receipt and expense entry.
5. Volunteer financial home dashboard and actionable exceptions.
6. Member statement and core monthly reports.
7. Read-only virtual accountant explanations.

### P2 — Defer until MVP is validated

- Advanced joint ownership shares and complex legal-interest tracking UI.
- Shared parking allocation exceptions and detailed parking entitlement workflows.
- Full AGM / SGM and governance automation.
- Comprehensive statutory compliance command centre.
- Procurement, vendor lifecycle and facility management.
- Autonomous AI posting or unattended financial actions.
- Deep multi-building operational workflows beyond the first customer need.

The database model should not block these future cases, but the MVP must not be delayed to build every edge-case screen.

## 8. Small and medium society configuration

Use one product with configurable complexity:

- Small society default: one treasurer/admin, simple member roles, minimal approval friction, guided defaults.
- Medium society default: multiple committee users, configurable approvals, separate read-only auditor access, more detailed reports and optional building grouping.
- Both sizes use the same underlying financial engine, source records and tenant model.
- Approval requirements should depend on action risk and society configuration, not merely the number of flats.

## 9. Definition of MVP success

A pilot society should be able to:

1. Complete guided setup without needing to understand accounting terminology.
2. Import or enter members, units and opening financial information with clear review steps.
3. Generate a monthly maintenance bill run using approved society settings.
4. Submit a maintenance payment, track verification and receive an official receipt after confirmation.\n5. Raise an expense request, receive a Treasurer decision, and track payment without creating an unapproved accounting entry.\n6. Record permitted direct receipts and expenses and understand the effect on balances.
5. Identify unpaid members and issue statements/reminders.
6. See bank/cash position, collections and expenses with clear explanations.
7. Produce the core reports required for committee review and auditor handover.
8. Correct a mistake through a controlled workflow without losing history.
9. Get useful answers from the virtual accountant, with traceable source figures.
10. Complete these tasks without exposing another society's data.

A pilot is not successful merely because screens exist or a demo dataset works. Validate with real volunteer users and real monthly workflows.

## 10. Explicit scope protection

- Preserve the existing Pearl Meadows FY 2018–19 financial data and working calculation/reporting logic.
- Use the historical dataset to regression-test the accounting engine, but do not make historical cleanup a prerequisite for launching a new society's clean guided setup.
- Do not introduce multi-owner complexity into the initial setup screens unless the society needs it; preserve the extensible relationship model underneath.
- Do not require source document inspection for ordinary onboarding or imports.
- Do not present the software as replacing a statutory auditor or legal advice.
- No production schema migration or financial data rewrite is authorised by this product-direction addendum.

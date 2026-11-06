# Financial Year Review, Closure and Audit Workflow

## Purpose

Provide one controlled annual workflow from monthly financial review through provisional close, internal audit, statutory auditor handover, external queries, approvals, AGM adoption and immutable year-end freeze.

This workflow is an evidence and control layer. It does not replace the society's accounting books, statutory auditor's professional judgement, prescribed Maharashtra co-operative audit forms, or formal committee / AGM resolutions.

## Operating principles

1. **Source records remain authoritative.** Posted transactions, demands, demand allocations and masters are read from existing accounting tables. The audit workflow does not rewrite those records.
2. **No silent correction.** Proposed adjustments are separate records. Only an independently approved journal / correction process may post to accounting books; the proposal must retain the posted journal reference.
3. **Cut-off is explicit.** FY reports use the selected FY period. Later receipts do not rewrite earlier FY closing reports. Subsequent receipts can be shown in a separate subsequent-events / current-position view.
4. **Unknown is not zero.** Missing or unverified opening balances and incomplete schedules remain visible as pending or disclosed exceptions.
5. **Sign-offs are separate.** Treasurer certification, Secretary certification, internal audit sign-off, statutory audit completion, committee approval, AGM adoption and system freeze are separate dated events.
6. **Exceptions are reported, not hidden.** Critical/high findings, unresolved queries, unposted adjustments and missing schedules travel with the handover package.
7. **Snapshots are versioned.** Frozen snapshots are immutable. Later corrections require a new restatement version with an approval reference.

## End-to-end lifecycle

### 1. During-year financial review

- Initialize the FY workspace once.
- Complete review checklist periodically (monthly / quarterly operating rhythm).
- Review receipts, payments, demands, member credits / dues, vendor balances, cash and bank, budget, approvals and statutory obligations.
- Raise a finding where the evidence, amount, classification or approval is not satisfactory.
- Record the owner, due date, response, corrective action and supporting evidence.
- Mark a checklist item Completed only when evidence supports it. Use Exception Disclosed where it cannot be completed.

### 2. Year-end account closure

- Confirm period cut-off and completeness of source transactions.
- Reconcile account-wise cash and bank, member control, vendor control and other balances.
- Review demand-to-receipt allocations, unallocated receipts, advances and outstanding dues.
- Prepare accrual, provision, depreciation, prepayment, reclassification and prior-period adjustment proposals.
- Prepare trial balance, receipts and payments, income and expenditure, balance sheet and supporting schedules using the accounting/reporting modules.
- Reconcile party-wise and account-wise closing figures to the next FY opening figures.
- Preserve provisional close as a version; do not freeze at audit handover.

### 3. Internal audit

- Internal auditor completes the internal audit checklist and records testing results.
- Findings are recorded with audit area, reference, condition, risk, recommendation, management response, corrective action and evidence.
- Internal auditor records review conclusion and verifies closure evidence.
- Sign-off requires every internal-audit checklist item to be Completed, Not Applicable or Exception Disclosed.
- Sign-off is an application attestation and audit trail. It is not represented as a legally qualified digital signature or a substitute for the signed internal audit report.
- Sign-off decision may be Approved or Approved with Exceptions; exceptions are included in the handover disclosure.

### 4. Statutory auditor handover

Each package is versioned and includes an index with eight sections:

1. Financial statements: trial balance, income & expenditure, receipts & payments, balance sheet and schedules.
2. Supporting schedules: debtors, creditors, fixed assets, depreciation, advances, deposits and provisions.
3. Accounting registers: cash book, bank book, receipts, payments, demand register, receipt allocations and journal register.
4. Internal audit: signed internal audit report, observations, management responses and rectification evidence.
5. Reconciliations: bank reconciliation, member / party balances, unmatched and unallocated transactions.
6. Governance: committee minutes, resolutions, budget approvals, AGM / SGM notices and minutes.
7. Supporting evidence: bank statements, bills, vouchers, receipts, contracts, insurance and statutory challans.
8. Auditor queries: statutory auditor query register and adjustment / posting register.

For each item, mark it Generated, Attached, Not Applicable or Exception Disclosed. Pending items block issue. Evidence files are uploaded to the private `audit-evidence` bucket and referenced by object path; external references may be recorded separately.

The exportable JSON index contains the package, selected-FY source transactions, demand register rows, account-month rows, observations, observation updates, auditor queries, adjustment proposals, approvals, control totals and exception disclosure. It is a data/index export, not a substitute for attaching the signed financial statements and supporting documents.

**Internal audit sign-off is a hard database gate:** a package cannot be released to the statutory auditor without the FY's internal-audit approval record. An issued package records recipient and issue time.

### 5. Statutory audit queries and adjustments

- Each query receives a unique FY reference, priority, area and record reference.
- Management response and evidence reference are recorded; auditor conclusion and final status remain separately traceable.
- Proposed adjustments record debit, credit, amount, narration, supporting reference, management decision and final posted journal reference.
- The proposal table does not post a journal or alter any transaction.
- Accepted proposals without a posted journal reference remain visible as unposted.

### 6. Final approval and freeze

The following are separate dated approvals:

1. Treasurer certification.
2. Secretary certification.
3. Internal audit sign-off.
4. Statutory audit completion.
5. Managing Committee approval.
6. AGM adoption.
7. System freeze authorization / snapshot.

The database prevents a Frozen snapshot unless internal audit sign-off, statutory audit completion, committee approval and AGM adoption are recorded. The snapshot stores the FY source rows and audit disclosures and is immutable. A restatement is a new version that references the superseded snapshot.

## Core workflow records

- `financial_year_reviews`: FY workspace, period and lifecycle status.
- `financial_year_checklist`: staged control checklist and evidence references.
- `audit_observations` / `audit_observation_updates`: findings, responses, actions and reviewer trail.
- `audit_queries`: external auditor query / response register.
- `audit_adjustment_proposals`: proposed adjustments and posting references.
- `audit_handover_packages` / `audit_handover_documents`: package versions, index and attachment status.
- `closure_approvals`: separate sign-offs and governance decisions.
- `financial_year_snapshots`: immutable provisional / reviewed / frozen / restated versions.
- `audit_workflow_activity`: append-only activity trail.
- Private Supabase Storage bucket `audit-evidence`: supporting evidence files.

## Role separation target

| Role | Expected permissions |
|---|---|
| Treasurer | Prepare review, closure schedules, responses and adjustment proposals; cannot sign as internal auditor |
| Secretary | Governance records, statutory compliance evidence and Secretary certification |
| Chairman / Managing Committee | Review exceptions and record committee decisions |
| Internal Auditor | Read accounting source data, create audit observations, verify responses and sign internal audit |
| Statutory Auditor | Read handover pack, raise queries, record auditor conclusions and statutory completion |
| Members | Only approved member-facing financial outputs; no access to audit working papers |
| System Administrator | Configure access and maintain system; cannot impersonate auditor approvals |

**Deployment dependency:** current migration policies grant authenticated users read and operational write access. They are not yet a complete role-specific permission model. Before production use, connect the society's actual user-role / membership authorization model and restrict each write action and evidence folder to the appropriate role. Do not treat the UI's role labels as authorization.

## Important current implementation boundaries

- Financial totals are control totals from source tables, not a certified trial balance.
- The handover index is generated; financial statements and schedules must be attached or explicitly disclosed. The workflow does not fabricate reports that are not available.
- Private evidence upload is implemented with a 25 MB file limit and short-lived signed access links.
- The migration is additive and must be applied to the intended Supabase project before the new workflow can persist data.
- The migration has not been run against the live database as part of this code change.
- Verify actual statutory forms, audit classification, auditor appointment requirements, submission dates and AGM rules with the applicable Maharashtra Co-operative Societies Act / Rules, Registrar directions and the society's registered bye-laws before operational adoption.

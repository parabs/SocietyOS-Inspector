# Phase A6 — Historical data import, provenance and exception handling

**Status:** Design contract only. No import, row update, financial recalculation or production schema change.

## 1. Import objectives
- Support guided imports for new societies and controlled historical migration for existing societies.
- Reuse existing master records wherever confidently matched.
- Preserve original source values, source row identity and batch provenance.
- Make imports repeatable without duplicate financial transactions.
- Keep unresolved records visible and recoverable; never fabricate relationships or financial meaning.
- Keep historical cleanup separate from new-society onboarding.

## 2. Import batch lifecycle
Created -> Source Attached -> Profiled -> Mapped -> Validated -> Dry Run -> Reviewed -> Approved -> Committed -> Reconciled -> Closed.

Validation errors return to correction. Rejected or abandoned batches remain auditable. A correction after commit is a new linked batch, never an overwrite.

No production write is allowed during profiling, mapping, validation, dry run or review. Commit is a separate explicitly authorized operation.

## 3. Required provenance
Batch level: batch ID, society ID, source filename and checksum, source period, uploaded-by and timestamp, source workbook/sheet, import template/parser/mapping/rule versions, dry-run summary, approval actor/time, commit actor/time, reconciliation status and exception counts.

Row level: source sheet and original row number or stable source key, original source ID and raw values, normalized candidate values, match outcome/confidence, selected master ID and confirmer, validation diagnostics, created target IDs, commit status and correction/reversal references.

Raw source values are immutable after upload. A corrected source file creates a new batch/version linked to the earlier batch.

## 4. Master-data matching
1. Exact stable ID supplied by an approved source mapping.
2. Exact validated unique business identifier within the same society and entity type.
3. Exact normalized name plus independent corroborating attributes, where safe.
4. Human-reviewed candidate selection.
5. Unidentified/unmatched exception.

Names alone are insufficient for high-impact party, bank account, asset or demand relationships. Fuzzy matching may suggest candidates but cannot silently commit a match.

Reuse current society masters when a verified match exists. Do not create year-specific duplicate categories or accounts merely because a source file is from a different financial year. Create a new master only when a genuinely distinct concept is confirmed and approved. Do not merge or rename existing masters as a side effect of import. Unknown categories, parties, accounts or rules remain explicitly unidentified/pending; do not map everything to “Other” unless the source meaning genuinely is Other.

## 5. Financial transaction and demand mapping
- Import source transaction facts without inventing demand links.
- Match party, account and category independently; one unresolved dimension does not justify guessing another.
- Create or match demands only from approved demand-generation rules and source evidence.
- Assign a transaction to a demand only when party, demand identity, period and amount logic are supported.
- Support one receipt allocated across multiple demands and partial demand settlement through explicit allocation records.
- Keep on-account/unallocated receipt portions visible.
- Never force allocation totals to make a report balance.
- Preserve original amount, transaction date, payment mode, description and reference.
- Distinguish source transaction date, bank value date, import timestamp and verification timestamp.
- Keep adjustments, reversals, opening balances and non-demand receipts separately identifiable.

For Pearl Meadows, existing demand_register, transactions and demand_payment_allocations / transaction-demand mapping are authoritative operational structures only after deployed schema and source workbook are reconciled. Do not replace them with a guessed mapping model.

## 6. Validation layers
| Layer | Examples | Result |
|---|---|---|
| File integrity | Checksum, supported format, readable workbook, sheet names | Block unreadable/tampered input |
| Structural | Required columns, duplicate headers, row count, date/number parsing | Row diagnostics |
| Master references | Party/account/category/rule/asset exists in same society | Resolve or exception |
| Financial | Amount sign/type, currency, zero/negative handling, totals, duplicate candidates | Block unsafe records; review anomalies |
| Temporal | FY, demand month, effective date, due date, cutoff | Review historical exceptions |
| Relationship | Demand-party, transaction-party, allocation-demand and tenant consistency | Block invalid/cross-tenant links |
| Reconciliation | Source vs staged vs committed totals; allocated + unallocated = receipt | Must pass or have audited waiver |

Severity: Blocker (cannot commit), Review (named reviewer decision/reason), Warning (acknowledgement), Informational (context). A warning is not a substitute for source evidence.

## 7. Dry-run and commit controls
Dry run reports source row counts, unique source keys, create/update/no-op counts, duplicate candidates, conflicting matches, unmatched masters, demand/allocation proposals, financial totals by type/account/category/period, balance reconciliation and row-level diagnostics.

Commit requirements:
- Dry-run output tied to exact source checksum and mapping/rule versions.
- Authorized reviewer approves the exact preview.
- Idempotency key prevents duplicate commit.
- Transactional writes where feasible; partial commit state explicit and recoverable where not.
- Any source/mapping change requires a new dry run and approval.
- Commit report records exact created IDs and reconciliation totals.
- No destructive overwrite or automatic deletion of existing records.

## 8. Correction and rollback
Do not edit original source files or import history. Correct erroneous imports using a new correction batch linked to affected records and original batch. Financial corrections use established reversal/adjustment workflow, not direct value overwrite. Technical rollback must distinguish schema, master-data, operational and financial changes; financial data is not blindly rolled back by deleting rows. Failed/partial batches remain visible with recovery instructions.

## 9. Pearl Meadows FY2018–19 regression controls
Before and after future migration/import/security work, compare:
- Source workbook row counts and transaction totals by month/type.
- Opening and closing balances by party and account.
- Demand totals by party, category/demand group and month.
- Receipt totals, allocated totals and unallocated totals.
- Payment/expense totals by account/category/month.
- Cash and bank closing balances.
- Member/party ledger balances, including known test cases such as Flat 604.
- Demand-to-transaction mapping coverage and unresolved exceptions.

Accepted source-workbook calculations and known reconciliation decisions must be captured as fixtures before implementation. Do not invent expected values from a partially corrected report.

## 10. Operational exception register
Each unresolved issue records exception ID, batch ID, source row, entity type, raw description, severity, reason code, suggested candidates, assigned reviewer, due date, resolution, resolver, timestamp, evidence and target record link.

Resolution options: confirmed match, new master approved, intentionally unidentified, source correction requested, excluded with reason. Unidentified is a valid controlled state; it remains filterable/reportable until resolved or formally accepted.

## 11. Acceptance tests
- Same source batch committed twice creates no duplicate transactions.
- Reordered rows do not change stable source-row identity where stable keys exist.
- Fuzzy party match never auto-commits.
- Existing categories are reused across years when meaning is identical.
- Unknown category/account/party remains unresolved rather than guessed.
- Multi-month descriptions are split only under an approved rule with traceable source-to-generated rows.
- Receipt amount equals allocated plus unallocated amount.
- Demand allocation never crosses society or party boundaries.
- Failed validation writes no operational financial records.
- Source checksum and import rule versions are retained.
- Corrections preserve original rows and linked financial history.
- FY2018–19 regression fixtures remain within approved tolerances.

## 12. Dependencies and boundary
Dependencies: canonical deployed schema and production migration SQL; approved source workbook and reconciliation fixtures; existing master/transaction ID conventions; central financial calculation and allocation behavior; tenant authorization; storage controls.

This contract does not authorize import execution, bulk master creation, demand generation, allocation, transaction edits, financial recalculation or production migrations. Those require an approved dry-run and explicit confirmation before commit.

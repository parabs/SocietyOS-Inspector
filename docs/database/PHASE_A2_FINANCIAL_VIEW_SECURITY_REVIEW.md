# Phase A2 — Financial view security and tenant-boundary review

**Inspection date:** 2026-11-07  
**Project:** `hklibokniuwurdxndxfd`  
**Source:** Read-only `pg_get_viewdef` inspection of all 11 public views, combined with the Phase A security advisor baseline.  
**Change class:** Review document only. No production or application changes.

## Decision

Do not expose any of these views to member-facing clients or treat the current view layer as tenant-safe. All 11 views are owned by `postgres`, have no `security_invoker=true` reloption, and the prior catalog inspection found broad grants to both `anon` and `authenticated`. Their SQL definitions contain no society predicate because the underlying production tables do not yet have a society key.

The views are financial calculation/reporting infrastructure. They must be preserved and secured without changing their financial semantics. In particular, do not mass-convert to invoker security, drop views, or replace calculations before regression tests against the FY 2018–19 baseline.

## View lineage inventory

| View | Direct source / dependency | Main data exposed | Security and migration treatment |
|---|---|---|---|
| `balance_register` | `v_member_financial_year_balance` | Member opening, demand, receipts, adjustments, balance | Compatibility alias. Secure only after its underlying member-balance view and consumer paths are resolved. |
| `v_account_financial_year_balance` | `account_master`, `v_transaction_financial_year_movement` | Account opening, receipts, payments, contra and closing balance by FY | Society-wide financial data. Requires society-scoped account and transaction lineage. |
| `v_account_monthly_movement` | `account_master`, `v_transaction_financial_year_movement` | Monthly account receipts, payments, contra and net movement | Same tenant boundary as account and transaction source rows. |
| `v_demand_transaction_reconciliation` | `demand_register`, `transactions`, `demand_payment_allocations`, `demand_adjustments`, `party_master`, `category_master` | Demand, linked receipts, bounce reversals, contra, payments and approved adjustments | Critical financial join. Every joined row must resolve to the same society; transaction-level direct demand links and allocation links both require tenant-safe validation. |
| `v_member_cumulative_outstanding` | `v_member_financial_year_balance` | Latest cumulative member balance and unallocated receipts | Derived member view. No member access until base and derived lineage is tenant-scoped. |
| `v_member_financial_year_balance` | `v_member_financial_year_balance_calculated`, `member_opening_balances` | Member opening, demand, receipts, adjustments, outstanding and verification | Critical member report. Preserve calculation and opening-balance evidence semantics. |
| `v_member_financial_year_balance_calculated` | `party_master`, `demand_register`, `member_opening_balances`, `v_demand_transaction_reconciliation`, `v_transaction_financial_year_movement`, `demand_adjustments` | Calculated member balances by FY | Highest-risk derived view: cross-joins members and FYs and aggregates multiple financial sources. Society scope must be applied consistently to every input before aggregation. |
| `v_opening_balance_register` | `v_member_financial_year_balance` | FY 2018–19 opening balance report projection | Historical compatibility view. Retain FY 2018–19 output regression as a mandatory check. |
| `v_party_financial_year_balance` | `party_master`, `demand_register`, `member_opening_balances`, `v_demand_transaction_reconciliation`, `v_transaction_financial_year_movement` | Member and non-member party balances, receipts, payments and adjustments | Society-wide party ledger. Must scope all inputs, not only the outer party list. |
| `v_transaction_cutoff_exceptions` | `transactions`, `party_master` | Transactions where transaction date FY differs from reporting-month FY | Exception view still exposes transaction and party details; apply the same society boundary as transactions. |
| `v_transaction_financial_year_movement` | `transactions`, `demand_payment_allocations` | Effective date/FY, linked and unallocated receipts, bounce reversals, signed payments | Foundational calculation view used by multiple downstream reports. Protect transaction and allocation joins from cross-society aggregation. |

## Dependency structure

```text
transactions ───────────────┐
demand_payment_allocations ─┴─> v_transaction_financial_year_movement
                                      ├─> v_account_monthly_movement
account_master ───────────────────────┤
                                      ├─> v_account_financial_year_balance
                                      ├─> v_member_financial_year_balance_calculated
                                      └─> v_party_financial_year_balance

demand_register ──────────────┐
transactions ─────────────────┤
demand_payment_allocations ───┤
demand_adjustments ────────────┤
party_master ──────────────────┤
category_master ───────────────┴─> v_demand_transaction_reconciliation
                                          ├─> v_member_financial_year_balance_calculated
                                          └─> v_party_financial_year_balance

member_opening_balances ────────────────> member / party balance views
v_member_financial_year_balance_calculated
        └─> v_member_financial_year_balance
                 ├─> balance_register
                 ├─> v_opening_balance_register
                 └─> v_member_cumulative_outstanding

transactions + party_master ────────────> v_transaction_cutoff_exceptions
```

## Remediation sequence

### A2.1 — establish actual exposure and consumers (read-only)

1. Inventory grants at view, schema, table, function and API-role level.
2. Identify every frontend, Edge Function, RPC, export and scheduled job that queries each view. The current repository code search did not return reliable consumer matches; absence of search results is not evidence that a view is unused.
3. Record which views are required by the existing Treasurer/admin application and which are historical/report-only.
4. Capture baseline row counts and financial totals by FY, party type and account, especially FY 2018–19.
5. Confirm whether PostgREST exposes each public view to anon/authenticated based on schema exposure and grants.

### A2.2 — least-privilege view access design

1. Remove `anon` access from financial views unless a specific, reviewed public use case exists. No such use case is currently established.
2. Remove unnecessary write-style grants (INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES) from views.
3. Do not grant blanket SELECT to all authenticated users as a substitute for society membership checks.
4. For the interim single-society admin application, define a narrow compatibility access path and test it with the real application role before altering grants.
5. For the multi-society model, choose and test either:
   - invoker-security views whose underlying tables enforce active-society membership RLS; or
   - narrowly scoped server-side RPCs that validate active membership and return only the caller's society data.
6. Any SECURITY DEFINER RPC must have a fixed safe search path, minimal owner privileges, explicit membership validation, and restricted EXECUTE grants. Do not put a generic tenant-check helper in exposed `public` without a specific threat review.

### A2.3 — preserve calculation correctness

1. Add society scope at the source/relationship level, not as a hard-coded society filter inside a generic view.
2. Validate that each join pair (transaction-demand, transaction-allocation, demand-party, demand-category, opening-balance-party, transaction-account) cannot combine rows from different societies.
3. Preserve current signed amount, allocation, bounce reversal, unallocated receipt, adjustment and financial-year semantics.
4. Compare old/new results before and after each view change. No unexplained variance is acceptable.
5. Test two synthetic societies with overlapping party/account/category identifiers where possible, and prove that cross-tenant reads and joins return no foreign rows.

### A2.4 — production gates

No production changes until:
- canonical production migration SQL/history is recovered and reconciled;
- local database validation is available;
- view consumers are mapped;
- role/grant and RLS tests pass for anon, authenticated admin, treasurer, auditor and member contexts;
- storage and Edge Function access are included in the same tenant threat model;
- FY 2018–19 report regression is clean; and
- a separate production change approval is obtained.

## Explicit non-actions

This review did not alter grants, view definitions, RLS, tables, functions, storage, Auth settings, financial records or migration history. It does not authorise a production migration. The A1 identity SQL remains a review draft, not an applied schema change.

## Outstanding external dependency

The canonical SQL files for the production migration ledger are still required. The live migration ledger provides version/name metadata, not the original SQL bodies. Do not reconstruct missing migrations from the current schema or create placeholder migrations to make local replay appear complete.

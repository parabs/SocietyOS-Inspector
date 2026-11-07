# Production financial-view lockdown — deployment and rollback runbook

**Prepared:** 2026-11-07  
**Project:** `hklibokniuwurdxndxfd`  
**Severity:** High — verified anonymous financial data exposure  
**Status:** Prepared only; no production changes applied.

## 1. Verified current behavior

The current application uses the Supabase public anon/publishable key and has no application-wide login gate. The 11 financial views are owned by `postgres`, use the default SECURITY DEFINER behavior, and have SELECT granted directly to `anon` and `authenticated`.

A read-only transaction explicitly switched to the `anon` database role and queried counts only. The views returned rows, while a direct query to `public.transactions` returned zero rows under the same role. This proves that the views bypass the underlying table RLS boundary.

The 11 views and observed anonymous row counts are documented in `PHASE_A_TENANT_ISOLATION_AND_DATABASE_SECURITY_FINDINGS.md`.

## 2. View dependency review

Direct base-table dependencies found during catalog inspection include:

- `v_account_financial_year_balance` → `account_master`
- `v_account_monthly_movement` → `account_master`
- `v_demand_transaction_reconciliation` → `category_master`, `demand_adjustments`, `demand_payment_allocations`, `demand_register`, `party_master`, `transactions`
- `v_member_financial_year_balance` → `member_opening_balances`
- `v_member_financial_year_balance_calculated` → `demand_adjustments`, `demand_register`, `member_opening_balances`, `party_master`
- `v_party_financial_year_balance` → `demand_register`, `member_opening_balances`, `party_master`
- `v_transaction_cutoff_exceptions` → `party_master`, `transactions`
- `v_transaction_financial_year_movement` → `demand_payment_allocations`, `transactions`

Some views depend on other views, so remediation must cover all 11 views, not only the eight with direct base-table dependencies listed above. Every nested view in the chain must execute as invoker.

## 3. Proposed database correction

Supabase's current guidance recommends `security_invoker=on` for views that must respect RLS. The production PostgreSQL version is 17.11, which supports this option.

The intended correction for each of the 11 financial views is:

1. Set the view option `security_invoker=true`.
2. Revoke SELECT from `anon`.
3. Preserve SELECT for `authenticated` and `service_role` where required by the application and trusted backend.
4. Confirm every underlying base relation has the expected grants and RLS policy. Current catalog inspection confirms SELECT is granted to both anon and authenticated on the base tables (except legacy `OPTIONS`); RLS, not the SQL grant, is the current row boundary.
5. Test nested view dependencies and every report consumer.

Illustrative SQL pattern only (not executed):

```sql
ALTER VIEW public.balance_register SET (security_invoker = true);
REVOKE SELECT ON public.balance_register FROM anon;
GRANT SELECT ON public.balance_register TO authenticated;
```

Repeat for the complete 11-view inventory. Do not use a blanket schema-wide revoke: that could unintentionally disable unrelated application features.

## 4. Why database and frontend changes must be coordinated

The current browser application does not establish a Supabase session before rendering. It also displays a hard-coded reviewer identity. Its financial components query the views using the public browser client.

If the database view permissions are corrected before the application has a working sign-in and authorized admin session, the current dashboard will stop loading for anonymous visitors. That is the intended security result, but the deployment must be coordinated so the legitimate society administrator is not locked out.

The existing FY2018 importer has a Google OAuth sign-in flow and the backend checks the `society_admin` app-metadata claim. This is evidence that a Google provider flow exists in application code; it does not prove that the correct administrator account has been provisioned with the required claim.

Before deployment, verify:
- Google provider works on the deployed Pages origin and redirect URL.
- The intended administrator can sign in.
- The signed-in user's server-issued `app_metadata` contains the expected `society_admin` role.
- A normal authenticated user without that role cannot read financial tables/views.
- A signed-out visitor receives no financial data from views, REST, or RPC.
- The frontend derives identity from the verified Supabase session and does not trust the static reviewer name/role.

Never allow users to grant themselves `society_admin` through editable `user_metadata` or client-side form state.

## 5. Deployment sequence

### Pre-deployment

- Record the current definitions, owners, reloptions, ACLs, dependencies and grants for all 11 views.
- Export a database backup and verify that it is restorable.
- Confirm the authorized administrator Google account and its server-managed role.
- Implement and test the frontend session gate on a non-production preview.
- Run the current FY2018-19 report regression checks with the authorized admin account.

### Production cutover

1. Deploy the tested frontend authentication gate and verify the authorized admin can sign in.
2. Apply the narrowly scoped view option and grant migration in one controlled database change.
3. Immediately test all 11 views as `anon` (expected: permission denied / no access), as an ordinary authenticated user (expected: no protected financial rows), and as the authorized society admin (expected: current report rows).
4. Test all dashboard, report, ledger, reconciliation, audit and import screens.
5. Re-run the FY2018-19 totals and compare to the previously accepted baseline.
6. Re-run the Supabase security advisor and verify the 11 security-definer-view findings are cleared.

### Post-deployment monitoring

- Watch API/Postgres errors and frontend reports for failed view queries.
- Verify no unauthenticated view endpoint returns financial records.
- Confirm the importer still works only for the authorized administrator.
- Preserve the exact migration and deployment commit IDs in the release log.

## 6. Rollback strategy

The preferred response to a failure is to roll back the frontend release while retaining the database protection, then correct the frontend or authorization issue. Do not automatically restore anonymous access simply to make the old public dashboard render again.

If the database change itself causes a verified service outage, any permission rollback must be an explicit incident decision. Regranting `anon` access to these views restores the known exposure and must not be treated as a normal rollback.

## 7. Approval gate

This runbook does not apply the changes. The next production action requires confirmation of the Google account that should retain society-admin access, followed by approval for the coordinated authentication and database lockdown deployment.

Until then:
- No production view, grant, RLS policy, function, storage or Auth setting has been changed.
- No financial data has been modified.
- No new Supabase project or paid branch has been created.
- The anonymous financial-view exposure remains open and should be treated as urgent.


## 8. Storage evidence preflight

A read-only production check found:

- `audit-evidence` bucket is private.
- Current object count in that bucket: **0**.
- `audit_handover_documents`: 0 rows and 0 populated `file_path` values.
- `financial_year_audit_documents`: 0 rows and 0 populated `file_path` values.
- `compliance_evidence`: 0 rows and 0 populated `storage_path` values.

This means there are currently no uploaded evidence objects or stored evidence paths to migrate. The safest approach is to adopt the society-first path convention (for example, `<society-id>/<financial-year>/...`) before the first evidence upload, and enforce the same prefix in Storage RLS policies. Do not loosen the existing private bucket setting.

The current frontend upload paths still need to be updated before enabling uploads under the new convention. Both upload and signed-URL download flows must use the same validated society prefix.

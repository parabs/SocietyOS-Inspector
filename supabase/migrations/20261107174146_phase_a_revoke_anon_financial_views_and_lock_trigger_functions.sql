-- Phase A: remove anonymous access to financial reporting views and
-- restrict trigger-only SECURITY DEFINER functions from direct API invocation.
-- Applied to the connected production project as migration
-- 20261107174146_phase_a_revoke_anon_financial_views_and_lock_trigger_functions.
-- This is a narrow compatibility-preserving containment change:
-- authenticated SELECT on the existing views remains available until tenant
-- membership/RLS and consumer migration are implemented and regression-tested.

begin;

revoke all privileges on table
  public.v_account_monthly_movement,
  public.v_opening_balance_register,
  public.v_member_financial_year_balance,
  public.balance_register,
  public.v_account_financial_year_balance,
  public.v_demand_transaction_reconciliation,
  public.v_member_financial_year_balance_calculated,
  public.v_transaction_cutoff_exceptions,
  public.v_party_financial_year_balance,
  public.v_transaction_financial_year_movement,
  public.v_member_cumulative_outstanding
from public, anon;

grant select on table
  public.v_account_monthly_movement,
  public.v_opening_balance_register,
  public.v_member_financial_year_balance,
  public.balance_register,
  public.v_account_financial_year_balance,
  public.v_demand_transaction_reconciliation,
  public.v_member_financial_year_balance_calculated,
  public.v_transaction_cutoff_exceptions,
  public.v_party_financial_year_balance,
  public.v_transaction_financial_year_movement,
  public.v_member_cumulative_outstanding
to authenticated;

revoke insert, update, delete, truncate, references, trigger on table
  public.v_account_monthly_movement,
  public.v_opening_balance_register,
  public.v_member_financial_year_balance,
  public.balance_register,
  public.v_account_financial_year_balance,
  public.v_demand_transaction_reconciliation,
  public.v_member_financial_year_balance_calculated,
  public.v_transaction_cutoff_exceptions,
  public.v_party_financial_year_balance,
  public.v_transaction_financial_year_movement,
  public.v_member_cumulative_outstanding
from authenticated;

-- These are trigger entry points, not client RPC APIs. Their table references
-- are schema-qualified, so an empty search_path is safe and prevents object
-- shadowing. Trigger execution itself is unaffected by revoking client EXECUTE.
alter function public.guard_audit_handover_release() set search_path = '';
alter function public.guard_financial_year_freeze() set search_path = '';
alter function public.guard_internal_audit_signoff() set search_path = '';
alter function public.log_data_management_change() set search_path = '';
alter function public.prevent_audit_record_mutation() set search_path = '';

revoke all on function public.guard_audit_handover_release() from public, anon, authenticated;
revoke all on function public.guard_financial_year_freeze() from public, anon, authenticated;
revoke all on function public.guard_internal_audit_signoff() from public, anon, authenticated;
revoke all on function public.log_data_management_change() from public, anon, authenticated;
revoke all on function public.prevent_audit_record_mutation() from public, anon, authenticated;

commit;

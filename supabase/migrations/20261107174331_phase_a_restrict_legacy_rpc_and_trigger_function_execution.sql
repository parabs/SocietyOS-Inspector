-- Restrict legacy correction RPC and trigger-only helper functions.
-- Applied to production as migration 20261107174331_phase_a_restrict_legacy_rpc_and_trigger_function_execution.

begin;

alter function public.log_governance_task_activity() set search_path = '';
revoke all on function public.log_governance_task_activity() from public, anon, authenticated;
revoke all on function public.log_transaction_inspection_change() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- The correction RPC remains authenticated-only pending replacement of its
-- legacy global Society Admin check with tenant-scoped permission checks.
revoke all on function public.add_missing_transaction(date,text,numeric,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.add_missing_transaction(date,text,numeric,text,text,text,text,text,text,text,text,text) to authenticated;

-- Existing authenticated RLS policies still call this legacy helper.
revoke all on function public.is_society_admin() from public, anon, authenticated;
grant execute on function public.is_society_admin() to authenticated;

commit;

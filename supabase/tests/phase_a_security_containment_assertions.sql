-- Phase A security containment assertions.
-- Run with a database owner after applying the corresponding migration.
-- This is an assertion-only script; it does not mutate application data.

do $$
declare
  v_name text;
  v_oid oid;
begin
  foreach v_name in array array[
    'v_account_monthly_movement',
    'v_opening_balance_register',
    'v_member_financial_year_balance',
    'balance_register',
    'v_account_financial_year_balance',
    'v_demand_transaction_reconciliation',
    'v_member_financial_year_balance_calculated',
    'v_transaction_cutoff_exceptions',
    'v_party_financial_year_balance',
    'v_transaction_financial_year_movement',
    'v_member_cumulative_outstanding'
  ] loop
    v_oid := to_regclass('public.' || v_name);
    if v_oid is null then
      raise exception 'Expected financial view public.% is missing', v_name;
    end if;
    if has_table_privilege('anon', v_oid, 'SELECT') then
      raise exception 'Anonymous SELECT remains on public.%', v_name;
    end if;
    if not has_table_privilege('authenticated', v_oid, 'SELECT') then
      raise exception 'Authenticated read compatibility was lost on public.%', v_name;
    end if;
    if has_table_privilege('authenticated', v_oid, 'INSERT')
       or has_table_privilege('authenticated', v_oid, 'UPDATE')
       or has_table_privilege('authenticated', v_oid, 'DELETE') then
      raise exception 'Authenticated write privilege remains on view public.%', v_name;
    end if;
  end loop;

  foreach v_name in array array[
    'guard_audit_handover_release',
    'guard_financial_year_freeze',
    'guard_internal_audit_signoff',
    'log_data_management_change',
    'prevent_audit_record_mutation',
    'log_governance_task_activity',
    'log_transaction_inspection_change',
    'set_updated_at'
  ] loop
    select p.oid into v_oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = v_name
    limit 1;
    if v_oid is null then
      raise exception 'Expected trigger function public.% is missing', v_name;
    end if;
    if has_function_privilege('anon', v_oid, 'EXECUTE')
       or has_function_privilege('authenticated', v_oid, 'EXECUTE') then
      raise exception 'Client EXECUTE privilege remains on trigger function public.%', v_name;
    end if;
    if not exists (
      select 1 from pg_proc p
      where p.oid = v_oid and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=""%'
    ) then
      raise exception 'Empty search_path is not configured on public.%', v_name;
    end if;
  end loop;

  v_oid := to_regprocedure('public.add_missing_transaction(date,text,numeric,text,text,text,text,text,text,text,text,text)');
  if v_oid is null or has_function_privilege('anon', v_oid, 'EXECUTE')
     or not has_function_privilege('authenticated', v_oid, 'EXECUTE') then
    raise exception 'Legacy correction RPC must be authenticated-only';
  end if;

  v_oid := to_regprocedure('public.is_society_admin()');
  if v_oid is null or has_function_privilege('anon', v_oid, 'EXECUTE')
     or not has_function_privilege('authenticated', v_oid, 'EXECUTE') then
    raise exception 'Legacy RLS helper must be authenticated-only';
  end if;
end $$;

-- All current public base tables must continue to have RLS enabled.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if v_count > 0 then
    raise exception '% public base tables have RLS disabled', v_count;
  end if;
end $$;

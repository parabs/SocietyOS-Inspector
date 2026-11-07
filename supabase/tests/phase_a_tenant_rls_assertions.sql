-- Phase A tenant RLS regression assertions. Run as postgres in a rollback-only session.
begin;
do $$
declare v_tenant_tables integer; v_not_null integer; v_fks integer; v_views integer;
begin
 select count(*) into v_tenant_tables from information_schema.columns where table_schema='public' and column_name='society_id' and table_name not in ('permission_catalog','OPTIONS','society_os_execution_test');
 select count(*) into v_not_null from information_schema.columns where table_schema='public' and column_name='society_id' and is_nullable='NO' and table_name not in ('permission_catalog','OPTIONS','society_os_execution_test');
 if v_tenant_tables<>52 or v_not_null<>52 then raise exception 'Tenant key coverage mismatch: tables %, not-null %',v_tenant_tables,v_not_null; end if;
 select count(*) into v_fks from pg_constraint where contype='f' and connamespace='public'::regnamespace and convalidated;
 if v_fks<37 or exists(select 1 from pg_constraint where contype='f' and connamespace='public'::regnamespace and not convalidated) then raise exception 'Foreign key validation incomplete'; end if;
 select count(*) into v_views from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='v' and c.relname=any(array['v_account_monthly_movement','v_opening_balance_register','v_member_financial_year_balance','balance_register','v_account_financial_year_balance','v_demand_transaction_reconciliation','v_member_financial_year_balance_calculated','v_transaction_cutoff_exceptions','v_party_financial_year_balance','v_transaction_financial_year_movement','v_member_cumulative_outstanding'])
 and coalesce(c.reloptions,'{}') @> array['security_invoker=true'];
 if v_views<>11 then raise exception 'Expected all 11 financial views to use security_invoker, found %',v_views; end if;
 if has_table_privilege('anon','public.transactions','SELECT') or has_table_privilege('anon','public.demand_register','SELECT') or has_table_privilege('anon','public.balance_register','SELECT') then raise exception 'Anonymous financial grants remain'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select user_id::text from public.society_memberships where status='active' limit 1),true);
select set_config('request.jwt.claims',(select jsonb_build_object('sub',user_id::text,'role','authenticated')::text from public.society_memberships where status='active' limit 1),true);
select set_config('request.headers',jsonb_build_object('x-society-id',(select society_id::text from public.societies where tenant_code='pearl-meadows-c-type-wing'))::text,true);
set local role authenticated;
do $$
begin
 if (select count(*) from public.transactions)<>731 or (select count(*) from public.demand_register)<>729
  or (select count(*) from public.party_master)<>58 or (select count(*) from public.category_master)<>47
  or (select count(*) from public.account_master)<>8 or (select count(*) from public.member_opening_balances)<>44
  or (select count(*) from public.v_member_financial_year_balance)<>88 then raise exception 'Admin financial row-count regression'; end if;
 if jsonb_array_length(public.get_my_society_access())<>1 then raise exception 'Admin access RPC failed'; end if;
end $$;
reset role;
select set_config('request.headers','{}',true);
set local role authenticated;
do $$ begin if (select count(*) from public.transactions)<>0 then raise exception 'Missing tenant header did not deny data'; end if; end $$;
reset role;
select set_config('request.headers','{"x-society-id":"11111111-1111-4111-8111-111111111111"}',true);
set local role authenticated;
do $$ begin if (select count(*) from public.transactions)<>0 then raise exception 'Cross-tenant header did not deny data'; end if; end $$;
reset role;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select set_config('request.headers',jsonb_build_object('x-society-id',(select society_id::text from public.societies where tenant_code='pearl-meadows-c-type-wing'))::text,true);
set local role authenticated;
do $$ begin if (select count(*) from public.transactions)<>0 or jsonb_array_length(public.get_my_society_access())<>0 then raise exception 'Unassigned user received access'; end if; end $$;
rollback;
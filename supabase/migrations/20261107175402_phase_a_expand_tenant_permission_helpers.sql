begin;
insert into public.society_role_permissions(role_id,society_id,permission_code)
select r.role_id,r.society_id,p.permission_code from public.society_roles r cross join public.permission_catalog p
where r.role_code='society_admin' and r.society_id=(select society_id from public.societies where tenant_code='pearl-meadows-c-type-wing')
and p.permission_code in ('finance.import.manage','finance.correct.request')
on conflict(role_id,permission_code) do nothing;
create or replace function private.has_any_society_permission(p_permission_code text)
returns boolean language sql stable security definer set search_path=''
as $function$
 select auth.uid() is not null and exists(select 1 from public.society_memberships m
 where m.user_id=auth.uid() and m.status='active' and m.valid_from<=current_date
 and (m.valid_until is null or m.valid_until>=current_date)
 and private.has_society_permission(m.society_id,p_permission_code));
$function$;
create or replace function private.can_read_demand(p_society_id uuid,p_demand_id text)
returns boolean language sql stable security definer set search_path=''
as $function$
 select exists(select 1 from public.demand_register d where d.society_id=p_society_id and d.demand_id=p_demand_id
 and private.can_read_financial_party(d.society_id,d.party_id));
$function$;
create or replace function private.can_read_transaction(p_society_id uuid,p_transaction_id text)
returns boolean language sql stable security definer set search_path=''
as $function$
 select exists(select 1 from public.transactions t where t.society_id=p_society_id and t.transaction_id=p_transaction_id
 and private.can_read_financial_party(t.society_id,t.party_id));
$function$;
create or replace function private.is_own_membership(p_membership_id uuid,p_society_id uuid)
returns boolean language sql stable security definer set search_path=''
as $function$
 select auth.uid() is not null and exists(select 1 from public.society_memberships m
 where m.membership_id=p_membership_id and m.society_id=p_society_id and m.user_id=auth.uid());
$function$;
revoke all on function private.has_any_society_permission(text) from public,anon;
revoke all on function private.can_read_demand(uuid,text) from public,anon;
revoke all on function private.can_read_transaction(uuid,text) from public,anon;
revoke all on function private.is_own_membership(uuid,uuid) from public,anon;
grant execute on function private.has_any_society_permission(text) to authenticated;
grant execute on function private.can_read_demand(uuid,text) to authenticated;
grant execute on function private.can_read_transaction(uuid,text) to authenticated;
grant execute on function private.is_own_membership(uuid,uuid) to authenticated;
commit;
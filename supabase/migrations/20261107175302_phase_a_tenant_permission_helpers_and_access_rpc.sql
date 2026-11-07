begin;
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
create or replace function private.has_society_permission(p_society_id uuid,p_permission_code text)
returns boolean language sql stable security definer set search_path=''
as $function$
 select auth.uid() is not null and exists(
  select 1 from public.society_memberships m
  join public.society_membership_roles mr on mr.membership_id=m.membership_id and mr.society_id=m.society_id
  join public.society_roles r on r.role_id=mr.role_id and r.society_id=mr.society_id
  join public.society_role_permissions rp on rp.role_id=r.role_id and rp.society_id=r.society_id
  join public.societies s on s.society_id=m.society_id
  where m.user_id=auth.uid() and m.society_id=p_society_id and m.status='active'
   and m.valid_from<=current_date and (m.valid_until is null or m.valid_until>=current_date)
   and mr.valid_from<=current_date and (mr.valid_until is null or mr.valid_until>=current_date)
   and s.status='active' and rp.permission_code=p_permission_code
 );
$function$;
create or replace function private.is_active_society_member(p_society_id uuid)
returns boolean language sql stable security definer set search_path=''
as $function$
 select auth.uid() is not null and exists(
  select 1 from public.society_memberships m join public.societies s on s.society_id=m.society_id
  where m.user_id=auth.uid() and m.society_id=p_society_id and m.status='active'
   and m.valid_from<=current_date and (m.valid_until is null or m.valid_until>=current_date) and s.status='active'
 );
$function$;
create or replace function private.has_linked_party(p_society_id uuid,p_party_id text)
returns boolean language sql stable security definer set search_path=''
as $function$
 select auth.uid() is not null and private.has_society_permission(p_society_id,'party.read.linked')
 and exists(select 1 from public.party_user_links l where l.society_id=p_society_id and l.party_id=p_party_id
  and l.user_id=auth.uid() and l.status='verified' and l.valid_from<=current_date
  and (l.valid_until is null or l.valid_until>=current_date));
$function$;
create or replace function private.can_read_financial_party(p_society_id uuid,p_party_id text)
returns boolean language sql stable security definer set search_path=''
as $function$
 select private.has_society_permission(p_society_id,'finance.read.society')
  or private.has_society_permission(p_society_id,'finance.read.audit')
  or (p_party_id is not null and private.has_society_permission(p_society_id,'finance.read.linked')
      and private.has_linked_party(p_society_id,p_party_id));
$function$;
create or replace function private.can_read_party_master(p_society_id uuid,p_party_id text)
returns boolean language sql stable security definer set search_path=''
as $function$
 select private.has_society_permission(p_society_id,'master.read.society')
  or (p_party_id is not null and private.has_linked_party(p_society_id,p_party_id));
$function$;
revoke all on function private.has_society_permission(uuid,text) from public,anon;
revoke all on function private.is_active_society_member(uuid) from public,anon;
revoke all on function private.has_linked_party(uuid,text) from public,anon;
revoke all on function private.can_read_financial_party(uuid,text) from public,anon;
revoke all on function private.can_read_party_master(uuid,text) from public,anon;
grant execute on function private.has_society_permission(uuid,text) to authenticated;
grant execute on function private.is_active_society_member(uuid) to authenticated;
grant execute on function private.has_linked_party(uuid,text) to authenticated;
grant execute on function private.can_read_financial_party(uuid,text) to authenticated;
grant execute on function private.can_read_party_master(uuid,text) to authenticated;
create or replace function public.get_my_society_access()
returns jsonb language sql stable security definer set search_path=''
as $function$
 select coalesce(jsonb_agg(jsonb_build_object(
  'society_id',s.society_id,'tenant_code',s.tenant_code,'legal_name',s.legal_name,'display_name',s.display_name,'timezone',s.timezone,
  'roles',coalesce((select jsonb_agg(distinct jsonb_build_object('role_code',r.role_code,'role_name',r.role_name))
   from public.society_membership_roles mr join public.society_roles r on r.role_id=mr.role_id and r.society_id=mr.society_id
   where mr.membership_id=m.membership_id and mr.society_id=m.society_id and mr.valid_from<=current_date and (mr.valid_until is null or mr.valid_until>=current_date)),'[]'::jsonb),
  'permissions',coalesce((select jsonb_agg(distinct rp.permission_code order by rp.permission_code)
   from public.society_membership_roles mr join public.society_role_permissions rp on rp.role_id=mr.role_id and rp.society_id=mr.society_id
   where mr.membership_id=m.membership_id and mr.society_id=m.society_id and mr.valid_from<=current_date and (mr.valid_until is null or mr.valid_until>=current_date)),'[]'::jsonb)
 ) order by s.display_name),'[]'::jsonb)
 from public.society_memberships m join public.societies s on s.society_id=m.society_id
 where m.user_id=auth.uid() and m.status='active' and m.valid_from<=current_date
  and (m.valid_until is null or m.valid_until>=current_date) and s.status='active';
$function$;
revoke all on function public.get_my_society_access() from public,anon;
grant execute on function public.get_my_society_access() to authenticated;
create or replace function public.is_society_admin()
returns boolean language sql stable set search_path=''
as $function$
 select auth.uid() is not null and exists(select 1 from public.society_memberships m where m.user_id=auth.uid()
  and m.status='active' and m.valid_from<=current_date and (m.valid_until is null or m.valid_until>=current_date)
  and private.has_society_permission(m.society_id,'society.roles.manage'));
$function$;
revoke all on function public.is_society_admin() from public,anon,authenticated;
grant execute on function public.is_society_admin() to authenticated;
commit;
begin;
create or replace function private.get_my_society_access() returns jsonb language sql stable security definer set search_path=''
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
revoke all on function private.get_my_society_access() from public,anon;
grant execute on function private.get_my_society_access() to authenticated;
create or replace function public.get_my_society_access() returns jsonb language sql stable set search_path=''
as $function$ select private.get_my_society_access(); $function$;
revoke all on function public.get_my_society_access() from public,anon,authenticated;
grant execute on function public.get_my_society_access() to authenticated;
drop policy if exists society_memberships_tenant_select on public.society_memberships;
create policy society_memberships_tenant_select on public.society_memberships for select to authenticated
using (user_id=(select auth.uid()) or private.has_society_permission(society_id,'society.members.manage'));
drop policy if exists party_user_links_tenant_select on public.party_user_links;
create policy party_user_links_tenant_select on public.party_user_links for select to authenticated
using (user_id=(select auth.uid()) or private.has_society_permission(society_id,'society.roles.manage'));
commit;
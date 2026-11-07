begin;
create or replace function private.current_society_id()
returns uuid language plpgsql stable security definer set search_path=''
as $function$
declare v_header text;
begin
 v_header:=nullif(current_setting('request.headers',true),'')::jsonb->>'x-society-id';
 if v_header is null then return null; end if;
 return v_header::uuid;
exception when others then return null;
end;
$function$;
create or replace function private.has_society_permission(p_society_id uuid,p_permission_code text)
returns boolean language sql stable security definer set search_path=''
as $function$
 select auth.uid() is not null and private.current_society_id()=p_society_id and exists(
  select 1 from public.society_memberships m
  join public.society_membership_roles mr on mr.membership_id=m.membership_id and mr.society_id=m.society_id
  join public.society_roles r on r.role_id=mr.role_id and r.society_id=mr.society_id
  join public.society_role_permissions rp on rp.role_id=r.role_id and rp.society_id=r.society_id
  join public.societies s on s.society_id=m.society_id
  where m.user_id=auth.uid() and m.society_id=p_society_id and m.status='active'
   and m.valid_from<=current_date and (m.valid_until is null or m.valid_until>=current_date)
   and mr.revoked_at is null and mr.valid_from<=current_date and (mr.valid_until is null or mr.valid_until>=current_date)
   and s.status='active' and rp.permission_code=p_permission_code);
$function$;
create or replace function private.is_active_society_member(p_society_id uuid)
returns boolean language sql stable security definer set search_path=''
as $function$
 select auth.uid() is not null and private.current_society_id()=p_society_id and exists(
  select 1 from public.society_memberships m join public.societies s on s.society_id=m.society_id
  where m.user_id=auth.uid() and m.society_id=p_society_id and m.status='active'
   and m.valid_from<=current_date and (m.valid_until is null or m.valid_until>=current_date) and s.status='active');
$function$;
create or replace function private.is_own_membership(p_membership_id uuid,p_society_id uuid)
returns boolean language sql stable security definer set search_path=''
as $function$
 select auth.uid() is not null and private.current_society_id()=p_society_id and exists(
  select 1 from public.society_memberships m where m.membership_id=p_membership_id and m.society_id=p_society_id and m.user_id=auth.uid());
$function$;
drop policy if exists society_memberships_tenant_select on public.society_memberships;
create policy society_memberships_tenant_select on public.society_memberships for select to authenticated
using (society_id=private.current_society_id() and (user_id=(select auth.uid()) or private.has_society_permission(society_id,'society.members.manage')));
drop policy if exists party_user_links_tenant_select on public.party_user_links;
create policy party_user_links_tenant_select on public.party_user_links for select to authenticated
using (society_id=private.current_society_id() and (user_id=(select auth.uid()) or private.has_society_permission(society_id,'society.roles.manage')));
revoke all on function private.current_society_id() from public,anon;
grant execute on function private.current_society_id() to authenticated;
commit;
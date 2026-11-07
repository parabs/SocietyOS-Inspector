begin;
create or replace function private.get_my_society_invitations()
returns jsonb language sql stable security definer set search_path=''
as $function$
 select coalesce(jsonb_agg(jsonb_build_object(
  'membership_id',m.membership_id,'society_id',s.society_id,'tenant_code',s.tenant_code,
  'display_name',s.display_name,'legal_name',s.legal_name,'valid_from',m.valid_from,'valid_until',m.valid_until,
  'roles',coalesce((select jsonb_agg(r.role_code order by r.role_code)
   from public.society_membership_roles mr join public.society_roles r on r.role_id=mr.role_id and r.society_id=mr.society_id
   where mr.membership_id=m.membership_id and mr.revoked_at is null and mr.valid_from<=current_date
    and (mr.valid_until is null or mr.valid_until>=current_date)),'[]'::jsonb)
 ) order by s.display_name),'[]'::jsonb)
 from public.society_memberships m join public.societies s on s.society_id=m.society_id
 where m.user_id=auth.uid() and m.status='invited' and m.valid_from<=current_date
 and (m.valid_until is null or m.valid_until>=current_date) and s.status='active';
$function$;
create or replace function public.get_my_society_invitations()
returns jsonb language sql stable set search_path=''
as $function$ select private.get_my_society_invitations(); $function$;
create or replace function public.get_society_members_directory(p_society_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $function$
declare v_result jsonb;
begin
 if not private.has_society_permission(p_society_id,'society.members.manage') then raise exception 'Not authorized to view society membership directory'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'membership_id',m.membership_id,'user_id',m.user_id,'email',u.email,
  'display_name',coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',u.email),
  'status',m.status,'valid_from',m.valid_from,'valid_until',m.valid_until,
  'roles',coalesce((select jsonb_agg(jsonb_build_object('role_code',r.role_code,'role_name',r.role_name,
    'valid_from',mr.valid_from,'valid_until',mr.valid_until,'revoked_at',mr.revoked_at) order by r.role_name)
   from public.society_membership_roles mr join public.society_roles r on r.role_id=mr.role_id and r.society_id=mr.society_id
   where mr.membership_id=m.membership_id and mr.society_id=m.society_id),'[]'::jsonb)
 ) order by m.created_at desc),'[]'::jsonb) into v_result
 from public.society_memberships m join auth.users u on u.id=m.user_id
 where m.society_id=p_society_id and m.status in ('invited','active','suspended');
 return v_result;
end;
$function$;
revoke all on function private.get_my_society_invitations() from public,anon;
grant execute on function private.get_my_society_invitations() to authenticated;
revoke all on function public.get_my_society_invitations() from public,anon,authenticated;
grant execute on function public.get_my_society_invitations() to authenticated;
revoke all on function public.get_society_members_directory(uuid) from public,anon,authenticated;
grant execute on function public.get_society_members_directory(uuid) to authenticated;
commit;
begin;
alter table public.society_membership_roles
 add column if not exists revoked_at timestamptz,
 add column if not exists revoked_by uuid references auth.users(id) on delete restrict,
 add column if not exists revocation_reason text;
alter table public.society_membership_roles add constraint society_membership_roles_revocation_consistency
 check ((revoked_at is null and revoked_by is null) or (revoked_at is not null and revoked_by is not null));
create index if not exists idx_society_membership_roles_current on public.society_membership_roles(society_id,membership_id,role_id) where revoked_at is null;
create unique index if not exists uq_party_user_links_society_party_user on public.party_user_links(society_id,party_id,user_id);
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
   and mr.revoked_at is null and mr.valid_from<=current_date and (mr.valid_until is null or mr.valid_until>=current_date)
   and s.status='active' and rp.permission_code=p_permission_code);
$function$;
create or replace function private.get_my_society_access()
returns jsonb language sql stable security definer set search_path=''
as $function$
 select coalesce(jsonb_agg(jsonb_build_object(
  'society_id',s.society_id,'tenant_code',s.tenant_code,'legal_name',s.legal_name,'display_name',s.display_name,'timezone',s.timezone,
  'roles',coalesce((select jsonb_agg(distinct jsonb_build_object('role_code',r.role_code,'role_name',r.role_name))
   from public.society_membership_roles mr join public.society_roles r on r.role_id=mr.role_id and r.society_id=mr.society_id
   where mr.membership_id=m.membership_id and mr.society_id=m.society_id and mr.revoked_at is null and mr.valid_from<=current_date
    and (mr.valid_until is null or mr.valid_until>=current_date)),'[]'::jsonb),
  'permissions',coalesce((select jsonb_agg(distinct rp.permission_code order by rp.permission_code)
   from public.society_membership_roles mr join public.society_role_permissions rp on rp.role_id=mr.role_id and rp.society_id=mr.society_id
   where mr.membership_id=m.membership_id and mr.society_id=m.society_id and mr.revoked_at is null and mr.valid_from<=current_date
    and (mr.valid_until is null or mr.valid_until>=current_date)),'[]'::jsonb)
 ) order by s.display_name),'[]'::jsonb)
 from public.society_memberships m join public.societies s on s.society_id=m.society_id
 where m.user_id=auth.uid() and m.status='active' and m.valid_from<=current_date
  and (m.valid_until is null or m.valid_until>=current_date) and s.status='active';
$function$;
create or replace function public.get_my_society_access() returns jsonb language sql stable set search_path=''
as $function$ select private.get_my_society_access(); $function$;
create or replace function public.accept_society_invitation(p_society_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare v_user uuid:=auth.uid(); v_membership uuid;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 update public.society_memberships set status='active',updated_at=now()
 where society_id=p_society_id and user_id=v_user and status='invited'
 and valid_from<=current_date and (valid_until is null or valid_until>=current_date)
 returning membership_id into v_membership;
 if v_membership is null then
  if exists(select 1 from public.society_memberships where society_id=p_society_id and user_id=v_user and status='active') then return true; end if;
  raise exception 'No valid invitation exists for this society';
 end if;
 insert into public.society_membership_audit(society_id,actor_user_id,action_code,target_type,target_id,reason,after_state)
 values(p_society_id,v_user,'membership_invitation_accepted','society_membership',v_membership::text,'User accepted their society invitation.',jsonb_build_object('status','active'));
 return true;
end;
$function$;
create or replace function public.grant_society_role(p_society_id uuid,p_user_id uuid,p_role_code text,p_valid_from date default current_date,p_valid_until date default null,p_reason text default null)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare v_actor uuid:=auth.uid(); v_membership uuid; v_role uuid; v_status text; v_member_until date; v_grant uuid;
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 if not private.has_society_permission(p_society_id,'society.roles.manage') then raise exception 'Not authorized to manage society roles'; end if;
 if p_user_id=v_actor then raise exception 'Self-assignment is not permitted; another Society Admin must grant the role'; end if;
 if p_valid_from is null or p_valid_from<current_date or (p_valid_until is not null and p_valid_until<p_valid_from) then raise exception 'Invalid role validity period'; end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'Target Auth user does not exist'; end if;
 select role_id into v_role from public.society_roles where society_id=p_society_id and role_code=p_role_code;
 if v_role is null then raise exception 'Role does not exist in this society'; end if;
 select membership_id,status,valid_until into v_membership,v_status,v_member_until
 from public.society_memberships where society_id=p_society_id and user_id=p_user_id and status in ('invited','active')
 order by created_at desc limit 1 for update;
 if v_membership is null then
  insert into public.society_memberships(society_id,user_id,status,valid_from,invited_by)
  select p_society_id,p_user_id,case when u.confirmed_at is not null then 'active' else 'invited' end,current_date,v_actor
  from auth.users u where u.id=p_user_id returning membership_id,status,valid_until into v_membership,v_status,v_member_until;
 end if;
 if v_status not in ('invited','active') then raise exception 'Target membership is not eligible for role assignment'; end if;
 if p_valid_until is not null and v_member_until is not null and p_valid_until>v_member_until then raise exception 'Role validity cannot exceed membership validity'; end if;
 if exists(select 1 from public.society_membership_roles where membership_id=v_membership and role_id=v_role and revoked_at is null and (valid_until is null or valid_until>=current_date)) then
  raise exception 'This role is already active for the target member';
 end if;
 insert into public.society_membership_roles(membership_id,society_id,role_id,granted_by,valid_from,valid_until)
 values(v_membership,p_society_id,v_role,v_actor,p_valid_from,p_valid_until) returning role_id into v_grant;
 insert into public.society_membership_audit(society_id,actor_user_id,action_code,target_type,target_id,reason,after_state)
 values(p_society_id,v_actor,'role_granted','society_membership_role',v_membership::text,p_reason,
 jsonb_build_object('user_id',p_user_id,'role_code',p_role_code,'valid_from',p_valid_from,'valid_until',p_valid_until,'membership_status',v_status));
 return v_grant;
end;
$function$;
create or replace function public.revoke_society_role(p_society_id uuid,p_user_id uuid,p_role_code text,p_reason text)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare v_actor uuid:=auth.uid(); v_membership uuid; v_role uuid; v_count integer;
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 if not private.has_society_permission(p_society_id,'society.roles.manage') then raise exception 'Not authorized to manage society roles'; end if;
 if coalesce(btrim(p_reason),'')='' then raise exception 'A reason is required to revoke a role'; end if;
 select membership_id into v_membership from public.society_memberships where society_id=p_society_id and user_id=p_user_id and status in ('invited','active') order by created_at desc limit 1;
 select role_id into v_role from public.society_roles where society_id=p_society_id and role_code=p_role_code;
 if v_membership is null or v_role is null then raise exception 'Membership or role not found'; end if;
 if p_role_code='society_admin' then
  select count(*) into v_count from public.society_memberships m
  join public.society_membership_roles mr on mr.membership_id=m.membership_id and mr.society_id=m.society_id
  join public.society_roles r on r.role_id=mr.role_id and r.society_id=mr.society_id
  where m.society_id=p_society_id and m.status='active' and r.role_code='society_admin'
   and mr.revoked_at is null and mr.valid_from<=current_date and (mr.valid_until is null or mr.valid_until>=current_date);
  if v_count<=1 then raise exception 'Cannot revoke the last active Society Admin'; end if;
 end if;
 update public.society_membership_roles set revoked_at=now(),revoked_by=v_actor,revocation_reason=p_reason
 where membership_id=v_membership and society_id=p_society_id and role_id=v_role and revoked_at is null;
 if not found then raise exception 'No active role grant exists'; end if;
 insert into public.society_membership_audit(society_id,actor_user_id,action_code,target_type,target_id,reason,before_state,after_state)
 values(p_society_id,v_actor,'role_revoked','society_membership_role',v_membership::text,p_reason,
 jsonb_build_object('user_id',p_user_id,'role_code',p_role_code),jsonb_build_object('revoked_at',now()));
 return true;
end;
$function$;
create or replace function public.set_society_membership_status(p_society_id uuid,p_user_id uuid,p_status text,p_reason text)
returns boolean language plpgsql security definer set search_path=''
as $function$
declare v_actor uuid:=auth.uid(); v_membership uuid; v_old text; v_count integer;
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 if not private.has_society_permission(p_society_id,'society.members.manage') then raise exception 'Not authorized to manage society memberships'; end if;
 if p_status not in ('active','suspended','ended') then raise exception 'Unsupported membership status'; end if;
 if coalesce(btrim(p_reason),'')='' then raise exception 'A reason is required to change membership status'; end if;
 select membership_id,status into v_membership,v_old from public.society_memberships
 where society_id=p_society_id and user_id=p_user_id and status in ('invited','active','suspended') order by created_at desc limit 1 for update;
 if v_membership is null then raise exception 'Membership not found'; end if;
 if v_old='active' and p_status<>'active' and exists(
  select 1 from public.society_membership_roles mr join public.society_roles r on r.role_id=mr.role_id and r.society_id=mr.society_id
  where mr.membership_id=v_membership and r.role_code='society_admin' and mr.revoked_at is null) then
  select count(*) into v_count from public.society_memberships m
  join public.society_membership_roles mr on mr.membership_id=m.membership_id and mr.society_id=m.society_id
  join public.society_roles r on r.role_id=mr.role_id and r.society_id=mr.society_id
  where m.society_id=p_society_id and m.status='active' and r.role_code='society_admin'
   and mr.revoked_at is null and mr.valid_from<=current_date and (mr.valid_until is null or mr.valid_until>=current_date);
  if v_count<=1 then raise exception 'Cannot suspend or end the last active Society Admin'; end if;
 end if;
 update public.society_memberships set status=p_status,updated_at=now() where membership_id=v_membership;
 insert into public.society_membership_audit(society_id,actor_user_id,action_code,target_type,target_id,reason,before_state,after_state)
 values(p_society_id,v_actor,'membership_status_changed','society_membership',v_membership::text,p_reason,
 jsonb_build_object('status',v_old),jsonb_build_object('status',p_status));
 return true;
end;
$function$;
create or replace function public.verify_party_user_link(p_society_id uuid,p_party_id text,p_user_id uuid,p_relationship_code text,p_valid_until date default null,p_reason text default null)
returns uuid language plpgsql security definer set search_path=''
as $function$
declare v_actor uuid:=auth.uid(); v_link uuid;
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 if not private.has_society_permission(p_society_id,'society.members.manage') then raise exception 'Not authorized to verify party-user links'; end if;
 if coalesce(btrim(p_relationship_code),'')='' then raise exception 'Relationship code is required'; end if;
 if p_valid_until is not null and p_valid_until<current_date then raise exception 'Link validity cannot end in the past'; end if;
 if not exists(select 1 from public.society_memberships where society_id=p_society_id and user_id=p_user_id and status='active') then raise exception 'Target user must have an active membership in this society'; end if;
 if not exists(select 1 from public.party_master where society_id=p_society_id and party_id=p_party_id) then raise exception 'Party does not belong to this society'; end if;
 insert into public.party_user_links(society_id,party_id,user_id,relationship_code,status,verified_by,verified_at,valid_from,valid_until)
 values(p_society_id,p_party_id,p_user_id,p_relationship_code,'verified',v_actor,now(),current_date,p_valid_until)
 on conflict(society_id,party_id,user_id) do update set relationship_code=excluded.relationship_code,status='verified',
 verified_by=v_actor,verified_at=now(),valid_from=current_date,valid_until=excluded.valid_until
 returning party_user_link_id into v_link;
 insert into public.society_membership_audit(society_id,actor_user_id,action_code,target_type,target_id,reason,after_state)
 values(p_society_id,v_actor,'party_user_link_verified','party_user_link',v_link::text,p_reason,
 jsonb_build_object('party_id',p_party_id,'user_id',p_user_id,'relationship_code',p_relationship_code,'valid_until',p_valid_until));
 return v_link;
end;
$function$;
revoke all on function public.accept_society_invitation(uuid) from public,anon;
revoke all on function public.grant_society_role(uuid,uuid,text,date,date,text) from public,anon;
revoke all on function public.revoke_society_role(uuid,uuid,text,text) from public,anon;
revoke all on function public.set_society_membership_status(uuid,uuid,text,text) from public,anon;
revoke all on function public.verify_party_user_link(uuid,text,uuid,text,date,text) from public,anon;
grant execute on function public.accept_society_invitation(uuid) to authenticated;
grant execute on function public.grant_society_role(uuid,uuid,text,date,date,text) to authenticated;
grant execute on function public.revoke_society_role(uuid,uuid,text,text) to authenticated;
grant execute on function public.set_society_membership_status(uuid,uuid,text,text) to authenticated;
grant execute on function public.verify_party_user_link(uuid,text,uuid,text,date,text) to authenticated;
commit;
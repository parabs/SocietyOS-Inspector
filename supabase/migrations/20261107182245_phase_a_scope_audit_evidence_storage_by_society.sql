begin;
create or replace function private.safe_uuid(p_value text)
returns uuid language plpgsql immutable security definer set search_path=''
as $function$
begin
 if p_value is null or p_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return null; end if;
 return p_value::uuid;
exception when others then return null;
end;
$function$;
create or replace function private.has_society_permission_for_storage(p_society_id uuid,p_permission_code text)
returns boolean language sql stable security definer set search_path=''
as $function$
 select auth.uid() is not null and p_society_id is not null and exists(
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
revoke all on function private.safe_uuid(text) from public,anon;
revoke all on function private.has_society_permission_for_storage(uuid,text) from public,anon;
grant execute on function private.safe_uuid(text) to authenticated;
grant execute on function private.has_society_permission_for_storage(uuid,text) to authenticated;
update storage.buckets set public=false where id='audit-evidence';
revoke all on table storage.objects from public,anon;
revoke update,delete on table storage.objects from authenticated;
grant select,insert on table storage.objects to authenticated;
drop policy if exists society_audit_evidence_read on storage.objects;
drop policy if exists society_audit_evidence_upload on storage.objects;
create policy society_audit_evidence_read on storage.objects for select to authenticated
using (
 (bucket_id='audit-evidence' and coalesce(array_length(storage.foldername(name),1),0)>=2
  and private.has_society_permission_for_storage(private.safe_uuid((storage.foldername(name))[1]),'audit.evidence.read'))
 or
 (bucket_id='audit-evidence' and coalesce(array_length(storage.foldername(name),1),0)>=2
  and (private.has_society_permission_for_storage(private.safe_uuid((storage.foldername(name))[1]),'finance.read.society')
   or private.has_society_permission_for_storage(private.safe_uuid((storage.foldername(name))[1]),'finance.read.audit')
   or private.has_society_permission_for_storage(private.safe_uuid((storage.foldername(name))[1]),'compliance.read')
   or private.has_society_permission_for_storage(private.safe_uuid((storage.foldername(name))[1]),'compliance.manage')))
);
create policy society_audit_evidence_upload on storage.objects for insert to authenticated
with check (
 bucket_id='audit-evidence' and coalesce(array_length(storage.foldername(name),1),0)>=2
 and (private.has_society_permission_for_storage(private.safe_uuid((storage.foldername(name))[1]),'compliance.manage')
  or private.has_society_permission_for_storage(private.safe_uuid((storage.foldername(name))[1]),'finance.reconciliation.manage')
  or private.has_society_permission_for_storage(private.safe_uuid((storage.foldername(name))[1]),'audit.observations.manage'))
);
commit;
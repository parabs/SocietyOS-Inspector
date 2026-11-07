-- Storage policy assertions. Supabase-managed table grants remain in place;
-- RLS policies are the authorization boundary for storage.objects.
begin;
do $$
declare v_society uuid; v_admin uuid;
begin
 if (select public from storage.buckets where id='audit-evidence') is distinct from false then raise exception 'Audit evidence bucket must be private'; end if;
 if not (select relrowsecurity from pg_class where oid='storage.objects'::regclass) then raise exception 'Storage objects RLS must remain enabled'; end if;
 if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and 'anon'=any(roles)) then raise exception 'Anonymous storage policy exists'; end if;
 if exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and cmd in ('UPDATE','DELETE')) then raise exception 'Storage object update/delete policy exists'; end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='society_audit_evidence_read' and cmd='SELECT' and 'authenticated'=any(roles)) then raise exception 'Evidence read policy missing'; end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='society_audit_evidence_upload' and cmd='INSERT' and 'authenticated'=any(roles)) then raise exception 'Evidence upload policy missing'; end if;
 select society_id into strict v_society from public.societies where tenant_code='pearl-meadows-c-type-wing';
 select user_id into strict v_admin from public.society_memberships where society_id=v_society and status='active' limit 1;
 perform set_config('request.jwt.claim.sub',v_admin::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_admin::text,'role','authenticated')::text,true);
 if not private.has_society_permission_for_storage(v_society,'compliance.manage') then raise exception 'Society Admin should be allowed to upload audit evidence'; end if;
 if private.safe_uuid('not-a-uuid') is not null then raise exception 'Invalid storage tenant path must fail closed'; end if;
 if private.safe_uuid(v_society::text) is distinct from v_society then raise exception 'Valid society path did not parse'; end if;
end $$;
rollback;
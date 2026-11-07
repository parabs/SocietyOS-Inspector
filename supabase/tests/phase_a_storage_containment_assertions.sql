-- Storage policy assertions. Run as postgres.
begin;
do $$
begin
 if (select public from storage.buckets where id='audit-evidence') is distinct from false then raise exception 'Audit evidence bucket must be private'; end if;
 if has_table_privilege('anon','storage.objects','SELECT') or has_table_privilege('anon','storage.objects','INSERT') then raise exception 'Anonymous storage access remains'; end if;
 if has_table_privilege('authenticated','storage.objects','UPDATE') or has_table_privilege('authenticated','storage.objects','DELETE') then raise exception 'Authenticated users must not mutate or delete evidence objects'; end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='society_audit_evidence_read' and cmd='SELECT') then raise exception 'Evidence read policy missing'; end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='society_audit_evidence_upload' and cmd='INSERT') then raise exception 'Evidence upload policy missing'; end if;
end $$;
rollback;
-- Assertion-only storage containment check.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from pg_policies
  where schemaname='storage' and tablename='objects'
    and (coalesce(qual,'') like '%audit-evidence%'
      or coalesce(with_check,'') like '%audit-evidence%');
  if v_count <> 0 then
    raise exception 'Unscoped audit-evidence storage policies remain: %', v_count;
  end if;

  if not exists (select 1 from storage.buckets where id='audit-evidence' and public=false) then
    raise exception 'audit-evidence bucket is missing or public';
  end if;

  if exists (select 1 from storage.objects where bucket_id='audit-evidence') then
    raise exception 'audit-evidence bucket contains objects; review before applying lockdown';
  end if;
end $$;

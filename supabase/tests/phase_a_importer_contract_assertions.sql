-- Importer tenant and concurrency contract assertions.
begin;
do $$
begin
 if not exists(select 1 from pg_indexes where schemaname='public' and tablename='society_import_batches'
  and indexname='society_import_batches_one_running_per_society_idx') then raise exception 'Per-society running import guard missing'; end if;
 if exists(select 1 from pg_indexes where schemaname='public' and tablename='society_import_batches'
  and indexname in ('society_import_batches_one_active_idx','society_import_batches_one_running_idx')) then raise exception 'Legacy global import guard remains'; end if;
 if has_table_privilege('authenticated','public.society_import_batches','INSERT')
  and exists(select 1 from pg_policies where schemaname='public' and tablename='society_import_batches' and cmd in ('INSERT','ALL') and 'authenticated'=any(roles)) then
  raise exception 'Direct client insert into import batches must remain unavailable; Edge Function is the controlled writer';
 end if;
end $$;
rollback;
begin;
drop index if exists public.society_import_batches_one_active_idx;
drop index if exists public.society_import_batches_one_running_idx;
create unique index society_import_batches_one_running_per_society_idx on public.society_import_batches(society_id) where status='Running';
commit;
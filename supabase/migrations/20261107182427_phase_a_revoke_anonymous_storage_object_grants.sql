begin;
-- Supabase-managed storage ACLs are owned by supabase_storage_admin. RLS policies
-- are the enforced boundary; retain the attempted explicit revocations as defense in depth.
revoke all privileges on table storage.objects from anon;
revoke all privileges on table storage.objects from public;
revoke update,delete on table storage.objects from authenticated;
grant select,insert on table storage.objects to authenticated;
commit;
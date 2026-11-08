-- Phase A read-only security preflight
-- Run with a read-only database role. This script contains SELECT statements only.
-- It does not alter schema, grants, policies, data, Auth settings or storage objects.

-- 1. Public base-table RLS coverage, FORCE RLS and tenant-key coverage.
with base_tables as (
  select c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
policy_counts as (
  select tablename, count(*) as policy_count
  from pg_policies
  where schemaname = 'public'
  group by tablename
),
tenant_columns as (
  select table_name
  from information_schema.columns
  where table_schema = 'public' and column_name = 'society_id'
)
select count(*) as public_base_tables,
       count(*) filter (where b.relrowsecurity) as rls_enabled,
       count(*) filter (where b.relforcerowsecurity) as force_rls,
       count(*) filter (where coalesce(p.policy_count, 0) > 0) as tables_with_policies,
       count(*) filter (where t.table_name is not null) as tables_with_society_id
from base_tables b
left join policy_counts p on p.tablename = b.relname
left join tenant_columns t on t.table_name = b.relname;

-- 2. Tables with RLS enabled but no policies (intentionally fail closed until classified).
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname
  )
order by c.relname;

-- 3. Public policies that are globally permissive or only test authentication.
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and (
    qual = 'true'
    or with_check = 'true'
    or coalesce(qual, '') ilike '%auth.uid()%is not null%'
    or coalesce(with_check, '') ilike '%auth.uid()%is not null%'
    or coalesce(qual, '') = 'is_society_admin()'
    or coalesce(with_check, '') = 'is_society_admin()'
  )
order by tablename, policyname;

-- 4. Owner-privileged views and grants to anon/authenticated.
select n.nspname as schema_name,
       c.relname as view_name,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_can_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_can_select,
       pg_get_viewdef(c.oid, true) as view_definition
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v'
order by c.relname;

-- 5. SECURITY DEFINER functions, exposed execute grants and pinned search_path.
select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       coalesce(p.proconfig::text, '') as function_config,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname;

-- 6. Storage buckets and object-policy inventory.
select id, name, public
from storage.buckets
order by name;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;

-- 7. Tables without an explicit society_id tenant key.
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not exists (
    select 1 from information_schema.columns i
    where i.table_schema = 'public'
      and i.table_name = c.relname
      and i.column_name = 'society_id'
  )
order by c.relname;

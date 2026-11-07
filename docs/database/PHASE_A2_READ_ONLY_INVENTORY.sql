-- Society OS A2 preflight — read-only schema/data inventory
-- Run in Supabase SQL editor after reviewing the target project.
-- This script does not write persistent data or schema objects.
-- It reports exact row counts for all public base tables and tenant-key coverage.
-- It does not infer that every public table should receive society_id.

create temporary table if not exists phase_a2_inventory (
  schema_name text not null,
  table_name text not null,
  row_count bigint not null,
  has_society_id boolean not null,
  rows_with_society_id bigint,
  rows_without_society_id bigint,
  primary key (schema_name, table_name)
) on commit drop;

truncate table phase_a2_inventory;

do $$
declare
  r record;
  n bigint;
  has_tenant boolean;
  with_tenant bigint;
  without_tenant bigint;
begin
  for r in
    select t.table_schema, t.table_name
    from information_schema.tables t
    where t.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
    order by t.table_name
  loop
    execute format('select count(*) from %I.%I', r.table_schema, r.table_name)
      into n;

    select exists (
      select 1
      from information_schema.columns c
      where c.table_schema = r.table_schema
        and c.table_name = r.table_name
        and c.column_name = 'society_id'
    ) into has_tenant;

    if has_tenant then
      execute format(
        'select count(*) filter (where society_id is not null), count(*) filter (where society_id is null) from %I.%I',
        r.table_schema, r.table_name
      ) into with_tenant, without_tenant;
    else
      with_tenant := null;
      without_tenant := null;
    end if;

    insert into phase_a2_inventory
      (schema_name, table_name, row_count, has_society_id, rows_with_society_id, rows_without_society_id)
    values
      (r.table_schema, r.table_name, n, has_tenant, with_tenant, without_tenant);
  end loop;
end $$;

select
  schema_name,
  table_name,
  row_count,
  has_society_id,
  rows_with_society_id,
  rows_without_society_id
from phase_a2_inventory
order by table_name;

-- Relationship inventory for explicit parent/child consistency review.
select
  tc.table_name as child_table,
  kcu.column_name as child_column,
  ccu.table_name as parent_table,
  ccu.column_name as parent_column,
  tc.constraint_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.constraint_schema = kcu.constraint_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.constraint_schema = tc.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
order by child_table, tc.constraint_name;

-- View inventory: views are not assigned tenant keys directly; their base tables
-- and security_invoker/security_barrier behavior must be reviewed individually.
select table_name, view_definition
from information_schema.views
where table_schema = 'public'
order by table_name;

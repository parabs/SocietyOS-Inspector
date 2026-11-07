do $$
declare fk record; v_covered boolean; v_cols text; v_index_name text;
begin
 for fk in
  select c.conrelid,c.conname,c.conkey,rel.relname as table_name,
   array_agg(att.attname order by key_col.ord) as column_names
  from pg_constraint c join pg_class rel on rel.oid=c.conrelid
  join pg_namespace ns on ns.oid=rel.relnamespace
  cross join lateral unnest(c.conkey) with ordinality as key_col(attnum,ord)
  join pg_attribute att on att.attrelid=c.conrelid and att.attnum=key_col.attnum
  where c.contype='f' and ns.nspname='public'
  group by c.conrelid,c.conname,c.conkey,rel.relname
 loop
  select exists(select 1 from pg_index i where i.indrelid=fk.conrelid and i.indisvalid and i.indisready
   and i.indnkeyatts>=cardinality(fk.conkey)
   and (select array_agg(i.indkey[pos.n-1]::smallint order by pos.n)
    from generate_series(1,cardinality(fk.conkey)) as pos(n))=fk.conkey) into v_covered;
  if not v_covered then
   select string_agg(format('%I',col),',') into v_cols from unnest(fk.column_names) as col;
   v_index_name:=left('idx_fk_'||fk.table_name||'_'||substr(md5(fk.conname),1,8),63);
   execute format('create index %I on public.%I (%s)',v_index_name,fk.table_name,v_cols);
  end if;
 end loop;
end $$;
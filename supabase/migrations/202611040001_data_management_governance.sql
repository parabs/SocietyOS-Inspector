-- Additive governance tables for Data Management. Historical accounting rows are not modified.
create table if not exists public.data_management_options (
  option_id uuid primary key default gen_random_uuid(),
  option_group text not null,
  option_value text not null,
  display_label text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(option_group, option_value)
);

create table if not exists public.data_quality_exceptions (
  exception_id uuid primary key default gen_random_uuid(),
  exception_key text not null unique,
  entity_name text not null,
  record_id text not null,
  rule_code text not null,
  severity text not null default 'Medium',
  finding text not null,
  suggested_action text,
  status text not null default 'Open',
  resolution_notes text,
  resolved_by text,
  resolved_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.data_management_change_log (
  change_id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  changed_by text,
  changed_at timestamptz not null default now()
);

create index if not exists idx_dm_options_group on public.data_management_options(option_group, is_active, sort_order);
create index if not exists idx_dm_exceptions_status on public.data_quality_exceptions(status, severity, entity_name);
create index if not exists idx_dm_exceptions_record on public.data_quality_exceptions(entity_name, record_id);
create index if not exists idx_dm_change_log_record on public.data_management_change_log(table_name, record_id, changed_at desc);

alter table public.data_management_options enable row level security;
alter table public.data_quality_exceptions enable row level security;
alter table public.data_management_change_log enable row level security;

drop policy if exists society_os_admin_all on public.data_management_options;
create policy society_os_admin_all on public.data_management_options for all to authenticated using (public.is_society_admin()) with check (public.is_society_admin());
drop policy if exists society_os_admin_all on public.data_quality_exceptions;
create policy society_os_admin_all on public.data_quality_exceptions for all to authenticated using (public.is_society_admin()) with check (public.is_society_admin());
drop policy if exists society_os_admin_all on public.data_management_change_log;
create policy society_os_admin_all on public.data_management_change_log for all to authenticated using (public.is_society_admin()) with check (public.is_society_admin());

create or replace function public.log_data_management_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_record_id text;
  v_before jsonb;
  v_after jsonb;
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_after := to_jsonb(new);
    v_record_id := coalesce(v_after->>'transaction_id', v_after->>'account_id', v_after->>'party_id', v_after->>'category_id', v_after->>'flat_owner_id', v_after->>'rule_id', 'unknown');
    v_action := 'INSERT';
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_record_id := coalesce(v_after->>'transaction_id', v_after->>'account_id', v_after->>'party_id', v_after->>'category_id', v_after->>'flat_owner_id', v_after->>'rule_id', 'unknown');
    v_action := 'UPDATE';
  else
    v_before := to_jsonb(old);
    v_record_id := coalesce(v_before->>'transaction_id', v_before->>'account_id', v_before->>'party_id', v_before->>'category_id', v_before->>'flat_owner_id', v_before->>'rule_id', 'unknown');
    v_action := 'DELETE';
  end if;
  insert into public.data_management_change_log(table_name, record_id, action, before_data, after_data, changed_by)
  values (tg_table_name, v_record_id, v_action, v_before, v_after, coalesce(auth.jwt()->>'email', auth.uid()::text));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;

drop trigger if exists trg_dm_log_transactions on public.transactions;
create trigger trg_dm_log_transactions after insert or update or delete on public.transactions for each row execute function public.log_data_management_change();
drop trigger if exists trg_dm_log_account_master on public.account_master;
create trigger trg_dm_log_account_master after insert or update or delete on public.account_master for each row execute function public.log_data_management_change();
drop trigger if exists trg_dm_log_party_master on public.party_master;
create trigger trg_dm_log_party_master after insert or update or delete on public.party_master for each row execute function public.log_data_management_change();
drop trigger if exists trg_dm_log_category_master on public.category_master;
create trigger trg_dm_log_category_master after insert or update or delete on public.category_master for each row execute function public.log_data_management_change();
drop trigger if exists trg_dm_log_flat_owner_master on public.flat_owner_master;
create trigger trg_dm_log_flat_owner_master after insert or update or delete on public.flat_owner_master for each row execute function public.log_data_management_change();
drop trigger if exists trg_dm_log_rules_master on public.rules_master;
create trigger trg_dm_log_rules_master after insert or update or delete on public.rules_master for each row execute function public.log_data_management_change();

insert into public.data_management_options(option_group, option_value, display_label, sort_order)
values
 ('transaction_type','Receipt','Receipt',1),('transaction_type','Payment','Payment',2),('transaction_type','Contra','Contra',3),
 ('payment_mode','Cash','Cash',1),('payment_mode','Cheque','Cheque',2),('payment_mode','NEFT','NEFT',3),('payment_mode','Bank Transfer','Bank Transfer',4),('payment_mode','Online','Online',5),
 ('verification_status','Pending','Pending',1),('verification_status','Verified','Verified',2),('verification_status','Rejected','Rejected',3),
 ('document_status','Pending','Pending',1),('document_status','Available','Available',2),('document_status','Missing','Missing',3),
 ('exception_status','Open','Open',1),('exception_status','Under Review','Under Review',2),('exception_status','Resolved','Resolved',3),('exception_status','Accepted Exception','Accepted Exception',4)
on conflict(option_group, option_value) do nothing;

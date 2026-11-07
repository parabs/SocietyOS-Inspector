begin;
alter table public.data_management_change_log add column if not exists society_id uuid;
update public.data_management_change_log set society_id=(select society_id from public.societies where tenant_code='pearl-meadows-c-type-wing') where society_id is null;
alter table public.data_management_change_log alter column society_id set not null;
alter table public.data_management_change_log add constraint data_management_change_log_society_id_fkey foreign key(society_id) references public.societies(society_id) on delete restrict;
create index if not exists idx_data_management_change_log_society_id on public.data_management_change_log(society_id);
alter table public.governance_task_activity add column if not exists society_id uuid;
update public.governance_task_activity set society_id=(select society_id from public.societies where tenant_code='pearl-meadows-c-type-wing') where society_id is null;
alter table public.governance_task_activity alter column society_id set not null;
alter table public.governance_task_activity add constraint governance_task_activity_society_id_fkey foreign key(society_id) references public.societies(society_id) on delete restrict;
create index if not exists idx_governance_task_activity_society_id on public.governance_task_activity(society_id);
create or replace function public.log_data_management_change() returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_id text; v_before jsonb; v_after jsonb; v_action text; v_society_id uuid;
begin
 if tg_op='INSERT' then
  v_after:=to_jsonb(new); v_society_id:=nullif(v_after->>'society_id','')::uuid;
  v_id:=coalesce(v_after->>'transaction_id',v_after->>'account_id',v_after->>'party_id',v_after->>'category_id',v_after->>'flat_owner_id',v_after->>'rule_id',v_after->>'exception_id',v_after->>'option_id','unknown'); v_action:='INSERT';
 elsif tg_op='UPDATE' then
  v_before:=to_jsonb(old); v_after:=to_jsonb(new);
  if (v_after-'society_id')=(v_before-'society_id') then return new; end if;
  v_society_id:=nullif(v_after->>'society_id','')::uuid;
  v_id:=coalesce(v_after->>'transaction_id',v_after->>'account_id',v_after->>'party_id',v_after->>'category_id',v_after->>'flat_owner_id',v_after->>'rule_id',v_after->>'exception_id',v_after->>'option_id','unknown'); v_action:='UPDATE';
 else
  v_before:=to_jsonb(old); v_society_id:=nullif(v_before->>'society_id','')::uuid;
  v_id:=coalesce(v_before->>'transaction_id',v_before->>'account_id',v_before->>'party_id',v_before->>'category_id',v_before->>'flat_owner_id',v_before->>'rule_id',v_before->>'exception_id',v_before->>'option_id','unknown'); v_action:='DELETE';
 end if;
 insert into public.data_management_change_log(society_id,table_name,record_id,action,before_data,after_data,changed_by)
 values(v_society_id,tg_table_name,v_id,v_action,v_before,v_after,coalesce(auth.jwt()->>'email',auth.uid()::text));
 if tg_op='DELETE' then return old; end if; return new;
end;
$function$;
create or replace function public.log_governance_task_activity() returns trigger language plpgsql set search_path=''
as $function$
declare v_field text; v_old jsonb; v_new jsonb;
begin
 if tg_op='INSERT' then
  insert into public.governance_task_activity(society_id,checklist_id,financial_year,action,field_name,new_value,actor_user_id)
  values(new.society_id,new.checklist_id,new.financial_year,'Task created','task',new.task,auth.uid()); return new;
 end if;
 v_old:=to_jsonb(old); v_new:=to_jsonb(new);
 foreach v_field in array array['status','owner_name','owner_role','due_date','evidence_reference','remarks','approval_status','approval_notes'] loop
  if coalesce(v_old->>v_field,'') is distinct from coalesce(v_new->>v_field,'') then
   insert into public.governance_task_activity(society_id,checklist_id,financial_year,action,field_name,old_value,new_value,actor_user_id)
   values(new.society_id,new.checklist_id,new.financial_year,
    case when v_field='status' then 'Status changed' when v_field='approval_status' then 'Review decision updated' else 'Task details updated' end,
    v_field,v_old->>v_field,v_new->>v_field,auth.uid());
  end if;
 end loop; return new;
end;
$function$;
do $$
declare v_society uuid; v_table text;
begin
 select society_id into strict v_society from public.societies where tenant_code='pearl-meadows-c-type-wing';
 foreach v_table in array array[
 'account_master','account_monthly_balance','account_opening_verification','audit_adjustment_proposals','audit_handover_documents','audit_handover_packages','audit_observation_updates','audit_observations','audit_queries','audit_workflow_activity','category_master','closure_approvals','compliance_activity','compliance_evidence','compliance_obligation_instances','compliance_obligations','data_management_options','data_quality_exceptions','demand_adjustments','demand_payment_allocations','demand_register','demand_register_backup_20261030','financial_year_audit_closures','financial_year_audit_documents','financial_year_audit_reconciliations','financial_year_checklist','financial_year_reviews','financial_year_snapshots','flat_owner_master','member_opening_balances','governance_task_approvals','party_category_rules','party_master','rules_master','society_correction_log','society_dropdown_options','society_import_batches','source_register','transaction_correction_register','transaction_demand_mapping_backup_20261030','transaction_verification_records','transactions'
 ] loop
  execute format('alter table public.%I add column if not exists society_id uuid',v_table);
  execute format('update public.%I set society_id=$1 where society_id is null',v_table) using v_society;
  execute format('alter table public.%I alter column society_id set not null',v_table);
  execute format('alter table public.%I add constraint %I foreign key(society_id) references public.societies(society_id) on delete restrict',v_table,v_table||'_society_id_fkey');
  execute format('create index if not exists %I on public.%I(society_id)','idx_'||v_table||'_society_id',v_table);
 end loop;
end $$;
alter table public.society_role_permissions add column if not exists society_id uuid;
update public.society_role_permissions rp set society_id=r.society_id from public.society_roles r where r.role_id=rp.role_id and rp.society_id is null;
alter table public.society_role_permissions alter column society_id set not null;
alter table public.society_role_permissions add constraint society_role_permissions_role_society_fkey foreign key(role_id,society_id) references public.society_roles(role_id,society_id) on delete restrict;
alter table public.society_role_permissions add constraint society_role_permissions_society_fkey foreign key(society_id) references public.societies(society_id) on delete restrict;
create index if not exists idx_society_role_permissions_society on public.society_role_permissions(society_id,role_id);
commit;
begin;
drop policy if exists account_master_tenant_insert on public.account_master;
drop policy if exists account_master_tenant_update on public.account_master;
create policy account_master_tenant_insert on public.account_master for insert to authenticated
with check (private.has_society_permission(society_id,'finance.reconciliation.manage'));
create policy account_master_tenant_update on public.account_master for update to authenticated
using (private.has_society_permission(society_id,'finance.reconciliation.manage'))
with check (private.has_society_permission(society_id,'finance.reconciliation.manage'));
drop policy if exists category_master_tenant_insert on public.category_master;
drop policy if exists category_master_tenant_update on public.category_master;
create policy category_master_tenant_insert on public.category_master for insert to authenticated
with check (private.has_society_permission(society_id,'master.draft.manage') or private.has_society_permission(society_id,'finance.demand.manage'));
create policy category_master_tenant_update on public.category_master for update to authenticated
using (private.has_society_permission(society_id,'master.draft.manage') or private.has_society_permission(society_id,'finance.demand.manage'))
with check (private.has_society_permission(society_id,'master.draft.manage') or private.has_society_permission(society_id,'finance.demand.manage'));
drop policy if exists data_quality_exceptions_tenant_insert on public.data_quality_exceptions;
drop policy if exists society_correction_log_tenant_insert on public.society_correction_log;
drop policy if exists society_import_batches_tenant_insert on public.society_import_batches;
drop policy if exists society_import_batches_tenant_update on public.society_import_batches;
drop policy if exists source_register_tenant_insert on public.source_register;
drop policy if exists source_register_tenant_update on public.source_register;
drop policy if exists transactions_tenant_insert on public.transactions;
drop policy if exists transactions_tenant_update on public.transactions;
create policy transactions_tenant_insert on public.transactions for insert to authenticated
with check (private.has_society_permission(society_id,'finance.transaction.create_draft'));
create policy transactions_tenant_update on public.transactions for update to authenticated
using (private.has_society_permission(society_id,'finance.transaction.edit_draft'))
with check (private.has_society_permission(society_id,'finance.transaction.edit_draft'));
commit;
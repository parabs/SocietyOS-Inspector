-- Remove overlapping permissive policies. Authentication remains the current access boundary
-- until the trusted Society OS role/committee mapping is connected.
drop policy if exists compliance_obligations_write on public.compliance_obligations;
create policy compliance_obligations_insert on public.compliance_obligations for insert to authenticated with check ((select auth.uid()) is not null);
create policy compliance_obligations_update on public.compliance_obligations for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy compliance_obligations_delete on public.compliance_obligations for delete to authenticated using ((select auth.uid()) is not null);

drop policy if exists compliance_instances_write on public.compliance_obligation_instances;
create policy compliance_instances_insert on public.compliance_obligation_instances for insert to authenticated with check ((select auth.uid()) is not null);
create policy compliance_instances_update on public.compliance_obligation_instances for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy compliance_instances_delete on public.compliance_obligation_instances for delete to authenticated using ((select auth.uid()) is not null);

drop policy if exists compliance_evidence_write on public.compliance_evidence;
create policy compliance_evidence_insert on public.compliance_evidence for insert to authenticated with check ((select auth.uid()) is not null);
create policy compliance_evidence_update on public.compliance_evidence for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy compliance_evidence_delete on public.compliance_evidence for delete to authenticated using ((select auth.uid()) is not null);

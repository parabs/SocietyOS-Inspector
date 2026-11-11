-- Phase 4: secure governance task approvals.
-- Approvals can only be created by the signed-in user holding the actual
-- society role assigned to the task (or Chairman for Managing Committee review).
-- The approver name is pinned to the authenticated JWT email and the user id
-- is supplied by the column default auth.uid().

drop policy if exists governance_task_approvals_tenant_insert on public.governance_task_approvals;

create policy governance_task_approvals_tenant_insert
on public.governance_task_approvals
for insert
to authenticated
with check (
  society_id = private.current_society_id()
  and approver_user_id = (select auth.uid())
  and approver_name = (select coalesce(auth.jwt() ->> 'email', ''))
  and (
    private.has_society_permission(society_id, 'governance.approve.delegated')
    or private.has_society_permission(society_id, 'governance.manage')
  )
  and exists (
    select 1
    from public.society_memberships sm
    join public.society_membership_roles smr
      on smr.membership_id = sm.membership_id
     and smr.society_id = sm.society_id
    join public.society_roles sr
      on sr.role_id = smr.role_id
     and sr.society_id = smr.society_id
    join public.financial_year_checklist fc
      on fc.checklist_id = governance_task_approvals.checklist_id
     and fc.society_id = governance_task_approvals.society_id
     and fc.financial_year = governance_task_approvals.financial_year
    where sm.user_id = (select auth.uid())
      and sm.society_id = governance_task_approvals.society_id
      and sm.status = 'active'
      and sm.valid_from <= current_date
      and (sm.valid_until is null or sm.valid_until >= current_date)
      and smr.revoked_at is null
      and smr.valid_from <= current_date
      and (smr.valid_until is null or smr.valid_until >= current_date)
      and sr.role_name = governance_task_approvals.approver_role
      and (
        fc.approver_role = governance_task_approvals.approver_role
        or (
          fc.approver_role = 'Managing Committee'
          and sr.role_code = 'chairman'
        )
      )
  )
);

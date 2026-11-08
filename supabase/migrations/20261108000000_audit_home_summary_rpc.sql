-- Keep the tenant permission check independent of a client-supplied x-society-id header.
create or replace function private.has_society_permission(p_society_id uuid, p_permission_code text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select auth.uid() is not null
    and p_society_id is not null
    and exists (
      select 1
      from public.society_memberships m
      join public.society_membership_roles mr
        on mr.membership_id = m.membership_id and mr.society_id = m.society_id
      join public.society_roles r
        on r.role_id = mr.role_id and r.society_id = mr.society_id
      join public.society_role_permissions rp
        on rp.role_id = r.role_id and rp.society_id = r.society_id
      join public.societies s on s.society_id = m.society_id
      where m.user_id = auth.uid()
        and m.society_id = p_society_id
        and m.status = 'active'
        and m.valid_from <= current_date
        and (m.valid_until is null or m.valid_until >= current_date)
        and mr.revoked_at is null
        and mr.valid_from <= current_date
        and (mr.valid_until is null or mr.valid_until >= current_date)
        and s.status = 'active'
        and rp.permission_code = p_permission_code
    );
$function$;

-- Aggregate-only endpoint: no transaction/member rows are returned to the browser.
create or replace function public.get_audit_home_summary(p_society_id uuid, p_financial_year text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_start_year integer;
  v_months text[];
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not (
    private.has_society_permission(p_society_id, 'finance.read.society')
    or private.has_society_permission(p_society_id, 'finance.read.audit')
  ) then
    raise exception 'You do not have permission to view this society financial summary' using errcode = '42501';
  end if;

  v_start_year := substring(p_financial_year from '([0-9]{4})')::integer;
  if v_start_year is null then
    raise exception 'Invalid financial year' using errcode = '22023';
  end if;

  v_months := array[
    'Apr-' || v_start_year, 'May-' || v_start_year, 'Jun-' || v_start_year,
    'Jul-' || v_start_year, 'Aug-' || v_start_year, 'Sep-' || v_start_year,
    'Oct-' || v_start_year, 'Nov-' || v_start_year, 'Dec-' || v_start_year,
    'Jan-' || (v_start_year + 1), 'Feb-' || (v_start_year + 1), 'Mar-' || (v_start_year + 1)
  ];

  select jsonb_build_object(
    'financial_year', p_financial_year,
    'source_records', (select count(*) from public.source_register s where s.society_id = p_society_id and s.financial_year = p_financial_year),
    'transactions', (select count(*) from public.transactions t where t.society_id = p_society_id and t.reporting_month = any(v_months)),
    'evidence_complete', (select count(*) from public.transactions t where t.society_id = p_society_id and t.reporting_month = any(v_months) and lower(coalesce(t.evidence_status,'')) = 'complete'),
    'transactions_unmapped', (select count(*) from public.transactions t where t.society_id = p_society_id and t.reporting_month = any(v_months) and nullif(btrim(t.demand_id),'') is null),
    'opening_balance_records', (select count(*) from public.member_opening_balances b where b.society_id = p_society_id and b.financial_year = p_financial_year),
    'opening_balances_verified', (select count(*) from public.member_opening_balances b where b.society_id = p_society_id and b.financial_year = p_financial_year and lower(coalesce(b.verification_status,'')) = 'verified'),
    'checklist_total', (select count(*) from public.financial_year_checklist c where c.society_id = p_society_id and c.financial_year = p_financial_year),
    'checklist_done', (select count(*) from public.financial_year_checklist c where c.society_id = p_society_id and c.financial_year = p_financial_year and lower(coalesce(c.status,'')) in ('completed','complete','done')),
    'checklist_in_progress', (select count(*) from public.financial_year_checklist c where c.society_id = p_society_id and c.financial_year = p_financial_year and lower(coalesce(c.status,'')) = 'in progress'),
    'checklist_pending', (select count(*) from public.financial_year_checklist c where c.society_id = p_society_id and c.financial_year = p_financial_year and lower(coalesce(c.status,'')) = 'pending'),
    'audit_documents', (select count(*) from public.financial_year_audit_documents d where d.society_id = p_society_id and d.financial_year = p_financial_year),
    'compliance_to_verify', (select count(*) from public.compliance_obligations o where o.society_id = p_society_id and o.active = true and (lower(coalesce(o.legal_status,'')) like '%draft%' or lower(coalesce(o.legal_status,'')) like '%verify%' or lower(coalesce(o.applicability,'')) like '%verify%')),
    'available_financial_years', (
      select coalesce(jsonb_agg(year_value order by year_value desc), '[]'::jsonb)
      from (
        select distinct financial_year as year_value from public.source_register where society_id = p_society_id and financial_year is not null
        union
        select distinct financial_year from public.financial_year_checklist where society_id = p_society_id and financial_year is not null
        union
        select distinct financial_year from public.member_opening_balances where society_id = p_society_id and financial_year is not null
        union
        select distinct financial_year from public.demand_register where society_id = p_society_id and financial_year is not null
      ) years
    )
  ) into v_result;

  return v_result;
end;
$function$;

revoke all on function public.get_audit_home_summary(uuid,text) from public, anon;
grant execute on function public.get_audit_home_summary(uuid,text) to authenticated;
comment on function public.get_audit_home_summary(uuid,text) is 'Returns aggregate-only audit home metrics after checking authenticated society financial-read permission. No transaction or member detail is returned.';

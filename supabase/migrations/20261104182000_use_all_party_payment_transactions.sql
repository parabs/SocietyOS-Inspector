-- Use all party-matched Payment transactions for party-level payables,
-- including payments that have no Demand ID. Member-tagged bank charges remain excluded
-- from member receivables because they are Society expenses, not member payments.
create or replace view public.v_party_financial_year_balance as
with financial_years as (
  select financial_year from public.demand_register where financial_year is not null
  union
  select financial_year from public.member_opening_balances where financial_year is not null
),
parties as (
  select party_id,party_name,party_type
  from public.party_master
  where coalesce(party_type,'')<>'Bank Account'
),
party_years as (
  select p.party_id,p.party_name,p.party_type,y.financial_year
  from parties p cross join financial_years y
),
opening_totals as (
  select party_id,financial_year,sum(opening_balance) opening_balance,
         max(verification_status) opening_balance_verification_status,
         string_agg(notes,'; ' order by notes) filter(where notes is not null and notes<>'') opening_balance_notes
  from public.member_opening_balances
  group by party_id,financial_year
),
activity_totals as (
  select
    party_id,financial_year,
    sum(demand_amount) current_fy_demand,
    sum(net_collection_amount) current_fy_receipts,
    sum(approved_adjustment_amount) adjustments,
    sum(contra_signed_amount) current_fy_contra_signed
  from public.v_demand_transaction_reconciliation
  group by party_id,financial_year
),
payment_totals as (
  select
    t.party_id,
    'FY ' || start_year::text || '-' || right((start_year+1)::text,2) as financial_year,
    sum(t.amount) as current_fy_payments_signed
  from public.transactions t
  join public.party_master p on p.party_id=t.party_id
  cross join lateral (
    select coalesce(
      t.transaction_date::date,
      case
        when nullif(btrim(t.reporting_month),'') is not null
        then to_date('01-' || replace(btrim(t.reporting_month),' ','-'),'DD-Mon-YYYY')
        else null
      end
    ) as effective_date
  ) dt
  cross join lateral (
    select case
      when extract(month from dt.effective_date)>=4 then extract(year from dt.effective_date)::integer
      else extract(year from dt.effective_date)::integer-1
    end as start_year
  ) fy
  where t.transaction_type='Payment'
    and p.party_type<>'Member'
    and dt.effective_date is not null
  group by t.party_id,start_year
)
select
  (py.party_id || '-' || py.financial_year) balance_register_id,
  py.party_id,py.party_name as name,py.party_type as type,py.financial_year,
  coalesce(ob.opening_balance,0)::numeric opening_balance,
  coalesce(a.current_fy_demand,0)::numeric current_fy_demand,
  coalesce(a.current_fy_receipts,0)::numeric current_fy_receipts,
  case when py.party_type='Member' then 0::numeric
       else coalesce(pt.current_fy_payments_signed,0)::numeric end as current_fy_payments_signed,
  case when py.party_type='Member' then 0::numeric
       else abs(coalesce(pt.current_fy_payments_signed,0))::numeric end as current_fy_payments,
  coalesce(a.adjustments,0)::numeric adjustments,
  coalesce(a.current_fy_contra_signed,0)::numeric current_fy_contra_signed,
  (
    coalesce(ob.opening_balance,0)
    - coalesce(a.current_fy_demand,0)
    + coalesce(a.current_fy_receipts,0)
    + case when py.party_type='Member' then 0 else coalesce(pt.current_fy_payments_signed,0) end
    + coalesce(a.adjustments,0)
  )::numeric total_outstanding,
  ob.opening_balance_verification_status,ob.opening_balance_notes
from party_years py
left join opening_totals ob on ob.party_id=py.party_id and ob.financial_year=py.financial_year
left join activity_totals a on a.party_id=py.party_id and a.financial_year=py.financial_year
left join payment_totals pt on pt.party_id=py.party_id and pt.financial_year=py.financial_year;

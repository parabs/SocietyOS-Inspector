-- Member balances are demand receivables. Bank charges/payment entries accidentally tagged to members
-- are Society expenses and must not reduce the member's demand balance.
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
    sum(linked_payment_signed_amount) current_fy_payments_signed,
    sum(approved_adjustment_amount) adjustments,
    sum(contra_signed_amount) current_fy_contra_signed
  from public.v_demand_transaction_reconciliation
  group by party_id,financial_year
)
select
  (py.party_id || '-' || py.financial_year) balance_register_id,
  py.party_id,py.party_name as name,py.party_type as type,py.financial_year,
  coalesce(ob.opening_balance,0)::numeric opening_balance,
  coalesce(a.current_fy_demand,0)::numeric current_fy_demand,
  coalesce(a.current_fy_receipts,0)::numeric current_fy_receipts,
  coalesce(a.current_fy_payments_signed,0)::numeric current_fy_payments_signed,
  abs(coalesce(a.current_fy_payments_signed,0))::numeric current_fy_payments,
  coalesce(a.adjustments,0)::numeric adjustments,
  coalesce(a.current_fy_contra_signed,0)::numeric current_fy_contra_signed,
  (
    coalesce(ob.opening_balance,0)
    - coalesce(a.current_fy_demand,0)
    + coalesce(a.current_fy_receipts,0)
    + case when py.party_type='Member' then 0 else coalesce(a.current_fy_payments_signed,0) end
    + coalesce(a.adjustments,0)
  )::numeric total_outstanding,
  ob.opening_balance_verification_status,ob.opening_balance_notes
from party_years py
left join opening_totals ob on ob.party_id=py.party_id and ob.financial_year=py.financial_year
left join activity_totals a on a.party_id=py.party_id and a.financial_year=py.financial_year;

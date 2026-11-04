-- Expose whether opening balances are supported by verified source evidence.
create or replace view public.v_member_financial_year_balance as
select
  b.balance_register_id,b.party_id,b.name,b.type,b.financial_year,
  b.opening_balance,b.current_fy_demand,b.current_fy_receipts,b.adjustments,
  b.total_outstanding,b.opening_balance_verification_status,b.opening_balance_notes,
  (ob.party_id is not null) as opening_balance_recorded,
  b.unallocated_receipts,b.total_party_balance,
  (ob.party_id is not null
    and lower(coalesce(ob.verification_status,''))='verified'
    and nullif(btrim(ob.source_id),'') is not null) as opening_balance_verified
from public.v_member_financial_year_balance_calculated b
left join public.member_opening_balances ob
  on ob.party_id=b.party_id and ob.financial_year=b.financial_year;

create or replace view public.v_opening_balance_register as
select
  party_id,opening_balance::numeric(14,2) as opening_balance,
  current_fy_demand,current_fy_receipts,adjustments,total_outstanding,
  financial_year,opening_balance_notes as notes,opening_balance_recorded,
  unallocated_receipts,total_party_balance,opening_balance_verified,
  opening_balance_verification_status
from public.v_member_financial_year_balance
where financial_year='FY 2018-19';

create or replace view public.v_member_cumulative_outstanding as
select distinct on (party_id)
  party_id,name,type,financial_year as as_of_financial_year,
  total_outstanding as cumulative_outstanding,opening_balance_verification_status,
  opening_balance,current_fy_demand as total_billed,current_fy_receipts as total_received,
  adjustments as total_adjustments,total_outstanding as net_outstanding,
  unallocated_receipts,total_party_balance,opening_balance_recorded,opening_balance_verified
from public.v_member_financial_year_balance
order by party_id,(substring(financial_year from 3 for 4)::integer) desc;

create or replace view public.v_party_financial_year_balance as
with financial_years as (
  select financial_year from public.demand_register where financial_year is not null
  union select financial_year from public.member_opening_balances where financial_year is not null
),
parties as (
  select party_id,party_name,party_type from public.party_master where coalesce(party_type,'')<>'Bank Account'
),
party_years as (
  select p.party_id,p.party_name,p.party_type,y.financial_year from parties p cross join financial_years y
),
opening_totals as (
  select party_id,financial_year,sum(opening_balance) opening_balance,
         max(verification_status) opening_balance_verification_status,
         bool_or(lower(coalesce(verification_status,''))='verified' and nullif(btrim(source_id),'') is not null) opening_balance_verified,
         string_agg(notes,'; ' order by notes) filter(where notes is not null and notes<>'') opening_balance_notes
  from public.member_opening_balances group by party_id,financial_year
),
demand_totals as (
  select party_id,financial_year,sum(demand_amount) current_fy_demand,
         sum(approved_adjustment_amount) adjustments,
         sum(contra_signed_amount) current_fy_contra_signed
  from public.v_demand_transaction_reconciliation group by party_id,financial_year
),
transaction_totals as (
  select party_id,financial_year,
         sum(linked_receipt_amount+bounce_reversal_amount) current_fy_receipts,
         sum(unallocated_receipt_amount) unallocated_receipts,
         sum(payment_signed_amount) current_fy_payments_signed
  from public.v_transaction_financial_year_movement
  where financial_year is not null group by party_id,financial_year
)
select
  (py.party_id || '-' || py.financial_year) balance_register_id,
  py.party_id,py.party_name as name,py.party_type as type,py.financial_year,
  coalesce(ob.opening_balance,0)::numeric opening_balance,
  coalesce(dt.current_fy_demand,0)::numeric current_fy_demand,
  coalesce(tt.current_fy_receipts,0)::numeric current_fy_receipts,
  case when py.party_type='Member' then 0::numeric else coalesce(tt.current_fy_payments_signed,0)::numeric end current_fy_payments_signed,
  case when py.party_type='Member' then 0::numeric else abs(coalesce(tt.current_fy_payments_signed,0))::numeric end current_fy_payments,
  coalesce(dt.adjustments,0)::numeric adjustments,
  coalesce(dt.current_fy_contra_signed,0)::numeric current_fy_contra_signed,
  (
    coalesce(ob.opening_balance,0)-coalesce(dt.current_fy_demand,0)+coalesce(tt.current_fy_receipts,0)
    +case when py.party_type='Member' then 0 else coalesce(tt.current_fy_payments_signed,0) end
    +coalesce(dt.adjustments,0)
  )::numeric total_outstanding,
  ob.opening_balance_verification_status,ob.opening_balance_notes,
  (ob.party_id is not null) as opening_balance_recorded,
  coalesce(tt.unallocated_receipts,0)::numeric unallocated_receipts,
  (
    coalesce(ob.opening_balance,0)-coalesce(dt.current_fy_demand,0)+coalesce(tt.current_fy_receipts,0)
    +case when py.party_type='Member' then 0 else coalesce(tt.current_fy_payments_signed,0) end
    +coalesce(dt.adjustments,0)+coalesce(tt.unallocated_receipts,0)
  )::numeric total_party_balance,
  coalesce(ob.opening_balance_verified,false) as opening_balance_verified
from party_years py
left join opening_totals ob on ob.party_id=py.party_id and ob.financial_year=py.financial_year
left join demand_totals dt on dt.party_id=py.party_id and dt.financial_year=py.financial_year
left join transaction_totals tt on tt.party_id=py.party_id and tt.financial_year=py.financial_year;

create or replace view public.v_transaction_cutoff_exceptions as
with tx as (
  select t.*,
    case when nullif(btrim(t.reporting_month),'') is not null
      then to_date('01-'||replace(btrim(t.reporting_month),' ','-'),'DD-Mon-YYYY') end as reporting_month_date
  from public.transactions t
)
select
  t.transaction_id,t.transaction_type,t.transaction_date,t.reporting_month,
  t.amount,t.account_id,t.party_id,p.party_name,p.party_type,
  t.demand_id,t.description,t.source_id,t.source_sheet,t.source_row,
  t.transaction_date::date as effective_date,
  t.reporting_month_date,
  'FY ' ||
    (case when extract(month from t.transaction_date)>=4 then extract(year from t.transaction_date)::integer
          else extract(year from t.transaction_date)::integer-1 end)::text
    || '-' ||
    right((case when extract(month from t.transaction_date)>=4 then extract(year from t.transaction_date)::integer+1
                else extract(year from t.transaction_date)::integer end)::text,2) as transaction_financial_year,
  'FY ' ||
    (case when extract(month from t.reporting_month_date)>=4 then extract(year from t.reporting_month_date)::integer
          else extract(year from t.reporting_month_date)::integer-1 end)::text
    || '-' ||
    right((case when extract(month from t.reporting_month_date)>=4 then extract(year from t.reporting_month_date)::integer+1
                else extract(year from t.reporting_month_date)::integer end)::text,2) as reporting_financial_year
from tx t
left join public.party_master p on p.party_id=t.party_id
where t.transaction_date is not null and t.reporting_month_date is not null
  and date_trunc('month',t.transaction_date)<>date_trunc('month',t.reporting_month_date);

comment on view public.v_transaction_cutoff_exceptions is
'Transactions where transaction_date month differs from reporting_month. Review financial-year cutoff and opening balance treatment before audit certification.';

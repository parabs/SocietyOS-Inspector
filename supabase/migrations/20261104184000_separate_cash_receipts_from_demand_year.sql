-- Separate receipts by transaction financial year from collections by demand financial year.
-- Direct Demand ID takes precedence; allocations are fallback for receipts without direct links.
-- Unallocated receipts remain unapplied and are carried as a separate member credit.
create or replace view public.v_transaction_financial_year_movement as
with tx_allocation as (
  select a.transaction_id,sum(a.allocated_amount) allocated_amount
  from public.demand_payment_allocations a
  group by a.transaction_id
),
dated_transactions as (
  select
    t.*,
    coalesce(
      t.transaction_date::date,
      case when nullif(btrim(t.reporting_month),'') is not null
        then to_date('01-' || replace(btrim(t.reporting_month),' ','-'),'DD-Mon-YYYY')
        else null end
    ) as effective_date,
    coalesce(a.allocated_amount,0)::numeric as allocated_amount
  from public.transactions t
  left join tx_allocation a on a.transaction_id=t.transaction_id
)
select
  t.transaction_id,t.party_id,t.transaction_type,t.demand_id,t.transaction_date,
  t.reporting_month,t.effective_date,t.amount,t.description,t.category_id,t.account_id,
  case when t.effective_date is null then null
       else 'FY ' ||
         (case when extract(month from t.effective_date)>=4 then extract(year from t.effective_date)::integer
               else extract(year from t.effective_date)::integer-1 end)::text
         || '-' ||
         right((case when extract(month from t.effective_date)>=4 then extract(year from t.effective_date)::integer+1
                     else extract(year from t.effective_date)::integer end)::text,2)
  end as financial_year,
  case when t.transaction_type='Receipt' then
    case when nullif(btrim(t.demand_id),'') is not null then abs(t.amount)
         else least(abs(t.amount),t.allocated_amount) end
    else 0::numeric end as linked_receipt_amount,
  case when t.transaction_type='Receipt' and nullif(btrim(t.demand_id),'') is null
       then greatest(abs(t.amount)-t.allocated_amount,0)
       else 0::numeric end as unallocated_receipt_amount,
  case when t.transaction_type='Contra' and t.amount<0
         and coalesce(t.description,'') ilike '%bounce%'
         and coalesce(t.description,'') not ilike '%bank charge%'
       then case when nullif(btrim(t.demand_id),'') is not null then t.amount
                 else -least(abs(t.amount),t.allocated_amount) end
       else 0::numeric end as bounce_reversal_amount,
  case when t.transaction_type='Payment' then t.amount else 0::numeric end as payment_signed_amount
from dated_transactions t;

create or replace view public.v_member_financial_year_balance_calculated as
with financial_years as (
  select financial_year from public.demand_register where financial_year is not null
  union
  select financial_year from public.member_opening_balances where financial_year is not null
),
member_parties as (
  select party_id,party_name,party_type from public.party_master where party_type='Member'
),
party_years as (
  select p.party_id,p.party_name,p.party_type,y.financial_year from member_parties p cross join financial_years y
),
opening_totals as (
  select party_id,financial_year,sum(opening_balance) opening_balance,
         max(verification_status) opening_balance_verification_status,
         string_agg(notes,'; ' order by notes) filter(where notes is not null and notes<>'') opening_balance_notes
  from public.member_opening_balances group by party_id,financial_year
),
demand_totals as (
  select party_id,financial_year,sum(demand_amount) current_fy_demand
  from public.v_demand_transaction_reconciliation
  where party_type='Member' group by party_id,financial_year
),
collection_totals as (
  select party_id,financial_year,
         sum(linked_receipt_amount+bounce_reversal_amount) current_fy_receipts
  from public.v_transaction_financial_year_movement
  where financial_year is not null
    and party_id in (select party_id from member_parties)
  group by party_id,financial_year
),
unallocated_totals as (
  select party_id,financial_year,sum(unallocated_receipt_amount) unallocated_receipts
  from public.v_transaction_financial_year_movement
  where financial_year is not null
    and party_id in (select party_id from member_parties)
  group by party_id,financial_year
),
adjustment_totals as (
  select d.party_id,d.financial_year,sum(a.adjustment_amount) adjustments
  from public.demand_register d
  join public.demand_adjustments a on a.demand_id=d.demand_id
  join public.party_master p on p.party_id=d.party_id and p.party_type='Member'
  where lower(coalesce(a.approval_status,''))='approved'
  group by d.party_id,d.financial_year
)
select
  (py.party_id || '-' || py.financial_year) balance_register_id,
  py.party_id,py.party_name as name,py.party_type as type,py.financial_year,
  coalesce(ob.opening_balance,0)::numeric opening_balance,
  coalesce(dt.current_fy_demand,0)::numeric current_fy_demand,
  coalesce(ct.current_fy_receipts,0)::numeric current_fy_receipts,
  coalesce(at.adjustments,0)::numeric adjustments,
  (
    coalesce(ob.opening_balance,0)-coalesce(dt.current_fy_demand,0)
    +coalesce(ct.current_fy_receipts,0)+coalesce(at.adjustments,0)
  )::numeric total_outstanding,
  ob.opening_balance_verification_status,
  ob.opening_balance_notes,
  coalesce(ut.unallocated_receipts,0)::numeric unallocated_receipts,
  (
    coalesce(ob.opening_balance,0)-coalesce(dt.current_fy_demand,0)
    +coalesce(ct.current_fy_receipts,0)+coalesce(at.adjustments,0)
    +coalesce(ut.unallocated_receipts,0)
  )::numeric total_party_balance
from party_years py
left join opening_totals ob on ob.party_id=py.party_id and ob.financial_year=py.financial_year
left join demand_totals dt on dt.party_id=py.party_id and dt.financial_year=py.financial_year
left join collection_totals ct on ct.party_id=py.party_id and ct.financial_year=py.financial_year
left join unallocated_totals ut on ut.party_id=py.party_id and ut.financial_year=py.financial_year
left join adjustment_totals at on at.party_id=py.party_id and at.financial_year=py.financial_year;

create or replace view public.v_member_financial_year_balance as
select
  b.balance_register_id,b.party_id,b.name,b.type,b.financial_year,
  b.opening_balance,b.current_fy_demand,b.current_fy_receipts,b.adjustments,
  b.total_outstanding,b.opening_balance_verification_status,b.opening_balance_notes,
  (ob.party_id is not null) as opening_balance_recorded,
  b.unallocated_receipts,b.total_party_balance
from public.v_member_financial_year_balance_calculated b
left join public.member_opening_balances ob
  on ob.party_id=b.party_id and ob.financial_year=b.financial_year;

create or replace view public.v_opening_balance_register as
select
  party_id,opening_balance::numeric(14,2) as opening_balance,
  current_fy_demand,current_fy_receipts,adjustments,total_outstanding,
  financial_year,opening_balance_notes as notes,opening_balance_recorded,
  unallocated_receipts,total_party_balance
from public.v_member_financial_year_balance
where financial_year='FY 2018-19';

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
  where financial_year is not null
  group by party_id,financial_year
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
  )::numeric total_party_balance
from party_years py
left join opening_totals ob on ob.party_id=py.party_id and ob.financial_year=py.financial_year
left join demand_totals dt on dt.party_id=py.party_id and dt.financial_year=py.financial_year
left join transaction_totals tt on tt.party_id=py.party_id and tt.financial_year=py.financial_year;

comment on view public.v_transaction_financial_year_movement is
'Transaction-level financial-year movement. Linked receipts and unallocated receipts are split without silently applying unallocated amounts. Financial year is derived from transaction_date, falling back to reporting_month.';
comment on view public.v_member_financial_year_balance is
'Member demand receivable balance uses all linked receipts by transaction financial year, including receipts against brought-forward demands; unallocated receipts and total party balance are shown separately.';

-- Central financial calculation layer
-- Source of truth: demand_register + transactions, supported by member_opening_balances,
-- approved demand_adjustments and demand_payment_allocations (fallback only).
-- Sign convention: negative member balance = member owes Society; positive = member credit.

create or replace view public.v_demand_transaction_reconciliation as
with linked_transactions as (
  select
    t.transaction_id,
    t.demand_id,
    t.transaction_type,
    t.amount as linked_amount,
    t.description
  from public.transactions t
  where nullif(btrim(t.demand_id),'') is not null

  union all

  select
    t.transaction_id,
    a.demand_id,
    t.transaction_type,
    case
      when t.transaction_type='Receipt' then abs(a.allocated_amount)
      when t.transaction_type='Contra' then -abs(a.allocated_amount)
      else a.allocated_amount
    end as linked_amount,
    t.description
  from public.transactions t
  join public.demand_payment_allocations a
    on a.transaction_id=t.transaction_id
  where nullif(btrim(t.demand_id),'') is null
    and nullif(btrim(a.demand_id),'') is not null
)
select
  d.demand_id,d.financial_year,d.demand_month,d.demand_date,d.due_date,
  d.party_id,p.party_name,p.party_type,d.category_id,c.category_name,
  c.category_group,c.demand_group,d.demand_amount,
  count(t.transaction_id) filter (where t.transaction_type='Receipt') as receipt_count,
  coalesce(sum(abs(t.linked_amount)) filter (where t.transaction_type='Receipt'),0)::numeric as receipt_amount,
  count(t.transaction_id) filter (
    where t.transaction_type='Contra' and t.linked_amount<0
      and coalesce(t.description,'') ilike '%bounce%'
      and coalesce(t.description,'') not ilike '%bank charge%'
  ) as bounce_reversal_count,
  coalesce(sum(t.linked_amount) filter (
    where t.transaction_type='Contra' and t.linked_amount<0
      and coalesce(t.description,'') ilike '%bounce%'
      and coalesce(t.description,'') not ilike '%bank charge%'
  ),0)::numeric as bounce_reversal_amount,
  count(t.transaction_id) filter (where t.transaction_type='Contra') as contra_count,
  coalesce(sum(t.linked_amount) filter (where t.transaction_type='Contra'),0)::numeric as contra_signed_amount,
  count(t.transaction_id) filter (where t.transaction_type='Payment') as linked_payment_count,
  coalesce(sum(t.linked_amount) filter (where t.transaction_type='Payment'),0)::numeric as linked_payment_signed_amount,
  (
    coalesce(sum(abs(t.linked_amount)) filter (where t.transaction_type='Receipt'),0)
    + coalesce(sum(t.linked_amount) filter (
        where t.transaction_type='Contra' and t.linked_amount<0
          and coalesce(t.description,'') ilike '%bounce%'
          and coalesce(t.description,'') not ilike '%bank charge%'
      ),0)
  )::numeric as net_collection_amount,
  (
    coalesce(sum(abs(t.linked_amount)) filter (where t.transaction_type='Receipt'),0)
    + coalesce(sum(t.linked_amount) filter (
        where t.transaction_type='Contra' and t.linked_amount<0
          and coalesce(t.description,'') ilike '%bounce%'
          and coalesce(t.description,'') not ilike '%bank charge%'
      ),0)
    - d.demand_amount
    + coalesce(adj.approved_adjustment_amount,0)
  )::numeric as signed_demand_balance,
  coalesce(adj.approved_adjustment_amount,0)::numeric as approved_adjustment_amount
from public.demand_register d
left join public.party_master p on p.party_id=d.party_id
left join public.category_master c on c.category_id=d.category_id
left join lateral (
  select sum(a.adjustment_amount) as approved_adjustment_amount
  from public.demand_adjustments a
  where a.demand_id=d.demand_id
    and lower(coalesce(a.approval_status,''))='approved'
) adj on true
left join linked_transactions t on t.demand_id=d.demand_id
group by d.demand_id,d.financial_year,d.demand_month,d.demand_date,d.due_date,
  d.party_id,p.party_name,p.party_type,d.category_id,c.category_name,
  c.category_group,c.demand_group,d.demand_amount,adj.approved_adjustment_amount;

create or replace view public.v_member_financial_year_balance_calculated as
with financial_years as (
  select financial_year from public.demand_register where financial_year is not null
  union
  select financial_year from public.member_opening_balances where financial_year is not null
),
member_parties as (
  select party_id,party_name,party_type
  from public.party_master
  where party_type='Member'
),
party_years as (
  select p.party_id,p.party_name,p.party_type,y.financial_year
  from member_parties p
  cross join financial_years y
),
opening_totals as (
  select party_id,financial_year,sum(opening_balance) as opening_balance,
         max(verification_status) as opening_balance_verification_status,
         string_agg(notes,'; ' order by notes) filter (where notes is not null and notes<>'') as opening_balance_notes
  from public.member_opening_balances
  group by party_id,financial_year
),
demand_totals as (
  select party_id,financial_year,sum(demand_amount) as current_fy_demand
  from public.v_demand_transaction_reconciliation
  where party_type='Member'
  group by party_id,financial_year
),
collection_totals as (
  select party_id,financial_year,sum(net_collection_amount) as current_fy_receipts
  from public.v_demand_transaction_reconciliation
  where party_type='Member'
  group by party_id,financial_year
),
adjustment_totals as (
  select d.party_id,d.financial_year,sum(a.adjustment_amount) as adjustments
  from public.demand_register d
  join public.demand_adjustments a on a.demand_id=d.demand_id
  join public.party_master p on p.party_id=d.party_id and p.party_type='Member'
  where lower(coalesce(a.approval_status,''))='approved'
  group by d.party_id,d.financial_year
)
select
  (py.party_id || '-' || py.financial_year) as balance_register_id,
  py.party_id,
  py.party_name as name,
  py.party_type as type,
  py.financial_year,
  coalesce(ob.opening_balance,0)::numeric as opening_balance,
  coalesce(dt.current_fy_demand,0)::numeric as current_fy_demand,
  coalesce(ct.current_fy_receipts,0)::numeric as current_fy_receipts,
  coalesce(at.adjustments,0)::numeric as adjustments,
  (
    coalesce(ob.opening_balance,0)
    - coalesce(dt.current_fy_demand,0)
    + coalesce(ct.current_fy_receipts,0)
    + coalesce(at.adjustments,0)
  )::numeric as total_outstanding,
  ob.opening_balance_verification_status,
  ob.opening_balance_notes
from party_years py
left join opening_totals ob on ob.party_id=py.party_id and ob.financial_year=py.financial_year
left join demand_totals dt on dt.party_id=py.party_id and dt.financial_year=py.financial_year
left join collection_totals ct on ct.party_id=py.party_id and ct.financial_year=py.financial_year
left join adjustment_totals at on at.party_id=py.party_id and at.financial_year=py.financial_year;

create or replace view public.v_member_financial_year_balance as
select
  balance_register_id,party_id,name,type,financial_year,opening_balance,
  current_fy_demand,current_fy_receipts,adjustments,total_outstanding,
  opening_balance_verification_status,opening_balance_notes
from public.v_member_financial_year_balance_calculated;

create or replace view public.v_opening_balance_register as
select
  party_id,
  opening_balance::numeric(14,2) as opening_balance,
  current_fy_demand,
  current_fy_receipts,
  adjustments,
  total_outstanding,
  financial_year,
  opening_balance_notes as notes
from public.v_member_financial_year_balance
where financial_year='FY 2018-19';

comment on view public.v_demand_transaction_reconciliation is
'One row per demand. Uses direct transactions.demand_id first; allocation records apply only when transaction has no direct Demand ID. Net collections include receipt amounts less cheque-bounce reversals; bank charges remain separate.';

comment on view public.v_member_financial_year_balance_calculated is
'Calculated member balances for every Member Master party and each financial year. Negative closing balance means member owes Society; positive means member credit.';

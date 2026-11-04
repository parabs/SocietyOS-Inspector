-- Carry account movements occurring after the recorded source opening date but before FY start
-- into the FY opening position. This is required for ACC-0003: opening is dated 30-Mar-2018,
-- while four source transactions are dated 31-Mar-2018.
create or replace view public.v_account_financial_year_balance as
with financial_years as (
  select distinct financial_year from public.v_transaction_financial_year_movement where financial_year is not null
),
account_years as (
  select a.account_id,a.account_name,a.account_type,a.opening_balance,a.opening_balance_date,
         a.verification_status,y.financial_year,
         make_date(substring(y.financial_year from 4 for 4)::integer,4,1) as fy_start
  from public.account_master a cross join financial_years y
),
pre_fy as (
  select ay.account_id,ay.financial_year,
         sum(t.amount)::numeric as pre_fy_movement,
         count(*)::integer as pre_fy_transaction_count
  from account_years ay
  join public.v_transaction_financial_year_movement t
    on t.account_id=ay.account_id
   and t.effective_date>ay.opening_balance_date
   and t.effective_date<ay.fy_start
  where ay.opening_balance is not null and ay.opening_balance_date is not null
  group by ay.account_id,ay.financial_year
),
movements as (
  select account_id,financial_year,
    count(*) transaction_count,
    sum(case when transaction_type='Receipt' then abs(amount) else 0 end) current_fy_receipts,
    sum(case when transaction_type='Payment' then abs(amount) else 0 end) current_fy_payments,
    sum(case when transaction_type='Contra' and amount>0 then amount else 0 end) current_fy_contra_in,
    sum(case when transaction_type='Contra' and amount<0 then abs(amount) else 0 end) current_fy_contra_out,
    sum(case when transaction_type='Contra' then amount else 0 end) current_fy_contra_signed,
    sum(amount) net_movement
  from public.v_transaction_financial_year_movement
  where financial_year is not null
  group by account_id,financial_year
)
select
  ay.account_id,ay.account_name,ay.account_type,ay.financial_year,
  case when ay.opening_balance is not null and ay.opening_balance_date<=ay.fy_start
    then (ay.opening_balance+coalesce(pf.pre_fy_movement,0))::numeric else null end as opening_balance,
  (ay.opening_balance is not null and ay.opening_balance_date<=ay.fy_start) as opening_balance_recorded,
  ay.opening_balance_date,
  coalesce(m.current_fy_receipts,0)::numeric current_fy_receipts,
  coalesce(m.current_fy_payments,0)::numeric current_fy_payments,
  coalesce(m.current_fy_contra_in,0)::numeric current_fy_contra_in,
  coalesce(m.current_fy_contra_out,0)::numeric current_fy_contra_out,
  coalesce(m.current_fy_contra_signed,0)::numeric current_fy_contra_signed,
  coalesce(m.net_movement,0)::numeric net_movement,
  case when ay.opening_balance is not null and ay.opening_balance_date<=ay.fy_start
    then (ay.opening_balance+coalesce(pf.pre_fy_movement,0)+coalesce(m.net_movement,0))::numeric else null end as closing_book_balance,
  coalesce(m.transaction_count,0)::integer transaction_count,
  ay.verification_status,
  ay.opening_balance::numeric as source_opening_balance,
  coalesce(pf.pre_fy_movement,0)::numeric as pre_fy_movement,
  coalesce(pf.pre_fy_transaction_count,0)::integer as pre_fy_transaction_count
from account_years ay
left join pre_fy pf on pf.account_id=ay.account_id and pf.financial_year=ay.financial_year
left join movements m on m.account_id=ay.account_id and m.financial_year=ay.financial_year;

comment on view public.v_account_financial_year_balance is
'Calculated account book balance. Source opening balances are rolled forward through transactions after the opening date and before FY start, then current FY signed movements including Contra are added. Closing is not bank-confirmed.';

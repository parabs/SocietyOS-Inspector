-- Account balances are calculated from signed source transaction movements.
-- Receipts are positive, Payments negative, and Contra retains its signed amount.
create or replace view public.v_account_financial_year_balance as
with financial_years as (
  select distinct financial_year from public.v_transaction_financial_year_movement where financial_year is not null
),
account_years as (
  select a.account_id,a.account_name,a.account_type,a.opening_balance,a.opening_balance_date,
         a.verification_status,y.financial_year
  from public.account_master a cross join financial_years y
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
  case when ay.opening_balance is not null and ay.opening_balance_date<=
    case when ay.financial_year ~ '^FY [0-9]{4}-[0-9]{2}$'
      then make_date(substring(ay.financial_year from 4 for 4)::integer,4,1)
      else null end
    then ay.opening_balance else null end as opening_balance,
  (ay.opening_balance is not null and ay.opening_balance_date<=
    case when ay.financial_year ~ '^FY [0-9]{4}-[0-9]{2}$'
      then make_date(substring(ay.financial_year from 4 for 4)::integer,4,1)
      else null end) as opening_balance_recorded,
  ay.opening_balance_date,
  coalesce(m.current_fy_receipts,0)::numeric current_fy_receipts,
  coalesce(m.current_fy_payments,0)::numeric current_fy_payments,
  coalesce(m.current_fy_contra_in,0)::numeric current_fy_contra_in,
  coalesce(m.current_fy_contra_out,0)::numeric current_fy_contra_out,
  coalesce(m.current_fy_contra_signed,0)::numeric current_fy_contra_signed,
  coalesce(m.net_movement,0)::numeric net_movement,
  case when ay.opening_balance is not null and ay.opening_balance_date<=
    case when ay.financial_year ~ '^FY [0-9]{4}-[0-9]{2}$'
      then make_date(substring(ay.financial_year from 4 for 4)::integer,4,1)
      else null end
    then (ay.opening_balance+coalesce(m.net_movement,0))::numeric
    else null end as closing_book_balance,
  coalesce(m.transaction_count,0)::integer transaction_count,
  ay.verification_status
from account_years ay
left join movements m on m.account_id=ay.account_id and m.financial_year=ay.financial_year;

create or replace view public.v_account_monthly_movement as
select
  t.account_id,a.account_name,a.account_type,t.financial_year,
  date_trunc('month',t.effective_date)::date as month_start,
  to_char(date_trunc('month',t.effective_date),'Mon-YYYY') as reporting_month,
  sum(case when t.transaction_type='Receipt' then abs(t.amount) else 0 end)::numeric receipt_amount,
  sum(case when t.transaction_type='Payment' then abs(t.amount) else 0 end)::numeric payment_amount,
  sum(case when t.transaction_type='Contra' and t.amount>0 then t.amount else 0 end)::numeric contra_in,
  sum(case when t.transaction_type='Contra' and t.amount<0 then abs(t.amount) else 0 end)::numeric contra_out,
  sum(case when t.transaction_type='Contra' then t.amount else 0 end)::numeric contra_signed,
  sum(t.amount)::numeric net_movement,
  count(*)::integer transaction_count
from public.v_transaction_financial_year_movement t
left join public.account_master a on a.account_id=t.account_id
where t.financial_year is not null and t.effective_date is not null
group by t.account_id,a.account_name,a.account_type,t.financial_year,date_trunc('month',t.effective_date);

comment on view public.v_account_financial_year_balance is
'Book balance per account and financial year. Closing book balance equals recorded opening balance plus all signed transaction movements, including Contra. It is not a bank-confirmed closing balance.';
comment on view public.v_account_monthly_movement is
'Monthly signed account movement derived from transaction register, with Contra in/out shown separately.';

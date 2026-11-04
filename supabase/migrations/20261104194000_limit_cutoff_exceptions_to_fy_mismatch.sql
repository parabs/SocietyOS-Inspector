-- Only flag cross-financial-year mismatches. Month-end receipts for the next demand month
-- are common in this dataset and are not cutoff exceptions unless they cross FY boundaries.
create or replace view public.v_transaction_cutoff_exceptions as
with tx as (
  select t.*,
    case when nullif(btrim(t.reporting_month),'') is not null
      then to_date('01-'||replace(btrim(t.reporting_month),' ','-'),'DD-Mon-YYYY') end as reporting_month_date
  from public.transactions t
),
classified as (
  select t.*,
    case when t.transaction_date is null then null else
      'FY '||(case when extract(month from t.transaction_date)>=4 then extract(year from t.transaction_date)::integer else extract(year from t.transaction_date)::integer-1 end)::text
      ||'-'||right((case when extract(month from t.transaction_date)>=4 then extract(year from t.transaction_date)::integer+1 else extract(year from t.transaction_date)::integer end)::text,2)
    end as transaction_financial_year,
    case when t.reporting_month_date is null then null else
      'FY '||(case when extract(month from t.reporting_month_date)>=4 then extract(year from t.reporting_month_date)::integer else extract(year from t.reporting_month_date)::integer-1 end)::text
      ||'-'||right((case when extract(month from t.reporting_month_date)>=4 then extract(year from t.reporting_month_date)::integer+1 else extract(year from t.reporting_month_date)::integer end)::text,2)
    end as reporting_financial_year
  from tx t
)
select
  t.transaction_id,t.transaction_type,t.transaction_date,t.reporting_month,
  t.amount,t.account_id,t.party_id,p.party_name,p.party_type,t.demand_id,
  t.description,t.source_id,t.source_sheet,t.source_row,
  t.transaction_date::date effective_date,t.reporting_month_date,
  t.transaction_financial_year,t.reporting_financial_year
from classified t
left join public.party_master p on p.party_id=t.party_id
where t.transaction_financial_year is not null
  and t.reporting_financial_year is not null
  and t.transaction_financial_year<>t.reporting_financial_year;

comment on view public.v_transaction_cutoff_exceptions is
'Transactions where transaction-date financial year differs from reporting-month financial year. Month-end postings within the same FY are not treated as cutoff exceptions.';

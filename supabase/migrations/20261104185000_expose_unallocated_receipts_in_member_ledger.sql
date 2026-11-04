-- Expose both demand receivable and total member account balance.
-- Unallocated receipts are carried separately as unapplied credits.
create or replace view public.v_member_cumulative_outstanding as
select distinct on (party_id)
  party_id,
  name,
  type,
  financial_year as as_of_financial_year,
  total_outstanding as cumulative_outstanding,
  opening_balance_verification_status,
  opening_balance,
  current_fy_demand as total_billed,
  current_fy_receipts as total_received,
  adjustments as total_adjustments,
  total_outstanding as net_outstanding,
  unallocated_receipts,
  total_party_balance,
  opening_balance_recorded
from public.v_member_financial_year_balance
order by party_id,(substring(financial_year from 3 for 4)::integer) desc;

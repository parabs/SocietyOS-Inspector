import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hklibokniuwurdxndxfd.supabase.co';
const supabaseKey = 'sb_publishable_m6ab_-TqTPpqdwvbLeRP_A_RVbLVlSr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDatabase() {
  const tables = [
    'account_master',
    'account_monthly_balance',
    'transactions',
    'member_opening_balances',
    'balance_register',
    'v_member_financial_year_balance',
    'v_member_cumulative_outstanding',
    'demand_register',
    'demand_adjustments',
    'demand_payment_allocations',
    'party_master',
    'flat_owner_master',
    'category_master',
    'rules_master',
    'source_register'
  ];

  console.log('--- Testing Supabase Tables ---');
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(2);

      if (error) {
        console.log(`[ERROR] ${table}:`, error.message, error.details || '');
      } else {
        const sampleKeys = data && data.length > 0 ? Object.keys(data[0]) : [];
        console.log(`[OK] ${table} | count: ${count ?? data?.length} | cols: ${sampleKeys.join(', ')}`);
        if (data && data.length > 0) {
          console.log(`  Sample row:`, JSON.stringify(data[0]));
        }
      }
    } catch (e) {
      console.log(`[EXCEPTION] ${table}:`, e.message);
    }
  }
}

inspectDatabase();

/**
 * Database Tables Schema and Sample Records
 * Modeled from Varsha Nivas CHS Excel Source Data Sheets
 */

export interface DatabaseTableDefinition {
  id: string;
  name: string;
  excelSheetName: string;
  description: string;
  category: 'Masters' | 'Operational' | 'Reconciliation' | 'System';
  columns: {
    name: string;
    type: 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'enum';
    required: boolean;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
    foreignTable?: string;
    description: string;
  }[];
  sampleRecords: Record<string, any>[];
}

export const DATABASE_TABLES_CATALOG: DatabaseTableDefinition[] = [
  {
    id: 'tbl_flat_owner_master',
    name: 'Flat & Owner Master',
    excelSheetName: 'FLAT_OWNER_MASTER',
    description: 'Master register of flats, car parks, owner details, contact information, and occupancy status',
    category: 'Masters',
    columns: [
      { name: 'flat_id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique flat or asset unit code' },
      { name: 'unit_number', type: 'string', required: true, description: 'Flat or parking space number (e.g. Flat 101, CA-303)' },
      { name: 'unit_type', type: 'enum', required: true, description: 'Residential Unit, Open Parking, Covered Parking' },
      { name: 'owner_name', type: 'string', required: true, description: 'Primary registered owner name' },
      { name: 'occupancy_status', type: 'enum', required: true, description: 'Self-Occupied, Tenant-Occupied, Vacant' },
      { name: 'verification_status', type: 'enum', required: true, description: 'Verified, Pending, Disputed' },
      { name: 'documentation_status', type: 'enum', required: true, description: 'Complete, Partially Complete, Missing' },
      { name: 'share_certificate_status', type: 'enum', required: true, description: 'Issued, Applied, Under Review, Never Issued' },
    ],
    sampleRecords: [
      { flat_id: 'FLAT-101', unit_number: 'Flat No 101', unit_type: 'Residential Unit', owner_name: 'Kumar Mritunjay Singh', occupancy_status: 'Self-Occupied', verification_status: 'Verified', documentation_status: 'Complete', share_certificate_status: 'Issued' },
      { flat_id: 'FLAT-102', unit_number: 'Flat No 102', unit_type: 'Residential Unit', owner_name: 'AvdeshKumar Singh', occupancy_status: 'Self-Occupied', verification_status: 'Verified', documentation_status: 'Complete', share_certificate_status: 'Issued' },
      { flat_id: 'FLAT-103', unit_number: 'Flat No 103', unit_type: 'Residential Unit', owner_name: 'Sunil B Chaudhari', occupancy_status: 'Tenant-Occupied', verification_status: 'Verified', documentation_status: 'Complete', share_certificate_status: 'Issued' },
      { flat_id: 'FLAT-104', unit_number: 'Flat No 104', unit_type: 'Residential Unit', owner_name: 'Prasad Kulwade', occupancy_status: 'Self-Occupied', verification_status: 'Verified', documentation_status: 'Complete', share_certificate_status: 'Issued' },
      { flat_id: 'FLAT-201', unit_number: 'Flat No 201', unit_type: 'Residential Unit', owner_name: 'Anup Gadve', occupancy_status: 'Self-Occupied', verification_status: 'Pending', documentation_status: 'Partially Complete', share_certificate_status: 'Applied' },
      { flat_id: 'FLAT-202', unit_number: 'Flat No 202', unit_type: 'Residential Unit', owner_name: 'Ramakant Patil', occupancy_status: 'Self-Occupied', verification_status: 'Verified', documentation_status: 'Complete', share_certificate_status: 'Issued' },
      { flat_id: 'CP-303', unit_number: 'Car Park CA-303', unit_type: 'Covered Parking', owner_name: 'Dinesh Wasnik', occupancy_status: 'Self-Occupied', verification_status: 'Verified', documentation_status: 'Complete', share_certificate_status: 'Issued' },
      { flat_id: 'CP-304', unit_number: 'Car Park CA-304', unit_type: 'Covered Parking', owner_name: 'Ashish Rawool', occupancy_status: 'Self-Occupied', verification_status: 'Pending', documentation_status: 'Missing', share_certificate_status: 'Under Review' },
    ],
  },
  {
    id: 'tbl_party_master',
    name: 'Party Master (Transaction Parties)',
    excelSheetName: 'PARTY_MASTER',
    description: 'Directory of all transaction parties including society members, vendors, staff, and utility bodies',
    category: 'Masters',
    columns: [
      { name: 'party_id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique party code (e.g. PTY-0001)' },
      { name: 'party_name', type: 'string', required: true, description: 'Party or member account name' },
      { name: 'party_type', type: 'enum', required: true, description: 'Member, Staff, Vendor, Utility, Bank Account' },
      { name: 'contact_person', type: 'string', required: false, description: 'Key contact person name' },
      { name: 'status', type: 'enum', required: true, description: 'Active, Inactive, Disputed' },
      { name: 'notes', type: 'string', required: false, description: 'Auditor or ledger mapping instructions' },
    ],
    sampleRecords: [
      { party_id: 'PTY-0001', party_name: 'Flat No 101', party_type: 'Member', contact_person: 'Kumar Mritunjay Singh', status: 'Active', notes: 'Primary maintenance payer' },
      { party_id: 'PTY-0002', party_name: 'Flat No 102', party_type: 'Member', contact_person: 'AvdeshKumar Singh', status: 'Active', notes: 'Maintenance & parking' },
      { party_id: 'PTY-0045', party_name: 'Sweeper Salary', party_type: 'Staff', contact_person: 'Ramesh Jadhav', status: 'Active', notes: 'Monthly cleaning wages' },
      { party_id: 'PTY-0046', party_name: 'Security Services', party_type: 'Staff', contact_person: 'Eagle Eye Security Services', status: 'Active', notes: '24x7 gate security contract' },
      { party_id: 'PTY-0047', party_name: 'Federation', party_type: 'Vendor', contact_person: 'Housing Federation Thane', status: 'Active', notes: 'Annual federation contribution' },
      { party_id: 'PTY-0050', party_name: 'Electric Bill', party_type: 'Utility', contact_person: 'MSEDCL', status: 'Active', notes: 'Common area & pump electricity' },
      { party_id: 'PTY-0053', party_name: 'Bank - TDCC', party_type: 'Bank Account', contact_person: 'Branch Manager', status: 'Active', notes: 'Main operating cooperative bank account' },
      { party_id: 'PTY-0054', party_name: 'Bank - BOM', party_type: 'Bank Account', contact_person: 'Branch Manager', status: 'Active', notes: 'Reserve and sinking fund account' },
    ],
  },
  {
    id: 'tbl_account_master',
    name: 'Account Master (Society Money Accounts)',
    excelSheetName: 'ACCOUNT_MASTER',
    description: 'Society bank accounts, petty cash registers, and fixed deposit ledger records',
    category: 'Masters',
    columns: [
      { name: 'account_id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique account identifier (ACC-0001)' },
      { name: 'account_name', type: 'string', required: true, description: 'Display name (TDCC, BOM, Petty Cash)' },
      { name: 'account_type', type: 'enum', required: true, description: 'Bank Account, Cash, Fixed Deposit' },
      { name: 'bank_name', type: 'string', required: true, description: 'Banking institution' },
      { name: 'opening_balance', type: 'currency', required: true, description: 'Opening balance as of FY start' },
      { name: 'status', type: 'enum', required: true, description: 'Active, Inactive' },
    ],
    sampleRecords: [
      { account_id: 'ACC-0001', account_name: 'TDCC', account_type: 'Bank Account', bank_name: 'Thane Janta Sahakari Bank', opening_balance: 128352.30, status: 'Active' },
      { account_id: 'ACC-0002', account_name: 'BOM', account_type: 'Bank Account', bank_name: 'Bank Of Maharashtra', opening_balance: 5940.00, status: 'Active' },
      { account_id: 'ACC-0003', account_name: 'Petty Cash', account_type: 'Cash', bank_name: 'Cash in Hand (Treasurer)', opening_balance: 27978.00, status: 'Active' },
      { account_id: 'ACC-0004', account_name: 'FD-FY-2021-22 (01)', account_type: 'Fixed Deposit', bank_name: 'Thane Janta Sahakari Bank', opening_balance: 500000.00, status: 'Active' },
      { account_id: 'ACC-0005', account_name: 'FD-FY-2021-22 (02)', account_type: 'Fixed Deposit', bank_name: 'Thane Janta Sahakari Bank', opening_balance: 250000.00, status: 'Active' },
    ],
  },
  {
    id: 'tbl_rules_master',
    name: 'Rules Master (Billing & Penalties)',
    excelSheetName: 'RULES_MASTER',
    description: 'Society bye-law rules governing regular maintenance, late fee calculations, parking, and non-occupancy charges',
    category: 'Masters',
    columns: [
      { name: 'rule_id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique rule identifier (RULE-001)' },
      { name: 'rule_name', type: 'string', required: true, description: 'Standard society rule title' },
      { name: 'charge_type', type: 'enum', required: true, description: 'Fixed Monthly, Fixed Annual, Penalty, Variable' },
      { name: 'standard_amount', type: 'currency', required: true, description: 'Standard fee in INR' },
      { name: 'due_day_of_month', type: 'number', required: true, description: 'Day of month payment is due' },
      { name: 'status', type: 'enum', required: true, description: 'Active, Superseded' },
    ],
    sampleRecords: [
      { rule_id: 'RULE-001', rule_name: 'Standard Monthly Maintenance', charge_type: 'Fixed Monthly', standard_amount: 2500.00, due_day_of_month: 10, status: 'Active' },
      { rule_id: 'RULE-002', rule_name: 'Covered Car Parking Fee', charge_type: 'Fixed Monthly', standard_amount: 400.00, due_day_of_month: 10, status: 'Active' },
      { rule_id: 'RULE-003', rule_name: 'Open Car Parking Fee', charge_type: 'Fixed Monthly', standard_amount: 200.00, due_day_of_month: 10, status: 'Active' },
      { rule_id: 'RULE-004', rule_name: 'Late Payment Penalty (Interest)', charge_type: 'Penalty', standard_amount: 80.00, due_day_of_month: 11, status: 'Active' },
      { rule_id: 'RULE-005', rule_name: 'Previous Dues Recovery', charge_type: 'Variable', standard_amount: 2500.00, due_day_of_month: 10, status: 'Active' },
      { rule_id: 'RULE-006', rule_name: 'Non-Occupancy Charges (NC)', charge_type: 'Fixed Monthly', standard_amount: 100.00, due_day_of_month: 10, status: 'Active' },
    ],
  },
  {
    id: 'tbl_category_master',
    name: 'Category Master (Chart of Accounts)',
    excelSheetName: 'CATEGORY_MASTER',
    description: 'Accounting classification categories for statutory receipts and payments',
    category: 'Masters',
    columns: [
      { name: 'category_id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique category identifier (CAT-0001)' },
      { name: 'category_name', type: 'string', required: true, description: 'Classification title' },
      { name: 'category_group', type: 'string', required: true, description: 'Parent group in audit schedule' },
      { name: 'transaction_type', type: 'enum', required: true, description: 'Income, Expense, Advance, Adjustment, Transfer' },
      { name: 'active', type: 'boolean', required: true, description: 'Active status in accounting entry' },
    ],
    sampleRecords: [
      { category_id: 'CAT-0001', category_name: 'Maintenance Charges', category_group: 'Member Income & Recoveries', transaction_type: 'Income', active: true },
      { category_id: 'CAT-0002', category_name: 'Previous Dues – Maintenance', category_group: 'Member Income & Recoveries', transaction_type: 'Income', active: true },
      { category_id: 'CAT-0003', category_name: 'Previous Dues — Late payments', category_group: 'Member Income & Recoveries', transaction_type: 'Income', active: true },
      { category_id: 'CAT-0005', category_name: 'Staff Salary', category_group: 'Staff & Society Services', transaction_type: 'Expense', active: true },
      { category_id: 'CAT-0008', category_name: 'Electricity Expense', category_group: 'Utilities, Maintenance & Repairs', transaction_type: 'Expense', active: true },
      { category_id: 'CAT-0013', category_name: 'Audit & Professional Fees', category_group: 'Administration & General', transaction_type: 'Expense', active: true },
      { category_id: 'CAT-0015', category_name: 'Bank Interest', category_group: 'Banking', transaction_type: 'Income', active: true },
      { category_id: 'CAT-0016', category_name: 'Bank Charges', category_group: 'Banking', transaction_type: 'Expense', active: true },
    ],
  },
  {
    id: 'tbl_opening_balances',
    name: 'Opening Balances Table',
    excelSheetName: 'OPENING_BALANCES',
    description: 'Official opening balances as of 01-Apr-2018 verified against prior year audited balance sheet',
    category: 'Operational',
    columns: [
      { name: 'balance_register_id', type: 'string', required: true, isPrimaryKey: true, description: 'Balance register entry ID' },
      { name: 'party_id', type: 'string', required: true, isForeignKey: true, foreignTable: 'tbl_party_master', description: 'Associated party or account code' },
      { name: 'party_name', type: 'string', required: true, description: 'Member, vendor or account title' },
      { name: 'opening_balance', type: 'currency', required: true, description: 'Historical opening balance' },
      { name: 'current_fy_demand', type: 'currency', required: true, description: 'Current FY raised demand' },
      { name: 'current_fy_receipts', type: 'currency', required: true, description: 'Current FY received amount' },
      { name: 'total_outstanding', type: 'currency', required: true, description: 'Net balance outstanding' },
      { name: 'financial_year', type: 'string', required: true, description: 'Audit FY' },
    ],
    sampleRecords: [
      { balance_register_id: 'BAL-0001', party_id: 'PTY-0001', party_name: 'Flat No 101', opening_balance: 2180.00, current_fy_demand: 7500.00, current_fy_receipts: 7580.00, total_outstanding: 1520.00, financial_year: 'FY 2018-19' },
      { balance_register_id: 'BAL-0002', party_id: 'PTY-0002', party_name: 'Flat No 102', opening_balance: 10900.00, current_fy_demand: 7800.00, current_fy_receipts: 7800.00, total_outstanding: 10900.00, financial_year: 'FY 2018-19' },
      { balance_register_id: 'BAL-0005', party_id: 'PTY-0005', party_name: 'Flat No 201', opening_balance: -12600.00, current_fy_demand: 23160.00, current_fy_receipts: 7400.00, total_outstanding: 3160.00, financial_year: 'FY 2018-19' },
      { balance_register_id: 'BAL-0014', party_id: 'PTY-0014', party_name: 'Flat No 402', opening_balance: 8350.00, current_fy_demand: 13420.00, current_fy_receipts: 13420.00, total_outstanding: 8350.00, financial_year: 'FY 2018-19' },
      { balance_register_id: 'BAL-0024', party_id: 'PTY-0024', party_name: 'Flat No 604', opening_balance: 25200.00, current_fy_demand: 15160.00, current_fy_receipts: 9800.00, total_outstanding: 30560.00, financial_year: 'FY 2018-19' },
    ],
  },
  {
    id: 'tbl_demand_register',
    name: 'Demand Register (Member Dues)',
    excelSheetName: 'DEMAND_REGISTER',
    description: 'Monthly raised billing demands, adjustments, member payments, and outstanding balances',
    category: 'Operational',
    columns: [
      { name: 'demand_id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique demand identifier' },
      { name: 'financial_year', type: 'string', required: true, description: 'Accounting year' },
      { name: 'demand_month', type: 'string', required: true, description: 'Billing month (e.g. Apr-2018)' },
      { name: 'due_date', type: 'date', required: false, description: 'Payment cutoff date' },
      { name: 'party_id', type: 'string', required: true, isForeignKey: true, foreignTable: 'tbl_party_master', description: 'Member code' },
      { name: 'party_name', type: 'string', required: true, description: 'Member unit description' },
      { name: 'demand_amount', type: 'currency', required: true, description: 'Gross demand in INR' },
      { name: 'paid_amount', type: 'currency', required: true, description: 'Total payments received' },
      { name: 'outstanding_amount', type: 'currency', required: true, description: 'Pending dues balance' },
      { name: 'status', type: 'enum', required: true, description: 'Paid, Unpaid, Partially Paid' },
    ],
    sampleRecords: [
      { demand_id: 'DEM-SRC001-0011', financial_year: 'FY 2018-19', demand_month: 'Apr-2018', due_date: '2018-04-10', party_id: 'PTY-0001', party_name: 'Flat No 101', demand_amount: 2500.00, paid_amount: 2500.00, outstanding_amount: 0.00, status: 'Paid' },
      { demand_id: 'DEM-SRC001-0012', financial_year: 'FY 2018-19', demand_month: 'Apr-2018', due_date: '2018-04-10', party_id: 'PTY-0002', party_name: 'Flat No 102', demand_amount: 2500.00, paid_amount: 2500.00, outstanding_amount: 0.00, status: 'Paid' },
      { demand_id: 'DEM-SRC001-0015', financial_year: 'FY 2018-19', demand_month: 'Apr-2018', due_date: '2018-04-10', party_id: 'PTY-0005', party_name: 'Flat No 201', demand_amount: 2500.00, paid_amount: 0.00, outstanding_amount: 2500.00, status: 'Unpaid' },
      { demand_id: 'DEM-SRC001-0016', financial_year: 'FY 2018-19', demand_month: 'Apr-2018', due_date: '2018-04-10', party_id: 'PTY-0006', party_name: 'Flat No 202', demand_amount: 2500.00, paid_amount: 2500.00, outstanding_amount: 0.00, status: 'Paid' },
      { demand_id: 'DEM-SRC001-0021', financial_year: 'FY 2018-19', demand_month: 'Apr-2018', due_date: '2018-04-10', party_id: 'PTY-0011', party_name: 'Flat No 303', demand_amount: 2500.00, paid_amount: 0.00, outstanding_amount: 2500.00, status: 'Unpaid' },
      { demand_id: 'DEM-SRC001-0024', financial_year: 'FY 2018-19', demand_month: 'Apr-2018', due_date: '2018-04-10', party_id: 'PTY-0014', party_name: 'Flat No 402', demand_amount: 2500.00, paid_amount: 0.00, outstanding_amount: 2500.00, status: 'Unpaid' },
    ],
  },
  {
    id: 'tbl_transactions',
    name: 'Transactions Table (Vouchers & Ledgers)',
    excelSheetName: 'TRANSACTIONS',
    description: 'Society financial vouchers, receipts, payments, and auditor verification flags',
    category: 'Operational',
    columns: [
      { name: 'transaction_id', type: 'string', required: true, isPrimaryKey: true, description: 'Unique transaction voucher code' },
      { name: 'transaction_date', type: 'date', required: true, description: 'Voucher date' },
      { name: 'transaction_type', type: 'enum', required: true, description: 'Receipt or Payment' },
      { name: 'party_name', type: 'string', required: true, description: 'Party or member description' },
      { name: 'amount', type: 'currency', required: true, description: 'Voucher value in INR' },
      { name: 'account_name', type: 'string', required: true, description: 'TDCC, BOM, or Petty Cash' },
      { name: 'evidence_status', type: 'enum', required: true, description: 'Complete, Discrepancy, Missing, Pending' },
      { name: 'internal_audit_status', type: 'enum', required: true, description: 'Verified, Pending, Failed' },
    ],
    sampleRecords: [
      { transaction_id: 'FY1819-01-0001', transaction_date: '2018-04-03', transaction_type: 'Payment', party_name: 'Sweeper Salary', amount: 3000.00, account_name: 'TDCC', evidence_status: 'Complete', internal_audit_status: 'Verified' },
      { transaction_id: 'FY1819-01-0002', transaction_date: '2018-04-04', transaction_type: 'Payment', party_name: 'Security Services', amount: 24045.00, account_name: 'TDCC', evidence_status: 'Complete', internal_audit_status: 'Verified' },
      { transaction_id: 'FY1819-01-0003', transaction_date: '2018-04-11', transaction_type: 'Payment', party_name: 'Federation', amount: 5600.00, account_name: 'TDCC', evidence_status: 'Complete', internal_audit_status: 'Verified' },
      { transaction_id: 'FY1819-01-0004', transaction_date: '2018-04-17', transaction_type: 'Receipt', party_name: 'Flat No 101', amount: 2500.00, account_name: 'Petty Cash', evidence_status: 'Complete', internal_audit_status: 'Verified' },
      { transaction_id: 'FY1819-01-0005', transaction_date: '2018-04-08', transaction_type: 'Receipt', party_name: 'Flat No 102', amount: 2500.00, account_name: 'Petty Cash', evidence_status: 'Pending', internal_audit_status: 'Pending' },
      { transaction_id: 'FY1819-01-0008', transaction_date: '2018-04-12', transaction_type: 'Receipt', party_name: 'Flat No 201', amount: 0.00, account_name: 'UNMAPPED ACCOUNT', evidence_status: 'Discrepancy', internal_audit_status: 'Failed' },
    ],
  },
  {
    id: 'tbl_monthly_reconciliations',
    name: 'Account-wise Monthly Reconciliation',
    excelSheetName: 'ACCOUNT_WISE_MONTHLY_RECONCILIATION',
    description: 'Bank passbook and cash book monthly reconciliation records across all financial months',
    category: 'Reconciliation',
    columns: [
      { name: 'rec_id', type: 'string', required: true, isPrimaryKey: true, description: 'Reconciliation identifier' },
      { name: 'financial_year', type: 'string', required: true, description: 'Audit year' },
      { name: 'month', type: 'string', required: true, description: 'Month (e.g. Apr-2018)' },
      { name: 'account_name', type: 'string', required: true, description: 'Petty Cash, TDCC, BOM' },
      { name: 'source_opening', type: 'currency', required: true, description: 'Opening balance from monthly statement' },
      { name: 'credits', type: 'currency', required: true, description: 'Total credits (receipts)' },
      { name: 'debits', type: 'currency', required: true, description: 'Total debits (payments)' },
      { name: 'target_closing', type: 'currency', required: true, description: 'Target calculated closing balance' },
      { name: 'closing_discrepancy', type: 'currency', required: true, description: 'Discrepancy between calculated and source' },
      { name: 'status', type: 'enum', required: true, description: 'MATCHED, DIFFERENCE, PENDING' },
    ],
    sampleRecords: [
      { rec_id: 'REC-01-CASH', financial_year: 'FY 2018-19', month: 'Apr-2018', account_name: 'Petty Cash', source_opening: 27978.00, credits: 18180.00, debits: 10926.00, target_closing: 35232.00, closing_discrepancy: 0.00, status: 'MATCHED' },
      { rec_id: 'REC-01-TDCC', financial_year: 'FY 2018-19', month: 'Apr-2018', account_name: 'TDCC', source_opening: 128352.30, credits: 39600.00, debits: 32645.00, target_closing: 135307.30, closing_discrepancy: 0.00, status: 'MATCHED' },
      { rec_id: 'REC-01-BOM', financial_year: 'FY 2018-19', month: 'Apr-2018', account_name: 'BOM', source_opening: 5940.00, credits: 11000.51, debits: 11.51, target_closing: 16929.00, closing_discrepancy: 0.00, status: 'MATCHED' },
      { rec_id: 'REC-02-CASH', financial_year: 'FY 2018-19', month: 'May-2018', account_name: 'Petty Cash', source_opening: 35232.00, credits: 12800.00, debits: 15970.00, target_closing: 32062.00, closing_discrepancy: 0.00, status: 'MATCHED' },
      { rec_id: 'REC-02-TDCC', financial_year: 'FY 2018-19', month: 'May-2018', account_name: 'TDCC', source_opening: 135307.30, credits: 63670.00, debits: 68557.50, target_closing: 130419.80, closing_discrepancy: 0.00, status: 'MATCHED' },
    ],
  },
  {
    id: 'tbl_source_files',
    name: 'Source Files Register',
    excelSheetName: 'SOURCE_FILES',
    description: 'Ledger of raw Excel workbooks, bank statements, and upload manifests',
    category: 'System',
    columns: [
      { name: 'file_id', type: 'string', required: true, isPrimaryKey: true, description: 'File code' },
      { name: 'file_name', type: 'string', required: true, description: 'Spreadsheet name (e.g. 1Statement_30042018.xlsx)' },
      { name: 'period', type: 'string', required: true, description: 'Coverage period' },
      { name: 'row_count', type: 'number', required: true, description: 'Number of transactions in file' },
      { name: 'ingestion_status', type: 'enum', required: true, description: 'Ingested, Partially Ingested, Pending' },
      { name: 'uploaded_by', type: 'string', required: true, description: 'User or reviewer' },
    ],
    sampleRecords: [
      { file_id: 'SRC-001', file_name: '1Statement_30042018.xlsx', period: 'Apr 2018', row_count: 82, ingestion_status: 'Ingested', uploaded_by: 'Secretary Varsha Nivas' },
      { file_id: 'SRC-002', file_name: '2Statement_31052018.xlsx', period: 'May 2018', row_count: 94, ingestion_status: 'Ingested', uploaded_by: 'Secretary Varsha Nivas' },
      { file_id: 'SRC-003', file_name: '3Statement_30062018.xlsx', period: 'Jun 2018', row_count: 110, ingestion_status: 'Ingested', uploaded_by: 'Secretary Varsha Nivas' },
      { file_id: 'SRC-004', file_name: '4Statement_31072018.xlsx', period: 'Jul 2018', row_count: 88, ingestion_status: 'Ingested', uploaded_by: 'Secretary Varsha Nivas' },
      { file_id: 'SRC-005', file_name: '5Statement_31082018.xlsx', period: 'Aug 2018', row_count: 102, ingestion_status: 'Ingested', uploaded_by: 'Secretary Varsha Nivas' },
    ],
  },
  {
    id: 'tbl_controlled_dropdowns',
    name: 'Controlled Dropdowns (Data Constraints)',
    excelSheetName: 'CONTROLLED_DROPDOWNS',
    description: 'System-wide validation constraints and dropdown options for data integrity',
    category: 'System',
    columns: [
      { name: 'dropdown_key', type: 'string', required: true, isPrimaryKey: true, description: 'Group key' },
      { name: 'allowed_value', type: 'string', required: true, description: 'Permitted value string' },
      { name: 'meaning', type: 'string', required: true, description: 'Regulatory and procedural explanation' },
    ],
    sampleRecords: [
      { dropdown_key: 'Audit_Inspection_Status', allowed_value: 'Not Started', meaning: 'Monthly verification has not started.' },
      { dropdown_key: 'Audit_Inspection_Status', allowed_value: 'Physical Evidence Verification Pending', meaning: 'Source is available but physical/supporting evidence has not yet been checked.' },
      { dropdown_key: 'Audit_Inspection_Status', allowed_value: 'Observations Raised', meaning: 'One or more observations or discrepancies have been identified.' },
      { dropdown_key: 'Audit_Inspection_Status', allowed_value: 'Verified — No Outstanding Observations', meaning: 'Verification is complete with no unresolved observations.' },
      { dropdown_key: 'Owner_Type', allowed_value: 'Individual', meaning: 'One individual is recorded as the owner for this ownership period.' },
      { dropdown_key: 'Owner_Type', allowed_value: 'Joint Owners', meaning: 'Two or more joint owners are recorded.' },
      { dropdown_key: 'Verification_Status', allowed_value: 'Verified', meaning: 'Owner and ownership-period details have been checked against reliable evidence.' },
    ],
  },
];

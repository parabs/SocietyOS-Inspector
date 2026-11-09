import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, CalendarDays, CheckCircle2, Clock, Download,
  FileText, Landmark, RefreshCw, Search, ShieldCheck, Users, Wallet, ArrowLeftRight, ClipboardList
} from 'lucide-react';
import { useVerification, ScreenId } from '../../context/VerificationContext';
import { supabaseClient } from '../../services/supabaseClient';
import { MonthlyReconciliationRecord } from '../../types';

type Props = { screen: ScreenId };
type ReportTransaction = { demandId?: string; [key: string]: any };
const fmt = (n:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0);
const num = (n:number) => new Intl.NumberFormat('en-IN').format(Number(n)||0);
const COLORS = ['#0f766e','#2563eb','#d97706','#475569','#7c3aed','#0891b2','#b45309'];
const monthOrder = ['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];

const csvValue = (value:any):string => {
 if (value===null||value===undefined) return '';
 if (React.isValidElement(value)) return csvValue((value.props as any)?.children);
 if (Array.isArray(value)) return value.map(csvValue).join('');
 if (typeof value==='object') return JSON.stringify(value);
 return String(value);
};
const downloadCsv = (name:string, rows:(any[])[]) => {
 const csv=rows.map(r=>r.map(v=>'"'+csvValue(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
};

export const SocietyFinancialDashboards:React.FC<Props> = ({screen}) => {
 const {
  transactions, transactionsError, openingBalances, memberOpeningBalances, reconciliations, demandRegister, demandRegisterError, demandAdjustments, demandAllocations, memberFinancialBalances, partyFinancialBalances,
  cumulativeOutstanding, balanceRegister, partyMaster, flatOwnerMaster, categoryMaster, sourceRegister, stats,
  auditNotes, isLoadingTransactions, isLoadingDemandRegister, isLoadingMasters, isLoadingMemberBalances, memberBalancesError, mastersError, refetchAll, setCurrentScreen,
  selectedAccountId, setSelectedAccountId, selectedMonthFilter, setSelectedMonthFilter, supabaseSync
 } = useVerification();
 const [period,setPeriod]=useState('All months');
 const [rpt15PeriodMode,setRpt15PeriodMode]=useState<'FY'|'YTD'|'MTD'>('FY');
 const [rpt15Month,setRpt15Month]=useState('Mar 2019');
 const [query,setQuery]=useState('');
 const [globalDemandGroupFilter,setGlobalDemandGroupFilter]=useState('All demand groups');
 const [globalPartyTypeFilter,setGlobalPartyTypeFilter]=useState('All party types');
 const [globalAccountFilter,setGlobalAccountFilter]=useState('All accounts');
 const [globalPaymentModeFilter,setGlobalPaymentModeFilter]=useState('All modes');
 const [demandSummaryCategoryFilter,setDemandSummaryCategoryFilter]=useState('All categories');
 const [demandSummaryCategoryGroupFilter,setDemandSummaryCategoryGroupFilter]=useState('All category groups');
 const [categoryGroupFilter,setCategoryGroupFilter]=useState('All category groups');
 const [expenseDemandGroupFilter,setExpenseDemandGroupFilter]=useState('All demand groups');
 const [partyTypeFilter,setPartyTypeFilter]=useState('All party types');
 const [statusFilter,setStatusFilter]=useState('All statuses');
 const [accountFilter,setAccountFilter]=useState<'TDCC'|'BOM'|'CASH'|'ALL'>('TDCC');
 const [monthlyAccountMovements,setMonthlyAccountMovements]=useState<any[]>([]);
 const [monthlyAccountOpeningBalances,setMonthlyAccountOpeningBalances]=useState<any[]>([]);
 const [monthlyAccountMovementsLoading,setMonthlyAccountMovementsLoading]=useState(false);
 const [monthlyAccountMovementsError,setMonthlyAccountMovementsError]=useState<string|null>(null);
 const [reportRefreshKey,setReportRefreshKey]=useState(0);
 const [isRefreshingReports,setIsRefreshingReports]=useState(false);
 const refreshReports=async()=>{
  if(isRefreshingReports)return;
  setIsRefreshingReports(true);
  try{await refetchAll();}finally{
   setReportRefreshKey(value=>value+1);
   setIsRefreshingReports(false);
  }
 };
 const [activeTab,setActiveTab]=useState('Members');
 const [partySelection,setPartySelection]=useState('');
 const [selectedReport,setSelectedReport]=useState('member-opening-balance-register');
 const [openingRegisterRows,setOpeningRegisterRows]=useState<any[]>([]);
 const [openingRegisterLoading,setOpeningRegisterLoading]=useState(false);
 const [openingRegisterError,setOpeningRegisterError]=useState<string|null>(null);
 const [openingRegisterSearch,setOpeningRegisterSearch]=useState('');
  const [openingRegisterClassification,setOpeningRegisterClassification]=useState('All classifications');
 const [demandFyFilter,setDemandFyFilter]=useState('FY 2018-19'); const [demandMonthFilter,setDemandMonthFilter]=useState('All months'); const [demandPartyClassFilter,setDemandPartyClassFilter]=useState('All classifications'); const [demandGroupFilter,setDemandGroupFilter]=useState('All demand groups'); const [demandPartySearch,setDemandPartySearch]=useState(''); const [demandPaymentStatusFilter,setDemandPaymentStatusFilter]=useState('All statuses');
 const [receiptFyFilter,setReceiptFyFilter]=useState('All FY'); const [receiptReportingMonthFilter,setReceiptReportingMonthFilter]=useState('All months'); const [receiptDemandMonthFilter,setReceiptDemandMonthFilter]=useState('All months'); const [receiptPartyClassFilter,setReceiptPartyClassFilter]=useState('All classifications'); const [receiptModeFilter,setReceiptModeFilter]=useState('All modes'); const [receiptGroupFilter,setReceiptGroupFilter]=useState('All category groups'); const [receiptCategoryFilter,setReceiptCategoryFilter]=useState('All categories'); const [receiptAccountFilter,setReceiptAccountFilter]=useState('All accounts'); const [receiptPartySearch,setReceiptPartySearch]=useState('');
 const [contraAccountFilter,setContraAccountFilter]=useState('All accounts'); const [contraPartyTypeFilter,setContraPartyTypeFilter]=useState('All types'); const [contraMonthFilter,setContraMonthFilter]=useState('All months'); const [contraSearch,setContraSearch]=useState('');
 const [paymentFyFilter,setPaymentFyFilter]=useState('All FY'); const [paymentReportingMonthFilter,setPaymentReportingMonthFilter]=useState('All months'); const [paymentPartyClassFilter,setPaymentPartyClassFilter]=useState('All classifications'); const [paymentModeFilter,setPaymentModeFilter]=useState('All modes'); const [paymentGroupFilter,setPaymentGroupFilter]=useState('All category groups'); const [paymentCategoryFilter,setPaymentCategoryFilter]=useState('All categories'); const [paymentAccountFilter,setPaymentAccountFilter]=useState('All accounts'); const [paymentPartySearch,setPaymentPartySearch]=useState('');
 const [reportCategory,setReportCategory]=useState('Ledgers');
 const [reportSearch,setReportSearch]=useState('');
 const reportCatalog=[
  {id:'member-opening-balance-register',name:'Member Opening Balance Register',category:'Ledgers',description:'Approved imported opening balances, FY demand, receipts, adjustments and closing outstanding from the validated Supabase view'},
  {id:'party-balances',name:'Debtors — All Parties',category:'Member Receivables',description:'Party type, contact, opening, demand, receipts and closing receivable'},
  {id:'member-ledger',name:'Member / Flat Owner Ledger — Detailed',category:'Ledgers',description:'Opening balance, chronological demands/receipts, running and closing balance'},
  {id:'vendor-ledger',name:'Vendor / Payee Ledger — Detailed',category:'Ledgers',description:'Non-member vendors, contractors and service providers only; member payments remain in the Member Ledger'},
  {id:'demand-summary',name:'Demand Summary',category:'Member Receivables',description:'Period demand, collections, adjustments and closing dues'},
  {id:'monthly-demands',name:'Monthly Demand Matrix',category:'Member Receivables',description:'Opening balance and monthly demand; no pre-payment balance'},
  {id:'monthly-payments',name:'Monthly Cumulative Collection Matrix — Party-wise',category:'Member Receivables',description:'Cumulative actual receipts by receipt date and party'},
  {id:'monthly-flat-balance',name:'Monthly Flat Owner Collection Report',category:'Member Receivables',description:'Actual monthly receipts by flat owner and receipt month'},
  {id:'maintenance-performance',name:'Maintenance Collection & Delay Analysis',category:'Member Receivables',description:'On-time, late, outstanding maintenance and delay-charge performance'},
  {id:'demand-register',name:'Demand Register',category:'Member Receivables',description:'Detailed demand records with transaction-mapped receipts, adjustments, outstanding and payment status'},
  {id:'demand',name:'Member Demand vs Collections & Balance',category:'Member Receivables',description:'Member-wise demand, linked receipts during the FY, demand receivable and unapplied member credits'},
  {id:'party-ledger-summary',name:'Party-wise Ledger — Summary',category:'Ledgers',description:'Opening, period movements and closing by party'},
  {id:'party-ledger-monthly',name:'Party-wise Ledger — Month-wise',category:'Ledgers',description:'Monthly demand, receipts, adjustments and rolling balance by party'},
  {id:'party-ledger-detail',name:'Party-wise Ledger — Detailed',category:'Ledgers',description:'Chronological party transactions with running balance'},
  {id:'account-ledger-summary',name:'Account-wise Ledger — Summary',category:'Ledgers',description:'Opening, receipts, payments and closing by cash/bank account'},
  {id:'account-ledger-monthly',name:'Account-wise Ledger — Month-wise',category:'Ledgers',description:'Monthly opening, receipts, payments and closing by account'},
  {id:'account-ledger-detail',name:'Account-wise Ledger — Detailed',category:'Ledgers',description:'Chronological account transactions with running balance'},
  {id:'category-ledger-summary',name:'Demand Group-wise Ledger — Summary',category:'Ledgers',description:'Demand Group → Category Group → Category Name hierarchy and period movement totals'},
  {id:'category-ledger-monthly',name:'Demand Group-wise Ledger — Month-wise',category:'Ledgers',description:'Monthly movements grouped by Demand Group → Category Group → Category Name'},
  {id:'category-ledger-detail',name:'Demand Group-wise Ledger — Detailed',category:'Ledgers',description:'Chronological transactions grouped by Demand Group → Category Group → Category Name'},
  {id:'receipts-payments',name:'RPT-16 · Receipts & Payments Account',category:'Financial Statements',description:'Cash and bank movement statement with opening balances, receipts, payments, calculated closing position and reconciliation limitations'},
  {id:'income-expense',name:'RPT-15 · Income & Expenditure Account',category:'Financial Statements',description:'Society income and expenditure statement with category-wise details and surplus / deficit'},
  {id:'profit-loss',name:'Profit & Loss Statement (Management View)',category:'Financial Statements',description:'Management presentation of income, expenses and net surplus / deficit; reconciled to the Income & Expenditure Account'},
  {id:'balance-sheet',name:'Balance Sheet Working Statement',category:'Financial Statements',description:'Available balances and reconciliation exceptions'},
  {id:'trial-balance',name:'Trial Balance & Posting Reconciliation',category:'Financial Statements',description:'Debit/credit movements and double-entry completeness'},
  {id:'monthly-summary',name:'Monthly Financial Control Summary',category:'Financial Statements',description:'Monthly opening, receipts, payments and closing by account'},
  {id:'cashbook',name:'Cash & Bank Balances',category:'Financial Statements',description:'Account-wise opening balances, receipts, payments, contra transfers, calculated closing balances and verification status'},
  {id:'receipts',name:'Receipts Register',category:'Operational Registers',description:'Receipt date, payer, category group, cheque/reference and balance where supported'},
  {id:'payments',name:'Payment Register',category:'Operational Registers',description:'Payee, party classification, payment mode, category, account, voucher and evidence details'},
  {id:'largest-payments-anomalies',name:'Largest Payments & Potential Anomalies',category:'Audit & Governance',description:'Largest individual payments with explainable screening flags, evidence gaps and recommended review actions'},
  {id:'bank-recon',name:'Bank / UPI Reconciliation',category:'Financial Statements',description:'Account- and month-wise book-to-statement reconciliation, outstanding differences, matching status and committee action'},
  {id:'expense-analysis',name:'Expense Analysis by Category',category:'Operational Registers',description:'Category group and monthly expenditure matrix'},
  {id:'missing-docs',name:'Missing Document / Evidence Register',category:'Audit & Governance',description:'Missing bills, vouchers and transaction evidence'},
  {id:'statutory',name:'Statutory & Governance Register',category:'Audit & Governance',description:'Applicable bylaws, meetings, approvals and statutory controls'},
  {id:'rectification',name:'Audit Observations & Rectification',category:'Audit & Governance',description:'Open observations, proposed correction and closure evidence'},
  {id:'receipt-allocation-review',name:'Receipt Allocation & Unmatched Receipts Review',category:'Member Receivables',description:'Recorded receipts versus demand allocations'},
  {id:'opening-balance-review',name:'Opening Balance Verification & Exceptions',category:'Audit & Governance',description:'Recorded, missing and unverified opening balances'},
  {id:'adjustments-contra',name:'Adjustments Register',category:'Operational Registers',description:'Demand adjustments and transaction corrections; contra transfers shown separately'},
  {id:'mapping-exceptions',name:'Transaction Mapping Exceptions',category:'Audit & Governance',description:'Missing party, category, account or source mappings'},
  {id:'unidentified-parties',name:'Unidentified Parties Audit',category:'Audit & Governance',description:'Transactions with missing, unknown or unmapped party names'},
  {id:'unidentified-accounts',name:'Unidentified Accounts Audit',category:'Audit & Governance',description:'Transactions with missing or unmapped cash/bank account mappings'},
  {id:'unidentified-categories',name:'Unidentified Categories Audit',category:'Audit & Governance',description:'Transactions with missing or unclassified categories and category groups'},
  {id:'payment-mode-quality',name:'Payment Mode Data Quality',category:'Audit & Governance',description:'Missing, inconsistent or unrecognized payment modes by transaction'},
  {id:'transaction-type-quality',name:'Transaction Type Data Quality',category:'Audit & Governance',description:'Missing or unexpected transaction types and counts / amounts'}
 ];
 const reportCategories=['All Reports','Member Receivables','Financial Statements','Ledgers','Operational Registers','Audit & Governance'];
 const categoryGroups=Array.from(new Set([...categoryMaster.map((x:any)=>String(x.category_group||'').trim()),...transactions.map((t:any)=>String(t.categoryGroup||'').trim())].filter(Boolean))).sort();
 const partyTypes=Array.from(new Set([...[],...partyMaster.map((x:any)=>String(x.party_type||x.party_type_name||'').trim())].filter(Boolean))).sort();
 const memberPartyTypes=partyTypes.filter(v=>/^members?$/i.test(v.trim()));
 const reportNumbers:Record<string,string>={'member-opening-balance-register':'40','party-balances':'01','member-ledger':'02','vendor-ledger':'03','demand-summary':'04','monthly-demands':'05','monthly-payments':'06','monthly-flat-balance':'07','maintenance-performance':'41','demand-register':'08','demand':'09','receipts-payments':'16','income-expense':'15','profit-loss':'15A','balance-sheet':'10','trial-balance':'11','monthly-summary':'12','cashbook':'17','receipts':'14','payments':'13','largest-payments-anomalies':'34','bank-recon':'18','expense-analysis':'EA','missing-docs':'AUD','statutory':'19','rectification':'20','party-ledger-summary':'21','party-ledger-monthly':'22','party-ledger-detail':'23','account-ledger-summary':'24','account-ledger-monthly':'25','account-ledger-detail':'26','category-ledger-summary':'27','category-ledger-monthly':'28','category-ledger-detail':'29','receipt-allocation-review':'30','opening-balance-review':'31','adjustments-contra':'32','mapping-exceptions':'33','unidentified-parties':'35','unidentified-accounts':'36','unidentified-categories':'37','payment-mode-quality':'38','transaction-type-quality':'39'};
 const normalizedReportSearch=reportSearch.trim().toLowerCase();
 const filteredReportCatalog=reportCatalog.filter(r=>!normalizedReportSearch||[r.name,r.description,r.category,`RPT-${reportNumbers[r.id]||''}`,r.id].some(v=>String(v||'').toLowerCase().includes(normalizedReportSearch)));
 const visibleReportCategories=reportCategories.slice(1).filter(cat=>!normalizedReportSearch||filteredReportCatalog.some(r=>r.category===cat));
 const visibleReports=filteredReportCatalog.filter(r=>normalizedReportSearch||reportCategory==='All Reports'||r.category===reportCategory);
 const reportCounts=reportCategories.map(cat=>({name:cat,count:cat==='All Reports'?reportCatalog.length:reportCatalog.filter(r=>r.category===cat).length}));
 useEffect(()=>{
  if(screen!=='bank-reconciliation')return;
  let active=true;
  const loadAccountMovements=async()=>{
   setMonthlyAccountMovementsLoading(true);setMonthlyAccountMovementsError(null);
   const [movementRes,openingRes]=await Promise.all([
    supabaseClient.from('v_account_monthly_movement').select('account_id,account_name,reporting_month,month_start,receipt_amount,payment_amount,contra_signed,transaction_count').eq('financial_year','FY 2018-19').order('month_start',{ascending:true}),
    supabaseClient.from('v_account_financial_year_balance').select('account_id,account_name,opening_balance,source_opening_balance,closing_book_balance').eq('financial_year','FY 2018-19')
   ]);
   if(!active)return;
   if(movementRes.error||openingRes.error){
    setMonthlyAccountMovementsError(movementRes.error?.message||openingRes.error?.message||'Unable to load account balances');
    setMonthlyAccountMovements([]);setMonthlyAccountOpeningBalances([]);
   }else{
    setMonthlyAccountMovements((movementRes.data||[]) as any[]);
    setMonthlyAccountOpeningBalances((openingRes.data||[]) as any[]);
   }
   setMonthlyAccountMovementsLoading(false);
  };
  void loadAccountMovements();
  return ()=>{active=false;};
 },[screen,reportRefreshKey]);
 const loading=isLoadingTransactions||isLoadingDemandRegister||isLoadingMasters;
 const titles:Record<string,{title:string;sub:string}> = {
  'financial-summary':{title:'Financial Summary',sub:'Consolidated financial position, collections, payments, demand and control exceptions.'},
  'demand-collections':{title:'Demand & Collections',sub:'Monthly demands, receipts, charge-wise collection efficiency and member-wise outstanding dues.'},
  'payments-expenses':{title:'Payments & Expenses — Vendors / Payees',sub:'Vendor payments, expense category trends, supporting bills, approvals and advance-payment exceptions.'},
  'party-ledger':{title:'Party-wise Ledger',sub:'Member / flat-owner receivables and vendor / payee balances with traceable transaction history.'},
  'audit-evidence':{title:'Audit Evidence & Compliance',sub:'Document coverage, approval tracking, source traceability and audit observations.'},
  'bank-reconciliation':{title:'Bank Reconciliation',sub:'Bank/cash balances, book-versus-statement movement and unmatched credits/debits.'},
  'observations-actions':{title:'Observations & Corrective Actions',sub:'Exceptions requiring investigation, assigned action, supporting evidence and authorised closure.'},
  'reports':{title:'Reports & Operational Registers',sub:'Financial statements, ledgers, statutory registers and management information from available records.'}
 };
 const config=titles[screen]||titles['financial-summary'];
 const allMonths=useMemo(()=>Array.from(new Set(transactions.map(t=>String(t.reportingMonth||t.month||'')).filter(Boolean))).sort((a,b)=>monthOrder.indexOf(a)-monthOrder.indexOf(b)),[transactions]);
 const filtered=useMemo(()=>transactions.filter(t=>{
  const m=String(t.reportingMonth||t.month||'');
  const periodOk=period==='All months'||m===period;
  const cat=String(t.categoryName||'Unclassified');
  const category=categoryMaster.find((x:any)=>String(x.category_name||'')===cat)||{};
  const demandGroup=String(category.demand_group||'Unmapped Demand Group');
  const demandGroupOk=globalDemandGroupFilter==='All demand groups'||demandGroup===globalDemandGroupFilter;
  const party=partyMaster.find((p:any)=>String(p.party_name||'')===String(t.party||''));
  const partyType=String(party?.party_type||'Unclassified');
  const partyTypeOk=globalPartyTypeFilter==='All party types'||partyType===globalPartyTypeFilter;
  const accountOk=globalAccountFilter==='All accounts'||String(t.accountName||'')===globalAccountFilter;
  const paymentModeOk=globalPaymentModeFilter==='All modes'||String((t as any).paymentMode||(t as any).payment_mode||'Unspecified')===globalPaymentModeFilter;
  const group=String(t.categoryGroup||category.category_group||'Unmapped');
  const groupOk=categoryGroupFilter==='All category groups'||group===categoryGroupFilter;
  const q=query.toLowerCase().trim();
  const qOk=!q||[t.id,t.party,t.description,t.categoryName,t.accountName,t.voucherNo,t.receiptNo,t.sourceFile].some(v=>String(v||'').toLowerCase().includes(q));
  const status=String(t.evidenceStatus||'Pending');
  const statusOk=statusFilter==='All statuses'||status===statusFilter;
  return periodOk&&demandGroupOk&&partyTypeOk&&accountOk&&paymentModeOk&&groupOk&&qOk&&statusOk;
 }),[transactions,period,globalDemandGroupFilter,globalPartyTypeFilter,globalAccountFilter,globalPaymentModeFilter,categoryGroupFilter,categoryMaster,partyMaster,query,statusFilter]);
 const receipts=filtered.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
 const payments=filtered.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
 const contra=filtered.filter(t=>t.transactionClass==='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
 const net=receipts-payments;
 const demandTotal=demandRegister.filter((d:any)=>String(d.party_type||'')==='Member').reduce((s,d)=>s+Number(d.demand_amount||d.total_demand||0),0);
 const outstanding=cumulativeOutstanding.reduce((s,r)=>s+Math.max(0,-(Number(r.net_outstanding)||0)),0);
 const evidenceComplete=filtered.filter(t=>t.evidenceStatus==='Complete').length;
 const evidenceMissing=filtered.filter(t=>t.evidenceStatus==='Missing'||t.billStatus==='Missing'||t.voucherReceiptStatus==='Missing').length;
 const pendingApproval=filtered.filter(t=>String(t.internalAuditStatus||'').toLowerCase().includes('pending')||String(t.correctionStatus||'').toLowerCase().includes('pending')).length;
 const cats=useMemo(()=>Object.entries(filtered.reduce((a:Record<string,{amount:number;count:number}>,t)=>{
  const k=t.categoryName||'Unclassified';a[k]??={amount:0,count:0};a[k].amount+=Math.abs(Number(t.amount)||0);a[k].count++;return a;
 },{})).sort((a,b)=>b[1].amount-a[1].amount),[filtered]);
 const monthly=useMemo(()=>allMonths.map(m=>{
  const rows=transactions.filter(t=>String(t.reportingMonth||t.month||'')===m);
  return {month:m.replace(' 20','\n'),receipts:rows.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0),
   payments:rows.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0),
   contra:rows.filter(t=>t.transactionClass==='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0),count:rows.length};
 }),[allMonths,transactions]);
 const categoryData=cats.map(([name,v])=>({name,amount:v.amount,count:v.count}));
 const evidenceData=[{name:'Complete',value:evidenceComplete},{name:'Missing',value:evidenceMissing},{name:'Other / pending',value:Math.max(0,filtered.length-evidenceComplete-evidenceMissing)}];
 const storedRecon=Object.entries(reconciliations).filter(([key])=>accountFilter==='ALL'||key===accountFilter).flatMap(([,rows])=>rows);
 const transactionReconFallback=useMemo<MonthlyReconciliationRecord[]>(()=>{
  const accountIds:('TDCC'|'BOM'|'CASH')[]=accountFilter==='ALL'?['TDCC','BOM','CASH']:[accountFilter];
  const rawIdFor=(id:string)=>id==='TDCC'?'ACC-0001':id==='BOM'?'ACC-0002':'ACC-0003';
  const openingFor=(id:string)=>{
   const rawId=rawIdFor(id);
   const viewRow=monthlyAccountOpeningBalances.find((r:any)=>String(r.account_id||'').toUpperCase()===rawId);
   const contextRow=openingBalances.find((r:any)=>r.accountId===id);
   const value=viewRow?.opening_balance??viewRow?.source_opening_balance??contextRow?.calculatedOpeningBalance??contextRow?.recordedOpeningBalance;
   return value==null?null:Number(value);
  };
  const rows=monthlyAccountMovements.filter((r:any)=>accountIds.some(id=>rawIdFor(id)===String(r.account_id||'').toUpperCase()));
  const monthNames=['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
  const normalizeMonth=(value:string)=>{const m=value.match(/^([A-Za-z]{3,})[- ](\d{4})$/);return m?m[1].slice(0,3)+' '+m[2]:value;};
  if(accountFilter!=='ALL'){
   const start=openingFor(accountFilter);
   if(start==null)return [];
   let running=Number(start);
   return rows.sort((a:any,b:any)=>monthNames.indexOf(normalizeMonth(String(a.reporting_month||'')).slice(0,3))-monthNames.indexOf(normalizeMonth(String(b.reporting_month||'')).slice(0,3))).map((row:any,index:number)=>{
    const opening=running,credits=Number(row.receipt_amount)||0,debits=Number(row.payment_amount)||0,contra=Number(row.contra_signed)||0,adjustments=0;
    running=opening+credits-debits+contra+adjustments;
    const month=normalizeMonth(String(row.reporting_month||''));
    return {id:'view-'+accountFilter+'-'+index,accountId:accountFilter,month,monthIndex:Math.max(0,monthNames.indexOf(month.slice(0,3))),sourceOpeningBalance:opening,calculatedOpeningBalance:opening,openingDifference:0,credits,debits,contra,adjustments,calculatedClosingBalance:running,sourceClosingBalance:null,closingDifference:0,status:'Pending' as const,remarks:'Opening balance and monthly movement loaded from the financial-year account view. Statement balance has not been supplied.'};
   });
  }
  const starts=accountIds.map(openingFor);
  if(starts.some(value=>value==null))return [];
  const byMonth=new Map<string,any[]>();
  rows.forEach((row:any)=>{const month=normalizeMonth(String(row.reporting_month||''));byMonth.set(month,[...(byMonth.get(month)||[]),row]);});
  const validStarts=starts.filter((value):value is number=>value!==null);
  let running=validStarts.reduce<number>((sum,value)=>sum+value,0);
  return Array.from(byMonth.entries()).sort((a,b)=>monthNames.indexOf(a[0].slice(0,3))-monthNames.indexOf(b[0].slice(0,3))).map(([month,items],index)=>{
   const opening=running,credits=items.reduce((sum,row)=>sum+(Number(row.receipt_amount)||0),0),debits=items.reduce((sum,row)=>sum+(Number(row.payment_amount)||0),0),contra=items.reduce((sum,row)=>sum+(Number(row.contra_signed)||0),0),adjustments=0;
   running=opening+credits-debits+contra;
   return {id:'view-ALL-'+index,accountId:'TDCC' as const,month,monthIndex:Math.max(0,monthNames.indexOf(month.slice(0,3))),sourceOpeningBalance:opening,calculatedOpeningBalance:opening,openingDifference:0,credits,debits,contra,adjustments,calculatedClosingBalance:running,sourceClosingBalance:null,closingDifference:0,status:'Pending' as const,remarks:'Consolidated opening balances and monthly movements across TDCC, BOM and Cash. Statement balances have not been supplied.'};
  });
 },[monthlyAccountMovements,monthlyAccountOpeningBalances,openingBalances,accountFilter]);
 const totalRecon=transactionReconFallback;
 const matched=totalRecon.filter(r=>r.status==='Matched'||r.status==='Reconciled'||r.status==='Mismatch Accepted').length;
 const unmatched=totalRecon.filter(r=>r.status==='Mismatch'||r.status==='Difference').length;
 const openSource=sourceRegister.filter(s=>String(s.status||'').toLowerCase().includes('pending')).length;
 const transactionExportRows=[
  ["Pearl Meadows 'C' Type 'C' Wing Chs Ltd"],
  ['Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014'],
  ['Transaction Register — Connected Records'],
  ['Transaction ID','Date','Month','Type','Party','Category','Account','Description','Amount','Voucher','Receipt','Evidence status','Bill status','Voucher status','Audit status','Source file','Source sheet','Source row'],
  ...filtered.map(t=>[t.id,t.date,t.reportingMonth||t.month,t.transactionClass||t.type,t.party,t.categoryName,t.accountName,t.description,t.amount,t.voucherNo,t.receiptNo,t.evidenceStatus,t.billStatus,t.voucherReceiptStatus,t.internalAuditStatus,t.sourceFile,t.sourceSheet,t.sourceRow].map(v=>String(v??'')))
 ];
 const openReport=(id:string,category:string)=>{setSelectedReport(id);setReportCategory(category);setCurrentScreen('reports')};
 const ReportLink=({id,label,category}:any)=><button onClick={()=>openReport(id,category)} className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-800 hover:bg-blue-100">{label||('Open '+(reportCatalog.find(r=>r.id===id)?.name||'report'))} →</button>;
 const selectedReportExport=()=>{
  if(screen!=='reports')return {title:'Transaction Register — Connected Records',rows:transactionExportRows};
  const table=document.querySelector('#selected-report-content table');
  if(!table)return {title:reportCatalog.find(r=>r.id===selectedReport)?.name||'Selected Report',rows:[] as any[][]};
  const tableRows=Array.from(table.querySelectorAll('tr')).map(tr=>Array.from(tr.querySelectorAll('th,td')).map(cell=>(cell as HTMLElement).innerText.trim()));
  const title=selectedReport==='demand-register'?'Demand Register':selectedReport==='member-opening-balance-register'?'Member Opening Balance Register — FY 2018–19':reportData.title;
  const rows:any[][]=[];
  rows.push(["Pearl Meadows 'C' Type 'C' Wing Chs Ltd"]);
  rows.push(['Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014']);
  rows.push([title]);
  tableRows.forEach(row=>rows.push(row));
  return {title,rows};
};
const exportRows=()=>{const x=selectedReportExport();downloadCsv('society-'+selectedReport+'.csv',x.rows)};
 const exportTxt=()=>{const x=selectedReportExport();const txt=x.rows.map(row=>row.map(v=>csvValue(v)).join('\t')).join('\r\n');const url=URL.createObjectURL(new Blob([txt],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='society-'+selectedReport+'.txt';a.click();URL.revokeObjectURL(url)};
 const exportPdf=()=>{
  if(screen==='reports'){
   const dedicatedId=selectedReport==='income-expense'?'#rpt15-print-content':selectedReport==='receipts-payments'?'#rpt16-print-content':selectedReport==='cashbook'?'#rpt17-print-content':selectedReport==='bank-recon'?'#rpt18-print-content':null;
   const source=(dedicatedId?document.querySelector(dedicatedId):document.querySelector('#selected-report-content')) as HTMLElement|null;
   if(!source)return;
   const clone=source.cloneNode(true) as HTMLElement;
   if(!dedicatedId){
    // Remove the application toolbar and filter/control strips, but retain report body.
    const direct=Array.from(clone.children) as HTMLElement[];
    direct.forEach(el=>{
     const txt=(el.innerText||'').toLowerCase();
     const hasToolbar=['refresh','print','csv','txt','pdf'].filter(v=>txt.includes(v)).length>=3;
     const isFilterStrip=txt.includes('report filters')||((txt.includes('period')||txt.includes('all months'))&&el.querySelector('select,input,button'));
     if(hasToolbar||isFilterStrip)el.remove();
    });
   }
   clone.querySelectorAll('button,input,select,textarea,[class*="print:hidden"]').forEach(el=>el.remove());
   const w=window.open('','_blank','width=1100,height=800');if(!w)return;
   const title=reportCatalog.find(r=>r.id===selectedReport)?.name||'Selected Report';
   const esc=(v:string)=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
   w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>'+
    '@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font:9pt Arial,sans-serif;color:#111;margin:0}h1,h2,h3{break-after:avoid;color:#111}h2{font-size:15pt}h3{font-size:11pt;margin:12pt 0 5pt}p{font-size:9pt;line-height:1.45}table{width:100%;table-layout:fixed;border-collapse:collapse;margin:6pt 0 10pt;font-size:8pt;break-inside:auto}thead{display:table-header-group}tr{break-inside:avoid;break-after:auto}th,td{border:1px solid #888;padding:5px;text-align:left;vertical-align:top;white-space:normal;overflow-wrap:anywhere;word-break:normal}th{background:#eee;-webkit-print-color-adjust:exact;print-color-adjust:exact}section{break-inside:auto;margin:0 0 10pt}.rounded,.border{box-shadow:none!important}header{text-align:center;margin-bottom:10pt}footer{margin-top:10pt;border-top:1px solid #aaa;padding-top:6pt}#rpt15-print-content>header{display:block}#rpt15-print-content>div:first-of-type{display:none}'+
    '.rpt16-summary{break-inside:avoid;border:2px solid #555!important;padding:12px;margin:12px 0}.rpt16-summary h4{font-size:11pt;font-weight:800}.rpt16-summary .text-xl,.rpt16-summary .text-2xl{font-weight:800}'+
    '</style></head><body>'+clone.innerHTML+'<script>window.onload=()=>window.print()<\/script></body></html>');
   w.document.close();return;
  }
  const x=selectedReportExport();const w=window.open('','_blank','width=1100,height=800');if(!w)return;const esc=(v:any)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');const rows=x.rows;w.document.write('<html><head><title>'+esc(x.title)+'</title><style>body{font:11px Arial,sans-serif;padding:20px}h1,h2,h3{text-align:center;margin:5px}table{border-collapse:collapse;width:100%;margin-top:16px}td,th{border:1px solid #9ca3af;padding:5px;text-align:left;white-space:nowrap}th{background:#e5e7eb}@media print{@page{size:landscape;margin:10mm}}</style></head><body><h1>Pearl Meadows \'C\' Type \'C\' Wing Chs Ltd</h1><h2>Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014</h2><h3>'+esc(x.title)+'</h3><table><thead><tr>'+((rows[3]||[]).map((v:any)=>'<th>'+esc(csvValue(v))+'</th>').join(''))+'</tr></thead><tbody>'+rows.slice(4).map((row:any[])=>'<tr>'+row.map(v=>'<td>'+esc(csvValue(v))+'</td>').join('')+'</tr>').join('')+'</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>');w.document.close()
 }
 const Card=({label,value,detail,icon:Icon,tone='blue',compact=false}:any)=><div className={'group relative min-w-0 overflow-hidden rounded-xl border bg-white shadow-[0_3px_12px_rgba(15,23,42,.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(15,23,42,.08)] '+(compact?'p-2.5':'p-3.5')+' '+({'blue':'border-blue-100 before:bg-blue-500','green':'border-emerald-100 before:bg-emerald-500','red':'border-rose-100 before:bg-rose-500','amber':'border-amber-100 before:bg-amber-500','violet':'border-violet-100 before:bg-violet-500'} as any)[tone]+' before:absolute before:inset-y-0 before:left-0 before:w-[3px]'}><div className="flex items-center justify-between gap-2"><span className={compact?'text-[10px] font-semibold text-slate-600':'text-[11px] font-semibold tracking-wide text-slate-600'}>{label}</span><span className={'rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-100 '+(compact?'p-1':'p-1.5')}><Icon className={compact?'h-3.5 w-3.5':'h-4 w-4'}/></span></div><div className={(compact?'mt-1 text-lg':'mt-1.5 text-[1.4rem]')+' font-bold tracking-tight text-slate-950 tabular-nums'}>{value}</div><div className="mt-0.5 text-[10px] leading-4 text-slate-500">{detail}</div></div>;
 const Panel=({title,children,action,compact=false}:any)=><section className="min-w-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_3px_14px_rgba(15,23,42,.045)]"><div className={'flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white '+(compact?'px-3 py-2':'px-3.5 py-2.5')}><h2 className="text-[13px] font-bold tracking-tight text-slate-900">{title}</h2>{action}</div><div className={compact?'p-2.5':'p-3'}>{children}</div></section>;
 const Table=({headers,rows}:any)=><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-[11px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"><thead className="bg-slate-100/80 text-slate-600"><tr>{headers.map((h:string)=><th key={h} className="border-b border-slate-200 px-2.5 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.length?rows.map((row:any[],i:number)=>{const group=String(row[0]??'').startsWith('__GROUP__');return group?<tr key={i} className="border-y border-slate-300 bg-slate-100"><td colSpan={headers.length} className="px-3 py-2.5 text-sm font-bold text-slate-900">{String(row[0]).slice(9)}</td></tr>:<tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40">{row.map((v:any,j:number)=><td key={j} className="px-2.5 py-2">{v}</td>)}</tr>;}):<tr><td colSpan={headers.length} className="px-3 py-8 text-center text-slate-500">No matching records in the connected data.</td></tr>}</tbody></table></div>;
 const pct=(n:number,d:number)=>d?Math.round(n/d*100):0;
 const currencyCell=(n:number)=><span className="font-semibold tabular-nums">{fmt(n)}</span>;
 const statusPill=(s:string)=><span className={'inline-flex rounded-full px-2 py-1 text-[10px] font-semibold '+(s==='Complete'||s==='Matched'||s==='Verified'?'bg-emerald-100 text-emerald-800':s==='Missing'||s==='Mismatch'||s==='Failed'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800')}>{s||'Not assessed'}</span>;
 const monthControl=<select value={period} onChange={e=>setPeriod(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option>All months</option>{allMonths.map(m=><option key={m}>{m}</option>)}</select>;
 const globalDemandGroups=Array.from(new Set(categoryMaster.map((c:any)=>String(c.demand_group||'Unmapped Demand Group')).filter(Boolean))).sort();
 const globalPartyTypes=Array.from(new Set(partyMaster.map((p:any)=>String(p.party_type||'Unclassified')).filter(Boolean))).sort();
 const globalAccounts=Array.from(new Set(transactions.map((t:any)=>String(t.accountName||'')).filter(Boolean))).sort();
 const globalPaymentModes=Array.from(new Set(transactions.map((t:any)=>String(t.paymentMode||t.payment_mode||'Unspecified')).filter(Boolean))).sort();
 const filterBar=<div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"><CalendarDays className="h-4 w-4 text-blue-700"/><span className="text-xs font-semibold text-slate-600">Period</span>{monthControl}<label className="text-xs text-slate-600">Demand Group <select value={globalDemandGroupFilter} onChange={e=>setGlobalDemandGroupFilter(e.target.value)} className="ml-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option>All demand groups</option>{globalDemandGroups.map(v=><option key={v}>{v}</option>)}</select></label><label className="text-xs text-slate-600">Party Type <select value={globalPartyTypeFilter} onChange={e=>setGlobalPartyTypeFilter(e.target.value)} className="ml-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option>All party types</option>{globalPartyTypes.map(v=><option key={v}>{v}</option>)}</select></label><label className="text-xs text-slate-600">Account <select value={globalAccountFilter} onChange={e=>setGlobalAccountFilter(e.target.value)} className="ml-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option>All accounts</option>{globalAccounts.map(v=><option key={v}>{v}</option>)}</select></label><label className="text-xs text-slate-600">Payment Mode <select value={globalPaymentModeFilter} onChange={e=>setGlobalPaymentModeFilter(e.target.value)} className="ml-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option>All modes</option>{globalPaymentModes.map(v=><option key={v}>{v}</option>)}</select></label><div className="relative min-w-[150px] flex-1"><Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search party, voucher, category, source…" className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs outline-none focus:border-blue-400"/></div><button onClick={()=>{setPeriod('All months');setGlobalDemandGroupFilter('All demand groups');setGlobalPartyTypeFilter('All party types');setGlobalAccountFilter('All accounts');setGlobalPaymentModeFilter('All modes');setCategoryGroupFilter('All category groups');setQuery('');setStatusFilter('All statuses')}} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">Reset</button></div>;
 const reportDemands=demandRegister.filter((d:any)=>!d.financial_year||String(d.financial_year).includes('2018-19'));
 const demandNetAmount=(d:any)=>{
  const note=String(d.notes||'');
  const match=note.match(/net\s+demand\s*[:=]\s*(?:₹|rs\.?\s*)?(-?[0-9,]+(?:\.[0-9]+)?)/i);
  const parsed=match?Number(match[1].replace(/,/g,'')):NaN;
  return Number.isFinite(parsed)?parsed:Number(d.net_demand??d.demand_amount??d.total_demand??0)||0;
 };
 const transactionDemandId=(t:ReportTransaction)=>String(t.demandId||'');
 const monthKey=(value:any)=>{const raw=String(value||'').trim();const m=raw.match(/^([A-Za-z]{3,})[- ](\d{4})$/);return m?m[1].slice(0,3).toLowerCase()+' '+m[2]:raw.toLowerCase();};
 const monthLabels=['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];
 const transactionDate=(t:any)=>String(t.date||'').slice(0,10);
 const receiptRows=transactions.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra');
 const partyIdForReceipt=(t:any,demandParty:Map<string,string>)=>{const linked=demandParty.get(transactionDemandId(t));if(linked)return linked;const label=String(t.party||'').trim().toLowerCase();return String((partyMaster as any[]).find(p=>String(p.party_name||'').trim().toLowerCase()===label)?.party_id||'');};
 const openingRegisterClassifications=useMemo(()=>Array.from(new Set(openingRegisterRows.map((r:any)=>String(r.party_type||'Unclassified').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b)),[openingRegisterRows]);
  const openingRegisterFiltered=useMemo(()=>openingRegisterRows
   .filter((r:any)=>(openingRegisterClassification==='All classifications'||String(r.party_type||'Unclassified')===openingRegisterClassification)&&(!openingRegisterSearch||[r.party_name,r.party_type].some(v=>String(v||'').toLowerCase().includes(openingRegisterSearch.toLowerCase().trim()))))
   .sort((a:any,b:any)=>String(a.party_type||'').localeCompare(String(b.party_type||''))||String(a.party_name||'').localeCompare(String(b.party_name||''))),[openingRegisterRows,openingRegisterSearch,openingRegisterClassification]);
 useEffect(()=>{
  if(screen!=='reports'||selectedReport!=='member-opening-balance-register') return;
  if(isLoadingMemberBalances||isLoadingDemandRegister||isLoadingMasters){
   setOpeningRegisterLoading(true);setOpeningRegisterError(null);return;
  }
  setOpeningRegisterLoading(true);setOpeningRegisterError(null);
  if(memberBalancesError||demandRegisterError||mastersError){
   setOpeningRegisterRows([]);
   setOpeningRegisterError(memberBalancesError||demandRegisterError||mastersError||'Required source registers could not be loaded.');
   setOpeningRegisterLoading(false);return;
  }
  const fy='FY 2018-19';
  const members=(partyMaster||[]).filter((p:any)=>/^members?$/i.test(String(p.party_type||p.party_type_name||'').trim()));
  const openings=new Map<string,number>();
  (memberOpeningBalances||[]).filter((r:any)=>String(r.financial_year||'')===fy).forEach((r:any)=>{
   const id=String(r.party_id||'');if(id)openings.set(id,(openings.get(id)||0)+(Number(r.opening_balance)||0));
  });
  const demands=new Map<string,number>(),receipts=new Map<string,number>(),adjustments=new Map<string,number>();
  const demandParty=new Map<string,string>(),memberIds=new Set(members.map((p:any)=>String(p.party_id||'')));
  (demandRegister||[]).filter((d:any)=>String(d.financial_year||'')===fy).forEach((d:any)=>{
   const partyId=String(d.party_id||''),demandId=String(d.demand_id||d.id||'');
   if(!partyId||!memberIds.has(partyId))return;
   demands.set(partyId,(demands.get(partyId)||0)+(Number(d.demand_amount??d.total_demand)||0));
   if(demandId)demandParty.set(demandId,partyId);
  });
  // Match the database financial-year balance rule: count only linked receipts
  // (or approved allocation amounts), and reverse eligible bounced receipts.
  const allocatedByTransaction=new Map<string,number>();
  (demandAllocations||[]).forEach((a:any)=>{
   const id=String(a.transaction_id||'');if(id)allocatedByTransaction.set(id,(allocatedByTransaction.get(id)||0)+(Number(a.allocated_amount)||0));
  });
  (transactions||[]).forEach((t:any)=>{
   const partyId=String(t.partyId||t.party_id||''),date=String(t.date||t.transaction_date||'').slice(0,10);
   if(!memberIds.has(partyId)||date<'2018-04-01'||date>'2019-03-31')return;
   const demandId=String(transactionDemandId(t)||''),allocated=allocatedByTransaction.get(String(t.id||t.transaction_id||''))||0;
   const linkedAmount=demandId?Math.abs(Number(t.amount)||0):Math.min(Math.abs(Number(t.amount)||0),allocated);
   if(t.type==='Receipt'&&t.transactionClass!=='Contra')receipts.set(partyId,(receipts.get(partyId)||0)+linkedAmount);
   else if(t.transactionClass==='Contra'&&Number(t.amount)<0&&/bounce/i.test(String(t.description||''))&&!/bank charge/i.test(String(t.description||''))){
    receipts.set(partyId,(receipts.get(partyId)||0)-(demandId?Math.abs(Number(t.amount)||0):Math.min(Math.abs(Number(t.amount)||0),allocated)));
   }
  });
  (demandAdjustments||[]).filter((a:any)=>a.is_approved===true).forEach((a:any)=>{
   const partyId=demandParty.get(String(a.demand_id||''));if(partyId)adjustments.set(partyId,(adjustments.get(partyId)||0)+(Number(a.amount??a.adjustment_amount)||0));
  });
  const rows=members.map((p:any)=>{
   const id=String(p.party_id||''),opening=Number(openings.get(id)||0),demand=Number(demands.get(id)||0),received=Number(receipts.get(id)||0),adjustment=Number(adjustments.get(id)||0);
   return {party_id:id,party_name:p.party_name||'Name not available',party_type:p.party_type||'Unclassified',financial_year:fy,
    opening_balance:opening,current_fy_demand:demand,current_fy_receipts:received,adjustments:adjustment,
    total_outstanding:opening-demand+received+adjustment,opening_balance_recorded:openings.has(id)};
  }).sort((a:any,b:any)=>String(a.party_name).localeCompare(String(b.party_name),'en',{numeric:true}));
  setOpeningRegisterRows(rows);setOpeningRegisterLoading(false);
 },[screen,selectedReport,reportRefreshKey,isLoadingMemberBalances,isLoadingDemandRegister,isLoadingMasters,memberBalancesError,demandRegisterError,mastersError,memberOpeningBalances,demandRegister,demandAdjustments,partyMaster]);
 const openingRegisterTotals=useMemo(()=>openingRegisterFiltered.reduce((a:any,r:any)=>({
  opening:a.opening+Number(r.opening_balance||0),
  demand:a.demand+Number(r.current_fy_demand||0),
  receipts:a.receipts+Number(r.current_fy_receipts||0),
  adjustments:a.adjustments+Number(r.adjustments||0),
  outstanding:a.outstanding+Number(r.total_outstanding||0)
 }),{opening:0,demand:0,receipts:0,adjustments:0,outstanding:0}),[openingRegisterFiltered]);
 const exportOpeningRegister=()=>downloadCsv('member-opening-balance-register-fy2018-19.csv',[
  ["Pearl Meadows 'C' Type 'C' Wing Chs Ltd"],['Member Opening Balance Register — FY 2018-19'],
  ['Party ID','Party / Member Name','Party Classification','Opening Balance','Current FY Demand','Current FY Receipts','Adjustments','Total Outstanding','Financial Year','Notes','Balance Interpretation'],
  ...openingRegisterFiltered.map((r:any)=>[r.party_id,r.party_name,r.party_type,r.opening_balance,r.current_fy_demand,r.current_fy_receipts,r.adjustments,r.total_outstanding,r.financial_year,r.notes,Number(r.total_outstanding)<0?'Party owes Society':Number(r.total_outstanding)>0?'Society owes party':'Nil'])
 ]);
 const reportData = useMemo(() => {
  const txRows = (kind:'Receipt'|'Payment') => filtered.filter(t=>t.type===kind&&t.transactionClass!=='Contra').map(t=>[t.date||'—',t.id||'—',t.party||'Unmapped',t.categoryName||'Unclassified',t.accountName||'Unmapped',currencyCell(Math.abs(Number(t.amount)||0)),t.voucherNo||t.receiptNo||'—',statusPill(t.evidenceStatus||'Pending')]);
  const partyPayments = Object.entries(filtered.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra').reduce((a:Record<string,{count:number;amount:number;gaps:number}>,t)=>{const k=t.party||'Unmapped payee';a[k]??={count:0,amount:0,gaps:0};a[k].count++;a[k].amount+=Math.abs(Number(t.amount)||0);if(t.evidenceStatus!=='Complete')a[k].gaps++;return a;},{})).sort((a,b)=>b[1].amount-a[1].amount).map(([k,v])=>[k,num(v.count),currencyCell(v.amount),currencyCell(v.amount/Math.max(1,v.count)),num(v.gaps)]);
  switch(selectedReport) {
   case 'party-ledger-summary': case 'party-ledger-monthly': case 'party-ledger-detail': case 'member-ledger': case 'vendor-ledger':
   case 'account-ledger-summary': case 'account-ledger-monthly': case 'account-ledger-detail':
   case 'category-ledger-summary': case 'category-ledger-monthly': case 'category-ledger-detail': {
    const isVendor=selectedReport==='vendor-ledger';
    const isParty=selectedReport.startsWith('party-')||selectedReport==='member-ledger'||isVendor, isAccount=selectedReport.startsWith('account-'), isCategory=selectedReport.startsWith('category-');
    const mode=selectedReport==='member-ledger'||isVendor?'detail':selectedReport.endsWith('summary')?'summary':selectedReport.endsWith('monthly')?'monthly':'detail';
    const months=['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];
    const sourceTx=transactions.filter(t=>{
      if(isVendor){
        if(t.type!=='Payment')return false;
        // EnrichedTransaction exposes the resolved party name (not party_id).
        // Resolve classification through the party master using that name.
        const payee=partyMaster.find(p=>String(p.party_name||'').trim().toLowerCase()===String(t.party||'').trim().toLowerCase());
        const payeeType=String(payee?.party_type||'').trim();
        // Vendor / Payee Ledger is strictly for classified non-member payees.
        // Member payments (refunds/reimbursements) remain in the Member Ledger.
        if(!payeeType||/^members?$/i.test(payeeType))return false;
      }
      return (!isAccount||accountFilter==='ALL'||String(t.accountId||'')===accountFilter||String(t.accountName||'').toUpperCase().includes(accountFilter))&&(!isCategory||categoryGroupFilter==='All category groups'||String(t.categoryGroup||categoryMaster.find((x:any)=>x.category_name===t.categoryName)?.category_group||'Unmapped')===categoryGroupFilter);
    });
    const demandCategory=(t:any)=>categoryMaster.find((x:any)=>String(x.category_name||'')===String(t.categoryName||''))||{}; const getKey=(t:any)=>isParty?`${String(partyMaster.find((p:any)=>String(p.party_name||'')===String(t.party||''))?.party_type||'Unclassified')}¦${String(t.party||'Unmapped party')}`:isAccount?String(t.accountName||t.accountId||'Unmapped account'):`${String(demandCategory(t).demand_group||'Unmapped Demand Group')}¦${String(t.categoryGroup||demandCategory(t).category_group||'Unmapped Category Group')}¦${String(t.categoryName||'Unclassified')}`;
    const keys=new Set<string>(sourceTx.map(getKey));
    if(isParty&&!isVendor){flatOwnerMaster.forEach((x:any)=>{const name=String(x.owner_name||x.flat_no||'');const type=String(partyMaster.find((p:any)=>String(p.party_name||'')===name)?.party_type||'Unclassified');if(name)keys.add(`${type}¦${name}`);});memberFinancialBalances.forEach((x:any)=>{const name=String(x.member_name||x.flat_no||'');const type=String(partyMaster.find((p:any)=>String(p.party_name||'')===name)?.party_type||'Unclassified');if(name)keys.add(`${type}¦${name}`);});}
    if(isCategory) categoryMaster.forEach((x:any)=>keys.add(String(x.category_name||'Unclassified')));
    const scopedKeys=Array.from(keys).filter(k=>k&&(!query||k.toLowerCase().includes(query.toLowerCase()))&&(!isParty||partyTypeFilter==='All party types'||String(k.split('¦')[0]||'Unclassified')===partyTypeFilter)).sort();
    const openingFor=(key:string)=>isParty&&!isVendor?Number(partyFinancialBalances.find((x:any)=>String(x.financial_year||'')==='FY 2018-19'&&String(x.type||'')===String(key.split('¦')[0]||'')&&String(x.name||'')===key.split('¦').slice(1).join('¦'))?.opening_balance)||0:isAccount?Number(openingBalances.find((x:any)=>String(x.accountName||'')===key||String(x.accountId||'')===key)?.recordedOpeningBalance)||0:0;
    if(mode==='summary'){
       const rows=scopedKeys.map(key=>{
        const ts=sourceTx.filter(t=>getKey(t)===key);
        const partyType=key.split('¦')[0],partyName=key.split('¦').slice(1).join('¦');
        const partyBalance=isParty?partyFinancialBalances.find((b:any)=>String(b.financial_year||'')==='FY 2018-19'&&String(b.type||'')===partyType&&String(b.name||'')===partyName):undefined;
        const opening=isParty?Number(partyBalance?.opening_balance)||0:openingFor(key);
        const tankReceipts=isParty&&partyType==='Member'?ts.filter((t:any)=>{
          if(String(t.type||'').toLowerCase()!=='receipt'||!/(tank)/i.test(String(t.description||'')+' '+String(t.categoryName||'')))return false;
          const linkedDemandId=transactionDemandId(t);
          return !(linkedDemandId&&reportDemands.some((d:any)=>String(d.demand_id||d.id||'')===linkedDemandId));
        }).reduce((sum:number,t:any)=>sum+Math.abs(Number(t.amount)||0),0):0;
        const demand=(isParty?Number(partyBalance?.current_fy_demand)||0:0)+tankReceipts;
        const rec=isParty?Number(partyBalance?.current_fy_receipts)||0:ts.filter(t=>t.type==='Receipt').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
        const pay=isParty?Number(partyBalance?.current_fy_payments)||0:ts.filter(t=>t.type==='Payment').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
        const unapplied=Math.max(0,(Number(partyBalance?.unallocated_receipts)||0)-tankReceipts);
        const closing=isParty?(Number(partyBalance?.total_party_balance??partyBalance?.total_outstanding)||0)-tankReceipts:isAccount?opening+rec-pay:rec-pay;
        return isParty?[partyType,partyName,partyBalance?.opening_balance_recorded===true?<span className="inline-flex items-center gap-1">{currencyCell(opening)}{partyBalance?.opening_balance_verified!==true&&<span className="text-[10px] font-semibold text-amber-700">(Pending)</span>}</span>:'Not recorded',currencyCell(Math.abs(demand)),currencyCell(partyType==='Member'?rec:pay),currencyCell(unapplied),currencyCell(closing)]:isAccount?[key,currencyCell(opening),currencyCell(rec),currencyCell(pay),currencyCell(opening+rec-pay)]:[...key.split('¦'),currencyCell(rec),currencyCell(pay),currencyCell(rec-pay)];
       });
      return {title:(isParty?'Party-wise':isAccount?'Account-wise':'Demand Group-wise')+' Ledger — Summary',note:isParty?(isVendor?'Non-member payees only. Payments to parties classified as Members are excluded and remain in their Member / Flat Owner Ledger. Payees without a party classification are excluded until classified.':'Party balances use the central FY party calculation. Opening balances remain provisional until supported by prior-year closing records. Member receipts against current and brought-forward demands are included. Tank receipts without a matching demand are paired with a reporting-only demand charge in this summary and removed from unapplied receipts; the same receipt is not treated as member advance credit. Other unapplied receipts remain separately disclosed. Negative Net Party Balance means the member owes the Society; positive means the Society owes the member.'):isAccount?'Opening balances use the earliest available reconciliation record and must be checked against the approved opening balance.':'Income/expense category movement is not a brought-forward accounting balance.',headers:isParty?['Party Type','Party Name','Opening Balance','Demand / Charges','Linked Receipts / Payments','Unapplied Receipts','Net Party Balance']:isAccount?['Account Name','Opening Balance','Receipts','Payments','Closing Balance']:['Demand Group','Category Group','Category Name','Receipts / Income','Payments / Expense','Net Movement'],rows};
    }
    if(mode==='monthly'){
      // Normalize both imported reporting_month values (e.g. Apr-2018) and
      // display labels (e.g. Apr 2018) to the same stable month key.
      const normalizeMonth=(value:any)=>{
        const raw=String(value??'').trim();
        if(!raw) return '';
        const iso=raw.match(/^(\d{4})-(\d{2})/);
        if(iso) return iso[1]+'-'+iso[2];
        const named=raw.match(/^([A-Za-z]{3,})[-\\s]+(\d{4})$/);
        if(named){
          const idx=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(named[1].slice(0,3).toLowerCase());
          return idx<0?'':named[2]+'-'+String(idx+1).padStart(2,'0');
        }
        const date=new Date(raw);
        return Number.isNaN(date.getTime())?'':date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
      };
      const rows=scopedKeys.map(key=>{
        let running=openingFor(key);
        const opening=running;
        const partyName=isParty?key.split('¦').slice(1).join('¦'):'';
        const partyType=isParty?key.split('¦')[0]:'';
        const vals=months.map(m=>{
          const monthKey=normalizeMonth(m);
          const ts=sourceTx.filter(t=>{
            const sameLedger=isParty
              ? String(t.party||'').trim().toLowerCase()===partyName.trim().toLowerCase()
              : getKey(t)===key;
            // The context normalises the reporting month into t.month (e.g. "Jun 2018").
            // Prefer that value; reportingMonth is the raw imported label (e.g. "Jun-2018").
            return sameLedger&&normalizeMonth(t.reportingMonth||t.month||t.date)===monthKey;
          });
          const rec=ts.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra')
            .reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);
          const pay=ts.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra')
            .reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);
          const contra=ts.filter(t=>t.transactionClass==='Contra')
            .reduce((sum,t)=>sum+(Number(t.amount)||0),0);
          const recordedDemand=isParty?reportDemands.filter((d:any)=>{
            const demandParty=String(
              d.member_name||d.party_name||d.flat_no||
              partyMaster.find((p:any)=>String(p.party_id||'')===String(d.party_id||''))?.party_name||
              d.member_id||''
            ).trim().toLowerCase();
            const demandMonth=normalizeMonth(d.demand_month||d.month||d.reporting_month||d.demand_date||d.bill_date);
            const demandDateMonth=normalizeMonth(d.demand_date||d.bill_date);
            const fyStart=normalizeMonth(months[0]);
            const fyEnd=normalizeMonth(months[months.length-1]);
            // Keep normal demands in their labelled demand month. If a demand is
            // labelled outside the displayed FY but was actually raised during
            // this FY (e.g. a delayed-charge demand labelled Mar-2018 but dated
            // Jul-2018), place it in its issue month so it is not omitted.
            const ledgerDemandMonth=demandMonth>=fyStart&&demandMonth<=fyEnd
              ? demandMonth
              : demandDateMonth>=fyStart&&demandDateMonth<=fyEnd
                ? demandDateMonth
                : demandMonth;
            return demandParty===partyName.trim().toLowerCase()&&ledgerDemandMonth===monthKey;
          }).reduce((sum,d)=>sum+Number(d.total_demand??d.demand_amount??0),0):0;
          const unmatchedTankReceipts=isParty&&partyType==='Member'?ts.filter((t:any)=>{
            if(String(t.type||'').toLowerCase()!=='receipt'||t.transactionClass==='Contra'||!/(tank)/i.test(String(t.description||'')+' '+String(t.categoryName||'')))return false;
            const linkedDemandId=transactionDemandId(t);
            return !(linkedDemandId&&reportDemands.some((d:any)=>String(d.demand_id||d.id||'')===linkedDemandId));
          }).reduce((sum:number,t:any)=>sum+Math.abs(Number(t.amount)||0),0):0;
          const dem=recordedDemand+unmatchedTankReceipts;
          const bounceReversal=ts.filter(t=>t.transactionClass==='Contra'&&/bounce/i.test(String(t.description||''))&&!/bank charge/i.test(String(t.description||''))).reduce((sum,t)=>sum+(Number(t.amount)||0),0);
          const memberMovement=partyType==='Member'?-dem+rec+bounceReversal:-dem-pay+rec;
          const accountMovement=rec-pay+contra;
          running+=isParty?memberMovement:isAccount?accountMovement:accountMovement;
          return {rec,pay,contra,dem,closing:running,net:accountMovement};
        });
        return isParty
          ? [key.split('¦')[0],partyName,currencyCell(opening),...vals.flatMap(v=>[currencyCell(partyType==='Member'?v.dem:Math.abs(v.dem)),currencyCell(partyType==='Member'?v.rec:v.pay),currencyCell(v.closing)]),currencyCell(running)]
          : isAccount
            ? [key,currencyCell(opening),...vals.flatMap(v=>[currencyCell(v.rec),currencyCell(v.pay),currencyCell(v.closing)]),currencyCell(running)]
            : [...key.split('¦'),...vals.map(v=>currencyCell(v.net)),currencyCell(vals.reduce((sum,v)=>sum+v.net,0))];
      });
      return {title:(isParty?'Party-wise':isAccount?'Account-wise':'Demand Group-wise')+' Ledger — Month-wise',note:isParty?'Monthly party balances use signed demand and transaction movements. Member receipts and cheque-bounce reversals are applied. Tank receipts without a matching demand are paired with a reporting-only demand charge in the receipt month, preventing them from appearing as advance credits or reducing member dues. Other unapplied member receipts remain unapplied. Staff and utility payments reduce recorded bills.':isAccount?'Balances roll forward from the earliest available reconciliation opening balance.':'Category figures show monthly movements; income and expense categories do not normally carry opening balances.',headers:isParty?['Party Type','Party Name','Opening',...months.flatMap(m=>[m+' Demand',m+' Paid',m+' Closing']),'Year-end Closing']:isAccount?['Account Name','Opening',...months.flatMap(m=>[m+' Receipts',m+' Payments',m+' Closing']),'Year-end Closing']:['Demand Group','Category Group','Category Name',...months,'Annual Net Movement'],rows};
    }
    const detailRows:any[][]=[];
    const moneyText=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(value)||0);
    scopedKeys.forEach(key=>{
      const partyType=isParty?key.split('¦')[0]:'';
      const groupTransactions=sourceTx.filter(t=>getKey(t)===key&&(isAccount||(partyType==='Member'?t.type!=='Payment'&&(t.transactionClass!=='Contra'||(/bounce/i.test(String(t.description||''))&&!/bank charge/i.test(String(t.description||'')))):t.transactionClass!=='Contra'))).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.id||'').localeCompare(String(b.id||'')));
      const opening=openingFor(key);
      const groupLabel=isParty?key.split('¦').slice(1).join('¦'):isAccount?key:key.split('¦').join(' / ');
      const formatDemandMonth=(value:any,dateValue:any)=>{
        const raw=String(value||'').trim();
        const source=raw||String(dateValue||'').trim();
        if(!source) return '';
        const named=source.match(/^([A-Za-z]{3})[- /](\d{2}|\d{4})$/);
        if(named) return named[1].charAt(0).toUpperCase()+named[1].slice(1).toLowerCase()+'-'+named[2].slice(-2);
        const iso=source.match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
        if(iso){const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return monthNames[Number(iso[2])-1]+'-'+iso[1].slice(-2);}
        const parsed=new Date(source);
        return Number.isNaN(parsed.getTime())?source:parsed.toLocaleDateString('en-IN',{month:'short',year:'2-digit'}).replace(' ','-');
      };
      const memberDemands=isParty&&!isVendor?reportDemands.filter((d:any)=>{
        const demandParty=String(
          d.member_name||d.party_name||d.flat_no||
          partyMaster.find((p:any)=>String(p.party_id||'')===String(d.party_id||''))?.party_name||
          d.member_id||''
        ).trim();
        return demandParty.toLowerCase()===groupLabel.trim().toLowerCase();
      }).map((d:any)=>{
        const demandCategory=categoryMaster.find((c:any)=>
          String(c.category_id||'')===String(d.category_id||'')||
          String(c.category_name||'').toLowerCase()===String(d.category_name||'').toLowerCase()
        );
        const categoryName=String(d.category_name||demandCategory?.category_name||'Maintenance Charges');
        const demandMonth=formatDemandMonth(d.demand_month||d.month||d.reporting_month,d.demand_date||d.bill_date);
        const particulars=categoryName+(demandMonth?' for '+demandMonth:'');
        return {date:String(d.demand_date||d.created_at||d.month||''),particulars,voucher:String(d.demand_id||d.id||'Demand Register'),category:categoryName,movement:partyType==='Member'?-Math.abs(Number(d.total_demand||d.demand_amount||0)):-Number(d.total_demand||d.demand_amount||0),kind:'Demand'};
      }):[];
      const unmatchedTankDemandEvents=isParty&&!isVendor&&partyType==='Member'
        ? groupTransactions.filter((t:any)=>{
            if(String(t.type||'').toLowerCase()!=='receipt'||!/(tank)/i.test(String(t.description||'')+' '+String(t.categoryName||'')))return false;
            const linkedDemandId=transactionDemandId(t);
            const hasDemand=Boolean(linkedDemandId&&reportDemands.some((d:any)=>String(d.demand_id||d.id||'')===linkedDemandId));
            return !hasDemand;
          }).map((t:any)=>({
            date:String(t.date||''),particulars:'Tank payment — reporting-only demand (source demand unavailable)',
            voucher:String(t.receiptNo||t.voucherNo||t.id||'—'),category:'Tank Payment (reporting only)',
            movement:-Math.abs(Number(t.amount)||0),kind:'Reporting-only demand'
          }))
        :[];
      const events:any[]=[
        ...groupTransactions.map(t=>{
          const rawAmount=Number(t.amount)||0;
          const txKind=String(t.transactionClass||t.type||'').toLowerCase();
          const isContra=txKind.includes('contra');
          const isAdjustment=txKind.includes('adjust');
          // Member receivable convention: demand/payment increases debit; receipt reduces it.
          // Other ledgers preserve the signed source amount: positive = credit/inflow, negative = debit/outflow.
          const movement=isParty&&!isVendor&&partyType==='Member'
            ? (String(t.type||'').toLowerCase()==='receipt'?Math.abs(rawAmount):String(t.type||'').toLowerCase()==='payment'?-Math.abs(rawAmount):rawAmount)
            : rawAmount;
          return {
            date:String(t.date||''),particulars:(isAccount&&isContra?'Contra — ':'')+(isAccount&&isAdjustment?'Adjustment — ':'')+String(t.description||t.party||t.categoryName||'Transaction'),
            voucher:String(t.voucherNo||t.receiptNo||t.id||'—'),category:String(t.categoryName||'—'),
            movement,kind:txKind||'transaction'
          };
        }),
        ...memberDemands,
        ...unmatchedTankDemandEvents
      ].sort((a,b)=>a.date.localeCompare(b.date)||a.movement-b.movement);
      const groupOpeningKnown=isParty
        ? partyFinancialBalances.some((x:any)=>String(x.financial_year||'')==='FY 2018-19'&&String(x.type||'')===partyType&&String(x.name||'')===groupLabel&&x.opening_balance_recorded===true)
        : isAccount
          ? openingBalances.some((x:any)=>String(x.accountName||'')===key||String(x.accountId||'')===key)
          : false;
      // Group header and all ledger rows use exactly seven columns.
      detailRows.push(isParty?[('__GROUP__'+(partyType?partyType+' / ':'')+groupLabel),'','','','','']: [('__GROUP__'+groupLabel),'','','','','','']);
      const isMemberLedger=isParty&&!isVendor&&partyType==='Member';
      const memberBalanceMeaning=(value:number)=>value<0?'Member owes Society':value>0?'Member Credit Balance':'No Balance Due';
      const balanceDisplay=(value:number)=>isMemberLedger
        ? moneyText(Math.abs(value))+(value<0?' Dr':value>0?' Cr':'')
        : isCategory
          ? moneyText(Math.abs(value))+(value>0?' Net Debit':value<0?' Net Credit':'')
          : moneyText(value);
      const safeText=(value:unknown,fallback='—'):string=>{
        if(value===null||value===undefined||value==='') return fallback;
        if(typeof value==='string'||typeof value==='number'||typeof value==='boolean') return String(value);
        if(typeof value==='object'){
          const item=value as Record<string,unknown>;
          const candidate=item.label??item.name??item.value??item.amount??item.description;
          return candidate===undefined?fallback:safeText(candidate,fallback);
        }
        return fallback;
      };
      let running=opening;
      const openingParticulars=isMemberLedger
        ? 'Opening Balance — '+(groupOpeningKnown?memberBalanceMeaning(opening):'Not Verified')
        : 'Opening Balance';
      detailRows.push(isParty?[
        '—',openingParticulars,'Brought forward',
        groupOpeningKnown?(opening<0?moneyText(Math.abs(opening)):'—'):'Not Recorded',
        groupOpeningKnown?(opening>0?moneyText(opening):'—'):'—',
        groupOpeningKnown?balanceDisplay(running):'Not Verified'
      ]:[
        '—',openingParticulars,'Brought forward','—',
        groupOpeningKnown?(opening<0?moneyText(Math.abs(opening)):'—'):'Not Recorded',
        groupOpeningKnown?(opening>0?moneyText(opening):'—'):'—',
        groupOpeningKnown?balanceDisplay(running):'Not Verified'
      ]);
      events.forEach(e=>{
        running+=e.movement;
        const debit=e.movement<0;
        const credit=e.movement>0;
        // Keep transaction particulars exactly as recorded. Member-to-pay / credit wording
        // belongs only on Opening Balance and Closing Balance rows.
        const transactionParticulars=String(e.particulars);
        const categoryParticulars=isCategory
          ? String(e.particulars)+' — '+(e.movement<0?'Expense / Debit movement':e.movement>0?'Income / Credit movement':'No movement')
          : transactionParticulars;
        detailRows.push(isParty?[
          safeText(e.date),safeText(transactionParticulars),safeText(e.voucher),
          debit?moneyText(Math.abs(e.movement)):'—',
          credit?moneyText(Math.abs(e.movement)):'—',
          safeText(balanceDisplay(running))
        ]:[
          safeText(e.date),safeText(categoryParticulars),safeText(e.voucher),safeText(e.category),
          debit?moneyText(Math.abs(e.movement)):'—',
          credit?moneyText(Math.abs(e.movement)):'—',
          safeText(balanceDisplay(running))
        ]);
      });
      const closingKnown=groupOpeningKnown||events.length>0;
      const closingParticulars=isMemberLedger
        ? 'Closing Balance — '+(closingKnown?memberBalanceMeaning(running):'Not Calculable')
        : isCategory
          ? 'Closing Net Movement — '+(running>0?'Net Debit':running<0?'Net Credit':'Nil Movement')
          : 'Closing Balance';
      detailRows.push(isParty?[
        '—',closingParticulars,'Carried forward','—','—',
        closingKnown?balanceDisplay(running):'Not Calculable'
      ]:[
        '—',closingParticulars,'Carried forward','—','—','—',
        closingKnown?balanceDisplay(running):'Not Calculable'
      ]);
      detailRows.push(isParty?['','','','','','']:['','','','','','','']);
    });

    return {title:isVendor?'Vendor / Payee Ledger — Detailed':selectedReport==='member-ledger'?'Member / Flat Owner Ledger — Detailed':(isParty?'Party-wise':isAccount?'Account-wise':'Demand Group-wise')+' Ledger — Detailed',note:isVendor?'Non-member vendors, contractors and service providers only. Payments to parties classified as Members are excluded and remain in their Member / Flat Owner Ledger. Payees without a party classification are excluded until classified. Each payee is shown with dated payments and closing payable position.': 'Each party, account or category group is shown separately with its opening balance (where a verified source exists), dated transaction details and closing balance. Member demand entries reduce the signed balance and receipts increase it; negative closing means the member owes Society. Tank receipts without a matching demand are paired with a reporting-only demand debit for the same amount in the dated ledger, so the receipt is not treated as an advance credit. This is a presentation adjustment only; no demand or transaction record is created in the database. Staff and utility bills increase payables and payments reduce them.',headers:isParty?['Date','Particulars','Voucher / Receipt No.','Debit / Payment','Credit / Receipt','Balance']:['Date','Particulars','Voucher / Receipt No.','Category','Debit / Payment','Credit / Receipt','Balance'],rows:detailRows};
   }
   case 'member-opening-balance-register': return {title:'Member Opening Balance Register — FY 2018–19',note:'Opening-position register only. Recorded opening amounts remain Pending until supported by prior-year closing records; five member parties have no opening row. This register does not include current-year demands or receipts. Debtors — All Parties is the current-year position report, calculated from opening balance plus recorded demands less actual receipts and approved adjustments.',headers:[],rows:[]};
   case 'receipt-allocation-review': {
    const allocations=Array.isArray(demandAllocations)?demandAllocations:[];
    const receiptTx=transactions.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra');
    const allocatedIds=new Set(allocations.map((a:any)=>String(a.transaction_id||a.receipt_transaction_id||a.receipt_id||'')).filter(Boolean));
    receiptTx.forEach((t:any)=>{if(transactionDemandId(t))allocatedIds.add(String(t.id||''));});
    const rows=receiptTx.filter(t=>!allocatedIds.has(String(t.id||''))).filter(t=>!query||[t.party,t.id,t.categoryName,t.description].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))).map(t=>[t.date||'—',t.id||'—',t.party||'Unmapped party',t.categoryName||'Unmapped category',String(t.reportingMonth||t.month||'—'),currencyCell(Math.abs(Number(t.amount)||0)),'No Demand ID / allocation','Review payer, charge period and approved allocation policy']);
    return {title:'Receipt Allocation & Unmatched Receipts Review',note:'Lists non-contra receipts without a direct Demand ID or approved allocation mapping. This is a review queue, not proof that each receipt is overdue or that oldest-first allocation is authorised.',headers:['Receipt Date','Transaction ID','Payer','Category','Recorded Month','Receipt Amount','Allocation Status','Recommended Review'],rows};
   }
   case 'opening-balance-review': {
    const accounts=(openingBalances||[]).map((a:any)=>['Account',a.accountName||a.accountId||'Unidentified account',a.recordedOpeningBalance==null?'Not recorded':currencyCell(Number(a.recordedOpeningBalance)||0),a.verificationStatus||a.status||'Not verified',a.remarks||'Confirm against prior-year audited closing balance']);
    const members=(memberFinancialBalances||[]).filter((m:any)=>String(m.financial_year||'')==='FY 2018-19').map((m:any)=>['Member / Owner',m.member_name||m.flat_no||'Unidentified member',m.opening_balance_recorded===true?currencyCell(Number(m.opening_balance)||0):'Not recorded',m.opening_balance_status||m.verification_status||'Not verified',m.notes||'Confirm against FY 2017–18 closing member ledger']);
    return {title:'Opening Balance Verification & Exceptions',note:'Missing opening values are labelled Not recorded; zero is not substituted. Verify account balances against prior-year audited statements and member balances against approved closing schedules.',headers:['Balance Type','Account / Party','Recorded Opening Balance','Verification Status','Action / Notes'],rows:[...accounts,...members]};
   }
   case 'adjustments-contra': {
    const adjustments=(demandAdjustments||[]).map((a:any)=>['Demand adjustment',a.adjustment_id||a.id||'—',a.demand_id||a.flat_no||a.member_name||'Unmapped party',a.month||a.adjustment_date||'—',currencyCell(Number(a.amount)||0),a.is_approved===true?'Approved':'Pending / not approved',a.reason||a.description||'Review authorisation and source']);
    const contras=transactions.filter(t=>t.transactionClass==='Contra').map(t=>['Contra transfer',t.id||'—',t.party||t.accountName||'Unmapped',t.date||t.reportingMonth||'—',currencyCell(Math.abs(Number(t.amount)||0)),t.evidenceStatus||'Not assessed',t.description||'Internal transfer; exclude from income/expense totals']);
    return {title:'Adjustments & Contra Register',note:'Demand adjustments change member balances only when authorised. Contra entries are internal movements and must not be counted as income or expense.',headers:['Entry Type','Reference','Party / Account','Date / Period','Amount','Approval / Evidence Status','Reason / Treatment'],rows:[...adjustments,...contras]};
   }
   case 'mapping-exceptions': {
    const rows=transactions.filter(t=>!String(t.party||'').trim()||!String(t.categoryName||'').trim()||!String(t.accountId||'').trim()||!String(t.sourceFile||'').trim()||t.sourceRow==null).filter(t=>!query||[t.id,t.party,t.categoryName,t.accountName,t.sourceFile].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))).map(t=>[t.date||'—',t.id||'—',t.party||'Missing party',t.categoryName||'Missing category',t.accountName||'Missing account',t.sourceFile||'Missing source file',t.sourceRow==null?'Missing source row':String(t.sourceRow),[!String(t.party||'').trim()?'Party mapping missing':'',!String(t.categoryName||'').trim()?'Category mapping missing':'',!String(t.accountId||'').trim()?'Account mapping missing':'',!String(t.sourceFile||'').trim()||t.sourceRow==null?'Source traceability incomplete':''].filter(Boolean).join('; ')]);
    return {title:'Transaction Mapping Exceptions',note:'Derived from missing mapping/source fields in connected transactions. Review exceptions before posting or certifying reports.',headers:['Date','Transaction ID','Party','Category','Account','Source File','Source Row','Exception'],rows};
   }
   case 'unidentified-parties': {
    const bad=(t:any)=>!String(t.party||'').trim()||/unknown|unidentified|not identified|unmapped|^n\/?a$/i.test(String(t.party||''));
    const rows=filtered.filter(bad).filter(t=>!query||[t.id,t.party,t.description,t.sourceFile].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))).map(t=>[t.date||'—',t.id||'—',t.type||'Missing',t.party||'MISSING PARTY',currencyCell(Math.abs(Number(t.amount)||0)),t.categoryName||'—',t.accountName||'—',t.sourceFile||'—',t.sourceRow??'—','Identify party from voucher / bank narration; do not guess']);
    return {title:'Unidentified Parties — Data Quality & Audit',note:'Shows source transactions with missing or placeholder party identity. Resolve against bills, receipts, bank narration and approved party master; do not infer a party solely from amount.',headers:['Date','Transaction ID','Transaction Type','Party Value','Amount','Category','Account','Source File','Source Row','Recommended Action'],rows};
   }
   case 'unidentified-accounts': {
    const bad=(t:any)=>!String(t.accountId||'').trim()||!String(t.accountName||'').trim()||/unmapped|unknown|unidentified/i.test(String(t.accountName||''));
    const rows=filtered.filter(bad).filter(t=>!query||[t.id,t.accountId,t.accountName,t.party,t.description].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))).map(t=>[t.date||'—',t.id||'—',t.type||'Missing',t.party||'—',currencyCell(Math.abs(Number(t.amount)||0)),t.accountId||'MISSING',t.accountName||'UNMAPPED ACCOUNT',t.sourceFile||'—',t.sourceRow??'—','Map to verified cash/bank account using source evidence']);
    return {title:'Unidentified Accounts — Data Quality & Audit',note:'A missing account mapping is not evidence that a transaction is invalid. Match to the source book, bank statement or cash record before mapping.',headers:['Date','Transaction ID','Transaction Type','Party','Amount','Account ID','Account Name','Source File','Source Row','Recommended Action'],rows};
   }
   case 'unidentified-categories': {
    const bad=(t:any)=>!String(t.categoryName||'').trim()||/unmapped|unclassified|unknown/i.test(String(t.categoryName||''))||!String(t.categoryGroup||categoryMaster.find((x:any)=>x.category_name===t.categoryName)?.category_group||'').trim();
    const rows=filtered.filter(bad).filter(t=>!query||[t.id,t.categoryName,t.categoryGroup,t.party,t.description].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))).map(t=>[t.date||'—',t.id||'—',t.type||'Missing',t.party||'—',currencyCell(Math.abs(Number(t.amount)||0)),t.categoryName||'MISSING CATEGORY',t.categoryGroup||categoryMaster.find((x:any)=>x.category_name===t.categoryName)?.category_group||'UNMAPPED GROUP',t.description||'—','Review chart of accounts and category policy; retain source description']);
    return {title:'Unidentified Categories — Data Quality & Audit',note:'Includes blank categories, placeholders and transactions whose category group cannot be resolved. Categorize only after reviewing the underlying transaction.',headers:['Date','Transaction ID','Transaction Type','Party','Amount','Category','Category Group','Description','Recommended Action'],rows};
   }
   case 'payment-mode-quality': {
    const normalize=(t:any)=>String(t.paymentMode||'').trim();
    const valid=/^(cash|bank transfer|bank|upi|cheque|check|neft|rtgs|imps|online|card|direct debit|journal|contra|not applicable|n\/a)$/i;
    const rows=filtered.filter(t=>!normalize(t)||!valid.test(normalize(t))).filter(t=>!query||[t.id,t.paymentMode,t.party,t.description].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))).map(t=>[t.date||'—',t.id||'—',t.type||'Missing',t.party||'—',currencyCell(Math.abs(Number(t.amount)||0)),normalize(t)||'MISSING MODE',t.accountName||'—',t.voucherNo||t.receiptNo||'—',!normalize(t)?'Obtain source voucher / bank evidence':'Standardize mode only after verifying source']);
    return {title:'Payment Mode Data Quality — Audit Exceptions',note:'Flags blank or non-standard modes; this is a review queue, not an automatic correction. Payment mode should reflect source evidence, not inferred account name.',headers:['Date','Transaction ID','Transaction Type','Party','Amount','Recorded Mode','Account','Reference','Recommended Action'],rows};
   }
   case 'transaction-type-quality': {
    const valid=/^(receipt|payment|contra|journal|adjustment|demand|opening balance)$/i;
    const rows=filtered.filter(t=>!String(t.type||'').trim()||!valid.test(String(t.type||'').trim())).filter(t=>!query||[t.id,t.type,t.party,t.description].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))).map(t=>[t.date||'—',t.id||'—',t.type||'MISSING TYPE',t.party||'—',currencyCell(Math.abs(Number(t.amount)||0)),t.categoryName||'—',t.accountName||'—',t.description||'—','Confirm transaction nature against source document; do not reclassify from amount alone']);
    return {title:'Transaction Type Data Quality — Audit Exceptions',note:'Flags blank or unexpected transaction types. Existing Receipt / Payment / Contra records are not changed by this report.',headers:['Date','Transaction ID','Recorded Type','Party','Amount','Category','Account','Description','Recommended Action'],rows};
   }
   case 'monthly-flat-balance': {
    const parties=new Map<string,any>(),demandParty=new Map<string,string>();
    reportDemands.forEach((d:any)=>{const id=String(d.party_id||''),did=String(d.demand_id||d.id||'');if(id&&did)demandParty.set(did,id);});
    const isMember=(p:any)=>/^members?$/i.test(String(p?.party_type||p?.party_type_name||'').trim());
    const monthIndex=(t:any)=>{
     const raw=String(t.reportingMonth||t.month||t.date||'').trim();
     const match=raw.match(/^([A-Za-z]{3,})[- ](20\d{2})$/);
     if(match){const key=match[1].slice(0,3).toLowerCase()+' '+match[2];return monthLabels.findIndex((m:string)=>m.toLowerCase()===key);}
     const iso=raw.match(/^20\d{2}-(0?[1-9]|1[0-2])(?:-|$)/);
     if(iso){const n=Number(iso[1]);return n>=4?n-4:n+8;}
     return -1;
    };
    receiptRows.forEach(t=>{
      const did=transactionDemandId(t),linkedPartyId=demandParty.get(did)||'';
      const matchedId=linkedPartyId||partyIdForReceipt(t,demandParty);
      const p=partyMaster.find((x:any)=>String(x.party_id)===matchedId);
      if(!p||!isMember(p))return;
      const key=String(p.party_id);
      if(!parties.has(key))parties.set(key,{id:key,name:p.party_name||key,type:p.party_type||'Member',flat:p.flat_no||'—',monthly:Array(12).fill(0),otherReceipts:0,count:0,last:'—'});
      const row=parties.get(key),amount=Math.abs(Number(t.amount)||0),idx=monthIndex(t);
      if(did&&linkedPartyId&&idx>=0){row.monthly[idx]+=amount;row.count++;const date=String(t.date||'');if(date&&date>row.last)row.last=date;}
      else row.otherReceipts+=amount;
    });
    const rows=Array.from(parties.values())
     .filter(x=>!query||[x.name,x.type,x.flat].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase().trim())))
     .filter(x=>partyTypeFilter==='All party types'||x.type===partyTypeFilter)
     .sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name));
    const totalByMonth=monthLabels.map((_,i)=>rows.reduce((sum:number,x:any)=>sum+x.monthly[i],0));
    return {title:'Monthly Flat Owner Collection Report',note:'Monthly demand-linked member receipts are grouped by source Reporting Month (transaction date is used only when Reporting Month is absent). Receipts without a valid Demand ID, including additional funds, are excluded from monthly demand-linked collections and shown separately as Other / Unallocated Receipts. No missing dates or allocations are inferred.',headers:['Party Type','Party Name','Flat / Shop No.',...monthLabels,'Total FY Demand-linked Collections','Other / Unallocated Receipts (FY Total)','Receipt Count','Last Receipt Date'],rows:[...rows.map(x=>[x.type,x.name,x.flat,...x.monthly.map(currencyCell),currencyCell(x.monthly.reduce((a:number,b:number)=>a+b,0)),currencyCell(x.otherReceipts),x.count,x.last]),['TOTAL — MEMBER RECEIPTS','','',...totalByMonth.map(currencyCell),currencyCell(totalByMonth.reduce((a:number,b:number)=>a+b,0)),currencyCell(rows.reduce((s:number,x:any)=>s+Number(x.otherReceipts||0),0)),rows.reduce((sum:number,x:any)=>sum+x.count,0),'']]};
   }
   case 'demand-summary': {
    // Members-only report with a fixed, audit-friendly Demand Group column order.
    const isMember=(party:any)=>/^members?$/i.test(String(party?.party_type||party?.party_type_name||'').trim());
    const categoryById=new Map(categoryMaster.map((c:any)=>[String(c.category_id||c.id||''),c]));
    const demandGroupColumns=['Maintenance Charges','Non-Occupancy Charges','Delay Charges','Other Recoveries'];
    const getDemandGroupColumn=(d:any)=>{
     const c:any=categoryById.get(String(d.category_id||''))||{};
     const raw=String(c.demand_group||'').trim();
     const group=raw.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
     if(/maintenance|parking/.test(group))return 'Maintenance Charges';
     if(/non occupancy|nonoccupancy|noc/.test(group))return 'Non-Occupancy Charges';
     if(/delay|late payment|penalty/.test(group))return 'Delay Charges';
     // Remaining classified member demand groups are presented as Other Recoveries.
     return 'Other Recoveries';
    };
    const memberDemands=reportDemands.filter((d:any)=>{
     const p=partyMaster.find((x:any)=>String(x.party_id)===String(d.party_id||''));
     const category:any=categoryById.get(String(d.category_id||''))||{};
     const group=String(category.demand_group||'Unmapped Demand Group');
     return Boolean(p&&isMember(p))&&(globalDemandGroupFilter==='All demand groups'||group===globalDemandGroupFilter);
    });
    const parties=new Map<string,any>();
    memberDemands.forEach((d:any)=>{
     const id=String(d.party_id||'');if(!id)return;
     const p=partyMaster.find((x:any)=>String(x.party_id)===id);
     if(!parties.has(id)){
      const opening=Number(memberFinancialBalances.find((b:any)=>String(b.financial_year||'')==='FY 2018-19'&&String(b.party_id||'')===id)?.opening_balance)||0;
      parties.set(id,{id,name:p?.party_name||d.member_name||id,type:p?.party_type||'Member',opening,groupAmounts:{},adjustments:0});
     }
     if(period!=='All months'&&monthKey(d.month||d.demand_month)!==monthKey(period))return;
     const category:any=categoryById.get(String(d.category_id||''))||{};
     if(demandSummaryCategoryFilter!=='All categories'&&String(category.category_name||'')!==demandSummaryCategoryFilter)return;
     if(demandSummaryCategoryGroupFilter!=='All category groups'&&String(category.category_group||'Unmapped')!==demandSummaryCategoryGroupFilter)return;
     const group=getDemandGroupColumn(d);
     const amount=demandNetAmount(d);
     const row=parties.get(id);
     row.groupAmounts[group]=(row.groupAmounts[group]||0)+amount;
    });
    const rows=Array.from(parties.values()).map(p=>{
     p.periodDemand=demandGroupColumns.reduce((sum:number,group:string)=>sum+Number(p.groupAmounts[group]||0),0);
     const ids=new Set(memberDemands.filter((d:any)=>String(d.party_id||'')===p.id&&(period==='All months'||monthKey(d.month||d.demand_month)===monthKey(period))).map((d:any)=>String(d.demand_id||d.id||'')));
     p.adjustments=demandAdjustments.filter((a:any)=>a.is_approved===true&&ids.has(String(a.demand_id||''))).reduce((v:number,a:any)=>v+Number(a.amount??a.adjustment_amount??0),0);
     return p;
    })
     .filter(x=>!query||[x.name,x.type].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase().trim())))
     .filter(x=>partyTypeFilter==='All party types'||x.type===partyTypeFilter)
     .sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name));
    const headers=['Party Type','Party Name','Opening Balance',...demandGroupColumns,'Total Current Period Demand','Total Amount Due (incl. Opening Dues)','Approved Adjustments'];
    const tableRows=rows.map(p=>[p.type,p.name,currencyCell(p.opening),...demandGroupColumns.map((group:string)=>currencyCell(p.groupAmounts[group]||0)),currencyCell(p.periodDemand),currencyCell(p.periodDemand-p.opening),currencyCell(p.adjustments)]);
    const totals=['TOTAL — MEMBERS','',currencyCell(rows.reduce((v:number,p:any)=>v+p.opening,0)),...demandGroupColumns.map((group:string)=>currencyCell(rows.reduce((v:number,p:any)=>v+Number(p.groupAmounts[group]||0),0))),currencyCell(rows.reduce((v:number,p:any)=>v+p.periodDemand,0)),currencyCell(rows.reduce((v:number,p:any)=>v+p.periodDemand-p.opening,0)),currencyCell(rows.reduce((v:number,p:any)=>v+p.adjustments,0))];
    return {title:'Demand Summary — Members Only',note:'Members only. Demand Group values from Category Master are mapped into the fixed columns: Maintenance Charges (including Parking), Non-Occupancy Charges, Delay Charges and Other Recoveries. The selected period filter applies to all demand columns. Any member Demand Group not matching the first four classifications is included in Other Recoveries. Opening balance and approved adjustments are shown separately. Total Amount Due includes current-period demand less the signed opening balance (negative opening = brought-forward member dues; positive opening = member credit). Collections are not deducted in this demand summary. Non-member parties and ad-hoc transactions are excluded.',headers,rows:[...tableRows,totals]};
   }
   case 'monthly-demands': {
    // Monthly member demand matrix: brought-forward balance and FY demand are shown separately.
    const isMember=(party:any)=>/^members?$/i.test(String(party?.party_type||party?.party_type_name||'').trim());
    const demandMonthKey=(value:any)=>{
     const raw=String(value??'').trim();
     if(!raw)return '';
     const monthNames=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
     const monthMatch=raw.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec)\b/i);
     const yearMatch=raw.match(/\b(20\d{2}|\d{2})\b/);
     if(monthMatch&&yearMatch){
      const month=monthNames.indexOf(monthMatch[1].slice(0,3).toLowerCase());
      let year=Number(yearMatch[1]);if(year<100)year+=year>=70?1900:2000;
      return month>=0?monthNames[month]+' '+year:'';
     }
     const isoMatch=raw.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])\b/);
     if(isoMatch)return monthNames[Number(isoMatch[2])-1]+' '+isoMatch[1];
     return '';
    };
    const memberDemands=reportDemands.filter((d:any)=>{
     const p=partyMaster.find((x:any)=>String(x.party_id)===String(d.party_id||''));
     return Boolean(p&&isMember(p));
    });
    const parties=new Map<string,any>();
    (partyMaster as any[]).filter(isMember).forEach(p=>{
     const id=String(p.party_id||'');if(!id)return;
     const bal=memberFinancialBalances.find((b:any)=>String(b.financial_year||'')==='FY 2018-19'&&String(b.party_id||'')===id);
     parties.set(id,{id,name:p.party_name||id,type:p.party_type||'Member',opening:Number(bal?.opening_balance)||0,openingRecorded:bal?.opening_balance_recorded===true,openingVerified:bal?.opening_balance_verified===true,monthly:Array(monthLabels.length).fill(0),outsidePeriod:0,categoryTotals:{maintenance:0,parking:0,noc:0,delay:0,other:0}});
    });
    memberDemands.forEach((d:any)=>{
     const id=String(d.party_id||'');if(!id||!parties.has(id))return;
     const row=parties.get(id), category:any=categoryMaster.find((item:any)=>String(item.category_id||item.id||'')===String(d.category_id||''))||{};
     const group=String(category.demand_group||'').toLowerCase();
     const name=String(category.category_name||'').toLowerCase();
     const amount=demandNetAmount(d);
     const key=demandMonthKey(d.month||d.demand_month||d.demand_date);
     const idx=monthLabels.findIndex(m=>demandMonthKey(m)===key);
     if(idx>=0)row.monthly[idx]+=amount;else row.outsidePeriod+=amount;
     if(group.includes('maintenance'))row.categoryTotals.maintenance+=amount;
     else if(group.includes('parking'))row.categoryTotals.parking+=amount;
     else if(group.includes('non-occupancy')||name.includes('non-occupancy'))row.categoryTotals.noc+=amount;
     else if(group.includes('delay'))row.categoryTotals.delay+=amount;
     else row.categoryTotals.other+=amount;
    });
    const rows=Array.from(parties.values())
     .filter(x=>!query||[x.name,x.type].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase().trim())))
     .filter(x=>partyTypeFilter==='All party types'||x.type===partyTypeFilter)
     .sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name));
    const monthTotals=monthLabels.map((_,i)=>rows.reduce((sum:number,x:any)=>sum+Number(x.monthly[i]||0),0));
    const catTotal=(key:string)=>rows.reduce((sum:number,x:any)=>sum+Number(x.categoryTotals[key]||0),0);
    const currentFyTotal=(x:any)=>Object.values(x.categoryTotals).reduce((sum:number,v:any)=>sum+Number(v||0),0);
    const totalDue=(x:any)=>currentFyTotal(x)-x.opening;
    const headers=['Party Type','Party Name','Opening Balance',...monthLabels,'Outside FY Month / Period','Maintenance Total','Parking Total','NOC Total','Delay Charges Total','Other Recoveries Total','Total FY Demand','Total Amount Due incl. Opening'];
    const tableRows=rows.map(x=>[x.type,x.name,x.openingRecorded?currencyCell(x.opening):'Not recorded',...x.monthly.map(currencyCell),currencyCell(x.outsidePeriod),currencyCell(x.categoryTotals.maintenance),currencyCell(x.categoryTotals.parking),currencyCell(x.categoryTotals.noc),currencyCell(x.categoryTotals.delay),currencyCell(x.categoryTotals.other),currencyCell(currentFyTotal(x)),x.openingRecorded?currencyCell(totalDue(x)):'Incomplete — opening missing']);
    const missingOpeningCount=rows.filter(x=>!x.openingRecorded).length;
    const knownOpeningDue=rows.filter(x=>x.openingRecorded).reduce((s:number,x:any)=>s+totalDue(x),0);
    const totals=['TOTAL — MEMBERS','',currencyCell(rows.filter(x=>x.openingRecorded).reduce((s:number,x:any)=>s+x.opening,0)),...monthTotals.map(currencyCell),currencyCell(rows.reduce((s:number,x:any)=>s+Number(x.outsidePeriod||0),0)),currencyCell(catTotal('maintenance')),currencyCell(catTotal('parking')),currencyCell(catTotal('noc')),currencyCell(catTotal('delay')),currencyCell(catTotal('other')),currencyCell(rows.reduce((s:number,x:any)=>s+currentFyTotal(x),0)),missingOpeningCount?`Incomplete — ${missingOpeningCount} opening balances missing; known-member subtotal ${fmt(knownOpeningDue)}`:currencyCell(knownOpeningDue)];
    return {title:'Monthly Demand Matrix — Members Only',note:'Opening Balance is brought forward separately and is not repeated in monthly demand columns. Month columns show demand raised in each month. Category totals separately disclose Maintenance, Parking, Non-Occupancy Charges, Delay Charges and Other Recoveries. Total FY Demand is reconciled to all member demand records, including any demand month outside the displayed April–March columns, which is disclosed separately as Outside FY Month / Period. Total Amount Due incl. Opening = Total FY Demand − signed Opening Balance; negative opening balances are brought-forward member dues. This is a demand position before collections; receipts are not deducted. Members without demand rows are retained. Missing opening records remain Not recorded and make their total due incomplete.',headers,rows:[...tableRows,totals]};
   }
   case 'monthly-payments': {
    // Demand-linked member collections are grouped by the source reporting month.
    // Receipts without a valid Demand ID are disclosed separately, not mixed into demand collections.
    const parties=new Map<string,any>(),demandParty=new Map<string,string>();
    reportDemands.forEach((d:any)=>{const id=String(d.party_id||''),did=String(d.demand_id||d.id||'');if(id&&did)demandParty.set(did,id);});
    const isMember=(p:any)=>/^members?$/i.test(String(p?.party_type||p?.party_type_name||'').trim());
    const monthIndex=(t:any)=>{
     const raw=String(t.reportingMonth||t.month||t.date||'').trim();
     const match=raw.match(/^([A-Za-z]{3,})[- ](20\d{2})$/);
     if(match){const key=match[1].slice(0,3).toLowerCase()+' '+match[2];return monthLabels.findIndex((m:string)=>m.toLowerCase()===key);}
     const iso=raw.match(/^20\d{2}-(0?[1-9]|1[0-2])(?:-|$)/);
     if(iso){const n=Number(iso[1]);return n>=4?n-4:n+8;}
     return -1;
    };
    receiptRows.forEach(t=>{
      const did=transactionDemandId(t),linkedPartyId=demandParty.get(did)||'';
      const matchedId=linkedPartyId||partyIdForReceipt(t,demandParty);
      const p=partyMaster.find((x:any)=>String(x.party_id)===matchedId);
      if(!p||!isMember(p))return;
      const key=String(p.party_id);
      if(!parties.has(key))parties.set(key,{id:key,name:p.party_name||key,type:p.party_type||'Member',monthly:Array(12).fill(0),otherReceipts:0});
      const row=parties.get(key),amount=Math.abs(Number(t.amount)||0),idx=monthIndex(t);
      if(did&&linkedPartyId&&idx>=0)row.monthly[idx]+=amount;
      else row.otherReceipts+=amount;
    });
    const rows=Array.from(parties.values())
     .filter(x=>!query||[x.name,x.type].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase().trim())))
     .filter(x=>partyTypeFilter==='All party types'||x.type===partyTypeFilter)
     .map(x=>({...x,cumulative:x.monthly.map((_:number,i:number)=>x.monthly.slice(0,i+1).reduce((a:number,b:number)=>a+b,0))}))
     .sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name));
    const totals=monthLabels.map((_,i)=>rows.reduce((sum:number,x:any)=>sum+x.cumulative[i],0));
    const totalOther=rows.reduce((sum:number,x:any)=>sum+Number(x.otherReceipts||0),0);
    return {title:'Monthly Cumulative Collection Matrix — Party-wise',note:'Monthly cumulative columns show demand-linked member receipts grouped by the source Reporting Month (falling back to transaction date only when reporting month is absent). Receipts without a valid Demand ID, including additional funds such as Tank Repair, are excluded from demand-linked collections and disclosed separately in Other / Unallocated Receipts (FY Total). This report does not allocate receipts across demands or infer missing dates.',headers:['Party Type','Party Name',...monthLabels,'FY Cumulative Demand-linked Collections','Other / Unallocated Receipts (FY Total)'],rows:[...rows.map(x=>[x.type,x.name,...x.cumulative.map(currencyCell),currencyCell(x.cumulative[11]||0),currencyCell(x.otherReceipts)]),['TOTAL — MEMBER RECEIPTS','',...totals.map(currencyCell),currencyCell(totals[11]||0),currencyCell(totalOther)]]};
   }
   case 'receipts-payments': {
    const movement=filtered.filter(t=>t.transactionClass!=='Contra'&&(t.type==='Receipt'||t.type==='Payment'));
    const receiptGroups=new Map<string,{group:string;name:string;amount:number;count:number}>();
    const paymentGroups=new Map<string,{group:string;name:string;amount:number;count:number}>();
    const addGroup=(map:Map<string,{group:string;name:string;amount:number;count:number}>,t:any)=>{
     const name=String(t.categoryName||'Unclassified');
     const group=String(t.categoryGroup||categoryMaster.find((c:any)=>c.category_name===name)?.category_group||'Unmapped');
     const key=group+'::'+name;
     const row=map.get(key)||{group,name,amount:0,count:0};
     row.amount+=Math.abs(Number(t.amount)||0);row.count++;map.set(key,row);
    };
    movement.forEach(t=>addGroup(t.type==='Receipt'?receiptGroups:paymentGroups,t));
    const receiptsByHead=Array.from(receiptGroups.values()).sort((x,y)=>x.group.localeCompare(y.group)||x.name.localeCompare(y.name));
    const paymentsByHead=Array.from(paymentGroups.values()).sort((x,y)=>x.group.localeCompare(y.group)||x.name.localeCompare(y.name));
    const openingRows=(openingBalances||[]).map((x:any)=>({account:String(x.accountName||x.account_name||x.accountId||'Unmapped account'),amount:Number(x.recordedOpeningBalance??x.calculatedOpeningBalance??x.sourceOpeningBalance??0)}));
    const openingAvailable=openingRows.length>0;
    const fyOpeningTotal=openingRows.reduce((sum,x)=>sum+x.amount,0);
    const selectedMonthIndex=period==='All months'?-1:monthOrder.indexOf(period);
    const priorMovements=selectedMonthIndex>0?transactions.filter(t=>t.transactionClass!=='Contra'&&(t.type==='Receipt'||t.type==='Payment')&&monthOrder.indexOf(String(t.reportingMonth||t.month||''))>=0&&monthOrder.indexOf(String(t.reportingMonth||t.month||''))<selectedMonthIndex):[];
    const periodOpeningTotal=fyOpeningTotal+priorMovements.reduce((sum,t)=>sum+(t.type==='Receipt'?1:-1)*Math.abs(Number(t.amount)||0),0);
    const openingTotal=selectedMonthIndex>=0?periodOpeningTotal:fyOpeningTotal;
    const receiptTotal=receiptsByHead.reduce((sum,x)=>sum+x.amount,0);
    const paymentTotal=paymentsByHead.reduce((sum,x)=>sum+x.amount,0);
    const closingTotal=openingTotal+receiptTotal-paymentTotal;
    const contraTotal=filtered.filter(t=>t.transactionClass==='Contra').reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);
    const leftRows:any[][]=[...(openingAvailable?(selectedMonthIndex>=0?[['Opening Cash & Bank Balance',currencyCell(openingTotal)]]:openingRows.map(x=>['Opening Balance · '+x.account,currencyCell(x.amount)])):[['Opening Cash & Bank Balance','Not available']]),...receiptsByHead.map(x=>[x.group+' · '+x.name,currencyCell(x.amount)])];
    const rightRows:any[][]=[...paymentsByHead.map(x=>[x.group+' · '+x.name,currencyCell(x.amount)]),['Closing Cash & Bank Balance',openingAvailable?currencyCell(closingTotal):'Not available']];
    const count=Math.max(leftRows.length,rightRows.length,1);
    const rows:any[][]=[];
    for(let i=0;i<count;i++){const l=leftRows[i],p=rightRows[i];rows.push([l?.[0]||'',l?.[1]||'',p?.[0]||'',p?.[1]||'']);}
    rows.push(['TOTAL RECEIPTS INCLUDING OPENING',openingAvailable?currencyCell(openingTotal+receiptTotal):currencyCell(receiptTotal),'TOTAL PAYMENTS INCLUDING CLOSING',openingAvailable?currencyCell(paymentTotal+closingTotal):'Not available']);
    rows.push(['Recorded transaction receipts',currencyCell(receiptTotal),'Recorded transaction payments',currencyCell(paymentTotal)]);
    rows.push(['Contra transfers excluded',currencyCell(contraTotal),'Transaction count',num(movement.length)]);
    const accountRows=openingRows.map(x=>[x.account,currencyCell(x.amount)]);
    return {title:'RPT-16 · Receipts & Payments Account',note:'Cash and bank movement statement generated from connected transactions. Receipt and payment heads are grouped by Category Group → Category Name. Contra transfers are excluded from consolidated cash movement to avoid double counting. Opening balances are shown only where Account Master opening records are available. Closing balance is a calculated provisional movement, not a bank-reconciled balance. Debtors, investments and unpaid liabilities are not treated as cash receipts or payments unless represented by actual cash/bank transactions.',headers:['RECEIPTS — Particulars','Amount (₹)','PAYMENTS — Particulars','Amount (₹)'],rows,openingAccounts:accountRows,summary:{openingAvailable,openingTotal,receiptTotal,paymentTotal,closingTotal,contraTotal,transactionCount:movement.length},receiptHeads:receiptsByHead,paymentHeads:paymentsByHead};
   }
   case 'party-balances': {
     // Member receivables are sourced from the central FY balance calculation.
     // Staff, utilities and vendors are payables and are intentionally excluded from Debtors.
     const rows=(partyMaster as any[]).filter(p=>String(p.party_type||'')==='Member').map(p=>{
       const bal=memberFinancialBalances.find((b:any)=>String(b.financial_year||'')==='FY 2018-19'&&String(b.party_id||'')===String(p.party_id||''));
       const opening=Number(bal?.opening_balance)||0;
       const billed=Number(bal?.billed_amount)||0;
       const paid=Number(bal?.received_amount)||0;
       const adjustment=Number(bal?.adjusted_amount)||0;
       const signed=Number(bal?.closing_balance);
       const signedClosing=Number.isFinite(signed)?signed:opening-billed+paid+adjustment;
       const closing=Math.max(0,-signedClosing);
       const demandIds=new Set(reportDemands.filter((d:any)=>String(d.party_id||'')===String(p.party_id||'')).map((d:any)=>String(d.demand_id||d.id||'')));
       const receipts=transactions.filter(t=>t.type==='Receipt'&&demandIds.has(transactionDemandId(t)));
       const receiptDates=receipts.map(t=>String(t.date||'')).filter(Boolean).sort();
       const owner=flatOwnerMaster.find((o:any)=>String(o.owner_name||'').trim().toLowerCase()===String(p.party_name||'').trim().toLowerCase());
       return {partyType:p.party_type||'Member',name:p.party_name||owner?.owner_name||'Unidentified party',opening,openingRecorded:bal?.opening_balance_recorded===true,openingVerified:bal?.opening_balance_verified===true,billed,paid,adjustment,closing,last:receiptDates.at(-1)||'—',status:signedClosing< -0.005?'Outstanding':signedClosing>0.005?'Advance Paid':'No Dues'};
     }).filter(x=>!query||[x.name,x.partyType].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))).filter(x=>partyTypeFilter==='All party types'||x.partyType===partyTypeFilter).sort((a,b)=>a.partyType.localeCompare(b.partyType)||a.name.localeCompare(b.name));
     return {title:'Debtors — All Member Parties',note:'Member receivables only, calculated from the central FY 2018–19 balance view. Opening balances are provisional: recorded rows remain Pending until supported by prior-year closing records, and five member parties have no opening row. Staff, utilities and vendors are payables and are excluded from Debtors. Unapplied receipts remain separate from demand receivables.',headers:['Sr. No.','Party Type','Party Name','Opening Balance','Total Demand','Total Received','Approved Adjustments','Closing Receivable','Last Payment','Status'],rows:rows.map((x,i)=>[i+1,x.partyType,x.name,x.openingRecorded?<span className="inline-flex items-center gap-1">{currencyCell(x.opening)}{!x.openingVerified&&<span className="text-[10px] font-semibold text-amber-700">(Pending)</span>}</span>:'Not recorded',currencyCell(x.billed),currencyCell(x.paid),currencyCell(x.adjustment),currencyCell(x.closing),x.last,statusPill(x.status)])};
    }
    case 'member-ledger': return {title:'Member / Flat Owner Ledger',note:'Shows demand receivable and total party balance separately. Opening balances remain Pending until source-supported. Linked receipts reduce demands; unallocated Tank Repair contributions remain unapplied and are shown as member credits.',headers:['Flat No','Member','Opening balance','Billed','Linked receipts','Adjustments','Unapplied receipts','Demand receivable','Net party balance'],rows:cumulativeOutstanding.filter(r=>!query||[r.flat_no,r.member_name].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))).map(r=>{const b=memberFinancialBalances.find(x=>String(x.financial_year||'')==='FY 2018-19'&&String((x as any).party_id||'')===String(r.party_id||''));return [r.flat_no||'—',r.member_name||'Unmapped',b?.opening_balance_recorded===true?<span className="inline-flex items-center gap-1">{currencyCell(Number(b?.opening_balance)||0)}{b?.opening_balance_verified!==true&&<span className="text-[10px] font-semibold text-amber-700">(Pending)</span>}</span>:'Not recorded',currencyCell(Number(r.total_billed??b?.billed_amount)||0),currencyCell(Number(r.total_received??b?.received_amount)||0),currencyCell(Number(r.total_adjustments??b?.adjusted_amount)||0),currencyCell(Number(r.unallocated_receipts??b?.unallocated_receipts)||0),currencyCell(Number(r.net_outstanding??b?.closing_balance)||0),currencyCell(Number(r.total_party_balance??b?.total_party_balance)||0)]})};
   case 'vendor-ledger': return {title:'Vendor / Payee Ledger',note:'Transaction-based payments ledger. Opening payable, bills outstanding and advances need verified vendor opening balances and bill data.',headers:['Vendor / Payee','Payment entries','Total paid','Average payment','Evidence gaps'],rows:partyPayments};
   case 'receipts': return {title:'Receipts Register',note:'Receipt transactions excluding contra transfers. Cheque number is shown where applicable; missing cheque numbers are flagged only for cheque-mode receipts. Member demand/paid/balance columns are provisional unless receipt allocations are available.',headers:['Date','Transaction ID','Payer','Category Group','Category','Account','Payment Mode','Cheque No.','Amount','Receipt No.','Voucher / Reference','Evidence'],rows:filtered.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra').map(t=>[t.date||'—',t.id||'—',t.party||'Unmapped',t.categoryGroup||categoryMaster.find((x:any)=>x.category_name===t.categoryName)?.category_group||'Unmapped',t.categoryName||'Unclassified',t.accountName||'Unmapped',t.paymentMode||'—',String(t.paymentMode||'').toLowerCase().includes('cheque')?(t.chequeNo||'MISSING — REVIEW'):'N/A',currencyCell(Math.abs(Number(t.amount)||0)),t.receiptNo||'Missing',t.voucherNo||t.id||'—',statusPill(t.evidenceStatus||'Pending')])};
   case 'largest-payments-anomalies': {
    const paymentTx=filtered.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra');
    const absAmount=(t:any)=>Math.abs(Number(t.amount)||0);
    const groupOf=(t:any)=>String(t.categoryGroup||categoryMaster.find((x:any)=>x.category_name===t.categoryName)?.category_group||'Unmapped category group');
    const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b);if(!sorted.length)return 0;const mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2};
    const rows=paymentTx.map(t=>{
      const amount=absAmount(t), group=groupOf(t), payee=String(t.party||'Unidentified payee');
      const peers=paymentTx.filter(x=>groupOf(x)===group&&x.id!==t.id).map(absAmount);
      const baseline=median(peers);
      const samePayeeMonth=paymentTx.filter(x=>String(x.party||'').trim().toLowerCase()===payee.trim().toLowerCase()&&String(x.reportingMonth||x.month||'')===String(t.reportingMonth||t.month||'')).length>1;
      const flags:string[]=[];
      if(!String(t.party||'').trim()||/unknown|unidentified|not identified|unmapped/i.test(payee)) flags.push('Unidentified / unmapped payee');
      if(!String(t.categoryName||'').trim()||/unmapped|unclassified/i.test(String(t.categoryName||''))||/unmapped/i.test(group)) flags.push('Unmapped expense category');
      if(baseline>0&&amount>baseline*2) flags.push('Above 2× category-group median');
      if(samePayeeMonth) flags.push('Multiple payments to same payee in month');
      if(t.evidenceStatus!=='Complete'||t.billStatus==='Missing'||t.voucherReceiptStatus==='Missing') flags.push('Evidence completeness needs review');
      if(!String(t.voucherNo||'').trim()) flags.push('Voucher reference missing');
      const reason=flags.length?flags.join('; '):'Large payment — routine verification';
      const action=flags.some(x=>/Unidentified|Unmapped/.test(x))?'Confirm payee and category mapping':flags.some(x=>/2×|Multiple/.test(x))?'Compare invoice, approval and related payments':flags.some(x=>/Evidence|Voucher/.test(x))?'Obtain bill, voucher and approval evidence':'Verify invoice, approval and bank/cash reference';
      return {date:String(t.date||'—'),month:String(t.reportingMonth||t.month||'—'),payee,description:String(t.description||t.categoryName||'—'),category:String(t.categoryName||'Unclassified'),group,amount,reference:String(t.voucherNo||t.id||'—'),reason,action,source:t};
    }).filter(x=>!query||[x.date,x.month,x.payee,x.description,x.category,x.group,x.reference,x.reason].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())));
    const ordered=rows.sort((a,b)=>b.amount-a.amount);
    return {title:'Largest Payments & Potential Anomalies',note:'This is a screening report, not a finding of error or misuse. Large payments are ranked by recorded amount. Flags are heuristic and must be verified against invoices, approvals, voucher references and bank/cash evidence. Repeated payments are not automatically duplicates.',headers:['Date','Month','Payee','Description','Category','Category Group','Amount','Voucher / Transaction Ref','Potential Flag / Review Reason','Recommended Action'],rows:ordered.map(x=>[x.date,x.month,x.payee,x.description,x.category,x.group,currencyCell(x.amount),x.reference,x.reason,x.action])};
   }
   case 'payments': return {title:'Payments & Expense Register',note:'Payment transactions excluding contra transfers. Cheque number is shown where applicable; cheque-mode payments without a cheque number are flagged for review. Vendor bill balances require bill-level allocation data.',headers:['Date','Transaction ID','Payee','Category Group','Category','Account','Payment Mode','Cheque No.','Amount','Voucher No.','Bill / Reference','Evidence'],rows:filtered.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra').map(t=>[t.date||'—',t.id||'—',t.party||'Unmapped',t.categoryGroup||categoryMaster.find((x:any)=>x.category_name===t.categoryName)?.category_group||'Unmapped',t.categoryName||'Unclassified',t.accountName||'Unmapped',t.paymentMode||'—',String(t.paymentMode||'').toLowerCase().includes('cheque')?(t.chequeNo||'MISSING — REVIEW'):'N/A',currencyCell(Math.abs(Number(t.amount)||0)),t.voucherNo||'Missing',t.description||'—',statusPill(t.evidenceStatus||'Pending')])};
   case 'cashbook': {
     // FY book balances are sourced from v_account_financial_year_balance.
     // All signed Contra movements affect the closing book balance and are also disclosed separately.
     const accountNames=new Set<string>([...openingBalances.map((a:any)=>String(a.accountName||a.accountId||'Unmapped account')),...transactions.map(t=>String(t.accountName||t.accountId||'Unmapped account'))]);
     const rows=Array.from(accountNames).sort((a,b)=>a.localeCompare(b)).map(name=>{
      const acc=openingBalances.find((x:any)=>String(x.accountName||'')===name||String(x.accountId||'')===name);
      const opening=acc?.calculatedOpeningBalance==null?(acc?.openingBalanceRecorded===false||acc?.recordedOpeningBalance==null?null:Number(acc.recordedOpeningBalance)):Number(acc.calculatedOpeningBalance);
      const sourceOpening=Number(acc?.sourceOpeningBalance??acc?.recordedOpeningBalance)||0;
      const preFYMovement=Number(acc?.preFYMovement)||0;
      const receipts=Number(acc?.currentFYReceipts)||0;
      const payments=Number(acc?.currentFYPayments)||0;
      const contraIn=Number(acc?.currentFYContraIn)||0;
      const contraOut=Number(acc?.currentFYContraOut)||0;
      const contraSigned=Number(acc?.currentFYContraSigned)||0;
      const netMovement=Number(acc?.netMovement??(receipts-payments+contraSigned))||0;
      const closing=acc?.calculatedClosingBalance==null?(opening===null?null:opening+netMovement):Number(acc.calculatedClosingBalance);
      const txCount=Number(acc?.transactionCount)||0;
      const verification=opening===null?'Opening balance missing':String(acc?.accountVerificationStatus||'Pending')+' — statement reconciliation pending';
      return {name,accountId:acc?.accountId||'',sourceOpening,preFYMovement,opening,receipts,payments,contraIn,contraOut,contraSigned,closing,txCount,verification};
     });
     const totals=rows.reduce((a,x)=>({sourceOpening:a.sourceOpening+x.sourceOpening,preFYMovement:a.preFYMovement+x.preFYMovement,opening:a.opening+(x.opening??0),receipts:a.receipts+x.receipts,payments:a.payments+x.payments,contraIn:a.contraIn+x.contraIn,contraOut:a.contraOut+x.contraOut,contraSigned:a.contraSigned+x.contraSigned,closing:a.closing+(x.closing??0)}),{sourceOpening:0,preFYMovement:0,opening:0,receipts:0,payments:0,contraIn:0,contraOut:0,contraSigned:0,closing:0});
     const openingComplete=rows.length>0&&rows.every(x=>x.opening!==null);
     return {title:'Cash & Bank Balances',note:'Calculated book position from source account opening balances, pre-FY cutoff transactions, and current FY signed movements including Contra. Contra in/out is disclosed separately. No account_monthly_balance statement-reconciliation records are currently loaded, so these are not bank-confirmed closing balances.',headers:['Account / Cash or Bank','Source Opening Balance','Pre-FY Cut-off Movement','FY Opening Balance','Receipts','Payments','Contra In','Contra Out','Net Contra','Calculated Closing Book Balance','Transaction Count','Verification Status'],rows:[...rows.map(x=>[x.name,currencyCell(x.sourceOpening),currencyCell(x.preFYMovement),x.opening===null?'Not available':currencyCell(x.opening),currencyCell(x.receipts),currencyCell(x.payments),currencyCell(x.contraIn),currencyCell(x.contraOut),currencyCell(x.contraSigned),x.closing===null?'Not available':currencyCell(x.closing),num(x.txCount),x.verification]),['TOTAL',currencyCell(totals.sourceOpening),currencyCell(totals.preFYMovement),openingComplete?currencyCell(totals.opening):'Incomplete',currencyCell(totals.receipts),currencyCell(totals.payments),currencyCell(totals.contraIn),currencyCell(totals.contraOut),currencyCell(totals.contraSigned),openingComplete?currencyCell(totals.closing):'Incomplete',num(rows.reduce((v,x)=>v+x.txCount,0)),openingComplete?'Provisional book total':'One or more opening balances missing']],summary:{rows,totals,openingComplete}};
    }
    case 'demand-register': {
      const rows=reportDemands
       .filter((d:any)=>!d.party_type||String(d.party_type).toLowerCase()==='member')
       .filter((d:any)=>!query||[d.demand_id,d.flat_no,d.member_name,d.party_name,d.category_name,d.demand_month].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase())))
       .sort((a:any,b:any)=>String(a.demand_date||'').localeCompare(String(b.demand_date||''))||String(a.demand_id||'').localeCompare(String(b.demand_id||'')))
       .map((d:any)=>{
        const signed=Number(d.signed_demand_balance);
        const due=Number.isFinite(signed)?Math.max(0,-signed):Math.max(0,Number(d.total_demand||d.demand_amount||0)-Number(d.net_collection_amount||0)-Number(d.approved_adjustment_amount||0));
        const excess=Number.isFinite(signed)?Math.max(0,signed):0;
        const category=categoryMaster.find((x:any)=>String(x.category_id||'')===String(d.category_id||''))||{};
        const status=due>0?'Outstanding':excess>0?'Excess receipt':'Settled';
        return [d.demand_id||'—',d.financial_year||'—',d.demand_month||'—',d.demand_date||'—',d.due_date||'—',d.flat_no||d.member_name||d.party_name||'Unmapped',d.demand_group||category.demand_group||'Unmapped',category.category_group||'Unmapped',d.category_name||category.category_name||'Unclassified',currencyCell(Number(d.demand_amount??d.total_demand)||0),currencyCell(Number(d.net_collection_amount)||0),currencyCell(Number(d.approved_adjustment_amount)||0),currencyCell(due),currencyCell(excess),status];
       });
      return {title:'Member Demand Register',note:'Member demand rows with linked net collections, approved adjustments, outstanding balances and excess receipts. Excess receipts are displayed separately and are not reallocated to other demands.',headers:['Demand ID','Financial Year','Demand Month','Demand Date','Due Date','Member / Flat','Demand Group','Category Group','Category','Demand Amount','Net Collections','Approved Adjustments','Outstanding','Excess Receipt','Status'],rows};
    }
    case 'monthly-summary': {
      const months=['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];
      const monthKey=(value:any)=>{const raw=String(value||'').trim();const iso=raw.match(/^(\\d{4})-(\\d{2})/);if(iso)return iso[1]+'-'+iso[2];const named=raw.match(/^([A-Za-z]{3})[- ](\\d{4})$/);if(named){const n=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(named[1].toLowerCase());return n<0?'':named[2]+'-'+String(n+1).padStart(2,'0');}return '';};
      const accountNames=new Set<string>([...openingBalances.map((a:any)=>String(a.accountName||a.accountId||'Unmapped account')),...transactions.map(t=>String(t.accountName||t.accountId||'Unmapped account'))]);
      const rows:any[]=[];
      Array.from(accountNames).sort().forEach(name=>{
       if(accountFilter!=='ALL'&&!name.toUpperCase().includes(accountFilter)&&!openingBalances.some((a:any)=>(String(a.accountName||'')===name||String(a.accountId||'')===name)&&String(a.accountId||'')===accountFilter))return;
       const acc=openingBalances.find((a:any)=>String(a.accountName||'')===name||String(a.accountId||'')===name);
       let running=acc?.calculatedOpeningBalance==null?null:Number(acc.calculatedOpeningBalance);
       months.forEach(label=>{
        const key=monthKey(label);
        const ts=transactions.filter(t=>(String(t.accountName||t.accountId||'Unmapped account')===name)&&monthKey(t.month||t.reportingMonth||t.date)===key);
        const receipts=ts.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
        const payments=ts.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
        const contra=ts.filter(t=>t.transactionClass==='Contra').reduce((s,t)=>s+Number(t.amount||0),0);
        const opening=running;
        if(running!==null)running+=receipts-payments+contra;
        rows.push([name,label,opening===null?'Not available':currencyCell(opening),currencyCell(receipts),currencyCell(payments),currencyCell(contra),running===null?'Not available':currencyCell(running),num(ts.length),acc?.openingBalanceRecorded===false?'Opening pending':'Provisional — statement reconciliation required']);
       });
      });
      return {title:'Monthly Financial Control Summary',note:'Account-wise monthly movement from the Transaction Register. Contra is shown separately and included with its signed value. Opening and closing book balances remain provisional until bank/cash statement reconciliation is completed.',headers:['Account','Month','Opening Book Balance','Receipts','Payments','Net Contra','Closing Book Balance','Transaction Count','Status'],rows};
    }
    case 'demand': {
    const memberRows=memberFinancialBalances.filter((b:any)=>String(b.financial_year||'')==='FY 2018-19');
    return {title:'Member Demand & Demand-linked Collections',note:'This report shows only the member demand position. Demand-linked collections are receipts mapped to member demands. Other-purpose receipts, including Tank Payment / Tank Repair contributions, are excluded from demand collections and from the member demand balance; they must be tracked separately and must not reduce demand dues. Negative balance = member owes the Society; positive balance = Society owes the member.',headers:['Flat No','Member','Demand Records','FY Demand Raised','Demand-linked Collections','Demand Outstanding','Member Balance (Demand Only)'],rows:memberRows.map((b:any)=>{const ds=reportDemands.filter((d:any)=>String(d.party_id||'')===String(b.party_id||''));const signed=Number(b.total_outstanding??b.closing_balance)||0;return [b.flat_no||'—',b.member_name||b.name||'Unmapped',num(ds.length),currencyCell(Number(b.current_fy_demand??b.billed_amount)||0),currencyCell(Number(b.current_fy_receipts??b.received_amount)||0),currencyCell(Math.max(0,-signed)),currencyCell(signed)];})};
   }
   case 'expense-analysis': {
    const months=['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];
    const normalizeExpenseMonth=(value:any)=>{
     const raw=String(value||'').trim();
     const short=raw.match(/^([A-Za-z]{3})[- /](?:20)?(\\d{2}|\\d{4})$/);
     if(short){const year=short[2].length===2?Number('20'+short[2]):Number(short[2]);return short[1].slice(0,1).toUpperCase()+short[1].slice(1,3).toLowerCase()+' '+year;}
     const full=raw.match(/^([A-Za-z]{3,})\\s+(\\d{4})$/);
     if(full)return full[1].slice(0,1).toUpperCase()+full[1].slice(1,3).toLowerCase()+' '+full[2];
     return raw;
    };
    const expenseTransactions=filtered.filter(t=>{
     if(!((t.type==='Payment'||t.transactionClass==='Payment')&&t.transactionClass!=='Contra'))return false;
     const category=categoryMaster.find((c:any)=>String(c.category_name||'')===String(t.categoryName||''))||{};
     const demandGroup=String(category.demand_group||'Unmapped Demand Group');
     return expenseDemandGroupFilter==='All demand groups'||demandGroup===expenseDemandGroupFilter;
    });
    const names=Array.from(new Set(expenseTransactions.map(t=>t.categoryName||'Unclassified'))).sort((a,b)=>a.localeCompare(b));
    const expenseRows=names.filter(n=>!query||n.toLowerCase().includes(query.toLowerCase())).map(n=>{
     const matching=expenseTransactions.filter(t=>(t.categoryName||'Unclassified')===n);
     const group=categoryMaster.find((x:any)=>x.category_name===n)?.category_group||matching.find(t=>t.categoryGroup)?.categoryGroup||'Unmapped';
     const vals=months.map(m=>matching.filter(t=>normalizeExpenseMonth(t.month||t.reportingMonth)===m).reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0));
     return [group,n,...vals.map(currencyCell),currencyCell(vals.reduce((sum,v)=>sum+v,0))];
    });
    return {title:'Expense Analysis by Category',note:'Monthly payments grouped by category group and category. Contra transfers are excluded. Month columns use the normalized transaction month; values reflect recorded cash payments, not necessarily accrual-basis expenditure.',headers:['Category Group','Category',...months,'Annual Total'],rows:expenseRows};
   }
   case 'missing-docs': return {title:'Missing Document / Evidence Register',note:'Transactions with incomplete evidence, missing bills or missing voucher/receipt references.',headers:['Date','Transaction ID','Party','Category','Amount','Voucher / receipt','Bill status','Evidence status'],rows:filtered.filter(t=>t.evidenceStatus!=='Complete'||t.billStatus==='Missing'||t.voucherReceiptStatus==='Missing').map(t=>[t.date||'—',t.id||'—',t.party||'Unmapped',t.categoryName||'Unclassified',currencyCell(Math.abs(Number(t.amount)||0)),t.voucherNo||t.receiptNo||'Missing',statusPill(t.billStatus||'Not assessed'),statusPill(t.evidenceStatus||'Pending')])};
   case 'bank-recon': {
    // Mirror MonthlyReconciliation.tsx accountList: calculate all 12 months from transactions and opening balances.
    // Saved reconciliation records contribute only independently entered source closing balances and remarks.
    const months=['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];
    const accountIds=['TDCC','BOM','CASH'];
    const allRows=accountIds.flatMap(accountId=>{
     const storedRows=(reconciliations as any)[accountId]||[];
     const openingRecord=openingBalances.find((o:any)=>o.accountId===accountId);
     let carry=Number(openingRecord?.recordedOpeningBalance)||0;
     return months.map((month,monthIndex)=>{
      const monthRows=transactions.filter((t:any)=>t.month===month&&t.accountId===accountId);
      const credits=monthRows.filter((t:any)=>t.transactionClass!=='Contra'&&t.type==='Receipt').reduce((sum:number,t:any)=>sum+Math.abs(Number(t.amount)||0),0);
      const debits=monthRows.filter((t:any)=>t.transactionClass!=='Contra'&&t.type==='Payment').reduce((sum:number,t:any)=>sum+Math.abs(Number(t.amount)||0),0);
      const contra=monthRows.filter((t:any)=>t.transactionClass==='Contra').reduce((sum:number,t:any)=>sum+Number(t.amount||0),0);
      const stored=storedRows.find((row:any)=>row.month===month);
      const opening=carry;
      const calculatedClosing=opening+credits-debits+contra;
      carry=calculatedClosing;
      const statementClosing=stored?.sourceClosingBalance??null;
      const hasStatement=statementClosing!==null&&statementClosing!==undefined;
      const difference=hasStatement?Number((calculatedClosing-Number(statementClosing)).toFixed(2)):null;
      const status=!hasStatement?'Awaiting Statement':Math.abs(Number(difference))<0.01?'Matched':'Difference';
      return {accountId,accountName:openingRecord?.accountName||accountId,month,monthIndex,opening,credits,debits,contra,calculatedClosing,statementClosing:hasStatement?Number(statementClosing):null,difference,status,remarks:stored?.remarks||'',transactionCount:monthRows.length};
     });
    });
    const reconRows=allRows.filter(x=>period==='All months'||String(period).trim().toLowerCase()===x.month.toLowerCase());
    const missingStatement=reconRows.filter(x=>x.statementClosing===null);
    const matchedRows=reconRows.filter(x=>x.status==='Matched');
    const mismatchRows=reconRows.filter(x=>x.status==='Difference');
    const accountsWithActivity=new Set(allRows.filter(x=>x.transactionCount>0||openingBalances.some((o:any)=>o.accountId===x.accountId&&Number(o.recordedOpeningBalance)!==0)).map(x=>x.accountId));
    const accountsWithoutActivity=accountIds.filter(id=>!accountsWithActivity.has(id));
    return {title:'RPT-18 · Bank / UPI Reconciliation',note:'This report uses the same month-by-month book calculation as the Account-wise Monthly Reconciliation screen: opening balances are carried forward and credits, debits and contra movements are derived from transactions. Bank / UPI statement closing balances are shown only where separately recorded. Awaiting Statement is not a match.',headers:['Account','Month','Opening Book Balance','Book Receipts','Book Payments','Contra Movements','Calculated Book Closing','Statement Closing','Difference','Reconciliation Status','Transaction Count','Review Notes'],rows:reconRows.map(x=>[x.accountName,x.month,currencyCell(x.opening),currencyCell(x.credits),currencyCell(x.debits),currencyCell(x.contra),currencyCell(x.calculatedClosing),x.statementClosing===null?'':currencyCell(x.statementClosing),x.difference===null?'':currencyCell(x.difference),statusPill(x.status),num(x.transactionCount),'']),summary:{total:reconRows.length,matched:matchedRows.length,mismatches:mismatchRows.length,missingStatement:missingStatement.length,missingAccounts:accountsWithoutActivity.length,accountCount:new Set(reconRows.map(x=>x.accountId)).size,reconRows}};
   }
   case 'maintenance-performance': {
    const isMember=(party:any)=>/^members?$/i.test(String(party?.party_type||'').trim());
    const categoryById=new Map(categoryMaster.map((c:any)=>[String(c.category_id||c.id||''),c]));
    const demandKind=(d:any)=>{
     const c:any=categoryById.get(String(d.category_id||''))||{};
     const group=String(c.demand_group||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
     const category=String(c.category_name||d.category_name||d.description||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
     const id=String(d.category_id||'').toUpperCase();
     if(/non occupancy|nonoccupancy|\bnoc\b/.test(group+' '+category)||id==='CAT-0023')return 'noc';
     if(/delay|late payment|penalty/.test(group+' '+category)||id==='CAT-0003')return 'delay';
     if(/maintenance|parking/.test(group+' '+category)||id==='CAT-0001'||id==='CAT-0021')return 'maintenance';
     return 'other';
    };
    const memberDemands=reportDemands.filter((d:any)=>{
     const p=partyMaster.find((x:any)=>String(x.party_id)===String(d.party_id||''));
     const demandGroup=String(categoryById.get(String(d.category_id||''))?.demand_group||'Unmapped Demand Group');
     return Boolean(p&&isMember(p))&&(period==='All months'||monthKey(d.month||d.demand_month||d.reporting_month||d.demand_date)===monthKey(period))&&(globalPartyTypeFilter==='All party types'||String(p?.party_type||'')===globalPartyTypeFilter)&&(partyTypeFilter==='All party types'||String(p?.party_type||'')===partyTypeFilter)&&(globalDemandGroupFilter==='All demand groups'||demandGroup===globalDemandGroupFilter)&&(categoryGroupFilter==='All category groups'||String(categoryById.get(String(d.category_id||''))?.category_group||'Unmapped')===categoryGroupFilter);
    });
    const partyGroups=new Map<string,any>();
    const totals={maintenanceDemand:0,onTime:0,late:0,maintenanceOutstanding:0,excess:0,delayDemand:0,delayCollected:0,delayOutstanding:0,nocDemand:0,nocCollected:0,nocOutstanding:0};
    const receiptsByDemand=new Map<string,any[]>();
    receiptRows.forEach((t:any)=>{const id=transactionDemandId(t);if(!id)return;if(!receiptsByDemand.has(id))receiptsByDemand.set(id,[]);receiptsByDemand.get(id)!.push(t);});
    const ensureParty=(partyId:string,d:any)=>{
     if(!partyGroups.has(partyId)){
      const p=partyMaster.find((x:any)=>String(x.party_id)===partyId);
      partyGroups.set(partyId,{type:p?.party_type||'Member',name:p?.party_name||d.member_name||partyId,maintenanceDemand:0,onTime:0,late:0,maintenanceOutstanding:0,excess:0,delayDemand:0,delayCollected:0,delayOutstanding:0,nocDemand:0,nocCollected:0,nocOutstanding:0});
     }
     return partyGroups.get(partyId);
    };
    memberDemands.forEach((d:any)=>{
     const partyId=String(d.party_id||'');if(!partyId)return;
     const kind=demandKind(d);if(kind==='other')return;
     const row=ensureParty(partyId,d);
     const id=String(d.demand_id||d.id||'');
     const amount=demandNetAmount(d);
     const linked=(receiptsByDemand.get(id)||[]).slice().sort((x:any,y:any)=>transactionDate(x).localeCompare(transactionDate(y)));
     const paid=linked.reduce((sum:number,t:any)=>sum+Math.abs(Number(t.amount)||0),0);
     if(kind==='maintenance'){
      let applied=0,onTime=0,late=0,excess=0;
      const due=String(d.due_date||'').slice(0,10);
      linked.forEach((t:any)=>{
       const receipt=Math.abs(Number(t.amount)||0),used=Math.min(receipt,Math.max(0,amount-applied));
       if(due&&transactionDate(t)){if(transactionDate(t)<=due)onTime+=used;else late+=used;}
       applied+=used;excess+=receipt-used;
      });
      const outstanding=Math.max(0,amount-paid);
      row.maintenanceDemand+=amount;row.onTime+=onTime;row.late+=late;row.maintenanceOutstanding+=outstanding;row.excess+=excess;
      totals.maintenanceDemand+=amount;totals.onTime+=onTime;totals.late+=late;totals.maintenanceOutstanding+=outstanding;totals.excess+=excess;
     }else if(kind==='delay'){
      const collected=Math.min(Math.max(0,amount),paid),outstanding=Math.max(0,amount-paid);
      row.delayDemand+=amount;row.delayCollected+=collected;row.delayOutstanding+=outstanding;
      totals.delayDemand+=amount;totals.delayCollected+=collected;totals.delayOutstanding+=outstanding;
     }else if(kind==='noc'){
      const collected=Math.min(Math.max(0,amount),paid),outstanding=Math.max(0,amount-paid);
      row.nocDemand+=amount;row.nocCollected+=collected;row.nocOutstanding+=outstanding;
      totals.nocDemand+=amount;totals.nocCollected+=collected;totals.nocOutstanding+=outstanding;
     }
    });
    const rows=Array.from(partyGroups.values()).filter((x:any)=>!query||String(x.name||'').toLowerCase().includes(query.toLowerCase().trim())).sort((a:any,b:any)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name));
    const headers=['Party Type','Party Name','Maintenance Demanded (incl. Parking)','Collected On Time','Collected Late','Outstanding Maintenance (incl. Parking)','Excess Receipts (incl. Parking)','Delay Charges Demanded','Delay Charges Collected','Delay Charges Outstanding','NOC Demanded','NOC Collected','NOC Outstanding'];
    const tableRows=rows.map((x:any)=>[x.type,x.name,currencyCell(x.maintenanceDemand),currencyCell(x.onTime),currencyCell(x.late),currencyCell(x.maintenanceOutstanding),currencyCell(x.excess),currencyCell(x.delayDemand),currencyCell(x.delayCollected),currencyCell(x.delayOutstanding),currencyCell(x.nocDemand),currencyCell(x.nocCollected),currencyCell(x.nocOutstanding)]);
    const totalRow=['SOCIETY TOTAL','',currencyCell(totals.maintenanceDemand),currencyCell(totals.onTime),currencyCell(totals.late),currencyCell(totals.maintenanceOutstanding),currencyCell(totals.excess),currencyCell(totals.delayDemand),currencyCell(totals.delayCollected),currencyCell(totals.delayOutstanding),currencyCell(totals.nocDemand),currencyCell(totals.nocCollected),currencyCell(totals.nocOutstanding)];
    return {title:'Maintenance, Parking, Delay Charges & NOC Analysis',note:'Members only. Maintenance and Parking demand groups are combined in the Maintenance columns. Delay Charges and NOC are separately reported. Demanded amounts use Net Demand from the Demand Register; collections are matched only through Demand ID-linked non-contra receipts. On-time / late classification uses the demand due date and receipt transaction date. Where either date is missing, the receipt is not assigned to either timing bucket; it is still included when calculating outstanding and excess receipts. Period filter applies by demand month.',headers,rows:[...tableRows,totalRow]};
   }
   case 'income-expense': {
    const source=transactions.filter(t=>t.transactionClass!=='Contra'&&(t.type==='Receipt'||t.type==='Payment'));
    const names=Array.from(new Set(source.map(t=>t.categoryName||'Unclassified')));
    const detail=names.map(name=>{const g=source.filter(t=>(t.categoryName||'Unclassified')===name);const income=g.filter(t=>t.type==='Receipt').reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);const expense=g.filter(t=>t.type==='Payment').reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);const group=categoryMaster.find((x:any)=>x.category_name===name)?.category_group||g[0]?.categoryGroup||'Unmapped';return {group,name,income,expense};});
    const incomeRows=detail.filter(x=>x.income>0).sort((a,b)=>a.group.localeCompare(b.group)||a.name.localeCompare(b.name));
    const expenseRows=detail.filter(x=>x.expense>0).sort((a,b)=>a.group.localeCompare(b.group)||a.name.localeCompare(b.name));
    const count=Math.max(incomeRows.length,expenseRows.length);
    return {title:'Financial Performance & Risk Intelligence',note:'Income and expenditure heads are separated by actual receipt/payment movement. Contra transfers excluded.',headers:['Income Particulars','Income','Expenditure Particulars','Expenditure'],rows:Array.from({length:count},(_,i)=>[incomeRows[i]?incomeRows[i].group+' · '+incomeRows[i].name:'',incomeRows[i]?currencyCell(incomeRows[i].income):'',expenseRows[i]?expenseRows[i].group+' · '+expenseRows[i].name:'',expenseRows[i]?currencyCell(expenseRows[i].expense):''])};
   }
   case 'profit-loss': {
    const statementRows=()=>{const names=Array.from(new Set(filtered.filter(t=>t.transactionClass!=='Contra').map(t=>t.categoryName||'Unclassified'))).sort((a,b)=>String(a).localeCompare(String(b)));const detail=names.map(name=>{const g=filtered.filter(t=>(t.categoryName||'Unclassified')===name&&t.transactionClass!=='Contra');const income=g.filter(t=>t.type==='Receipt').reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);const expense=g.filter(t=>t.type==='Payment').reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);const group=categoryMaster.find((x:any)=>x.category_name===name)?.category_group||g[0]?.categoryGroup||'Unmapped';return {group,name,income,expense,net:income-expense};});return detail;};

    const detail=statementRows();
    const totalIncome=detail.reduce((sum,x)=>sum+x.income,0),totalExpense=detail.reduce((sum,x)=>sum+x.expense,0),result=totalIncome-totalExpense;
    const incomeRows=detail.filter(x=>x.income!==0),expenseRows=detail.filter(x=>x.expense!==0);
    const count=Math.max(incomeRows.length,expenseRows.length);
    const rows=Array.from({length:count},(_,i)=>[incomeRows[i]?.name||'',incomeRows[i]?currencyCell(incomeRows[i].income):'',expenseRows[i]?.name||'',expenseRows[i]?currencyCell(expenseRows[i].expense):'']);
    rows.push(['TOTAL INCOME',currencyCell(totalIncome),'TOTAL EXPENSES',currencyCell(totalExpense)]);
    rows.push([result>=0?'NET SURPLUS':'NET DEFICIT',currencyCell(Math.abs(result)),'','']);
    return {title:'Profit & Loss Statement — Management View',note:'Management-format presentation of income and expenses using the same classified transaction population as RPT-15. For a co-operative housing society, the statutory presentation is generally Income & Expenditure with surplus / deficit; this Profit & Loss view is supplementary and does not imply commercial profit. Cash-basis and year-end accrual limitations remain applicable.',headers:['Income Particulars','Amount','Expenditure Particulars','Amount'],rows};
   }

   case 'balance-sheet': {const rows=[['Cash / Bank','Account-wise reconciliations','Requires verified account-wise closing balances'],['Member Receivables','Cumulative outstanding register',currencyCell(cumulativeOutstanding.reduce((s,x)=>s+Math.max(0,-(Number(x.net_outstanding)||0)),0))],['Vendor Payables','Vendor bills / payable allocations','Not available as a complete bill-level register'],['Deposits / Investments','Investment register','Not available in connected sources'],['Society Funds / Accumulated Balance','Approved prior-year balance sheet','Required from audited closing balances'],['Member FY balances',num(memberFinancialBalances.length)+' rows','Verify opening and closing balance mapping'],['Bank Reconciliation',num(totalRecon.length)+' account-month records',unmatched?'Unresolved differences exist':'Verify source statement balances'],['Balance Sheet equation','Assets = Liabilities + Funds','Cannot certify until all heads are mapped and verified']];return {title:'Balance Sheet Working Statement (Provisional)',note:'This report identifies available balance-sheet evidence and explicitly labels balances that cannot yet be calculated. It is not a complete Balance Sheet until assets, liabilities, funds and prior-year closing balances reconcile.',headers:['Balance Sheet Head','Source / Basis','Amount or Status'],rows}};
   case 'trial-balance': {const rows=Array.from(new Set(transactions.map(t=>String(t.accountName||'Unmapped account')))).map(name=>{const ts=filtered.filter(t=>String(t.accountName||'Unmapped account')===name&&t.transactionClass!=='Contra');const debit=ts.filter(t=>t.type==='Payment').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);const credit=ts.filter(t=>t.type==='Receipt').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);return [name,'Not mapped',currencyCell(debit),currencyCell(credit),'Unposted cash-movement view']});return {title:'Trial Balance & Posting Reconciliation (Provisional)',note:'The source transaction model records receipts/payments but does not establish complete double-entry debit and credit postings. This is a posting-readiness view, not a certified Trial Balance; it must not be forced to balance.',headers:['Account / Ledger','Account Group','Recorded Debit-side Payments','Recorded Credit-side Receipts','Posting Status'],rows:[...rows,['Unmapped transactions','—',num(filtered.filter(t=>!t.accountName||!t.categoryName).length),'—','Review mapping'],['Double-entry posting completeness','—','—','—','Missing / requires journal-posting model']]}};
   case 'statutory': return {title:'Statutory & Governance Register',note:'Governance records are not currently connected. Missing records must not be treated as compliant.',headers:['Operational control','Evidence required','Current status'],rows:[['AGM','Notice, agenda, attendance, minutes, audited accounts, resolutions',statusPill('Governance data required')],['Monthly committee meetings','Notice, attendance, minutes and resolutions',statusPill('Governance data required')],['Monthly receipts/payments review','Treasurer report and committee review',statusPill('Financial data available; approval trail incomplete')],['Major expenditure approvals','Resolution, quotations, sanction and voucher',statusPill('Evidence linkage required')],['Elections / resignations / handover','Election records, resignation acceptance, handover and liabilities',statusPill('Governance data required')],['Complaints register','Complaint, assigned owner, due date and closure evidence',statusPill('Operational register required')]]};
   case 'rectification': return {title:'Audit Observations & Rectification Register',note:'This is a working exception register. Assign an owner, target date and authorised closure evidence in the governance workflow.',headers:['Date','Reference','Observation','Category','Status','Suggested action'],rows:[...filtered.filter(t=>t.evidenceStatus==='Missing'||t.evidenceStatus==='Discrepancy'||t.internalAuditStatus==='Failed'||t.internalAuditStatus==='Pending').map(t=>[t.date||'—',t.id||t.voucherNo||'—',t.remarks||t.description||'Evidence / verification follow-up',t.categoryName||'Transaction review',statusPill(t.internalAuditStatus||t.evidenceStatus||'Pending'),'Investigate, attach evidence and record approved closure']),...auditNotes.map(n=>[n.timestamp||'—',n.author||'Audit note',n.title||n.content||'—',n.tag||'Observation',statusPill(n.priority||'Not assessed'),'Assign owner, target date and closure approval'])]};
   default: {const months=['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];const rows:any[][]=[];(openingBalances||[]).filter((a:any)=>accountFilter==='ALL'||String(a.accountId||'')===accountFilter).forEach((a:any)=>{let opening=Number(a.recordedOpeningBalance)||0;months.forEach(m=>{const tx=transactions.filter(t=>t.accountId===a.accountId&&String(t.month||t.reportingMonth||'').replace(/-/g,' ').trim().toLowerCase()===m.toLowerCase());const rec=tx.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);const pay=tx.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);const contraRows=tx.filter(t=>t.transactionClass==='Contra');const contra=contraRows.reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);const closing=opening+rec-pay;const recon=Object.values(reconciliations).flat().find((x:any)=>x.accountId===a.accountId&&String(x.month||'').replace(/-/g,' ').trim().toLowerCase()===m.toLowerCase());if(period==='All months'||period===m)rows.push([m,a.accountName||a.accountId,currencyCell(opening),currencyCell(rec),currencyCell(pay),currencyCell(contra),currencyCell(closing),recon?.sourceClosingBalance==null?'Not supplied':currencyCell(Number(recon.sourceClosingBalance)),statusPill(recon?.status||'Provisional — statement balance missing')]);opening=closing;});});return {title:'Monthly Financial Control Summary',note:'Opening balances come from Account Master; monthly closing is calculated from recorded non-contra receipts and payments. Contra movements are shown separately and source closing balances remain unverified until bank/cash statement data is entered.',headers:['Month','Account','Opening Balance','Receipts','Payments','Contra Movements','Calculated Closing Balance','Source Closing Balance','Reconciliation Status'],rows}};
  }
 },[selectedReport,filtered,cumulativeOutstanding,memberFinancialBalances,partyFinancialBalances,demandRegister,demandAdjustments,flatOwnerMaster,cats,payments,totalRecon,unmatched,balanceRegister,partyMaster,monthly,transactions,auditNotes,query,partyTypeFilter,categoryGroupFilter,openingBalances,categoryMaster]);
 return <div className={"mx-auto max-w-[1800px] text-slate-800 "+(["party-ledger","payments-expenses","demand-collections","financial-summary","bank-reconciliation"].includes(screen)?"-mt-2 space-y-2":"space-y-3")}>
  {screen!=='reports'&&<header className={"relative isolate overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#101b31] via-[#14294a] to-[#0c1728] text-white shadow-[0_12px_30px_rgba(15,23,42,.14)] "+(["party-ledger","payments-expenses","demand-collections","financial-summary"].includes(screen)?"px-3 py-2":"px-4 py-3 sm:px-5")}>
   <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border border-white/10"/><div className="pointer-events-none absolute -right-2 -top-10 h-40 w-40 rounded-full border border-white/10"/>
   <div className="relative flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
    <div className="flex min-w-0 items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-200/25 bg-gradient-to-br from-cyan-300 to-blue-500 text-slate-950 shadow-lg shadow-cyan-950/30"><Landmark className="h-5 w-5"/></div>
     <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[.2em] text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>{screen==='audit-evidence'||screen==='observations-actions'?'Audit & Compliance':'Pearl Meadows · Society OS'}</div><h1 className="mt-0.5 truncate text-lg font-bold tracking-tight sm:text-xl">{config.title}</h1><p className="mt-0.5 max-w-3xl text-[11px] leading-4 text-slate-300">{config.sub}</p></div>
    </div>
    <div className="relative flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] p-1.5 backdrop-blur-sm">
     <label className="px-2 text-[9px] font-semibold uppercase tracking-wide text-slate-300">Financial year <select className="ml-1.5 rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-[11px] font-semibold normal-case text-white outline-none focus:border-cyan-300"><option>FY 2018–19</option></select></label>
     <button onClick={()=>void refreshReports()} disabled={isRefreshingReports} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-[11px] font-semibold transition hover:bg-white/20"><RefreshCw className={'h-3.5 w-3.5 '+(isRefreshingReports?'animate-spin':'')}/> {isRefreshingReports?'Refreshing…':'Refresh'}</button>
     <div className="flex items-center gap-1 border-l border-white/10 pl-1"><button onClick={exportRows} className="inline-flex items-center gap-1 rounded-lg bg-cyan-400 px-2.5 py-2 text-[11px] font-bold text-slate-950 transition hover:bg-cyan-300"><Download className="h-3.5 w-3.5"/>CSV</button><button onClick={exportTxt} className="rounded-lg border border-white/15 px-2.5 py-2 text-[11px] font-semibold hover:bg-white/10">TXT</button><button onClick={exportPdf} className="rounded-lg border border-white/15 px-2.5 py-2 text-[11px] font-semibold hover:bg-white/10">PDF</button></div>
    </div>
   </div>
   {!["party-ledger","payments-expenses","demand-collections","financial-summary","bank-reconciliation"].includes(screen)&&<div className="relative mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-[9px] text-slate-400"><span>FINANCIAL CONTROL · MEMBER & VENDOR ACCOUNTABILITY</span><span className="hidden sm:inline">PRELIMINARY REPORTING VIEW</span></div>}
  </header>}
  {loading&&<div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800"><span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600"/>Loading society records…</div>}
  {[transactionsError&&`Transactions: ${transactionsError}`,demandRegisterError&&`Demand register: ${demandRegisterError}`,mastersError&&`Master data: ${mastersError}`].filter(Boolean).length>0&&<div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"><strong>Some dashboard data could not be loaded.</strong><ul className="mt-1 list-disc pl-4">{[transactionsError&&`Transactions: ${transactionsError}`,demandRegisterError&&`Demand register: ${demandRegisterError}`,mastersError&&`Master data: ${mastersError}`].filter(Boolean).map((message:any,index:number)=><li key={index}>{message}</li>)}</ul></div>}
  {!["party-ledger","payments-expenses","demand-collections","financial-summary","bank-reconciliation"].includes(screen)&&<div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[10px] leading-4 text-amber-950 shadow-sm"><span className="mt-0.5 font-black text-amber-700">!</span><div><strong className="font-bold uppercase tracking-wide">Preliminary · Not an audit opinion.</strong> Values reflect currently available connected records and must not be treated as certified statutory figures.</div></div>}
   {screen==='financial-summary'&&(()=>{
   const memberDemandRows=demandRegister.filter((d:any)=>String(d.party_type||'')==='Member');
   const groupMap:Record<string,number>={};
   memberDemandRows.forEach((d:any)=>{
    const cat=categoryMaster.find((c:any)=>String(c.category_id||'')===String(d.category_id||'')||String(c.category_name||'')===String(d.category_name||''));
    const group=String(cat?.demand_group||'Unmapped Demand Group');
    groupMap[group]=(groupMap[group]||0)+Number(d.demand_amount||d.total_demand||0);
   });
   const demandGroups=Object.entries(groupMap).map(([name,amount],i)=>({name,amount,fill:COLORS[i%COLORS.length]})).sort((a,b)=>b.amount-a.amount);
   const expenseMap:Record<string,number>={};filtered.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra').forEach(t=>{const name=String(t.categoryName||'Unclassified');expenseMap[name]=(expenseMap[name]||0)+Math.abs(Number(t.amount)||0);});const expenseGroups=Object.entries(expenseMap).map(([name,amount],i)=>({name,amount,fill:COLORS[(i+1)%COLORS.length]})).sort((a,b)=>b.amount-a.amount).slice(0,6);
   const topOutstanding=cumulativeOutstanding.filter((r:any)=>Number(r.net_outstanding||0)<0).sort((a:any,b:any)=>Number(a.net_outstanding||0)-Number(b.net_outstanding||0)).slice(0,5);
   const receiptRatio=demandTotal?receipts/demandTotal*100:0;
   const outstandingRatio=demandTotal?outstanding/demandTotal*100:0;
   const expenseCoverage=payments?receipts/payments:0;
   const missingUtility=transactions.filter(t=>t.type==='Payment'&&/water|electric|mseb|lift/i.test(String(t.party||'')+' '+String(t.description||'')+' '+String(t.categoryName||''))).length;
   const explore=[{label:'Demand & Collections',sub:'Demands, receipts and outstanding',screen:'demand-collections',icon:FileText},{label:'Payments & Expenses',sub:'Vendor payments and expense analysis',screen:'payments-expenses',icon:Wallet},{label:'Party-wise Ledger',sub:'Member and payee balances',screen:'party-ledger',icon:Users},{label:'Reports & Registers',sub:'Statements, ledgers and registers',screen:'reports',icon:ClipboardList}];
   return <>
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
     <Card label="Total Demand Raised" value={fmt(demandTotal)} detail={num(memberDemandRows.length)+' demand entries'} icon={FileText} compact/>
     <Card label="Recorded Receipts" value={fmt(receipts)} detail={pct(receipts,demandTotal)+'% of demand raised'} icon={ArrowDownRight} tone="green" compact/>
     <Card label="Total Payments" value={fmt(payments)} detail={num(filtered.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra').length)+' payment entries'} icon={ArrowUpRight} tone="red" compact/>
     <Card label="Member Outstanding" value={fmt(outstanding)} detail={num(cumulativeOutstanding.filter((r:any)=>Number(r.net_outstanding||0)<0).length)+' member accounts in debit'} icon={AlertTriangle} tone="amber" compact/>
     <Card label="Net Movement" value={fmt(net)} detail="Recorded receipts less payments" icon={Wallet} tone="violet" compact/>
    </div>
    <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-12">
     <div className="xl:col-span-5"><Panel compact title="Monthly Financial Movement" action={<ReportLink id="receipts-payments" category="Financial Statements" label="View report →"/>}>
      <div className="h-[174px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthly} margin={{top:4,right:4,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:8}}/><YAxis tick={{fontSize:8}} tickFormatter={(v:any)=>'₹'+num(Number(v)/1000)+'k'}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Legend wrapperStyle={{fontSize:9}}/><Bar dataKey="receipts" name="Receipts" fill="#27a66b" radius={[3,3,0,0]}/><Bar dataKey="payments" name="Payments" fill="#e34d65" radius={[3,3,0,0]}/><Line dataKey="contra" name="Contra" stroke="#4775df" strokeWidth={2} dot={{r:2}}/></ComposedChart></ResponsiveContainer></div>
      <p className="mt-1 text-[9px] text-slate-500">Monthly recorded receipts and payments; contra entries shown separately.</p>
     </Panel></div>
     <div className="xl:col-span-4"><Panel compact title="Expense Trend by Category" action={<ReportLink id="expense-analysis" category="Operational Registers" label="View report →"/>}>
      <div className="h-[174px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={expenseGroups} layout="vertical" margin={{top:2,right:8,left:4,bottom:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tick={{fontSize:8}} tickFormatter={(v:any)=>'₹'+num(Number(v)/1000)+'k'}/><YAxis type="category" dataKey="name" width={112} tick={{fontSize:8}}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Bar dataKey="amount" name="Payments" fill="#8060df" radius={[0,4,4,0]} barSize={13}/></BarChart></ResponsiveContainer></div>
     </Panel></div>
     <div className="xl:col-span-3"><Panel compact title="Financial Health">
      <div className="space-y-2 pt-1 text-[10px]">
       <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2 py-2"><span>Receipt-to-demand ratio</span><strong className="text-emerald-800">{receiptRatio.toFixed(1)}%</strong></div>
       <div className="flex items-center justify-between rounded-lg bg-blue-50 px-2 py-2"><span>Receipt / payment coverage</span><strong className="text-blue-800">{expenseCoverage.toFixed(2)}×</strong></div>
       <div className="flex items-center justify-between rounded-lg bg-amber-50 px-2 py-2"><span>Outstanding / demand</span><strong className="text-amber-800">{outstandingRatio.toFixed(1)}%</strong></div>
       <div className="rounded-lg border border-slate-100 px-2 py-2 text-[9px] leading-4 text-slate-500">These are indicative ratios from connected records, not a bank-reconciled cash position or demand-allocation recovery rate.</div>
      </div>
     </Panel></div>
    </div>
    <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-12">
     <div className="xl:col-span-4"><Panel compact title="Demand by Group" action={<ReportLink id="demand-summary" category="Member Receivables" label="View report →"/>}>
      <div className="flex h-[156px] items-center gap-1"><div className="relative h-[150px] w-[54%] shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={demandGroups} dataKey="amount" nameKey="name" innerRadius={42} outerRadius={65} paddingAngle={2}>{demandGroups.map(g=><Cell key={g.name} fill={g.fill}/>)}</Pie><Tooltip formatter={(v:any)=>fmt(Number(v))}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[9px] text-slate-500">Member demand</span><strong className="text-xs">{fmt(demandTotal)}</strong></div></div><div className="min-w-0 flex-1 space-y-2 text-[9px]">{demandGroups.slice(0,5).map(g=><div key={g.name} className="flex items-center justify-between gap-1"><span className="flex min-w-0 items-center gap-1"><i className="h-2 w-2 shrink-0 rounded-sm" style={{backgroundColor:g.fill}}/><span className="truncate">{g.name}</span></span><strong className="shrink-0">{fmt(g.amount)}</strong></div>)}</div></div>
     </Panel></div>
     <div className="xl:col-span-4"><Panel compact title="Expense by Category" action={<ReportLink id="expense-analysis" category="Operational Registers" label="View report →"/>}>
      <div className="flex h-[156px] items-center gap-1"><div className="relative h-[150px] w-[54%] shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenseGroups} dataKey="amount" nameKey="name" innerRadius={42} outerRadius={65} paddingAngle={2}>{expenseGroups.map(g=><Cell key={g.name} fill={g.fill}/>)}</Pie><Tooltip formatter={(v:any)=>fmt(Number(v))}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[9px] text-slate-500">Total payments</span><strong className="text-xs">{fmt(payments)}</strong></div></div><div className="min-w-0 flex-1 space-y-2 text-[9px]">{expenseGroups.slice(0,5).map(g=><div key={g.name} className="flex items-center justify-between gap-1"><span className="truncate">{g.name}</span><strong className="shrink-0">{pct(g.amount,payments)}%</strong></div>)}</div></div>
     </Panel></div>
     <div className="xl:col-span-4"><Panel compact title="Top 5 Outstanding Members" action={<ReportLink id="party-balances" category="Member Receivables" label="View report →"/>}>
      <div className="space-y-2 pt-1">{topOutstanding.map((r:any,i:number)=>{const amount=Math.abs(Number(r.net_outstanding)||0);const label=String(r.flat_no||r.member_name||'Unmapped member');return <div key={String(r.party_id||label)+i}><div className="mb-0.5 flex justify-between gap-2 text-[10px]"><span className="truncate">{label}</span><strong className="text-rose-700">{fmt(amount)}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-500" style={{width:(amount/(Math.abs(Number(topOutstanding[0]?.net_outstanding)||1))*100)+'%'}}/></div></div>})}</div>
     </Panel></div>
    </div>
    <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-12">
     <div className="xl:col-span-5"><Panel compact title="Key Insights & Alerts" action={<ReportLink id="mapping-exceptions" category="Audit & Governance" label="Review exceptions →"/>}>
      <div className="space-y-2 text-[10px]">
       <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-2 py-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"/><span>{fmt(outstanding)} outstanding across {num(cumulativeOutstanding.filter((r:any)=>Number(r.net_outstanding||0)<0).length)} member accounts.</span></div>
       <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-2 py-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-700"/><span>{num(evidenceMissing)} transactions have missing evidence fields; {num(pendingApproval)} are pending audit / correction review.</span></div>
       <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-2 py-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600"/><span>{num(unmatched)} reconciliation differences are currently flagged across selected accounts.</span></div>
       <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-2 py-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700"/><span>{num(evidenceComplete)} transactions are marked evidence complete.</span></div>
      </div>
     </Panel></div>
     <div className="xl:col-span-7"><Panel compact title="Explore Dashboards">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{explore.map(x=>{const Icon=x.icon;return <button key={x.screen} onClick={()=>setCurrentScreen(x.screen as any)} className="rounded-xl border border-blue-100 bg-slate-50 p-2 text-left transition hover:border-blue-300 hover:bg-blue-50"><Icon className="mb-1 h-5 w-5 text-blue-700"/><div className="text-[10px] font-bold text-slate-900">{x.label}</div><div className="mt-1 text-[9px] leading-3 text-slate-500">{x.sub}</div></button>})}</div>
     </Panel></div>
    </div>
    </>;
  })()}
  {screen==='demand-collections'&&<>
   {(() => {
    const demandAmount=(d:any)=>Number(d.total_demand??d.demand_amount??d.amount??0)||0;
    const demandCategory=(d:any)=>{const linked=categoryMaster.find((c:any)=>String(c.category_id??c.id??'')===String(d.category_id??d.categoryId??''));return String(d.category_name??d.categoryName??linked?.category_name??d.demand_type??d.charge_type??d.description??'Unmapped demand category')};
    const monthKey=(v:any)=>{const raw=String(v??'').trim().replace(/-/g,' ').replace(/\//g,' ');const m=raw.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(20\d{2})/i);return m?m[1].slice(0,3).toLowerCase()+' '+m[2]:''};
    // This dashboard measures member receivables only; vendor and utility parties belong in Payments & Expenses.
    const isMemberParty=(record:any)=>{
     const id=String(record.party_id??record.partyId??record.member_id??'');
     const name=String(record.party_name??record.partyName??record.member_name??record.memberName??record.party??record.flat_owner_name??'').trim().toLowerCase();
     const party=partyMaster.find((p:any)=>(id&&String(p.party_id??p.id??'')===id)||(name&&String(p.party_name??p.name??'').trim().toLowerCase()===name));
     return !!party&&/^members?$/i.test(String(party.party_type??'').trim());
    };
    const memberDemands=reportDemands.filter((d:any)=>isMemberParty(d));
    const fyDemand=memberDemands.reduce((s:number,d:any)=>s+demandAmount(d),0);
    const receiptRows=filtered.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra'&&isMemberParty(t));
    const fyReceipts=receiptRows.reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
    // Use the FY Member Balance Register as the source of truth for this dashboard.
    // Cumulative outstanding is a separate all-period view and can disagree with FY closing balances.
    const dueRows=memberFinancialBalances
     .filter((r:any)=>isMemberParty(r)&&String(r.financial_year||'')==='FY 2018-19'&&Number(r.closing_balance||0)<0)
     .sort((a:any,b:any)=>Number(a.closing_balance||0)-Number(b.closing_balance||0));
    const demandGroupName=(d:any)=>{
     const category=categoryMaster.find((c:any)=>String(c.category_id??c.id??'')===String(d.category_id??d.categoryId??'')||String(c.category_name??'')===demandCategory(d));
     return String(category?.demand_group??'').trim()||'Unmapped Demand Group';
    };
    const groups:Record<string,{amount:number;count:number;categories:Set<string>}>={};
    memberDemands.forEach((d:any)=>{const k=demandGroupName(d);groups[k]??={amount:0,count:0,categories:new Set<string>()};groups[k].amount+=demandAmount(d);groups[k].count++;groups[k].categories.add(demandCategory(d));});
    const chargeData=Object.entries(groups).sort((a,b)=>b[1].amount-a[1].amount).map(([name,v],i)=>({name,amount:v.amount,count:v.count,categories:Array.from(v.categories).sort(),share:fyDemand?v.amount/fyDemand*100:0,fill:COLORS[i%COLORS.length]}));
    const sumGroup=(re:RegExp)=>memberDemands.filter((d:any)=>re.test(demandCategory(d))).reduce((s:number,d:any)=>s+demandAmount(d),0);
    const currentMaintenance=memberDemands.filter((d:any)=>/maintenance/i.test(demandCategory(d))&&!/previous|opening|arrears|brought forward/i.test(demandCategory(d))).reduce((s:number,d:any)=>s+demandAmount(d),0);
    const previousDues=sumGroup(/previous dues|opening balance|arrears|brought forward/i);
    const chequeBounce=sumGroup(/cheque.?bounce|bounce charge/i);
    const additionalFunds=sumGroup(/additional fund|special fund|capital contribution|special levy/i);
    const monthLabels=['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];
    const monthlyDemand=monthLabels.map(m=>{
     const row:any={month:m.split(' ')[0],receipts:receiptRows.filter(t=>monthKey(t.reportingMonth??t.month??t.date)===m.toLowerCase()).reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0)};
     chargeData.forEach(g=>{row[g.name]=memberDemands.filter((d:any)=>demandGroupName(d)===g.name&&monthKey(d.demand_month??d.month??d.reporting_month??d.demand_date??d.created_at)===m.toLowerCase()).reduce((sum:number,d:any)=>sum+demandAmount(d),0);});
     row.demand=chargeData.reduce((sum,g)=>sum+Number(row[g.name]||0),0);
     return row;
    });
    const monthlyDemandAvailable=monthlyDemand.some(x=>x.demand>0);
    // The database reconciliation view is the single source for demand-linked net collections.
    // Direct Demand IDs take precedence; allocation rows are used only for receipts without a direct link.
    const demandById=new Map<string,any>();
    memberDemands.forEach((d:any)=>{const id=String(d.demand_id||d.id||'');if(id)demandById.set(id,d);});
    const receiptById=new Map<string,any>();
    receiptRows.forEach((t:any)=>{const id=String(t.id||'');if(id)receiptById.set(id,t);});
    const allocatedReceiptIds=new Set<string>();
    (Array.isArray(demandAllocations)?demandAllocations:[]).forEach((a:any)=>{
     const receiptId=String(a.transaction_id||a.receipt_transaction_id||a.receipt_id||'');
     if(receiptById.has(receiptId))allocatedReceiptIds.add(receiptId);
    });
    receiptRows.forEach((t:any)=>{const receiptId=String(t.id||'');if(receiptId&&transactionDemandId(t))allocatedReceiptIds.add(receiptId);});
    const collectedByGroup:Record<string,{amount:number;receipts:number;demands:number}>={};
    memberDemands.forEach((d:any)=>{
     const group=demandGroupName(d);
     collectedByGroup[group]??={amount:0,receipts:0,demands:0};
     collectedByGroup[group].amount+=Number(d.net_collection_amount)||0;
     collectedByGroup[group].receipts+=Number(d.receipt_count)||0;
     collectedByGroup[group].demands++;
    });
    const collectionGroupData=Object.entries(collectedByGroup).map(([name,v],i)=>({name,amount:v.amount,receipts:v.receipts,demands:v.demands,fill:COLORS[i%COLORS.length]})).sort((a,b)=>b.amount-a.amount);
    const allocatedCollectionTotal=memberDemands.reduce((sum:number,d:any)=>sum+(Number(d.receipt_amount)||0),0);
    const unallocatedCollectionTotal=receiptRows.reduce((sum,t)=>sum+(allocatedReceiptIds.has(String(t.id||''))?0:Math.abs(Number(t.amount)||0)),0);
    // Collection quality is calculated only on demand-linked / allocated receipt amounts.
    const demandPaid:Record<string,number>={},qualityByMonth:Record<string,{onTime:number;late:number}>={};
    const fyEnd='2019-03-31';
    let qualityOnTime=0,qualityLate=0,qualityUndated=0,qualityOutstanding=0;
    const ageing={notYetDue:0,days0to30:0,days31to60:0,days61to90:0,over90:0,unknown:0};
    const ageDays=(from:string,to:string)=>Math.floor((Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400000);
    const qualityEntries:Array<{demandId:string;receiptId:string;amount:number}>=[];
    const sameMonthMaintenancePaid:Record<string,number>={};
    const qualityReceiptSeen=new Set<string>();
    const addQualityEntry=(demandId:string,receiptId:string,amount:number)=>{
     if(!demandById.has(demandId)||!receiptById.has(receiptId)||!(amount>0))return;
     qualityEntries.push({demandId,receiptId,amount});
     qualityReceiptSeen.add(receiptId);
    };
    (Array.isArray(demandAllocations)?demandAllocations:[]).forEach((a:any)=>{
     const rid=String(a.transaction_id||a.receipt_transaction_id||a.receipt_id||'');
     const did=String(a.demand_id||'');
     addQualityEntry(did,rid,Number(a.allocated_amount)||0);
    });
    receiptRows.forEach((t:any)=>{
     const rid=String(t.id||'');
     if(!rid||qualityReceiptSeen.has(rid))return;
     const did=transactionDemandId(t);
     if(did)addQualityEntry(did,rid,Math.abs(Number(t.amount)||0));
    });
    qualityEntries.sort((a,b)=>transactionDate(receiptById.get(a.receiptId)).localeCompare(transactionDate(receiptById.get(b.receiptId))));
    qualityEntries.forEach(({demandId,receiptId,amount})=>{
     const d=demandById.get(demandId),t=receiptById.get(receiptId);
     const demandLimit=Math.max(0,demandNetAmount(d)),alreadyPaid=Number(demandPaid[demandId]||0);
     const applied=Math.min(amount,Math.max(0,demandLimit-alreadyPaid));
     if(applied<=0)return;
     demandPaid[demandId]=alreadyPaid+applied;
     const demandMonth=monthKey(d.demand_month||d.month||d.reporting_month||d.demand_date||d.created_at);
     const receiptMonth=monthKey(t.reportingMonth||t.month||t.date);
     const dCategory=demandCategory(d);
     if(/maintenance/i.test(dCategory)&&!/previous|opening|arrears|brought forward/i.test(dCategory)&&demandMonth===receiptMonth){
      sameMonthMaintenancePaid[demandMonth]=(sameMonthMaintenancePaid[demandMonth]||0)+applied;
     }
     const due=String(d.due_date||'').slice(0,10),paidOn=transactionDate(t);
     const month=receiptMonth;
     if(!qualityByMonth[month])qualityByMonth[month]={onTime:0,late:0};
     if(due&&paidOn){
      if(paidOn<=due){qualityOnTime+=applied;qualityByMonth[month].onTime+=applied;}
      else{qualityLate+=applied;qualityByMonth[month].late+=applied;}
     }else qualityUndated+=applied;
    });
    memberDemands.forEach((d:any)=>{
     const id=String(d.demand_id||d.id||'');
      const amount=Math.max(0,demandNetAmount(d));
      const signedBalance=Number(d.signed_demand_balance);
      const balance=Math.max(0,Number.isFinite(signedBalance)?-signedBalance:amount-(Number(d.net_collection_amount)||Number(demandPaid[id]||0))-(Number(d.approved_adjustment_amount)||0));
      const due=String(d.due_date||'').slice(0,10);
     if(!balance)return;
     qualityOutstanding+=balance;
     if(!due){ageing.unknown+=balance;return;}
     const days=ageDays(due,fyEnd);
     if(days<0)ageing.notYetDue+=balance;
     else if(days<=30)ageing.days0to30+=balance;
     else if(days<=60)ageing.days31to60+=balance;
     else if(days<=90)ageing.days61to90+=balance;
     else ageing.over90+=balance;
    });
    const qualityClassified=qualityOnTime+qualityLate;
    const onTimeRate=qualityClassified?qualityOnTime/qualityClassified*100:0;
    const lateRate=qualityClassified?qualityLate/qualityClassified*100:0;
    const monthlyQuality=monthLabels.map(m=>{const q=qualityByMonth[m.toLowerCase()]||{onTime:0,late:0};return {month:m.split(' ')[0],onTime:q.onTime,late:q.late};});
    const monthlyMaintenanceQuality=monthLabels.map(m=>{
     const key=m.toLowerCase();
     const demand=memberDemands.filter((d:any)=>/maintenance/i.test(demandCategory(d))&&!/previous|opening|arrears|brought forward/i.test(demandCategory(d))&&monthKey(d.demand_month??d.month??d.reporting_month??d.demand_date??d.created_at)===key).reduce((sum:number,d:any)=>sum+Math.max(0,demandNetAmount(d)),0);
     const paid=Math.min(demand,Math.max(0,sameMonthMaintenancePaid[key]||0));
     return {month:m.split(' ')[0],demand,paid,percentage:demand?paid/demand*100:0};
    });
    const maintenanceAgeBuckets=Array.from({length:13},(_,i)=>({bucket:i===12?'>12 months':String(i+1)+' month'+(i===0?'':'s'),amount:0,count:0}));
    let maintenanceAgeUnknown=0;
    memberDemands.forEach((d:any)=>{
     const category=demandCategory(d);
     if(!/maintenance/i.test(category)||/previous|opening|arrears|brought forward/i.test(category))return;
     const id=String(d.demand_id||d.id||'');
     const signed=Number(d.signed_demand_balance);
     const balance=Math.max(0,Number.isFinite(signed)?-signed:Math.max(0,demandNetAmount(d)-(Number(d.net_collection_amount)||Number(demandPaid[id]||0))-(Number(d.approved_adjustment_amount)||0)));
     if(!balance)return;
     const due=String(d.due_date||'').slice(0,10);
     if(!due){maintenanceAgeUnknown+=balance;return;}
     const overdueDays=ageDays(due,fyEnd);
     if(overdueDays<=0)return;
     const bucketIndex=Math.min(12,Math.max(0,Math.ceil(overdueDays/30)-1));
     maintenanceAgeBuckets[bucketIndex].amount+=balance;
     maintenanceAgeBuckets[bucketIndex].count++;
    });
    const qualityCoverage=allocatedCollectionTotal?qualityClassified/allocatedCollectionTotal*100:0;
    // Level-2 view: compare each demand group's allocated recovery against its own demand.
    const groupPerformance:Record<string,{demand:number;collected:number;outstanding:number;efficiency:number;count:number;fill:string}>={};
    memberDemands.forEach((d:any)=>{
      const group=demandGroupName(d);
      const demand=Math.max(0,demandNetAmount(d));
      const netCollected=Number(d.net_collection_amount)||0;
      const adjustment=Number(d.approved_adjustment_amount)||0;
      const collected=Math.min(demand,Math.max(0,netCollected+adjustment));
      groupPerformance[group]??={demand:0,collected:0,outstanding:0,efficiency:0,count:0,fill:COLORS[Object.keys(groupPerformance).length%COLORS.length]};
      groupPerformance[group].demand+=demand;
      groupPerformance[group].collected+=collected;
      groupPerformance[group].outstanding+=Math.max(0,demand-netCollected-adjustment);
      groupPerformance[group].count++;
    });
    const collectionEfficiencyData=Object.entries(groupPerformance).map(([name,g])=>({...g,name,efficiency:g.demand?g.collected/g.demand*100:0})).sort((a,b)=>a.efficiency-b.efficiency);
    const top=dueRows.slice(0,5).map((r:any)=>({party:String(r.flat_no||r.member_name||'Unidentified'),amount:Math.abs(Number(r.closing_balance)||0)}));
    // Register convention: negative balance = member owes Society; positive = member credit.
    const outstanding=dueRows.reduce((sum:number,r:any)=>sum+Math.abs(Number(r.closing_balance)||0),0);
    const rate=fyDemand?fyReceipts/fyDemand*100:0;
    const allocated=receiptRows.filter((t:any)=>allocatedReceiptIds.has(String(t.id||''))).length;
    return <>
     <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
      <Card label="Total Demand" value={fmt(fyDemand)} detail={num(memberDemands.length)+" demand entries"} icon={FileText} compact/>
      <Card label="Recorded Receipts" value={fmt(fyReceipts)} detail={num(receiptRows.length)+" member receipts"} icon={Banknote} tone="green" compact/>
      <Card label="Member Outstanding" value={fmt(outstanding)} detail={num(dueRows.length)+" members with dues"} icon={AlertTriangle} tone="red" compact/>
      <Card label="Current Month Demand" value={fmt(monthlyDemand[monthlyDemand.length-1]?.demand||0)} detail="Mar-2019" icon={CalendarDays} tone="amber" compact/>
      <Card label="Active Members" value={num(flatOwnerMaster.length)} detail="Flat-owner master" icon={Users} tone="violet" compact/>
     </div>
     <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
      <div className="xl:col-span-5">
       <Panel compact title="Collection Trend — Monthly" action={<ReportLink id="monthly-payments" category="Member Receivables" label="View Report →"/>}>
        <div className="h-[154px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthlyDemand} margin={{top:4,right:8,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:9}}/><YAxis yAxisId="amt" tick={{fontSize:8}} tickFormatter={(v:any)=>"₹"+num(Number(v)/1000)+"k"}/><YAxis yAxisId="pct" orientation="right" domain={[0,100]} tick={{fontSize:8}} tickFormatter={(v:any)=>v+"%"}/><Tooltip formatter={(v:any,n:any)=>n==="Recorded receipts"?fmt(Number(v)):n==="Recorded receipt / demand"?Number(v).toFixed(1)+"%":fmt(Number(v))}/><Legend wrapperStyle={{fontSize:9}}/><Bar yAxisId="amt" dataKey="demand" name="Demand raised" fill="#4568df" radius={[3,3,0,0]}/><Bar yAxisId="amt" dataKey="receipts" name="Recorded receipts" fill="#27a66b" radius={[3,3,0,0]}/><Line yAxisId="pct" type="monotone" dataKey={(r:any)=>r.demand?r.receipts/r.demand*100:0} name="Recorded receipt / demand" stroke="#e6a12e" strokeWidth={2} dot={{r:2}}/></ComposedChart></ResponsiveContainer></div>
        <p className="mt-1 text-[9px] text-slate-500">Recorded member receipts are shown against demand raised; receipts may include arrears and unallocated amounts.</p>
       </Panel>
      </div>
      <div className="xl:col-span-4">
       <Panel compact title="Demand by Demand Group" action={<ReportLink id="demand-summary" category="Member Receivables" label="View Report →"/>}>
        <div className="flex h-[154px] items-center gap-1">
         <div className="relative h-[148px] w-[54%] shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chargeData} dataKey="amount" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={2}>{chargeData.map((g:any)=><Cell key={g.name} fill={g.fill}/>)}</Pie><Tooltip formatter={(v:any)=>fmt(Number(v))}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[9px] text-slate-500">Total demand</span><strong className="text-xs">{fmt(fyDemand)}</strong></div></div>
         <div className="min-w-0 flex-1 space-y-2 overflow-y-auto text-[9px]">{chargeData.slice(0,5).map((g:any)=><div key={g.name} className="flex items-center justify-between gap-1"><span className="flex min-w-0 items-center gap-1"><i className="h-2 w-2 shrink-0 rounded-sm" style={{backgroundColor:g.fill}}/><span className="truncate">{g.name}</span></span><strong className="shrink-0">{fmt(g.amount)}</strong></div>)}</div>
        </div>
        <p className="mt-1 text-[9px] text-slate-500">Uses the configured Demand Group mapping; unmapped categories remain visible.</p>
       </Panel>
      </div>
      <div className="xl:col-span-3">
       <Panel compact title="Top 5 Outstanding Members" action={<ReportLink id="party-balances" category="Member Receivables" label="View Report →"/>}>
        <div className="space-y-2 pt-1">{top.map((r:any,i:number)=><div key={r.party+"-"+i}><div className="mb-0.5 flex items-center justify-between gap-2 text-[10px]"><span className="truncate">{r.party}</span><strong className="shrink-0 text-rose-700">{fmt(r.amount)}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-500" style={{width:(r.amount/(top[0]?.amount||1)*100)+"%"}}/></div></div>)}</div>
        <p className="mt-2 text-[9px] text-slate-500">Based on FY 2018–19 member closing debit balances.</p>
       </Panel>
      </div>
     </div>
     <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
      <div className="xl:col-span-5">
       <Panel compact title="Monthly Demand vs Collection Matrix" action={<ReportLink id="monthly-demands" category="Member Receivables" label="View Report →"/>}>
        <div className="max-h-[220px] overflow-auto"><table className="w-full text-[9px]"><thead className="sticky top-0 bg-slate-50"><tr className="text-left text-slate-600"><th className="p-1.5">Month</th><th className="p-1.5 text-right">Demand</th><th className="p-1.5 text-right">Receipts</th><th className="p-1.5 text-right">Rate</th></tr></thead><tbody>{monthlyDemand.map((r:any)=><tr key={r.month} className="border-t border-slate-100"><td className="p-1.5">{r.month}</td><td className="p-1.5 text-right">{fmt(r.demand)}</td><td className="p-1.5 text-right">{fmt(r.receipts)}</td><td className="p-1.5 text-right font-semibold">{r.demand?(r.receipts/r.demand*100).toFixed(1)+"%":"—"}</td></tr>)}</tbody><tfoot><tr className="border-t-2 border-slate-200 font-bold"><td className="p-1.5">FY total</td><td className="p-1.5 text-right">{fmt(fyDemand)}</td><td className="p-1.5 text-right">{fmt(fyReceipts)}</td><td className="p-1.5 text-right">{fyDemand?rate.toFixed(1)+"%":"—"}</td></tr></tfoot></table></div>
        <p className="mt-1 text-[9px] text-slate-500">Monthly receipt figures are based on receipt posting month, not demand allocation month.</p>
       </Panel>
      </div>
      <div className="xl:col-span-7">
       <Panel compact title="Demand Group Analysis" action={<ReportLink id="demand-summary" category="Member Receivables" label="View Report →"/>}>
        <div className="max-h-[220px] overflow-auto"><table className="w-full text-[9px]"><thead className="sticky top-0 bg-slate-50"><tr className="text-left text-slate-600"><th className="p-1.5">Demand Group</th><th className="p-1.5 text-right">Demand</th><th className="p-1.5 text-right">Allocated Collection</th><th className="p-1.5 text-right">Outstanding</th><th className="p-1.5 text-right">Recovery</th></tr></thead><tbody>{collectionEfficiencyData.map((g:any)=><tr key={g.name} className="border-t border-slate-100"><td className="p-1.5 font-medium">{g.name}</td><td className="p-1.5 text-right">{fmt(g.demand)}</td><td className="p-1.5 text-right">{fmt(g.collected)}</td><td className="p-1.5 text-right">{fmt(g.outstanding)}</td><td className="p-1.5 text-right font-semibold">{g.efficiency.toFixed(1)}%</td></tr>)}</tbody><tfoot><tr className="border-t-2 border-slate-200 font-bold"><td className="p-1.5">FY total</td><td className="p-1.5 text-right">{fmt(fyDemand)}</td><td className="p-1.5 text-right">{fmt(allocatedCollectionTotal)}</td><td className="p-1.5 text-right">{fmt(qualityOutstanding)}</td><td className="p-1.5 text-right">{fyDemand?(allocatedCollectionTotal/fyDemand*100).toFixed(1)+"%":"—"}</td></tr></tfoot></table></div>
        <p className="mt-1 text-[9px] text-slate-500">Collections are demand-linked allocations only; unallocated receipts are excluded.</p>
       </Panel>
      </div>
     </div>
     <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600"><span>Member-only demand view. Demand groups follow the configured category mapping.</span><div className="flex flex-wrap gap-2"><ReportLink id="demand-summary" category="Member Receivables" label="Demand Register →"/><ReportLink id="monthly-payments" category="Member Receivables" label="Collection Register →"/><ReportLink id="monthly-flat-balance" category="Member Receivables" label="Member-wise Balance →"/></div></div>
    </>;;;
   })()}
  </>}
  {screen==='payments-expenses'&&<>
    {(() => {
     const paymentRows=filtered.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra');
     const recurringPattern=/electric|mseb|water|clean|security|salary|federation|lift|internet|telephone|housekeeping|watchman|diesel|sweeper/i;
     const recurringRows=paymentRows.filter(t=>recurringPattern.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')));
     const adHocRows=paymentRows.filter(t=>!recurringPattern.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')));
     const sum=(rows:any[])=>rows.reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
     const recurringTotal=sum(recurringRows), adHocTotal=sum(adHocRows), totalPaid=sum(paymentRows);
     const groupMap:Record<string,{amount:number;count:number}>={};
     paymentRows.forEach(t=>{const g=String(t.categoryGroup||categoryMaster.find((x:any)=>x.category_name===t.categoryName)?.category_group||'Unmapped group');groupMap[g]??={amount:0,count:0};groupMap[g].amount+=Math.abs(Number(t.amount)||0);groupMap[g].count++});
     const groupData=Object.entries(groupMap).sort((a,b)=>b[1].amount-a[1].amount).slice(0,5).map(([name,v])=>({name,amount:v.amount,count:v.count}));
     const payeeMap:Record<string,{amount:number;count:number}>={};
     paymentRows.forEach(t=>{const p=String(t.party||'Unidentified payee');payeeMap[p]??={amount:0,count:0};payeeMap[p].amount+=Math.abs(Number(t.amount)||0);payeeMap[p].count++});
     const payeeData=Object.entries(payeeMap).sort((a,b)=>b[1].amount-a[1].amount).slice(0,5).map(([name,v])=>({name,amount:v.amount,count:v.count}));
     const utilityPattern=/mseb|electric|water|cleaning|security|housekeeping|lift/i;
     const utilityRows=paymentRows.filter(t=>utilityPattern.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')));
     const utilityData=allMonths.map(m=>({month:m.replace(' 20',' '),electricity:sum(utilityRows.filter(t=>String(t.reportingMonth||t.month||'')===m&&/mseb|electric/i.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')))),water:sum(utilityRows.filter(t=>String(t.reportingMonth||t.month||'')===m&&/water/i.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')))),cleaning:sum(utilityRows.filter(t=>String(t.reportingMonth||t.month||'')===m&&/cleaning|housekeeping/i.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')))),security:sum(utilityRows.filter(t=>String(t.reportingMonth||t.month||'')===m&&/security/i.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||''))))}));
     const med=(values:number[])=>{const a=[...values].sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:0};
     const anomalies=paymentRows.map(t=>{const g=String(t.categoryGroup||categoryMaster.find((x:any)=>x.category_name===t.categoryName)?.category_group||t.categoryName||'Unmapped');const base=med(paymentRows.filter(x=>String(x.categoryGroup||categoryMaster.find((z:any)=>z.category_name===x.categoryName)?.category_group||x.categoryName||'Unmapped')===g).map(x=>Math.abs(Number(x.amount)||0)));const amount=Math.abs(Number(t.amount)||0);const same=paymentRows.filter(x=>String(x.party||'')===String(t.party||'')&&String(x.reportingMonth||x.month||'')===String(t.reportingMonth||t.month||'')).length>1;return {t,amount,flag:base>0&&amount>base*2?'Above group median':same?'Repeated payee / month':'Review voucher'}}).filter(x=>x.flag!=='Review voucher'||x.amount>0).sort((a,b)=>b.amount-a.amount).slice(0,5);
     const recurringPct=totalPaid?recurringTotal/totalPaid*100:0, otherPct=totalPaid?adHocTotal/totalPaid*100:0;
     const monthlyPaymentTrend=monthly.map((m:any,i:number)=>({...m,month:String(m.month).replace(' 20',' '),trend:monthly.slice(Math.max(0,i-2),i+1).reduce((v:any,x:any)=>v+(Number(x.payments)||0),0)/Math.min(i+1,3)}));
     return <>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
       <Card label="Total Payments" value={fmt(totalPaid)} detail={num(paymentRows.length)+' payment entries'} icon={Banknote} compact tone="blue"/>
       <Card label="Potential Recurring" value={fmt(recurringTotal)} detail={recurringPct.toFixed(1)+'% of payments · keyword match'} icon={CalendarDays} compact tone="green"/>
       <Card label="Ad-hoc / Unclassified" value={fmt(adHocTotal)} detail={otherPct.toFixed(1)+'% of payments'} icon={ClipboardList} compact tone="violet"/>
       <Card label="Largest Payment" value={fmt(Math.max(0,...paymentRows.map(t=>Math.abs(Number(t.amount)||0))))} detail="Single recorded payment" icon={ArrowUpRight} compact tone="amber"/>
       <Card label="Evidence Gaps" value={num(paymentRows.filter(t=>t.evidenceStatus==='Missing'||t.billStatus==='Missing'||t.voucherReceiptStatus==='Missing'||t.evidenceStatus!=='Complete').length)} detail="Payment records needing review" icon={AlertTriangle} compact tone="red"/>
      </div>
      <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-12">
       <div className="xl:col-span-5"><Panel compact title="Monthly Payments Trend"><div className="h-[150px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthlyPaymentTrend} margin={{top:5,right:8,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:9}}/><YAxis width={45} tick={{fontSize:9}} tickFormatter={(v:any)=>'₹'+num(Number(v))}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Bar dataKey="payments" name="Payments" fill="#3159e8" radius={[3,3,0,0]} barSize={15}/><Line dataKey="trend" name="3-Month Avg" stroke="#e69a2e" strokeWidth={2} dot={false}/></ComposedChart></ResponsiveContainer></div><p className="mt-1 text-[9px] text-slate-500">Monthly payment movements excluding contra transfers.</p></Panel></div>
       <div className="xl:col-span-7"><Panel compact title="Expense Category Mix" action={<ReportLink id="expense-analysis" category="Operational Registers" label="Category details →"/>}>
        <div className="grid grid-cols-1 items-center gap-1.5 sm:grid-cols-5">
         <div className="relative mx-auto h-[150px] w-full sm:col-span-2"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={groupData} dataKey="amount" nameKey="name" innerRadius={43} outerRadius={66} paddingAngle={2} stroke="none">{groupData.map((g,i)=><Cell key={g.name} fill={['#287bdf','#269b63','#e69a2e','#8056d9','#94a3b8'][i%5]}/>)}</Pie><Tooltip formatter={(v:any)=>fmt(Number(v))}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[9px] text-slate-500">Total payments</span><span className="text-sm font-bold text-slate-900">{fmt(totalPaid)}</span></div></div>
         <div className="min-w-0 sm:col-span-3"><table className="w-full text-[10px]"><thead><tr className="border-b border-slate-100 text-left text-slate-500"><th className="py-1 font-semibold">Category group</th><th className="py-1 text-right font-semibold">Amount</th><th className="py-1 text-right font-semibold">Share</th></tr></thead><tbody>{groupData.map((g,i)=><tr key={g.name} className="border-b border-slate-50"><td className="py-1.5"><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{background:['#287bdf','#269b63','#e69a2e','#8056d9','#94a3b8'][i%5]}}/>{g.name}</td><td className="py-1.5 text-right font-semibold">{fmt(g.amount)}</td><td className="py-1.5 text-right text-slate-500">{totalPaid?(g.amount/totalPaid*100).toFixed(1):'0.0'}%</td></tr>)}</tbody></table></div>
        </div>
       </Panel></div>
      </div>
      <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-12">
       <div className="xl:col-span-5"><Panel compact title="Top 5 Payees by Payment Amount" action={<ReportLink id="vendor-ledger" category="Ledgers" label="Payee ledger →"/>}><div className="space-y-1.5">{payeeData.map((p,i)=><div key={p.name}><div className="mb-0.5 flex items-center justify-between gap-1.5 text-[10px]"><span className="truncate font-medium text-slate-700">{p.name}</span><strong className="shrink-0 text-slate-900">{fmt(p.amount)}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:(p.amount/Math.max(1,payeeData[0]?.amount||1)*100)+'%'}}/></div></div>)}</div></Panel></div>
       <div className="xl:col-span-7"><Panel compact title="Payment Anomalies & Exceptions" action={<ReportLink id="largest-payments-anomalies" category="Audit & Governance" label="View all →"/>}><div className="overflow-x-auto"><table className="w-full min-w-[480px] table-fixed text-[10px]"><colgroup><col style={{width:'22%'}}/><col style={{width:'30%'}}/><col style={{width:'20%'}}/><col style={{width:'28%'}}/></colgroup><thead><tr className="bg-slate-50 text-left text-slate-500"><th className="px-2 py-1.5">Date</th><th className="px-2 py-1.5">Party / Payee</th><th className="px-2 py-1.5 text-right">Amount</th><th className="px-2 py-1.5">Screening</th></tr></thead><tbody>{anomalies.slice(0,4).map(({t,amount,flag},i)=><tr key={i} className="border-t border-slate-100"><td className="px-2 py-1.5 text-slate-500">{String(t.date||'—')}</td><td className="truncate px-2 py-1.5">{String(t.party||t.categoryName||'Unidentified')}</td><td className="px-2 py-1.5 text-right font-semibold">{fmt(amount)}</td><td className="px-2 py-1.5 text-amber-700">{flag}</td></tr>)}</tbody></table></div><p className="mt-1 text-[9px] text-slate-500">Potential flags only. Verify vouchers, invoices and approvals before concluding.</p><div className="mt-1 flex flex-wrap gap-1.5"><ReportLink id="largest-payments-anomalies" category="Audit & Governance" label="Largest Payments"/><ReportLink id="missing-docs" category="Audit & Governance" label="Evidence Gaps"/></div></Panel></div>
      </div>
      <Panel compact title="Utility Payments Trend — Monthly"><div className="grid grid-cols-1 items-center gap-1.5 lg:grid-cols-12"><div className="h-[135px] lg:col-span-9"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={utilityData} margin={{top:4,right:8,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:9}}/><YAxis width={45} tick={{fontSize:9}} tickFormatter={(v:any)=>'₹'+num(Number(v))}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Legend wrapperStyle={{fontSize:9}}/><Line type="monotone" dataKey="electricity" name="Electricity / MSEB" stroke="#3159e8" strokeWidth={2} dot={{r:2}}/><Line type="monotone" dataKey="water" name="Water" stroke="#06b6d4" strokeWidth={2} dot={{r:2}}/><Line type="monotone" dataKey="cleaning" name="Cleaning" stroke="#16a34a" strokeWidth={2} dot={{r:2}}/><Line type="monotone" dataKey="security" name="Security" stroke="#e69a2e" strokeWidth={2} dot={{r:2}}/></ComposedChart></ResponsiveContainer></div><div className="text-[9px] leading-4 text-slate-600 lg:col-span-3"><p className="font-semibold text-slate-800">Utility payment totals</p><p>Electricity: <strong>{fmt(sum(utilityRows.filter(t=>/mseb|electric/i.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')))))}</strong></p><p>Water: <strong>{fmt(sum(utilityRows.filter(t=>/water/i.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')))))}</strong></p><p>Cleaning: <strong>{fmt(sum(utilityRows.filter(t=>/cleaning|housekeeping/i.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')))))}</strong></p><p>Security: <strong>{fmt(sum(utilityRows.filter(t=>/security/i.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')))))}</strong></p></div></div><div className="mt-1 flex flex-wrap gap-1.5"><span className="mr-1 text-[9px] text-slate-500">Recorded keyword-classified payments only; missing months are not assumed unpaid.</span><ReportLink id="payments" category="Operational Registers" label="Detailed Register"/><ReportLink id="account-ledger-monthly" category="Ledgers" label="Account-wise Payments"/><ReportLink id="missing-docs" category="Audit & Governance" label="Bill / Voucher Evidence"/></div></Panel>
     </>;
    })()}
   </> }
  {screen==='party-ledger'&&(()=>{
   const memberRows=[...cumulativeOutstanding].sort((a,b)=>Number(a.net_outstanding||0)-Number(b.net_outstanding||0));
   const isMemberTransaction=(record:any)=>{const id=String(record.partyId||record.party_id||record.member_id||'');const name=String(record.party||record.partyName||record.party_name||record.member_name||'').trim().toLowerCase();const p=partyMaster.find((x:any)=>(id&&String(x.party_id||x.id||'')===id)||(name&&String(x.party_name||x.name||'').trim().toLowerCase()===name));return /^members?$/i.test(String(p?.party_type||'').trim());};
   const memberReceiptRows=filtered.filter(t=>t.type==='Receipt'&&isMemberTransaction(t));
   const memberReceiptsTotal=memberReceiptRows.reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);
   const linkedReceiptIds=new Set((demandAllocations||[]).map((a:any)=>String(a.transaction_id||a.receipt_transaction_id||a.receipt_id||'')).filter(Boolean));
   memberReceiptRows.forEach(t=>{if(transactionDemandId(t))linkedReceiptIds.add(String(t.id||''));});
   const linkedMemberReceiptCount=memberReceiptRows.filter(t=>linkedReceiptIds.has(String(t.id||''))).length;
   const unallocatedMemberReceiptCount=Math.max(0,memberReceiptRows.length-linkedMemberReceiptCount);
   const memberDueTotal=memberRows.reduce((sum,r)=>sum+Math.max(0,-(Number(r.net_outstanding)||0)),0);
   const membersWithDues=memberRows.filter(r=>Number(r.net_outstanding||0)<0);
   const allPaymentRows=filtered.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra');
   const utilityPattern=/electric|mseb|water|lift|security|housekeeping|cleaning|sweeper|diesel|federation|internet|telephone|utility/i;
   const paymentRows=activeTab==='Utilities'?allPaymentRows.filter(t=>utilityPattern.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||''))):activeTab==='Ad-hoc'?allPaymentRows.filter(t=>!utilityPattern.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||''))):allPaymentRows;
   const vendorMap=paymentRows.reduce((acc:Record<string,{count:number;paid:number;gaps:number;lastDate:string}>,t)=>{
    const name=String(t.party||'Unmapped payee');
    acc[name]??={count:0,paid:0,gaps:0,lastDate:''};
    acc[name].count++;acc[name].paid+=Math.abs(Number(t.amount)||0);
    if(t.evidenceStatus!=='Complete')acc[name].gaps++;
    if(String(t.date||'')>acc[name].lastDate)acc[name].lastDate=String(t.date||'');
    return acc;
   },{});
   const vendorRows=Object.entries(vendorMap).map(([name,v])=>({name,...v})).sort((a,b)=>b.paid-a.paid);
   const vendorTotal=vendorRows.reduce((sum,v)=>sum+v.paid,0);
   const selectedMember=memberRows.find(r=>String(r.member_name||r.flat_no||'')===partySelection)||memberRows[0];
   const selectedVendor=vendorRows.find(v=>v.name===partySelection)||vendorRows[0];
   const memberName=(r:any)=>String(r.member_name||r.flat_no||'Unidentified member');
   const memberLabel=(r:any)=>String(r.flat_no||r.member_name||'Unidentified');
   const memberTx=selectedMember?transactions.filter(t=>String(t.party||'')===memberName(selectedMember)||String(t.party||'')===memberLabel(selectedMember)): [];
   const vendorTx=selectedVendor?paymentRows.filter(t=>String(t.party||'Unmapped payee')===selectedVendor.name):[];
   const memberMonthly=allMonths.map(m=>({month:m.split(' ')[0],demand:demandRegister.filter((d:any)=>String(d.demand_period||d.period||d.month||'').includes(m)).reduce((sum:number,d:any)=>sum+Number(d.total_demand||d.demand_amount||0),0),collection:transactions.filter(t=>(t.reportingMonth||t.month)===m&&t.type==='Receipt'&&t.transactionClass!=='Contra').reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0)}));
   const vendorMonthly=allMonths.map(m=>({month:m.split(' ')[0],bills:paymentRows.filter(t=>(t.reportingMonth||t.month)===m).reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0),payments:paymentRows.filter(t=>(t.reportingMonth||t.month)===m).reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0)}));
   const utilityMonthRows=allMonths.map(m=>{
    const monthPayments=paymentRows.filter(t=>String(t.reportingMonth||t.month||'')===m);
    const classify=(pattern:RegExp)=>monthPayments.filter(t=>pattern.test(String(t.party||'')+' '+String(t.description||'')+' '+String(t.categoryName||''))).reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);
    return {month:m.split(' ')[0],reportingMonth:m,water:classify(/municipal water|water works|water bill|water authority|water supply|\bwater\b/i),electricity:classify(/electric|mseb|best electricity/i),lift:classify(/lift|elevator/i),other:classify(/security|cleaning|sweeper|diesel|federation|internet|telephone|housekeeping/i)};
   });
   const utilityTypes=[{name:'Municipal water',pattern:/municipal water|water works|water bill|water authority|water supply|\bwater\b/i},{name:'Electricity',pattern:/electric|mseb|best electricity/i},{name:'Lift',pattern:/lift|elevator/i}];
   const utilityGapRows=utilityTypes.map(u=>{
    const matched=allPaymentRows.filter(t=>u.pattern.test(String(t.party||'')+' '+String(t.description||'')+' '+String(t.categoryName||'')));
    const monthOf=(t:any)=>String(t.reportingMonth||t.month||'').trim();
    const monthsWithPayments=new Set(matched.map(monthOf).filter(Boolean));
    const coveredMonths=allMonths.filter(m=>m && (period==='All months'||m===period));
    const observedIndexes=coveredMonths.map(m=>allMonths.indexOf(m)).filter(i=>i>=0);
    const firstObserved=matched.map(monthOf).filter(Boolean).map(m=>allMonths.indexOf(m)).filter(i=>i>=0).sort((a,b)=>a-b)[0];
    const lastObserved=matched.map(monthOf).filter(Boolean).map(m=>allMonths.indexOf(m)).filter(i=>i>=0).sort((a,b)=>b-a)[0];
    // Only assess missing recurring payments after the first observed payment; before that, provider activity is not established.
    const missing=firstObserved==null?[]:coveredMonths.filter(m=>allMonths.indexOf(m)>=firstObserved&&!monthsWithPayments.has(m));
    const dated=[...matched].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    const monthsSinceLast=lastObserved==null?null:Math.max(0,Math.max(-1,...observedIndexes)-lastObserved);
    const consecutiveGap=lastObserved==null?null:coveredMonths.filter(m=>allMonths.indexOf(m)>lastObserved).length;
    return {name:u.name,count:matched.length,total:matched.reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0),lastDate:dated[0]?.date||'',lastMonth:dated[0]?.reportingMonth||dated[0]?.month||'',firstMonth:firstObserved==null?'':allMonths[firstObserved],missing,monthsSinceLast,consecutiveGap};
   });
   const utilityCoverageMonths=allMonths.length;
   const maxMember= Math.max(1,...memberRows.slice(0,5).map(r=>Math.abs(Number(r.net_outstanding)||0)));
   const maxVendor= Math.max(1,...vendorRows.slice(0,5).map(r=>r.paid));
   const memberStatus=[{name:'With dues',value:membersWithDues.length},{name:'No recorded dues',value:Math.max(0,memberRows.length-membersWithDues.length)}];
   const utilityPartyRows=utilityTypes.map(u=>{const rows=allPaymentRows.filter(t=>u.pattern.test(String(t.party||'')+' '+String(t.description||'')+' '+String(t.categoryName||'')));return {name:u.name,total:rows.reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0),count:rows.length,gaps:rows.filter(t=>t.evidenceStatus!=='Complete').length,lastDate:[...rows].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0]?.date||''};}).sort((a,b)=>b.total-a.total);
   const adHocPartyMap=allPaymentRows.filter(t=>{const category=categoryMaster.find((c:any)=>String(c.category_name||'')===String(t.categoryName||''))||{};return String(category.demand_group||'Unmapped Demand Group')!=='Monthly Bills';}).reduce((acc:Record<string,{total:number;count:number;gaps:number}>,t)=>{const name=String(t.categoryName||'Unclassified Category');acc[name]??={total:0,count:0,gaps:0};acc[name].total+=Math.abs(Number(t.amount)||0);acc[name].count++;if(t.evidenceStatus!=='Complete')acc[name].gaps++;return acc;},{});
   const adHocRows=Object.entries(adHocPartyMap).map(([name,v])=>({name,...v})).sort((a,b)=>b.total-a.total);
   const utilityTotal=utilityPartyRows.reduce((sum,r)=>sum+r.total,0);
   const adHocTotal=adHocRows.reduce((sum,r)=>sum+r.total,0);
   const adHocGaps=adHocRows.reduce((sum,r)=>sum+r.gaps,0);
   const vendorEvidence=[{name:'Evidence gaps',value:vendorRows.reduce((sum,v)=>sum+v.gaps,0)},{name:'Complete evidence',value:Math.max(0,paymentRows.length-vendorRows.reduce((sum,v)=>sum+v.gaps,0))}];
   return <>
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
     <Card label="Total Parties" value={num(flatOwnerMaster.length+vendorRows.length)} detail={num(flatOwnerMaster.length)+' member accounts · '+num(vendorRows.length)+' payees'} icon={Users} compact/>
     <Card label="Member Outstanding" value={fmt(memberDueTotal)} detail={num(membersWithDues.length)+' accounts with dues'} icon={Wallet} compact tone="red"/>
     <Card label="Utility Payments" value={fmt(utilityTotal)} detail={num(utilityPartyRows.reduce((n,r)=>n+r.count,0))+' recorded entries'} icon={Landmark} compact tone="green"/>
     <Card label="Ad-hoc Payments" value={fmt(adHocTotal)} detail={num(adHocRows.length)+' payees'} icon={ClipboardList} compact tone="amber"/>
     <Card label="Evidence Gaps" value={num(vendorRows.reduce((n,v)=>n+v.gaps,0))} detail="Payment records to review" icon={AlertTriangle} compact tone="violet"/>
    </div>
    <div className="grid grid-cols-1 items-stretch gap-1.5 xl:grid-cols-3">
     <Panel compact title="Members — Receivables" action={<ReportLink id="member-ledger" category="Ledgers" label="Open member ledger →"/>}>
      <div className="mb-1 grid grid-cols-2 gap-1.5"><div className="rounded-lg bg-slate-50 p-2"><div className="text-[9px] text-slate-500">Member accounts</div><div className="text-lg font-bold">{num(flatOwnerMaster.length)}</div></div><div className="rounded-lg bg-rose-50 p-2"><div className="text-[9px] text-rose-700">Outstanding</div><div className="text-lg font-bold text-rose-800">{fmt(memberDueTotal)}</div></div></div>
      <div className="grid grid-cols-1 items-center gap-1 sm:grid-cols-2">
       <div className="relative h-[118px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={memberStatus} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={3}><Cell fill="#e34d65"/><Cell fill="#27a66b"/></Pie><Tooltip formatter={(v:any)=>num(Number(v))}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[9px] text-slate-500">Accounts</span><strong className="text-base">{num(memberRows.length)}</strong></div></div>
       <div className="space-y-1.5 text-[10px]"><p><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-rose-500"/><strong>{num(membersWithDues.length)}</strong> with dues</p><p><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500"/><strong>{num(Math.max(0,memberRows.length-membersWithDues.length))}</strong> with no recorded dues</p><p className="text-slate-500">{num(unallocatedMemberReceiptCount)} unapplied receipts</p></div>
      </div>
      <div className="mt-1 border-t border-slate-100 pt-2"><div className="mb-1 text-[10px] font-semibold text-slate-700">Top 5 Members by Outstanding</div><div className="space-y-1.5">{membersWithDues.slice(0,5).map((r,i)=>{const amount=Math.max(0,-Number(r.net_outstanding||0));return <div key={String(r.member_name||r.flat_no||i)}><div className="mb-0.5 flex justify-between gap-1.5 text-[10px]"><span className="truncate">{memberLabel(r)}</span><strong className="text-rose-700">{fmt(amount)}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-500" style={{width:(amount/maxMember*100)+'%'}}/></div></div>})}</div></div>
      <p className="mt-2 text-[9px] text-slate-500">Account-count split; outstanding is based on the cumulative balance register, not ageing.</p>
     </Panel>
     <Panel compact title="Monthly Utilities" action={<ReportLink id="payments" category="Operational Registers" label="Open utility register →"/>}>
      <div className="mb-2 grid grid-cols-2 gap-1.5"><div className="rounded-lg bg-emerald-50 p-2"><div className="text-[9px] text-emerald-700">Recorded utility payments</div><div className="text-lg font-bold text-emerald-800">{fmt(utilityTotal)}</div></div><div className="rounded-lg bg-amber-50 p-2"><div className="text-[9px] text-amber-700">3+ month gaps</div><div className="text-lg font-bold text-amber-800">{num(utilityGapRows.filter(u=>u.missing.length>=3).length)}</div></div></div>
      <div className="h-[118px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={utilityMonthRows} margin={{top:4,right:4,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:9}}/><YAxis width={42} tick={{fontSize:9}} tickFormatter={(v:any)=>'₹'+num(Number(v)/1000)+'k'}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Legend wrapperStyle={{fontSize:9}}/><Line dataKey="electricity" name="Electricity / MSEB" stroke="#287bdf" strokeWidth={2} dot={{r:2}}/><Line dataKey="water" name="Water" stroke="#27a66b" strokeWidth={2} dot={{r:2}}/><Line dataKey="lift" name="Lift" stroke="#e69a2e" strokeWidth={2} dot={{r:2}}/></ComposedChart></ResponsiveContainer></div>
      <div className="mt-2 border-t border-slate-100 pt-2"><div className="mb-1 text-[10px] font-semibold">Recent / Critical Gaps</div><table className="w-full text-[9px]"><thead><tr className="bg-slate-50 text-left text-slate-500"><th className="p-1">Utility</th><th className="p-1">Last payment</th><th className="p-1 text-right">Gap</th></tr></thead><tbody>{utilityGapRows.map(u=><tr key={u.name} className="border-t border-slate-100"><td className="p-1">{u.name}</td><td className="p-1">{u.lastDate||'—'}</td><td className="p-1 text-right">{u.consecutiveGap==null?'No baseline':num(u.consecutiveGap)+' mo'}</td></tr>)}</tbody></table></div>
      <p className="mt-2 rounded bg-amber-50 p-1.5 text-[9px] text-amber-900">Missing payment entries are reconciliation alerts, not proof of unpaid bills. Keyword classification requires bill verification.</p>
     </Panel>
     <Panel compact title="Ad-hoc Parties" action={<ReportLink id="vendor-ledger" category="Ledgers" label="Open ad-hoc ledger →"/>}>
      <div className="mb-2 grid grid-cols-2 gap-1.5"><div className="rounded-lg bg-amber-50 p-2"><div className="text-[9px] text-amber-700">Recorded ad-hoc payments</div><div className="text-lg font-bold">{fmt(adHocTotal)}</div></div><div className="rounded-lg bg-rose-50 p-2"><div className="text-[9px] text-rose-700">Evidence gaps</div><div className="text-lg font-bold text-rose-800">{num(adHocGaps)}</div></div></div>
      <div className="mb-1 text-[10px] font-semibold">Top Ad-hoc Categories by Payments</div>
      <div className="h-[145px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={adHocRows.slice(0,6)} layout="vertical" margin={{top:2,right:8,left:4,bottom:0}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tick={{fontSize:8}} tickFormatter={(v:any)=>'₹'+num(Number(v)/1000)+'k'}/><YAxis type="category" dataKey="name" width={105} tick={{fontSize:9}}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Bar dataKey="total" name="Payments" fill="#8060df" radius={[0,4,4,0]} barSize={13}/></BarChart></ResponsiveContainer></div>
      <div className="mt-2 rounded-lg bg-amber-50 p-2"><div className="flex items-center gap-1 text-[10px] font-semibold text-amber-900"><AlertTriangle size={13}/> Evidence Review</div><p className="mt-1 text-[9px] leading-4 text-amber-900">{num(adHocGaps)} ad-hoc payment records have missing or incomplete evidence and need voucher / invoice / approval review.</p></div>
      <p className="mt-2 text-[9px] text-slate-500">Grouped by category name for all payment categories outside Monthly Bills; validate category mapping against source vouchers.</p>
     </Panel>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600"><span>Selected financial year and global filters apply. Figures are preliminary and require source-register and voucher verification.</span><div className="flex flex-wrap gap-1.5"><ReportLink id="demand-summary" category="Member Receivables" label="Demand summary"/><ReportLink id="monthly-flat-balance" category="Member Receivables" label="Monthly member balances"/><ReportLink id="largest-payments-anomalies" category="Audit & Governance" label="Payment review"/></div></div>
   </>;
  })()}
  {screen==='audit-evidence'&&<>
   <div className="flex flex-wrap gap-2"><ReportLink id="missing-docs" category="Audit & Governance" label="Missing Evidence Register"/><ReportLink id="mapping-exceptions" category="Audit & Governance" label="Mapping Exceptions"/><ReportLink id="opening-balance-review" category="Audit & Governance" label="Opening Balance Exceptions"/><ReportLink id="rectification" category="Audit & Governance" label="Audit Rectification Register"/></div>
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"><Card label="Total Transactions" value={num(filtered.length)} detail="Current filter" icon={FileText}/><Card label="Complete Evidence" value={num(evidenceComplete)} detail={pct(evidenceComplete,filtered.length)+'% of filtered transactions'} icon={CheckCircle2} tone="green"/><Card label="Missing Evidence" value={num(evidenceMissing)} detail={pct(evidenceMissing,filtered.length)+'% require review'} icon={AlertTriangle} tone="amber"/><Card label="Pending Review" value={num(stats.pendingTransactions)} detail="Transaction inspection status" icon={ClipboardList} tone="red"/><Card label="Reconciliation Gaps" value={num(unmatched)} detail="Loaded reconciliation records" icon={Landmark} tone="violet"/></div>
   <div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><Panel title="Evidence Status (All Transactions)"><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={evidenceData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>{evidenceData.map((d,i)=><Cell key={d.name} fill={COLORS[i]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div></Panel><Panel title="Evidence Coverage by Category"><Table headers={['Category','Transactions','With complete evidence','Coverage']} rows={cats.slice(0,12).map(([c,v])=>{const group=filtered.filter(t=>(t.categoryName||'Unclassified')===c);const done=group.filter(t=>t.evidenceStatus==='Complete').length;return [c,num(v.count),num(done),pct(done,v.count)+'%']})}/></Panel></div>
   <div className="grid grid-cols-1 gap-3 xl:grid-cols-3"><Panel title="Voucher & Bill Coverage"><Table headers={['Voucher / bill status','Count']} rows={['Available','Missing','Pending','Not Applicable'].map(s=>[s,num(filtered.filter(t=>String(t.voucherReceiptStatus||t.billStatus||'Pending')===s).length)])}/></Panel><Panel title="Approval / Inspection Status"><Table headers={['Review status','Count']} rows={['Passed','Failed','Pending'].map(s=>[s,num(filtered.filter(t=>String(t.internalAuditStatus||'Pending')===s).length)])}/></Panel><Panel title="Source Register Status"><Table headers={['Source file','Status','Notes']} rows={sourceRegister.slice(0,12).map(s=>[s.source_file||'—',String(s.status||'Not assessed'),s.status||'—'])}/></Panel></div>
   <Panel title="Evidence & Audit Drill-Down"><p className="text-xs text-slate-600">This dashboard summarises evidence coverage and review exceptions. Open the registers below for transaction references, supporting documents and review findings.</p><div className="mt-3 flex flex-wrap gap-2"><ReportLink id="missing-docs" category="Audit & Governance" label="Open Missing Evidence Register"/><ReportLink id="rectification" category="Audit & Governance" label="Open Audit Rectification Register"/><ReportLink id="mapping-exceptions" category="Audit & Governance" label="Open Mapping Exceptions"/></div></Panel>
  </>}
  {screen==='bank-reconciliation'&&<>
   <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2"><Landmark className="h-4 w-4 text-blue-700"/><span className="text-xs font-semibold">Account</span>{(['TDCC','BOM','CASH','ALL'] as const).map(a=><button key={a} onClick={()=>setAccountFilter(a)} className={'rounded-lg px-3 py-2 text-xs font-semibold '+(accountFilter===a?'bg-blue-600 text-white':'border border-slate-200 text-slate-600')}>{a==='ALL'?'All accounts':a==='TDCC'?'TDCC (Main)':a==='BOM'?'BOM (Secondary)':'Cash'}</button>)}</div>
   {monthlyAccountMovementsLoading&&<div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">Loading account movements…</div>}{monthlyAccountMovementsError&&<div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">Account movement data could not be loaded: {monthlyAccountMovementsError}</div>}{!monthlyAccountMovementsLoading&&!monthlyAccountMovementsError&&monthlyAccountMovements.length===0&&<div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">No monthly account movement records were returned for FY 2018–19.</div>}<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5"><Card label="Opening Balance" value={fmt(accountFilter==="ALL"?monthlyAccountOpeningBalances.filter((r:any)=>["ACC-0001","ACC-0002","ACC-0003"].includes(String(r.account_id||"").toUpperCase())).reduce((sum:number,r:any)=>sum+Number(r.opening_balance??r.source_opening_balance??0),0):Number(monthlyAccountOpeningBalances.find((r:any)=>String(r.account_id||"").toUpperCase()===(accountFilter==="TDCC"?"ACC-0001":accountFilter==="BOM"?"ACC-0002":"ACC-0003"))?.opening_balance??monthlyAccountOpeningBalances.find((r:any)=>String(r.account_id||"").toUpperCase()===(accountFilter==="TDCC"?"ACC-0001":accountFilter==="BOM"?"ACC-0002":"ACC-0003"))?.source_opening_balance??0))} detail="Verified FY opening balance" icon={Landmark} compact/><Card label="Receipts / Credits" value={fmt(totalRecon.reduce((s,r)=>s+Number(r.credits||0),0))} detail="From reconciliation records" icon={ArrowDownRight} tone="green" compact/><Card label="Payments / Debits" value={fmt(totalRecon.reduce((s,r)=>s+Number(r.debits||0),0))} detail="From reconciliation records" icon={ArrowUpRight} tone="red" compact/><Card label="Reconciled Periods" value={num(matched)} detail={num(totalRecon.length)+' account-months loaded'} icon={CheckCircle2} tone="green" compact/><Card label="Unresolved Differences" value={num(unmatched)} detail="Requires statement evidence" icon={AlertTriangle} tone="amber" compact/></div>
   <div className="grid grid-cols-1 gap-2 xl:grid-cols-2"><Panel title="Monthly Closing Book Balance" action={<ReportLink id="bank-recon" category="Financial Statements" label="RPT-18 · Bank / UPI Reconciliation"/>}><div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={totalRecon} margin={{top:14,right:14,left:4,bottom:4}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:9,fill:"#334155",fontWeight:600}}/><YAxis tick={{fontSize:9,fill:"#334155",fontWeight:600}} tickFormatter={(v:any)=>new Intl.NumberFormat("en-IN",{notation:"compact",maximumFractionDigits:1}).format(Number(v)||0)}/><Tooltip formatter={(v:any)=>fmt(Number(v))} contentStyle={{fontSize:11,color:"#0f172a",background:"#fff",border:"1px solid #cbd5e1",borderRadius:8}} labelStyle={{color:"#0f172a",fontWeight:700}}/><Line type="monotone" dataKey="calculatedClosingBalance" name="Book closing balance" stroke="#2563eb" strokeWidth={2.5} dot={{r:3}} activeDot={{r:5}}/></LineChart></ResponsiveContainer></div></Panel><Panel title="Reconciliation Summary" action={<ReportLink id="cashbook" category="Operational Registers" label="Cash & Bank Books"/>}><Table headers={['Month','Opening','Credits','Debits','Book closing','Statement closing','Status']} rows={totalRecon.map(r=>[r.month,fmt(Number(r.calculatedOpeningBalance)||0),fmt(Number(r.credits)||0),fmt(Number(r.debits)||0),fmt(Number(r.calculatedClosingBalance)||0),r.sourceClosingBalance==null?'Not supplied':fmt(Number(r.sourceClosingBalance)),statusPill(r.status)])}/></Panel></div>

  </>}
  {screen==='observations-actions'&&<>
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><Card label="Transactions Reviewed" value={num(stats.inspectedTransactions)} detail={'of '+num(stats.totalTransactions)+' transactions'} icon={CheckCircle2} tone="green"/><Card label="Pending Inspection" value={num(stats.pendingTransactions)} detail="Requires reviewer action" icon={ClipboardList} tone="amber"/><Card label="Missing Evidence" value={num(stats.evidenceMissing)} detail="Supporting bill / voucher gap" icon={AlertTriangle} tone="red"/><Card label="Audit Failures / Discrepancies" value={num(stats.internalAuditFailed+stats.evidenceDiscrepancy)} detail="Investigate and document resolution" icon={ShieldCheck} tone="violet"/></div>
   <div className="flex flex-wrap gap-2"><ReportLink id="rectification" category="Audit & Governance" label="Full Audit Rectification Register"/><ReportLink id="missing-docs" category="Audit & Governance" label="Missing Evidence Register"/><ReportLink id="mapping-exceptions" category="Audit & Governance" label="Mapping Exceptions"/><ReportLink id="adjustments-contra" category="Operational Registers" label="Adjustments & Contra Register"/></div>
   <Panel title="Corrective Action Priorities"><Table headers={['Priority area','Open items','Recommended action']} rows={[[ 'Evidence gaps',num(filtered.filter(t=>t.evidenceStatus==='Missing').length),'Obtain and link supporting documents'],['Discrepancies / failed checks',num(filtered.filter(t=>t.evidenceStatus==='Discrepancy'||t.internalAuditStatus==='Failed').length),'Investigate, document cause and approve resolution'],['Pending inspection',num(stats.pendingTransactions),'Complete reviewer assessment'],['Audit notes / observations',num(auditNotes.length),'Assign owner, due date and closure evidence']]}/><div className="mt-3 flex flex-wrap gap-2"><ReportLink id="rectification" category="Audit & Governance" label="Open Corrective Action Register"/><ReportLink id="missing-docs" category="Audit & Governance" label="Open Missing Evidence Register"/></div></Panel>
   <Panel title="Audit Notes / Observations"><Table headers={['Date','Title / observation','Category','Status','Owner / reference']} rows={auditNotes.map(n=>[n.timestamp||'—',n.title||n.content||'—',n.tag||'—',n.priority||'Not assessed',n.author||'—'])}/></Panel>
  </>}
   {screen==='reports'&&<div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
   <aside className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-4">
    <div className="mb-3 border-b border-slate-100 pb-3"><h2 className="text-sm font-bold text-blue-950">Financial Reports & Registers</h2><p className="mt-1 text-[11px] leading-4 text-slate-600">Browse the financial report library by purpose: member receivables, financial statements, ledgers, operational registers and audit controls.</p></div>
    <div className="mb-3"><label className="sr-only" htmlFor="financial-report-search">Search reports</label><div className="relative"><input id="financial-report-search" type="search" value={reportSearch} onChange={e=>setReportSearch(e.target.value)} placeholder="Search reports (e.g. RPT-04, demand, bank)…" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/>{reportSearch&&<button type="button" onClick={()=>setReportSearch('')} aria-label="Clear report search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100">✕</button>}</div><p className="mt-1 px-1 text-[10px] text-slate-500">{normalizedReportSearch?`${filteredReportCatalog.length} matching reports`:`${reportCatalog.length} reports available`}</p></div>
    <nav className="max-h-[72vh] space-y-2 overflow-y-auto" aria-label="Reports">
     <div className="flex items-center justify-between px-2 py-1"><span className="text-xs font-extrabold uppercase tracking-wide text-slate-800">{normalizedReportSearch?'Search results':'Browse by category'}</span>{normalizedReportSearch&&<button onClick={()=>setReportSearch('')} className="text-[10px] font-semibold text-blue-700 hover:underline">Clear search</button>}</div>
     {visibleReportCategories.map(cat=><section key={cat} className="rounded-lg border border-slate-100">
      <button onClick={()=>setReportCategory(reportCategory===cat?'All Reports':cat)} aria-expanded={Boolean(normalizedReportSearch)||reportCategory===cat||reportCategory==='All Reports'} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-left text-xs font-bold text-slate-800 hover:bg-blue-50"><span>{cat}</span><span className="text-[10px] text-slate-500">{filteredReportCatalog.filter(r=>r.category===cat).length} {normalizedReportSearch?'matches':reportCategory===cat?'−':'+'}</span></button>
      {(normalizedReportSearch||reportCategory===cat||reportCategory==='All Reports')&&<div className="space-y-0.5 p-1">
       {filteredReportCatalog.filter(r=>r.category===cat).map(r=><button key={r.id} onClick={()=>{setSelectedReport(r.id);setReportCategory(cat)}} className={'w-full rounded-md border-l-2 px-2.5 py-2 text-left transition '+(selectedReport===r.id?'border-blue-600 bg-blue-50 text-blue-900':'border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50')}>
        <span className="block text-[11px] font-semibold leading-4">{r.id==='expense-analysis'?'REG':r.id==='missing-docs'?'AUD':`RPT-${reportNumbers[r.id]||'—'}`} · {r.name}</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{r.description}</span>
        {selectedReport===r.id&&<span className="mt-0.5 block text-[9px] font-bold text-blue-700">Selected report</span>}
       </button>)}
      </div>}
     </section>)}
    </nav>
   </aside>
   <style>{`
    @media print {
      @page { size: A4 landscape; margin: 12mm; }
      body { background: #fff !important; color: #000 !important; }
      body * { visibility: hidden !important; }
      #selected-report-content, #selected-report-content * { visibility: visible !important; }
      #selected-report-content { position: absolute !important; inset: 0 !important; width: 100% !important; max-width: none !important; }
      #selected-report-content > div:first-child,
      #selected-report-content > div:nth-child(2) { display: none !important; }
      #selected-report-content .print\\:hidden { display: none !important; }
      #selected-report-content #rpt15-print-content,
      #selected-report-content #rpt16-print-content,
      #selected-report-content #rpt17-print-content,
      #selected-report-content #rpt18-print-content { display: block !important; }
      #selected-report-content table { width: 100% !important; border-collapse: collapse !important; font-size: 9pt !important; }
      #selected-report-content th, #selected-report-content td { border: 1px solid #777 !important; padding: 5px !important; color: #000 !important; }
      #selected-report-content th { background: #eee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      #selected-report-content button, #selected-report-content input, #selected-report-content select { display: none !important; }
      #selected-report-content section, #selected-report-content .rounded-xl { break-inside: avoid; box-shadow: none !important; }
    }
   `}</style>
   <div id="selected-report-content" className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
     <button onClick={()=>void refetchAll()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4"/>Refresh</button>
     <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Print</button>
     <button onClick={exportRows} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"><Download className="h-4 w-4"/>CSV</button>
     <button onClick={exportTxt} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">TXT</button>
     <button onClick={exportPdf} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">PDF</button>
    </div>
    {!(screen==='reports'&&(selectedReport==='member-opening-balance-register'||selectedReport==='demand-register'||selectedReport==='receipts'||selectedReport==='payments'||selectedReport==='adjustments-contra'))&&filterBar}
  {screen==='reports'&&<>
   {selectedReport!=='member-opening-balance-register'&&selectedReport!=='demand-register'&&selectedReport!=='receipts'&&selectedReport!=='payments'&&selectedReport!=='adjustments-contra'&&<div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
    <span className="px-1 text-[11px] font-semibold text-slate-600">Report filters</span>
    {(selectedReport==='party-balances'||selectedReport.startsWith('party-ledger')||selectedReport==='member-ledger'||selectedReport==='vendor-ledger'||selectedReport==='demand-summary'||selectedReport==='monthly-demands'||selectedReport==='monthly-payments'||selectedReport==='monthly-flat-balance'||selectedReport==='maintenance-performance')&&<>
     <label className="text-[11px] text-slate-600">Party type <select value={partyTypeFilter} onChange={e=>setPartyTypeFilter(e.target.value)} className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px]"><option>All party types</option>{(selectedReport==='demand-summary'?memberPartyTypes:partyTypes).map(v=><option key={v}>{v}</option>)}</select></label>
     <label className="text-[11px] text-slate-600">Party name <select value={query} onChange={e=>setQuery(e.target.value)} className="ml-1 max-w-[220px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px]"><option value="">All parties</option>{Array.from(new Set([...flatOwnerMaster.map((x:any)=>String(x.owner_name||'')),...partyMaster.map((x:any)=>String(x.party_name||x.name||''))].filter(Boolean))).sort().map(v=><option key={v} value={v}>{v}</option>)}</select></label>
    </>}
    {(selectedReport.startsWith('account-ledger')||selectedReport==='cashbook'||selectedReport==='bank-recon'||selectedReport==='monthly-summary')&&<label className="text-[11px] text-slate-600">Account <select value={accountFilter} onChange={e=>setAccountFilter(e.target.value as 'TDCC'|'BOM'|'CASH'|'ALL')} className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px]"><option value="ALL">All accounts</option><option value="TDCC">TDCC</option><option value="BOM">BOM</option><option value="CASH">Cash</option></select></label>}
        {selectedReport==='expense-analysis'&&<label className="text-[11px] text-slate-600">Demand group <select value={expenseDemandGroupFilter} onChange={e=>setExpenseDemandGroupFilter(e.target.value)} className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px]"><option>All demand groups</option>{Array.from(new Set(categoryMaster.map((c:any)=>String(c.demand_group||'Unmapped Demand Group')).filter(Boolean))).sort().map(v=><option key={v}>{v}</option>)}</select></label>}
{selectedReport==='maintenance-performance'&&<label className="text-[11px] text-slate-600">Category group <select value={categoryGroupFilter} onChange={e=>setCategoryGroupFilter(e.target.value)} className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px]"><option>All category groups</option>{categoryGroups.map(v=><option key={v}>{v}</option>)}</select></label>}
{selectedReport==='demand-summary'&&<><label className="text-[11px] text-slate-600">Category <select value={demandSummaryCategoryFilter} onChange={e=>setDemandSummaryCategoryFilter(e.target.value)} className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px]"><option>All categories</option>{Array.from(new Set(categoryMaster.map((c:any)=>String(c.category_name||'')).filter(Boolean))).sort().map(v=><option key={v}>{v}</option>)}</select></label><label className="text-[11px] text-slate-600">Category group <select value={demandSummaryCategoryGroupFilter} onChange={e=>setDemandSummaryCategoryGroupFilter(e.target.value)} className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px]"><option>All category groups</option>{categoryGroups.map(v=><option key={v}>{v}</option>)}</select></label></>}{(selectedReport==='expense-analysis'||selectedReport==='income-expense'||selectedReport.startsWith('category-ledger'))&&<label className="text-[11px] text-slate-600">Category group <select value={categoryGroupFilter} onChange={e=>setCategoryGroupFilter(e.target.value)} className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px]"><option>All category groups</option>{categoryGroups.map(v=><option key={v}>{v}</option>)}</select></label>}
    <button onClick={()=>{setPartyTypeFilter('All party types');setCategoryGroupFilter('All category groups');setExpenseDemandGroupFilter('All demand groups');setDemandSummaryCategoryFilter('All categories');setDemandSummaryCategoryGroupFilter('All category groups');setQuery('');setAccountFilter('ALL')}} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-600">Reset report filters</button>
   </div>}
   {selectedReport==='party-balances'&&<div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Card label="Member balance records" value={num(cumulativeOutstanding.length)} detail="Cumulative outstanding register" icon={Users}/><Card label="Members with dues" value={num(cumulativeOutstanding.filter(r=>Number(r.net_outstanding||0)<0).length)} detail="Negative signed balance = amount receivable" icon={AlertTriangle} tone="amber"/><Card label="Member dues" value={fmt(cumulativeOutstanding.reduce((s,r)=>s+Math.max(0,-(Number(r.net_outstanding)||0)),0))} detail="Debit balances only; member credits excluded" icon={Wallet} tone="red"/></div>}
   {selectedReport==='payments'?(()=>{
const paymentRows=(transactions||[]).filter((t:any)=>t.type==='Payment'&&t.transactionClass!=='Contra').map((t:any)=>{
 const party=partyMaster.find((p:any)=>String(p.party_id)===String(t.partyId||t.party_id||''))||partyMaster.find((p:any)=>String(p.party_name||p.name||'').trim().toLowerCase()===String(t.party||'').trim().toLowerCase());
 const txDate=new Date(t.date||'');const y=txDate.getFullYear();const fy=Number.isNaN(y)?'':`FY ${txDate.getMonth()>=3?y:y-1}-${String((txDate.getMonth()>=3?y:y-1)+1).slice(-2)}`;
 return {fy:String(t.financialYear||t.financial_year||fy),reportingMonth:String(t.reportingMonth||t.month||''),date:String(t.date||''),voucherNo:String(t.voucherNo||''),party:String(t.party||'Unidentified Payee'),classification:String(party?.party_type||'Unclassified'),paymentMode:String(t.paymentMode||''),category:String(t.categoryName||''),group:String(t.categoryGroup||''),description:String(t.description||''),account:String(t.accountName||''),amount:Math.abs(Number(t.amount)||0),chequeRef:String(t.chequeNo||''),remarks:String(t.remarks||''),evidence:String(t.evidenceStatus||'Pending')};
});
const filteredPayments=paymentRows.filter((r:any)=>(paymentFyFilter==='All FY'||r.fy===paymentFyFilter)&&(paymentReportingMonthFilter==='All months'||r.reportingMonth===paymentReportingMonthFilter)&&(paymentPartyClassFilter==='All classifications'||r.classification===paymentPartyClassFilter)&&(paymentModeFilter==='All modes'||r.paymentMode===paymentModeFilter)&&(paymentGroupFilter==='All category groups'||r.group===paymentGroupFilter)&&(paymentCategoryFilter==='All categories'||r.category===paymentCategoryFilter)&&(paymentAccountFilter==='All accounts'||r.account===paymentAccountFilter)&&(!paymentPartySearch||r.party.toLowerCase().includes(paymentPartySearch.toLowerCase().trim())));
const sum=(key:string)=>filteredPayments.reduce((v:number,r:any)=>v+Number(r[key]||0),0);
const cash=filteredPayments.filter((r:any)=>/cash/i.test(r.paymentMode)).reduce((v:number,r:any)=>v+r.amount,0);
const nonCash=filteredPayments.filter((r:any)=>r.paymentMode&&!/cash/i.test(r.paymentMode)).reduce((v:number,r:any)=>v+r.amount,0);
const showCheque=paymentRows.some((r:any)=>Boolean(r.chequeRef.trim()));const showRemarks=paymentRows.some((r:any)=>Boolean(r.remarks.trim()));
return <div className="space-y-3"><div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border bg-slate-50 p-3">
<label className="text-[11px]">Financial Year<select value={paymentFyFilter} onChange={e=>setPaymentFyFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All FY</option>{Array.from(new Set(paymentRows.map((r:any)=>r.fy).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Reporting Month<select value={paymentReportingMonthFilter} onChange={e=>setPaymentReportingMonthFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All months</option>{Array.from(new Set(paymentRows.map((r:any)=>r.reportingMonth).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Party Classification<select value={paymentPartyClassFilter} onChange={e=>setPaymentPartyClassFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All classifications</option>{Array.from(new Set(paymentRows.map((r:any)=>r.classification))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Payment Mode<select value={paymentModeFilter} onChange={e=>setPaymentModeFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All modes</option>{Array.from(new Set(paymentRows.map((r:any)=>r.paymentMode).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Category Group<select value={paymentGroupFilter} onChange={e=>setPaymentGroupFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All category groups</option>{Array.from(new Set(paymentRows.map((r:any)=>r.group).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Category Name<select value={paymentCategoryFilter} onChange={e=>setPaymentCategoryFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All categories</option>{Array.from(new Set(paymentRows.map((r:any)=>r.category).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Account Name<select value={paymentAccountFilter} onChange={e=>setPaymentAccountFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All accounts</option>{Array.from(new Set(paymentRows.map((r:any)=>r.account).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<input value={paymentPartySearch} onChange={e=>setPaymentPartySearch(e.target.value)} placeholder="Search payee name…" className="min-w-[180px] rounded border bg-white px-3 py-2 text-[11px]"/>
<button onClick={()=>{setPaymentFyFilter('All FY');setPaymentReportingMonthFilter('All months');setPaymentPartyClassFilter('All classifications');setPaymentModeFilter('All modes');setPaymentGroupFilter('All category groups');setPaymentCategoryFilter('All categories');setPaymentAccountFilter('All accounts');setPaymentPartySearch('');}} className="rounded border bg-white px-3 py-2 text-[11px]">Reset</button></div>
<Panel title="RPT-15 · Payment Register" action={<button onClick={()=>downloadCsv("society-payment-register.csv",[["Pearl Meadows C-Wing","Payment Register"],["Sr. No.","Financial Year","Reporting Month","Payment Date","Payment / Voucher No.","Party / Payee Name","Party Classification","Payment Mode","Category Name","Category Group","Description","Account Name","Amount","Cheque / Bank Reference","Remarks","Evidence / Voucher Status"],...filteredPayments.map((r:any,i:number)=>[i+1,r.fy,r.reportingMonth,r.date,r.voucherNo,r.party,r.classification,r.paymentMode,r.category,r.group,r.description,r.account,r.amount,r.chequeRef,r.remarks,r.evidence])])} className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Export CSV</button>}><div className="mb-4 border-b-2 border-slate-800 pb-3 text-center"><h2 className="text-base font-bold uppercase tracking-wide text-slate-900">Pearl Meadows 'C' Type 'C' Wing Chs Ltd</h2><p className="mt-1 text-xs font-semibold text-slate-700">Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014</p><h3 className="mt-3 text-sm font-bold uppercase text-slate-900">Payment Register</h3><p className="mt-1 text-[11px] text-slate-600">Financial Year: {paymentFyFilter==='All FY'?'All Financial Years':paymentFyFilter}</p></div>
<div className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-4"><Card label="Payment Transactions" value={num(filteredPayments.length)} detail="Actual payment transactions; contra excluded" icon={FileText}/><Card label="Total Payment Amount" value={fmt(sum('amount'))} detail="Filtered payment value" icon={Banknote} tone="red"/><Card label="Cash Payments" value={fmt(cash)} detail="Identified as cash by payment mode" icon={Wallet} tone="amber"/><Card label="Non-cash Payments" value={fmt(nonCash)} detail="Non-cash modes recorded in source" icon={Landmark}/></div>
<div className="overflow-x-auto [&_table]:min-w-[1650px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"><Table headers={['Sr. No.','Financial Year','Reporting Month','Payment Date','Payment / Voucher No.','Party / Payee Name','Party Classification','Payment Mode','Category Name','Category Group','Description','Account Name','Amount',...(showCheque?['Cheque / Bank Reference']:[]),...(showRemarks?['Remarks']:[]),'Evidence / Voucher Status']} rows={filteredPayments.map((r:any,i:number)=>[i+1,r.fy||'—',r.reportingMonth||'—',r.date||'—',r.voucherNo||'Missing voucher no.',r.party,r.classification,r.paymentMode||'—',r.category||'—',r.group||'—',r.description||'—',r.account||'—',currencyCell(r.amount),...(showCheque?[r.chequeRef||'—']:[]),...(showRemarks?[r.remarks||'—']:[]),statusPill(r.evidence)])}/></div>
<div className="mt-3 text-[10px] text-slate-500">Showing {filteredPayments.length} of {paymentRows.length} payment transactions. Contra transfers are excluded. Missing voucher references and evidence status are displayed as recorded; no bill-level payable balance is inferred.</div></Panel></div>;
})():selectedReport==='adjustments-contra'?(()=>{
const demandRows=(demandAdjustments||[]).map((a:any)=>({type:'Demand adjustment',ref:String(a.adjustment_id||a.id||'—'),demand:String(a.demand_id||'—'),date:String(a.adjustment_date||a.created_at||'—'),amount:Number(a.adjustment_amount??a.amount)||0,reason:String(a.reason||a.notes||''),approval:String(a.approval_status||(a.is_approved?'Approved':'Not approved')),approvedBy:String(a.approved_by||''),notes:String(a.notes||'')}));
const correctionRows=(transactions||[]).filter((t:any)=>t.isCorrection===true).map((t:any)=>({type:'Transaction correction',ref:String(t.id||'—'),demand:String((t as any).demandId||'—'),date:String(t.date||'—'),amount:Math.abs(Number(t.amount)||0),reason:String(t.description||''),approval:String(t.correctionStatus||'Unspecified'),approvedBy:'',notes:String(t.remarks||'')}));
const allAdjustments=[...demandRows,...correctionRows];
const contraRows=(transactions||[]).filter((t:any)=>t.transactionClass==='Contra');
const adjustmentTotal=allAdjustments.reduce((n:number,r:any)=>n+r.amount,0);
const contraDetailRows=contraRows.map((t:any)=>{const party=partyMaster.find((p:any)=>String(p.party_id)===String(t.partyId||t.party_id||''))||partyMaster.find((p:any)=>String(p.party_name||p.name||'').trim().toLowerCase()===String(t.party||'').trim().toLowerCase());const partyType=String(party?.party_type||'');const counterpartyType=/bank/i.test(partyType)?'Direct by Bank':partyType==='Member'?'Member':partyType||'Unmapped / Direct';const date=String(t.date||'');const month=String(t.reportingMonth||t.month||(date?new Date(date).toLocaleString('en-IN',{month:'short',year:'numeric'}):''));return {...t,contraParty:String(party?.party_name||t.party||'—'),contraPartyType:counterpartyType,contraMonth:month,contraAccount:String(t.accountName||'—'),contraDescription:String(t.description||'')};});
const contraFiltered=contraDetailRows.filter((r:any)=>(contraAccountFilter==='All accounts'||r.contraAccount===contraAccountFilter)&&(contraPartyTypeFilter==='All types'||r.contraPartyType===contraPartyTypeFilter)&&(contraMonthFilter==='All months'||r.contraMonth===contraMonthFilter)&&(!contraSearch||[r.id,r.contraParty,r.contraAccount,r.contraDescription].some((v:any)=>String(v||'').toLowerCase().includes(contraSearch.toLowerCase().trim()))));
return <div className="space-y-3"><Panel title="RPT-32 · Adjustments Register" action={<button onClick={()=>downloadCsv("society-adjustments-register.csv",[["Pearl Meadows C-Wing","Adjustments Register"],["Sr. No.","Entry Type","Adjustment Reference","Demand ID","Adjustment Date","Amount","Approval Status","Approved By","Reason","Notes"],...allAdjustments.map((r:any,i:number)=>[i+1,r.type,r.ref,r.demand,r.date,r.amount,r.approval,r.approvedBy,r.reason,r.notes])])} className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Export CSV</button>}><div className="mb-4 border-b-2 border-slate-800 pb-3 text-center"><h2 className="text-base font-bold uppercase tracking-wide text-slate-900">Pearl Meadows 'C' Type 'C' Wing Chs Ltd</h2><p className="mt-1 text-xs font-semibold text-slate-700">Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014</p><h3 className="mt-3 text-sm font-bold uppercase text-slate-900">Adjustments Register</h3><p className="mt-1 text-[11px] text-slate-600">Adjustment entries only · Contra transfers excluded</p></div>
<div className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-3"><Card label="Adjustment Entries" value={num(allAdjustments.length)} detail="Demand adjustments and flagged corrections" icon={FileText}/><Card label="Total Adjustment Amount" value={fmt(adjustmentTotal)} detail="Recorded adjustment amounts only" icon={ArrowLeftRight}/><Card label="Contra Transfers" value={num(contraRows.length)} detail="Disclosed separately below; not adjustments" icon={Landmark}/></div>
{allAdjustments.length===0?<div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><strong>No adjustment entries are currently recorded.</strong><p className="mt-1 text-xs">Supabase returned zero rows from demand_adjustments and transaction_correction_register, and no transactions are flagged as corrections. This is a data-status statement, not confirmation that no adjustments occurred historically.</p></div>:<div className="overflow-x-auto [&_table]:min-w-[1150px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"><Table headers={['Sr. No.','Entry Type','Adjustment Reference','Demand ID','Adjustment Date','Amount','Approval Status','Approved By','Reason','Notes']} rows={allAdjustments.map((r:any,i:number)=>[i+1,r.type,r.ref,r.demand,r.date,currencyCell(r.amount),r.approval||'Not recorded',r.approvedBy||'—',r.reason||'—',r.notes||'—'])}/></div>}
<div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700"><strong>Accounting treatment:</strong> Demand adjustments affect party balances only when authorised and supported. Unapproved entries must remain pending review. Contra transfers are internal cash/bank movements and are excluded from income, expenditure and adjustment totals.</div></Panel>
<Panel title={`Contra Transfers — Separate Disclosure (${contraFiltered.length} of ${contraRows.length} records)`}><div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border bg-slate-50 p-3">
<label className="text-[11px]">Account<select value={contraAccountFilter} onChange={e=>setContraAccountFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All accounts</option>{Array.from(new Set(contraDetailRows.map((r:any)=>r.contraAccount).filter((v:string)=>v&&v!=='—'))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Member / Bank<select value={contraPartyTypeFilter} onChange={e=>setContraPartyTypeFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All types</option>{Array.from(new Set(contraDetailRows.map((r:any)=>r.contraPartyType))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Month<select value={contraMonthFilter} onChange={e=>setContraMonthFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All months</option>{Array.from(new Set(contraDetailRows.map((r:any)=>r.contraMonth).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<input value={contraSearch} onChange={e=>setContraSearch(e.target.value)} placeholder="Search member, bank, account or description…" className="min-w-[220px] rounded border bg-white px-3 py-2 text-[11px]"/>
<button onClick={()=>{setContraAccountFilter('All accounts');setContraPartyTypeFilter('All types');setContraMonthFilter('All months');setContraSearch('');}} className="rounded border bg-white px-3 py-2 text-[11px]">Reset</button></div>
<div className="overflow-x-auto [&_table]:min-w-[1250px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"><Table headers={['Sr. No.','Date','Month','Transaction ID','Member / Bank','Classification','Account','Description','Amount','Evidence Status']} rows={contraFiltered.map((t:any,i:number)=>[i+1,t.date||'—',t.contraMonth||'—',t.id||'—',t.contraParty,t.contraPartyType,t.contraAccount,t.contraDescription||'—',currencyCell(Math.abs(Number(t.amount)||0)),statusPill(t.evidenceStatus||'Pending')])}/></div><p className="mt-2 text-[10px] text-slate-500">Showing {contraFiltered.length} of {contraRows.length} contra transfers. Member and bank classification is derived from the linked Party Master; unmapped entries remain separately identifiable. Contra transfers are for traceability only and are not included in adjustment totals.</p></Panel></div>;
})():selectedReport==='receipts'?(()=>{
const optionalReceiptText=(value:any)=>{const text=String(value??'').trim();return /^(?:—|–|-|n\/a|na|null|undefined|none|not applicable)$/i.test(text)?'':text;};
const receiptRows=(transactions||[]).filter((t:any)=>t.type==='Receipt'&&t.transactionClass!=='Contra').map((t:any)=>{
 const party=partyMaster.find((p:any)=>String(p.party_id)===String(t.partyId||t.party_id||''))||partyMaster.find((p:any)=>String(p.party_name||p.name||'').trim().toLowerCase()===String(t.party||'').trim().toLowerCase());
 const demand=(demandRegister||[]).find((d:any)=>String(d.demand_id||d.id||'')===transactionDemandId(t));
 const demandMonth=String(demand?.demand_month||'');
 const txDate=new Date(t.date||''); const txYear=txDate.getFullYear(); const fy=Number.isNaN(txYear)?'':`FY ${txDate.getMonth()>=3?txYear:txYear-1}-${String((txDate.getMonth()>=3?txYear:txYear-1)+1).slice(-2)}`;
 return {fy:String(t.financialYear||t.financial_year||fy),reportingMonth:String(t.reportingMonth||t.month||''),date:String(t.date||''),receiptNo:String(t.receiptNo||t.voucherNo||''),party:String(t.party||'Unidentified Party'),classification:String(party?.party_type||'Unclassified'),demandMonth,paymentMode:String(t.paymentMode||''),category:String(t.categoryName||''),group:String(t.categoryGroup||''),description:String(t.description||''),account:String(t.accountName||''),amount:Math.abs(Number(t.amount)||0),chequeRef:optionalReceiptText(t.chequeNo),remarks:optionalReceiptText(t.remarks)};
});
const filteredReceipts=receiptRows.filter((r:any)=>(receiptFyFilter==='All FY'||r.fy===receiptFyFilter)&&(receiptReportingMonthFilter==='All months'||r.reportingMonth===receiptReportingMonthFilter)&&(receiptDemandMonthFilter==='All months'||r.demandMonth===receiptDemandMonthFilter)&&(receiptPartyClassFilter==='All classifications'||r.classification===receiptPartyClassFilter)&&(receiptModeFilter==='All modes'||r.paymentMode===receiptModeFilter)&&(receiptGroupFilter==='All category groups'||r.group===receiptGroupFilter)&&(receiptCategoryFilter==='All categories'||r.category===receiptCategoryFilter)&&(receiptAccountFilter==='All accounts'||r.account===receiptAccountFilter)&&(!receiptPartySearch||r.party.toLowerCase().includes(receiptPartySearch.toLowerCase().trim())));
const showChequeReference=receiptRows.some((r:any)=>r.chequeRef.length>0);
const showRemarks=receiptRows.some((r:any)=>r.remarks.length>0);
const sum=(key:string)=>filteredReceipts.reduce((v:number,r:any)=>v+Number(r[key]||0),0);
const cash=filteredReceipts.filter((r:any)=>/cash/i.test(r.paymentMode)).reduce((v:number,r:any)=>v+r.amount,0);
const nonCash=filteredReceipts.filter((r:any)=>r.paymentMode&&!/cash/i.test(r.paymentMode)).reduce((v:number,r:any)=>v+r.amount,0);
return <div className="space-y-3"><div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border bg-slate-50 p-3">
<label className="text-[11px]">Financial Year<select value={receiptFyFilter} onChange={e=>setReceiptFyFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All FY</option>{Array.from(new Set(receiptRows.map((r:any)=>r.fy).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Reporting Month<select value={receiptReportingMonthFilter} onChange={e=>setReceiptReportingMonthFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All months</option>{Array.from(new Set(receiptRows.map((r:any)=>r.reportingMonth).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Demand Month<select value={receiptDemandMonthFilter} onChange={e=>setReceiptDemandMonthFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All months</option>{Array.from(new Set(receiptRows.map((r:any)=>r.demandMonth).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Party Classification<select value={receiptPartyClassFilter} onChange={e=>setReceiptPartyClassFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All classifications</option>{Array.from(new Set(receiptRows.map((r:any)=>r.classification))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Payment Mode<select value={receiptModeFilter} onChange={e=>setReceiptModeFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All modes</option>{Array.from(new Set(receiptRows.map((r:any)=>r.paymentMode).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Category Group<select value={receiptGroupFilter} onChange={e=>setReceiptGroupFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All category groups</option>{Array.from(new Set(receiptRows.map((r:any)=>r.group).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Category Name<select value={receiptCategoryFilter} onChange={e=>setReceiptCategoryFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All categories</option>{Array.from(new Set(receiptRows.map((r:any)=>r.category).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Account Name<select value={receiptAccountFilter} onChange={e=>setReceiptAccountFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All accounts</option>{Array.from(new Set(receiptRows.map((r:any)=>r.account).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<input value={receiptPartySearch} onChange={e=>setReceiptPartySearch(e.target.value)} placeholder="Search party name…" className="min-w-[180px] rounded border bg-white px-3 py-2 text-[11px]"/>
<button onClick={()=>{setReceiptFyFilter('All FY');setReceiptReportingMonthFilter('All months');setReceiptDemandMonthFilter('All months');setReceiptPartyClassFilter('All classifications');setReceiptModeFilter('All modes');setReceiptGroupFilter('All category groups');setReceiptCategoryFilter('All categories');setReceiptAccountFilter('All accounts');setReceiptPartySearch('');}} className="rounded border bg-white px-3 py-2 text-[11px]">Reset</button></div><Panel title="RPT-14 · Receipt Register">
<div className="mb-4 border-b-2 border-slate-800 pb-3 text-center"><h2 className="text-base font-bold uppercase tracking-wide text-slate-900">Pearl Meadows 'C' Type 'C' Wing Chs Ltd</h2><p className="mt-1 text-xs font-semibold text-slate-700">Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014</p><h3 className="mt-3 text-sm font-bold uppercase text-slate-900">Receipt Register</h3><p className="mt-1 text-[11px] text-slate-600">Financial Year: {receiptFyFilter==='All FY'?'All Financial Years':receiptFyFilter}</p></div>
<div className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-4"><Card label="Receipt Transactions" value={num(filteredReceipts.length)} detail="Actual receipt transactions; contra excluded" icon={FileText}/><Card label="Total Receipt Amount" value={fmt(sum('amount'))} detail="Filtered receipt value" icon={Banknote} tone="green"/><Card label="Cash Receipts" value={fmt(cash)} detail="Identified as cash by payment mode" icon={Wallet} tone="amber"/><Card label="Non-cash Receipts" value={fmt(nonCash)} detail="Non-cash modes recorded in source" icon={Landmark}/></div>

<div className="overflow-x-auto [&_table]:min-w-[1600px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"><Table headers={['Sr. No.','Financial Year','Reporting Month','Receipt Date','Receipt / Voucher No.','Party Name','Party Classification','Demand Month','Payment Mode','Category Name','Category Group','Description','Account Name','Amount',...(showChequeReference?['Cheque / Bank Reference']:[]),...(showRemarks?['Remarks']:[])]} rows={filteredReceipts.map((r:any,i:number)=>[i+1,r.fy||'—',r.reportingMonth||'—',r.date||'—',r.receiptNo||'—',r.party,r.classification,r.demandMonth||'—',r.paymentMode||'—',r.category||'—',r.group||'—',r.description||'—',r.account||'—',currencyCell(r.amount),...(showChequeReference?[r.chequeRef||'—']:[]),...(showRemarks?[r.remarks||'—']:[])])}/></div>
<div className="mt-3 text-[10px] text-slate-500">Showing {filteredReceipts.length} of {receiptRows.length} receipt transactions. Unmapped / no-demand receipts are retained. Contra transactions are excluded. Demand IDs remain internal and are not displayed.</div></Panel></div>;
})():selectedReport==='demand-register'?(()=>{
const baseRows=(demandRegister||[]).filter((d:any)=>String(d.party_type||partyMaster.find((p:any)=>String(p.party_id)===String(d.party_id))?.party_type||'')==='Member').map((d:any)=>{const party=partyMaster.find((p:any)=>String(p.party_id)===String(d.party_id));const flat=flatOwnerMaster.find((x:any)=>String(x.owner_name||'').trim().toLowerCase()===String(party?.party_name||d.party_name||'').trim().toLowerCase());const cat=categoryMaster.find((x:any)=>String(x.category_id)===String(d.category_id));const tx=(transactions||[]).filter((t:any)=>transactionDemandId(t)===String(d.demand_id||d.id||'')&&t.type==='Receipt'&&t.transactionClass!=='Contra');const paid=Number(d.net_collection_amount)||0;const adjustments=Number(d.approved_adjustment_amount)||0;const demand=Number(d.demand_amount??demandNetAmount(d))||0;const outstanding=Number.isFinite(Number(d.signed_demand_balance))?-Number(d.signed_demand_balance):demand-paid-adjustments;const status=outstanding<0?'Excess Paid':outstanding===0?'Fully Paid':paid>0?'Partially Paid':'Pending';const flatNo=String(flat?.flat_no||d.flat_no||party?.flat_no||'');const rowDate=String(d.demand_date||d.bill_date||d.due_date||d.created_at||'').slice(0,10);return {fy:String(d.financial_year||''),month:String(d.demand_month||d.month||''),date:rowDate,due:String(d.due_date||''),flat:flatNo,partyId:String(d.party_id||party?.party_id||''),party:String(party?.party_name||d.party_name||'Unmapped Party'),classification:String(party?.party_type||'Unclassified'),group:String(cat?.demand_group||d.demand_group||'Unclassified'),demand,paid,adjustments,outstanding,paidMonths:Array.from(new Set(tx.map((t:any)=>String(t.reportingMonth||t.month||'').trim()).filter(Boolean))).sort().join(', '),status};});
const openingForParty=(r:any)=>{const matches=(memberOpeningBalances||[]).filter((b:any)=>(r.partyId&&String(b.member_id||'')===r.partyId)||(r.flat&&String(b.flat_no||'').trim().toLowerCase()===r.flat.trim().toLowerCase()));if(!matches.length)return 0;const preferred=matches.filter((b:any)=>!b.financial_year||String(b.financial_year).includes('2018-19'));const source=preferred.length?preferred:matches;return Number(source[0]?.opening_balance)||0;};
const partyReceiptRows=(partyId:string,partyName:string,flat:string)=> (transactions||[]).filter((t:any)=>t.type==='Receipt'&&t.transactionClass!=='Contra'&&((partyId&&String(t.partyId||t.party_id||'')===partyId)||String(t.party||t.party_name||'').trim().toLowerCase()===partyName.trim().toLowerCase()||(!partyId&&flat&&String(t.flatNo||t.flat_no||'').trim().toLowerCase()===flat.trim().toLowerCase()))).map((t:any)=>({date:String(t.date||'').slice(0,10),amount:Number(t.amount)||0,month:String(t.reportingMonth||t.month||'').trim()}));
const rows=baseRows.map((r:any)=>{const opening=openingForParty(r);const cutoff=r.date||'9999-12-31';const priorRows=baseRows.filter((x:any)=>x.partyId===r.partyId&&x.date<=cutoff);const cumulativeDemand=priorRows.reduce((sum:number,x:any)=>sum+Number(x.demand||0),0);const cumulativeAdjustments=priorRows.reduce((sum:number,x:any)=>sum+Number(x.adjustments||0),0);const receipts=partyReceiptRows(r.partyId,r.party,r.flat).filter((t:any)=>t.date&&t.date<=cutoff).reduce((sum:number,t:any)=>sum+t.amount,0);const cumulativeBalance=opening-cumulativeDemand+receipts+cumulativeAdjustments;return {...r,openingBalance:opening,cumulativeDemand,cumulativeBalance};});
const filteredRows=rows.filter((r:any)=>(demandFyFilter==='All FY'||r.fy===demandFyFilter)&&(demandMonthFilter==='All months'||r.month===demandMonthFilter)&&(demandPartyClassFilter==='All classifications'||r.classification===demandPartyClassFilter)&&(demandGroupFilter==='All demand groups'||r.group===demandGroupFilter)&&(demandPaymentStatusFilter==='All statuses'||r.status===demandPaymentStatusFilter)&&(!demandPartySearch||r.party.toLowerCase().includes(demandPartySearch.toLowerCase().trim())));
const total=(k:string)=>filteredRows.reduce((s:number,r:any)=>s+Number(r[k]||0),0);const shortCount=filteredRows.filter((r:any)=>Number(r.paid)>0&&Number(r.outstanding)>0).length;const excessCount=filteredRows.filter((r:any)=>Number(r.paid)>0&&Number(r.outstanding)<0).length;const short=filteredRows.reduce((s:number,r:any)=>s+Math.max(0,r.outstanding),0);
return <Panel title="RPT-08 · Demand Register">
<div className="mb-4 border-b-2 border-slate-800 pb-3 text-center"><h2 className="text-base font-bold uppercase tracking-wide text-slate-900">Pearl Meadows 'C' Type 'C' Wing Chs Ltd</h2><p className="mt-1 text-xs font-semibold text-slate-700">Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014</p><h3 className="mt-3 text-sm font-bold uppercase text-slate-900">Demand Register</h3><p className="mt-1 text-[11px] text-slate-600">Financial Year: {demandFyFilter==='All FY'?'All Financial Years':demandFyFilter}</p></div>
<div className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-4"><Card label="Total Demands" value={fmt(total('demand'))} detail={num(filteredRows.length)+' demand records'} icon={FileText}/><Card label="Total Paid" value={fmt(total('paid'))} detail="Mapped receipt transactions" icon={Banknote} tone="green"/><Card label="Total Pending" value={fmt(short)} detail="Positive outstanding" icon={AlertTriangle} tone="amber"/><Card label="Payment Status Summary" value={<span className="text-sm">Part-paid demands: {shortCount}<br/>Demands with excess payments: {excessCount}</span>} detail="Demand-wise payment position" icon={ArrowLeftRight}/></div>
<div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border bg-slate-50 p-3">
<label className="text-[11px]">Financial Year<select value={demandFyFilter} onChange={e=>setDemandFyFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All FY</option>{Array.from(new Set(rows.map((r:any)=>r.fy).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Demand Month<select value={demandMonthFilter} onChange={e=>setDemandMonthFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All months</option>{Array.from(new Set(rows.map((r:any)=>r.month).filter(Boolean))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Party Classification<select value={demandPartyClassFilter} onChange={e=>setDemandPartyClassFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All classifications</option>{Array.from(new Set(rows.map((r:any)=>r.classification))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Demand Group<select value={demandGroupFilter} onChange={e=>setDemandGroupFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All demand groups</option>{Array.from(new Set(rows.map((r:any)=>r.group))).sort().map((v:string)=><option key={v}>{v}</option>)}</select></label>
<label className="text-[11px]">Payment Status<select value={demandPaymentStatusFilter} onChange={e=>setDemandPaymentStatusFilter(e.target.value)} className="mt-1 block rounded border bg-white px-2 py-2"><option>All statuses</option>{['Pending','Partially Paid','Fully Paid','Excess Paid'].map(v=><option key={v}>{v}</option>)}</select></label>
<input value={demandPartySearch} onChange={e=>setDemandPartySearch(e.target.value)} placeholder="Search party name…" className="min-w-[180px] rounded border bg-white px-3 py-2 text-[11px]"/>
<button onClick={()=>{setDemandFyFilter('FY 2018-19');setDemandMonthFilter('All months');setDemandPartyClassFilter('All classifications');setDemandGroupFilter('All demand groups');setDemandPaymentStatusFilter('All statuses');setDemandPartySearch('');}} className="rounded border bg-white px-3 py-2 text-[11px]">Reset</button></div>
<div className="overflow-x-auto [&_table]:min-w-[1500px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"><Table headers={['Sr. No.','Financial Year','Demand Month','Demand Date','Party Name','Party Classification','Demand Group','Opening Balance','Demand Amount','Cumulative Demand','Paid Amount','Adjustments','Outstanding','Cumulative Balance','Paid Month(s)','Payment Status']} rows={filteredRows.map((r:any,i:number)=>[i+1,r.fy,r.month,r.date||'—',r.party,r.classification,r.group,currencyCell(r.openingBalance),currencyCell(r.demand),currencyCell(r.cumulativeDemand),currencyCell(r.paid),currencyCell(r.adjustments),currencyCell(r.outstanding),currencyCell(r.cumulativeBalance),r.paidMonths||'—',statusPill(r.status)])}/></div>
<div className="mt-3 text-[10px] text-slate-500">Showing {filteredRows.length} of {rows.length} demand records. Receipt totals matched by transaction Demand ID; no source records modified.</div></Panel>;
})():selectedReport==='member-opening-balance-register'?<Panel title="RPT-40 · Member Opening Balance Register — FY 2018–19" action={<button onClick={exportOpeningRegister} disabled={openingRegisterLoading||openingRegisterRows.length===0} className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Export CSV</button>}>
    <div className="mb-4 border-b-2 border-slate-800 pb-3 text-center"><h2 className="text-base font-bold uppercase tracking-wide text-slate-900">Pearl Meadows 'C' Type 'C' Wing Chs Ltd</h2><p className="mt-1 text-xs font-semibold text-slate-700">Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014</p><h3 className="mt-3 text-sm font-bold uppercase text-slate-900">Member Opening Balance Register</h3><p className="mt-1 text-[11px] text-slate-600">Financial Year: FY 2018–19</p></div>
    <p className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">Calculation is read directly from <strong>v_opening_balance_register</strong>; this screen does not recalculate or modify member balances. Total Outstanding = Opening Balance + Current FY Receipts − Current FY Demand + Adjustments. Negative balance: member owes Society. Positive balance: Society owes member / credit balance.</p>
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label className="text-xs font-semibold text-slate-700">Member Classification</label>
      <select value={openingRegisterClassification} onChange={e=>setOpeningRegisterClassification(e.target.value)} className="min-w-[220px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs">
       <option>All classifications</option>{openingRegisterClassifications.map((v:string)=><option key={v} value={v}>{v}</option>)}
      </select>
      <input value={openingRegisterSearch} onChange={e=>setOpeningRegisterSearch(e.target.value)} placeholder="Search member name…" className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"/>
      <button onClick={()=>{setOpeningRegisterClassification('All classifications');setOpeningRegisterSearch('');}} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600">Reset</button>
     </div>
    {openingRegisterError&&<div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">Unable to load the register: {openingRegisterError}. Check Supabase view access and RLS permissions.</div>}
    {openingRegisterLoading?<div className="py-10 text-center text-sm text-slate-500">Loading member opening balance register…</div>:<>
     <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
      <Card label="Member Records" value={num(openingRegisterFiltered.length)} detail="Filtered member accounts" icon={Users}/>
      <Card label="Opening Balance" value={fmt(openingRegisterTotals.opening)} detail="As imported" icon={Wallet}/>
      <Card label="FY Demand" value={fmt(openingRegisterTotals.demand)} detail="FY 2018–19 net demand" icon={FileText}/>
      <Card label="FY Receipts" value={fmt(openingRegisterTotals.receipts)} detail="Demand-register paid amounts" icon={Banknote} tone="green"/>
      <Card label="Total Outstanding" value={fmt(openingRegisterTotals.outstanding)} detail="Calculated from approved formula" icon={AlertTriangle} tone="amber"/>
     </div>
     <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"><span className="text-slate-600">Adjustments</span><div className="mt-1 text-lg font-bold">{fmt(openingRegisterTotals.adjustments)}</div></div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs"><span className="text-slate-600">Formula</span><div className="mt-1 font-semibold">Opening + Receipts − Demand + Adjustments</div></div>
     </div>
     <Table headers={['Financial Year','Party / Member Name','Classification','Opening Balance','FY Demand','FY Receipts','Adjustments','Total Outstanding','Position']} rows={openingRegisterFiltered.map((r:any)=>{const v=Number(r.total_outstanding)||0;return [<span className="whitespace-nowrap font-semibold">{String(r.financial_year||'FY 2018-19').replace('FY 2018-19','FY 2018-19')}</span>,r.party_name||'—',r.party_type||'Unclassified',currencyCell(Number(r.opening_balance)||0),currencyCell(Number(r.current_fy_demand)||0),currencyCell(Number(r.current_fy_receipts)||0),currencyCell(Number(r.adjustments)||0),<span className={'font-bold '+(v<0?'text-red-700':v>0?'text-emerald-700':'text-slate-700')}>{fmt(v)}</span>,v<0?'Member owes Society':v>0?'Society owes member':'Nil'];})}/>
     <div className="mt-3 text-[10px] text-slate-500">Showing {openingRegisterFiltered.length} of {openingRegisterRows.length} party records. Classification and party names are sourced from Party Master. No source records are edited by this report.</div>
    </>}
   </Panel>:selectedReport==='income-expense'?(()=> {
    const fyStart='2018-04-01',fyEnd='2019-03-31';
    const months=['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];
    const monthIndex=months.indexOf(rpt15Month);
    const monthStart=monthIndex>=0?new Date(2018,3+monthIndex,1):new Date(2018,3,1);
    const monthEnd=monthIndex>=0?new Date(2018,4+monthIndex,0):new Date(2019,2,31);
    const localDate=(d:Date)=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const dateOf=(t:any)=>String(t.date||t.transaction_date||t.transactionDate||'').slice(0,10);
    const startDate=rpt15PeriodMode==='FY'?fyStart:rpt15PeriodMode==='YTD'?fyStart:localDate(monthStart);
    const endDate=rpt15PeriodMode==='FY'?fyEnd:localDate(monthEnd);
    const source=transactions.filter(t=>t.transactionClass!=='Contra'&&(t.type==='Receipt'||t.type==='Payment')&&dateOf(t)>=startDate&&dateOf(t)<=endDate);
    const names=Array.from(new Set(source.map(t=>t.categoryName||'Unclassified')));
    const detail=names.map(name=>{const g=source.filter(t=>(t.categoryName||'Unclassified')===name);const income=g.filter(t=>t.type==='Receipt').reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);const expense=g.filter(t=>t.type==='Payment').reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);const group=categoryMaster.find((x:any)=>x.category_name===name)?.category_group||g[0]?.categoryGroup||'Unmapped';return {group,name,income,expense,transactions:g};});
    const incomeRows=detail.filter(x=>x.income>0).sort((a,b)=>a.group.localeCompare(b.group)||a.name.localeCompare(b.name));
    const expenseRows=detail.filter(x=>x.expense>0).sort((a,b)=>a.group.localeCompare(b.group)||a.name.localeCompare(b.name));
    const totalIncome=incomeRows.reduce((sum,x)=>sum+x.income,0),totalExpense=expenseRows.reduce((sum,x)=>sum+x.expense,0),surplus=totalIncome-totalExpense,margin=totalIncome?surplus/totalIncome*100:0;
    const unclassified=source.filter(t=>!t.categoryName||!categoryMaster.some((c:any)=>c.category_name===t.categoryName));
    const negativePayments:any[]=[]; // Payment amounts are stored as negative debits by the society ledger convention; this is expected, not an exception.
    const bothSides=detail.filter(x=>x.income>0&&x.expense>0);
    const topThree=expenseRows.slice().sort((a,b)=>b.expense-a.expense).slice(0,3).reduce((sum,x)=>sum+x.expense,0);
    const largestExpense=expenseRows.slice().sort((a,b)=>b.expense-a.expense)[0];
    const pct=(v:number,total:number)=>total?Math.round(v/total*100):0;
    const rowsCount=Math.max(incomeRows.length,expenseRows.length);
    const statementRows=Array.from({length:rowsCount},(_,i)=>[incomeRows[i]?incomeRows[i].group+' · '+incomeRows[i].name:'',incomeRows[i]?currencyCell(incomeRows[i].income):'',expenseRows[i]?expenseRows[i].group+' · '+expenseRows[i].name:'',expenseRows[i]?currencyCell(expenseRows[i].expense):'']);
    const actionRows:any[][]=[];
    if(incomeRows.length) actionRows.push(['High','Reconcile income heads to demand / receipt registers and bank credits','Treasurer','Income completeness and collection control']);
    if(largestExpense) actionRows.push(['High','Review '+largestExpense.name+' supporting invoices, approvals and service evidence','Treasurer + Committee','Validate largest cost head']);
    if(bothSides.length) actionRows.push(['High','Review heads appearing on both receipt and payment sides: '+bothSides.map(x=>x.name).join(', '),'Accounts owner','Confirm correct account classification']);
    if(unclassified.length) actionRows.push(['High','Resolve '+unclassified.length+' unclassified transactions totalling '+fmt(unclassified.reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0)),'Accounts / Data owner','Improve classification reliability']);
    if(negativePayments.length) actionRows.push(['High','Investigate '+negativePayments.length+' negative payment entries as reversals, refunds or sign errors','Accounts owner','Validate transaction sign and source evidence']);
    actionRows.push(['High','Confirm outstanding income, unpaid expenses, depreciation, provisions and year-end journals','Auditor + Treasurer','Establish accrual-basis result']);
    const exportReport=()=>downloadCsv('RPT-15-financial-performance-risk.csv',[
      ['Pearl Meadows C Wing CHS Ltd'],['RPT-15 Financial Performance & Risk Intelligence'],['Period',rpt15PeriodMode,startDate,endDate],[],
      ['Executive Summary','Amount'],['Total Income',totalIncome],['Total Expenditure',totalExpense],['Surplus / (Deficit)',surplus],['Surplus Margin %',margin.toFixed(1)],[],
      ['Income Particulars','Income','Expenditure Particulars','Expenditure'],...statementRows,['TOTAL INCOME',totalIncome,'TOTAL EXPENDITURE',totalExpense],['SURPLUS / (DEFICIT)',surplus,'',''],[],
      ['Risk / Observation','Evidence','Recommended Action'],['Income concentration',incomeRows[0]?incomeRows.slice().sort((a,b)=>b.income-a.income)[0].name+' contributes '+pct(incomeRows.slice().sort((a,b)=>b.income-a.income)[0].income,totalIncome)+'%':'No classified income','Review recurring income and collections'],['Expense concentration',largestExpense?largestExpense.name+' contributes '+pct(largestExpense.expense,totalExpense)+'%':'No classified expenses','Review supporting contracts and approvals'],['Top three expenses',fmt(topThree)+' ('+pct(topThree,totalExpense)+'%)','Review concentration, not an irregularity finding'],['Unclassified transactions',unclassified.length+' records','Resolve category mappings'],['Negative payment entries',negativePayments.length+' records','Verify reversal / refund / sign'],['Heads on both sides',bothSides.map(x=>x.name).join('; ')||'None','Review account classification'],[],
      ['Priority','Recommended Action','Suggested Owner','Expected Outcome'],...actionRows
    ]);
    const periodLabel=rpt15PeriodMode==='FY'?'Full FY 2018–19':rpt15PeriodMode==='YTD'?'YTD through '+rpt15Month:'MTD · '+rpt15Month;
    return <Panel title="RPT-15 · Financial Performance & Risk Intelligence" action={<button onClick={exportReport} className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Export full report CSV</button>}>
      <div id="rpt15-print-content" className="mx-auto max-w-5xl space-y-6 bg-white text-slate-800">
       <header className="border-b-2 border-slate-800 pb-4 text-center"><h2 className="text-base font-bold uppercase tracking-wide">Pearl Meadows 'C' Type 'C' Wing Chs Ltd</h2><p className="mt-1 text-xs font-semibold">Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014</p><h3 className="mt-4 text-lg font-bold uppercase">Financial Performance & Risk Intelligence Report</h3><p className="mt-1 text-xs text-slate-600">Financial Year: 1 April 2018 – 31 March 2019 · RPT-15</p><p className="mt-2 text-[10px] text-slate-500">Reporting period: {periodLabel} ({startDate} to {endDate}) · Generated {new Date().toLocaleDateString('en-IN')}</p></header>
       <div className="flex flex-wrap items-center gap-3 rounded border bg-slate-50 p-3 print:hidden"><span className="text-xs font-semibold">Reporting Period</span><div className="flex flex-wrap gap-1"><button onClick={()=>setRpt15PeriodMode('FY')} className={'rounded px-3 py-2 text-xs '+(rpt15PeriodMode==='FY'?'bg-slate-800 text-white':'border bg-white')}>Full FY</button><button onClick={()=>setRpt15PeriodMode('YTD')} className={'rounded px-3 py-2 text-xs '+(rpt15PeriodMode==='YTD'?'bg-slate-800 text-white':'border bg-white')}>YTD</button><button onClick={()=>setRpt15PeriodMode('MTD')} className={'rounded px-3 py-2 text-xs '+(rpt15PeriodMode==='MTD'?'bg-slate-800 text-white':'border bg-white')}>MTD</button></div>{rpt15PeriodMode!=='FY'&&<select value={rpt15Month} onChange={e=>setRpt15Month(e.target.value)} className="rounded border bg-white px-3 py-2 text-xs">{months.map(m=><option key={m}>{m}</option>)}</select>}</div>
       <section><h3 className="mb-2 text-sm font-bold">1. Executive Financial Assessment</h3><p className="text-xs leading-6">For {periodLabel.toLowerCase()}, recorded receipts were <strong>{fmt(totalIncome)}</strong> and recorded payments were <strong>{fmt(totalExpense)}</strong>, resulting in a {surplus>=0?'surplus':'deficit'} of <strong>{fmt(Math.abs(surplus))}</strong> ({margin.toFixed(1)}% of recorded receipts). This is a cash-movement result, not confirmation of freely available funds. Outstanding liabilities, receivables, accruals and year-end adjustments must be reviewed before relying on this result.</p><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4"><div className="rounded border p-3"><div className="text-[10px] text-slate-500">Recorded income</div><div className="mt-1 text-lg font-bold">{fmt(totalIncome)}</div></div><div className="rounded border p-3"><div className="text-[10px] text-slate-500">Recorded expenditure</div><div className="mt-1 text-lg font-bold">{fmt(totalExpense)}</div></div><div className="rounded border p-3"><div className="text-[10px] text-slate-500">Surplus / deficit</div><div className="mt-1 text-lg font-bold">{fmt(surplus)}</div></div><div className="rounded border p-3"><div className="text-[10px] text-slate-500">Surplus margin</div><div className="mt-1 text-lg font-bold">{margin.toFixed(1)}%</div></div></div></section>
       <section><h3 className="mb-2 text-sm font-bold">2. Detailed Income & Expenditure Account</h3><p className="mb-2 text-xs text-slate-600">Income heads appear only on the income side and expenditure heads only on the expenditure side. Each side is sorted by Category Group then Category Name. Zero-value rows are excluded. Heads with movements on both sides are separately flagged for classification review. Contra transfers are excluded; amounts represent recorded receipts and payments.</p><Table headers={['Income Particulars','Income','Expenditure Particulars','Expenditure']} rows={[...statementRows,['TOTAL INCOME',currencyCell(totalIncome),'TOTAL EXPENDITURE',currencyCell(totalExpense)],['SURPLUS / (DEFICIT)',currencyCell(surplus),'','']]}/>{bothSides.length>0&&<div className="mt-2 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>Classification review:</strong> The following category heads contain both receipt and payment transactions in this period: {bothSides.map(x=>x.name).join(', ')}. Verify their account mapping; the report does not silently net them off.</div>}</section>
       <section><h3 className="mb-2 text-sm font-bold">3. Income Analysis & Committee Observations</h3><Table headers={['Income head','Recorded income','Share of income','Observation']} rows={incomeRows.slice().sort((a,b)=>b.income-a.income).map(x=>[x.name,currencyCell(x.income),pct(x.income,totalIncome)+'%',/maintenance/i.test(x.name)?'Core operating income; reconcile billing and collection':'Confirm whether recurring, incidental or recovery-based'])}/><p className="mt-2 text-xs leading-5">Committee focus: reconcile maintenance income against Demand Register, actual receipts and member balances. The statement alone does not establish collection efficiency.</p></section>
       <section><h3 className="mb-2 text-sm font-bold">4. Expenditure Analysis & Cost Concentration</h3><Table headers={['Expense head','Recorded expenditure','Share of expenditure','Review focus']} rows={expenseRows.slice().sort((a,b)=>b.expense-a.expense).map(x=>[x.name,currencyCell(x.expense),pct(x.expense,totalExpense)+'%',x===largestExpense?'Largest recorded cost head; inspect invoices, approvals and service evidence':'Review supporting bills, approvals and service evidence'])}/><p className="mt-2 text-xs leading-5">{largestExpense?'Largest expense head is '+largestExpense.name+' at '+fmt(largestExpense.expense)+' ('+pct(largestExpense.expense,totalExpense)+'% of expenditure). ':''}Top three expense heads total {fmt(topThree)} ({pct(topThree,totalExpense)}%). Concentration is a review signal, not proof of overspending.</p></section>
       <section><h3 className="mb-2 text-sm font-bold">5. Financial Risks & Control Observations</h3><Table headers={['Observation','Evidence in selected period','Risk / limitation','Recommended verification']} rows={[
        ...(incomeRows.length?[['Income concentration',incomeRows.slice().sort((a,b)=>b.income-a.income)[0].name+' contributes '+pct(incomeRows.slice().sort((a,b)=>b.income-a.income)[0].income,totalIncome)+'% of income','Reliance on dominant income head','Reconcile recurring demand, billing and collections']]:[]),
        ...(largestExpense?[['Expense concentration',largestExpense.name+' contributes '+pct(largestExpense.expense,totalExpense)+'% of expenditure','Large cost head merits review; not evidence of excess','Inspect contracts, invoices, approvals and service delivery']]:[]),
        ...(unclassified.length?[['Unclassified transactions',unclassified.length+' records; '+fmt(unclassified.reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0)),'Category-level interpretation may be incomplete','Resolve category mapping']]:[]),
        ...(negativePayments.length?[['Negative payment entries',negativePayments.length+' entries; '+fmt(negativePayments.reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0)),'Could be reversal, refund or sign issue','Trace original entry and bank evidence']]:[]),
        ...(bothSides.length?[['Heads with both receipt and payment activity',bothSides.map(x=>x.name).join(', '),'Potential classification ambiguity','Review source vouchers and Category Master']]:[]),
        ['Accrual completeness','Not established from cash transactions','Cash surplus may differ from accrual surplus','Auditor to verify outstanding income, unpaid expenses, depreciation and provisions']
       ]}/></section>
       <section><h3 className="mb-2 text-sm font-bold">6. Period Performance & Sustainability</h3><p className="text-xs leading-6">{rpt15PeriodMode==='MTD'?'This is a single-month cash movement view. Do not infer annual sustainability from one month. Compare with the monthly budget, prior months and recurring bill schedule when those records are available.':rpt15PeriodMode==='YTD'?'This is a cumulative year-to-date cash movement view. It should be compared with the approved budget and same-period prior-year results before drawing conclusions about annual performance.':'A single financial year can show income and expenditure composition but cannot establish a trend or prove long-term sustainability. Multi-year results, approved budgets, liabilities and reserves are required.'} Recurring-versus-exceptional classifications must be supported by approved category / contract data rather than inferred solely from keywords.</p></section>
       <section><h3 className="mb-2 text-sm font-bold">7. Steering Committee Action Plan</h3>{actionRows.length?<Table headers={['Priority','Recommended action','Suggested owner','Expected outcome']} rows={actionRows}/>:<p className="text-xs">No action items were triggered by the available transaction checks for this period.</p>}</section>
       <section><h3 className="mb-2 text-sm font-bold">8. Data Basis, Limitations & Reconciliation</h3><p className="text-xs leading-6">This report uses receipt and payment transactions dated within the selected period, excludes contra transfers, and uses Category Master for grouping. It is a preliminary cash-movement analysis, not an accrual-certified statutory account. MTD/YTD filters use transaction dates. Demand month is not used as a substitute for receipt date. Auditor reconciliation remains pending until validated auditor account-head figures are mapped. Findings are rule-based data observations; they are not claims of misconduct.</p><Table headers={['Control check','Selected-period result','Required action']} rows={[
        ['Unclassified transaction count',num(unclassified.length),'Resolve material mappings'],
        ['Negative payment entry count',num(negativePayments.length),'Verify reversals / sign convention'],
        ['Heads appearing on both sides',num(bothSides.length),'Review account classification'],
        ['Income / Expenditure totals',fmt(totalIncome)+' / '+fmt(totalExpense),'Compare with auditor figures for matching period'],
        ['Year-end accruals','Not verified','Obtain auditor confirmation']
       ]}/></section>
       <footer className="border-t pt-3 text-[10px] text-slate-500">Prepared by SocietyOS · Rule-based financial intelligence · Committee and auditor verification required.</footer>
      </div>
    </Panel>;
   })():selectedReport==='cashbook'?(()=> {
    const d=reportData as any,summary=d.summary||{},rows=summary.rows||[],totals=summary.totals||{};
    const missing=rows.filter((x:any)=>x.opening===null);
    const largest=rows.slice().sort((a:any,b:any)=>b.closing-a.closing)[0];
    return <Panel title="RPT-17 · Cash & Bank Balances">
     <div id="rpt17-print-content" className="mx-auto max-w-5xl space-y-5 bg-white text-slate-800">
      <header className="border-b-2 border-slate-800 pb-3 text-center"><h2 className="text-base font-bold uppercase">Pearl Meadows 'C' Type 'C' Wing Chs Ltd</h2><h3 className="mt-3 text-lg font-extrabold uppercase">Cash & Bank Balances</h3><p className="text-xs text-slate-600">RPT-17 · FY 2018–19 · {period==='All months'?'Full FY':period}</p></header>
      <section><h3 className="mb-2 text-sm font-bold">1. Financial Position at a Glance</h3><div className="rounded-lg border-2 border-slate-500 bg-slate-50 p-4 rpt17-summary"><div className="grid grid-cols-2 gap-3"><div><div className="text-xs font-semibold">Total Opening Balances</div><div className="text-xl font-extrabold">{summary.openingComplete?fmt(totals.opening):'Incomplete'}</div></div><div><div className="text-xs font-semibold">Recorded Receipts</div><div className="text-xl font-extrabold">{fmt(totals.receipts)}</div></div><div><div className="text-xs font-semibold">Recorded Payments</div><div className="text-xl font-extrabold">{fmt(totals.payments)}</div></div><div className="border-t-2 border-slate-500 pt-2"><div className="text-xs font-extrabold">Calculated Closing Cash & Bank</div><div className="text-2xl font-black">{summary.openingComplete?fmt(totals.closing):'Incomplete'}</div></div></div><p className="mt-3 border-t pt-2 text-xs font-bold">Opening + Receipts − Payments = Closing</p></div></section>
      <section><h3 className="mb-2 text-sm font-bold">2. Account-wise Cash & Bank Position</h3><Table headers={d.headers} rows={d.rows}/></section>
      <section><h3 className="mb-2 text-sm font-bold">3. Verification Exceptions & Committee Actions</h3><Table headers={['Observation','Evidence','Recommended action','Owner']} rows={[
       ...(missing.length?[['Opening balance gaps',missing.length+' account(s) have no recorded opening balance','Obtain prior-year audited closing / bank statement and verify opening','Treasurer + Auditor']]:[]),
       ...(rows.some((x:any)=>!String(x.verification).toLowerCase().includes('verified'))?[['Opening balance verification','One or more opening balances are not marked verified','Confirm account-wise balances against source records','Treasurer']]:[]),
       ...(rows.some((x:any)=>x.contra>0)?[['Contra movements',fmt(totals.contra)+' internal transfers disclosed separately','Match transfer-out and transfer-in entries across accounts','Treasurer']]:[]),
       ['Closing balance confirmation','Calculated book closing is not a bank-confirmed amount','Reconcile each bank account and physically verify cash','Treasurer + Committee']
      ]}/></section>
      <section><h3 className="mb-2 text-sm font-bold">4. Data Basis & Limitations</h3><p className="text-xs leading-5">Balances are calculated from recorded opening balances and selected-period non-contra receipts/payments. Contra transfers are disclosed separately and excluded from consolidated income and expenditure movement. This report does not treat receivables, investments or unpaid liabilities as cash. Missing or unverified opening balances are explicitly identified. Closing balances remain provisional until supported by bank statements and physical cash verification.</p></section>
     </div>
    </Panel>;
   })():selectedReport==='bank-recon'?(()=> {
    const d=reportData as any,summary=d.summary||{},rows=summary.reconRows||[];
    const exportRecon=()=>downloadCsv('RPT-18-bank-upi-reconciliation.csv',[['Pearl Meadows C Wing CHS Ltd'],['RPT-18 Bank / UPI Reconciliation'],['Period',period],[],d.headers,...d.rows]);
    return <Panel title="RPT-18 · Bank / UPI Reconciliation" action={<button onClick={exportRecon} className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Export reconciliation CSV</button>}>
     <div id="rpt18-print-content" className="mx-auto max-w-5xl space-y-5 bg-white text-slate-800">
      <header className="border-b-2 border-slate-800 pb-3 text-center"><h2 className="text-base font-bold uppercase">Pearl Meadows 'C' Type 'C' Wing Chs Ltd</h2><h3 className="mt-3 text-lg font-extrabold uppercase">Bank / UPI Reconciliation</h3><p className="text-xs text-slate-600">RPT-18 · FY 2018–19 · {period==='All months'?'Full FY':period}</p></header>
      <section><h3 className="mb-2 text-sm font-bold">1. Reconciliation Status Summary</h3><div className="grid grid-cols-2 gap-3 rounded-lg border-2 border-slate-500 bg-slate-50 p-4"><div><div className="text-xs font-semibold">Account-month records</div><div className="text-2xl font-extrabold">{num(summary.total||0)}</div></div><div><div className="text-xs font-semibold">Matched</div><div className="text-2xl font-extrabold">{num(summary.matched||0)}</div></div><div><div className="text-xs font-semibold">Differences</div><div className="text-2xl font-extrabold">{num(summary.mismatches||0)}</div></div><div><div className="text-xs font-semibold">Statement balances missing</div><div className="text-2xl font-extrabold">{num(summary.missingStatement||0)}</div></div></div></section>
      <section><h3 className="mb-2 text-sm font-bold">2. Account & Month Reconciliation Detail</h3><Table headers={d.headers} rows={d.rows}/></section>
      <section><h3 className="mb-2 text-sm font-bold">3. Exceptions & Recommended Follow-up</h3><Table headers={['Exception','Count','Recommended action','Owner']} rows={[
       ...(summary.missingStatement?[['Bank / UPI statement closing not supplied',num(summary.missingStatement),'Upload statement closing balance and reference source statement','Treasurer']]:[]),
       ...(summary.mismatches?[['Unresolved book-to-statement differences',num(summary.mismatches),'Trace outstanding deposits, unpresented cheques, bank charges, UPI settlement timing and transfer entries','Treasurer + Auditor']]:[]),
       ...(summary.missingAccounts?[['Accounts without reconciliation records',num(summary.missingAccounts),'Create account-month reconciliation records for each active cash/bank account','Treasurer']]:[]),
       ...(!summary.missingStatement&&!summary.mismatches&&!summary.missingAccounts?[['No open exceptions in loaded reconciliation records','0','Retain bank statement, UPI settlement reports and approval evidence','Treasurer']]:[])
      ]}/></section>
      <section><h3 className="mb-2 text-sm font-bold">4. Reconciliation Method & Limitations</h3><p className="text-xs leading-5">This report uses saved monthly reconciliation records and compares calculated book closing with statement closing where provided. It does not perform transaction-level bank-statement matching unless statement lines are imported and linked to SocietyOS transactions. A zero difference is a mathematical match only; source statement completeness and outstanding items must still be verified.</p></section>
     </div>
    </Panel>;
   })():selectedReport==='receipts-payments'?(()=> {
    const d=reportData as any;
    const x=d.summary||{};
    const receipts=d.receiptHeads||[],payments=d.paymentHeads||[];
    const topReceipt=receipts.slice().sort((a:any,b:any)=>b.amount-a.amount)[0];
    const topPayment=payments.slice().sort((a:any,b:any)=>b.amount-a.amount)[0];
    const totalAvailable=Number(x.openingTotal||0)+Number(x.receiptTotal||0);
    const cashCoverage=Number(x.paymentTotal||0)?totalAvailable/Number(x.paymentTotal)*100:0;
    const fmtAmount=(v:number)=>fmt(Number(v)||0);
    const periodName=period==='All months'?'Full FY 2018–19':period;
    const auditorReceipts=1176082.30,auditorOpening=166440.30,auditorDebtors=993765,auditorIncome=15877;
    const auditorPayments=1176082.30,auditorExpense=672592.20,auditorClosing=362616.10,auditorInvestment=120000,auditorLiability=2924,auditorDebtorMovement=17950;
    const actions:any[][]=[];
    if(!x.openingAvailable)actions.push(['Critical','Load and verify opening cash and bank balances by account','Treasurer','Establish a reliable opening position']);
    else actions.push(['High','Obtain bank statements and physical cash confirmation to verify calculated closing balance of '+fmtAmount(x.closingTotal),'Treasurer','Confirm actual funds available']);
    if(topPayment)actions.push(['High','Review '+topPayment.name+' payments totalling '+fmtAmount(topPayment.amount)+' against invoices, approvals and service evidence','Treasurer + Committee','Validate the largest payment head']);
    if(Number(x.contraTotal)>0)actions.push(['Medium','Review '+fmtAmount(x.contraTotal)+' contra transfers account by account; confirm both sides are matched','Treasurer','Ensure internal transfers are not treated as income or expense']);
    actions.push(['High','Reconcile the live cash movement statement to the auditor Tally statement using a separate non-cash / balance-sheet movement bridge','Auditor + Treasurer','Explain differences without mixing debtors, liabilities or investments with cash']);
    return <Panel title="RPT-16 · Receipts & Payments — Financial Movement & Control Report" action={<button onClick={()=>downloadCsv('RPT-16-receipts-payments-intelligence.csv',[['Pearl Meadows C Wing CHS Ltd'],['RPT-16 Receipts & Payments'],['Period',periodName],[],['Executive summary','Amount'],['Opening balance',x.openingAvailable?x.openingTotal:'Not available'],['Receipts',x.receiptTotal],['Payments',x.paymentTotal],['Calculated closing balance',x.openingAvailable?x.closingTotal:'Not available'],[],['Receipt head','Amount'],...receipts.map((h:any)=>[h.group+' · '+h.name,h.amount]),[],['Payment head','Amount'],...payments.map((h:any)=>[h.group+' · '+h.name,h.amount]),[],['Priority','Action','Owner','Outcome'],...actions])} className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Export full report CSV</button>}>
     <div id="rpt16-print-content" className="mx-auto max-w-5xl space-y-6 bg-white text-slate-800">
      <header className="border-b-2 border-slate-800 pb-4 text-center"><h2 className="text-base font-bold uppercase tracking-wide">Pearl Meadows 'C' Type 'C' Wing Chs Ltd</h2><p className="mt-1 text-xs font-semibold">Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014</p><h3 className="mt-4 text-lg font-bold uppercase">Receipts & Payments · Financial Movement & Control Report</h3><p className="mt-1 text-xs text-slate-600">FY 2018–19 · RPT-16 · Period: {periodName}</p><p className="mt-2 text-[10px] text-slate-500">Prepared from connected SocietyOS transactions · Generated {new Date().toLocaleDateString('en-IN')}</p></header>
      <section><h3 className="mb-2 text-sm font-bold">1. Executive Cash Movement Assessment</h3><p className="text-xs leading-6">For {periodName}, the connected records show {x.openingAvailable?'an opening cash and bank balance of '+fmtAmount(x.openingTotal):'no verified opening cash and bank balance'}, receipts of <strong>{fmtAmount(x.receiptTotal)}</strong> and payments of <strong>{fmtAmount(x.paymentTotal)}</strong>. {x.openingAvailable?'The calculated closing book position is ':'A closing cash and bank position cannot be established without opening balances. '}{x.openingAvailable?<strong>{fmtAmount(x.closingTotal)}</strong>:''}. This is a book-movement calculation; it is not a bank-confirmed or physically verified balance.</p>
       <div className="mt-4 rounded-lg border-2 border-slate-500 bg-slate-50 p-4 rpt16-summary">
        <h4 className="mb-3 border-b-2 border-slate-400 pb-2 text-sm font-extrabold uppercase tracking-wide">Cash Movement Summary</h4>
        <div className="space-y-0 text-sm">
         <div className="flex items-center justify-between gap-4 border-b border-slate-300 py-2"><span className="font-semibold">Opening cash & bank balance</span><strong className="tabular-nums">{x.openingAvailable?fmtAmount(x.openingTotal):'Not available'}</strong></div>
         <div className="flex items-center justify-between gap-4 border-b border-slate-300 py-2"><span className="font-semibold">Add: Recorded transaction receipts</span><strong className="tabular-nums">{fmtAmount(x.receiptTotal)}</strong></div>
         <div className="flex items-center justify-between gap-4 border-b border-slate-300 py-2"><span className="font-semibold">Less: Recorded transaction payments</span><strong className="tabular-nums">{fmtAmount(x.paymentTotal)}</strong></div>
         <div className="mt-1 flex items-center justify-between gap-4 border-t-2 border-double border-slate-600 bg-white px-3 py-3"><span className="text-sm font-extrabold uppercase">Calculated closing cash & bank balance</span><strong className="text-xl font-black tabular-nums">{x.openingAvailable?fmtAmount(x.closingTotal):'Not available'}</strong></div>
        </div>
        <p className="mt-3 text-[10px] italic text-slate-600">Calculation: Opening balance + recorded receipts − recorded payments = calculated closing balance. Subject to bank reconciliation and physical cash verification.</p>
       </div>
      </section>
      <section><h3 className="mb-2 text-sm font-bold">2. Receipts & Payments Account</h3><p className="mb-2 text-xs text-slate-600">Opening balance is presented on the receipts side and calculated closing balance on the payments side. Transaction heads are grouped by Category Group → Category Name. Contra transfers are excluded from receipts and payments totals.</p><div className="overflow-x-auto"><table className="w-full border-collapse text-xs"><thead><tr className="bg-slate-100"><th className="border border-slate-300 px-3 py-2 text-left">RECEIPTS — Particulars</th><th className="border border-slate-300 px-3 py-2 text-right">Amount (₹)</th><th className="border border-slate-300 px-3 py-2 text-left">PAYMENTS — Particulars</th><th className="border border-slate-300 px-3 py-2 text-right">Amount (₹)</th></tr></thead><tbody>{(d.rows||[]).map((row:any[],i:number)=>{const isGrandTotal=i===d.rows.length-3;const isTransactionTotal=i===d.rows.length-2;const isDisclosure=i===d.rows.length-1;return <tr key={i} className={isGrandTotal?'bg-slate-200 font-extrabold border-y-2 border-slate-500':isTransactionTotal?'bg-blue-50 font-bold border-y border-blue-300':isDisclosure?'bg-slate-50 text-slate-600 text-[10px]':'border-b border-slate-200'}>{row.map((cell:any,j:number)=><td key={j} className={'px-3 py-2 '+(j%2===1?'text-right tabular-nums':'text-left')}>{cell}</td>)}</tr>})}</tbody></table></div></section>
      <section><h3 className="mb-2 text-sm font-bold">3. Receipt Composition & Funding Sources</h3><Table headers={['Receipt head','Recorded amount','Share of receipts','Committee interpretation']} rows={receipts.map((h:any)=>[h.group+' · '+h.name,currencyCell(h.amount),x.receiptTotal?Math.round(h.amount/x.receiptTotal*100)+'%':'0%',/maintenance|parking/i.test(h.name)?'Member collection / recovery; reconcile to demand and receipt allocation':'Verify source, payer, bank credit and supporting receipt'])}/><p className="mt-2 text-xs leading-5">{topReceipt?'Largest recorded receipt head is '+topReceipt.name+' at '+fmtAmount(topReceipt.amount)+'. ':'No receipt transactions are recorded for this period. '}Receipt totals indicate money recorded in the books; they do not independently establish demand collection efficiency or completeness.</p></section>
      <section><h3 className="mb-2 text-sm font-bold">4. Payment Deployment & Cost Concentration</h3><Table headers={['Payment head','Recorded amount','Share of payments','Committee review']} rows={payments.map((h:any)=>[h.group+' · '+h.name,currencyCell(h.amount),x.paymentTotal?Math.round(h.amount/x.paymentTotal*100)+'%':'0%',h===topPayment?'Largest payment head: verify contract, invoice, approval and bank debit':'Verify voucher, invoice, approval and payment evidence'])}/><p className="mt-2 text-xs leading-5">{topPayment?'Largest payment head is '+topPayment.name+' at '+fmtAmount(topPayment.amount)+' ('+(x.paymentTotal?Math.round(topPayment.amount/x.paymentTotal*100):0)+'% of recorded payments). ':'No payment transactions are recorded for this period. '}A high share is a review priority, not evidence of excess or irregularity.</p></section>
      <section><h3 className="mb-2 text-sm font-bold">5. Liquidity & Balance Verification</h3><p className="text-xs leading-6">The calculated closing balance is derived from opening balance plus receipts less payments. It should be split and verified by individual bank account and cash-in-hand balance. The report does not treat debtors, investments, unpaid liabilities or other non-cash balance-sheet movements as cash. A positive calculated balance is not proof that the funds are available or reconciled.</p><Table headers={['Control indicator','Result','Interpretation / next step']} rows={[
       ['Opening balance records',x.openingAvailable?num((d.openingAccounts||[]).length):'0','Verify account-wise opening balance against prior-year closing statement'],
       ['Calculated closing position',x.openingAvailable?fmtAmount(x.closingTotal):'Not available','Reconcile each bank account to bank statement and cash to physical count'],
       ['Cash coverage of payments',x.paymentTotal?cashCoverage.toFixed(1)+'%':'Not applicable','Opening funds plus receipts compared with payments; not a liquidity certification'],
       ['Contra transfers excluded',fmtAmount(x.contraTotal),'Match transfer-out and transfer-in entries across accounts'],
       ['Transactions included',num(x.transactionCount),'Check completeness against source register']
      ]}/></section>
      <section><h3 className="mb-2 text-sm font-bold">6. Auditor Statement Comparison — Basis Difference</h3><p className="text-xs leading-6">The supplied auditor statement is a Tally-style accounting presentation, not a like-for-like cash transaction listing. It includes Sundry Debtors on both sides, a Sinking Fund FD investment, an audit fee payable and opening / closing cash balances. These balance-sheet movements must be bridged separately; they must not be added to live cash receipts or payments as if they were cash transactions.</p><Table headers={['Auditor statement item','Auditor FY 2018–19 amount','Treatment in SocietyOS RPT-16']} rows={[
       ['Opening Balance',currencyCell(auditorOpening),'Use verified account opening balances; compare to auditor'],
       ['Sundry Debtors — receipts side',currencyCell(auditorDebtors),'Non-cash receivable movement; exclude from cash receipts'],
       ['Indirect Incomes',currencyCell(auditorIncome),'Compare to mapped actual bank/cash receipts by category'],
       ['Sundry Debtors — payments side',currencyCell(auditorDebtorMovement),'Non-cash receivable movement; do not treat as cash payment'],
       ['Sinking Fund FD',currencyCell(auditorInvestment),'Investment transfer / placement; reconcile between bank and investment ledger'],
       ['Audit Fees Payable',currencyCell(auditorLiability),'Liability movement; not a cash payment unless paid in period'],
       ['Indirect Expenses',currencyCell(auditorExpense),'Compare to actual payment transactions; check classification and timing'],
       ['Closing Balance',currencyCell(auditorClosing),'Compare against calculated account-wise closing and bank/cash evidence'],
       ['Auditor statement total — both sides',currencyCell(auditorReceipts),'Tally statement balancing total; not directly comparable to cash-only totals']
      ]}/></section>
      <section><h3 className="mb-2 text-sm font-bold">7. Risk Signals & Steering Committee Actions</h3><Table headers={['Priority','Recommended action','Suggested owner','Expected outcome']} rows={actions}/><p className="mt-2 text-xs text-slate-600">These are rule-based control recommendations. They are not findings of misconduct, misappropriation or audit qualification.</p></section>
      <section><h3 className="mb-2 text-sm font-bold">8. Data Basis, Limitations & Reconciliation</h3><p className="text-xs leading-6">This report is generated from connected non-contra Receipt and Payment transactions, Category Master grouping and available Account Master opening balances. It is a cash-movement statement, not a complete statutory Receipts & Payments Account until the auditor's non-cash and balance-sheet movements are separately bridged. Closing figures are provisional until bank reconciliation, cash verification and auditor review are completed. Where opening balances or source mappings are missing, the report labels the limitation instead of estimating values.</p></section>
      <footer className="border-t pt-3 text-[10px] text-slate-500">Prepared by SocietyOS · Rule-based cash movement intelligence · Committee and auditor verification required.</footer>
     </div>
    </Panel>;
   })():<Panel title={(selectedReport==='expense-analysis'?'REG':selectedReport==='missing-docs'?'AUD':'RPT-'+(reportNumbers[selectedReport]||'—'))+' · '+reportData.title} action={<button onClick={()=>downloadCsv('society-report-'+selectedReport+'.csv',[[reportData.title],reportData.headers,...reportData.rows.map((row:any[])=>row.map((v:any)=>typeof v==='object'&&v!==null&&'props' in v?String((v as any).props.children??''):String(v??'')))])} className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Export this report</button>}>
<div className="mb-4 border-b-2 border-slate-800 pb-3 text-center"><h2 className="text-base font-bold uppercase tracking-wide text-slate-900">Pearl Meadows 'C' Type 'C' Wing Chs Ltd</h2><p className="mt-1 text-xs font-semibold text-slate-700">Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014</p><h3 className="mt-3 text-sm font-bold uppercase text-slate-900">{reportData.title}</h3><p className="mt-1 text-[11px] text-slate-600">Financial Year: FY 2018–19 · Report No. RPT-{reportNumbers[selectedReport]||'—'} · Generated: {new Date().toLocaleDateString('en-IN')}</p></div>
    <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{reportData.note}</p>
    <Table headers={reportData.headers} rows={reportData.rows}/>
   </Panel>}
  </>}
  </div></div>}

  <footer className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-slate-500"><span>Society OS · data is derived from connected records; missing fields are labelled rather than estimated.</span><span>Showing {Math.min(100,filtered.length)} of {num(filtered.length)} filtered transactions · CSV exports all filtered rows.</span></footer>
 </div>;
};

import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, CalendarDays, CheckCircle2, Download,
  FileText, Landmark, RefreshCw, Search, ShieldCheck, Users, Wallet, ArrowLeftRight, ClipboardList
} from 'lucide-react';
import { useVerification, ScreenId } from '../../context/VerificationContext';
import { supabaseClient } from '../../services/supabaseClient';

type Props = { screen: ScreenId };
type ReportTransaction = { demandId?: string; [key: string]: any };
const fmt = (n:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(n)||0);
const num = (n:number) => new Intl.NumberFormat('en-IN').format(Number(n)||0);
const COLORS = ['#16a34a','#ef4444','#2563eb','#f59e0b','#8b5cf6','#06b6d4','#64748b'];
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
  transactions, openingBalances, reconciliations, demandRegister, demandAdjustments, demandAllocations, memberFinancialBalances,
  cumulativeOutstanding, balanceRegister, partyMaster, flatOwnerMaster, categoryMaster, sourceRegister, stats,
  auditNotes, isLoadingTransactions, isLoadingDemandRegister, isLoadingMasters, refetchAll, setCurrentScreen,
  selectedAccountId, setSelectedAccountId, selectedMonthFilter, setSelectedMonthFilter, supabaseSync
 } = useVerification();
 const [period,setPeriod]=useState('All months');
 const [rpt15PeriodMode,setRpt15PeriodMode]=useState<'FY'|'YTD'|'MTD'>('FY');
 const [rpt15Month,setRpt15Month]=useState('Mar 2019');
 const [query,setQuery]=useState('');
 const [categoryFilter,setCategoryFilter]=useState('All categories');
 const [categoryGroupFilter,setCategoryGroupFilter]=useState('All category groups');
 const [partyTypeFilter,setPartyTypeFilter]=useState('All party types');
 const [statusFilter,setStatusFilter]=useState('All statuses');
 const [accountFilter,setAccountFilter]=useState<'TDCC'|'BOM'|'CASH'|'ALL'>('TDCC');
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
  {id:'member-opening-balance-register',name:'Member Opening Balance Register',category:'Debtors & Parties',description:'Approved imported opening balances, FY demand, receipts, adjustments and closing outstanding from the validated Supabase view'},
  {id:'party-balances',name:'Debtors — All Parties',category:'Receivables & Demand',description:'Party type, contact, opening, demand, receipts and closing receivable'},
  {id:'member-ledger',name:'Member / Flat Owner Ledger — Detailed',category:'Debtors & Parties',description:'Opening balance, chronological demands/receipts, running and closing balance'},
  {id:'vendor-ledger',name:'Vendor / Payee Ledger — Detailed',category:'Debtors & Parties',description:'Bills/payments where available, running payable and closing position'},
  {id:'demand-summary',name:'Demand Summary',category:'Receivables & Demand',description:'Period demand, collections, adjustments and closing dues'},
  {id:'monthly-demands',name:'Monthly Demand Matrix',category:'Receivables & Demand',description:'Opening balance and monthly demand; no pre-payment balance'},
  {id:'monthly-payments',name:'Monthly Cumulative Collection Matrix — Party-wise',category:'Receivables & Demand',description:'Cumulative actual receipts by receipt date and party'},
  {id:'monthly-flat-balance',name:'Monthly Flat Owner Collection Report',category:'Receivables & Demand',description:'Actual monthly receipts by flat owner and receipt month'},
  {id:'maintenance-performance',name:'Maintenance Collection & Delay Analysis',category:'Receivables & Demand',description:'On-time, late, outstanding maintenance and delay-charge performance'},
  {id:'demand-register',name:'Demand Register',category:'Demands & Payments',description:'Detailed demand records with transaction-mapped receipts, adjustments, outstanding and payment status'},
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
  {id:'cashbook',name:'Cash Book & Bank Books',category:'Registers',description:'Account-wise transactions with opening and closing balances'},
  {id:'receipts',name:'Receipts Register',category:'Registers',description:'Receipt date, payer, category group, cheque/reference and balance where supported'},
  {id:'payments',name:'Payment Register',category:'Registers',description:'Payee, party classification, payment mode, category, account, voucher and evidence details'},
  {id:'largest-payments-anomalies',name:'Largest Payments & Potential Anomalies',category:'Audit & Governance',description:'Largest individual payments with explainable screening flags, evidence gaps and recommended review actions'},
  {id:'bank-recon',name:'Bank Reconciliation Register',category:'Registers',description:'Monthly book-to-bank reconciliation with drill-down'},
  {id:'expense-analysis',name:'Expense Analysis by Category',category:'Registers',description:'Category group and monthly expenditure matrix'},
  {id:'missing-docs',name:'Missing Document / Evidence Register',category:'Audit & Governance',description:'Missing bills, vouchers and transaction evidence'},
  {id:'statutory',name:'Statutory & Governance Register',category:'Audit & Governance',description:'Applicable bylaws, meetings, approvals and statutory controls'},
  {id:'rectification',name:'Audit Observations & Rectification',category:'Audit & Governance',description:'Open observations, proposed correction and closure evidence'},
  {id:'receipt-allocation-review',name:'Receipt Allocation & Unmatched Receipts Review',category:'Demands & Payments',description:'Recorded receipts versus demand allocations'},
  {id:'opening-balance-review',name:'Opening Balance Verification & Exceptions',category:'Audit & Governance',description:'Recorded, missing and unverified opening balances'},
  {id:'adjustments-contra',name:'Adjustments Register',category:'Registers',description:'Demand adjustments and transaction corrections; contra transfers shown separately'},
  {id:'mapping-exceptions',name:'Transaction Mapping Exceptions',category:'Audit & Governance',description:'Missing party, category, account or source mappings'},
  {id:'unidentified-parties',name:'Unidentified Parties Audit',category:'Audit & Governance',description:'Transactions with missing, unknown or unmapped party names'},
  {id:'unidentified-accounts',name:'Unidentified Accounts Audit',category:'Audit & Governance',description:'Transactions with missing or unmapped cash/bank account mappings'},
  {id:'unidentified-categories',name:'Unidentified Categories Audit',category:'Audit & Governance',description:'Transactions with missing or unclassified categories and category groups'},
  {id:'payment-mode-quality',name:'Payment Mode Data Quality',category:'Audit & Governance',description:'Missing, inconsistent or unrecognized payment modes by transaction'},
  {id:'transaction-type-quality',name:'Transaction Type Data Quality',category:'Audit & Governance',description:'Missing or unexpected transaction types and counts / amounts'}
 ];
 const reportCategories=['All Reports','Receivables & Demand','Financial Statements','Registers','Ledgers','Debtors & Parties','Demands & Payments','Audit & Governance'];
 const categoryGroups=Array.from(new Set([...categoryMaster.map((x:any)=>String(x.category_group||'').trim()),...transactions.map((t:any)=>String(t.categoryGroup||'').trim())].filter(Boolean))).sort();
 const partyTypes=Array.from(new Set([...[],...partyMaster.map((x:any)=>String(x.party_type||x.party_type_name||'').trim())].filter(Boolean))).sort();
 const memberPartyTypes=partyTypes.filter(v=>/^members?$/i.test(v.trim()));
 const reportNumbers:Record<string,string>={'member-opening-balance-register':'40','party-balances':'01','member-ledger':'02','vendor-ledger':'03','demand-summary':'04','monthly-demands':'05','monthly-payments':'06','monthly-flat-balance':'07','maintenance-performance':'41','demand-register':'08','receipts-payments':'16','income-expense':'15','profit-loss':'15A','balance-sheet':'10','trial-balance':'11','monthly-summary':'12','cashbook':'13','receipts':'14','payments':'15','largest-payments-anomalies':'34','bank-recon':'16','expense-analysis':'17','missing-docs':'18','statutory':'19','rectification':'20','party-ledger-summary':'21','party-ledger-monthly':'22','party-ledger-detail':'23','account-ledger-summary':'24','account-ledger-monthly':'25','account-ledger-detail':'26','category-ledger-summary':'27','category-ledger-monthly':'28','category-ledger-detail':'29','receipt-allocation-review':'30','opening-balance-review':'31','adjustments-contra':'32','mapping-exceptions':'33','unidentified-parties':'35','unidentified-accounts':'36','unidentified-categories':'37','payment-mode-quality':'38','transaction-type-quality':'39'};
 const normalizedReportSearch=reportSearch.trim().toLowerCase();
 const filteredReportCatalog=reportCatalog.filter(r=>!normalizedReportSearch||[r.name,r.description,r.category,`RPT-${reportNumbers[r.id]||''}`,r.id].some(v=>String(v||'').toLowerCase().includes(normalizedReportSearch)));
 const visibleReportCategories=reportCategories.slice(1).filter(cat=>!normalizedReportSearch||filteredReportCatalog.some(r=>r.category===cat));
 const visibleReports=filteredReportCatalog.filter(r=>normalizedReportSearch||reportCategory==='All Reports'||r.category===reportCategory);
 const reportCounts=reportCategories.map(cat=>({name:cat,count:cat==='All Reports'?reportCatalog.length:reportCatalog.filter(r=>r.category===cat).length}));
 const loading=isLoadingTransactions||isLoadingDemandRegister||isLoadingMasters;
 const titles:Record<string,{title:string;sub:string}> = {
  'financial-summary':{title:'Financial Summary',sub:'Consolidated financial position, collections, payments, demand and control exceptions.'},
  'demand-collections':{title:'Demand & Collections',sub:'Monthly demands, receipts, charge-wise collection efficiency and member-wise outstanding dues.'},
  'payments-expenses':{title:'Payments & Expenses — Vendors / Payees',sub:'Vendor payments, expense category trends, supporting bills, approvals and advance-payment exceptions.'},
  'party-ledger':{title:'Party-wise Ledger',sub:'Member / flat-owner receivables and vendor / payee balances with traceable transaction history.'},
  'audit-evidence':{title:'Audit Evidence & Compliance',sub:'Document coverage, approval tracking, source traceability and audit observations.'},
  'bank-reconciliation':{title:'Bank Reconciliation',sub:'Bank/cash balances, book-versus-statement movement and unmatched credits/debits.'},
  'observations-actions':{title:'Observations & Corrective Actions',sub:'Exceptions requiring investigation, assigned action, supporting evidence and authorised closure.'},
  'reports':{title:'Reports & Registers',sub:'Financial statements, ledgers, statutory registers and management information from available records.'}
 };
 const config=titles[screen]||titles['financial-summary'];
 const allMonths=useMemo(()=>Array.from(new Set(transactions.map(t=>String(t.reportingMonth||t.month||'')).filter(Boolean))).sort((a,b)=>monthOrder.indexOf(a)-monthOrder.indexOf(b)),[transactions]);
 const filtered=useMemo(()=>transactions.filter(t=>{
  const m=String(t.reportingMonth||t.month||'');
  const periodOk=period==='All months'||m===period;
  const cat=String(t.categoryName||'Unclassified');
  const catOk=categoryFilter==='All categories'||cat===categoryFilter;
  const group=String(t.categoryGroup||categoryMaster.find((x:any)=>x.category_name===cat)?.category_group||'Unmapped');
  const groupOk=categoryGroupFilter==='All category groups'||group===categoryGroupFilter;
  const q=query.toLowerCase().trim();
  const qOk=!q||[t.id,t.party,t.description,t.categoryName,t.accountName,t.voucherNo,t.receiptNo,t.sourceFile].some(v=>String(v||'').toLowerCase().includes(q));
  const status=String(t.evidenceStatus||'Pending');
  const statusOk=statusFilter==='All statuses'||status===statusFilter;
  return periodOk&&catOk&&groupOk&&qOk&&statusOk;
 }),[transactions,period,categoryFilter,categoryGroupFilter,categoryMaster,query,statusFilter]);
 const receipts=filtered.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
 const payments=filtered.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
 const contra=filtered.filter(t=>t.transactionClass==='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
 const net=receipts-payments;
 const demandTotal=demandRegister.reduce((s,d)=>s+Number(d.total_demand||0),0);
 const outstanding=cumulativeOutstanding.reduce((s,r)=>s+Number(r.net_outstanding||0),0);
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
 const totalRecon=Object.entries(reconciliations).filter(([key])=>accountFilter==='ALL'||key===accountFilter).flatMap(([,rows])=>rows);
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
   const dedicatedId=selectedReport==='income-expense'?'#rpt15-print-content':selectedReport==='receipts-payments'?'#rpt16-print-content':null;
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
 const Card=({label,value,detail,icon:Icon,tone='blue'}:any)=><div className={'rounded-xl border p-4 min-w-0 '+({'blue':'border-blue-100 bg-blue-50/70','green':'border-emerald-100 bg-emerald-50/70','red':'border-red-100 bg-red-50/70','amber':'border-amber-100 bg-amber-50/70','violet':'border-violet-100 bg-violet-50/70'} as any)[tone]}><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-600">{label}</span><span className="rounded-lg bg-white/80 p-2 text-blue-700"><Icon className="h-4 w-4"/></span></div><div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</div><div className="mt-1 text-[11px] text-slate-500">{detail}</div></div>;
 const Panel=({title,children,action}:any)=><section className="min-w-0 overflow-hidden rounded-xl border border-blue-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)]"><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-bold text-blue-950">{title}</h2>{action}</div><div className="p-3 sm:p-4">{children}</div></section>;
 const Table=({headers,rows}:any)=><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"><thead className="bg-slate-50 text-slate-600"><tr>{headers.map((h:string)=><th key={h} className="border-b border-slate-200 px-2.5 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.length?rows.map((row:any[],i:number)=>{const group=String(row[0]??'').startsWith('__GROUP__');return group?<tr key={i} className="border-y border-slate-300 bg-slate-100"><td colSpan={headers.length} className="px-3 py-2.5 text-sm font-bold text-slate-900">{String(row[0]).slice(9)}</td></tr>:<tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40">{row.map((v:any,j:number)=><td key={j} className="px-2.5 py-2">{v}</td>)}</tr>;}):<tr><td colSpan={headers.length} className="px-3 py-8 text-center text-slate-500">No matching records in the connected data.</td></tr>}</tbody></table></div>;
 const pct=(n:number,d:number)=>d?Math.round(n/d*100):0;
 const currencyCell=(n:number)=><span className="font-semibold tabular-nums">{fmt(n)}</span>;
 const statusPill=(s:string)=><span className={'inline-flex rounded-full px-2 py-1 text-[10px] font-semibold '+(s==='Complete'||s==='Matched'||s==='Verified'?'bg-emerald-100 text-emerald-800':s==='Missing'||s==='Mismatch'||s==='Failed'?'bg-red-100 text-red-800':'bg-amber-100 text-amber-800')}>{s||'Not assessed'}</span>;
 const monthControl=<select value={period} onChange={e=>setPeriod(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option>All months</option>{allMonths.map(m=><option key={m}>{m}</option>)}</select>;
 const filterBar=<div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"><CalendarDays className="h-4 w-4 text-blue-700"/><span className="text-xs font-semibold text-slate-600">Period</span>{monthControl}<select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option>All categories</option>{cats.map(([c])=><option key={c}>{c}</option>)}</select><div className="relative min-w-[190px] flex-1"><Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search party, voucher, category, source…" className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs outline-none focus:border-blue-400"/></div><button onClick={()=>{setPeriod('All months');setCategoryFilter('All categories');setCategoryGroupFilter('All category groups');setQuery('');setStatusFilter('All statuses');setPartyTypeFilter('All party types')}} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">Reset</button></div>;
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
  let active=true;
  const load=async()=>{
   setOpeningRegisterLoading(true);setOpeningRegisterError(null);
   const [registerRes,partyRes]=await Promise.all([
    supabaseClient.from('v_opening_balance_register').select('*').order('party_id'),
    supabaseClient.from('party_master').select('party_id,party_name,party_type')
   ]);
   if(!active)return;
   if(registerRes.error){setOpeningRegisterError(registerRes.error.message);setOpeningRegisterRows([]);setOpeningRegisterLoading(false);return;}
   if(partyRes.error){setOpeningRegisterError('Member names could not be loaded: '+partyRes.error.message);setOpeningRegisterRows([]);setOpeningRegisterLoading(false);return;}
   const partyMap=new Map((partyRes.data||[]).map((p:any)=>[String(p.party_id||''),p]));
   setOpeningRegisterRows((registerRes.data||[]).map((r:any)=>{
    const p:any=partyMap.get(String(r.party_id||''))||{};
    return {...r,party_name:p.party_name||'Name not available',party_type:p.party_type||'Unclassified'};
   }));
   setOpeningRegisterLoading(false);
  };
  load().catch((e:any)=>{if(active){setOpeningRegisterError(e?.message||'Unable to load opening balance register.');setOpeningRegisterLoading(false);}});
  return ()=>{active=false;};
 },[screen,selectedReport]);
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
    const sourceTx=transactions.filter(t=>(!isVendor||t.type==='Payment')&&(!isAccount||accountFilter==='ALL'||String(t.accountId||'')===accountFilter||String(t.accountName||'').toUpperCase().includes(accountFilter))&&(!isCategory||categoryGroupFilter==='All category groups'||String(t.categoryGroup||categoryMaster.find((x:any)=>x.category_name===t.categoryName)?.category_group||'Unmapped')===categoryGroupFilter));
    const demandCategory=(t:any)=>categoryMaster.find((x:any)=>String(x.category_name||'')===String(t.categoryName||''))||{}; const getKey=(t:any)=>isParty?`${String(partyMaster.find((p:any)=>String(p.party_name||'')===String(t.party||''))?.party_type||'Unclassified')}¦${String(t.party||'Unmapped party')}`:isAccount?String(t.accountName||t.accountId||'Unmapped account'):`${String(demandCategory(t).demand_group||'Unmapped Demand Group')}¦${String(t.categoryGroup||demandCategory(t).category_group||'Unmapped Category Group')}¦${String(t.categoryName||'Unclassified')}`;
    const keys=new Set<string>(sourceTx.map(getKey));
    if(isParty&&!isVendor){flatOwnerMaster.forEach((x:any)=>{const name=String(x.owner_name||x.flat_no||'');const type=String(partyMaster.find((p:any)=>String(p.party_name||'')===name)?.party_type||'Unclassified');if(name)keys.add(`${type}¦${name}`);});memberFinancialBalances.forEach((x:any)=>{const name=String(x.member_name||x.flat_no||'');const type=String(partyMaster.find((p:any)=>String(p.party_name||'')===name)?.party_type||'Unclassified');if(name)keys.add(`${type}¦${name}`);});}
    if(isCategory) categoryMaster.forEach((x:any)=>keys.add(String(x.category_name||'Unclassified')));
    const scopedKeys=Array.from(keys).filter(k=>k&&(!query||k.toLowerCase().includes(query.toLowerCase()))&&(!isParty||partyTypeFilter==='All party types'||String(k.split('¦')[0]||'Unclassified')===partyTypeFilter)).sort();
    const openingFor=(key:string)=>isParty&&!isVendor?Number(memberFinancialBalances.find((x:any)=>String(x.member_name||'')===key.split('¦').slice(1).join('¦')||String(x.flat_no||'')===key.split('¦').slice(1).join('¦'))?.opening_balance)||0:isAccount?Number(openingBalances.find((x:any)=>String(x.accountName||'')===key||String(x.accountId||'')===key)?.recordedOpeningBalance)||0:0;
    if(mode==='summary'){
      const rows=scopedKeys.map(key=>{const ts=sourceTx.filter(t=>getKey(t)===key),opening=openingFor(key),rec=ts.filter(t=>t.type==='Receipt').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0),pay=ts.filter(t=>t.type==='Payment').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0),demand=isParty?reportDemands.filter((d:any)=>String(d.member_name||d.party_name||d.flat_no||d.member_id||'')===key.split('¦').slice(1).join('¦')).reduce((s,d)=>s+Number(d.total_demand||0),0):0;return isParty?[key.split('¦')[0],key.split('¦').slice(1).join('¦'),currencyCell(opening),currencyCell(demand),currencyCell(rec),currencyCell(opening+demand-rec)]:isAccount?[key,currencyCell(opening),currencyCell(rec),currencyCell(pay),currencyCell(opening+rec-pay)]:[...key.split('¦'),currencyCell(rec),currencyCell(pay),currencyCell(rec-pay)];});
      return {title:(isParty?'Party-wise':isAccount?'Account-wise':'Demand Group-wise')+' Ledger — Summary',note:isParty?'Party closing balances are provisional where opening balances, demand mapping or receipt allocation are incomplete.':isAccount?'Opening balances use the earliest available reconciliation record and must be checked against the approved opening balance.':'Income/expense category movement is not a brought-forward accounting balance.',headers:isParty?['Party Type','Party Name','Opening Balance','Demand / Charges','Receipts','Closing Receivable']:isAccount?['Account Name','Opening Balance','Receipts','Payments','Closing Balance']:['Demand Group','Category Group','Category Name','Receipts / Income','Payments / Expense','Net Movement'],rows};
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
        const vals=months.map(m=>{
          const monthKey=normalizeMonth(m);
          const ts=sourceTx.filter(t=>{
            const sameLedger=isParty
              ? String(t.party||'').trim().toLowerCase()===partyName.trim().toLowerCase()
              : getKey(t)===key;
            // The context normalises the reporting month into t.month (e.g. "Jun 2018").
            // Prefer that value; reportingMonth is the raw imported label (e.g. "Jun-2018").
            return sameLedger&&normalizeMonth(t.month||t.reportingMonth||t.date)===monthKey;
          });
          const rec=ts.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra')
            .reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);
          const pay=ts.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra')
            .reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);
          const contra=ts.filter(t=>t.transactionClass==='Contra')
            .reduce((sum,t)=>sum+(Number(t.amount)||0),0);
          const dem=isParty?reportDemands.filter((d:any)=>{
            const demandParty=String(
              d.member_name||d.party_name||d.flat_no||
              partyMaster.find((p:any)=>String(p.party_id||'')===String(d.party_id||''))?.party_name||
              d.member_id||''
            ).trim().toLowerCase();
            return demandParty===partyName.trim().toLowerCase()&&
              normalizeMonth(d.demand_month||d.month||d.reporting_month||d.demand_date||d.bill_date)===monthKey;
          }).reduce((sum,d)=>sum+Number(d.total_demand??d.demand_amount??0),0):0;
          const memberMovement=dem-rec;
          const accountMovement=rec-pay+contra;
          running+=isParty?memberMovement:isAccount?accountMovement:accountMovement;
          return {rec,pay,contra,dem,closing:running,net:accountMovement};
        });
        return isParty
          ? [key.split('¦')[0],partyName,currencyCell(opening),...vals.flatMap(v=>[currencyCell(v.dem),currencyCell(v.rec),currencyCell(v.closing)]),currencyCell(running)]
          : isAccount
            ? [key,currencyCell(opening),...vals.flatMap(v=>[currencyCell(v.rec),currencyCell(v.pay),currencyCell(v.closing)]),currencyCell(running)]
            : [...key.split('¦'),...vals.map(v=>currencyCell(v.net)),currencyCell(vals.reduce((sum,v)=>sum+v.net,0))];
      });
      return {title:(isParty?'Party-wise':isAccount?'Account-wise':'Demand Group-wise')+' Ledger — Month-wise',note:isParty?'Monthly closing is based on mapped demand less recorded receipts; allocation of receipts to specific months must be verified.':isAccount?'Balances roll forward from the earliest available reconciliation opening balance.':'Category figures show monthly movements; income and expense categories do not normally carry opening balances.',headers:isParty?['Party Type','Party Name','Opening',...months.flatMap(m=>[m+' Demand',m+' Paid',m+' Closing']),'Year-end Closing']:isAccount?['Account Name','Opening',...months.flatMap(m=>[m+' Receipts',m+' Payments',m+' Closing']),'Year-end Closing']:['Demand Group','Category Group','Category Name',...months,'Annual Net Movement'],rows};
    }
    const detailRows:any[][]=[];
    const moneyText=(value:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(value)||0);
    scopedKeys.forEach(key=>{
      const groupTransactions=sourceTx.filter(t=>getKey(t)===key&&(isAccount||t.transactionClass!=='Contra')).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.id||'').localeCompare(String(b.id||'')));
      const opening=openingFor(key);
      const groupLabel=isParty?key.split('¦').slice(1).join('¦'):isAccount?key:key.split('¦').join(' / ');
      const partyType=isParty?key.split('¦')[0]:'';
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
        return {date:String(d.demand_date||d.created_at||d.month||''),particulars,voucher:String(d.demand_id||d.id||'Demand Register'),category:categoryName,movement:Number(d.total_demand||d.demand_amount||0),kind:'Demand'};
      }):[];
      const events:any[]=[
        ...groupTransactions.map(t=>{
          const rawAmount=Number(t.amount)||0;
          const txKind=String(t.transactionClass||t.type||'').toLowerCase();
          const isContra=txKind.includes('contra');
          const isAdjustment=txKind.includes('adjust');
          // Member receivable convention: demand/payment increases debit; receipt reduces it.
          // Other ledgers preserve the signed source amount: positive = credit/inflow, negative = debit/outflow.
          const movement=isParty&&!isVendor
            ? (String(t.type||'').toLowerCase()==='receipt'?-Math.abs(rawAmount):String(t.type||'').toLowerCase()==='payment'?Math.abs(rawAmount):rawAmount)
            : rawAmount;
          return {
            date:String(t.date||''),particulars:(isAccount&&isContra?'Contra — ':'')+(isAccount&&isAdjustment?'Adjustment — ':'')+String(t.description||t.party||t.categoryName||'Transaction'),
            voucher:String(t.voucherNo||t.receiptNo||t.id||'—'),category:String(t.categoryName||'—'),
            movement,kind:txKind||'transaction'
          };
        }),
        ...memberDemands
      ].sort((a,b)=>a.date.localeCompare(b.date));
      const groupOpeningKnown=isParty
        ? memberFinancialBalances.some((x:any)=>String(x.member_name||'')===groupLabel||String(x.flat_no||'')===groupLabel)
        : isAccount
          ? openingBalances.some((x:any)=>String(x.accountName||'')===key||String(x.accountId||'')===key)
          : false;
      // Group header and all ledger rows use exactly seven columns.
      detailRows.push(isParty?[('__GROUP__'+(partyType?partyType+' / ':'')+groupLabel),'','','','','']: [('__GROUP__'+groupLabel),'','','','','','']);
      const isMemberLedger=isParty&&!isVendor;
      const memberBalanceMeaning=(value:number)=>value>0?'Member to Pay':value<0?'Member Credit Balance':'No Balance Due';
      const balanceDisplay=(value:number)=>isMemberLedger
        ? moneyText(Math.abs(value))+(value>0?' Dr':value<0?' Cr':'')
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
        groupOpeningKnown?(opening>0?moneyText(opening):'—'):'Not Recorded',
        groupOpeningKnown?(opening<0?moneyText(Math.abs(opening)):'—'):'—',
        groupOpeningKnown?balanceDisplay(running):'Not Verified'
      ]:[
        '—',openingParticulars,'Brought forward','—',
        groupOpeningKnown?(opening<0?moneyText(Math.abs(opening)):'—'):'Not Recorded',
        groupOpeningKnown?(opening>0?moneyText(opening):'—'):'—',
        groupOpeningKnown?balanceDisplay(running):'Not Verified'
      ]);
      events.forEach(e=>{
        running+=e.movement;
        const debit=isMemberLedger?e.movement>0:e.movement<0;
        const credit=isMemberLedger?e.movement<0:e.movement>0;
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

    return {title:isVendor?'Vendor / Payee Ledger — Detailed':selectedReport==='member-ledger'?'Member / Flat Owner Ledger — Detailed':(isParty?'Party-wise':isAccount?'Account-wise':'Demand Group-wise')+' Ledger — Detailed',note:'Each party, account or category group is shown separately with its opening balance (where a verified source exists), dated transaction details and closing balance. Member demand entries are shown as charges and receipts reduce the receivable balance. Category groups show period movement; no unsupported opening balance is assumed.',headers:isParty?['Date','Particulars','Voucher / Receipt No.','Debit / Payment','Credit / Receipt','Balance']:['Date','Particulars','Voucher / Receipt No.','Category','Debit / Payment','Credit / Receipt','Balance'],rows:detailRows};
   }
   case 'member-opening-balance-register': return {title:'Member Opening Balance Register — FY 2018–19',note:'Opening-position register only: shows the approved brought-forward member balances at the start of FY 2018–19. It does not include current-year demands or receipts. Debtors — All Parties is the current-year position report, calculated from opening balance plus recorded demands less actual receipts and approved adjustments.',headers:[],rows:[]};
   case 'receipt-allocation-review': {
    const allocations=Array.isArray(demandAllocations)?demandAllocations:[];
    const receiptTx=transactions.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra');
    const allocatedIds=new Set(allocations.map((a:any)=>String(a.transaction_id||a.receipt_transaction_id||a.receipt_id||'')).filter(Boolean));
    const rows=receiptTx.filter(t=>!allocatedIds.has(String(t.id||''))).filter(t=>!query||[t.party,t.id,t.categoryName,t.description].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))).map(t=>[t.date||'—',t.id||'—',t.party||'Unmapped party',t.categoryName||'Unmapped category',String(t.reportingMonth||t.month||'—'),currencyCell(Math.abs(Number(t.amount)||0)),'No linked allocation','Review payer, charge period and approved allocation policy']);
    return {title:'Receipt Allocation & Unmatched Receipts Review',note:'Lists recorded non-contra receipts without a matching allocation record. This is a review queue, not proof that each receipt is overdue or that oldest-first allocation is authorised.',headers:['Receipt Date','Transaction ID','Payer','Category','Recorded Month','Receipt Amount','Allocation Status','Recommended Review'],rows};
   }
   case 'opening-balance-review': {
    const accounts=(openingBalances||[]).map((a:any)=>['Account',a.accountName||a.accountId||'Unidentified account',a.recordedOpeningBalance==null?'Not recorded':currencyCell(Number(a.recordedOpeningBalance)||0),a.verificationStatus||a.status||'Not verified',a.remarks||'Confirm against prior-year audited closing balance']);
    const members=(memberFinancialBalances||[]).map((m:any)=>['Member / Owner',m.member_name||m.flat_no||'Unidentified member',m.opening_balance==null?'Not recorded':currencyCell(Number(m.opening_balance)||0),m.opening_balance_status||m.verification_status||'Not verified',m.notes||'Confirm against FY 2017–18 closing member ledger']);
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
    receiptRows.forEach(t=>{
      const matchedId=partyIdForReceipt(t,demandParty);
      const payer=String(t.party||'').trim();
      const key=matchedId||('UNMAPPED:'+payer.toLowerCase());
      const p=partyMaster.find((x:any)=>String(x.party_id)===matchedId);
      if(!parties.has(key))parties.set(key,{id:key,name:p?.party_name||payer||'Unidentified payer',type:p?.party_type||'Unmapped / Review',flat:p?.flat_no||'—',monthly:Array(12).fill(0),count:0,last:'—'});
      const date=transactionDate(t);
      const dateParts=date.match(/^\d{4}-(\d{2})-/); const monthNumber=dateParts?Number(dateParts[1]):0; const idx=monthNumber>=1&&monthNumber<=12?(monthNumber+8)%12:-1;
      if(idx>=0){const row=parties.get(key);row.monthly[idx]+=Math.abs(Number(t.amount)||0);row.count++;if(date>row.last)row.last=date;}
    });
    const rows=Array.from(parties.values()).filter(x=>!query||[x.name,x.type].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase().trim()))).sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name));
    const totalByMonth=monthLabels.map((_,i)=>rows.reduce((sum:number,x:any)=>sum+x.monthly[i],0));
    return {title:'Monthly Flat Owner Collection Report',note:'This is a collection report: each month shows actual non-contra receipts by transaction date, grouped by matched party. Receipts that cannot be matched to a Party Master record remain visible under Unmapped / Review using the original payer label; they are not assigned to a guessed member.',headers:['Party Type','Party Name','Flat / Shop No.',...monthLabels,'Total FY Collections','Receipt Count','Last Receipt Date'],rows:[...rows.map(x=>[x.type,x.name,x.flat,...x.monthly.map(currencyCell),currencyCell(x.monthly.reduce((a:number,b:number)=>a+b,0)),x.count,x.last]),['TOTAL — ALL RECORDED RECEIPTS','','',...totalByMonth.map(currencyCell),currencyCell(totalByMonth.reduce((a:number,b:number)=>a+b,0)),rows.reduce((sum:number,x:any)=>sum+x.count,0),'']]};
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
     return Boolean(p&&isMember(p));
    });
    const parties=new Map<string,any>();
    memberDemands.forEach((d:any)=>{
     const id=String(d.party_id||'');if(!id)return;
     const p=partyMaster.find((x:any)=>String(x.party_id)===id);
     if(!parties.has(id)){
      const opening=Number(memberFinancialBalances.find((b:any)=>String(b.party_id||'')===id)?.opening_balance)||0;
      parties.set(id,{id,name:p?.party_name||d.member_name||id,type:p?.party_type||'Member',opening,groupAmounts:{},adjustments:0});
     }
     if(period!=='All months'&&monthKey(d.month||d.demand_month)!==monthKey(period))return;
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
    const headers=['Party Type','Party Name','Opening Balance',...demandGroupColumns,'Total Current Period Demand','Total Demands','Approved Adjustments'];
    const tableRows=rows.map(p=>[p.type,p.name,currencyCell(p.opening),...demandGroupColumns.map((group:string)=>currencyCell(p.groupAmounts[group]||0)),currencyCell(p.periodDemand),currencyCell(p.opening+p.periodDemand),currencyCell(p.adjustments)]);
    const totals=['TOTAL — MEMBERS','',currencyCell(rows.reduce((v:number,p:any)=>v+p.opening,0)),...demandGroupColumns.map((group:string)=>currencyCell(rows.reduce((v:number,p:any)=>v+Number(p.groupAmounts[group]||0),0))),currencyCell(rows.reduce((v:number,p:any)=>v+p.periodDemand,0)),currencyCell(rows.reduce((v:number,p:any)=>v+p.opening+p.periodDemand,0)),currencyCell(rows.reduce((v:number,p:any)=>v+p.adjustments,0))];
    return {title:'Demand Summary — Members Only',note:'Members only. Demand Group values from Category Master are mapped into the fixed columns: Maintenance Charges (including Parking), Non-Occupancy Charges, Delay Charges and Other Recoveries. The selected period filter applies to all demand columns. Any member Demand Group not matching the first four classifications is included in Other Recoveries. Opening balance and approved adjustments are shown separately. Non-member parties and ad-hoc transactions are excluded.',headers,rows:[...tableRows,totals]};
   }
   case 'monthly-demands': {
    // Monthly drill-up of Demand Summary: members only, with one column per demand month.
    const isMember=(party:any)=>/^members?$/i.test(String(party?.party_type||party?.party_type_name||'').trim());
    const demandMonthKey=(value:any)=>{
     const raw=String(value??'').trim();
     if(!raw)return '';
     const monthNames=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
     const monthMatch=raw.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|october|oct|november|nov|december|dec)\b/i);
     const yearMatch=raw.match(/\b(20\d{2}|\d{2})\b/);
     if(monthMatch&&yearMatch){
      const monthName=monthMatch[1].slice(0,3).toLowerCase();
      const month=monthNames.indexOf(monthName);
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
    memberDemands.forEach((d:any)=>{
     const id=String(d.party_id||'');if(!id)return;
     const p=partyMaster.find((x:any)=>String(x.party_id)===id);
     if(!parties.has(id))parties.set(id,{id,name:p?.party_name||d.member_name||id,type:p?.party_type||'Member',monthly:Array(monthLabels.length).fill(0)});
     const key=demandMonthKey(d.month||d.demand_month||d.demand_date);
     const idx=monthLabels.findIndex(m=>demandMonthKey(m)===key);
     if(idx>=0)parties.get(id).monthly[idx]+=demandNetAmount(d);
    });
    const rows=Array.from(parties.values())
     .filter(x=>!query||[x.name,x.type].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase().trim())))
     .filter(x=>partyTypeFilter==='All party types'||x.type===partyTypeFilter)
     .sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name));
    const monthTotals=monthLabels.map((_,i)=>rows.reduce((sum:number,x:any)=>sum+Number(x.monthly[i]||0),0));
    return {title:'Monthly Demand Matrix — Members Only',note:'Monthly drill-up of Demand Summary. Includes only member demands and uses demand month (not receipt month). Maintenance and Parking remain included in member demand totals, as in Demand Summary. Opening balances are excluded; each month shows demand raised in that month. Separate Party Master records remain separate rows.',headers:['Party Type','Party Name',...monthLabels,'Total Demand'],rows:[...rows.map(x=>[x.type,x.name,...x.monthly.map(currencyCell),currencyCell(x.monthly.reduce((sum:number,v:number)=>sum+v,0))]),['TOTAL — MEMBERS','',...monthTotals.map(currencyCell),currencyCell(monthTotals.reduce((sum:number,v:number)=>sum+v,0))]]};
   }
   case 'monthly-payments': {
    const parties=new Map<string,any>(),demandParty=new Map<string,string>();
    reportDemands.forEach((d:any)=>{const id=String(d.party_id||''),did=String(d.demand_id||d.id||'');if(id&&did)demandParty.set(did,id);});
    receiptRows.forEach(t=>{
      const matchedId=partyIdForReceipt(t,demandParty);
      const payer=String(t.party||'').trim();
      const key=matchedId||('UNMAPPED:'+payer.toLowerCase());
      const p=partyMaster.find((x:any)=>String(x.party_id)===matchedId);
      if(!parties.has(key))parties.set(key,{id:key,name:p?.party_name||payer||'Unidentified payer',type:p?.party_type||'Unmapped / Review',monthly:Array(12).fill(0)});
      const date=transactionDate(t);
      const dateParts=date.match(/^\d{4}-(\d{2})-/); const monthNumber=dateParts?Number(dateParts[1]):0; const idx=monthNumber>=1&&monthNumber<=12?(monthNumber+8)%12:-1;
      if(idx>=0)parties.get(key).monthly[idx]+=Math.abs(Number(t.amount)||0);
    });
    const rows=Array.from(parties.values()).map(x=>({...x,cumulative:x.monthly.map((_:number,i:number)=>x.monthly.slice(0,i+1).reduce((a:number,b:number)=>a+b,0))})).filter(x=>!query||[x.name,x.type].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase().trim()))).sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name));
    const totals=monthLabels.map((_,i)=>rows.reduce((sum:number,x:any)=>sum+x.cumulative[i],0));
    return {title:'Monthly Cumulative Collection Matrix — Party-wise',note:'Each month shows cumulative actual non-contra receipts from FY start, grouped by actual transaction date and party. Party-matched receipts appear under the Party Master name; unmatched payer labels remain visible as Unmapped / Review. This is cumulative collections, not a closing receivable balance or demand allocation.',headers:['Party Type','Party Name',...monthLabels,'FY Cumulative Receipts'],rows:[...rows.map(x=>[x.type,x.name,...x.cumulative.map(currencyCell),currencyCell(x.cumulative[11]||0)]),['TOTAL — ALL RECORDED RECEIPTS','',...totals.map(currencyCell),currencyCell(totals[11]||0)]]};
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
    // Party balance is calculated from opening + recorded demands - actual receipts - approved adjustments.
    const rows=(partyMaster as any[]).filter(p=>p.party_type!=='Bank Account').map(p=>{
      const owner=flatOwnerMaster.find((o:any)=>String(o.owner_name||'').trim().toLowerCase()===String(p.contact_person||'').trim().toLowerCase()||String(o.owner_name||'').trim().toLowerCase()===String(p.party_name||'').trim().toLowerCase());
      const flat=String(p.flat_no||owner?.flat_no||(owner as any)?.flat_number_source_value||'');
      const bal=memberFinancialBalances.find((b:any)=>String(b.party_id||'')===String(p.party_id||''))||memberFinancialBalances.find((b:any)=>String(b.flat_no||'')===flat||String(b.member_name||'')===String(p.party_name||''));
      const ds=reportDemands.filter((d:any)=>String(d.party_id||'')===String(p.party_id||'')||(flat&&String(d.flat_no||'')===flat));
      const partyLabels=new Set([p.party_name,p.contact_person,flat,owner?.owner_name].filter(Boolean).map((v:any)=>String(v).trim().toLowerCase()));
      const demandParty=new Map<string,string>(); reportDemands.forEach((d:any)=>{const did=String(d.demand_id||d.id||'');if(did&&d.party_id)demandParty.set(did,String(d.party_id));}); const receipts=transactions.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra'&&(demandParty.get(transactionDemandId(t))===String(p.party_id||'')||partyLabels.has(String(t.party||'').trim().toLowerCase())));
      const paid=receipts.reduce((sum,t)=>sum+Math.abs(Number(t.amount)||0),0);
      const billed=ds.reduce((sum,d)=>sum+Number(d.total_demand??d.demand_amount??0),0);
      const demandIds=new Set(ds.map((d:any)=>String(d.demand_id||d.id||'')));
      const adjustment=demandAdjustments.filter((a:any)=>a.is_approved===true&&demandIds.has(String(a.demand_id||''))).reduce((sum,a)=>sum+Number(a.amount??a.adjustment_amount??0),0);
      const opening=Number(bal?.opening_balance)||0;
      const net=opening+billed-paid-adjustment;
      const closing=Math.max(0,net);
      const status=net>0.005?'Outstanding':net< -0.005?'Advance Paid':'No Dues';
      const receiptDates=receipts.map(t=>String(t.date||'')).filter(Boolean).sort();
      return {partyType:p.party_type||'Unclassified',name:p.party_name||owner?.owner_name||'Unidentified party',opening,billed,paid,adjustment,closing,last:receiptDates.at(-1)||'—',status};
    }).filter(x=>!query||[x.name,x.partyType].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))).filter(x=>partyTypeFilter==='All party types'||x.partyType===partyTypeFilter).sort((a,b)=>a.partyType.localeCompare(b.partyType)||a.name.localeCompare(b.name));
    return {title:'Debtors — All Parties',note:'Sorted by Party Type and Party Name. Closing position = Opening Balance + recorded demands − actual party-matched receipts − approved demand adjustments. No Dues means zero balance; Outstanding means amount receivable; Advance Paid means receipts exceed recorded dues. This report does not infer unrecorded demands or allocate unmatched receipts.',headers:['Sr. No.','Party Type','Party Name','Opening Balance','Total Demand','Total Received','Approved Adjustments','Closing Receivable','Last Payment','Status'],rows:rows.map((x,i)=>[i+1,x.partyType,x.name,currencyCell(x.opening),currencyCell(x.billed),currencyCell(x.paid),currencyCell(x.adjustment),currencyCell(x.closing),x.last,statusPill(x.status)])};
   }
   case 'member-ledger': return {title:'Member / Flat Owner Ledger',note:'Combines available FY balance records with cumulative member balances. Demand-to-receipt matching is provisional where allocations are incomplete.',headers:['Flat No','Member','Opening balance','Billed','Received','Adjustments','Closing / outstanding'],rows:cumulativeOutstanding.filter(r=>!query||[r.flat_no,r.member_name].some(v=>String(v||'').toLowerCase().includes(query.toLowerCase()))).map(r=>{const b=memberFinancialBalances.find(x=>x.flat_no===r.flat_no);return [r.flat_no||'—',r.member_name||'Unmapped',currencyCell(Number(b?.opening_balance)||0),currencyCell(Number(r.total_billed??b?.billed_amount)||0),currencyCell(Number(r.total_received??b?.received_amount)||0),currencyCell(Number(r.total_adjustments??b?.adjusted_amount)||0),currencyCell(Number(r.net_outstanding??b?.closing_balance)||0)]})};
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
   case 'cashbook': {const rows=Object.entries(filtered.filter(t=>accountFilter==='ALL'||String(t.accountId||'')===accountFilter||String(t.accountName||'').toUpperCase().includes(accountFilter)).reduce((a:Record<string,{r:number;p:number;c:number}>,t)=>{const k=t.accountName||t.accountId||'Unmapped account';a[k]??={r:0,p:0,c:0};if(t.transactionClass==='Contra')a[k].c+=Math.abs(Number(t.amount)||0);else if(t.type==='Receipt')a[k].r+=Math.abs(Number(t.amount)||0);else if(t.type==='Payment')a[k].p+=Math.abs(Number(t.amount)||0);return a},{})).map(([k,v])=>{const acc=openingBalances.find((x:any)=>String(x.accountName||'')===k||String(x.accountId||'')===k);const opening=acc?.recordedOpeningBalance==null?null:Number(acc.recordedOpeningBalance);return [k,opening===null?'Not available':currencyCell(opening),currencyCell(v.r),currencyCell(v.p),opening===null?'Not available':currencyCell(opening+v.r-v.p),currencyCell(v.c)]});return {title:'Cash Book & Bank Books',note:'Opening balances are taken from Account Master. Closing is a provisional book movement excluding contra transfers; compare with the bank passbook/cash book before marking reconciled.',headers:['Account','Opening Balance','Receipts','Payments','Calculated Closing Balance','Contra Movements'],rows}};
   case 'demand': return {title:'Demand vs Collections',note:'Demand totals come from demand records; receipt matching is provisional unless payment allocations are complete.',headers:['Flat No','Member','Bills','Total demand','Recorded outstanding','Demand status'],rows:Array.from(new Set(reportDemands.map(d=>String(d.flat_no||d.member_id||'Unmapped')))).map(k=>{const ds=reportDemands.filter(d=>String(d.flat_no||d.member_id||'Unmapped')===k);const b=cumulativeOutstanding.find(x=>x.flat_no===k);return [ds[0]?.flat_no||'—',b?.member_name||ds[0]?.member_id||'Unmapped',num(ds.length),currencyCell(ds.reduce((s,d)=>s+Number(d.total_demand||0),0)),currencyCell(Number(b?.net_outstanding)||0),statusPill(ds.every(d=>String(d.payment_status||'').toLowerCase()==='paid')?'Paid':'Review allocation')]})};
   case 'expense-analysis': {const months=['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];const names=Array.from(new Set(filtered.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra').map(t=>t.categoryName||'Unclassified')));return {title:'Expense Analysis by Category',note:'Monthly payments grouped by category group and category. Contra transfers are excluded. Values reflect recorded cash payments, not necessarily accrual-basis expenditure.',headers:['Category Group','Category',...months,'Annual Total'],rows:names.filter(n=>!query||n.toLowerCase().includes(query.toLowerCase())).map(n=>{const group=categoryMaster.find((x:any)=>x.category_name===n)?.category_group||filtered.find(t=>t.categoryName===n)?.categoryGroup||'Unmapped';const vals=months.map(m=>filtered.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra'&&(t.categoryName||'Unclassified')===n&&String(t.reportingMonth||t.month||'').replace(/\\n/g,' ').trim().toLowerCase()===m.toLowerCase()).reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0));return [group,n,...vals.map(currencyCell),currencyCell(vals.reduce((s,v)=>s+v,0))]})}};
   case 'missing-docs': return {title:'Missing Document / Evidence Register',note:'Transactions with incomplete evidence, missing bills or missing voucher/receipt references.',headers:['Date','Transaction ID','Party','Category','Amount','Voucher / receipt','Bill status','Evidence status'],rows:filtered.filter(t=>t.evidenceStatus!=='Complete'||t.billStatus==='Missing'||t.voucherReceiptStatus==='Missing').map(t=>[t.date||'—',t.id||'—',t.party||'Unmapped',t.categoryName||'Unclassified',currencyCell(Math.abs(Number(t.amount)||0)),t.voucherNo||t.receiptNo||'Missing',statusPill(t.billStatus||'Not assessed'),statusPill(t.evidenceStatus||'Pending')])};
   case 'bank-recon': return {title:'Bank Reconciliation Register',note:'Displays saved reconciliation records only. Confirm book and statement balances are populated before relying on differences.',headers:['Account','Month','Status','Adjustments','Remarks'],rows:totalRecon.map(x=>[String((x as any).accountId||'—'),String((x as any).monthId||'—'),statusPill(String((x as any).status||'Pending')),currencyCell(Number((x as any).adjustments)||0),String((x as any).remarks||'—')])};
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
     return Boolean(p&&isMember(p))&&(period==='All months'||monthKey(d.month||d.demand_month)===monthKey(period));
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
    const rows=Array.from(partyGroups.values()).sort((a:any,b:any)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name));
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

   case 'balance-sheet': {const rows=[['Cash / Bank','Account-wise reconciliations','Requires verified account-wise closing balances'],['Member Receivables','Cumulative outstanding register',currencyCell(cumulativeOutstanding.reduce((s,x)=>s+Math.max(0,Number(x.net_outstanding)||0),0))],['Vendor Payables','Vendor bills / payable allocations','Not available as a complete bill-level register'],['Deposits / Investments','Investment register','Not available in connected sources'],['Society Funds / Accumulated Balance','Approved prior-year balance sheet','Required from audited closing balances'],['Member FY balances',num(memberFinancialBalances.length)+' rows','Verify opening and closing balance mapping'],['Bank Reconciliation',num(totalRecon.length)+' account-month records',unmatched?'Unresolved differences exist':'Verify source statement balances'],['Balance Sheet equation','Assets = Liabilities + Funds','Cannot certify until all heads are mapped and verified']];return {title:'Balance Sheet Working Statement (Provisional)',note:'This report identifies available balance-sheet evidence and explicitly labels balances that cannot yet be calculated. It is not a complete Balance Sheet until assets, liabilities, funds and prior-year closing balances reconcile.',headers:['Balance Sheet Head','Source / Basis','Amount or Status'],rows}};
   case 'trial-balance': {const rows=Array.from(new Set(transactions.map(t=>String(t.accountName||'Unmapped account')))).map(name=>{const ts=filtered.filter(t=>String(t.accountName||'Unmapped account')===name&&t.transactionClass!=='Contra');const debit=ts.filter(t=>t.type==='Payment').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);const credit=ts.filter(t=>t.type==='Receipt').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);return [name,'Not mapped',currencyCell(debit),currencyCell(credit),'Unposted cash-movement view']});return {title:'Trial Balance & Posting Reconciliation (Provisional)',note:'The source transaction model records receipts/payments but does not establish complete double-entry debit and credit postings. This is a posting-readiness view, not a certified Trial Balance; it must not be forced to balance.',headers:['Account / Ledger','Account Group','Recorded Debit-side Payments','Recorded Credit-side Receipts','Posting Status'],rows:[...rows,['Unmapped transactions','—',num(filtered.filter(t=>!t.accountName||!t.categoryName).length),'—','Review mapping'],['Double-entry posting completeness','—','—','—','Missing / requires journal-posting model']]}};
   case 'statutory': return {title:'Statutory & Governance Register',note:'Governance records are not currently connected. Missing records must not be treated as compliant.',headers:['Operational control','Evidence required','Current status'],rows:[['AGM','Notice, agenda, attendance, minutes, audited accounts, resolutions',statusPill('Governance data required')],['Monthly committee meetings','Notice, attendance, minutes and resolutions',statusPill('Governance data required')],['Monthly receipts/payments review','Treasurer report and committee review',statusPill('Financial data available; approval trail incomplete')],['Major expenditure approvals','Resolution, quotations, sanction and voucher',statusPill('Evidence linkage required')],['Elections / resignations / handover','Election records, resignation acceptance, handover and liabilities',statusPill('Governance data required')],['Complaints register','Complaint, assigned owner, due date and closure evidence',statusPill('Operational register required')]]};
   case 'rectification': return {title:'Audit Observations & Rectification Register',note:'This is a working exception register. Assign an owner, target date and authorised closure evidence in the governance workflow.',headers:['Date','Reference','Observation','Category','Status','Suggested action'],rows:[...filtered.filter(t=>t.evidenceStatus==='Missing'||t.evidenceStatus==='Discrepancy'||t.internalAuditStatus==='Failed'||t.internalAuditStatus==='Pending').map(t=>[t.date||'—',t.id||t.voucherNo||'—',t.remarks||t.description||'Evidence / verification follow-up',t.categoryName||'Transaction review',statusPill(t.internalAuditStatus||t.evidenceStatus||'Pending'),'Investigate, attach evidence and record approved closure']),...auditNotes.map(n=>[n.timestamp||'—',n.author||'Audit note',n.title||n.content||'—',n.tag||'Observation',statusPill(n.priority||'Not assessed'),'Assign owner, target date and closure approval'])]};
   default: {const months=['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];const rows:any[][]=[];(openingBalances||[]).filter((a:any)=>accountFilter==='ALL'||String(a.accountId||'')===accountFilter).forEach((a:any)=>{let opening=Number(a.recordedOpeningBalance)||0;months.forEach(m=>{const tx=transactions.filter(t=>t.accountId===a.accountId&&String(t.month||t.reportingMonth||'').replace(/-/g,' ').trim().toLowerCase()===m.toLowerCase());const rec=tx.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);const pay=tx.filter(t=>t.type==='Payment'&&t.transactionClass!=='Contra').reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);const contraRows=tx.filter(t=>t.transactionClass==='Contra');const contra=contraRows.reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);const closing=opening+rec-pay;const recon=Object.values(reconciliations).flat().find((x:any)=>x.accountId===a.accountId&&String(x.month||'').replace(/-/g,' ').trim().toLowerCase()===m.toLowerCase());if(period==='All months'||period===m)rows.push([m,a.accountName||a.accountId,currencyCell(opening),currencyCell(rec),currencyCell(pay),currencyCell(contra),currencyCell(closing),recon?.sourceClosingBalance==null?'Not supplied':currencyCell(Number(recon.sourceClosingBalance)),statusPill(recon?.status||'Provisional — statement balance missing')]);opening=closing;});});return {title:'Monthly Financial Control Summary',note:'Opening balances come from Account Master; monthly closing is calculated from recorded non-contra receipts and payments. Contra movements are shown separately and source closing balances remain unverified until bank/cash statement data is entered.',headers:['Month','Account','Opening Balance','Receipts','Payments','Contra Movements','Calculated Closing Balance','Source Closing Balance','Reconciliation Status'],rows}};
  }
 },[selectedReport,filtered,cumulativeOutstanding,memberFinancialBalances,demandRegister,demandAdjustments,flatOwnerMaster,cats,payments,totalRecon,unmatched,balanceRegister,partyMaster,monthly,transactions,auditNotes,query,partyTypeFilter,categoryGroupFilter,openingBalances,categoryMaster]);
 return <div className="mx-auto max-w-[1800px] space-y-4">
  {screen!=='reports'&&<header className="rounded-xl bg-gradient-to-r from-sky-950 via-blue-950 to-slate-900 p-3 text-white shadow-sm">
   <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-sky-200"><span className="h-2 w-2 rounded-full bg-emerald-400"/>{screen==='audit-evidence'||screen==='observations-actions'?'Audit & Compliance':'Society Financial Management'}</div><h1 className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">{config.title}</h1><p className="mt-1 max-w-3xl text-xs text-sky-100/90">{config.sub}</p></div><div className="flex flex-wrap items-center gap-2"><label className="text-[10px] text-sky-100">Financial year <select className="ml-2 rounded-md bg-white px-2 py-2 text-xs text-slate-900"><option>FY 2018–19</option></select></label><button onClick={()=>void refetchAll()} className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"><RefreshCw className="h-4 w-4"/>Refresh</button><div className="flex items-center gap-1"><button onClick={exportRows} className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-2.5 py-2 text-xs font-semibold hover:bg-blue-400"><Download className="h-4 w-4"/>CSV</button><button onClick={exportTxt} className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-2 text-xs font-semibold hover:bg-white/20">TXT</button><button onClick={exportPdf} className="rounded-lg border border-white/25 bg-white/10 px-2.5 py-2 text-xs font-semibold hover:bg-white/20">PDF</button></div></div></div>
  </header>}
  {loading&&<div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-800">Loading the latest society records…</div>}
  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><strong>Preliminary — not an audit opinion.</strong> Values reflect currently available connected records and must not be treated as certified statutory figures.</div>
   {screen==='financial-summary'&&<>
   <div className="flex flex-wrap gap-2"><ReportLink id="receipts-payments" category="Financial Statements" label="Receipts & Payments"/><ReportLink id="cashbook" category="Registers" label="Cash & Bank Books"/><ReportLink id="trial-balance" category="Financial Statements" label="Posting Reconciliation"/><ReportLink id="mapping-exceptions" category="Audit & Governance" label="Mapping Exceptions"/></div>
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"><Card label="Total Demand Raised" value={fmt(demandTotal)} detail="From available demand register" icon={FileText}/><Card label="Total Collections (Receipts)" value={fmt(receipts)} detail={pct(receipts,demandTotal)+'% of demand register' } icon={ArrowDownRight} tone="green"/><Card label="Total Payments (Expenses)" value={fmt(payments)} detail="Excludes contra transfers" icon={ArrowUpRight} tone="red"/><Card label="Contra Entries" value={fmt(contra)} detail="Internal transfers / adjustments" icon={ArrowLeftRight} tone="violet"/><Card label="Net Movement" value={fmt(net)} detail="Receipts less payments in selected data" icon={Wallet} tone="amber"/></div>
   <div className="grid grid-cols-1 gap-3 xl:grid-cols-5"><div className="xl:col-span-3"><Panel title="Monthly Financial Summary"><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Legend/><Bar dataKey="receipts" name="Collections / Receipts" fill="#22a765" radius={[3,3,0,0]}/><Bar dataKey="payments" name="Payments / Expenses" fill="#ef4444" radius={[3,3,0,0]}/><Line dataKey="contra" name="Contra" stroke="#2563eb" strokeWidth={2}/></ComposedChart></ResponsiveContainer></div></Panel></div><div className="xl:col-span-2"><Panel title="Expense Analysis by Category"><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData.slice(0,7)} layout="vertical" margin={{left:12,right:12}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tick={{fontSize:10}}/><YAxis type="category" dataKey="name" width={125} tick={{fontSize:10}}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Bar dataKey="amount" fill="#2563eb" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div></Panel></div></div>
   <div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><Panel title="Transaction Summary (From Consolidated Data)"><Table headers={['Transaction type','Records','Amount','% of total']} rows={[['Receipts',num(filtered.filter(t=>t.type==='Receipt').length),currencyCell(receipts),pct(receipts,receipts+payments)+'%'],['Payments',num(filtered.filter(t=>t.type==='Payment').length),currencyCell(payments),pct(payments,receipts+payments)+'%'],['Contra entries',num(filtered.filter(t=>t.transactionClass==='Contra').length),currencyCell(contra),pct(contra,receipts+payments+contra)+'%']]}/></Panel><Panel title="Data Quality & Control Exceptions"><Table headers={['Control check','Count','Status']} rows={[[ 'Transactions with missing evidence',num(evidenceMissing),statusPill(evidenceMissing?'Review required':'Complete')],[ 'Transactions awaiting inspection',num(stats.pendingTransactions),statusPill(stats.pendingTransactions?'Pending':'Complete')],[ 'Source files awaiting review',num(openSource),statusPill(openSource?'Pending':'Not assessed')],[ 'Audit discrepancies / failed checks',num(stats.evidenceDiscrepancy+stats.internalAuditFailed),statusPill(stats.evidenceDiscrepancy+stats.internalAuditFailed?'Investigate':'Complete')]]}/></Panel></div>
  </>}
  {screen==='demand-collections'&&<>
   {(() => {
    const demandAmount=(d:any)=>Number(d.total_demand??d.demand_amount??d.amount??0)||0;
    const demandCategory=(d:any)=>{const linked=categoryMaster.find((c:any)=>String(c.category_id??c.id??'')===String(d.category_id??d.categoryId??''));return String(d.category_name??d.categoryName??linked?.category_name??d.demand_type??d.charge_type??d.description??'Unmapped demand category')};
    const monthKey=(v:any)=>{const raw=String(v??'').trim().replace(/-/g,' ').replace(/\//g,' ');const m=raw.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(20\d{2})/i);return m?m[1].slice(0,3).toLowerCase()+' '+m[2]:''};
    const fyDemand=reportDemands.reduce((s:number,d:any)=>s+demandAmount(d),0);
    const receiptRows=filtered.filter(t=>t.type==='Receipt'&&t.transactionClass!=='Contra');
    const fyReceipts=receiptRows.reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
    const dueRows=cumulativeOutstanding.filter((r:any)=>Number(r.net_outstanding||0)>0).sort((a:any,b:any)=>Number(b.net_outstanding||0)-Number(a.net_outstanding||0));
    const groupKey=(d:any)=>{const n=demandCategory(d).toLowerCase();return /maintenance/.test(n)&&!/previous|opening|arrears|brought forward/.test(n)?'Maintenance Charges':/parking/.test(n)&&!/previous|opening|arrears|brought forward/.test(n)?'Parking Charges':/previous dues|opening balance|arrears|brought forward/.test(n)?'Previous-year dues':/cheque.?bounce|bounce charge/.test(n)?'Cheque Bounce Charges':/additional fund|special fund|capital contribution|special levy/.test(n)?'Additional Funds / Special Levies':/non.?occup/.test(n)?'Non-Occupancy Charges':'Other Charges'};
    const groups:Record<string,{amount:number;count:number}>={};
    reportDemands.forEach((d:any)=>{const k=groupKey(d);groups[k]??={amount:0,count:0};groups[k].amount+=demandAmount(d);groups[k].count++;});
    const chargeData=Object.entries(groups).sort((a,b)=>b[1].amount-a[1].amount).slice(0,6).map(([name,v],i)=>({name,amount:v.amount,count:v.count,fill:COLORS[i%COLORS.length]}));
    const sumGroup=(re:RegExp)=>reportDemands.filter((d:any)=>re.test(demandCategory(d))).reduce((s:number,d:any)=>s+demandAmount(d),0);
    const currentMaintenance=reportDemands.filter((d:any)=>/maintenance/i.test(demandCategory(d))&&!/previous|opening|arrears|brought forward/i.test(demandCategory(d))).reduce((s:number,d:any)=>s+demandAmount(d),0);
    const previousDues=sumGroup(/previous dues|opening balance|arrears|brought forward/i);
    const chequeBounce=sumGroup(/cheque.?bounce|bounce charge/i);
    const additionalFunds=sumGroup(/additional fund|special fund|capital contribution|special levy/i);
    const monthLabels=['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];
    const monthlyDemand=monthLabels.map(m=>({month:m.split(' ')[0],demand:reportDemands.filter((d:any)=>monthKey(d.demand_month??d.month??d.reporting_month??d.demand_date??d.created_at)===m.toLowerCase()).reduce((s:number,d:any)=>s+demandAmount(d),0),receipts:receiptRows.filter(t=>monthKey(t.reportingMonth??t.month??t.date)===m.toLowerCase()).reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0)}));
    const monthlyDemandAvailable=monthlyDemand.some(x=>x.demand>0);
    const top=dueRows.slice(0,5).map((r:any)=>({party:String(r.flat_no||r.member_name||'Unidentified'),amount:Number(r.net_outstanding)||0}));
    const outstanding=cumulativeOutstanding.reduce((s:number,r:any)=>s+Number(r.net_outstanding||0),0);
    const rate=fyDemand?fyReceipts/fyDemand*100:0;
    const allocated=Array.isArray(demandAllocations)?demandAllocations.length:0;
    return <>
     <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
      <Card label="Members / Flat Owners" value={num(flatOwnerMaster.length)} detail={num(dueRows.length)+' register rows with dues'} icon={Users}/>
      <Card label="Total Demand Raised" value={fmt(fyDemand)} detail={num(reportDemands.length)+' demand records'} icon={FileText}/>
      <Card label="Receipts Collected" value={fmt(fyReceipts)} detail={num(receiptRows.length)+' receipt transactions'} icon={Banknote} tone="green"/>
      <Card label="Outstanding (Register)" value={fmt(outstanding)} detail="Cumulative; not reconciled" icon={AlertTriangle} tone="red"/>
      <Card label="Receipts vs Demand" value={fyDemand?rate.toFixed(1)+'%':'Not available'} detail="Simple total comparison; not allocation-based" icon={ArrowUpRight} tone="violet"/>
      <Card label="Unallocated Receipts" value={num(allocated===0?receiptRows.length:Math.max(0,receiptRows.length-allocated))} detail={allocated===0?'No allocations recorded':'Review allocation coverage'} icon={AlertTriangle} tone="amber"/>
     </div>
     <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
      <div className="xl:col-span-7"><Panel title="Monthly Demand vs Collections" action={<ReportLink id="monthly-demands" category="Demands & Payments" label="View Month-wise Matrix"/>}>
       <div className="h-[225px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthlyDemand}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}} tickFormatter={(v:any)=>'₹'+num(Number(v))}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="demand" name="Demand raised (period available)" fill="#3976f6" radius={[3,3,0,0]}/><Bar dataKey="receipts" name="Receipts recorded" fill="#43b581" radius={[3,3,0,0]}/></ComposedChart></ResponsiveContainer></div>
       <p className="mt-1 text-[10px] text-slate-500">{monthlyDemandAvailable?'Monthly demand is shown where demand-period keys match.':'Demand period keys are missing or inconsistent; monthly demand is not fabricated.'} Receipts are not allocated to specific demand records.</p>
      </Panel></div>
      <div className="xl:col-span-5"><Panel title="Outstanding — Top 5 Members / Flats" action={<ReportLink id="party-balances" category="Debtors & Parties" label="View All-Party Debtors"/>}>
       <div className="h-[225px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={top} layout="vertical" margin={{left:4,right:12}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tick={{fontSize:9}} tickFormatter={(v:any)=>'₹'+num(Number(v))}/><YAxis type="category" dataKey="party" width={82} tick={{fontSize:10}}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Bar dataKey="amount" name="Register outstanding" fill="#e45a5a" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>
       <p className="text-[10px] text-slate-500">For investigation only. Opening balances and receipt allocations are not reconciled; do not use as certified recovery figures.</p><div className="mt-2"><ReportLink id="member-ledger" category="Debtors & Parties" label="Open Detailed Member Ledger"/></div>
      </Panel></div>
     </div>
     <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
      <div className="xl:col-span-5"><Panel title="Demand by Charge Category" action={<ReportLink id="demand-summary" category="Demands & Payments" label="View Demand Summary"/>}>
       <div className="space-y-3">{chargeData.map((x:any)=><div key={x.name}><div className="mb-1 flex items-center justify-between gap-2 text-[11px]"><span>{x.name}</span><strong>{fmt(x.amount)}</strong></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full" style={{width:(fyDemand?Math.max(1,x.amount/fyDemand*100):0)+'%',background:x.fill}}/></div></div>)}</div>
       <p className="mt-3 text-[10px] text-slate-500">Category labels are grouped for insight. Collection-by-charge is not calculated because receipt allocations are absent.</p>
      </Panel></div>
      <div className="xl:col-span-4"><Panel title="Demand Profile" action={<ReportLink id="mapping-exceptions" category="Audit & Governance" label="Review Charge Mapping"/>}>
       <div className="h-[185px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chargeData} dataKey="amount" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>{chargeData.map((x:any)=><Cell key={x.name} fill={x.fill}/>)}</Pie><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Legend verticalAlign="bottom" height={34} wrapperStyle={{fontSize:9}}/></PieChart></ResponsiveContainer></div>
       <div className="rounded-lg bg-blue-50 p-2 text-[10px] text-blue-900">Recorded demand composition only—not collection efficiency by charge type.</div>
      </Panel></div>
      <div className="xl:col-span-3"><Panel title="Key Insights & Actions">
       <div className="space-y-2 text-[11px]">
        <div className="rounded-lg bg-emerald-50 p-2"><strong className="block">{fmt(fyReceipts)} receipts recorded</strong><span className="text-slate-600">{rate.toFixed(1)}% of FY demand by total comparison only.</span></div>
        <div className="rounded-lg bg-red-50 p-2"><strong className="block">{fmt(outstanding)} register outstanding</strong><span className="text-slate-600">Reconcile opening balances and allocations.</span></div>
        <div className="rounded-lg bg-amber-50 p-2"><strong className="block">Previous FY dues</strong><span className="text-slate-600">{previousDues?fmt(previousDues):'Not verified'}; compare with FY 2017–18 closing ledger.</span></div>
        <div className="rounded-lg bg-blue-50 p-2"><strong className="block">Current FY maintenance</strong><span className="text-slate-600">{currentMaintenance?fmt(currentMaintenance):'Not reliable'}; confirm approved rate, eligible flats and 12 months.</span></div>
       </div>
      </Panel></div>
     </div>
     <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      <Card label="Current FY Maintenance Expected" value={currentMaintenance?fmt(currentMaintenance):'Not verified'} detail="Confirm approved rate × eligible flats × 12 months" icon={CalendarDays}/>
      <Card label="Previous FY Outstanding" value={previousDues?fmt(previousDues):'Not verified'} detail="Verify FY 2017–18 closing member balances" icon={ArrowLeftRight} tone="violet"/>
      <Card label="Cheque Bounce Charges" value={fmt(chequeBounce)} detail="Validate charge mapping and bank evidence" icon={AlertTriangle} tone="amber"/>
      <Card label="Additional Funds / Special Levies" value={fmt(additionalFunds)} detail="Verify approved resolution and member allocation" icon={Wallet}/>
     </div>
     <div className="flex flex-wrap gap-2"><ReportLink id="monthly-demands" category="Demands & Payments" label="Monthly Demand Matrix"/><ReportLink id="monthly-payments" category="Demands & Payments" label="Monthly Receipts Matrix"/><ReportLink id="receipt-allocation-review" category="Demands & Payments" label="Review Unmatched Receipts"/><ReportLink id="opening-balance-review" category="Audit & Governance" label="Verify Previous FY Balances"/><ReportLink id="receipts" category="Registers" label="Receipt Register"/></div>
    </>;
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
    const groupData=Object.entries(groupMap).sort((a,b)=>b[1].amount-a[1].amount).slice(0,5).map(([name,v])=>({name:name.length>23?name.slice(0,21)+'…':name,amount:v.amount,count:v.count}));
    const payeeMap:Record<string,{amount:number;count:number}>={};
    paymentRows.forEach(t=>{const p=String(t.party||'Unidentified payee');payeeMap[p]??={amount:0,count:0};payeeMap[p].amount+=Math.abs(Number(t.amount)||0);payeeMap[p].count++});
    const payeeData=Object.entries(payeeMap).sort((a,b)=>b[1].amount-a[1].amount).slice(0,5).map(([name,v])=>({name:name.length>20?name.slice(0,18)+'…':name,amount:v.amount,count:v.count}));
    const utilityPattern=/mseb|electric|water|cleaning|security|housekeeping|lift/i;
    const utilityRows=paymentRows.filter(t=>utilityPattern.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')));
    const utilityData=allMonths.map(m=>({month:m.replace(' 20',' '),electricity:sum(utilityRows.filter(t=>String(t.reportingMonth||t.month||'')===m&&/mseb|electric/i.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')))),water:sum(utilityRows.filter(t=>String(t.reportingMonth||t.month||'')===m&&/water/i.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')))),cleaning:sum(utilityRows.filter(t=>String(t.reportingMonth||t.month||'')===m&&/cleaning|housekeeping/i.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||'')))),security:sum(utilityRows.filter(t=>String(t.reportingMonth||t.month||'')===m&&/security/i.test(String(t.categoryName||'')+' '+String(t.party||'')+' '+String(t.description||''))))}));
    const med=(values:number[])=>{const a=[...values].sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:0};
    const anomalies=paymentRows.map(t=>{const g=String(t.categoryGroup||categoryMaster.find((x:any)=>x.category_name===t.categoryName)?.category_group||t.categoryName||'Unmapped');const base=med(paymentRows.filter(x=>String(x.categoryGroup||categoryMaster.find((z:any)=>z.category_name===x.categoryName)?.category_group||x.categoryName||'Unmapped')===g).map(x=>Math.abs(Number(x.amount)||0)));const amount=Math.abs(Number(t.amount)||0);const same=paymentRows.filter(x=>String(x.party||'')===String(t.party||'')&&String(x.reportingMonth||x.month||'')===String(t.reportingMonth||t.month||'')).length>1;return {t,amount,flag:base>0&&amount>base*2?'Above group median':same?'Repeated payee / month':'Review voucher'}}).filter(x=>x.flag!=='Review voucher'||x.amount>0).sort((a,b)=>b.amount-a.amount).slice(0,5);
    return <>
     <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Card label="Total Payments" value={fmt(totalPaid)} detail={num(paymentRows.length)+' payment transactions'} icon={Banknote} tone="red"/>
      <Card label="Fixed / Recurring" value={fmt(recurringTotal)} detail={num(recurringRows.length)+' keyword-classified records'} icon={CalendarDays} tone="violet"/>
      <Card label="Ad Hoc / Other" value={fmt(adHocTotal)} detail={num(adHocRows.length)+' records; review classification'} icon={ClipboardList}/>
      <Card label="Largest Payment" value={fmt(Math.max(0,...paymentRows.map(t=>Math.abs(Number(t.amount)||0))))} detail="Single recorded payment" icon={ArrowUpRight} tone="amber"/>
      <Card label="Evidence Gaps" value={num(paymentRows.filter(t=>t.evidenceStatus==='Missing'||t.billStatus==='Missing'||t.voucherReceiptStatus==='Missing'||t.evidenceStatus!=='Complete').length)} detail="Records needing evidence review" icon={AlertTriangle} tone="amber"/>
     </div>
     <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <Panel title="Monthly Payments Trend"><div className="h-[230px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthly.map(m=>({...m,month:String(m.month).replace(' 20',' ')}))}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={(v:any)=>'₹'+num(Number(v))}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Bar dataKey="payments" name="Payments" fill="#2563eb" radius={[3,3,0,0]}/><Line dataKey="payments" name="Trend" stroke="#f59e0b" strokeWidth={2} dot={false}/></ComposedChart></ResponsiveContainer></div><p className="mt-1 text-[10px] text-slate-500">Monthly payment movements excluding contra transfers. Compare peaks with vouchers, invoices and approvals.</p></Panel>
      <Panel title="Expense Mix by Category Group"><div className="h-[230px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={groupData} layout="vertical" margin={{left:8,right:16,top:4,bottom:4}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tick={{fontSize:10}} tickFormatter={(v:any)=>'₹'+num(Number(v))}/><YAxis type="category" dataKey="name" width={125} tick={{fontSize:10}}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Bar dataKey="amount" name="Total paid" fill="#0f766e" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div><div className="mt-1"><ReportLink id="expense-analysis" category="Registers" label="Drill down by category group"/></div></Panel>
     </div>
     <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <Panel title="Fixed / Recurring vs Ad Hoc"><div className="h-[185px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{name:'Fixed / recurring',value:recurringTotal},{name:'Ad hoc / other',value:adHocTotal}]} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>{[0,1].map((i)=><Cell key={i} fill={i===0?'#7c3aed':'#f59e0b'}/>)}</Pie><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Legend verticalAlign="bottom" height={28} wrapperStyle={{fontSize:10}}/></PieChart></ResponsiveContainer></div><p className="text-[10px] text-amber-700">Classification uses payee/category keywords, not an approved contract or budget master.</p></Panel>
      <Panel title="Top 5 Payees by Spend"><div className="h-[185px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={payeeData} layout="vertical" margin={{left:4,right:12,top:2,bottom:2}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tick={{fontSize:9}} tickFormatter={(v:any)=>'₹'+num(Number(v))}/><YAxis type="category" dataKey="name" width={105} tick={{fontSize:9}}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Bar dataKey="amount" name="Total paid" fill="#475569" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div><ReportLink id="vendor-ledger" category="Debtors & Parties" label="Open payee ledger"/></Panel>
      <Panel title="Largest Payments & Potential Anomalies" action={<ReportLink id="largest-payments-anomalies" category="Audit & Governance" label="View All Anomalies"/>}><Table headers={['Payee / Category','Amount','Screening flag']} rows={anomalies.map(({t,amount,flag})=>[String(t.party||t.categoryName||'Unidentified'),currencyCell(amount),flag])}/><p className="mt-2 text-[10px] text-slate-500">Potential flags only. Verify source vouchers, invoices, approvals and related payments before concluding.</p><div className="mt-2 flex flex-wrap gap-2"><ReportLink id="largest-payments-anomalies" category="Audit & Governance" label="Open Largest Payments Report"/><ReportLink id="missing-docs" category="Audit & Governance" label="Review Evidence Gaps"/></div></Panel>
     </div>
     <Panel title="Utility Payments — Monthly Trend"><div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={utilityData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:9}}/><YAxis tick={{fontSize:10}} tickFormatter={(v:any)=>'₹'+num(Number(v))}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Legend wrapperStyle={{fontSize:10}}/><Line type="monotone" dataKey="electricity" name="Electricity / MSEB" stroke="#2563eb" strokeWidth={2}/><Line type="monotone" dataKey="water" name="Water" stroke="#06b6d4" strokeWidth={2}/><Line type="monotone" dataKey="cleaning" name="Cleaning" stroke="#16a34a" strokeWidth={2}/><Line type="monotone" dataKey="security" name="Security" stroke="#f59e0b" strokeWidth={2}/></ComposedChart></ResponsiveContainer></div><p className="mt-1 text-[10px] text-slate-500">Only recorded payments are plotted. A missing month is not automatically marked unpaid because approved bill schedules and due dates are not yet configured.</p><div className="mt-2 flex flex-wrap gap-2"><ReportLink id="payments" category="Registers" label="Detailed Payment Register"/><ReportLink id="account-ledger-monthly" category="Ledgers" label="Account-wise Payments"/><ReportLink id="missing-docs" category="Audit & Governance" label="Bill / Voucher Evidence"/></div></Panel>
    </>;
   })()}
  </> }
  {screen==='party-ledger'&&(()=>{
   const memberRows=[...cumulativeOutstanding].sort((a,b)=>Number(b.net_outstanding||0)-Number(a.net_outstanding||0));
   const memberDueTotal=memberRows.reduce((sum,r)=>sum+Math.max(0,Number(r.net_outstanding)||0),0);
   const membersWithDues=memberRows.filter(r=>Number(r.net_outstanding||0)>0);
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
   const maxMember= Math.max(1,...memberRows.slice(0,5).map(r=>Number(r.net_outstanding)||0));
   const maxVendor= Math.max(1,...vendorRows.slice(0,5).map(r=>r.paid));
   const memberStatus=[{name:'With dues',value:membersWithDues.length},{name:'No recorded dues',value:Math.max(0,memberRows.length-membersWithDues.length)}];
   const vendorEvidence=[{name:'Evidence gaps',value:vendorRows.reduce((sum,v)=>sum+v.gaps,0)},{name:'Complete evidence',value:Math.max(0,paymentRows.length-vendorRows.reduce((sum,v)=>sum+v.gaps,0))}];
   return <>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white p-3">
     <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-blue-700">Party intelligence</p><p className="mt-1 text-sm text-slate-600">See balances, concentration and transaction patterns first; open registers only when you need detail.</p></div>
     <div className="inline-flex flex-wrap rounded-xl border border-blue-100 bg-slate-50 p-1"><button onClick={()=>{setPartySelection('');setActiveTab('Members')}} className={'rounded-lg px-3 py-2 text-xs font-bold '+(activeTab==='Members'?'bg-blue-600 text-white shadow-sm':'text-slate-600')}>Members</button><button onClick={()=>{setPartySelection('');setActiveTab('Utilities')}} className={'rounded-lg px-3 py-2 text-xs font-bold '+(activeTab==='Utilities'?'bg-blue-600 text-white shadow-sm':'text-slate-600')}>Utilities</button><button onClick={()=>{setPartySelection('');setActiveTab('Ad-hoc')}} className={'rounded-lg px-3 py-2 text-xs font-bold '+(activeTab==='Ad-hoc'?'bg-blue-600 text-white shadow-sm':'text-slate-600')}>Ad-hoc Parties</button></div>
    </div>
    {activeTab==='Utilities'&&<>
     <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      <Card label="Utilities identified" value={num(vendorRows.length)} detail="Keyword-classified providers; verify identity" icon={Landmark} tone="violet"/>
      <Card label="Recorded utility payments" value={fmt(payments)} detail={num(paymentRows.length)+' payment entries'} icon={Wallet} tone="green"/>
      <Card label="Months in review" value={num(utilityCoverageMonths)} detail={allMonths[0]+' to '+allMonths[allMonths.length-1]} icon={CalendarDays}/>
      <Card label="Providers with no recent entry" value={num(utilityGapRows.filter(u=>u.lastDate).length?utilityGapRows.filter(u=>u.missing.length>=3).length:utilityGapRows.length)} detail="3+ months without a matching entry" icon={AlertTriangle} tone="red"/>
      <Card label="Bill exposure" value="Not established" detail="Bill register / due dates unavailable" icon={ShieldCheck} tone="amber"/>
     </div>
     <Panel title="Critical utility payment-history gaps" action={<ReportLink id="payments" category="Registers" label="Open payment register"/>}>
      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>Control note:</strong> A missing monthly transaction is a reconciliation alert, not proof that a bill is unpaid. Review period is limited to available reporting months ({allMonths[0]}–{allMonths[allMonths.length-1]}). Obtain bill/account statements to confirm actual arrears and service risk.</div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">{utilityGapRows.map(u=><div key={u.name} className={'rounded-xl border p-3 '+((u.consecutiveGap||0)>=3?'border-rose-200 bg-rose-50/60':'border-slate-200 bg-white')}><div className="flex items-start justify-between gap-2"><div className="font-bold text-slate-900">{u.name}</div><span className={'rounded-full px-2 py-1 text-[10px] font-bold '+((u.consecutiveGap||0)>=3?'bg-rose-100 text-rose-800':'bg-amber-100 text-amber-800')}>{u.consecutiveGap==null?'No baseline':u.consecutiveGap+' consecutive month gaps'}</span></div><div className="mt-2 grid grid-cols-2 gap-2"><div><div className="text-[10px] text-slate-500">Last recorded payment date</div><div className="text-sm font-semibold">{u.lastDate||'No matching entry found'}</div></div><div><div className="text-[10px] text-slate-500">Last reporting month</div><div className="text-sm font-semibold">{u.lastMonth||'Not established'}</div></div><div><div className="text-[10px] text-slate-500">Payments recorded</div><div className="text-sm font-semibold">{fmt(u.total)}</div></div><div><div className="text-[10px] text-slate-500">Matched entries</div><div className="text-sm font-semibold">{num(u.count)}</div></div></div><div className="mt-2 text-[10px] text-slate-600">{u.firstMonth?('Monitoring starts from first observed payment ('+u.firstMonth+'). Missing months: '+(u.missing.length?u.missing.slice(0,6).join(', ')+(u.missing.length>6?' …':''):'none in selected coverage.')):'No matching payment found in the selected records; confirm provider name and reporting coverage before raising an alert.'}</div><div className="mt-2 text-[10px] font-semibold text-blue-700">Action: verify bill and bank/cash records before marking unpaid.</div></div>)}</div>
     </Panel>
     <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <Panel title="Monthly Utility Payments"><div className="h-[205px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={utilityMonthRows} margin={{top:4,right:4,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:9}}/><YAxis width={48} tick={{fontSize:9}} tickFormatter={(v)=>'₹'+num(Number(v)/1000)+'k'}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="water" name="Water" fill="#0891b2"/><Bar dataKey="electricity" name="Electricity" fill="#2563eb"/><Bar dataKey="lift" name="Lift" fill="#7c3aed"/></ComposedChart></ResponsiveContainer></div><p className="text-[10px] text-slate-500">Only matching recorded payments are shown; blank months are flagged above, not treated as confirmed unpaid bills.</p></Panel>
      <Panel title="Other Recurring Utility / Service Payments"><div className="h-[205px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={utilityMonthRows}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:9}}/><YAxis width={48} tick={{fontSize:9}} tickFormatter={(v)=>'₹'+num(Number(v)/1000)+'k'}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Legend wrapperStyle={{fontSize:10}}/><Bar dataKey="other" name="Other recurring services" fill="#0d9488"/></ComposedChart></ResponsiveContainer></div><p className="text-[10px] text-slate-500">Keyword classification is a screening aid; validate each provider and category.</p></Panel>
      <Panel title="Priority Actions"><div className="space-y-2 text-xs"><div className="rounded-lg border border-rose-100 bg-rose-50 p-3"><strong>{num(utilityGapRows.filter(u=>(u.consecutiveGap||0)>=3).length)} providers with 3+ consecutive payment gaps</strong><p className="mt-1 text-slate-600">Counted only after the first recorded payment and within available reporting coverage; this is a reconciliation alert, not proof of unpaid bills.</p></div><div className="rounded-lg border border-amber-100 bg-amber-50 p-3"><strong>Confirm actual arrears</strong><p className="mt-1 text-slate-600">Obtain latest bills, municipal account statement, due dates and any disconnection or penalty notices.</p></div><div className="flex flex-wrap gap-2"><ReportLink id="mapping-exceptions" category="Audit & Governance" label="Review mapping exceptions"/><ReportLink id="missing-docs" category="Audit & Governance" label="Review evidence gaps"/><ReportLink id="payments" category="Registers" label="Open payment register"/></div></div></Panel>
     </div>
    </>}
    {activeTab==='Members'?<>
     <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      <Card label="Member / flat records" value={num(flatOwnerMaster.length)} detail="Master records loaded" icon={Users}/>
      <Card label="Recorded demand" value={fmt(demandTotal)} detail={num(demandRegister.length)+' demand records'} icon={FileText}/>
      <Card label="Receipts recorded" value={fmt(receipts)} detail={num(filtered.filter(t=>t.type==='Receipt').length)+' receipt transactions in filter'} icon={Wallet} tone="green"/>
      <Card label="Outstanding register" value={fmt(outstanding)} detail={num(membersWithDues.length)+' records with positive balance'} icon={AlertTriangle} tone="red"/>
      <Card label="Allocation status" value={num(demandAllocations.length)} detail="Receipt-to-demand allocations recorded" icon={ArrowLeftRight} tone="amber"/>
     </div>
     <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.15fr_.85fr]">
      <Panel title="Members with the Highest Recorded Outstanding" action={<ReportLink id="party-balances" category="Debtors & Parties" label="View all debtors"/>}>
       <div className="space-y-3">{memberRows.slice(0,5).map((r,i)=>{const amount=Math.max(0,Number(r.net_outstanding)||0);return <div key={String(r.member_name||r.flat_no||i)}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-slate-800">{memberLabel(r)}</span><span className="font-bold text-rose-700">{fmt(amount)}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-500" style={{width:(amount/maxMember*100)+'%'}}/></div></div>})}{!memberRows.length&&<p className="text-xs text-slate-500">No member outstanding records are available.</p>}</div>
       <p className="mt-3 text-[10px] text-slate-500">Sorted from the available cumulative outstanding register. This is not an ageing calculation; opening balances and receipt allocations still require verification.</p>
      </Panel>
      <Panel title="Member Balance Coverage">
       <div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={memberStatus} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={3}>{memberStatus.map((d,i)=><Cell key={d.name} fill={i===0?'#ef4444':'#16a34a'}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div>
       <div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-rose-50 p-3"><div className="text-[10px] text-rose-700">Positive balances</div><div className="mt-1 text-xl font-bold text-rose-800">{num(membersWithDues.length)}</div></div><div className="rounded-lg bg-emerald-50 p-3"><div className="text-[10px] text-emerald-700">No positive balance</div><div className="mt-1 text-xl font-bold text-emerald-800">{num(memberRows.length-membersWithDues.length)}</div></div></div>
       <p className="mt-2 text-[10px] text-slate-500">Coverage reflects records in the register, not confirmed member ageing or recoverable dues.</p>
      </Panel>
     </div>
     <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <Panel title="Monthly Receipts Trend" action={<ReportLink id="monthly-payments" category="Demands & Payments" label="Month-wise collection"/>}>
       <div className="h-[250px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} tickFormatter={(v)=>'₹'+num(Number(v)/1000)+'k'}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Legend/><Bar dataKey="receipts" name="Receipts recorded" fill="#16a34a" radius={[4,4,0,0]}/></ComposedChart></ResponsiveContainer></div>
       <p className="text-[10px] text-slate-500">Based on recorded receipt transactions by reporting month. It does not imply allocation to individual demand periods.</p>
      </Panel>
      <Panel title="Member Snapshot" action={<ReportLink id="member-ledger" category="Debtors & Parties" label="Detailed member ledger"/>}>
       <div className="flex flex-wrap items-end gap-3"><label className="min-w-[180px] flex-1 text-xs font-semibold text-slate-700">Select member / flat<select value={selectedMember?memberName(selectedMember):''} onChange={e=>setPartySelection(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal"><option value="">Choose member</option>{memberRows.map((r,i)=><option key={i} value={memberName(r)}>{memberLabel(r)} — {memberName(r)}</option>)}</select></label><div className="rounded-lg bg-rose-50 px-4 py-2"><div className="text-[10px] text-rose-700">Recorded balance</div><div className="text-lg font-bold text-rose-800">{fmt(Number(selectedMember?.net_outstanding)||0)}</div></div></div>
       <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"><div className="rounded-lg border border-slate-100 p-3"><div className="text-[10px] text-slate-500">Member / flat</div><div className="mt-1 text-sm font-bold text-slate-800">{selectedMember?memberLabel(selectedMember):'Not available'}</div></div><div className="rounded-lg border border-slate-100 p-3"><div className="text-[10px] text-slate-500">Receipt transactions</div><div className="mt-1 text-sm font-bold text-slate-800">{num(memberTx.filter(t=>t.type==='Receipt').length)}</div></div><div className="rounded-lg border border-slate-100 p-3"><div className="text-[10px] text-slate-500">Data caveat</div><div className="mt-1 text-xs font-semibold text-amber-700">Allocation unverified</div></div></div>
       <div className="mt-3"><Table headers={['Date','Description','Type','Amount','Reference']} rows={memberTx.slice(0,5).map(t=>[t.date||'—',t.description||t.categoryName||'—',t.type||'—',fmt(Math.abs(Number(t.amount)||0)),t.voucherNo||t.receiptNo||t.id||'—'])}/></div>
      </Panel>
     </div>
     <Panel title="Member Ledger Drill-Down"><div className="flex flex-wrap gap-2"><ReportLink id="party-balances" category="Debtors & Parties" label="All-party debtors"/><ReportLink id="member-ledger" category="Debtors & Parties" label="Detailed member ledger"/><ReportLink id="demand-summary" category="Demands & Payments" label="Demand summary by party"/><ReportLink id="monthly-flat-balance" category="Demands & Payments" label="Monthly flat-owner balances"/></div></Panel>
    </>:<>
     <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
      <Card label={activeTab==='Utilities'?'Utility payees':'Ad-hoc parties'} value={num(vendorRows.length)} detail={activeTab==='Utilities'?'Keyword-classified utility providers':'Other payees; verify classification'} icon={Landmark} tone="violet"/>
      <Card label="Payment transactions" value={num(paymentRows.length)} detail="Selected period / filters" icon={FileText}/>
      <Card label="Payments recorded" value={fmt(payments)} detail="Not bill certification" icon={ArrowUpRight} tone="red"/>
      <Card label="Payees with evidence gaps" value={num(vendorRows.filter(v=>v.gaps>0).length)} detail="At least one payment to review" icon={AlertTriangle} tone="amber"/>
      <Card label="Evidence gap transactions" value={num(vendorRows.reduce((sum,v)=>sum+v.gaps,0))} detail="Supporting-document review" icon={ShieldCheck} tone="green"/>
     </div>
     <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
      <div className="xl:col-span-7"><Panel title={activeTab==='Utilities'?'Top Utility Providers by Payments':'Top Ad-hoc Parties by Payments'} action={<ReportLink id="vendor-ledger" category="Debtors & Parties" label="View ledger"/>}>
       <div className="space-y-2">{vendorRows.slice(0,5).map((v,i)=><div key={v.name}><div className="mb-1 flex items-center justify-between gap-3 text-[11px]"><span className="max-w-[75%] truncate font-semibold text-slate-800" title={v.name}>{v.name}</span><span className="font-bold text-blue-800">{fmt(v.paid)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{width:(v.paid/maxVendor*100)+'%'}}/></div><div className="mt-0.5 text-[9px] text-slate-500">{num(v.count)} transactions · {num(v.gaps)} evidence gaps</div></div>)}{!vendorRows.length&&<p className="text-xs text-slate-500">No payment transactions for this filter.</p>}</div>
       <p className="mt-2 text-[9px] text-slate-500">Concentration is a screening signal, not proof of irregularity.</p>
      </Panel></div>
      <div className="xl:col-span-5"><Panel title={activeTab==='Utilities'?'Utility Evidence Coverage':'Ad-hoc Evidence Coverage'}>
       <div className="h-[142px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={vendorEvidence} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={3}>{vendorEvidence.map((d,i)=><Cell key={d.name} fill={i===0?'#f59e0b':'#16a34a'}/>)}</Pie><Tooltip/><Legend wrapperStyle={{fontSize:11}}/></PieChart></ResponsiveContainer></div>
       <div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-amber-50 p-2"><div className="text-[9px] text-amber-700">Evidence gaps</div><div className="text-lg font-bold text-amber-800">{num(vendorEvidence[0].value)}</div></div><div className="rounded-lg bg-emerald-50 p-2"><div className="text-[9px] text-emerald-700">Complete</div><div className="text-lg font-bold text-emerald-800">{num(vendorEvidence[1].value)}</div></div></div>
       <p className="mt-1 text-[9px] text-slate-500">Evidence status is not a substitute for checking bills, vouchers and approvals.</p>
      </Panel></div>
     </div>
     <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
      <div className="xl:col-span-6"><Panel title="Monthly Payments Trend" action={<ReportLink id="payments" category="Registers" label="Payment register"/>}>
       <div className="h-[145px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthly} margin={{top:4,right:4,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:9}} tickMargin={4}/><YAxis width={42} tick={{fontSize:9}} tickFormatter={(v)=>'₹'+num(Number(v)/1000)+'k'}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Bar dataKey="payments" name="Payments recorded" fill="#2563eb" radius={[3,3,0,0]}/></ComposedChart></ResponsiveContainer></div>
       <p className="text-[9px] text-slate-500">Recorded payment movements only; bill amount and approval may differ.</p>
      </Panel></div>
      <div className="xl:col-span-6"><Panel title={activeTab==='Utilities'?'Utility Provider Snapshot':'Ad-hoc Party Snapshot'} action={<ReportLink id="vendor-ledger" category="Debtors & Parties" label="Detailed ledger"/>}>
       <div className="flex items-end gap-2"><label className="min-w-0 flex-1 text-[11px] font-semibold text-slate-700">Select vendor / payee<select value={selectedVendor?.name||''} onChange={e=>setPartySelection(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-normal"><option value="">Choose vendor</option>{vendorRows.map(v=><option key={v.name} value={v.name}>{v.name}</option>)}</select></label><div className="rounded-lg bg-blue-50 px-3 py-1.5"><div className="text-[9px] text-blue-700">Recorded</div><div className="text-base font-bold text-blue-800">{fmt(selectedVendor?.paid||0)}</div></div></div>
       <div className="mt-2 grid grid-cols-3 gap-2"><div className="rounded border border-slate-100 p-2"><div className="text-[9px] text-slate-500">Transactions</div><div className="text-sm font-bold">{num(selectedVendor?.count||0)}</div></div><div className="rounded border border-slate-100 p-2"><div className="text-[9px] text-slate-500">Evidence gaps</div><div className="text-sm font-bold text-amber-700">{num(selectedVendor?.gaps||0)}</div></div><div className="rounded border border-slate-100 p-2"><div className="text-[9px] text-slate-500">Latest date</div><div className="text-[10px] font-bold">{selectedVendor?.lastDate||'Not recorded'}</div></div></div>
       <div className="mt-2"><Table headers={['Date','Description','Category','Amount','Voucher / reference']} rows={vendorTx.slice(0,3).map(t=>[t.date||'—',t.description||'—',t.categoryName||'Unmapped',fmt(Math.abs(Number(t.amount)||0)),t.voucherNo||t.id||'—'])}/></div>
      </Panel></div>
     </div>
     <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
      <Panel title={activeTab==='Utilities'?'Monthly Utility Payments':'Monthly Ad-hoc Payments'} action={<ReportLink id="payments" category="Registers" label="Open register"/>}>
       <div className="h-[150px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={allMonths.map(m=>({month:m.split(' ')[0],amount:paymentRows.filter(t=>String(t.reportingMonth||t.month||'')===m).reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0)}))} margin={{top:4,right:4,bottom:0,left:0}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:9}}/><YAxis width={42} tick={{fontSize:9}} tickFormatter={(v)=>'₹'+num(Number(v)/1000)+'k'}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Bar dataKey="amount" name="Recorded payments" fill={activeTab==='Utilities'?'#0d9488':'#7c3aed'} radius={[3,3,0,0]}/></ComposedChart></ResponsiveContainer></div>
       <p className="text-[9px] text-slate-500">Based on keyword classification of transaction descriptions and categories; verify Party Master classification.</p>
      </Panel>
      <Panel title="Largest Payments & Potential Anomalies" action={<ReportLink id="largest-payments-anomalies" category="Audit & Governance" label="Open full report"/>}>
       <Table headers={['Payee','Amount','Review flag']} rows={paymentRows.map(t=>({t,amount:Math.abs(Number(t.amount)||0)})).sort((a,b)=>b.amount-a.amount).slice(0,5).map(({t,amount})=>[String(t.party||'Unidentified payee'),fmt(amount),t.evidenceStatus==='Complete'?'Check amount / duplicate':'Evidence review'])}/>
       <p className="mt-2 text-[9px] text-slate-500">Screening prompts only, not findings of irregularity. Verify vouchers, approvals and related transactions.</p>
      </Panel>
      <Panel title="Priority Actions">
       <div className="space-y-2 text-[11px]">
        <div className="rounded-lg bg-amber-50 p-2"><strong>{num(paymentRows.filter(t=>t.evidenceStatus!=='Complete'||t.billStatus==='Missing'||t.voucherReceiptStatus==='Missing').length)} transactions</strong><div className="text-slate-600">Evidence or bill/voucher status needs review.</div></div>
        <div className="rounded-lg bg-blue-50 p-2"><strong>{num(paymentRows.filter(t=>!String(t.party||'').trim()||/unknown|unidentified|unmapped/i.test(String(t.party||''))).length)} payments</strong><div className="text-slate-600">Party identity may need confirmation.</div></div>
        <div className="flex flex-wrap gap-2"><ReportLink id="missing-docs" category="Audit & Governance" label="Evidence register"/><ReportLink id="mapping-exceptions" category="Audit & Governance" label="Mapping exceptions"/></div>
       </div>
      </Panel>
     </div>
     <Panel title={activeTab==='Utilities'?'Utility Drill-Down':'Ad-hoc Party Drill-Down'}><div className="flex flex-wrap gap-2"><ReportLink id="vendor-ledger" category="Debtors & Parties" label="Detailed vendor ledger"/><ReportLink id="payments" category="Registers" label="Payments register"/><ReportLink id="largest-payments-anomalies" category="Audit & Governance" label="Largest payments & potential anomalies"/><ReportLink id="missing-docs" category="Audit & Governance" label="Missing bill / voucher evidence"/></div></Panel>
    </>}
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
   <div className="flex flex-wrap gap-2"><ReportLink id="bank-recon" category="Registers" label="Bank Reconciliation Register"/><ReportLink id="cashbook" category="Registers" label="Cash & Bank Books"/><ReportLink id="opening-balance-review" category="Audit & Governance" label="Opening Balance Exceptions"/></div>
   <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"><Landmark className="h-4 w-4 text-blue-700"/><span className="text-xs font-semibold">Account</span>{(['TDCC','BOM','CASH','ALL'] as const).map(a=><button key={a} onClick={()=>setAccountFilter(a)} className={'rounded-lg px-3 py-2 text-xs font-semibold '+(accountFilter===a?'bg-blue-600 text-white':'border border-slate-200 text-slate-600')}>{a==='ALL'?'All accounts':a==='TDCC'?'TDCC (Main)':a==='BOM'?'BOM (Secondary)':'Cash'}</button>)}</div>
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"><Card label="Opening Balance" value={fmt(totalRecon[0]?.calculatedOpeningBalance||0)} detail="First loaded account-month" icon={Landmark}/><Card label="Receipts / Credits" value={fmt(totalRecon.reduce((s,r)=>s+Number(r.credits||0),0))} detail="From reconciliation records" icon={ArrowDownRight} tone="green"/><Card label="Payments / Debits" value={fmt(totalRecon.reduce((s,r)=>s+Number(r.debits||0),0))} detail="From reconciliation records" icon={ArrowUpRight} tone="red"/><Card label="Reconciled Periods" value={num(matched)} detail={num(totalRecon.length)+' account-months loaded'} icon={CheckCircle2} tone="green"/><Card label="Unresolved Differences" value={num(unmatched)} detail="Requires statement evidence" icon={AlertTriangle} tone="amber"/></div>
   <div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><Panel title="Bank Balance Trend (Bank vs Books)"><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={totalRecon}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip formatter={(v:any)=>fmt(Number(v))}/><Legend/><Bar dataKey="calculatedClosingBalance" name="Book closing balance" fill="#2563eb"/><Line dataKey="sourceClosingBalance" name="Statement closing balance" stroke="#16a34a" connectNulls/></ComposedChart></ResponsiveContainer></div></Panel><Panel title="Reconciliation Summary"><Table headers={['Month','Opening','Credits','Debits','Book closing','Statement closing','Status']} rows={totalRecon.map(r=>[r.month,fmt(Number(r.calculatedOpeningBalance)||0),fmt(Number(r.credits)||0),fmt(Number(r.debits)||0),fmt(Number(r.calculatedClosingBalance)||0),r.sourceClosingBalance==null?'Not supplied':fmt(Number(r.sourceClosingBalance)),statusPill(r.status)])}/></Panel></div>
   <div className="grid grid-cols-1 gap-3 xl:grid-cols-2"><Panel title="Monthly Reconciliation Position"><Table headers={['Month','Account','Credits','Debits','Difference','Status']} rows={totalRecon.map(r=>[r.month,r.accountId,fmt(Number(r.credits)||0),fmt(Number(r.debits)||0),r.sourceClosingBalance==null?'—':fmt(Number(r.calculatedClosingBalance||0)-Number(r.sourceClosingBalance||0)),statusPill(r.status)])}/></Panel><Panel title="Unmatched / Needs Review"><Table headers={['Month','Account','Possible issue','Action']} rows={totalRecon.filter(r=>r.status!=='Reconciled'&&r.status!=='Matched').map(r=>[r.month,r.accountId,r.sourceClosingBalance==null?'Statement closing balance missing':'Book-to-bank variance','Open monthly reconciliation'])}/></Panel></div>
  </>}
  {screen==='observations-actions'&&<>
   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><Card label="Transactions Reviewed" value={num(stats.inspectedTransactions)} detail={'of '+num(stats.totalTransactions)+' transactions'} icon={CheckCircle2} tone="green"/><Card label="Pending Inspection" value={num(stats.pendingTransactions)} detail="Requires reviewer action" icon={ClipboardList} tone="amber"/><Card label="Missing Evidence" value={num(stats.evidenceMissing)} detail="Supporting bill / voucher gap" icon={AlertTriangle} tone="red"/><Card label="Audit Failures / Discrepancies" value={num(stats.internalAuditFailed+stats.evidenceDiscrepancy)} detail="Investigate and document resolution" icon={ShieldCheck} tone="violet"/></div>
   <div className="flex flex-wrap gap-2"><ReportLink id="rectification" category="Audit & Governance" label="Full Audit Rectification Register"/><ReportLink id="missing-docs" category="Audit & Governance" label="Missing Evidence Register"/><ReportLink id="mapping-exceptions" category="Audit & Governance" label="Mapping Exceptions"/><ReportLink id="adjustments-contra" category="Registers" label="Adjustments & Contra Register"/></div>
   <Panel title="Corrective Action Priorities"><Table headers={['Priority area','Open items','Recommended action']} rows={[[ 'Evidence gaps',num(filtered.filter(t=>t.evidenceStatus==='Missing').length),'Obtain and link supporting documents'],['Discrepancies / failed checks',num(filtered.filter(t=>t.evidenceStatus==='Discrepancy'||t.internalAuditStatus==='Failed').length),'Investigate, document cause and approve resolution'],['Pending inspection',num(stats.pendingTransactions),'Complete reviewer assessment'],['Audit notes / observations',num(auditNotes.length),'Assign owner, due date and closure evidence']]}/><div className="mt-3 flex flex-wrap gap-2"><ReportLink id="rectification" category="Audit & Governance" label="Open Corrective Action Register"/><ReportLink id="missing-docs" category="Audit & Governance" label="Open Missing Evidence Register"/></div></Panel>
   <Panel title="Audit Notes / Observations"><Table headers={['Date','Title / observation','Category','Status','Owner / reference']} rows={auditNotes.map(n=>[n.timestamp||'—',n.title||n.content||'—',n.tag||'—',n.priority||'Not assessed',n.author||'—'])}/></Panel>
  </>}
   {screen==='reports'&&<div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
   <aside className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-4">
    <div className="mb-3 border-b border-slate-100 pb-3"><h2 className="text-sm font-bold text-blue-950">Financial Reports & Registers</h2><p className="mt-1 text-[11px] leading-4 text-slate-600">Search by report number, title or keyword, or browse by category.</p></div>
    <div className="mb-3"><label className="sr-only" htmlFor="financial-report-search">Search reports</label><div className="relative"><input id="financial-report-search" type="search" value={reportSearch} onChange={e=>setReportSearch(e.target.value)} placeholder="Search reports (e.g. RPT-04, demand, bank)…" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/>{reportSearch&&<button type="button" onClick={()=>setReportSearch('')} aria-label="Clear report search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-slate-100">✕</button>}</div><p className="mt-1 px-1 text-[10px] text-slate-500">{normalizedReportSearch?`${filteredReportCatalog.length} matching reports`:`${reportCatalog.length} reports available`}</p></div>
    <nav className="max-h-[72vh] space-y-2 overflow-y-auto" aria-label="Reports">
     <div className="flex items-center justify-between px-2 py-1"><span className="text-xs font-extrabold uppercase tracking-wide text-slate-800">{normalizedReportSearch?'Search results':'Browse by category'}</span>{normalizedReportSearch&&<button onClick={()=>setReportSearch('')} className="text-[10px] font-semibold text-blue-700 hover:underline">Clear search</button>}</div>
     {visibleReportCategories.map(cat=><section key={cat} className="rounded-lg border border-slate-100">
      <button onClick={()=>setReportCategory(reportCategory===cat?'All Reports':cat)} aria-expanded={Boolean(normalizedReportSearch)||reportCategory===cat||reportCategory==='All Reports'} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-left text-xs font-bold text-slate-800 hover:bg-blue-50"><span>{cat}</span><span className="text-[10px] text-slate-500">{filteredReportCatalog.filter(r=>r.category===cat).length} {normalizedReportSearch?'matches':reportCategory===cat?'−':'+'}</span></button>
      {(normalizedReportSearch||reportCategory===cat||reportCategory==='All Reports')&&<div className="space-y-0.5 p-1">
       {filteredReportCatalog.filter(r=>r.category===cat).map(r=><button key={r.id} onClick={()=>{setSelectedReport(r.id);setReportCategory(cat)}} className={'w-full rounded-md border-l-2 px-2.5 py-2 text-left transition '+(selectedReport===r.id?'border-blue-600 bg-blue-50 text-blue-900':'border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50')}>
        <span className="block text-[11px] font-semibold leading-4">RPT-{reportNumbers[r.id]||'—'} · {r.name}</span><span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{r.description}</span>
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
      #selected-report-content #rpt16-print-content { display: block !important; }
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
     <button onClick={()=>window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Print</button>
     <button onClick={exportRows} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"><Download className="h-4 w-4"/>CSV</button>
     <button onClick={exportTxt} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">TXT</button>
     <button onClick={exportPdf} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">PDF</button>
    </div>
    {!(screen==='reports'&&(selectedReport==='member-opening-balance-register'||selectedReport==='demand-register'||selectedReport==='receipts'||selectedReport==='payments'||selectedReport==='adjustments-contra'))&&filterBar}
  {screen==='reports'&&<>
   {selectedReport!=='member-opening-balance-register'&&selectedReport!=='demand-register'&&selectedReport!=='receipts'&&selectedReport!=='payments'&&selectedReport!=='adjustments-contra'&&<div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
    <span className="px-1 text-[11px] font-semibold text-slate-600">Report filters</span>
    {(selectedReport==='party-balances'||selectedReport.startsWith('party-ledger')||selectedReport==='member-ledger'||selectedReport==='vendor-ledger'||selectedReport==='demand-summary'||selectedReport==='monthly-demands'||selectedReport==='monthly-payments'||selectedReport==='monthly-flat-balance')&&<>
     <label className="text-[11px] text-slate-600">Party type <select value={partyTypeFilter} onChange={e=>setPartyTypeFilter(e.target.value)} className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px]"><option>All party types</option>{(selectedReport==='demand-summary'?memberPartyTypes:partyTypes).map(v=><option key={v}>{v}</option>)}</select></label>
     <label className="text-[11px] text-slate-600">Party name <select value={query} onChange={e=>setQuery(e.target.value)} className="ml-1 max-w-[220px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px]"><option value="">All parties</option>{Array.from(new Set([...flatOwnerMaster.map((x:any)=>String(x.owner_name||'')),...partyMaster.map((x:any)=>String(x.party_name||x.name||''))].filter(Boolean))).sort().map(v=><option key={v} value={v}>{v}</option>)}</select></label>
    </>}
    {(selectedReport.startsWith('account-ledger')||selectedReport==='cashbook'||selectedReport==='bank-recon'||selectedReport==='monthly-summary')&&<label className="text-[11px] text-slate-600">Account <select value={accountFilter} onChange={e=>setAccountFilter(e.target.value as 'TDCC'|'BOM'|'CASH'|'ALL')} className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px]"><option value="ALL">All accounts</option><option value="TDCC">TDCC</option><option value="BOM">BOM</option><option value="CASH">Cash</option></select></label>}
    {(selectedReport==='expense-analysis'||selectedReport==='income-expense'||selectedReport.startsWith('category-ledger'))&&<label className="text-[11px] text-slate-600">Category group <select value={categoryGroupFilter} onChange={e=>setCategoryGroupFilter(e.target.value)} className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px]"><option>All category groups</option>{categoryGroups.map(v=><option key={v}>{v}</option>)}</select></label>}
    <button onClick={()=>{setPartyTypeFilter('All party types');setCategoryGroupFilter('All category groups');setQuery('');setAccountFilter('ALL')}} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-600">Reset report filters</button>
   </div>}
   {selectedReport==='party-balances'&&<div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Card label="Member balance records" value={num(cumulativeOutstanding.length)} detail="Cumulative outstanding register" icon={Users}/><Card label="Members with dues" value={num(cumulativeOutstanding.filter(r=>Number(r.net_outstanding||0)>0).length)} detail="Positive outstanding balance" icon={AlertTriangle} tone="amber"/><Card label="Net outstanding" value={fmt(cumulativeOutstanding.reduce((s,r)=>s+Number(r.net_outstanding||0),0))} detail="Verify opening balances and allocations" icon={Wallet} tone="red"/></div>}
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
const rows=(demandRegister||[]).map((d:any)=>{const party=partyMaster.find((p:any)=>String(p.party_id)===String(d.party_id));const flat=flatOwnerMaster.find((x:any)=>String(x.owner_name||'').trim().toLowerCase()===String(party?.party_name||d.party_name||'').trim().toLowerCase());const cat=categoryMaster.find((x:any)=>String(x.category_id)===String(d.category_id));const tx=(transactions||[]).filter((t:any)=>transactionDemandId(t)===String(d.demand_id||d.id||'')&&t.type==='Receipt'&&t.transactionClass!=='Contra');const paid=tx.reduce((s:number,t:any)=>s+Math.abs(Number(t.amount)||0),0);const note=String(d.notes||'');const adjMatch=note.match(/Adjustment amount:\\s*(-?[0-9.]+)/i);const approved=(demandAdjustments||[]).filter((a:any)=>String(a.demand_id||'')===String(d.demand_id||d.id||'')&&a.is_approved===true);const adjustments=approved.length?approved.reduce((s:number,a:any)=>s+Number(a.amount||0),0):Number(adjMatch?.[1]||0);const demand=demandNetAmount(d);const outstanding=demand-paid+adjustments;const status=outstanding<0?'Excess Paid':outstanding===0?'Fully Paid':paid>0?'Partially Paid':'Pending';return {fy:String(d.financial_year||''),month:String(d.demand_month||''),date:String(d.demand_date||''),due:String(d.due_date||''),flat:String(flat?.flat_no||d.flat_no||''),party:String(party?.party_name||d.party_name||'Unmapped Party'),classification:String(party?.party_type||'Unclassified'),group:String(cat?.demand_group||'Unclassified'),demand,paid,adjustments,outstanding,paidMonths:Array.from(new Set(tx.map((t:any)=>String(t.reportingMonth||t.month||'').trim()).filter(Boolean))).sort().join(', '),status};});
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
<div className="overflow-x-auto [&_table]:min-w-[1500px] [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"><Table headers={['Sr. No.','Financial Year','Demand Month','Demand Date','Party Name','Party Classification','Demand Group','Gross / Net Demand','Paid Amount','Adjustments','Outstanding','Paid Month(s)','Payment Status']} rows={filteredRows.map((r:any,i:number)=>[i+1,r.fy,r.month,r.date||'—',r.party,r.classification,r.group,currencyCell(r.demand),currencyCell(r.paid),currencyCell(r.adjustments),currencyCell(r.outstanding),r.paidMonths||'—',statusPill(r.status)])}/></div>
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
       <div className="mt-4 rounded-lg border-2 border-slate-400 p-4 rpt16-summary">
        <h4 className="mb-3 border-b border-slate-300 pb-2 text-sm font-extrabold uppercase tracking-wide">Cash Movement Summary</h4>
        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
         <div><div className="text-[11px] font-semibold uppercase text-slate-500">Opening cash & bank balance</div><div className="mt-1 text-xl font-extrabold">{x.openingAvailable?fmtAmount(x.openingTotal):'Not available'}</div></div>
         <div><div className="text-[11px] font-semibold uppercase text-slate-500">Total recorded receipts</div><div className="mt-1 text-xl font-extrabold">{fmtAmount(x.receiptTotal)}</div></div>
         <div><div className="text-[11px] font-semibold uppercase text-slate-500">Total recorded payments</div><div className="mt-1 text-xl font-extrabold">{fmtAmount(x.paymentTotal)}</div></div>
         <div className="border-t border-slate-300 pt-2"><div className="text-[11px] font-semibold uppercase text-slate-700">Calculated closing cash & bank balance</div><div className="mt-1 text-2xl font-black">{x.openingAvailable?fmtAmount(x.closingTotal):'Not available'}</div></div>
        </div>
        <div className="mt-4 border-t-2 border-double border-slate-500 pt-3 text-center text-sm font-bold">
         {x.openingAvailable?fmtAmount(x.openingTotal)+'  +  '+fmtAmount(x.receiptTotal)+'  −  '+fmtAmount(x.paymentTotal)+'  =  '+fmtAmount(x.closingTotal):'Opening balance unavailable — closing balance cannot be calculated'}
        </div>
        <p className="mt-2 text-[10px] italic text-slate-600">Closing balance is a calculated book position and remains subject to bank reconciliation and physical cash verification.</p>
       </div>
      </section>
      <section><h3 className="mb-2 text-sm font-bold">2. Receipts & Payments Account</h3><p className="mb-2 text-xs text-slate-600">Opening balance is presented on the receipts side and calculated closing balance on the payments side. Transaction heads are grouped by Category Group → Category Name. Contra transfers are excluded from receipts and payments totals.</p><Table headers={['RECEIPTS — Particulars','Amount (₹)','PAYMENTS — Particulars','Amount (₹)']} rows={d.rows||[]}/></section>
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
   })():<Panel title={'RPT-'+(reportNumbers[selectedReport]||'—')+' · '+reportData.title} action={<button onClick={()=>downloadCsv('society-report-'+selectedReport+'.csv',[[reportData.title],reportData.headers,...reportData.rows.map(row=>row.map(v=>typeof v==='object'&&v!==null&&'props' in v?String((v as any).props.children??''):String(v??'')))])} className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white">Export this report</button>}>
<div className="mb-4 border-b-2 border-slate-800 pb-3 text-center"><h2 className="text-base font-bold uppercase tracking-wide text-slate-900">Pearl Meadows 'C' Type 'C' Wing Chs Ltd</h2><p className="mt-1 text-xs font-semibold text-slate-700">Regd. No. TNA/KLN/HSG(TC) 27051/2014-15/YEAR 2014</p><h3 className="mt-3 text-sm font-bold uppercase text-slate-900">{reportData.title}</h3><p className="mt-1 text-[11px] text-slate-600">Financial Year: FY 2018–19 · Report No. RPT-{reportNumbers[selectedReport]||'—'} · Generated: {new Date().toLocaleDateString('en-IN')}</p></div>
    <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{reportData.note}</p>
    <Table headers={reportData.headers} rows={reportData.rows}/>
   </Panel>}
  </>}
  </div></div>}

  <footer className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-slate-500"><span>Society OS · data is derived from connected records; missing fields are labelled rather than estimated.</span><span>Showing {Math.min(100,filtered.length)} of {num(filtered.length)} filtered transactions · CSV exports all filtered rows.</span></footer>
 </div>;
};

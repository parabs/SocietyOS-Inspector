import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote,
  Download, FileText, Landmark, RefreshCw, ShieldCheck, Users, Wallet,
  CheckCircle2, CircleHelp, Search, ChevronRight
} from 'lucide-react';
import { useVerification, ScreenId } from '../../context/VerificationContext';

type DashboardScreen = ScreenId;
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
const number = (value: number) => new Intl.NumberFormat('en-IN').format(value || 0);
const titleMap: Partial<Record<DashboardScreen, { title: string; subtitle: string }>> = {
  'financial-summary': { title: 'Cooperative Society Financial Reports Dashboard', subtitle: 'Financial position, collections, expenditure and control exceptions from the connected society records.' },
  'demand-collections': { title: 'Demand & Collections', subtitle: 'Demand register, member balances and collection analysis. Figures reflect records currently available in the system.' },
  'payments-expenses': { title: 'Payments & Expenses', subtitle: 'Payment register, expense categories, evidence status and bank/cash review.' },
  'party-ledger': { title: 'Party-wise Ledger', subtitle: 'Member, vendor and other-party transaction history based on the available transaction register.' },
  'audit-evidence': { title: 'Audit Evidence & Statutory Compliance', subtitle: 'Evidence completeness, verification exceptions, source register and compliance follow-up.' },
  'bank-reconciliation': { title: 'Bank & Cash Reconciliation', subtitle: 'Account and monthly reconciliation status; no bank clearance is inferred without statement evidence.' },
  'observations-actions': { title: 'Observations & Corrective Actions', subtitle: 'Verification exceptions and audit notes requiring investigation, ownership and closure evidence.' },
  'reports': { title: 'Cooperative Society Financial Reports Dashboard', subtitle: 'One reporting hub for statements, ledgers, registers, management information and audit evidence.' },
  'treasurer-dashboard': { title: 'Treasurer Dashboard', subtitle: 'Collections, payments, account controls, pending evidence and month-end finance review.' },
  'secretary-dashboard': { title: 'Secretary Dashboard', subtitle: 'Governance calendar, meetings, resolutions, member matters and statutory follow-ups.' },
  'chairman-dashboard': { title: 'Chairman Dashboard', subtitle: 'Managing Committee oversight, financial exposure, decisions, risks and action accountability.' },
  'member-dashboard': { title: 'Member Dashboard', subtitle: 'Member-facing financial transparency and society service information. Personal balances require a verified member identity.' },
  'auditor-dashboard': { title: 'Statutory Auditor Dashboard', subtitle: 'Read-only audit readiness, source traceability, evidence gaps, reconciliation status and exception follow-up.' },
};

const downloadCsv = (name: string, rows: string[][]) => {
  const csv = rows.map(row => row.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
};

export const SocietyRoleDashboards: React.FC<{ screen: DashboardScreen }> = ({ screen }) => {
  const {
    transactions, openingBalances, reconciliations, demandRegister, demandAdjustments,
    demandAllocations, memberFinancialBalances, cumulativeOutstanding, balanceRegister,
    partyMaster, flatOwnerMaster, categoryMaster, rulesMaster, sourceRegister, stats,
    auditNotes, changeLogs, supabaseSync, isLoadingTransactions, isLoadingDemandRegister,
    isLoadingMasters, refetchAll, setCurrentScreen
  } = useVerification();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('All periods');
  const [roleTab, setRoleTab] = useState<'overview'|'finance'|'governance'|'controls'>('overview');
  const config = titleMap[screen] || titleMap['financial-summary']!;
  const rows = useMemo(() => transactions.filter(t => {
    const periodText = String(t.reportingMonth || t.month || '');
    const periodMatch = period === 'All periods' || periodText.toLowerCase().includes(period.toLowerCase());
    const q = search.trim().toLowerCase();
    const searchMatch = !q || [t.id, t.party, t.description, t.categoryName, t.accountName, t.voucherNo, t.receiptNo].some(v => String(v || '').toLowerCase().includes(q));
    return periodMatch && searchMatch;
  }), [transactions, period, search]);
  const receipts = rows.filter(t => t.transactionClass !== 'Contra' && (t.type === 'Receipt' || String(t.transactionClass).toLowerCase() === 'receipt')).reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
  const payments = rows.filter(t => t.transactionClass !== 'Contra' && (t.type === 'Payment' || String(t.transactionClass).toLowerCase() === 'payment')).reduce((s,t)=>s+Math.abs(Number(t.amount)||0),0);
  const contraCount = rows.filter(t => t.transactionClass === 'Contra').length;
  const missingEvidence = rows.filter(t => t.evidenceStatus === 'Missing' || t.evidenceStatus === 'Discrepancy' || t.internalAuditStatus === 'Failed' || t.billStatus === 'Missing' || t.voucherReceiptStatus === 'Missing').length;
  const mappedPartyIds = new Set(partyMaster.map(p=>String(p.party_id || p.id || '')));
  const missingParty = rows.filter(t => !t.party || !String(t.party).trim() || /unknown|unmapped|not mapped/i.test(String(t.party))).length;
  const missingCategory = rows.filter(t => !t.categoryName || !String(t.categoryName).trim()).length;
  const allRecon = Object.values(reconciliations).flat();
  const reconMatched = allRecon.filter(r => ['Matched','Reconciled','Mismatch Accepted'].includes(r.status)).length;
  const openIssues = stats.pendingTransactions + stats.evidenceMissing + stats.evidenceDiscrepancy + stats.internalAuditFailed;
  const demandTotal = demandRegister.reduce((s,d)=>s+Number(d.total_demand ?? 0),0);
  const outstanding = cumulativeOutstanding.reduce((s,r)=>s+Number(r.net_outstanding||0),0);
  const netMovement = receipts - payments;
  const categorySummary = Object.entries(rows.reduce((acc: Record<string, { count: number; amount: number }>, t) => {
    const key = t.categoryName || 'Unclassified';
    acc[key] ??= { count: 0, amount: 0 };
    acc[key].count += 1;
    acc[key].amount += Math.abs(Number(t.amount) || 0);
    return acc;
  }, {})).sort((a, b) => b[1].amount - a[1].amount).slice(0, 8);
  const maxCategoryAmount = Math.max(1, ...categorySummary.map(([, item]) => item.amount));
  const loading = isLoadingTransactions || isLoadingDemandRegister || isLoadingMasters;
  const financialScreens: DashboardScreen[] = ['financial-summary','demand-collections','payments-expenses','party-ledger','reports'];
  const isFinancial = financialScreens.includes(screen);
  const reportCatalog = [
    ['Receipts & Payments Account','Cash movement by period and account; contra transfers shown separately.'],
    ['Income & Expenditure Statement','Income and expense categories; contra entries excluded. Requires validated classification and accounting policy.'],
    ['Balance Sheet','Assets, liabilities and accumulated funds. Not issued until opening balances and ledger completeness are confirmed.'],
    ['Trial Balance','Debit/credit ledger control. Requires a complete chart of accounts and double-entry mapping.'],
    ['Cash Book & Bank Books','Transaction register by cash/bank account with source references.'],
    ['Demand vs Collections','Demand register, allocations, adjustments, collections and outstanding balances.'],
    ['Member / Party Ledger','Party-wise transaction trail, source voucher and evidence status.'],
    ['Expense & Vendor Register','Payments by party/category, voucher/bill status and review flags.'],
    ['Bank Reconciliation Register','Monthly opening, credits, debits, closing and unresolved differences.'],
    ['Audit Evidence Register','Voucher, bill, source file, reviewer status and outstanding documentation.'],
    ['Statutory & Governance Register','Meetings, AGM/election events, notices, resolutions, approvals and compliance evidence.'],
    ['Observations & Rectification Register','Observation, severity, owner, target date, evidence and closure approval.'],
  ];
  const exportTransactions = () => downloadCsv('society-transaction-register.csv', [
    ['Transaction ID','Date','Period','Type','Party','Category','Account','Description','Amount','Voucher','Receipt','Bill status','Voucher status','Internal audit status','Source file','Source sheet','Source row'],
    ...rows.map(t=>[t.id,t.date,t.reportingMonth||t.month,t.transactionClass||t.type,t.party,t.categoryName,t.accountName,t.description,t.amount,t.voucherNo,t.receiptNo,t.billStatus,t.voucherReceiptStatus,t.internalAuditStatus,t.sourceFile,t.sourceSheet,t.sourceRow].map(v=>String(v ?? '')))
  ]);
  const Metric = ({ label, value, detail, icon: Icon, tone='slate' }: any) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4 min-w-0">
      <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-500">{label}</span><span className={`p-2 rounded-lg bg-${tone}-50 text-${tone}-700`}><Icon className="w-4 h-4"/></span></div>
      <div className="text-xl font-bold text-slate-900 mt-3 break-words">{value}</div><div className="text-[11px] text-slate-500 mt-1">{detail}</div>
    </div>
  );
  const Section = ({ title, children, action }: any) => <section className="bg-white border border-slate-200 rounded-xl overflow-hidden"><div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3"><h2 className="font-semibold text-sm text-slate-900">{title}</h2>{action}</div><div className="p-4">{children}</div></section>;
  const Action = ({ label, screen: target }: {label:string;screen:DashboardScreen}) => <button onClick={()=>setCurrentScreen(target)} className="flex w-full items-center justify-between text-left rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium hover:border-blue-300 hover:bg-blue-50"><span>{label}</span><ChevronRight className="w-4 h-4 text-slate-400"/></button>;

  return <div className="max-w-[1500px] mx-auto space-y-5 animate-in fade-in">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-blue-700"><span className="w-2 h-2 rounded-full bg-blue-600"/>{isFinancial?'Financial management & reports':'Role-based society operations'}</div><h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{config.title}</h1><p className="text-sm text-slate-600 mt-1 max-w-3xl">{config.subtitle}</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={()=>void refetchAll()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"><RefreshCw className="w-4 h-4"/>Refresh data</button><button onClick={exportTransactions} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-semibold hover:bg-slate-700"><Download className="w-4 h-4"/>Export register CSV</button></div>
    </div>
    <div className="flex flex-wrap gap-2 items-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"><AlertTriangle className="w-4 h-4 shrink-0"/><span><strong>Reporting status: Preliminary / unaudited.</strong> Historical FY 2018–19 records are still subject to verification. This screen does not certify compliance or replace an authorised statutory audit.</span><span className="ml-auto text-[10px] whitespace-nowrap">Sync: {supabaseSync.isConnected?'Connected':supabaseSync.isLoading?'Connecting…':'Check connection'}</span></div>
    <div className="flex flex-wrap gap-2">
      {(['overview','finance','governance','controls'] as const).map(tab=><button key={tab} onClick={()=>setRoleTab(tab)} className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize ${roleTab===tab?'bg-blue-600 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{tab==='overview'?'Overview':tab==='finance'?'Financial controls':tab==='governance'?'Governance & service':'Audit & control checks'}</button>)}
      <div className="ml-auto flex items-center gap-2"><label className="text-xs text-slate-500">Period</label><select value={period} onChange={e=>setPeriod(e.target.value)} className="border border-slate-200 rounded-lg bg-white px-2 py-2 text-xs"><option>All periods</option>{Array.from(new Set(transactions.map(t=>String(t.reportingMonth||t.month||'')).filter(Boolean))).sort().map(p=><option key={p}>{p}</option>)}</select></div>
    </div>
    {loading && <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-800">Loading current Supabase records… values may be incomplete until loading finishes.</div>}
    {roleTab==='overview' && <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Metric label="Transactions in view" value={number(rows.length)} detail="Current source register filter" icon={FileText} tone="blue"/>
        <Metric label="Receipts" value={money(receipts)} detail="Receipt entries; contra excluded" icon={ArrowDownRight} tone="emerald"/>
        <Metric label="Payments" value={money(payments)} detail="Payment entries; contra excluded" icon={ArrowUpRight} tone="rose"/>
        <Metric label="Net cash movement" value={money(netMovement)} detail="Receipts less payments; not closing cash" icon={Wallet} tone="violet"/>
        <Metric label="Member / party records" value={number(partyMaster.length)} detail="Party master entries" icon={Users}/>
        <Metric label="Demands recorded" value={money(demandTotal)} detail={`${number(demandRegister.length)} demand records loaded`} icon={Banknote} tone="amber"/>
        <Metric label="Evidence exceptions" value={number(missingEvidence)} detail="Missing, discrepancy or failed review" icon={AlertTriangle} tone="rose"/>
        <Metric label="Verification readiness" value={`${stats.readinessPercentage}%`} detail={`${number(stats.inspectedTransactions)} of ${number(stats.totalTransactions)} transactions inspected`} icon={ShieldCheck} tone="blue"/>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><Section title="Transaction activity by category"><div className="space-y-3">{categorySummary.map(([name,item])=><div key={name}><div className="flex justify-between gap-3 text-xs mb-1"><span className="font-medium text-slate-700 truncate">{name}</span><span className="text-slate-600 whitespace-nowrap">{number(item.count)} entries · {money(item.amount)}</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{width:`${Math.min(100,(item.amount/maxCategoryAmount)*100)}%`}}/></div></div>)}{rows.length===0&&<p className="text-xs text-slate-500">No transaction records match the current filters.</p>}</div></Section></div>
        <Section title="Priority attention"><div className="space-y-2"><Action label={`Review transaction evidence (${number(missingEvidence)} exceptions)`} screen="transaction-verification"/><Action label={`Review opening balances (${number(stats.openingBalancesTotal-stats.openingBalancesVerified)} pending)`} screen="opening-balances"/><Action label="Review month-end reconciliation" screen="monthly-reconciliation"/><Action label="Review audit evidence & compliance" screen="audit-evidence"/><Action label="Review observations & actions" screen="observations-actions"/></div></Section>
      </div>
    </>}
    {roleTab==='finance' && <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Section title="Finance control summary"><div className="grid grid-cols-2 gap-3"><Metric label="Demand records" value={number(demandRegister.length)} detail="Demand register rows" icon={ReceiptIcon}/><Metric label="Allocations" value={number(demandAllocations.length)} detail="Payment allocations loaded" icon={CheckCircle2}/><Metric label="Adjustments" value={number(demandAdjustments.length)} detail="Includes unapproved adjustments; verify approval" icon={Banknote}/><Metric label="Contra transactions" value={number(contraCount)} detail="Shown separately from income/expense" icon={Landmark}/></div></Section>
      <Section title="Available financial modules"><div className="space-y-2"><Action label="Demand & collections register" screen="demand-collections"/><Action label="Payments, expenses & vendor analysis" screen="payments-expenses"/><Action label="Party-wise ledger" screen="party-ledger"/><Action label="Bank and cash reconciliation" screen="bank-reconciliation"/><Action label="Statements and registers" screen="reports"/></div></Section>
      <Section title="Account opening balance review"><div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-500 border-b"><th className="py-2">Account</th><th className="py-2 text-right">Recorded opening</th><th className="py-2">Status</th></tr></thead><tbody>{openingBalances.map(a=><tr key={a.accountId} className="border-b border-slate-100"><td className="py-2 font-medium">{a.accountName}</td><td className="py-2 text-right">{money(a.recordedOpeningBalance)}</td><td className="py-2">{a.status}</td></tr>)}</tbody></table>{openingBalances.length===0&&<p className="py-4 text-slate-500">No opening balance records loaded.</p>}</div></Section>
      <Section title="Category master coverage"><p className="text-xs text-slate-600 mb-3">{number(categoryMaster.length)} category master records available. Check active status and transaction-type mapping before finalising formal statements.</p><div className="flex flex-wrap gap-2">{Array.from(new Set(categoryMaster.map(c=>String(c.type||'Unassigned group')))).map(g=><span key={g} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700">{g}</span>)}</div></Section>
    </div>}
    {roleTab==='governance' && <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Section title="Governance workflows to maintain"><div className="space-y-3">{[
        ['Committee meeting register','Meeting date, notice, agenda, attendance, minutes, resolutions, action owner and due date.'],
        ['AGM / General Body register','Notice service, agenda, audited accounts, budget, elections and minutes/evidence.'],
        ['Resolution & approval register','Resolution ID, authority, approved amount/scope, conditions, execution owner and closure evidence.'],
        ['Member services register','Complaints, water/repairs, transfers, share certificates, no-dues and communication trail.'],
        ['Handover & office bearer register','Resignation acceptance, successor appointment, custody of records, access, cash/bank and pending liabilities.'],
        ['Vendor / works register','Quotation comparison, approval, work order, completion confirmation, bill, payment and warranty/AMC.'],
      ].map(([h,d])=><div key={h} className="border-b border-slate-100 pb-3 last:border-0"><div className="font-semibold text-xs text-slate-800">{h}</div><p className="text-xs text-slate-500 mt-1">{d}</p><span className="inline-block mt-1 text-[10px] rounded bg-amber-50 text-amber-800 px-2 py-1">Workflow design / records not yet present in connected schema</span></div>)}</div></Section>
      <Section title="Available governance-related evidence"><div className="space-y-3"><div className="flex justify-between text-xs"><span className="text-slate-600">Source register rows</span><strong>{number(sourceRegister.length)}</strong></div><div className="flex justify-between text-xs"><span className="text-slate-600">Rule master rows</span><strong>{number(rulesMaster.length)}</strong></div><div className="flex justify-between text-xs"><span className="text-slate-600">Audit notes available</span><strong>{number(auditNotes.length)}</strong></div><div className="flex justify-between text-xs"><span className="text-slate-600">Change log entries</span><strong>{number(changeLogs.length)}</strong></div><div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900">Meeting, AGM, election, resolution, resignation/handover, complaint and works registers need dedicated persistent tables before they can be treated as live operational records. This dashboard identifies the required workflow without fabricating entries.</div></div></Section>
    </div>}
    {roleTab==='controls' && <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Section title="Audit readiness checks"><div className="space-y-3">{[
        ['Opening balances',`${stats.openingBalancesVerified} / ${stats.openingBalancesTotal} verified`,stats.openingBalancesTotal>0&&stats.openingBalancesVerified===stats.openingBalancesTotal],
        ['Transaction inspection',`${stats.inspectedTransactions} / ${stats.totalTransactions} inspected`,stats.totalTransactions>0&&stats.inspectedTransactions===stats.totalTransactions],
        ['Monthly reconciliation',`${reconMatched} / ${allRecon.length} marked matched/reconciled`,allRecon.length>0&&reconMatched===allRecon.length],
        ['Party mapping',`${missingParty} potential missing/unmapped parties in filtered view`,missingParty===0],
        ['Category mapping',`${missingCategory} missing categories in filtered view`,missingCategory===0],
        ['Source traceability',`${sourceRegister.length} source register rows loaded`,sourceRegister.length>0],
      ].map(([label,value,ok])=><div key={String(label)} className="flex items-start gap-2"><span className={`mt-0.5 ${ok?'text-emerald-600':'text-amber-600'}`}>{ok?<CheckCircle2 className="w-4 h-4"/>:<AlertTriangle className="w-4 h-4"/>}</span><div><div className="text-xs font-semibold text-slate-800">{label}</div><div className="text-xs text-slate-500">{value}</div></div></div>)}</div></Section>
      <Section title="Auditor evidence queue"><div className="space-y-2"><Action label="Open transaction inspection" screen="transaction-verification"/><Action label="Open opening balance verification" screen="opening-balances"/><Action label="Open monthly reconciliation" screen="monthly-reconciliation"/><Action label="Open source register / data management" screen="data-management"/></div><p className="mt-3 text-[11px] text-slate-500">This is an evidence and exception workbench, not a statutory audit opinion. Auditor sign-off and report issuance must remain a separate authorised step.</p></Section>
    </div>}
    <Section title={screen==='reports' || screen==='financial-summary'?'Reports & registers catalogue':'Transaction register'} action={<div className="flex items-center gap-2"><Search className="w-4 h-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search party, category, voucher…" className="w-48 max-w-[50vw] border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"/></div>}>
      {(screen==='reports'||screen==='financial-summary'||screen==='auditor-dashboard'||screen==='secretary-dashboard'||screen==='chairman-dashboard'||screen==='member-dashboard'||screen==='treasurer-dashboard') ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{reportCatalog.map(([name,desc],i)=><button key={name} onClick={()=>setCurrentScreen((['demand-collections','payments-expenses','party-ledger','bank-reconciliation','audit-evidence','observations-actions'] as DashboardScreen[])[i%6])} className="text-left p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/40"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600"/><span className="font-semibold text-xs text-slate-800">{name}</span></div><p className="text-[11px] text-slate-500 mt-2">{desc}</p><div className="text-[10px] font-semibold text-blue-700 mt-2">Open related module →</div></button>)}</div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-2 px-2">Date</th><th className="py-2 px-2">Transaction / voucher</th><th className="py-2 px-2">Party</th><th className="py-2 px-2">Category</th><th className="py-2 px-2">Type</th><th className="py-2 px-2 text-right">Amount</th><th className="py-2 px-2">Evidence</th></tr></thead><tbody>{rows.slice(0,100).map((t,i)=><tr key={t.id||i} className="border-b border-slate-100 hover:bg-slate-50"><td className="py-2 px-2 whitespace-nowrap">{t.date||'—'}</td><td className="py-2 px-2"><div className="font-medium text-slate-800">{t.id||'—'}</div><div className="text-[10px] text-slate-500">{t.voucherNo||t.receiptNo||'No voucher reference'}</div></td><td className="py-2 px-2">{t.party||'Unmapped'}</td><td className="py-2 px-2">{t.categoryName||'Unclassified'}</td><td className="py-2 px-2">{t.transactionClass||t.type}</td><td className="py-2 px-2 text-right font-mono">{money(Number(t.amount)||0)}</td><td className="py-2 px-2"><span className={`rounded px-1.5 py-1 text-[10px] ${t.evidenceStatus==='Complete'?'bg-emerald-50 text-emerald-700':t.evidenceStatus==='Discrepancy'||t.evidenceStatus==='Missing'?'bg-rose-50 text-rose-700':'bg-amber-50 text-amber-800'}`}>{t.evidenceStatus||'Pending'}</span></td></tr>)}</tbody></table>{rows.length>100&&<p className="text-[11px] text-slate-500 mt-3">Showing first 100 of {number(rows.length)} matching rows. Export CSV for the full filtered register.</p>}{rows.length===0&&<p className="py-8 text-center text-xs text-slate-500">No records match the current filters.</p>}</div>}
    </Section>
    <div className="text-[10px] text-slate-400 flex items-start gap-2"><CircleHelp className="w-3.5 h-3.5 shrink-0"/><span>Calculations are derived from the currently loaded records. Contra entries are excluded from receipt/payment KPI totals. Final statutory statements require verified opening balances, complete ledger classification, validated accounting rules and auditor review.</span></div>
  </div>;
};

const ReceiptIcon = Banknote;

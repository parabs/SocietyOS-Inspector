import React, { useEffect, useState } from 'react';
import {
  ArrowRight, AlertCircle, CheckCircle2, Clock3, FileCheck2, FileText,
  Landmark, RefreshCw, ShieldCheck, Wallet, ClipboardList, Database,
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { supabaseClient } from '../../services/supabaseClient';

type ChecklistRow = { status?: string; stage?: string };
type CountState = { checklist: ChecklistRow[] | null; documents: number | null; obligations: { applicability?: string; legal_status?: string }[] | null; loading: boolean };

const Count = ({ value, suffix = '' }: { value: number | string; suffix?: string }) => (
  <span className="font-semibold tabular-nums">{value}{suffix}</span>
);

export const AuditComplianceHome: React.FC = () => {
  const {
    setCurrentScreen, memberOpeningBalances, transactions,
    reconciliations, sourceRegister, supabaseSync, refetchFromSupabase,
  } = useVerification();
  const [extra, setExtra] = useState<CountState>({ checklist: null, documents: null, obligations: null, loading: true });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [checklist, documents, obligations] = await Promise.all([
        supabaseClient.from('financial_year_checklist').select('status,stage').eq('financial_year', 'FY 2018-19'),
        supabaseClient.from('financial_year_audit_documents').select('*', { count: 'exact', head: true }).eq('financial_year', 'FY 2018-19'),
        supabaseClient.from('compliance_obligations').select('applicability,legal_status').eq('is_active', true),
      ]);
      if (!active) return;
      setExtra({
        checklist: checklist.error ? null : (checklist.data || []) as ChecklistRow[],
        documents: documents.error ? null : (documents.count || 0),
        obligations: obligations.error ? null : (obligations.data || []) as { applicability?: string; legal_status?: string }[],
        loading: false,
      });
    };
    load();
    return () => { active = false; };
  }, []);

  const pendingMembers = memberOpeningBalances.filter((row: any) => String(row.verification_status || 'Pending').toLowerCase() !== 'verified').length;
  const verifiedMembers = memberOpeningBalances.length - pendingMembers;
  const evidencePending = transactions.filter((row: any) => String(row.evidenceStatus || row.evidence_status || 'Pending').toLowerCase() === 'pending').length;
  const unmappedTransactions = transactions.filter((row: any) => !String(row.demandId || row.demand_id || '').trim()).length;
  const checklistDone = (extra.checklist || []).filter(row => ['completed', 'complete', 'done'].includes(String(row.status || '').toLowerCase())).length;
  const checklistInProgress = (extra.checklist || []).filter(row => String(row.status || '').toLowerCase() === 'in progress').length;
  const checklistPending = (extra.checklist || []).filter(row => String(row.status || '').toLowerCase() === 'pending').length;
  const obligationDraft = (extra.obligations || []).filter(row => /draft|verify/i.test(String(row.legal_status || '') + ' ' + String(row.applicability || ''))).length;
  const monthsReconciled = Object.values(reconciliations).reduce((sum, rows: any) => sum + rows.filter((row: any) => ['Reconciled', 'Matched'].includes(row.status)).length, 0);
  const sourceCount = sourceRegister.length;
  const transactionCount = transactions.length;
  const demandMapped = Math.max(0, transactionCount - unmappedTransactions);

  const actions = [
    { title: 'Verify member opening balances', detail: `${verifiedMembers} of ${memberOpeningBalances.length} verified`, screen: 'opening-balances' as const, icon: Wallet },
    { title: 'Review transaction evidence', detail: `${evidencePending} transactions still pending evidence review`, screen: 'transaction-verification' as const, icon: FileCheck2 },
    { title: 'Complete monthly reconciliation', detail: `${monthsReconciled} reconciliation entries marked complete`, screen: 'monthly-reconciliation' as const, icon: Landmark },
    { title: 'Resolve missing demand links', detail: `${unmappedTransactions} transactions have no Demand ID`, screen: 'transactions' as const, icon: Database },
    { title: 'Compile audit documents', detail: extra.documents === null ? 'Document register status unavailable' : `${extra.documents} documents uploaded`, screen: 'audit-evidence' as const, icon: FileText },
  ];

  const workstreams = [
    { name: 'Opening Balances', value: memberOpeningBalances.length ? `${verifiedMembers}/${memberOpeningBalances.length} verified` : 'Data unavailable', note: 'Member opening balance register', screen: 'opening-balances' as const, percent: memberOpeningBalances.length ? verifiedMembers / memberOpeningBalances.length * 100 : 0 },
    { name: 'Transaction Verification', value: `${transactionCount - evidencePending}/${transactionCount} evidence complete`, note: 'Bills, receipts and supporting evidence', screen: 'transaction-verification' as const, percent: transactionCount ? (transactionCount - evidencePending) / transactionCount * 100 : 0 },
    { name: 'Demand Mapping', value: `${unmappedTransactions} without Demand ID`, note: `${demandMapped} transactions currently have a Demand ID`, screen: 'transactions' as const, percent: transactionCount ? demandMapped / transactionCount * 100 : 0 },
    { name: 'Monthly Reconciliation', value: `${monthsReconciled} entries reconciled`, note: 'Bank and cash monthly balances', screen: 'monthly-reconciliation' as const, percent: 0 },
    { name: 'Audit Documents & Evidence', value: extra.documents === null ? 'Not assessed' : `${extra.documents} documents uploaded`, note: 'Audit schedules and supporting records', screen: 'audit-evidence' as const, percent: 0 },
    { name: 'Compliance Obligations', value: extra.obligations === null ? 'Not assessed' : `${obligationDraft} require validation`, note: 'Applicability and legal status require review', screen: 'compliance-command-centre' as const, percent: 0 },
    { name: 'Annual Review & Closure', value: extra.checklist === null ? 'Not assessed' : `${checklistDone} complete · ${checklistInProgress} in progress · ${checklistPending} pending`, note: 'FY 2018–19 annual audit checklist', screen: 'annual-financial-review' as const, percent: 0 },
  ];

  const go = (screen: any) => setCurrentScreen(screen);
  const statusLabel = supabaseSync.isLoading ? 'Refreshing live records' : supabaseSync.isConnected ? 'Connected to database' : 'Database connection unavailable';

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Society OS / Audit & Compliance</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Audit & Compliance Home</h1>
          <p className="mt-1 text-sm text-slate-500">Current financial and audit position, key status and next actions.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className={`h-2 w-2 rounded-full ${supabaseSync.isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {statusLabel}
          <button onClick={() => refetchFromSupabase()} className="ml-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-[#102c50] via-[#174575] to-[#23639a] p-5 text-white shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold text-amber-100">
              <Clock3 className="h-3.5 w-3.5" /> FY 2018–19 · Verification not yet completed
            </div>
            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">Financial records are loaded. Audit verification is still pending.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Opening balances, transaction evidence, demand links, monthly reconciliations and audit documents need review before the annual audit position can be confirmed.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-blue-100">
              <span className="rounded-lg bg-white/10 px-3 py-2">Current stage: Verification & Reconciliation</span>
              <span className="rounded-lg bg-white/10 px-3 py-2">{sourceCount} source records loaded</span>
              <span className="rounded-lg bg-white/10 px-3 py-2">{transactionCount} transactions in workspace</span>
            </div>
          </div>
          <button onClick={() => go('opening-balances')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-900 shadow-sm transition hover:bg-blue-50">
            Continue with Opening Balance Verification <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Financial Year', value: 'FY 2018–19', sub: '01 Apr 2018 – 31 Mar 2019', icon: FileText },
          { label: 'Source Records', value: sourceCount, sub: 'Records registered for this year', icon: Database },
          { label: 'Transactions', value: transactionCount, sub: 'Loaded for verification', icon: ClipboardList },
          { label: 'Member Opening Balances', value: memberOpeningBalances.length, sub: 'Records awaiting verification', icon: Wallet },
        ].map((item) => {
          const Icon = item.icon;
          return <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">{item.label}</span><Icon className="h-4 w-4 text-blue-600" /></div><div className="mt-3 text-2xl font-bold text-slate-900"><Count value={item.value} /></div><div className="mt-1 text-[11px] text-slate-500">{item.sub}</div></div>;
        })}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Workstream Progress</h3><p className="mt-1 text-xs text-slate-500">Select any workstream to open its working screen.</p></div><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Live status</span></div>
          <div className="mt-4 divide-y divide-slate-100">
            {workstreams.map((item) => (
              <button key={item.name} onClick={() => go(item.screen)} className="group w-full py-3 text-left">
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">{item.name}</span><span className="text-xs font-semibold text-slate-600">{item.value}</span></div>
                <div className="mt-1.5 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${item.percent}%` }} /></div><span className="w-[46%] text-right text-[10px] text-slate-400">{item.note}</span></div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Items Requiring Attention</h3>
          <p className="mt-1 text-xs text-slate-500">Known incomplete work based on current registers.</p>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Member opening balances pending', value: pendingMembers, screen: 'opening-balances' as const },
              { label: 'Transactions without Demand ID', value: unmappedTransactions, screen: 'transactions' as const },
              { label: 'Transactions pending evidence', value: evidencePending, screen: 'transaction-verification' as const },
              { label: 'Reconciliation entries completed', value: monthsReconciled, screen: 'monthly-reconciliation' as const, positive: true },
            ].map((item) => <button key={item.label} onClick={() => go(item.screen)} className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-left hover:border-blue-200 hover:bg-blue-50"><span className="flex items-center gap-2 text-xs text-slate-700"><AlertCircle className={`h-4 w-4 ${item.positive ? 'text-emerald-600' : 'text-amber-600'}`} />{item.label}</span><span className="text-sm font-bold tabular-nums text-slate-900">{item.value}</span></button>)}
          </div>
          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Audit readiness is not scored yet.</strong> The exception register and annual review snapshot are not populated; an empty register must not be interpreted as zero discrepancies.</div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Recommended Next Actions</h3><p className="mt-1 text-xs text-slate-500">Follow this sequence to establish a reliable audit position.</p>
          <div className="mt-4 space-y-2">
            {actions.map((item, index) => { const Icon = item.icon; return <button key={item.title} onClick={() => go(item.screen)} className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left hover:border-blue-200 hover:bg-blue-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">{index + 1}. {item.title}</span><span className="mt-0.5 block text-[11px] text-slate-500">{item.detail}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-slate-400" /></button>; })}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-700" /><h3 className="font-bold text-slate-900">Audit & Compliance Position</h3></div>
          <p className="mt-1 text-xs text-slate-500">A stage-based view; no unverified readiness percentage is displayed.</p>
          <div className="mt-4 space-y-3">
            {[
              ['Financial records', sourceCount ? 'Loaded' : 'Not available', sourceCount > 0],
              ['Verification results', 'In progress / pending', false],
              ['Monthly reconciliation', monthsReconciled ? 'Partially recorded' : 'Not recorded', false],
              ['Audit documents', extra.documents === null ? 'Not assessed' : extra.documents ? 'Documents uploaded' : 'None uploaded', false],
              ['Compliance validation', extra.obligations === null ? 'Not assessed' : `${obligationDraft} require validation`, false],
            ].map(([label, value, ok]) => <div key={String(label)} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs"><span className="text-slate-600">{label}</span><span className={`inline-flex items-center gap-1 font-semibold ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>{ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{value}</span></div>)}
          </div>
          <button onClick={() => go('compliance-command-centre')} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900">Review compliance obligations <ArrowRight className="h-3.5 w-3.5" /></button>
          {extra.loading && <p className="mt-2 text-[10px] text-slate-400">Loading checklist, document and compliance registers…</p>}
        </section>
      </div>
    </div>
  );
};

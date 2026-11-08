import React, { useEffect, useState } from 'react';
import {
  ArrowRight, AlertCircle, CheckCircle2, Clock3, FileCheck2, FileText,
  Landmark, RefreshCw, ShieldCheck, Wallet, ClipboardList, Database, Link2,
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { supabaseClient } from '../../services/supabaseClient';
import { useSocietyAccess } from '../../context/SocietyAccessContext';

type AuditSummary = {
  source_records: number;
  transactions: number;
  evidence_complete: number;
  transactions_unmapped: number;
  opening_balance_records: number;
  opening_balances_verified: number;
  checklist_total: number;
  checklist_done: number;
  checklist_in_progress: number;
  checklist_pending: number;
  audit_documents: number;
  compliance_to_verify: number;
  available_financial_years: string[];
};

type DashboardData = { loading: boolean; error: string | null; summary: AuditSummary | null };
const initialData: DashboardData = { loading: true, error: null, summary: null };

export const AuditComplianceHome: React.FC = () => {
  const { setCurrentScreen, reconciliations } = useVerification();
  const { activeSociety } = useSocietyAccess();
  const [data, setData] = useState<DashboardData>(initialData);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('FY 2018-19');
  const [availableFinancialYears, setAvailableFinancialYears] = useState<string[]>(['FY 2018-19']);

  const loadDashboard = async () => {
    const societyId = activeSociety?.society_id;
    if (!societyId) {
      setData({ loading: false, error: 'No active society is selected.', summary: null });
      return;
    }
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { data: result, error } = await supabaseClient.rpc('get_audit_home_summary', {
        p_society_id: societyId,
        p_financial_year: selectedFinancialYear,
      });
      if (error) throw error;
      const summary = result as unknown as AuditSummary;
      if (!summary || typeof summary.transactions !== 'number') throw new Error('The audit summary returned an invalid response.');
      setData({ loading: false, error: null, summary });
      const years = Array.isArray(summary.available_financial_years) ? summary.available_financial_years : [];
      if (years.length) {
        setAvailableFinancialYears(years);
        if (!years.includes(selectedFinancialYear) && years.includes('FY 2018-19')) setSelectedFinancialYear('FY 2018-19');
      }
    } catch (error) {
      setData({ loading: false, error: error instanceof Error ? error.message : 'Unable to load audit summary.', summary: null });
    }
  };

  useEffect(() => { void loadDashboard(); }, [activeSociety?.society_id, selectedFinancialYear]);

  const summary = data.summary;
  const verifiedMembers = summary?.opening_balances_verified ?? 0;
  const pendingMembers = summary ? summary.opening_balance_records - summary.opening_balances_verified : 0;
  const transactionsLoaded = summary !== null;
  const evidenceComplete = summary?.evidence_complete ?? 0;
  const evidencePending = summary ? summary.transactions - summary.evidence_complete : 0;
  const unmapped = summary?.transactions_unmapped ?? 0;
  const checklistDone = summary?.checklist_done ?? 0;
  const checklistProgress = summary?.checklist_in_progress ?? 0;
  const checklistPending = summary?.checklist_pending ?? 0;
  const complianceToVerify = summary?.compliance_to_verify ?? 0;
  const reconciled = Object.values(reconciliations).reduce((sum, rows: any) => sum + rows.filter((row: any) => ['Reconciled', 'Matched'].includes(row.status)).length, 0);
  const totalTransactions = summary?.transactions ?? 0;
  const loaded = !data.loading;
  const go = (screen: any) => setCurrentScreen(screen);

  const workstreams = [
    { title: 'Opening Balances', value: !loaded ? 'Loading…' : summary ? `${verifiedMembers}/${summary.opening_balance_records} verified` : 'Unavailable', sub: 'Member opening balance register', pct: summary?.opening_balance_records ? verifiedMembers / summary.opening_balance_records * 100 : 0, screen: 'opening-balances' },
    { title: 'Transaction Verification', value: !loaded ? 'Loading…' : transactionsLoaded ? `${evidenceComplete}/${totalTransactions} evidence complete` : 'Unavailable', sub: 'Bills, receipts and supporting evidence', pct: totalTransactions ? evidenceComplete / totalTransactions * 100 : 0, screen: 'transaction-verification' },
    { title: 'Demand Mapping & Allocation', value: !loaded ? 'Loading…' : transactionsLoaded ? `${totalTransactions - unmapped}/${totalTransactions} mapped · ${unmapped} missing` : 'Unavailable', sub: 'Link receipts and payments to demands', pct: totalTransactions ? (totalTransactions - unmapped) / totalTransactions * 100 : 0, screen: 'transactions' },
    { title: 'Monthly Reconciliation', value: `${reconciled} entries reconciled`, sub: 'Bank and cash monthly balances', pct: 0, screen: 'monthly-reconciliation' },
    { title: 'Audit Documents & Evidence', value: !loaded ? 'Loading…' : summary ? `${summary.audit_documents} uploaded` : 'Unavailable', sub: 'Audit schedules and supporting records', pct: 0, screen: 'audit-evidence' },
    { title: 'Compliance Obligations', value: !loaded ? 'Loading…' : summary ? `${complianceToVerify} require validation` : 'Unavailable', sub: 'Applicability and legal status require review', pct: 0, screen: 'compliance-command-centre' },
    { title: 'Annual Review & Closure', value: !loaded ? 'Loading…' : summary ? `${checklistDone} done · ${checklistProgress} in progress · ${checklistPending} pending` : 'Unavailable', sub: `${selectedFinancialYear} annual audit checklist`, pct: 0, screen: 'annual-financial-review' },
  ];

  const actions = [
    { title: 'Verify member opening balances', detail: loaded ? (summary ? `${pendingMembers} of ${summary.opening_balance_records} pending` : 'Opening balance summary unavailable') : 'Opening balance data loading', screen: 'opening-balances', icon: Wallet },
    { title: 'Review transaction evidence', detail: !loaded ? 'Transaction data loading' : transactionsLoaded ? `${evidencePending} transactions pending` : 'Transaction summary unavailable', screen: 'transaction-verification', icon: FileCheck2 },
    { title: 'Complete monthly bank and cash reconciliation', detail: `${reconciled} reconciliation entries completed`, screen: 'monthly-reconciliation', icon: Landmark },
    { title: 'Resolve transactions without Demand ID', detail: !loaded ? 'Demand mapping data loading' : transactionsLoaded ? `${unmapped} transactions need mapping` : 'Demand mapping summary unavailable', screen: 'transactions', icon: Link2 },
    { title: 'Upload audit reports and supporting documents', detail: !loaded ? 'Document register loading' : summary ? `${summary.audit_documents} documents uploaded` : 'Document summary unavailable', screen: 'audit-evidence', icon: FileText },
  ];

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-3 pb-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600">Society OS / Audit & Compliance</div>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900">Audit & Compliance Home</h1>
          <p className="text-xs text-slate-500">Current financial and audit position, key status and next actions · {selectedFinancialYear}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-500">
          <label className="flex items-center gap-1.5 font-medium text-slate-600">Financial year <select value={selectedFinancialYear} onChange={event => setSelectedFinancialYear(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-400">{availableFinancialYears.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
          <span className={`h-2 w-2 rounded-full ${data.loading ? 'bg-amber-500' : data.error ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          {data.loading ? 'Loading audit summary' : data.error ? 'Audit summary unavailable' : 'Audit summary loaded'}
          <button onClick={() => { void loadDashboard(); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-3 w-3" /> Refresh</button>
        </div>
      </div>

      {data.error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">Unable to load some live records: {data.error}. Please refresh or check database access.</div>}

      <section className="grid grid-cols-1 gap-3 2xl:grid-cols-[1.35fr_1fr]">
        <div className="flex min-h-[178px] flex-col justify-between rounded-xl bg-gradient-to-r from-[#172e55] to-[#426b9f] p-5 text-white shadow-sm">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold text-amber-100"><Clock3 className="h-3 w-3" /> {selectedFinancialYear} · Verification not yet completed</span>
            <h2 className="mt-3 text-xl font-bold leading-tight sm:text-2xl">Financial records are loaded. Audit verification is still pending.</h2>
            <p className="mt-1.5 max-w-3xl text-xs leading-5 text-blue-100">Opening balances, transaction evidence, demand links, monthly reconciliations and audit documents need review before the annual audit position can be confirmed.</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
            <span className="rounded-md bg-white/10 px-2.5 py-1.5">Current stage: Verification & Reconciliation</span>
            <span className="rounded-md bg-white/10 px-2.5 py-1.5">{data.loading ? '…' : summary ? summary.source_records : 'Unavailable'} source records loaded</span>
            <span className="rounded-md bg-white/10 px-2.5 py-1.5">{data.loading ? '…' : summary ? totalTransactions : 'Unavailable'} transactions in workspace</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Financial Snapshot</h3><span className="text-[10px] text-slate-400">From loaded records</span></div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Source Records', value: data.loading ? '—' : summary ? summary.source_records : 'Unavailable', icon: Database, tint: 'bg-emerald-50 text-emerald-700' },
              { label: 'Transactions', value: data.loading ? '—' : summary ? totalTransactions : 'Unavailable', icon: ClipboardList, tint: 'bg-blue-50 text-blue-700' },
              { label: 'Member Opening Balances', value: data.loading ? '—' : summary ? summary.opening_balance_records : 'Unavailable', icon: Wallet, tint: 'bg-violet-50 text-violet-700' },
              { label: 'Evidence Pending', value: data.loading ? '—' : transactionsLoaded ? evidencePending : 'Unavailable', icon: FileCheck2, tint: 'bg-amber-50 text-amber-700' },
            ].map(item => { const Icon = item.icon; return <div key={item.label} className="flex items-center gap-2.5 rounded-lg border border-slate-100 p-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.tint}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-[10px] text-slate-500">{item.label}</span><span className="block text-lg font-bold leading-tight text-slate-900 tabular-nums">{item.value}</span></span></div>; })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.05fr_1.2fr_0.95fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2"><h3 className="text-sm font-bold text-slate-900">Workstream Progress</h3><p className="text-[10px] text-slate-500">Select a stage to open its working screen.</p></div>
          <div className="divide-y divide-slate-100">
            {workstreams.map(item => <button key={item.title} onClick={() => go(item.screen)} className="w-full py-2 text-left hover:bg-slate-50">
              <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-slate-800">{item.title}</span><span className="shrink-0 text-[10px] font-semibold text-slate-600">{item.value}</span></div>
              <div className="mt-1 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${item.pct}%` }} /></div><span className="max-w-[48%] truncate text-right text-[9px] text-slate-400">{item.sub}</span></div>
            </button>)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Items Requiring Attention</h3><p className="text-[10px] text-slate-500">Known incomplete work from the live registers.</p>
          <div className="mt-3 space-y-2">
            {[
              { label: 'Verify opening balances', value: data.loading ? '—' : pendingMembers, sub: 'Member records pending', screen: 'opening-balances' },
              { label: 'Review transaction evidence', value: data.loading ? '—' : transactionsLoaded ? evidencePending : 'Unavailable', sub: 'Transactions awaiting review', screen: 'transaction-verification' },
              { label: 'Map transactions to demands', value: data.loading ? '—' : transactionsLoaded ? unmapped : 'Unavailable', sub: 'Transactions without Demand ID', screen: 'transactions' },
              { label: 'Complete monthly reconciliation', value: reconciled, sub: 'Reconciliation entries completed', screen: 'monthly-reconciliation' },
              { label: 'Validate compliance obligations', value: !summary ? 'Unavailable' : complianceToVerify, sub: 'Applicability or legal status to verify', screen: 'compliance-command-centre' },
            ].map(item => <button key={item.label} onClick={() => go(item.screen)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left hover:border-blue-200 hover:bg-blue-50"><span className="flex min-w-0 items-center gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" /><span className="min-w-0"><span className="block text-[10px] font-semibold text-slate-700">{item.label}</span><span className="block text-[9px] text-slate-400">{item.sub}</span></span></span><span className="text-sm font-bold tabular-nums text-slate-900">{item.value}</span></button>)}
          </div>
          <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-2.5 text-[10px] leading-4 text-amber-900"><strong>Readiness is not scored.</strong> The exception register and annual review snapshot are not populated; empty registers do not prove there are no discrepancies.</div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-700" /><h3 className="text-sm font-bold text-slate-900">Audit & Compliance Position</h3></div>
            <p className="mt-1 text-[10px] text-slate-500">Stage-based position; no unverified readiness score.</p>
            <div className="mt-3 space-y-2">
              {[
                ['Financial records', data.loading ? 'Loading' : !summary ? 'Unavailable' : summary.source_records ? 'Loaded' : 'No source records', Boolean(summary && summary.source_records > 0)],
                ['Verification results', data.loading ? 'Loading' : 'Pending review', false],
                ['Monthly reconciliation', reconciled ? 'Partially recorded' : 'Not recorded', false],
                ['Audit documents', !summary ? 'Unavailable' : summary.audit_documents ? 'Uploaded' : 'None uploaded', false],
                ['Compliance validation', !summary ? 'Unavailable' : `${complianceToVerify} to verify`, false],
              ].map(([label, value, ok]) => <div key={String(label)} className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5 text-[10px]"><span className="text-slate-600">{label}</span><span className={`shrink-0 font-semibold ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>{ok ? <CheckCircle2 className="inline h-3 w-3" /> : <Clock3 className="inline h-3 w-3" />} {String(value)}</span></div>)}
            </div>
            <button onClick={() => go('compliance-command-centre')} className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700">Review compliance obligations <ArrowRight className="h-3 w-3" /></button>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Recommended Next Actions</h3><p className="text-[10px] text-slate-500">Follow the sequence to establish the audit position.</p>
            <div className="mt-2 space-y-1.5">
              {actions.map((item, index) => { const Icon = item.icon; return <button key={item.title} onClick={() => go(item.screen)} className="flex w-full items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-2 text-left hover:border-blue-200 hover:bg-blue-50"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700"><Icon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold text-slate-800">{index + 1}. {item.title}</span><span className="block text-[9px] text-slate-500">{item.detail}</span></span><ArrowRight className="h-3 w-3 shrink-0 text-slate-400" /></button>; })}
            </div>
            <button onClick={() => go('opening-balances')} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-blue-700">Continue with Opening Balance Verification <ArrowRight className="h-3 w-3" /></button>
          </div>
        </div>
      </section>
    </div>
  );
};

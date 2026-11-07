import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, FileText, LockKeyhole, RefreshCw, Upload, Wrench } from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';

type Row = Record<string, any>;
type DocType = 'Statutory Audit Report' | 'Audited Financial Statements' | 'AGM Report';
const DOCS: DocType[] = ['Statutory Audit Report', 'Audited Financial Statements', 'AGM Report'];
const FY_DATES = (fy: string) => {
  const m = fy.match(/(20\\d{2})\\s*[-–/]\\s*(\\d{2,4})/);
  if (!m) return { start: '2018-04-01', end: '2019-03-31' };
  const y = Number(m[1]), ey = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  return { start: `${y}-04-01`, end: `${ey}-03-31` };
};
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);
const num = (v: any) => Number(v || 0);
const monthRank = (v: string) => {
  const m = String(v || '').match(/(Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Jan|Feb|Mar)[ -](20\\d{2})/i);
  if (!m) return -1;
  const idx = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'].indexOf(m[1][0].toUpperCase() + m[1].slice(1,3).toLowerCase());
  return Number(m[2]) * 12 + idx;
};

export const AnnualAuditAccountClosure: React.FC = () => {
  const [fy, setFy] = useState('FY 2018-19');
  const [record, setRecord] = useState<Row | null>(null);
  const [docs, setDocs] = useState<Row[]>([]);
  const [transactions, setTransactions] = useState<Row[]>([]);
  const [bankRows, setBankRows] = useState<Row[]>([]);
  const [auditForm, setAuditForm] = useState({ auditor_name: '', auditor_firm: '', audit_completion_date: '', agm_meeting_date: '' });
  const [audited, setAudited] = useState({ opening_balance: '', total_receipts: '', total_payments: '', closing_balance: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rectificationOpen, setRectificationOpen] = useState(false);
  const [rectificationNote, setRectificationNote] = useState('');

  const dates = useMemo(() => FY_DATES(fy), [fy]);
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const db: any = supabaseClient;
      const [r, d, t, b] = await Promise.all([
        db.from('financial_year_audit_closures').select('*').eq('financial_year', fy).maybeSingle(),
        db.from('financial_year_audit_documents').select('*').eq('financial_year', fy).order('uploaded_at', { ascending: false }),
        db.from('transactions').select('transaction_date,transaction_type,type,amount').gte('transaction_date', dates.start).lte('transaction_date', dates.end).limit(10000),
        db.from('account_monthly_balance').select('account_id,month,opening_balance,closing_balance').eq('financial_year', fy)
      ]);
      for (const x of [r,d,t,b]) if (x.error) throw x.error;
      setRecord(r.data || null); setDocs(d.data || []); setTransactions(t.data || []); setBankRows(b.data || []);
      if (r.data) {
        setAuditForm({ auditor_name: r.data.auditor_name || '', auditor_firm: r.data.auditor_firm || '', audit_completion_date: r.data.audit_completion_date || '', agm_meeting_date: r.data.agm_meeting_date || '' });
        setAudited({
          opening_balance: r.data.audited_figures?.opening_balance ?? '',
          total_receipts: r.data.audited_figures?.total_receipts ?? '',
          total_payments: r.data.audited_figures?.total_payments ?? '',
          closing_balance: r.data.audited_figures?.closing_balance ?? ''
        });
      } else {
        setAuditForm({ auditor_name: '', auditor_firm: '', audit_completion_date: '', agm_meeting_date: '' });
        setAudited({ opening_balance: '', total_receipts: '', total_payments: '', closing_balance: '' });
      }
    } catch (e: any) { setError(e.message || 'Unable to load annual audit records.'); }
    finally { setBusy(false); }
  }, [fy, dates.start, dates.end]);

  useEffect(() => { void load(); }, [load]);

  const systemFigures = useMemo(() => {
    const receipts = transactions.filter(t => String(t.transaction_type || t.type || '').toLowerCase() === 'receipt').reduce((s,t) => s + num(t.amount), 0);
    const payments = transactions.filter(t => String(t.transaction_type || t.type || '').toLowerCase() === 'payment').reduce((s,t) => s + num(t.amount), 0);
    const byAccount = new Map<string, Row[]>();
    bankRows.forEach(r => byAccount.set(String(r.account_id || 'unknown'), [...(byAccount.get(String(r.account_id || 'unknown')) || []), r]));
    const latest = [...byAccount.values()].map(rows => [...rows].sort((a,b) => monthRank(String(b.month)) - monthRank(String(a.month)))[0]).filter(Boolean);
    const earliest = [...byAccount.values()].map(rows => [...rows].sort((a,b) => monthRank(String(a.month)) - monthRank(String(b.month)))[0]).filter(Boolean);
    return {
      opening_balance: earliest.reduce((s,r) => s + num(r.opening_balance), 0),
      total_receipts: receipts,
      total_payments: payments,
      closing_balance: latest.reduce((s,r) => s + num(r.closing_balance), 0)
    };
  }, [transactions, bankRows]);

  const comparisons = useMemo(() => ([
    { key: 'opening_balance', label: 'Opening cash / bank balance' },
    { key: 'total_receipts', label: 'Total receipts' },
    { key: 'total_payments', label: 'Total payments' },
    { key: 'closing_balance', label: 'Closing cash / bank balance' }
  ]).map(x => ({ ...x, system: systemFigures[x.key as keyof typeof systemFigures], audited: audited[x.key as keyof typeof audited] === '' ? null : num(audited[x.key as keyof typeof audited]), difference: audited[x.key as keyof typeof audited] === '' ? null : num(systemFigures[x.key as keyof typeof systemFigures]) - num(audited[x.key as keyof typeof audited]) })), [systemFigures, audited]);

  const ensureRecord = async (patch: Row = {}) => {
    const db: any = supabaseClient;
    const payload = { financial_year: fy, period_start: dates.start, period_end: dates.end, ...auditForm, ...patch, updated_at: new Date().toISOString() };
    const { data, error: e } = await db.from('financial_year_audit_closures').upsert(payload, { onConflict: 'financial_year' }).select('*').single();
    if (e) throw e;
    setRecord(data);
    return data;
  };

  const saveAuditCompletion = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (!auditForm.auditor_name.trim() || !auditForm.audit_completion_date) throw new Error('Enter the auditor name and audit completion date.');
      await ensureRecord({ audit_status: 'Completed' });
      setNotice('Statutory audit completion recorded.');
      await load();
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  const uploadDoc = async (type: DocType, file: File) => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!record?.audit_status || record.audit_status !== 'Completed') throw new Error('Record statutory audit completion before uploading the audit pack.');
      const db: any = supabaseClient;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${fy.replace(/[^a-zA-Z0-9-]/g, '_')}/annual-audit/${Date.now()}_${safeName}`;
      const { error: uploadError } = await db.storage.from('audit-evidence').upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
      if (uploadError) throw uploadError;
      const { error: insertError } = await db.from('financial_year_audit_documents').insert({ financial_year: fy, document_type: type, file_name: file.name, file_path: path, mime_type: file.type || null, file_size: file.size, uploaded_at: new Date().toISOString() });
      if (insertError) throw insertError;
      setNotice(`${type} uploaded. Figures must be checked against the signed report before confirmation.`);
      await load();
    } catch (err: any) { setError(err.message || 'Document upload failed.'); } finally { setBusy(false); }
  };

  const saveAuditedFigures = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const required = Object.values(audited);
      if (required.some(v => v === '' || !Number.isFinite(Number(v)))) throw new Error('Enter all four audited figures from the signed financial statements.');
      const hasAllDocs = DOCS.every(type => docs.some(d => d.document_type === type));
      if (!hasAllDocs) throw new Error('Upload the statutory audit report, audited financial statements and AGM report first.');
      const diffs = comparisons.filter(c => c.difference !== null && Math.abs(c.difference) > 0.01);
      const payload = { audited_figures: Object.fromEntries(Object.entries(audited).map(([k,v]) => [k, Number(v)])), system_figures: systemFigures, balances_confirmed: diffs.length === 0, balance_comparison: comparisons };
      await ensureRecord(payload);
      if (diffs.length) setNotice(`${diffs.length} difference(s) found. Rectify the relevant records and compare again before confirming.`);
      else setNotice('All four balances match. You can proceed to close the financial year.');
      await load();
    } catch (err: any) { setError(err.message || 'Unable to save audited figures.'); } finally { setBusy(false); }
  };

  const closeFinancialYear = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!record?.balances_confirmed) throw new Error('Confirm all audited balances before closing the financial year.');
      const db: any = supabaseClient;
      const snapshot = {
        financial_year: fy, period: dates, audit: { auditor_name: record.auditor_name, auditor_firm: record.auditor_firm, audit_completion_date: record.audit_completion_date, agm_meeting_date: record.agm_meeting_date },
        documents: docs.map(d => ({ document_type: d.document_type, file_name: d.file_name, file_path: d.file_path, uploaded_at: d.uploaded_at })),
        system_figures: systemFigures, audited_figures: record.audited_figures, balance_comparison: comparisons,
        source_counts: { transactions: transactions.length, account_monthly_balances: bankRows.length }, closed_at: new Date().toISOString()
      };
      const { data, error: e } = await db.from('financial_year_audit_closures').update({ status: 'Closed', closing_snapshot: snapshot, closed_at: new Date().toISOString(), closed_by: 'Current user' }).eq('financial_year', fy).eq('balances_confirmed', true).select('*').single();
      if (e) throw e;
      setRecord(data);
      setNotice('Financial year closed. Closing balances and supporting document references have been saved.');
    } catch (err: any) { setError(err.message || 'Financial year closure failed.'); } finally { setBusy(false); }
  };

  const openDocument = async (doc: Row) => {
    const db: any = supabaseClient;
    const { data, error: e } = await db.storage.from('audit-evidence').createSignedUrl(doc.file_path, 300);
    if (e) { setError(e.message); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const step = record?.status === 'Closed' ? 4 : record?.balances_confirmed ? 3 : docs.length >= 3 ? 2 : record?.audit_status === 'Completed' ? 1 : 0;
  const pendingDiffs = comparisons.filter(c => c.difference !== null && Math.abs(c.difference) > 0.01);
  const latestDocs = DOCS.map(type => docs.find(d => d.document_type === type)).filter(Boolean) as Row[];

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">Compliance & Governance</div><h1 className="text-2xl font-bold mt-1">Annual Audit & Account Closure</h1><p className="text-sm text-slate-500 mt-1">Four simple steps to record the statutory audit, confirm balances and close the financial year.</p></div>
      <div className="flex items-center gap-2"><label className="text-xs text-slate-600">Financial Year</label><select value={fy} onChange={e=>setFy(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white"><option>FY 2018-19</option><option>FY 2019-20</option><option>FY 2020-21</option><option>FY 2021-22</option><option>FY 2022-23</option><option>FY 2023-24</option><option>FY 2024-25</option><option>FY 2025-26</option></select><button onClick={()=>void load()} className="border rounded-lg p-2" title="Refresh"><RefreshCw className="w-4 h-4"/></button></div>
    </div>
    {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {['Record Audit Completion','Upload Audit Reports','Confirm Balances','Close & Freeze FY'].map((label,i)=><div key={label} className={`rounded-xl border p-3 bg-white ${step>i?'border-emerald-300':step===i?'border-blue-400':'border-slate-200'}`}><div className="text-[10px] text-slate-500">STEP {i+1}</div><div className="text-xs font-semibold mt-1">{label}</div><div className="text-[11px] mt-1">{step>i?<span className="text-emerald-700">Completed</span>:step===i?<span className="text-blue-700">Current step</span>:<span className="text-slate-400">Pending</span>}</div></div>)}
    </div>
    <div className="grid xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,.75fr)] gap-4">
      <div className="space-y-4">
        <section className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-3"><span className="rounded-full bg-blue-600 text-white w-7 h-7 grid place-items-center font-bold">1</span><div><h2 className="font-semibold">Record statutory audit completion</h2><p className="text-xs text-slate-500">Record the actual audit completion details. Do not backdate the entry date.</p></div></div>
          <form onSubmit={saveAuditCompletion} className="grid md:grid-cols-2 gap-3">
            <label className="text-xs">Auditor name<input value={auditForm.auditor_name} onChange={e=>setAuditForm({...auditForm,auditor_name:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" required/></label>
            <label className="text-xs">Audit firm<input value={auditForm.auditor_firm} onChange={e=>setAuditForm({...auditForm,auditor_firm:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"/></label>
            <label className="text-xs">Audit completion date<input type="date" value={auditForm.audit_completion_date} onChange={e=>setAuditForm({...auditForm,audit_completion_date:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" required/></label>
            <label className="text-xs">AGM meeting date (if held)<input type="date" value={auditForm.agm_meeting_date} onChange={e=>setAuditForm({...auditForm,agm_meeting_date:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"/></label>
            <button disabled={busy} className="md:col-span-2 bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">Save audit completion</button>
          </form>
        </section>
        <section className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-3"><span className="rounded-full bg-blue-600 text-white w-7 h-7 grid place-items-center font-bold">2</span><div><h2 className="font-semibold">Upload audit reports</h2><p className="text-xs text-slate-500">Upload signed reports. The uploaded figures below must be checked against the source pages.</p></div></div>
          <div className="grid md:grid-cols-3 gap-3">{DOCS.map(type=>{const doc=docs.find(d=>d.document_type===type);return <div key={type} className="border rounded-lg p-3"><div className="text-xs font-semibold min-h-9">{type}</div>{doc?<><div className="text-[11px] text-emerald-700 mt-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/>Uploaded</div><div className="text-[11px] text-slate-500 truncate mt-1">{doc.file_name}</div><button onClick={()=>void openDocument(doc)} className="text-xs text-blue-700 underline mt-2">Open document</button></>:<label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-xs text-blue-700"><Upload className="w-4 h-4"/>Upload PDF<input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" disabled={busy||record?.audit_status!=='Completed'} onChange={e=>{const f=e.target.files?.[0];if(f)void uploadDoc(type,f);e.currentTarget.value='';}}/></label>}</div>})}</div>
          <p className="text-[11px] text-amber-700 mt-3">Document text extraction is not yet connected. Enter the audited figures in Step 3 after checking the signed statements; the system will calculate the differences.</p>
        </section>
        <section className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between gap-2 mb-3"><div className="flex items-center gap-2"><span className="rounded-full bg-blue-600 text-white w-7 h-7 grid place-items-center font-bold">3</span><div><h2 className="font-semibold">Confirm financial balances</h2><p className="text-xs text-slate-500">Compare actual Society OS receipts, payments and cash/bank balances with audited statements.</p></div></div><span className={record?.balances_confirmed?'text-xs text-emerald-700 font-semibold':'text-xs text-amber-700'}>{record?.balances_confirmed?'Balances matched':'Confirmation pending'}</span></div>
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-slate-50 text-slate-600"><th className="text-left p-2">Particulars</th><th className="text-right p-2">Society OS</th><th className="text-right p-2">Audited (₹)</th><th className="text-right p-2">Difference</th><th className="p-2">Status</th></tr></thead><tbody>{comparisons.map(c=><tr key={c.key} className="border-t"><td className="p-2 font-medium">{c.label}</td><td className="p-2 text-right">{money(c.system)}</td><td className="p-2 text-right"><input type="number" step="0.01" value={audited[c.key as keyof typeof audited]} onChange={e=>setAudited({...audited,[c.key]:e.target.value})} className="w-32 border rounded px-2 py-1 text-right"/></td><td className="p-2 text-right">{c.difference===null?'—':money(c.difference)}</td><td className="p-2 text-center">{c.difference===null?<span className="text-slate-400">Enter figure</span>:Math.abs(c.difference)<=0.01?<span className="text-emerald-700">Match</span>:<span className="text-amber-700">Review</span>}</td></tr>)}</tbody></table></div>
          <div className="mt-3 flex flex-wrap justify-between items-center gap-2"><span className="text-[11px] text-slate-500">Source: transactions and account-monthly balance records for the selected FY.</span><button onClick={()=>void saveAuditedFigures()} disabled={busy||DOCS.some(t=>!docs.some(d=>d.document_type===t))} className="bg-blue-700 text-white rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-40">Save comparison & confirm if matched</button></div>
          {pendingDiffs.length>0&&<div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800"><AlertTriangle className="inline w-4 h-4 mr-1"/> {pendingDiffs.length} difference(s) need attention. <button onClick={()=>setRectificationOpen(v=>!v)} className="underline font-semibold">Rectification options</button></div>}
          {rectificationOpen&&<div className="mt-3 rounded-lg border p-3"><h3 className="text-sm font-semibold flex items-center gap-2"><Wrench className="w-4 h-4"/>Rectification required?</h3><p className="text-xs text-slate-600 mt-1">Review the underlying transactions in the Transactions Workspace. Do not overwrite imported source rows; use the approved correction workflow and preserve the original entry.</p><textarea value={rectificationNote} onChange={e=>setRectificationNote(e.target.value)} placeholder="Record the difference and affected transaction references" className="mt-2 w-full border rounded-lg p-2 text-xs" rows={2}/><button onClick={()=>{setNotice('Rectification note retained in this screen only. Use the transaction correction workflow to make an approved correction.');}} className="mt-2 border rounded-lg px-3 py-2 text-xs">Record note</button></div>}
        </section>
        <section className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-3"><span className="rounded-full bg-blue-600 text-white w-7 h-7 grid place-items-center font-bold">4</span><div><h2 className="font-semibold">Record completion & close FY</h2><p className="text-xs text-slate-500">Save the confirmed closing balances and supporting evidence as the year-end snapshot.</p></div></div>
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="text-xs text-slate-600">{record?.status==='Closed'?<span className="text-emerald-700 font-semibold">Closed on {new Date(record.closed_at).toLocaleString('en-IN')}</span>:'Financial year is not yet closed.'}</div><button onClick={()=>void closeFinancialYear()} disabled={busy||!record?.balances_confirmed||record?.status==='Closed'} className="bg-slate-900 text-white rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-40"><LockKeyhole className="inline w-4 h-4 mr-1"/>Close & Freeze Financial Year</button></div>
        </section>
      </div>
      <aside className="space-y-3">
        <div className="rounded-xl border bg-white p-4"><h3 className="font-semibold">FY {fy.replace('FY ','')}</h3><div className="text-xs text-slate-500 mt-1">{record?.status==='Closed'?'Closed':'In progress'}</div><div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-600" style={{width:`${Math.round(step/4*100)}%`}}/></div><div className="text-xs text-slate-500 mt-2">{step} of 4 steps completed</div></div>
        <div className="rounded-xl border bg-white p-4"><h3 className="font-semibold">Audit & AGM documents</h3>{DOCS.map(t=><div key={t} className="flex items-center justify-between border-t first:border-0 py-2 text-xs"><span>{t}</span><span className={docs.some(d=>d.document_type===t)?'text-emerald-700':'text-amber-700'}>{docs.some(d=>d.document_type===t)?'Uploaded':'Pending'}</span></div>)}</div>
        <div className="rounded-xl border bg-blue-50 p-4"><h3 className="font-semibold text-sm">After closure</h3><p className="text-xs text-slate-600 mt-2">The application stores the confirmed figures, document references and closure snapshot. A later correction must be recorded as a new approved version; the original snapshot is retained.</p></div>
        <button onClick={()=>void load()} disabled={busy} className="w-full border rounded-lg px-3 py-2 text-xs font-semibold"><RefreshCw className="inline w-4 h-4 mr-1"/>Refresh records</button>
      </aside>
    </div>
    <p className="text-[11px] text-slate-500 flex items-start gap-2"><FileText className="w-4 h-4 shrink-0"/>This workflow is a record and comparison control. It does not replace the appointed auditor's signed report or statutory approvals. Society OS source transactions are not modified by the balance-confirmation step.</p>
  </div>;
};

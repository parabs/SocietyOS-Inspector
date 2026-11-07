import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Eye, FileText, LockKeyhole, MoreVertical, RefreshCw, Upload } from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';
import { APP_CONFIG } from '../../config';

type Row = Record<string, any>;
type ResolutionType = 'Source Correction' | 'Auditor Adjustment' | 'Accepted Explanation';
const FY_DATES = (fy: string) => {
  const m = fy.match(/(20\d{2})\s*[-–/]\s*(\d{2,4})/);
  if (!m) return { start: '2018-04-01', end: '2019-03-31', endExclusive: '2019-04-01' };
  const y = Number(m[1]), ey = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  return { start: `${y}-04-01`, end: `${ey}-03-31`, endExclusive: `${ey}-04-01` };
};
const money = (n: number | null | undefined) => n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n) || 0);
const num = (v: any) => Number(v || 0);
const STEPS = ['Confirm Audit Completion', 'Upload & Verify Documents', 'Confirm Balances & Exceptions', 'Close FY & Record Balances'];

export const AnnualAuditAccountClosure: React.FC = () => {
  const [fy, setFy] = useState('FY 2018-19');
  const [record, setRecord] = useState<Row | null>(null);
  const [docs, setDocs] = useState<Row[]>([]);
  const [accountBalances, setAccountBalances] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [step, setStep] = useState(0);
  const [auditForm, setAuditForm] = useState({ auditor_name: '', auditor_firm: '', audit_completion_date: '', agm_meeting_date: '' });
  const [edited, setEdited] = useState<Record<string, { audited_amount: string; audited_page_reference: string; auditor_document_id: string }>>({});
  const [resolutions, setResolutions] = useState<Record<string, { resolution_type: ResolutionType | ''; resolution_reference: string; resolution_note: string }>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [uploadMode, setUploadMode] = useState<'multiple' | 'combined'>('multiple');

  const dates = useMemo(() => FY_DATES(fy), [fy]);
  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const db: any = supabaseClient;
      const [r, d, b, a] = await Promise.all([
        db.from('financial_year_audit_closures').select('*').eq('financial_year', fy).maybeSingle(),
        db.from('financial_year_audit_documents').select('*').eq('financial_year', fy).order('uploaded_at', { ascending: false }),
        db.from('v_account_financial_year_balance').select('*').eq('financial_year', fy).order('account_name'),
        db.from('financial_year_audit_reconciliations').select('*').eq('financial_year', fy).order('schedule_name').order('line_item')
      ]);
      for (const q of [r,d,b,a]) if (q.error) throw q.error;
      setRecord(r.data || null); setDocs(d.data || []); setAccountBalances(b.data || []); setItems(a.data || []);
      if (r.data) setAuditForm({ auditor_name: r.data.auditor_name || '', auditor_firm: r.data.auditor_firm || '', audit_completion_date: r.data.audit_completion_date || '', agm_meeting_date: r.data.agm_meeting_date || '' });
      else setAuditForm({ auditor_name: '', auditor_firm: '', audit_completion_date: '', agm_meeting_date: '' });
      setEdited(Object.fromEntries((a.data || []).map((x: Row) => [x.reconciliation_key, { audited_amount: x.audited_amount == null ? '' : String(x.audited_amount), audited_page_reference: x.audited_page_reference || '', auditor_document_id: x.auditor_document_id || '' }])));
      setResolutions(Object.fromEntries((a.data || []).map((x: Row) => [x.reconciliation_key, { resolution_type: x.resolution_type || '', resolution_reference: x.resolution_reference || '', resolution_note: x.resolution_note || '' }])));
    } catch (e: any) { setError(e.message || 'Unable to load audit reconciliation records.'); }
    finally { setBusy(false); }
  }, [fy]);

  useEffect(() => { void load(); }, [load]);

  const systemRows = useMemo(() => accountBalances.filter((a: Row) => [a.opening_balance, a.current_fy_receipts, a.current_fy_payments, a.closing_book_balance].some(v => v !== null && v !== undefined && Math.abs(num(v)) > 0.001)).flatMap((a: Row) => {
    const base = { account_id: a.account_id, account_name: a.account_name, account_type: a.account_type, verification_status: a.verification_status };
    return [
      { key: `${a.account_id}:opening`, line: 'Opening balance', system: num(a.opening_balance), report: 'Account-wise Financial Year Balance' },
      { key: `${a.account_id}:receipts`, line: 'Receipts during the year', system: num(a.current_fy_receipts), report: 'Account-wise Financial Year Movement' },
      { key: `${a.account_id}:payments`, line: 'Payments during the year', system: num(a.current_fy_payments), report: 'Account-wise Financial Year Movement' },
      { key: `${a.account_id}:closing`, line: 'Closing book balance', system: num(a.closing_book_balance), report: 'Account-wise Financial Year Balance' }
    ].map(x => ({ ...base, ...x, schedule: 'Cash & Bank Reconciliation' }));
  }), [accountBalances]);

  const saveAuditDetails = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!auditForm.auditor_name.trim() || !auditForm.audit_completion_date) throw new Error('Enter auditor name and actual audit completion date.');
      const db: any = supabaseClient;
      const payload = { financial_year: fy, period_start: dates.start, period_end: dates.end, ...auditForm, agm_meeting_date: auditForm.agm_meeting_date || null, audit_status: 'Completed', updated_at: new Date().toISOString() };
      const { data, error: e } = await db.from('financial_year_audit_closures').upsert(payload, { onConflict: 'financial_year' }).select('*').single();
      if (e) throw e;
      setRecord(data); setNotice('Auditor details saved. Continue to add the signed audit documents.');
      setStep(1);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const uploadDoc = async (name: string, file: File) => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (record?.status === 'Closed') throw new Error('This financial year is closed. Use the approved restatement process.');
      if (!record || record.audit_status !== 'Completed') throw new Error('Save auditor details before uploading documents.');
      if (!name.trim()) throw new Error('Enter a document name before uploading.');
      if (file.size > 25 * 1024 * 1024) throw new Error('Each evidence file must be 25 MB or smaller.');
      const db: any = supabaseClient;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${fy.replace(/[^a-zA-Z0-9-]/g, '_')}/annual-audit/${Date.now()}_${safeName}`;
      const { error: uploadError } = await db.storage.from('audit-evidence').upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
      if (uploadError) throw uploadError;
      const previous = docs.filter(d => (d.document_name || d.document_type) === name.trim());
      const { error: insertError } = await db.from('financial_year_audit_documents').insert({ financial_year: fy, document_type: 'Audit Evidence', document_name: name.trim(), version_no: previous.length ? Math.max(...previous.map(d => Number(d.version_no) || 1)) + 1 : 1, supersedes_document_id: previous[0]?.document_id || null, verification_status: 'Needs Review', observation_count: 0, file_name: file.name, file_path: path, mime_type: file.type || null, file_size: file.size, uploaded_at: new Date().toISOString() });
      if (insertError) throw insertError;
      setDocumentName('');
      setNotice(`${name.trim()} uploaded as a new evidence version. Previous uploads are retained. File contents have not been automatically extracted or verified.`);
      await load();
    } catch (e: any) { setError(e.message || 'Document upload failed.'); }
    finally { setBusy(false); }
  };

  const openDocument = async (doc: Row) => {
    const db: any = supabaseClient;
    const { data, error: e } = await db.storage.from('audit-evidence').createSignedUrl(doc.file_path, 300);
    if (e) { setError(e.message); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const saveComparisonRows = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!docs.length) throw new Error('Upload at least one named audit document before comparing figures.');
      if (!systemRows.length) throw new Error('No account-wise system report rows are available for this financial year. Complete the account balance records first.');
      const db: any = supabaseClient;
      const payload = systemRows.map(x => {
        const current = edited[x.key] || { audited_amount: '', audited_page_reference: '', auditor_document_id: '' };
        const auditedAmount = current.audited_amount.trim() === '' ? null : Number(current.audited_amount);
        if (auditedAmount !== null && !Number.isFinite(auditedAmount)) throw new Error(`Enter a valid audited figure for ${x.account_name} — ${x.line}.`);
        if (auditedAmount !== null && (!current.auditor_document_id || !current.audited_page_reference.trim())) throw new Error(`Select the source audit document and page number for ${x.account_name} — ${x.line}.`);
        if (auditedAmount !== null && (!current.auditor_document_id || !current.audited_page_reference.trim())) throw new Error(`Select the source audit document and page number for ${x.account_name} — ${x.line}.`);
        const difference = auditedAmount === null ? null : Number((x.system - auditedAmount).toFixed(2));
        const matched = difference !== null && Math.abs(difference) <= 0.01;
        const resolution = resolutions[x.key] || { resolution_type: '', resolution_reference: '', resolution_note: '' };
        const prior = items.find(i => i.reconciliation_key === x.key);
        const isResolved = !matched && resolution.resolution_type && resolution.resolution_note.trim() && (resolution.resolution_type === 'Accepted Explanation' || resolution.resolution_reference.trim());
        return {
          financial_year: fy, reconciliation_key: x.key, schedule_name: x.schedule, line_item: `${x.account_name} — ${x.line}`,
          system_report_name: x.report, system_amount: x.system, audited_amount: auditedAmount,
          audited_page_reference: current.audited_page_reference || null, auditor_document_id: current.auditor_document_id || null,
          resolution_status: auditedAmount === null ? 'Pending' : matched ? 'Matched' : isResolved ? 'Resolved' : 'Pending',
          resolution_type: matched || !isResolved ? null : resolution.resolution_type,
          resolution_reference: matched || !isResolved ? null : resolution.resolution_reference || null,
          resolution_note: matched || !isResolved ? null : resolution.resolution_note,
          resolved_by: matched ? null : isResolved ? APP_CONFIG.currentReviewer.name : null,
          resolved_at: matched ? null : isResolved ? new Date().toISOString() : null,
          system_snapshot: { account_id: x.account_id, account_name: x.account_name, account_type: x.account_type, verification_status: x.verification_status, captured_at: new Date().toISOString() }
        };
      });
      const { error: e } = await db.from('financial_year_audit_reconciliations').upsert(payload, { onConflict: 'financial_year,reconciliation_key' });
      if (e) throw e;
      const unresolved = payload.filter(x => x.resolution_status === 'Pending').length;
      await db.from('financial_year_audit_closures').update({ balances_confirmed: unresolved === 0, confirmed_by: unresolved === 0 ? APP_CONFIG.currentReviewer.name : null, confirmed_at: unresolved === 0 ? new Date().toISOString() : null, system_figures: { account_rows: systemRows.length }, audited_figures: { entered_rows: payload.filter(x => x.audited_amount !== null).length } }).eq('financial_year', fy);
      setNotice(unresolved ? `${unresolved} line item(s) still need an audited figure or a documented resolution.` : 'All account reconciliation lines are matched or have a documented resolution.');
      await load();
    } catch (e: any) { setError(e.message || 'Unable to save reconciliation.'); }
    finally { setBusy(false); }
  };

  const resolveRow = (key: string, field: string, value: string) => setResolutions(prev => { const current = prev[key] || { resolution_type: '', resolution_reference: '', resolution_note: '' }; return { ...prev, [key]: { ...current, [field]: value } }; });
  const updateEdited = (key: string, field: string, value: string) => setEdited(prev => { const current = prev[key] || { audited_amount: '', audited_page_reference: '', auditor_document_id: '' }; return { ...prev, [key]: { ...current, [field]: value } }; });

  const persistedResolved = items.filter(i => i.resolution_status === 'Matched' || i.resolution_status === 'Resolved').length;
  const unresolvedCount = systemRows.length ? systemRows.length - persistedResolved : 0;
  const docsComplete = docs.length > 0;
  const readyToCompare = Boolean(record?.audit_status === 'Completed' && docsComplete);
  const hasUnsavedChanges = systemRows.some(x => {
    const saved = items.find(i => i.reconciliation_key === x.key);
    const edit = edited[x.key];
    const resolution = resolutions[x.key];
    if (!saved) return true;
    if (edit && (edit.audited_amount !== (saved.audited_amount == null ? '' : String(saved.audited_amount)) || edit.audited_page_reference !== (saved.audited_page_reference || '') || edit.auditor_document_id !== (saved.auditor_document_id || ''))) return true;
    if (resolution && (resolution.resolution_type !== (saved.resolution_type || '') || resolution.resolution_reference !== (saved.resolution_reference || '') || resolution.resolution_note !== (saved.resolution_note || ''))) return true;
    return false;
  });
  const readyToClose = Boolean(record?.balances_confirmed && items.length === systemRows.length && unresolvedCount === 0 && !hasUnsavedChanges);
  const progress = record?.status === 'Closed' ? 4 : readyToClose ? 3 : docsComplete ? 2 : record?.audit_status === 'Completed' ? 1 : 0;

  const closeFinancialYear = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!record) throw new Error('Save the auditor details before closing this financial year.');
      if (!readyToClose) throw new Error(hasUnsavedChanges ? 'Save your latest reconciliation edits before closing the financial year.' : 'Complete every account reconciliation line before closing this financial year.');
      const db: any = supabaseClient;
      const snapshot = {
        financial_year: fy, period: dates,
        audit: { auditor_name: record.auditor_name, auditor_firm: record.auditor_firm, audit_completion_date: record.audit_completion_date, agm_meeting_date: record.agm_meeting_date },
        documents: docs.map(d => ({ document_name: d.document_name || d.document_type, file_name: d.file_name, file_path: d.file_path, version_no: d.version_no, verification_status: d.verification_status, uploaded_at: d.uploaded_at })),
        reconciliations: items,
        account_closing_balances: accountBalances,
        captured_at: new Date().toISOString()
      };
      const { data, error: e } = await db.from('financial_year_audit_closures').update({ status: 'Closed', closing_snapshot: snapshot, closed_at: new Date().toISOString(), closed_by: APP_CONFIG.currentReviewer.name }).eq('financial_year', fy).eq('balances_confirmed', true).select('*').single();
      if (e) throw e;
      setRecord(data); setStep(3); setNotice('Financial year closed. The signed documents, report comparisons and resolution trail are retained in the closing snapshot.');
    } catch (e: any) { setError(e.message || 'Financial year closure failed.'); }
    finally { setBusy(false); }
  };

  const currentStepDone = [Boolean(record?.audit_status === 'Completed'), docsComplete, readyToClose, record?.status === 'Closed'];
  const varianceCount = items.filter(i => i.audited_amount != null && Math.abs(num(i.variance)) > 0.01).length;
  const docsWithObservations = docs.filter(d => Number(d.observation_count || 0) > 0).length;
  const resolvedVarianceCount = items.filter(i => i.resolution_status === 'Resolved').length;

  return <div className="mx-auto max-w-[1500px] space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">Compliance & Governance</div><h1 className="text-2xl font-bold mt-1">Annual Audit & Account Closure</h1><p className="text-sm text-slate-500 mt-1">Add the signed audit file, compare it with Society OS reports, resolve differences and close the year.</p></div>
      <div className="flex items-center gap-2"><label className="text-xs text-slate-600">Financial Year</label><select value={fy} onChange={e=>{setFy(e.target.value);setStep(0);}} className="border rounded-lg px-3 py-2 text-sm bg-white"><option>FY 2018-19</option><option>FY 2019-20</option><option>FY 2020-21</option><option>FY 2021-22</option><option>FY 2022-23</option><option>FY 2023-24</option><option>FY 2024-25</option><option>FY 2025-26</option></select><button onClick={()=>void load()} className="border rounded-lg p-2" title="Refresh"><RefreshCw className="w-4 h-4"/></button></div>
    </div>
    {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-blue-50/70 to-indigo-50/70 px-4 py-4 shadow-sm">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STEPS.map((label,i)=><button key={label} onClick={()=>setStep(i)} disabled={i>0&&!currentStepDone[i-1]&&i>step} className="group relative flex flex-col items-center text-center disabled:cursor-not-allowed">
          <span className={`z-10 grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-bold shadow-sm transition-all ${currentStepDone[i]?'border-emerald-500 bg-emerald-500 text-white':step===i?'border-blue-600 bg-blue-600 text-white ring-4 ring-blue-100':'border-slate-300 bg-white text-slate-600'}`}>{currentStepDone[i]?<CheckCircle2 className="h-5 w-5"/>:i+1}</span>
          <span className={`mt-2 text-xs font-bold ${step===i?'text-blue-700':'text-slate-800'}`}>{i+1}. {label}</span>
          <span className={`mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${currentStepDone[i]?'bg-emerald-100 text-emerald-700':step===i?'bg-blue-100 text-blue-700':'text-slate-400'}`}>{currentStepDone[i]?'Completed':step===i?'In Progress':'Pending'}</span>
        </button>)}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all" style={{width:`${Math.max(progress,step+1)/4*100}%`}}/></div>
    </div>
    <div className="grid xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,.7fr)] gap-4">
      <div className="space-y-4">
        {step===0&&<section className="rounded-xl border bg-white p-5 space-y-4"><div><h2 className="text-lg font-semibold">Step 1 — Record auditor details</h2><p className="text-sm text-slate-500">Record who audited the accounts and when the audit was completed.</p></div><div className="grid md:grid-cols-2 gap-3">
          <label className="text-xs">Auditor name<input value={auditForm.auditor_name} onChange={e=>setAuditForm({...auditForm,auditor_name:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" required/></label>
          <label className="text-xs">Audit firm<input value={auditForm.auditor_firm} onChange={e=>setAuditForm({...auditForm,auditor_firm:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"/></label>
          <label className="text-xs">Audit completion date<input type="date" value={auditForm.audit_completion_date} onChange={e=>setAuditForm({...auditForm,audit_completion_date:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" required/></label>
          <label className="text-xs">AGM meeting date (if held)<input type="date" value={auditForm.agm_meeting_date} onChange={e=>setAuditForm({...auditForm,agm_meeting_date:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"/></label>
        </div><div className="flex justify-end"><button disabled={busy} onClick={()=>void saveAuditDetails()} className="bg-blue-700 text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Save & continue <ChevronRight className="inline w-4 h-4"/></button></div></section>}

        {step===1&&<section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-5 py-4">
            <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-xl font-extrabold text-white shadow-md shadow-blue-200">2</div><div><h2 className="text-lg font-extrabold tracking-tight text-slate-900">Upload & Verify Audit Documents</h2><p className="mt-1 text-sm text-slate-600">Upload one combined audit report or multiple documents. Each document is reviewed against Society OS records, with observations recorded separately.</p></div></div>
          </div>
          <div className="space-y-4 p-4 md:p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <button type="button" onClick={()=>setUploadMode('multiple')} className={`rounded-xl border-2 p-3 text-left transition-all ${uploadMode==='multiple'?'border-blue-500 bg-blue-50 shadow-sm':'border-slate-200 bg-white hover:border-blue-200'}`}><span className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${uploadMode==='multiple'?'border-blue-600':'border-slate-400'}`}>{uploadMode==='multiple'&&<span className="h-2.5 w-2.5 rounded-full bg-blue-600"/>}</span>Multiple Documents <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold uppercase text-blue-700">Recommended</span></span><span className="mt-1 block pl-7 text-xs text-slate-600">Upload schedules separately — Bank Ledger, Cash Ledger, Debtors, P&L, R&P, etc.</span></button>
              <button type="button" onClick={()=>setUploadMode('combined')} className={`rounded-xl border-2 p-3 text-left transition-all ${uploadMode==='combined'?'border-blue-500 bg-blue-50 shadow-sm':'border-slate-200 bg-white hover:border-blue-200'}`}><span className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${uploadMode==='combined'?'border-blue-600':'border-slate-400'}`}>{uploadMode==='combined'&&<span className="h-2.5 w-2.5 rounded-full bg-blue-600"/>}</span>Single Combined Report</span><span className="mt-1 block pl-7 text-xs text-slate-600">Upload one PDF containing all audit schedules.</span></button>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_1.25fr]">
              <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/40 p-4">
                <label className="mb-2 block text-xs font-bold text-slate-700">Document name / schedule</label>
                <input value={documentName} onChange={e=>setDocumentName(e.target.value)} placeholder={uploadMode==='combined'?'Statutory Audit Report — FY 2018-19':'e.g. Bank Ledger Vouchers'} className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/>
                <label className={`flex min-h-[76px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-blue-400 bg-white text-blue-700 transition hover:bg-blue-50 ${busy||record?.status==='Closed'||!documentName.trim()?'cursor-not-allowed opacity-50':''}`}><Upload className="h-6 w-6"/><span className="text-sm font-extrabold">Add Document</span><span className="text-[10px] text-slate-500">Choose a file to upload</span><input type="file" accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx,.csv" className="hidden" disabled={busy||record?.status==='Closed'||!documentName.trim()} onChange={e=>{const f=e.target.files?.[0];if(f)void uploadDoc(documentName,f);e.currentTarget.value='';}}/></label>
                <p className="mt-2 text-[10px] text-slate-500">PDF, Excel, Word, CSV or image · Maximum 25 MB · Re-uploads are saved as new versions.</p>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><FileText className="h-4 w-4 text-blue-700"/>Supported documents (examples)</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-700">Bank Ledger, Cash Ledger, Debtor List, Ledger Vouchers, Journal Vouchers, Profit & Loss, Receipts & Payments, Balance Sheet, Page Index and other auditor schedules.</p>
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900"><b>Verification status:</b> File extraction is not connected yet. New uploads are marked Needs Review until audited figures and page references are entered and reconciled in Step 3.</div>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-xs">
                <thead><tr className="bg-slate-100 text-slate-700"><th className="p-3 text-left font-extrabold">#</th><th className="p-3 text-left font-extrabold">Document Name</th><th className="p-3 text-left font-extrabold">Type / Schedule</th><th className="p-3 text-left font-extrabold">Uploaded On</th><th className="p-3 text-left font-extrabold">Verification Result</th><th className="p-3 text-center font-extrabold">Observations</th><th className="p-3 text-center font-extrabold">Action</th></tr></thead>
                <tbody>{docs.map((doc,i)=><tr key={doc.document_id} className="border-t border-slate-100 transition hover:bg-blue-50/40"><td className="p-3 text-slate-500">{i+1}</td><td className="p-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-rose-600"/><div className="min-w-0"><div className="truncate font-bold text-slate-900">{doc.file_name}</div><div className="text-[10px] text-slate-500">{doc.document_name||doc.document_type} · v{doc.version_no||1}</div></div></div></td><td className="p-3 text-slate-700">{doc.document_name||doc.document_type}</td><td className="p-3 whitespace-nowrap text-slate-600">{doc.uploaded_at?new Date(doc.uploaded_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—'}</td><td className="p-3"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold ${doc.verification_status==='Verified'?'bg-emerald-100 text-emerald-800':doc.verification_status==='Observation'?'bg-amber-100 text-amber-800':'bg-slate-100 text-slate-700'}`}>{doc.verification_status==='Verified'?<CheckCircle2 className="h-3 w-3"/>:<AlertCircle className="h-3 w-3"/>}{doc.verification_status||'Needs Review'}</span></td><td className="p-3 text-center font-extrabold text-slate-700">{Number(doc.observation_count||0)}</td><td className="p-3"><div className="flex items-center justify-center gap-2"><button onClick={()=>void openDocument(doc)} title="View document" className="rounded-md p-1.5 text-blue-700 hover:bg-blue-100"><Eye className="h-4 w-4"/></button><button onClick={()=>setNotice(`Document: ${doc.document_name||doc.file_name} · Version ${doc.version_no||1}. Previous versions remain in the evidence register.`)} title="Document details" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><MoreVertical className="h-4 w-4"/></button></div></td></tr>)}{!docs.length&&<tr><td colSpan={7} className="p-8 text-center text-slate-400">No audit documents uploaded yet.</td></tr>}</tbody>
              </table></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex flex-wrap items-center gap-4 text-xs"><span className="font-extrabold text-slate-800">Verification Summary</span><span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-4 w-4"/><b>{docs.filter(d=>d.verification_status==='Verified').length}</b> Verified</span><span className="inline-flex items-center gap-1.5 text-amber-700"><AlertCircle className="h-4 w-4"/><b>{docs.filter(d=>d.verification_status==='Observation').length}</b> With Observations</span><span className="inline-flex items-center gap-1.5 text-slate-600"><AlertCircle className="h-4 w-4"/><b>{docs.filter(d=>(d.verification_status||'Needs Review')==='Needs Review').length}</b> Needs Review</span></div>
              <button disabled={!docs.length} onClick={()=>setNotice('Document-level observations are not yet extracted automatically. Use Step 3 to enter audited figures and evidence page references.')} className="rounded-lg border border-blue-500 bg-white px-4 py-2 text-xs font-extrabold text-blue-700 hover:bg-blue-50 disabled:opacity-40">☷ View All Observations</button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><button onClick={()=>setStep(0)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><ChevronLeft className="mr-1 inline h-4 w-4"/>Back to Audit Completion</button><button disabled={!docsComplete} onClick={()=>setStep(2)} className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40">Proceed to Confirm Balances & Exceptions <ChevronRight className="ml-1 inline h-4 w-4"/></button></div>
          </div>
        </section>}
        {step===2&&<section className="rounded-xl border bg-white p-5 space-y-4"><div><h2 className="text-lg font-semibold">Step 3 — Compare & reconcile figures</h2><p className="text-sm text-slate-500">System values are read from the Account-wise Financial Year Balance report. Enter the corresponding audited schedule values and page references.</p></div>
          <div className="grid grid-cols-3 gap-2"><div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">System report lines</div><div className="text-xl font-bold">{systemRows.length}</div></div><div className="rounded-lg bg-amber-50 p-3"><div className="text-xs text-amber-700">Variances identified</div><div className="text-xl font-bold">{varianceCount}</div></div><div className="rounded-lg bg-blue-50 p-3"><div className="text-xs text-blue-700">Resolved variances</div><div className="text-xl font-bold">{resolvedVarianceCount}</div></div></div>
          {!systemRows.length?<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">No account balances are available for this financial year. Complete the account balance register before proceeding.</div>:<div className="overflow-x-auto"><table className="w-full text-xs min-w-[980px]"><thead><tr className="bg-slate-50 text-slate-600"><th className="text-left p-2">System report / account</th><th className="text-left p-2">Particulars</th><th className="text-right p-2">Society OS (₹)</th><th className="text-right p-2">Audited (₹)</th><th className="text-left p-2">Auditor document / page</th><th className="text-right p-2">Variance</th><th className="p-2">Status / action</th></tr></thead><tbody>{systemRows.map(x=>{const saved=items.find(i=>i.reconciliation_key===x.key);const current=edited[x.key]||{audited_amount:saved?.audited_amount==null?'':String(saved.audited_amount),audited_page_reference:saved?.audited_page_reference||'',auditor_document_id:saved?.auditor_document_id||''};const auditedValue=current.audited_amount===''?null:Number(current.audited_amount);const variance=auditedValue===null?null:Number((x.system-auditedValue).toFixed(2));const resolution=resolutions[x.key]||{resolution_type:'',resolution_reference:'',resolution_note:''};const isResolved=saved?.resolution_status==='Resolved'||(variance!==null&&Math.abs(variance)>0.01&&Boolean(resolution.resolution_type&&resolution.resolution_note.trim()));return <React.Fragment key={x.key}><tr className="border-t"><td className="p-2"><div className="font-semibold">{x.account_name}</div><div className="text-slate-500">{x.report}</div></td><td className="p-2">{x.line}</td><td className="p-2 text-right font-medium">{money(x.system)}</td><td className="p-2"><input type="number" step="0.01" value={current.audited_amount} onChange={e=>updateEdited(x.key,'audited_amount',e.target.value)} className="w-32 border rounded px-2 py-1 text-right"/></td><td className="p-2"><select value={current.auditor_document_id} onChange={e=>updateEdited(x.key,'auditor_document_id',e.target.value)} className="w-40 border rounded px-2 py-1"><option value="">Select document</option>{docs.map(d=><option key={d.document_id} value={d.document_id}>{d.document_type}</option>)}</select><input value={current.audited_page_reference} onChange={e=>updateEdited(x.key,'audited_page_reference',e.target.value)} placeholder="Page no." className="mt-1 w-24 border rounded px-2 py-1"/></td><td className="p-2 text-right">{variance===null?'—':money(variance)}</td><td className="p-2">{variance===null?<span className="text-slate-400">Enter audited figure</span>:Math.abs(variance)<=0.01?<span className="text-emerald-700 font-semibold">Matched</span>:isResolved?<span className="text-blue-700 font-semibold">Resolved</span>:<span className="text-amber-700 font-semibold">Needs action</span>}</td></tr>{variance!==null&&Math.abs(variance)>0.01&&<tr className="bg-amber-50/60"><td colSpan={7} className="px-3 pb-3 pt-1"><div className="grid md:grid-cols-[190px_1fr_1fr] gap-2"><select value={resolution.resolution_type} onChange={e=>resolveRow(x.key,'resolution_type',e.target.value)} className="border rounded px-2 py-2 text-xs"><option value="">Select resolution action</option><option value="Source Correction">Source correction (link approved correction)</option><option value="Auditor Adjustment">Auditor adjustment (attach/reference journal)</option><option value="Accepted Explanation">Accepted explanation (no posting)</option></select><input value={resolution.resolution_reference} onChange={e=>resolveRow(x.key,'resolution_reference',e.target.value)} placeholder="Correction / adjustment reference (if applicable)" className="border rounded px-2 py-2 text-xs"/><input value={resolution.resolution_note} onChange={e=>resolveRow(x.key,'resolution_note',e.target.value)} placeholder="Explain the variance and evidence" className="border rounded px-2 py-2 text-xs"/></div><div className="text-[10px] text-slate-500 mt-1">A variance is not cleared by changing the figure. Record the reason and supporting reference; source transactions are never changed here.</div></td></tr>}</React.Fragment>})}</tbody></table></div>}
          <div className="flex flex-wrap justify-between gap-2"><button onClick={()=>setStep(1)} className="border rounded-lg px-4 py-2 text-sm"><ChevronLeft className="inline w-4 h-4"/> Back</button><div className="flex gap-2"><button disabled={busy||!docsComplete} onClick={()=>void saveComparisonRows()} className="border border-blue-600 text-blue-700 rounded-lg px-4 py-2 text-sm font-semibold">Save reconciliation</button><button disabled={!readyToClose} onClick={()=>setStep(3)} className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-40">Review handover <ChevronRight className="inline w-4 h-4"/></button></div></div>
        </section>}

        {step===3&&<section className="rounded-xl border bg-white p-5 space-y-4"><div><h2 className="text-lg font-semibold">Step 4 — Review handover & close financial year</h2><p className="text-sm text-slate-500">Review the uploaded evidence and reconciliation outcomes before freezing the year.</p></div><div className="grid md:grid-cols-3 gap-3"><div className="rounded-lg border p-3"><div className="text-xs text-slate-500">Audit documents</div><div className="text-xl font-bold">{docs.length}</div></div><div className="rounded-lg border p-3"><div className="text-xs text-slate-500">Matched / resolved lines</div><div className="text-xl font-bold">{persistedResolved} / {systemRows.length}</div></div><div className="rounded-lg border p-3"><div className="text-xs text-slate-500">Unresolved lines</div><div className="text-xl font-bold">{unresolvedCount}</div></div></div><div className="space-y-2">{docs.slice(0,5).map(d=><div key={d.document_id} className="flex justify-between border-b py-2 text-xs"><span className="truncate pr-2">{d.document_name||d.document_type}</span><span className="text-amber-700">{d.verification_status||'Needs Review'}</span></div>)}{!docs.length&&<p className="text-xs text-amber-700">No evidence uploaded yet.</p>}</div>{record?.status==='Closed'?<div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">Financial year closed on {new Date(record.closed_at).toLocaleString('en-IN')}.</div>:<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Closing is enabled only when all report lines have an audited figure and are either matched or supported by a documented resolution. An accepted explanation is recorded as an exception; it does not alter the books.</div>}<div className="flex justify-between"><button onClick={()=>setStep(2)} className="border rounded-lg px-4 py-2 text-sm"><ChevronLeft className="inline w-4 h-4"/> Back to reconciliation</button><button disabled={busy||!readyToClose||record?.status==='Closed'} onClick={()=>void closeFinancialYear()} className="bg-slate-900 text-white rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-40"><LockKeyhole className="inline w-4 h-4 mr-1"/>Close & freeze FY</button></div></section>}
      </div>
      <aside className="space-y-3"><div className="rounded-xl border bg-white p-4"><h3 className="font-semibold">{fy} — Progress</h3><div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-600" style={{width:`${Math.round(progress/4*100)}%`}}/></div><div className="text-xs text-slate-500 mt-2">{progress} of 4 steps completed</div></div><div className="rounded-xl border bg-white p-4"><h3 className="font-semibold">Audit documents ({docs.length})</h3>{docs.slice(0,6).map(d=><div key={d.document_id} className="flex items-center justify-between border-t py-2 text-xs gap-2"><span className="truncate">{d.document_name||d.document_type}</span><span className="text-amber-700 whitespace-nowrap">{d.verification_status||'Needs Review'}</span></div>)}{!docs.length&&<div className="text-xs text-amber-700 pt-2">No documents uploaded</div>}</div><div className="rounded-xl border bg-blue-50 p-4"><h3 className="font-semibold text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Important</h3><p className="text-xs text-slate-600 mt-2">Audited amounts are transcribed from signed reports; PDF extraction is not yet connected. Every variance needs a reason and evidence reference. This wizard does not post adjustments or overwrite source transactions.</p></div><button onClick={()=>void load()} disabled={busy} className="w-full border rounded-lg px-3 py-2 text-xs font-semibold"><RefreshCw className="inline w-4 h-4 mr-1"/>Refresh records</button></aside>
    </div>
    <p className="text-[11px] text-slate-500 flex items-start gap-2"><FileText className="w-4 h-4 shrink-0"/>This workflow compares account-wise Society OS records with the signed audit schedules. It does not replace statutory approval or the appointed auditor's opinion.</p>
  </div>;
};

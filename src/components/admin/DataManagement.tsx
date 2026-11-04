import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '../../services/supabaseClient';
import { Database, RefreshCw, Search, Plus, Pencil, Trash2, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';

type Entity = 'transactions';
type Field = { key: string; label: string; type?: string; required?: boolean; options?: string[] };
const CONFIG: Record<Entity, { label: string; key: string; fields: Field[] }> = {
  transactions: { label: 'Transactions', key: 'transaction_id', fields: [
    {key:'transaction_id',label:'Transaction ID',required:true},{key:'transaction_date',label:'Date',type:'date',required:true},
    {key:'transaction_type',label:'Type',options:['Receipt','Payment'],required:true},{key:'voucher_receipt_no',label:'Voucher / Receipt No.'},
    {key:'account_id',label:'Account',options:[]},{key:'party_id',label:'Party',options:[]},{key:'category_id',label:'Category',options:[]},
    {key:'description',label:'Particulars'},{key:'amount',label:'Amount',type:'number',required:true},
    {key:'payment_mode',label:'Payment Mode'},{key:'demand_id',label:'Demand ID'},{key:'notes',label:'Notes'}
  ]}
};
const textVal=(v:any)=>v===null||v===undefined?'':String(v);
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(n||0);

export const DataManagement: React.FC = () => {
 const [entity,setEntity]=useState<Entity>('transactions');
 const [rows,setRows]=useState<any[]>([]);
 const [masters,setMasters]=useState<Record<string,any[]>>({account_master:[],party_master:[],category_master:[]});
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [search,setSearch]=useState(''),[editing,setEditing]=useState<any|null>(null),[isNew,setIsNew]=useState(false),[form,setForm]=useState<Record<string,any>>({});
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try {
   const [current,accounts,parties,categories]=await Promise.all([
    supabaseClient.from(entity).select('*').limit(2000),
    supabaseClient.from('account_master').select('*').limit(2000),
    supabaseClient.from('party_master').select('*').limit(2000),
    supabaseClient.from('category_master').select('*').limit(2000)
   ]);
   const failed=current.error||accounts.error||parties.error||categories.error;
   if(failed) throw failed;
   setRows(current.data||[]);
   setMasters({account_master:accounts.data||[],party_master:parties.data||[],category_master:categories.data||[]});
  } catch(e:any){setError(e?.message||'Unable to load data.');}
  finally{setLoading(false);}
 },[entity]);
 useEffect(()=>{load();},[load]);
 const cfg=CONFIG[entity];
 const filtered=useMemo(()=>rows.filter(r=>JSON.stringify(r).toLowerCase().includes(search.toLowerCase())),[rows,search]);
 const quality=useMemo(()=>{
  const tx=entity==='transactions'?rows:[];
  const ids=tx.map(x=>x.transaction_id).filter(Boolean);
  const duplicateIds=ids.filter((id,i)=>ids.indexOf(id)!==i);
  const accountIds=new Set(masters.account_master.map(x=>x.account_id));
  const partyIds=new Set(masters.party_master.map(x=>x.party_id));
  const categoryIds=new Set(masters.category_master.map(x=>x.category_id));
  return [
   {label:'Missing transaction date',count:tx.filter(x=>!x.transaction_date).length},
   {label:'Missing / zero amount',count:tx.filter(x=>x.amount===null||Number(x.amount)===0).length},
   {label:'Duplicate transaction IDs',count:new Set(duplicateIds).size},
   {label:'Unmatched account references',count:tx.filter(x=>x.account_id&&!accountIds.has(x.account_id)).length},
   {label:'Unmatched party references',count:tx.filter(x=>x.party_id&&!partyIds.has(x.party_id)).length},
   {label:'Unmatched category references',count:tx.filter(x=>x.category_id&&!categoryIds.has(x.category_id)).length},
   {label:'Transactions without Demand ID',count:tx.filter(x=>!x.demand_id).length}
  ];
 },[rows,masters,entity]);
 const startNew=()=>{setIsNew(true);setEditing({});setForm(Object.fromEntries(cfg.fields.map(f=>[f.key,''])));setNotice('');};
 const startEdit=(row:any)=>{setIsNew(false);setEditing(row);setForm(Object.fromEntries(cfg.fields.map(f=>[f.key,textVal(row[f.key])])));setNotice('');};
 const close=()=>{setEditing(null);setForm({});};
 const save=async()=>{
  setError('');setNotice('');
  for(const f of cfg.fields){if(f.required&&!String(form[f.key]??'').trim()){setError(f.label+' is required.');return;}}
  const payload:any={};
  cfg.fields.forEach(f=>{const v=form[f.key];if(v!==''&&v!==undefined){payload[f.key]=f.type==='number'?Number(v):f.key==='active'?v==='true':v;}else if(isNew)payload[f.key]=null;});
  if(isNew&&entity==='transactions'){
   Object.assign(payload,{bank_verified:'Pending',is_correction:false,correction_status:'Not Required',bill_status:'Pending',voucher_receipt_status:'Pending',evidence_status:'Pending',internal_audit_status:'Pending'});
  }
  try{
   const key=cfg.key;
   const tableClient:any=supabaseClient.from(entity);
    const result:any=isNew?await tableClient.insert(payload):await tableClient.update(payload).eq(key,editing[key]);
   if(result.error)throw result.error;
   setNotice(isNew?'Record created.':'Record updated.');close();await load();
  }catch(e:any){setError(e?.message||'Save failed.');}
 };
 const remove=async(row:any)=>{
  const key=cfg.key;const id=row[key];
  if(!window.confirm('Permanently delete '+id+' from '+cfg.label+'? This may affect linked reports and records. Prefer marking a master inactive where possible.'))return;
  try{const {error:e}=await supabaseClient.from(entity).delete().eq(key,id);if(e)throw e;setNotice('Record deleted.');await load();}
  catch(e:any){setError(e?.message||'Delete failed.');}
 };
 const displayFields=cfg.fields.filter(f=>!['supporting_records','verification_status','verification_remarks','verified_by','verified_at'].includes(f.key));
 const getOptions=(f:Field)=>f.key==='account_id'?masters.account_master.map(x=>({value:x.account_id,label:x.account_name+' ('+x.account_id+')'})):f.key==='party_id'?masters.party_master.map(x=>({value:x.party_id,label:x.party_name+' ('+x.party_id+')'})):f.key==='category_id'?masters.category_master.map(x=>({value:x.category_id,label:x.category_name+' ('+x.category_id+')'})):null;
 return <div className="mx-auto max-w-7xl space-y-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Database className="h-6 w-6 text-blue-700"/>Data Management</div><p className="mt-1 text-sm text-slate-500">Transaction records only. Master records are maintained in the separate Data Management workspace.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold"><RefreshCw className="h-4 w-4"/>Refresh data</button></div>
  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{(['transactions'] as Entity[]).map(k=><button key={k} onClick={()=>{setEntity(k);setSearch('');close();setNotice('');setError('');}} className={'rounded-xl border p-3 text-left '+(entity===k?'border-blue-500 bg-blue-50 ring-1 ring-blue-200':'bg-white hover:bg-slate-50')}><div className="text-sm font-bold">{CONFIG[k].label}</div><div className="mt-1 text-xl font-bold">{k===entity?rows.length:'Open'}</div></button>)}</div>
  {entity==='transactions'&&<section className="rounded-xl border bg-white p-4"><div className="mb-3 flex items-center gap-2 font-bold text-slate-900"><ShieldAlert className="h-4 w-4 text-amber-600"/>Data Quality Checks</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{quality.map(q=><div key={q.label} className="rounded-lg border border-slate-200 p-3"><div className="text-xs text-slate-500">{q.label}</div><div className={'mt-1 text-xl font-bold '+(q.count?'text-amber-700':'text-emerald-700')}>{q.count}</div></div>)}</div><p className="mt-3 text-[11px] text-slate-500">Checks are diagnostic only. They do not automatically modify or delete records. Demand ID absence is shown for follow-up and is not treated as a fabricated mapping.</p></section>}
  {error&&<div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
  {notice&&<div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4"/>{notice}</div>}
  <section className="overflow-hidden rounded-xl border bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="font-bold">{cfg.label}</h2><p className="text-xs text-slate-500">{filtered.length} records shown · {rows.length} total loaded</p></div><div className="flex flex-wrap gap-2"><label className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records…" className="rounded-lg border py-2 pl-8 pr-3 text-sm"/></label><button onClick={startNew} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4"/>Add</button></div></div>
  {loading?<div className="p-10 text-center text-sm text-slate-500">Loading records…</div>:<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{[cfg.key,...displayFields.filter(f=>f.key!==cfg.key).slice(0,7).map(f=>f.key),'Actions'].map(k=><th key={k} className="px-3 py-3 font-semibold">{k.replaceAll('_',' ')}</th>)}</tr></thead><tbody className="divide-y">{filtered.map((r,i)=><tr key={r[cfg.key]||i} className="hover:bg-slate-50"><td className="whitespace-nowrap px-3 py-2 font-mono font-semibold">{r[cfg.key]||'—'}</td>{displayFields.filter(f=>f.key!==cfg.key).slice(0,7).map(f=><td key={f.key} className="max-w-[220px] truncate px-3 py-2" title={textVal(r[f.key])}>{textVal(r[f.key])||'—'}</td>)}<td className="whitespace-nowrap px-3 py-2"><button onClick={()=>startEdit(r)} className="mr-2 rounded p-1 text-blue-700 hover:bg-blue-50" title="Edit"><Pencil className="h-4 w-4"/></button><button onClick={()=>remove(r)} className="rounded p-1 text-rose-700 hover:bg-rose-50" title="Delete"><Trash2 className="h-4 w-4"/></button></td></tr>)}</tbody></table>{!filtered.length&&<div className="p-8 text-center text-sm text-slate-500">No records found.</div>}</div>}</section>
  {editing!==null&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b bg-white p-4"><div className="font-bold">{isNew?'Add':'Edit'} {cfg.label} record</div><button onClick={close} className="rounded-lg border px-3 py-1 text-sm">Close</button></div><div className="grid gap-3 p-5 sm:grid-cols-2">{displayFields.map(f=>{const opts=getOptions(f);return <label key={f.key} className="block"><span className="mb-1 block text-xs font-semibold text-slate-600">{f.label}{f.required?' *':''}</span>{opts?<select disabled={f.key===cfg.key&&!isNew} value={form[f.key]??''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} className="w-full rounded-lg border px-3 py-2 text-sm"><option value="">— Not assigned —</option>{opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:f.options?<select disabled={f.key===cfg.key&&!isNew} value={form[f.key]??''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} className="w-full rounded-lg border px-3 py-2 text-sm"><option value="">Select…</option>{f.options.map(o=><option key={o} value={o}>{o}</option>)}</select>:<input disabled={f.key===cfg.key&&!isNew} type={f.type||'text'} value={form[f.key]??''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} className="w-full rounded-lg border px-3 py-2 text-sm" />}</label>})}</div><div className="flex justify-end gap-2 border-t p-4"><button onClick={close} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save record</button></div></div></div>}
 </div>;
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';

type Obligation = {
  obligation_id: string; obligation_code: string; title: string; domain: string;
  source_type: string; source_name: string; source_reference: string; requirement_summary: string;
  applicability: string; frequency: string; due_rule: string | null; owner_role: string | null;
  reviewer_role: string | null; evidence_required: string | null; legal_status: string;
  verification_notes: string | null;
};
type Instance = {
  instance_id: string; obligation_id: string; period_key: string; due_date: string | null;
  status: string; owner_name: string | null; owner_role: string | null; reviewer_name: string | null;
  submission_reference: string | null; outcome_notes: string | null; exception_reason: string | null;
  next_action: string | null; next_action_due: string | null;
};
const STATUSES = ['Not Started','In Progress','Awaiting Approval','Submitted','Accepted','Overdue','Not Applicable','Exception'];
const FY_OPTIONS = Array.from({length:9},(_,i)=>{const y=2018+i;return `FY ${y}-${String(y+1).slice(-2)}`;});
const fyDates = (fy:string) => {const y=Number(fy.match(/20\d{2}/)?.[0]||2018);return {start:`${y}-04-01`,end:`${y+1}-03-31`};};

export const ComplianceCommandCentre:React.FC = () => {
  const [obligations,setObligations]=useState<Obligation[]>([]);
  const [instances,setInstances]=useState<Instance[]>([]);
  const [fy,setFy]=useState('FY 2026-27');
  const [domain,setDomain]=useState('All');
  const [status,setStatus]=useState('All');
  const [search,setSearch]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [edit,setEdit]=useState<Record<string,Partial<Instance>>>({});
  const [showNew,setShowNew]=useState(false);
  const [newItem,setNewItem]=useState({title:'',domain:'Governance',source_reference:'',requirement_summary:'',frequency:'As Required',owner_role:'Secretary',evidence_required:''});

  const load=useCallback(async()=>{
    setBusy(true);setError('');
    try{
      const db:any=supabaseClient;
      const [o,i]=await Promise.all([
        db.from('compliance_obligations').select('*').eq('active',true).order('domain').order('obligation_code'),
        db.from('compliance_obligation_instances').select('*').eq('period_key',fy).order('due_date')
      ]);
      if(o.error)throw o.error;if(i.error)throw i.error;
      setObligations(o.data||[]);setInstances(i.data||[]);
    }catch(e:any){setError(e.message||'Unable to load compliance register. Apply the compliance migration and check access.');}
    finally{setBusy(false);}
  },[fy]);
  useEffect(()=>{void load();},[load]);

  const instanceMap=useMemo(()=>new Map(instances.map(x=>[x.obligation_id,x])),[instances]);
  const visible=useMemo(()=>obligations.filter(o=>(domain==='All'||o.domain===domain)&&(status==='All'||(instanceMap.get(o.obligation_id)?.status||'Not Started')===status)&&(`${o.title} ${o.obligation_code} ${o.source_reference} ${o.requirement_summary}`).toLowerCase().includes(search.toLowerCase())),[obligations,domain,status,search,instanceMap]);
  const stats=useMemo(()=>{
    const active=obligations.filter(o=>o.applicability==='Applicable'&&o.legal_status==='Verified Current');
    const counts=instances.reduce((a,x)=>{a[x.status]=(a[x.status]||0)+1;return a;},{} as Record<string,number>);
    const verified=obligations.filter(o=>o.legal_status==='Verified Current').length;
    const toVerify=obligations.filter(o=>o.legal_status==='Draft - Verify').length;
    return {active:active.length,verified,toVerify,open:instances.filter(x=>!['Accepted','Not Applicable'].includes(x.status)).length,overdue:counts.Overdue||0,accepted:counts.Accepted||0};
  },[obligations,instances]);

  const ensurePeriod=async()=>{
    setBusy(true);setError('');setMessage('');
    try{
      const rows=obligations.filter(o=>o.active).map(o=>({obligation_id:o.obligation_id,period_key:fy,...fyDates(fy),status:o.applicability==='Not Applicable'?'Not Applicable':'Not Started',owner_role:o.owner_role}));
      if(rows.length){const r=await (supabaseClient as any).from('compliance_obligation_instances').upsert(rows,{onConflict:'obligation_id,period_key',ignoreDuplicates:true});if(r.error)throw r.error;}
      setMessage(`Compliance cycle ${fy} initialised. Existing statuses were preserved; no due dates were invented.`);
      await load();
    }catch(e:any){setError(e.message||'Unable to initialise compliance cycle.');}
    finally{setBusy(false);}
  };
  const save=async(o:Obligation)=>{
    const current=instanceMap.get(o.obligation_id);
    const patch=edit[o.obligation_id]||{};
    if(!current){setError('Initialise this financial-year compliance cycle first.');return;}
    setBusy(true);setError('');setMessage('');
    try{
      const payload={...patch,updated_at:new Date().toISOString()};
      const r=await (supabaseClient as any).from('compliance_obligation_instances').update(payload).eq('instance_id',current.instance_id);
      if(r.error)throw r.error;
      await (supabaseClient as any).from('compliance_activity').insert({instance_id:current.instance_id,obligation_id:o.obligation_id,action:'Compliance record updated',previous_value:current,new_value:payload,actor_name:'Society OS User'});
      setEdit(p=>{const n={...p};delete n[o.obligation_id];return n;});
      setMessage(`Saved ${o.obligation_code} for ${fy}.`);await load();
    }catch(e:any){setError(e.message||'Unable to save compliance record.');}
    finally{setBusy(false);}
  };
  const create=async(e:React.FormEvent)=>{
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      const code=`SOC-${Date.now().toString().slice(-8)}`;
      const r=await (supabaseClient as any).from('compliance_obligations').insert({...newItem,obligation_code:code,source_type:'Society Policy',source_name:'Society-created obligation',source_reference:newItem.source_reference||'Internal control',applicability:'To Verify',legal_status:'Society Policy',frequency:newItem.frequency}).select().single();
      if(r.error)throw r.error;
      setShowNew(false);setNewItem({title:'',domain:'Governance',source_reference:'',requirement_summary:'',frequency:'As Required',owner_role:'Secretary',evidence_required:''});
      setMessage('New control added. Confirm applicability and approval before treating it as a mandatory obligation.');await load();
    }catch(e:any){setError(e.message||'Unable to create control.');}
    finally{setBusy(false);}
  };
  const field=(o:Obligation,k:keyof Instance,label:string,placeholder='')=>{
    const current=instanceMap.get(o.obligation_id);
    const value=(edit[o.obligation_id]?.[k]??(current as any)?.[k]??'') as string;
    return <label className="block text-[11px] font-medium text-slate-600">{label}<input value={value} placeholder={placeholder} onChange={e=>setEdit(p=>({...p,[o.obligation_id]:{...p[o.obligation_id],[k]:e.target.value}}))} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-900"/></label>;
  };

  return <div className="mx-auto max-w-7xl space-y-5 pb-10">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-blue-700 text-xs font-semibold uppercase tracking-wide"><ShieldCheck className="h-4 w-4"/> Society OS · Compliance</div><h1 className="mt-1 text-2xl font-bold text-slate-900">Compliance Command Centre</h1><p className="mt-1 max-w-3xl text-sm text-slate-500">A source-linked obligation library and evidence-backed register. Legal applicability and deadlines remain unverified until an authorised reviewer confirms the current law and registered bye-laws.</p></div><div className="flex gap-2"><button onClick={()=>void load()} className="rounded-lg border px-3 py-2 text-xs font-semibold"><RefreshCw className="mr-1 inline h-3.5 w-3.5"/>Refresh</button><button onClick={()=>setShowNew(v=>!v)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"><Plus className="mr-1 inline h-3.5 w-3.5"/>Add control</button></div></div>
    {error&&<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}{message&&<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <Metric label="Control library" value={obligations.length} note="Source-linked controls"/>
      <Metric label="Verified legal sources" value={stats.verified} note="Reviewed and confirmed"/>
      <Metric label="To verify" value={stats.toVerify} note="Not yet legally validated"/>
      <Metric label="Open this FY" value={stats.open} note="Not accepted / N.A."/>
      <Metric label="Overdue" value={stats.overdue} note="Based on recorded due dates"/>
    </div>
    <div className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Compliance cycle</h2><p className="text-xs text-slate-500">Initialise a period to create its tracking rows. No accounting data is changed.</p></div><div className="flex flex-wrap gap-2"><select value={fy} onChange={e=>setFy(e.target.value)} className="rounded-lg border px-3 py-2 text-xs">{FY_OPTIONS.map(x=><option key={x}>{x}</option>)}</select><button disabled={busy||!obligations.length} onClick={()=>void ensurePeriod()} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Initialise / sync period</button></div></div>
    </div>
    {showNew&&<form onSubmit={create} className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-2"><h2 className="md:col-span-2 font-semibold">Add Society control</h2><Field label="Control title" value={newItem.title} onChange={v=>setNewItem({...newItem,title:v})}/><Select label="Domain" value={newItem.domain} onChange={v=>setNewItem({...newItem,domain:v})} options={['Governance','Financial Records','Audit','Statutory Registers','Member Rights','Member Service','Operational Compliance','Internal Control','Statutory Filings']}/><Field label="Source / clause" value={newItem.source_reference} onChange={v=>setNewItem({...newItem,source_reference:v})}/><Select label="Frequency" value={newItem.frequency} onChange={v=>setNewItem({...newItem,frequency:v})} options={['Annual','Monthly','Quarterly','As Required','Event Based','Continuous','Periodic']}/><Field label="Owner role" value={newItem.owner_role} onChange={v=>setNewItem({...newItem,owner_role:v})}/><Field label="Evidence required" value={newItem.evidence_required} onChange={v=>setNewItem({...newItem,evidence_required:v})}/><div className="md:col-span-2"><label className="block text-xs font-medium">Requirement summary<textarea required value={newItem.requirement_summary} onChange={e=>setNewItem({...newItem,requirement_summary:e.target.value})} rows={2} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label></div><div className="md:col-span-2 flex gap-2"><button disabled={busy||!newItem.title.trim()||!newItem.requirement_summary.trim()} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white">Save control</button><button type="button" onClick={()=>setShowNew(false)} className="rounded-lg border px-4 py-2 text-xs">Cancel</button></div></form>}
    <div className="flex flex-wrap gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search obligation, clause or control..." className="min-w-[220px] flex-1 rounded-lg border bg-white px-3 py-2 text-xs"/><select value={domain} onChange={e=>setDomain(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-xs"><option>All</option>{Array.from(new Set(obligations.map(o=>o.domain))).sort().map(x=><option key={x}>{x}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-xs"><option>All</option>{STATUSES.map(x=><option key={x}>{x}</option>)}</select></div>
    <div className="space-y-3">{visible.map(o=>{const x=instanceMap.get(o.obligation_id);const changed=!!edit[o.obligation_id];return <article key={o.obligation_id} className="rounded-xl border bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{o.obligation_code}</span><span className="text-[10px] uppercase tracking-wide text-blue-700">{o.domain}</span><span className={`rounded px-2 py-1 text-[10px] font-semibold ${o.legal_status==='Verified Current'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800'}`}>{o.legal_status}</span></div><h3 className="mt-2 font-semibold text-slate-900">{o.title}</h3><p className="mt-1 text-sm text-slate-600">{o.requirement_summary}</p><p className="mt-2 text-[11px] text-slate-500">{o.source_name} · {o.source_reference} · {o.frequency}</p><p className="mt-1 text-[11px] text-slate-500">Evidence: {o.evidence_required||'To be defined'} · Owner: {o.owner_role||'Unassigned'} · Reviewer: {o.reviewer_role||'Unassigned'}</p></div><div className="min-w-[150px] text-right"><div className="text-xs font-semibold">{x?.status||'Not initialised'}</div><div className="mt-1 text-[10px] text-slate-500">{x?.due_date? `Due ${x.due_date}`:'Due date not configured'}</div><div className="mt-1 text-[10px] text-slate-500">{o.applicability}</div></div></div>
      <div className="mt-4 grid gap-2 border-t pt-3 sm:grid-cols-2 lg:grid-cols-4"><label className="block text-[11px] font-medium text-slate-600">Period status<select value={edit[o.obligation_id]?.status??x?.status??'Not Started'} onChange={e=>setEdit(p=>({...p,[o.obligation_id]:{...p[o.obligation_id],status:e.target.value}}))} className="mt-1 w-full rounded-lg border px-2.5 py-2 text-xs">{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>{field(o,'owner_name','Owner name','Assigned person')}{field(o,'due_date','Due date')} {field(o,'submission_reference','Submission / evidence reference','Document or acknowledgement ID')}</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="block text-[11px] font-medium text-slate-600">Next action<textarea value={(edit[o.obligation_id]?.next_action??x?.next_action??'') as string} onChange={e=>setEdit(p=>({...p,[o.obligation_id]:{...p[o.obligation_id],next_action:e.target.value}}))} rows={2} className="mt-1 w-full rounded-lg border px-2.5 py-2 text-xs"/></label><label className="block text-[11px] font-medium text-slate-600">Exception / outcome notes<textarea value={(edit[o.obligation_id]?.exception_reason??x?.exception_reason??'') as string} onChange={e=>setEdit(p=>({...p,[o.obligation_id]:{...p[o.obligation_id],exception_reason:e.target.value}}))} rows={2} className="mt-1 w-full rounded-lg border px-2.5 py-2 text-xs"/></label></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div className="text-[10px] text-slate-500">Legal source: {o.source_name}. Only verified controls should be used for statutory compliance conclusions.</div><button disabled={busy||!x||!changed} onClick={()=>void save(o)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Save period record</button></div></article>})}
      {!visible.length&&<div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">{busy?'Loading compliance register...':'No controls match these filters.'}</div>}</div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4"/> Legal verification required</div><p className="mt-1">The seeded library is a structured starting point based on the supplied 2014 Model Bye-laws and QMS draft. It is not a certified statement of current law. Confirm the Society's registered bye-laws and amendments, current MCS Act/Rules, circulars, applicable forms, deadlines and applicability with the appointed auditor or legal adviser. Do not mark an item legally verified without recording the source and reviewer.</p></div>
  </div>;
};
const Metric:React.FC<{label:string;value:number;note:string}> = ({label,value,note})=><div className="rounded-xl border bg-white p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div><div className="text-[10px] text-slate-500">{note}</div></div>;
const Field:React.FC<{label:string;value:string;onChange:(v:string)=>void}> = ({label,value,onChange})=><label className="block text-xs font-medium text-slate-700">{label}<input value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"/></label>;
const Select:React.FC<{label:string;value:string;onChange:(v:string)=>void;options:string[]}> = ({label,value,onChange,options})=><label className="block text-xs font-medium text-slate-700">{label}<select value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">{options.map(v=><option key={v}>{v}</option>)}</select></label>;

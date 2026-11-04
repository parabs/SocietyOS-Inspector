import React, { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search, Layers3 } from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';

type LedgerMode = 'demand' | 'party' | 'account';
type Row = {
  id: string; date: string; type: string; voucher: string; particulars: string;
  amount: number; account: string; party: string; partyType: string; paymentMode: string;
  demandGroup: string; categoryGroup: string; category: string; demandId: string;
};
const money = (n:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
const clean = (v:any, fallback='Unclassified') => String(v??'').trim() || fallback;
const exportCsv = (rows:Row[], name:string) => {
 const header=['Transaction ID','Date','Particulars','Voucher Type','Voucher No.','Account','Party Type','Party','Payment Mode','Demand Group','Category Group','Category','Demand ID','Amount'];
 const values=rows.map(r=>[r.id,r.date,r.particulars,r.type,r.voucher,r.account,r.partyType,r.party,r.paymentMode,r.demandGroup,r.categoryGroup,r.category,r.demandId,r.amount.toFixed(2)]);
 const csv=[header,...values].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
};
export const LedgerReports:React.FC = () => {
 const [mode,setMode]=useState<LedgerMode>('demand');
 const [rows,setRows]=useState<Row[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [search,setSearch]=useState('');
 const [period,setPeriod]=useState('All periods');
 const [expanded,setExpanded]=useState<Record<string,boolean>>({});
 const load=async()=>{
  setLoading(true);setError('');
  try {
   const [tx,acc,party,cat]=await Promise.all([
    supabaseClient.from('transactions').select('*').order('transaction_date',{ascending:true}),
    supabaseClient.from('account_master').select('*'),
    supabaseClient.from('party_master').select('*'),
    supabaseClient.from('category_master').select('*')
   ]);
   const failure=tx.error||acc.error||party.error||cat.error;
   if(failure) throw failure;
   const accounts=new Map((acc.data||[]).map((x:any)=>[String(x.account_id||x.id),x]));
   const parties=new Map((party.data||[]).map((x:any)=>[String(x.party_id||x.id),x]));
   const categories=new Map((cat.data||[]).map((x:any)=>[String(x.category_id||x.id),x]));
   setRows((tx.data||[]).map((t:any)=> {
    const a:any=accounts.get(String(t.account_id))||{};
    const p:any=parties.get(String(t.party_id))||{};
    const c:any=categories.get(String(t.category_id))||{};
    return {
     id:String(t.transaction_id||t.id||''),date:String(t.transaction_date||t.date||'').slice(0,10),
     type:clean(t.transaction_type||t.type,'Other'),voucher:clean(t.voucher_receipt_no||t.voucher_no,''),
     particulars:clean(t.description||t.narration,'—'),amount:Number(t.amount)||0,
     account:clean(a.account_name||t.account_name),party:clean(p.party_name||t.party_name),
     partyType:clean(p.party_type),paymentMode:clean(t.payment_mode,''),demandGroup:clean(c.demand_group),categoryGroup:clean(c.category_group),
     category:clean(c.category_name||t.category_name),demandId:clean(t.demand_id,'')
    };
   }));
  } catch(e:any){setError(e?.message||'Unable to load ledger records.');}
  finally{setLoading(false);}
 };
 useEffect(()=>{load();},[]);
 const periods=useMemo(()=>Array.from(new Set(rows.map(r=>r.date? r.date.slice(0,7):'').filter(Boolean))).sort(),[rows]);
 const filtered=useMemo(()=>rows.filter(r=>{
  const matchPeriod=period==='All periods'||r.date.startsWith(period);
  const q=search.trim().toLowerCase();
  const matchSearch=!q||[r.id,r.date,r.type,r.voucher,r.particulars,r.account,r.party,r.partyType,r.demandGroup,r.categoryGroup,r.category,r.demandId].some(v=>v.toLowerCase().includes(q));
  return matchPeriod&&matchSearch;
 }),[rows,period,search]);
 const groupRows=useMemo(()=>{
  const groups=new Map<string,Row[]>();
  filtered.forEach(r=>{
   const key=mode==='demand'?[r.demandGroup,r.categoryGroup,r.category].join(' › '):mode==='party'?[r.partyType,r.party].join(' › '):r.account;
   groups.set(key,[...(groups.get(key)||[]),r]);
  });
  return Array.from(groups.entries()).sort((a,b)=>a[0].localeCompare(b[0],'en',{numeric:true}));
 },[filtered,mode]);
 const totalIn=filtered.reduce((s,r)=>s+Math.max(0,r.amount),0);
 const totalOut=filtered.reduce((s,r)=>s+Math.abs(Math.min(0,r.amount)),0);
 const labels:Record<LedgerMode,string>={demand:'Demand Group-wise Ledger',party:'Party-wise Ledger',account:'Account-wise Ledger'};
 const hierarchy:Record<LedgerMode,string>={demand:'Demand Group → Category Group → Category Name',party:'Party Type → Party Name',account:'Account Name'};
 return <div className="space-y-4">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xl font-bold text-slate-900"><Layers3 className="h-5 w-5 text-blue-700"/>Ledger Reports</div><p className="mt-1 text-xs text-slate-500">One transaction view with three grouping options. Source records are read-only.</p></div><div className="flex gap-2"><button onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold"><RefreshCw className="h-4 w-4"/>Refresh</button><button onClick={()=>exportCsv(filtered,'society-ledger-'+mode+'.csv')} disabled={!filtered.length} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"><Download className="h-4 w-4"/>Export CSV</button></div></div>
  <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-2">{(['demand','party','account'] as LedgerMode[]).map(m=><button key={m} onClick={()=>{setMode(m);setExpanded({});}} className={'rounded-lg px-3 py-2 text-xs font-semibold '+(mode===m?'bg-blue-600 text-white':'text-slate-600 hover:bg-slate-100')}>{labels[m]}</button>)}</div>
  <div className="rounded-xl border bg-white p-3"><div className="mb-2 text-xs text-slate-500">Grouping: <strong className="text-slate-800">{hierarchy[mode]}</strong></div><div className="flex flex-wrap gap-2"><label className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search particulars, party, category, voucher…" className="w-full rounded-lg border py-2 pl-9 pr-3 text-xs"/></label><select value={period} onChange={e=>setPeriod(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-xs"><option>All periods</option>{periods.map(p=><option key={p} value={p}>{new Date(p+'-01T00:00:00').toLocaleString('en-IN',{month:'short',year:'numeric'})}</option>)}</select><button onClick={()=>{setSearch('');setPeriod('All periods');}} className="rounded-lg border px-3 py-2 text-xs">Reset</button></div></div>
  {error&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-white p-3"><div className="text-xs text-slate-500">Transactions</div><div className="mt-1 text-xl font-bold">{filtered.length.toLocaleString('en-IN')}</div></div><div className="rounded-xl border bg-white p-3"><div className="text-xs text-slate-500">Positive Amounts</div><div className="mt-1 text-xl font-bold text-emerald-700">{money(totalIn)}</div></div><div className="rounded-xl border bg-white p-3"><div className="text-xs text-slate-500">Negative Amounts</div><div className="mt-1 text-xl font-bold text-rose-700">{money(totalOut)}</div></div></div>
  {loading?<div className="rounded-xl border bg-white p-10 text-center text-sm text-slate-500">Loading ledger transactions…</div>:<div className="space-y-3">{groupRows.map(([group,items])=>{
   const open=expanded[group]!==false;const net=items.reduce((s,r)=>s+r.amount,0);
   return <section key={group} className="overflow-hidden rounded-xl border bg-white">
    <button onClick={()=>setExpanded(prev=>({...prev,[group]:!open}))} className="flex w-full flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3 text-left"><span className="text-sm font-bold text-slate-800">{group}</span><span className="text-xs text-slate-600">{items.length} entries · Net {money(net)} · {open?'Hide':'Show'}</span></button>
    {open&&<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-white text-[10px] uppercase tracking-wide text-slate-500"><tr>{['Transaction ID','Date','Particulars','Voucher Type','Voucher No.','Account / Party','Payment Mode','Demand ID','Category','Amount','Running Net'].map(h=><th key={h} className="border-b px-3 py-2">{h}</th>)}</tr></thead><tbody>{(()=>{let running=0;return items.map((r,i)=>{running+=r.amount;return <tr key={r.id||i} className="border-b last:border-0 hover:bg-slate-50"><td className="whitespace-nowrap px-3 py-2">{r.id||'—'}</td><td className="whitespace-nowrap px-3 py-2">{r.date||'—'}</td><td className="px-3 py-2">{r.particulars}</td><td className="px-3 py-2">{r.type}</td><td className="px-3 py-2">{r.voucher||'—'}</td><td className="px-3 py-2">{mode==='account'?r.party:r.account}</td><td className="px-3 py-2">{r.paymentMode||'—'}</td><td className="px-3 py-2">{r.demandId||'—'}</td><td className="px-3 py-2">{r.category}</td><td className={'whitespace-nowrap px-3 py-2 font-semibold '+(r.amount<0?'text-rose-700':'text-emerald-700')}>{money(r.amount)}</td><td className="whitespace-nowrap px-3 py-2 font-semibold">{money(running)}</td></tr>;});})()}</tbody><tfoot className="bg-slate-50 font-bold"><tr><td colSpan={9} className="px-3 py-2 text-right">Group Total</td><td className="px-3 py-2">{money(net)}</td><td className="px-3 py-2">—</td></tr></tfoot></table></div>}
   </section>;
  })}{!groupRows.length&&<div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">No transactions match the selected filters.</div>}</div>}
  <p className="text-[10px] text-slate-500">Amounts retain the sign stored in the source. Running Net starts at zero for the filtered transaction list; it is not an opening-balance or audited closing-balance figure. Transaction ID, Demand ID, payment mode and classification fields are included for traceability. Blank Demand IDs are shown as blank and are not auto-assigned by this report.</p>
 </div>;
};

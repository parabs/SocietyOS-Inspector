import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChevronDown,
  ChevronRight, ClipboardCheck, Clock3, FileCheck2, FileText, Flag, RefreshCw,
  ShieldCheck, Users, Wallet, XCircle
} from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';

type Task = {
  checklist_id:string; financial_year:string; stage:string; work_area:string; task:string;
  status:string; owner_name:string|null; owner_role:string|null; due_date:string|null;
  evidence_reference:string|null; remarks:string|null; completed_by:string|null;
  task_code?:string; sequence_no?:number; guidance?:string; completion_criteria?:string;
  approver_role?:string; approval_status?:string; dependency_codes?:string[];
};
type Obligation = {obligation_id:string;obligation_code:string;title:string;domain:string;source_reference:string;requirement_summary:string;legal_status:string;applicability:string;owner_role:string|null;reviewer_role:string|null;active:boolean};
type Approval = {approval_id:string;checklist_id:string;decision:string;approver_role:string;approver_name:string;comments:string|null;decided_at:string};

const CYCLE_STAGES = [
 {code:'01',name:'Plan & Appoint',period:'1–30 April',title:'Get the annual process started',description:'Confirm the people, records and plan needed for the year-end audit and AGM.',icon:CalendarDays,owner:'Secretary',tasks:[
  ['Confirm statutory auditor appointment','Secretary','Chairman','Record the appointment process and approval, confirm eligibility and tenure with the appointed professional, and retain the resolution and consent.','Appointment resolution, auditor consent and eligibility / panel evidence.','Appointment is documented and the auditor has acknowledged the engagement.'],
  ['Hold the annual accounts planning meeting','Secretary','Chairman','Put year-end accounts, audit preparation and AGM planning on the committee agenda. Record decisions, owners and target dates.','Meeting notice, agenda, attendance and signed minutes.','Committee has approved the preparation plan and task owners.'],
  ['Issue records and document request list','Treasurer','Secretary','List the books, registers, bank statements, vouchers, bills, member records and prior audit papers that must be assembled.','Document request checklist and responsibility list.','Every required record has an owner and a collection status.']
 ]},
 {code:'02',name:'Verify Accounts',period:'1–31 May',title:'Check the books and supporting records',description:'Treasurer-led verification of receipts, payments, member balances and cash / bank records.',icon:Wallet,owner:'Treasurer',tasks:[
  ['Verify receipts and collections','Treasurer','Secretary','Compare receipt entries with bank credits, cash records, receipt counterfoils and member ledgers. Investigate missing or duplicate entries.','Receipt register, bank credits, cash book and exception list.','Receipt totals reconcile or every difference is recorded for correction.'],
  ['Verify payments and expenses','Treasurer','Chairman','Match each payment with its bill, voucher, approval and bank / cash debit. Flag unsupported, duplicate or incorrectly classified expenses.','Payment register, vouchers, bills, approvals and exception list.','Every payment has support or a documented exception and action owner.'],
  ['Reconcile bank and cash balances','Treasurer','Chairman','Compare book balances with bank statements and physical cash records. List uncleared cheques, bank charges and unexplained differences.','Bank statements, cash book and signed reconciliation.','Each account has a reconciled balance or an open difference with an owner.'],
  ['Review member dues and balances','Treasurer','Secretary','Compare demands, receipts, allocations, advances and outstanding balances with the member-wise ledger. Follow up unusual or negative balances.','Demand register, receipt allocation and member balance report.','Member balance differences are explained and tracked.']
 ]},
 {code:'03',name:'Internal Audit',period:'1–30 June',title:'Independently review the society records',description:'Test the books and controls, record observations and require management responses.',icon:ClipboardCheck,owner:'Internal Auditor',tasks:[
  ['Complete internal audit tests','Internal Auditor','Chairman','Test samples and high-risk areas across opening balances, receipts, payments, demands, bank reconciliation, approvals and statutory registers.','Internal audit test sheets and supporting samples.','Tests are marked complete with evidence references and exceptions.'],
  ['Record audit observations and risk','Internal Auditor','Secretary','Write each finding clearly: what happened, the record affected, why it matters, risk and recommended correction.','Numbered observation register with source references.','Each finding has a risk rating, recommendation and accountable owner.'],
  ['Obtain management responses','Secretary','Chairman','Ask the responsible office bearer to explain the issue and propose a realistic corrective action and completion date.','Management response and corrective action tracker.','Every observation has a response or is explicitly marked pending.'],
  ['Review internal audit report','Chairman','Managing Committee','Review significant findings, unresolved items and management responses. Record committee direction without changing the auditor’s independent conclusion.','Internal audit report and committee review minutes.','Review is minuted and unresolved issues are disclosed.']
 ]},
 {code:'04',name:'Compile Evidence',period:'1–15 July',title:'Prepare a complete audit file',description:'Collect and index the records so the statutory auditor can trace balances to source evidence.',icon:FileCheck2,owner:'Treasurer',tasks:[
  ['Compile financial statements and schedules','Treasurer','Chairman','Prepare the applicable financial statements and supporting schedules from reconciled books. Mark provisional figures and unresolved balances clearly.','Trial balance, receipts and payments, income and expenditure, balance sheet and schedules.','Each statement agrees to its supporting ledger or a disclosed reconciliation.'],
  ['Compile registers and supporting documents','Secretary','Treasurer','Collect cash book, bank book, member and vendor ledgers, demand and receipt registers, minutes, resolutions, bills and vouchers.','Indexed register and evidence checklist.','Required records are attached or marked unavailable / not applicable with explanation.'],
  ['Prepare internal audit and exception pack','Secretary','Chairman','Include internal audit findings, management responses, open exceptions, approved adjustments and evidence of corrections.','Observation register, response tracker and adjustment references.','All open matters are visible and no exception is silently omitted.']
 ]},
 {code:'05',name:'Handover to Auditor',period:'16–31 July',title:'Submit the audit-ready package',description:'Issue a controlled handover, retain acknowledgement and track every missing item.',icon:FileText,owner:'Secretary',tasks:[
  ['Review audit handover index','Treasurer','Secretary','Check that the document index matches the files actually attached. Do not mark a document submitted merely because a report link exists.','Versioned handover manifest and attachment checklist.','Every item is attached, explicitly pending or marked not applicable with a reason.'],
  ['Obtain committee approval to submit','Secretary','Chairman','Present the handover package and known exceptions to the committee for approval to issue to the statutory auditor.','Committee resolution / approval record.','Approval reference is recorded before formal issue.'],
  ['Submit package and record acknowledgement','Secretary','Chairman','Send the approved package to the appointed auditor using the agreed channel. Record the submission date and acknowledgement.','Submission email / letter, package version and auditor acknowledgement.','Auditor receipt is evidenced and outstanding documents are tracked.']
 ]},
 {code:'06',name:'Statutory Audit',period:'1–31 August',title:'Support the independent statutory audit',description:'Respond to auditor queries and track the signed audit report. The auditor alone determines the audit opinion.',icon:ShieldCheck,owner:'Statutory Auditor',tasks:[
  ['Respond to statutory auditor queries','Treasurer','Secretary','Log each query, assign a response owner, attach supporting evidence and submit a complete response. Keep auditor conclusions separate from management responses.','Auditor query register, responses and evidence.','Every query is answered or has a due date and responsible person.'],
  ['Track audit observations and proposed adjustments','Treasurer','Chairman','Record each audit observation and proposed adjustment. Obtain proper approval before any accounting entry is posted.','Audit observation and adjustment proposal register.','Each proposed adjustment has a decision and posting reference or reason not posted.'],
  ['Receive and review signed audit report','Secretary','Chairman','Obtain the signed report and record its date, audit opinion, qualifications and annexures. Escalate adverse or qualified matters to the committee.','Signed statutory audit report and auditor communication.','Signed report is received and its key findings are tabled for committee action.']
 ]},
 {code:'07',name:'Finalise Accounts',period:'1–15 September',title:'Approve the accounts for AGM presentation',description:'Close management actions, prepare the AGM pack and obtain the required office-bearer and committee certifications.',icon:CheckCircle2,owner:'Treasurer',tasks:[
  ['Complete management responses and rectification plan','Secretary','Chairman','For each audit observation, document the society response, corrective action, owner and target date. Do not claim auditor closure without auditor confirmation.','Rectification tracker and supporting evidence.','Every observation is closed with evidence or carried forward transparently.'],
  ['Finalise audited accounts and AGM papers','Treasurer','Secretary','Prepare the final audited accounts, auditor report, committee report, budget / other agenda papers and member-facing summaries as applicable.','Final accounts and AGM paper pack.','Documents are internally checked and ready for notice / circulation.'],
  ['Obtain Treasurer, Secretary and Chairman review','Treasurer','Chairman','Route the financial accuracy review to Treasurer, records and notice review to Secretary, and overall committee readiness review to Chairman. Record comments and return items needing correction.','Recorded reviews, comments and approval references.','All required reviews are recorded; returned items are resolved or disclosed.']
 ]},
 {code:'08',name:'AGM & Closure',period:'16–30 September',title:'Conduct the AGM and record decisions',description:'Complete notice, meeting, adoption and post-meeting actions in accordance with verified statutory requirements and registered bye-laws.',icon:Users,owner:'Secretary',tasks:[
  ['Verify AGM notice and service requirements','Secretary','Chairman','Confirm the applicable notice period, agenda, mode of service and required enclosures against current law and the society’s registered bye-laws before issuing.','Approved notice, agenda, dispatch / service proof and enclosures.','Notice and service evidence are reviewed and retained.'],
  ['Conduct AGM and record proceedings','Chairman','Secretary','Confirm quorum and attendance, conduct the agenda, present audited accounts and audit report, record questions and resolutions in the minutes.','Attendance, quorum record, minutes and resolutions.','Meeting record is complete and decisions are accurately captured.'],
  ['Complete AGM actions and annual closure','Secretary','Chairman','Assign owners and dates to AGM resolutions, circulate approved records and update the annual compliance tracker. Carry forward unresolved audit / rectification items.','Signed minutes, action register and closure checklist.','All resolutions have owners; unresolved matters remain open with target dates.']
 ]}
] as const;

const FY_OPTIONS=Array.from({length:9},(_,i)=>{const y=2018+i;return `FY ${y}-${String(y+1).slice(-2)}`;});
const cycleYear=(fy:string)=>Number(fy.match(/20\d{2}/)?.[0]||2018)+1;
const dateForCycle=(fy:string,month:number,day:number)=>`${cycleYear(fy)}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
const STATUS_OPTIONS=['Pending','In Progress','Submitted','Completed','Returned for Changes','Not Applicable','Exception'];
const roleLabel=(role:string)=>role==='Internal Auditor'?'Internal Auditor':role==='Statutory Auditor'?'Statutory Auditor':role;

export const ComplianceCommandCentre:React.FC=()=>{
 const [fy,setFy]=useState('FY 2018-19');
 const [tasks,setTasks]=useState<Task[]>([]);
 const [obligations,setObligations]=useState<Obligation[]>([]);
 const [approvals,setApprovals]=useState<Approval[]>([]);
 const [selectedStage,setSelectedStage]=useState('01');
 const [activeView,setActiveView]=useState<'guide'|'controls'|'calendar'|'exceptions'>('guide');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [expandedTask,setExpandedTask]=useState<string|null>(null);
 const [actor,setActor]=useState({name:'',role:'Treasurer'});
 const [approvalNote,setApprovalNote]=useState('');
 const [taskEdits,setTaskEdits]=useState<Record<string,Partial<Task>>>({});

 const load=useCallback(async()=>{
  setBusy(true);setError('');
  try{
   const db:any=supabaseClient;
   const [t,o]=await Promise.all([
    db.from('financial_year_checklist').select('*').eq('financial_year',fy).order('sequence_no'),
    db.from('compliance_obligations').select('*').eq('active',true).order('domain').order('obligation_code')
   ]);
   if(t.error)throw t.error;if(o.error)throw o.error;
   const taskRows=(t.data||[]) as Task[];
   setTasks(taskRows);setObligations((o.data||[]) as Obligation[]);
   const ids=taskRows.map(x=>x.checklist_id);
   if(ids.length){
    const a=await db.from('governance_task_approvals').select('*').in('checklist_id',ids).order('decided_at',{ascending:false});
    if(a.error)throw a.error;setApprovals((a.data||[]) as Approval[]);
   }else setApprovals([]);
  }catch(e:any){setError(e.message||'Unable to load the guided compliance workspace.');}
  finally{setBusy(false);}
 },[fy]);
 useEffect(()=>{void load();},[load]);

 const stageTasks=useMemo(()=>new Map(CYCLE_STAGES.map(s=>[s.code,tasks.filter(t=>t.task_code?.startsWith(`AGM-${s.code}-`))])),[tasks]);
 const allStageTasks=CYCLE_STAGES.flatMap(s=>stageTasks.get(s.code)||[]);
 const progress=allStageTasks.length?Math.round(allStageTasks.filter(t=>['Completed','Not Applicable'].includes(t.status)).length/allStageTasks.length*100):0;
 const stageProgress=(code:string)=>{const rows=stageTasks.get(code)||[];return {done:rows.filter(t=>['Completed','Not Applicable'].includes(t.status)).length,total:rows.length};};
 const selected=CYCLE_STAGES.find(s=>s.code===selectedStage)||CYCLE_STAGES[0];
 const selectedRows=stageTasks.get(selected.code)||[];
 const nextTasks=allStageTasks.filter(t=>!['Completed','Not Applicable'].includes(t.status)).slice(0,5);
 const approvalsFor=(id:string)=>approvals.filter(a=>a.checklist_id===id);
 const isApproved=(t:Task)=>approvalsFor(t.checklist_id).some(a=>a.decision==='Approved');

 const initialise=async()=>{
  setBusy(true);setError('');setMessage('');
  try{
   const rows:any[]=[];
   CYCLE_STAGES.forEach((s,si)=>{
    s.tasks.forEach((task,ti)=>{
     const [name,owner,approver,guidance,evidence,criteria]=task;
     rows.push({
      financial_year:fy,stage:s.name,work_area:s.title,task:name,status:'Pending',
      task_code:`AGM-${s.code}-${String(ti+1).padStart(2,'0')}`,sequence_no:si*10+ti+1,
      guidance,completion_criteria:criteria,owner_role:owner,approver_role:approver,
      due_date:dateForCycle(fy,si<2?si+4:si<5?7:si===5?8:9,si===0?30:si===1?31:si===2?30:si===3?15:si===4?31:si===5?31:si===6?15:30)
     });
    });
   });
   const r=await (supabaseClient as any).from('financial_year_checklist').upsert(rows,{onConflict:'financial_year,stage,work_area,task',ignoreDuplicates:true});
   if(r.error)throw r.error;
   setMessage(`AGM closure guide initialised for ${fy}. Existing task statuses and approvals were preserved.`);
   await load();
  }catch(e:any){setError(e.message||'Could not initialise the AGM guide. Apply the guided AGM workflow migration first.');}
  finally{setBusy(false);}
 };

 const updateTask=async(t:Task,patch:Partial<Task>)=>{
  setBusy(true);setError('');setMessage('');
  try{
   const payload:any={...patch,updated_at:new Date().toISOString()};
   const r=await (supabaseClient as any).from('financial_year_checklist').update(payload).eq('checklist_id',t.checklist_id);
   if(r.error)throw r.error;
   setMessage(`Updated ${t.task_code||t.task}.`);await load();
  }catch(e:any){setError(e.message||'Could not update task.');}
  finally{setBusy(false);}
 };

 const recordApproval=async(t:Task,decision:'Approved'|'Rejected'|'Returned for Changes')=>{
  if(!actor.name.trim()){setError('Enter the approving person’s name before recording the decision.');return;}
  if(actor.role!==t.approver_role&&actor.role!=='Managing Committee'){setError(`This task is assigned for review by ${t.approver_role||'the assigned reviewer'}.`);return;}
  setBusy(true);setError('');setMessage('');
  try{
   const r=await (supabaseClient as any).from('governance_task_approvals').insert({
    checklist_id:t.checklist_id,financial_year:fy,decision,approver_role:actor.role,
    approver_name:actor.name,comments:approvalNote||null
   });
   if(r.error)throw r.error;
   const patch:any={approval_status:decision,approval_notes:approvalNote||null};
   if(decision==='Approved')patch.status='Completed';
   if(decision==='Returned for Changes')patch.status='In Progress';
   const u=await (supabaseClient as any).from('financial_year_checklist').update(patch).eq('checklist_id',t.checklist_id);
   if(u.error)throw u.error;
   setApprovalNote('');setMessage(`${decision} recorded for ${t.task_code}.`);await load();
  }catch(e:any){setError(e.message||'Could not record task approval.');}
  finally{setBusy(false);}
 };

 const statusClass=(status:string)=>status==='Completed'?'bg-emerald-100 text-emerald-800':status==='In Progress'?'bg-blue-100 text-blue-800':status==='Submitted'?'bg-violet-100 text-violet-800':status==='Exception'?'bg-rose-100 text-rose-800':'bg-slate-100 text-slate-700';
 const cycleStart=`1 April ${cycleYear(fy)}`,cycleEnd=`30 September ${cycleYear(fy)}`;
 const metrics=[
  {label:'Total tasks',value:allStageTasks.length,tone:'slate'},
  {label:'Completed',value:allStageTasks.filter(t=>['Completed','Not Applicable'].includes(t.status)).length,tone:'green'},
  {label:'In progress',value:allStageTasks.filter(t=>t.status==='In Progress'||t.status==='Submitted').length,tone:'blue'},
  {label:'Pending',value:allStageTasks.filter(t=>t.status==='Pending').length,tone:'amber'},
  {label:'Exceptions',value:allStageTasks.filter(t=>t.status==='Exception'||t.status==='Returned for Changes').length,tone:'red'}
 ];

 return <div className="mx-auto max-w-[1500px] space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700"><ShieldCheck className="h-4 w-4"/> Society OS · Compliance & Governance</div><h1 className="mt-1 text-2xl font-bold text-slate-900">AGM Closure Guide</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">A step-by-step guide for the Chairman, Secretary and Treasurer to prepare accounts, complete audit work and close the AGM cycle from {cycleStart} to {cycleEnd}.</p></div>
   <div className="flex flex-wrap items-center gap-2"><select value={fy} onChange={e=>setFy(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold"><option value="">Select financial year</option>{FY_OPTIONS.map(x=><option key={x}>{x}</option>)}</select><button onClick={()=>void load()} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold"><RefreshCw className="mr-1 inline h-3.5 w-3.5"/>Refresh</button><button onClick={()=>void initialise()} disabled={busy} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Create / sync guide</button></div>
  </div>
  {error&&<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mr-2 inline h-4 w-4"/>{error}</div>}
  {message&&<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
  <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
   {metrics.map((m,i)=><div key={m.label} className={`rounded-xl border p-4 ${['border-slate-200 bg-white','border-emerald-200 bg-emerald-50','border-blue-200 bg-blue-50','border-amber-200 bg-amber-50','border-rose-200 bg-rose-50'][i]}`}><div className="text-xs font-medium text-slate-600">{m.label}</div><div className="mt-1 text-2xl font-bold text-slate-900">{m.value}</div></div>)}
  </div>
  <div className="rounded-2xl border bg-white p-4 shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Your annual AGM journey</h2><p className="text-xs text-slate-500">Complete each stage in order. Open a stage to see what to do, who does it and what evidence to retain.</p></div><div className="text-right"><div className="text-2xl font-bold text-blue-700">{progress}%</div><div className="text-[10px] text-slate-500">tasks completed</div></div></div>
   <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width:`${progress}%`}}/></div>
   <div className="mt-5 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
    {CYCLE_STAGES.map((s,i)=>{const p=stageProgress(s.code);const active=selectedStage===s.code;const Icon=s.icon;const complete=p.total>0&&p.done===p.total;return <button key={s.code} onClick={()=>setSelectedStage(s.code)} className={`rounded-xl border p-3 text-left transition ${active?'border-blue-500 bg-blue-50 ring-2 ring-blue-100':'border-slate-200 bg-white hover:bg-slate-50'}`}><div className="flex items-center justify-between"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${complete?'bg-emerald-600 text-white':active?'bg-blue-600 text-white':'bg-slate-100 text-slate-600'}`}>{i+1}</span><Icon className="h-4 w-4 text-slate-500"/></div><div className="mt-2 text-xs font-bold text-slate-900">{s.name}</div><div className="mt-1 text-[10px] text-slate-500">{s.period}</div><div className="mt-2 text-[10px] font-semibold text-slate-600">{p.done}/{p.total||s.tasks.length} tasks</div></button>})}
   </div>
  </div>
  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
   <section className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Stage {selected.code} · {selected.period}</div><h2 className="mt-1 text-lg font-bold text-slate-900">{selected.title}</h2><p className="mt-1 text-sm text-slate-600">{selected.description}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{selected.owner}</span></div>
    <div className="mt-4 space-y-3">
     {selected.tasks.map((def,i)=>{const code=`AGM-${selected.code}-${String(i+1).padStart(2,'0')}`;const t=selectedRows.find(x=>x.task_code===code);const open=expandedTask===code;const [name,owner,approver,guidance,evidence,criteria]=def;return <article key={code} className="rounded-xl border border-slate-200">
      <button onClick={()=>setExpandedTask(open?null:code)} className="flex w-full flex-wrap items-center gap-3 p-3 text-left"><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{code}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{name}</span><span className="mt-1 block text-[10px] text-slate-500">Owner: {owner} · Review: {approver}</span></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusClass(t?.status||'Pending')}`}>{t?.status||'Not initialised'}</span>{open?<ChevronDown className="h-4 w-4"/>:<ChevronRight className="h-4 w-4"/>}</button>
      {open&&<div className="space-y-4 border-t bg-slate-50/70 p-4">
       <div className="grid gap-3 md:grid-cols-2"><div><div className="text-[10px] font-bold uppercase text-slate-500">What you need to do</div><p className="mt-1 text-sm text-slate-800">{guidance}</p></div><div><div className="text-[10px] font-bold uppercase text-slate-500">Evidence to keep</div><p className="mt-1 text-sm text-slate-800">{evidence}</p><div className="mt-3 text-[10px] font-bold uppercase text-slate-500">Completion means</div><p className="mt-1 text-sm text-slate-800">{criteria}</p></div></div>
       {t?<><div className="grid gap-2 md:grid-cols-3"><label className="text-[11px] font-semibold text-slate-600">Task status<select value={taskEdits[t.checklist_id]?.status??t.status} onChange={e=>setTaskEdits(p=>({...p,[t.checklist_id]:{...p[t.checklist_id],status:e.target.value}}))} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-xs">{STATUS_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></label><label className="text-[11px] font-semibold text-slate-600">Assigned to<input value={taskEdits[t.checklist_id]?.owner_name??t.owner_name??''} onChange={e=>setTaskEdits(p=>({...p,[t.checklist_id]:{...p[t.checklist_id],owner_name:e.target.value}}))} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-xs" placeholder="Name of responsible person"/></label><label className="text-[11px] font-semibold text-slate-600">Due date<input type="date" value={taskEdits[t.checklist_id]?.due_date??t.due_date??''} onChange={e=>setTaskEdits(p=>({...p,[t.checklist_id]:{...p[t.checklist_id],due_date:e.target.value}}))} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-xs"/></label></div>
       <label className="block text-[11px] font-semibold text-slate-600">Evidence / document reference<input value={taskEdits[t.checklist_id]?.evidence_reference??t.evidence_reference??''} onChange={e=>setTaskEdits(p=>({...p,[t.checklist_id]:{...p[t.checklist_id],evidence_reference:e.target.value}}))} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-xs" placeholder="File name, register reference or meeting resolution"/></label>
       <label className="block text-[11px] font-semibold text-slate-600">Progress notes<textarea value={taskEdits[t.checklist_id]?.remarks??t.remarks??''} onChange={e=>setTaskEdits(p=>({...p,[t.checklist_id]:{...p[t.checklist_id],remarks:e.target.value}}))} rows={2} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-xs" placeholder="What was completed, what is pending, and any exception"/></label>
       <div className="flex flex-wrap justify-between gap-2"><span className="text-[10px] text-slate-500">Approval required from: {approver}. Approval is recorded separately from task completion.</span><button disabled={busy||!Object.keys(taskEdits[t.checklist_id]||{}).length} onClick={()=>void updateTask(t,taskEdits[t.checklist_id])} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Save task update</button></div>
       <div className="rounded-lg border bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs font-bold">Task approval</div><div className="text-[10px] text-slate-500">{approvalsFor(t.checklist_id).length?approvalsFor(t.checklist_id).map(a=>`${a.decision} · ${a.approver_role} · ${a.approver_name}`).join(' | '):'No approval recorded yet'}</div></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isApproved(t)?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'}`}>{isApproved(t)?'Approved':'Awaiting review'}</span></div>
        <div className="mt-3 grid gap-2 md:grid-cols-3"><label className="text-[11px] font-semibold">Approver name<input value={actor.name} onChange={e=>setActor(p=>({...p,name:e.target.value}))} className="mt-1 w-full rounded-lg border px-2 py-2 text-xs" placeholder="Name"/></label><label className="text-[11px] font-semibold">Approver role<select value={actor.role} onChange={e=>setActor(p=>({...p,role:e.target.value}))} className="mt-1 w-full rounded-lg border px-2 py-2 text-xs">{['Treasurer','Secretary','Chairman','Managing Committee'].map(x=><option key={x}>{x}</option>)}</select></label><label className="text-[11px] font-semibold">Review comment<input value={approvalNote} onChange={e=>setApprovalNote(e.target.value)} className="mt-1 w-full rounded-lg border px-2 py-2 text-xs" placeholder="Comment / return reason"/></label></div>
        <div className="mt-2 flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void recordApproval(t,'Approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Approve task</button><button disabled={busy} onClick={()=>void recordApproval(t,'Returned for Changes')} className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800">Return for changes</button><button disabled={busy} onClick={()=>void recordApproval(t,'Rejected')} className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700">Reject</button></div>
        <p className="mt-2 text-[10px] text-amber-700">Approval events are recorded against the signed-in account. Role-based access enforcement must be enabled after user-to-role assignments are configured.</p>
       </div></>:<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Create / sync the guide for this financial year to activate task tracking.</div>}
      </div>}
     </article>})}
    </div>
   </section>
   <aside className="space-y-4">
    <section className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="flex items-center gap-2 font-bold"><Flag className="h-4 w-4 text-blue-700"/>Next actions</h2><p className="mt-1 text-xs text-slate-500">The earliest incomplete tasks in this annual cycle.</p><div className="mt-3 space-y-2">{nextTasks.length?nextTasks.map(t=><button key={t.checklist_id} onClick={()=>{setSelectedStage(t.task_code?.slice(4,6)||'01');setExpandedTask(t.task_code||null);setActiveView('guide');}} className="w-full rounded-lg border p-3 text-left hover:bg-slate-50"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-900">{t.task}</span><ArrowRight className="h-3.5 w-3.5 shrink-0"/></div><div className="mt-1 text-[10px] text-slate-500">{t.owner_role||'Unassigned'} · {t.due_date||'Due date to confirm'}</div></button>):<div className="text-xs text-slate-500">No tasks pending. Confirm the cycle is fully reviewed before closure.</div>}</div></section>
    <section className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="flex items-center gap-2 font-bold"><CalendarDays className="h-4 w-4 text-blue-700"/>Key dates</h2><p className="mt-1 text-xs text-slate-500">Planning windows only; statutory dates must be verified.</p><div className="mt-3 space-y-3">{CYCLE_STAGES.map(s=><div key={s.code} className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600"/><div><div className="text-xs font-semibold">{s.period}</div><div className="text-[11px] text-slate-600">{s.name}</div></div></div>)}</div></section>
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="flex items-center gap-2 font-bold text-amber-900"><BookOpen className="h-4 w-4"/>A note about legal dates</h2><p className="mt-2 text-xs leading-5 text-amber-900">This 1 April–30 September timeline is a committee planning guide. It does not override statutory deadlines, extensions, the registered bye-laws or directions from the Registrar. The Secretary must verify the current requirements before issuing notices or filing documents.</p></section>
   </aside>
  </div>
  <div className="rounded-2xl border bg-white p-4 shadow-sm">
   <div className="flex flex-wrap items-center gap-2 border-b pb-3">{([['guide','AGM Closure Guide'],['controls','All Compliance Controls'],['calendar','Calendar'],['exceptions','Exceptions'] ] as const).map(([id,label])=><button key={id} onClick={()=>setActiveView(id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${activeView===id?'bg-blue-600 text-white':'bg-slate-100 text-slate-700'}`}>{label}</button>)}</div>
   {activeView==='guide'&&<p className="pt-3 text-xs text-slate-500">Select a stage above to view task instructions, checklist, owner and approval workflow.</p>}
   {activeView==='controls'&&<div className="pt-3"><div className="mb-2 text-sm font-semibold">Existing obligation library · {obligations.length} active controls</div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-2">Code</th><th className="p-2">Control / obligation</th><th className="p-2">Area</th><th className="p-2">Applicability</th><th className="p-2">Legal validation</th></tr></thead><tbody>{obligations.map(o=><tr key={o.obligation_id} className="border-t"><td className="p-2 font-bold">{o.obligation_code}</td><td className="p-2"><div className="font-semibold">{o.title}</div><div className="text-slate-500">{o.requirement_summary}</div></td><td className="p-2">{o.domain}</td><td className="p-2">{o.applicability}</td><td className="p-2">{o.legal_status}</td></tr>)}</tbody></table></div></div>}
   {activeView==='calendar'&&<div className="grid gap-3 pt-3 md:grid-cols-4">{CYCLE_STAGES.map(s=><div key={s.code} className="rounded-lg border p-3"><div className="text-xs font-bold">{s.period}</div><div className="mt-1 text-sm font-semibold">{s.name}</div><p className="mt-1 text-xs text-slate-500">{s.description}</p></div>)}</div>}
   {activeView==='exceptions'&&<div className="pt-3"><div className="text-sm font-semibold">Open exceptions</div>{allStageTasks.filter(t=>t.status==='Exception'||t.status==='Returned for Changes').length===0?<p className="mt-2 text-xs text-slate-500">No task exceptions recorded in this cycle.</p>:allStageTasks.filter(t=>t.status==='Exception'||t.status==='Returned for Changes').map(t=><div key={t.checklist_id} className="border-t py-2 text-xs">{t.task} · {t.status} · {t.remarks}</div>)}</div>}
  </div>
  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900"><AlertCircle className="mr-1 inline h-4 w-4"/>Legal caution: task windows are operational planning guidance, not certified statutory due dates. Legal applicability, notice periods, prescribed forms and filing deadlines must be confirmed against current MCS Act / Rules, registered society bye-laws and applicable Registrar directions before use.</div>
 </div>;
};

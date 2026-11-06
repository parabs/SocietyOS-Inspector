import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, BookOpen, CalendarDays, CheckCircle2, ChevronDown,
  ChevronRight, ClipboardCheck, Clock3, FileCheck2, FileText, Flag, RefreshCw,
  ShieldCheck, Users, Wallet, XCircle
} from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';

type Task = {
  checklist_id:string; financial_year:string; stage:string; work_area:string; task:string;
  status:string; owner_name:string|null; owner_role:string|null; due_date:string|null; completed_at?:string|null; updated_at?:string|null;
  evidence_reference:string|null; remarks:string|null; completed_by:string|null;
  task_code?:string; sequence_no?:number; guidance?:string; completion_criteria?:string;
  approver_role?:string; approval_status?:string; dependency_codes?:string[];
};
type Obligation = {obligation_id:string;obligation_code:string;title:string;domain:string;source_reference:string;requirement_summary:string;legal_status:string;applicability:string;owner_role:string|null;reviewer_role:string|null;active:boolean};
type Approval = {approval_id:string;checklist_id:string;decision:string;approver_role:string;approver_name:string;comments:string|null;decided_at:string};

const CYCLE_STAGES = [
 {code:'00',name:'Pre-Audit Readiness',period:'Before annual audit',title:'Confirm what is ready and what is missing',description:'A practical readiness check for system data, manual records and work that is not covered by Society OS.',icon:ClipboardCheck,owner:'Secretary / Treasurer',tasks:[
  ['Confirm statutory auditor appointment','Secretary','Chairman','Record whether the auditor has been appointed, the appointment date, committee resolution, consent and any required eligibility confirmation. If already appointed, mark this task Completed and attach the resolution / appointment letter.','Appointment resolution, appointment letter and auditor consent.','Appointment is recorded and supporting evidence is referenced.'],
  ['Review software coverage and manual work','Secretary','Chairman','List processes or records not maintained in Society OS, such as physical registers, external portals, paper vouchers, manual confirmations or legacy records. Add each gap as a separate custom task with an owner and due date.','System coverage / gap list and assigned action items.','Every out-of-system requirement has an owner, target date and evidence plan.'],
  ['Confirm source records and opening balances','Treasurer','Secretary','Check that the financial year source workbook, opening balances, transaction data, demand records and member / party masters are available and verified. Record unresolved differences; do not silently adjust source records.','Source workbook, opening balance verification and data-quality exceptions.','Source records are identified and material differences are logged.'],
  ['Confirm bank, cash and supporting documents are available','Treasurer','Chairman','Confirm all bank statements, cash records, bills, vouchers, receipt support and prior-year audit papers are collected or assigned for follow-up.','Document availability checklist and missing-document list.','Every missing record has a responsible person and expected date.']
 ]},
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
 {code:'07',name:'Finalise Accounts & AGM',period:'1–30 September',title:'Approve accounts, conduct the AGM and close the annual cycle',description:'Complete management responses, approve the AGM pack, issue the verified notice, conduct the meeting and track resolutions.',icon:Users,owner:'Chairman / Secretary',tasks:[
  ['Complete management responses and rectification plan','Secretary','Chairman','For each audit observation, document the society response, corrective action, owner and target date. Do not claim auditor closure without auditor confirmation.','Rectification tracker and supporting evidence.','Every observation is closed with evidence or carried forward transparently.'],
  ['Finalise audited accounts and AGM papers','Treasurer','Secretary','Prepare the final audited accounts, auditor report, committee report, budget / other agenda papers and member-facing summaries as applicable.','Final accounts and AGM paper pack.','Documents are internally checked and ready for notice / circulation.'],
  ['Obtain Treasurer, Secretary and Chairman review','Treasurer','Chairman','Route financial accuracy review to Treasurer, records and notice review to Secretary, and overall committee readiness review to Chairman. Record comments and return items needing correction.','Recorded reviews, comments and approval references.','All required reviews are recorded; returned items are resolved or disclosed.'],
  ['Verify AGM notice and service requirements','Secretary','Chairman','Confirm the applicable notice period, agenda, mode of service and required enclosures against current law and registered bye-laws before issuing.','Approved notice, agenda, dispatch / service proof and enclosures.','Notice and service evidence are reviewed and retained.'],
  ['Conduct AGM and record proceedings','Chairman','Secretary','Confirm quorum and attendance, present audited accounts and audit report, record questions and resolutions in the minutes.','Attendance, quorum record, minutes and resolutions.','Meeting record is complete and decisions are accurately captured.'],
  ['Complete AGM actions and annual closure','Secretary','Chairman','Assign owners and dates to AGM resolutions, circulate approved records and update the annual compliance tracker. Carry forward unresolved audit / rectification items.','Signed minutes, action register and closure checklist.','All resolutions have owners; unresolved matters remain open with target dates.']
 ]}
] as const;

type StageCode = typeof CYCLE_STAGES[number]['code'];
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
 const [selectedStage,setSelectedStage]=useState<StageCode>('00');
 const [activeView,setActiveView]=useState<'guide'|'controls'|'calendar'|'exceptions'>('guide');
 const [boardView,setBoardView]=useState<'kanban'|'list'|'calendar'>('kanban');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [expandedTask,setExpandedTask]=useState<string|null>(null);
 const [actor,setActor]=useState({name:'',role:'Treasurer'});
 const [approvalNote,setApprovalNote]=useState('');
 const [taskEdits,setTaskEdits]=useState<Record<string,Partial<Task>>>({});
 const [showAddTask,setShowAddTask]=useState(false);
 const [newTask,setNewTask]=useState({task:'',owner_role:'Secretary',approver_role:'Chairman',guidance:'',due_date:'',work_area:'Additional readiness item'});

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

 const stageTasks=useMemo(()=>new Map(CYCLE_STAGES.map(s=>[s.code,tasks.filter(t=>t.task_code?.startsWith(`AGM-${s.code}-`)||(s.code==='00'&&t.stage==='Pre-Audit Readiness'&&t.task_code?.startsWith('CUSTOM-')))])),[tasks]);
 const allStageTasks=CYCLE_STAGES.flatMap(s=>stageTasks.get(s.code)||[]);
 const progress=allStageTasks.length?Math.round(allStageTasks.filter(t=>['Completed','Not Applicable'].includes(t.status)).length/allStageTasks.length*100):0;
 const stageProgress=(code:StageCode)=>{const rows=stageTasks.get(code)||[];return {done:rows.filter(t=>['Completed','Not Applicable'].includes(t.status)).length,total:rows.length};};
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
      due_date:s.code==='00'?null:dateForCycle(fy,({'01':4,'02':5,'03':6,'04':7,'05':7,'06':8,'07':9} as Record<string,number>)[s.code],({'01':30,'02':31,'03':30,'04':15,'05':31,'06':31,'07':30} as Record<string,number>)[s.code])
     });
    });
   });
   const r=await (supabaseClient as any).from('financial_year_checklist').upsert(rows,{onConflict:'financial_year,task_code',ignoreDuplicates:true});
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
 const todayKey=new Date().toISOString().slice(0,10);
 const cutoffKey=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
 const isDone=(t:Task)=>['Completed','Not Applicable'].includes(t.status);
 const isOverdue=(t:Task)=>!isDone(t)&&t.due_date!==null&&t.due_date<todayKey;
 const pendingTasks=allStageTasks.filter(t=>!isDone(t)&&!['In Progress','Submitted','Awaiting Approval'].includes(t.status));
 const overdueTasks=pendingTasks.filter(isOverdue);
 const upcomingTasks=pendingTasks.filter(t=>!isOverdue(t));
 const inProgressTasks=allStageTasks.filter(t=>['In Progress','Submitted','Awaiting Approval'].includes(t.status));
 const completedTasks=allStageTasks.filter(t=>isDone(t)&&((t.completed_at||t.updated_at||'').slice(0,10)>=cutoffKey||!t.completed_at&&!t.updated_at));
 const boardColumns=[
  {id:'overdue',title:'Pending / Overdue',subtitle:`${overdueTasks.length} tasks need attention`,tone:'rose',tasks:overdueTasks},
  {id:'progress',title:'In Progress',subtitle:`${inProgressTasks.length} active tasks`,tone:'blue',tasks:inProgressTasks},
  {id:'upcoming',title:'Upcoming',subtitle:`${upcomingTasks.length} waiting to start`,tone:'indigo',tasks:upcomingTasks},
  {id:'completed',title:'Recently Completed',subtitle:`${completedTasks.length} completed tasks`,tone:'emerald',tasks:completedTasks}
 ];
 const activeStage=CYCLE_STAGES.find(s=>(stageTasks.get(s.code)||[]).some(t=>!isDone(t)))||CYCLE_STAGES[CYCLE_STAGES.length-1];
 const activeStageRows=stageTasks.get(activeStage.code)||[];
 const activeStageOpen=activeStageRows.filter(t=>!isDone(t));
 const overallProgress=allStageTasks.length?Math.round(allStageTasks.filter(isDone).length/allStageTasks.length*100):0;
 const stageState=(code:StageCode)=>{
  const rows=stageTasks.get(code)||[];
  const done=rows.filter(isDone).length;
  const active=rows.some(t=>['In Progress','Submitted','Awaiting Approval'].includes(t.status));
  return {done,total:rows.length,complete:rows.length>0&&done===rows.length,active};
 };
 const goToTask=(t:Task)=>{
  const code=t.task_code?.startsWith('CUSTOM-')?'00':t.task_code?.slice(4,6)||'00';
  setSelectedStage(code as StageCode);setExpandedTask(t.task_code||null);setActiveView('guide');
 };

 return <div className="mx-auto max-w-[1500px] space-y-5 pb-10">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700"><ShieldCheck className="h-4 w-4"/> Society OS · Compliance & Governance</div><h1 className="mt-1 text-2xl font-bold text-slate-900">AGM Closure Guide</h1><p className="mt-1 max-w-3xl text-sm text-slate-600">A step-by-step guide for the Chairman, Secretary and Treasurer to prepare accounts, complete audit work and close the AGM cycle from {cycleStart} to {cycleEnd}.</p></div>
   <div className="flex flex-wrap items-center gap-2"><select value={fy} onChange={e=>setFy(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold"><option value="">Select financial year</option>{FY_OPTIONS.map(x=><option key={x}>{x}</option>)}</select><button onClick={()=>void load()} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold"><RefreshCw className="mr-1 inline h-3.5 w-3.5"/>Refresh</button><button onClick={()=>void initialise()} disabled={busy} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Create / sync guide</button></div>
  </div>
  {error&&<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mr-2 inline h-4 w-4"/>{error}</div>}
  {message&&<div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
  <section className="rounded-2xl border bg-white p-4 shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><h2 className="flex items-center gap-2 text-base font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-blue-700"/>Annual Workflow – AGM Closure (1 Apr – 30 Sep)</h2><p className="mt-1 text-xs text-slate-500">Follow the stages in sequence. Select any stage to open its checklist and instructions.</p></div>
    <div className="min-w-[220px]"><div className="mb-1 flex justify-between text-xs"><span className="text-slate-500">Overall progress</span><strong>{overallProgress}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{width:`${overallProgress}%`}}/></div></div>
   </div>
   <div className="mt-5 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
    {CYCLE_STAGES.map((s,i)=>{const p=stageState(s.code);const active=activeStage.code===s.code;const Icon=s.icon;return <button key={s.code} onClick={()=>{setSelectedStage(s.code);setActiveView('guide');}} className={`relative rounded-xl border p-3 text-left transition ${active?'border-blue-500 bg-blue-50 ring-2 ring-blue-100':'border-slate-200 bg-white hover:bg-slate-50'}`}>
     <div className="flex items-center justify-between"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${p.complete?'bg-emerald-600 text-white':active?'bg-blue-600 text-white':'bg-slate-100 text-slate-600'}`}>{p.complete?<CheckCircle2 className="h-4 w-4"/>:String(i+1).padStart(2,'0')}</span><Icon className="h-4 w-4 text-slate-500"/></div>
     <div className="mt-2 text-xs font-bold leading-4 text-slate-900">{s.name}</div><div className="mt-1 text-[10px] text-slate-500">{s.period}</div>
     <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${p.complete?'bg-emerald-100 text-emerald-800':p.active?'bg-blue-100 text-blue-800':'bg-slate-100 text-slate-600'}`}>{p.complete?'Completed':p.active?'In Progress':p.done>0?'Partially Done':'Not Started'} · {p.done}/{p.total||s.tasks.length}</div>
    </button>})}
   </div>
  </section>
  <section className="rounded-2xl border bg-white p-4 shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold text-slate-900"><Flag className="h-4 w-4 text-blue-700"/>Current Work Queue</h2><p className="mt-1 text-xs text-slate-500">Open a task to see its guide, update progress or submit it for review.</p></div>
    <div className="flex gap-1 rounded-lg bg-slate-100 p-1">{([['kanban','Kanban'],['list','List'],['calendar','Calendar']] as const).map(([id,label])=><button key={id} onClick={()=>setBoardView(id)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${boardView===id?'bg-blue-600 text-white shadow-sm':'text-slate-600 hover:bg-white'}`}>{label}</button>)}</div>
   </div>
   {boardView==='kanban'&&<div className="mt-4 grid gap-3 xl:grid-cols-4">
    {boardColumns.map(col=><div key={col.id} className={`min-w-0 rounded-xl p-2 ${col.tone==='rose'?'bg-rose-50':col.tone==='blue'?'bg-blue-50':col.tone==='indigo'?'bg-indigo-50':'bg-emerald-50'}`}>
     <div className="mb-2 flex items-start justify-between gap-2 px-1"><div><h3 className={`text-xs font-bold ${col.tone==='rose'?'text-rose-800':col.tone==='blue'?'text-blue-800':col.tone==='indigo'?'text-indigo-800':'text-emerald-800'}`}>{col.title}</h3><p className="mt-0.5 text-[10px] text-slate-500">{col.subtitle}</p></div><span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold text-slate-700">{col.tasks.length}</span></div>
     <div className="space-y-2">{col.tasks.slice(0,5).map(t=><article key={t.checklist_id} className="rounded-lg border border-white bg-white p-3 shadow-sm">
      <button onClick={()=>goToTask(t)} className="w-full text-left text-xs font-semibold leading-4 text-slate-900 hover:text-blue-700">{t.task}</button>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500"><span>{t.owner_name||t.owner_role||'Unassigned'}</span><span>{t.due_date?new Date(t.due_date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'No due date'}</span></div>
      {col.id==='progress'&&<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{width:t.status==='Submitted'||t.status==='Awaiting Approval'?'85%':'50%'}}/></div>}
      <div className="mt-2 flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${statusClass(t.status)}`}>{isOverdue(t)?'Overdue':t.status}</span><select aria-label={`Update status for ${t.task}`} value={t.status} onChange={e=>void updateTask(t,{status:e.target.value})} className="max-w-[116px] rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px]"><option>Pending</option><option>In Progress</option><option>Awaiting Approval</option><option>Submitted</option><option>Completed</option><option>Returned for Changes</option><option>Exception</option><option>Not Applicable</option></select></div>
     </article>)}{col.tasks.length>5&&<button onClick={()=>setBoardView('list')} className="w-full py-2 text-[10px] font-semibold text-blue-700">+ {col.tasks.length-5} more · View all</button>}{col.tasks.length===0&&<div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-4 text-center text-[10px] text-slate-500">No tasks in this column</div>}</div>
    </div>)}
   </div>}
   {boardView==='list'&&<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="border-b bg-slate-50 text-slate-500"><tr><th className="p-2">Task</th><th className="p-2">Phase</th><th className="p-2">Owner</th><th className="p-2">Due</th><th className="p-2">Status</th><th className="p-2">Update</th></tr></thead><tbody>{allStageTasks.map(t=><tr key={t.checklist_id} className="border-b"><td className="p-2"><button onClick={()=>goToTask(t)} className="text-left font-semibold hover:text-blue-700">{t.task}</button></td><td className="p-2">{t.stage}</td><td className="p-2">{t.owner_name||t.owner_role||'Unassigned'}</td><td className="p-2">{t.due_date||'—'}</td><td className="p-2">{t.status}</td><td className="p-2"><select value={t.status} onChange={e=>void updateTask(t,{status:e.target.value})} className="rounded border px-2 py-1"><option>Pending</option><option>In Progress</option><option>Awaiting Approval</option><option>Submitted</option><option>Completed</option><option>Returned for Changes</option><option>Exception</option><option>Not Applicable</option></select></td></tr>)}</tbody></table></div>}
   {boardView==='calendar'&&<div className="mt-4 grid gap-2 md:grid-cols-3">{CYCLE_STAGES.map(s=><div key={s.code} className="rounded-lg border p-3"><div className="text-xs font-bold">{s.period} · {s.name}</div><div className="mt-2 space-y-1">{(stageTasks.get(s.code)||[]).map(t=><button key={t.checklist_id} onClick={()=>goToTask(t)} className="block w-full rounded bg-slate-50 p-2 text-left text-[11px]">{t.task} <span className="text-slate-500">· {t.status}</span></button>)}</div></div>)}</div>}
  </section>
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
     {selected.code==='00'&&selectedRows.filter(t=>t.task_code?.startsWith('CUSTOM-')).map(t=><article key={t.checklist_id} className="rounded-xl border border-dashed border-blue-300 bg-blue-50/40 p-3"><div className="flex flex-wrap items-center gap-2"><strong className="flex-1 text-sm">{t.task}</strong><span className="text-[10px] text-slate-500">Additional / out-of-system task</span></div><div className="mt-2 grid gap-2 md:grid-cols-4"><label className="text-[10px] font-semibold">Status<select value={t.status} onChange={e=>void updateTask(t,{status:e.target.value})} className="mt-1 w-full rounded border bg-white p-2 text-xs">{STATUS_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></label><label className="text-[10px] font-semibold">Assigned person<input defaultValue={t.owner_name||''} onBlur={e=>{if(e.target.value!==(t.owner_name||''))void updateTask(t,{owner_name:e.target.value});}} className="mt-1 w-full rounded border bg-white p-2 text-xs" placeholder="Owner name"/></label><label className="text-[10px] font-semibold">Due date<input type="date" defaultValue={t.due_date||''} onBlur={e=>{if(e.target.value!==(t.due_date||''))void updateTask(t,{due_date:e.target.value||null});}} className="mt-1 w-full rounded border bg-white p-2 text-xs"/></label><label className="text-[10px] font-semibold">Evidence reference<input defaultValue={t.evidence_reference||''} onBlur={e=>{if(e.target.value!==(t.evidence_reference||''))void updateTask(t,{evidence_reference:e.target.value});}} className="mt-1 w-full rounded border bg-white p-2 text-xs" placeholder="Document / file reference"/></label></div><p className="mt-2 text-xs text-slate-600">{t.guidance||t.remarks||'Add guidance and evidence details when updating this task.'}</p></article>)}
    </div>
   </section>
   <aside className="space-y-4">
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
     <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 font-bold"><Flag className="h-4 w-4 text-blue-700"/>Current Focus</h2><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-800">Stage ${activeStage.code}</span></div>
     <h3 className="mt-2 text-sm font-bold text-slate-900">${activeStage.name}</h3>
     <p className="mt-1 text-xs text-slate-500">${activeStage.description}</p>
     <div className="mt-3 text-xs font-bold text-slate-800">What needs to happen next?</div>
     <div className="mt-2 space-y-2">{activeStageOpen.slice(0,4).map((t,i)=><button key={t.checklist_id} onClick={()=>goToTask(t)} className="flex w-full items-start gap-2 rounded-lg border p-2 text-left hover:border-blue-300 hover:bg-blue-50/40"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-800">{i+1}</span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-900">{t.task}</span><span className="mt-1 block text-[10px] text-slate-500">${t.owner_name||t.owner_role||'Unassigned'} · ${t.due_date||'Due date to confirm'}</span></span><ArrowRight className="mt-1 h-3 w-3 shrink-0 text-slate-400"/></button>)}</div>
     {activeStageOpen.length===0&&<p className="mt-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">All tasks in this stage are complete. Move to the next stage after review.</p>}
     <button onClick={()=>{setSelectedStage(activeStage.code);setActiveView('guide');}} className="mt-3 w-full rounded-lg bg-blue-700 px-3 py-2.5 text-xs font-semibold text-white">Open stage checklist <ArrowRight className="ml-1 inline h-3.5 w-3.5"/></button>
    </section>
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="flex items-center gap-2 font-bold text-amber-900"><BookOpen className="h-4 w-4"/>Legal date reminder</h2><p className="mt-2 text-xs leading-5 text-amber-900">The 1 April–30 September dates are management planning windows. Verify statutory deadlines, notice periods, prescribed forms and registered bye-laws before treating any date as mandatory.</p></section>
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

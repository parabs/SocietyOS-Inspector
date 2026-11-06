import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDownToLine, BadgeCheck, BookOpenCheck, CheckCircle2, ChevronRight,
  ClipboardCheck, FileArchive, FileCheck2, FileQuestion, FileText, FolderOpen, LockKeyhole,
  Plus, RefreshCw, ShieldCheck, Upload, XCircle
} from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';
import { APP_CONFIG } from '../../config';

type Screen = 'annual-financial-review' | 'year-end-closure' | 'internal-audit' | 'statutory-audit-handover' | 'final-approval-freeze';
type Row = Record<string, any>;
type Props = { screen: Screen };

const STAGES = ['FY Review', 'Account Closure', 'Internal Audit', 'Statutory Audit', 'Final Approval'];
const CHECKLIST: Array<{stage:string;area:string;task:string}> = [
  {stage:'FY Review',area:'Books & Registers',task:'Confirm all receipts, payments, contra entries and journals are recorded'},
  {stage:'FY Review',area:'Member Receivables',task:'Review demand register, receipt allocations, member balances and advances'},
  {stage:'FY Review',area:'Expenses & Payables',task:'Review expense classification, vendor balances, advances and unpaid bills'},
  {stage:'FY Review',area:'Cash & Bank',task:'Complete monthly cash and bank reconciliations and investigate differences'},
  {stage:'FY Review',area:'Governance',task:'Review budgets, committee approvals, meeting minutes and statutory obligations'},
  {stage:'Account Closure',area:'Cut-off',task:'Verify transactions around 31 March and correct period classification through approved entries'},
  {stage:'Account Closure',area:'Reconciliations',task:'Reconcile bank, cash, member control, vendor control and other ledger balances'},
  {stage:'Account Closure',area:'Adjustments',task:'Identify accruals, prepayments, provisions, depreciation and prior-period items'},
  {stage:'Account Closure',area:'Statements',task:'Prepare trial balance, receipts and payments, income and expenditure and balance sheet workings'},
  {stage:'Account Closure',area:'Opening & Closing',task:'Reconcile party-wise and account-wise closing balances to next-year opening balances'},
  {stage:'Internal Audit',area:'Audit Programme',task:'Complete audit tests for opening balances, receipts, payments, demands, assets and controls'},
  {stage:'Internal Audit',area:'Evidence',task:'Verify bills, vouchers, bank statements, receipts, approvals and source traceability'},
  {stage:'Internal Audit',area:'Observations',task:'Record findings, risk ratings, management responses and corrective action owners'},
  {stage:'Internal Audit',area:'Sign-off',task:'Issue internal audit conclusion and sign-off with unresolved exceptions disclosed'},
  {stage:'Statutory Audit',area:'Handover',task:'Generate and quality-check the statutory auditor handover index and schedules'},
  {stage:'Statutory Audit',area:'Queries',task:'Log each external auditor query and track response, evidence and auditor conclusion'},
  {stage:'Statutory Audit',area:'Adjustments',task:'Track proposed audit adjustments separately and verify approved journal posting references'},
  {stage:'Final Approval',area:'Management',task:'Record Treasurer and Secretary certifications and Managing Committee approval'},
  {stage:'Final Approval',area:'AGM',task:'Record AGM adoption reference and date separately from audit completion'},
  {stage:'Final Approval',area:'Freeze',task:'Create immutable year-end snapshot and preserve any later restatement as a new version'}
];

const HANDOVER_DOCS: Array<{section:string;name:string;source:string}> = [
  {section:'01_FINANCIAL_STATEMENTS',name:'Trial Balance',source:'Trial balance / ledger reports'},
  {section:'01_FINANCIAL_STATEMENTS',name:'Income & Expenditure Account',source:'Income & Expenditure report'},
  {section:'01_FINANCIAL_STATEMENTS',name:'Receipts & Payments Account',source:'Receipts & Payments report'},
  {section:'01_FINANCIAL_STATEMENTS',name:'Balance Sheet and schedules',source:'Balance sheet working statement'},
  {section:'02_SUPPORTING_SCHEDULES',name:'Debtors / Member Outstanding Schedule',source:'Party-wise balance and member ledger'},
  {section:'02_SUPPORTING_SCHEDULES',name:'Creditors / Vendor Payables Schedule',source:'Vendor / payee ledger'},
  {section:'02_SUPPORTING_SCHEDULES',name:'Fixed Assets and Depreciation Schedule',source:'Asset register and depreciation workings'},
  {section:'02_SUPPORTING_SCHEDULES',name:'Advances, Deposits and Provisions Schedule',source:'Relevant ledgers and adjustment proposals'},
  {section:'03_ACCOUNTING_REGISTERS',name:'Cash Book and Bank Book',source:'Account-wise ledger'},
  {section:'03_ACCOUNTING_REGISTERS',name:'Receipt and Payment Registers',source:'Transaction registers'},
  {section:'03_ACCOUNTING_REGISTERS',name:'Demand Register and Receipt Allocation',source:'Demand register and allocation data'},
  {section:'03_ACCOUNTING_REGISTERS',name:'Journal and Adjustment Register',source:'Approved journal references'},
  {section:'04_INTERNAL_AUDIT',name:'Internal Audit Report and Sign-off',source:'Internal Audit sign-off'},
  {section:'04_INTERNAL_AUDIT',name:'Internal Audit Observation Register',source:'Audit observations'},
  {section:'04_INTERNAL_AUDIT',name:'Management Responses and Rectification Evidence',source:'Observation updates and evidence references'},
  {section:'05_RECONCILIATIONS',name:'Bank Reconciliation Statements',source:'Bank reconciliation'},
  {section:'05_RECONCILIATIONS',name:'Member / Party Balance Reconciliation',source:'Party balance register'},
  {section:'05_RECONCILIATIONS',name:'Unmatched and Unallocated Transactions',source:'Data quality and allocation exceptions'},
  {section:'06_GOVERNANCE',name:'Committee Minutes and Resolutions',source:'Governance document repository'},
  {section:'06_GOVERNANCE',name:'Budget and Approval Records',source:'Budget and approval records'},
  {section:'06_GOVERNANCE',name:'AGM / SGM Notice, Minutes and Adoption',source:'Meeting records'},
  {section:'07_SUPPORTING_EVIDENCE',name:'Bank Statements, Bills, Vouchers and Receipts',source:'Evidence repository'},
  {section:'07_SUPPORTING_EVIDENCE',name:'Contracts, Insurance and Statutory Challans',source:'Evidence repository'},
  {section:'08_AUDIT_QUERIES',name:'Statutory Auditor Query and Response Register',source:'Audit query tracker'},
  {section:'08_AUDIT_QUERIES',name:'Audit Adjustment and Posting Register',source:'Audit adjustment proposals'}
];

const SCREENS: Record<Screen, {title:string;description:string;tab:string}> = {
  'annual-financial-review': {title:'Annual Financial Review',description:'Periodic financial health review and management oversight before formal account closure.',tab:'Review'},
  'year-end-closure': {title:'Year-End Account Closure',description:'Cut-off, reconciliations, closing schedules and provisional financial statements.',tab:'Closure'},
  'internal-audit': {title:'Internal Audit',description:'Independent testing, observations, management responses and documented internal-audit sign-off.',tab:'Internal Audit'},
  'statutory-audit-handover': {title:'Statutory Audit Handover',description:'A versioned, indexed and exception-transparent handover workspace for the external statutory auditor.',tab:'Handover'},
  'final-approval-freeze': {title:'Final Approval & Freeze',description:'Separate statutory completion, committee approval, AGM adoption and immutable year-end snapshot.',tab:'Approvals'}
};

const money = (v:number) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v)||0);
const dateForFY = (fy:string) => {
  const match = fy.match(/(20\d{2})\s*[-–/]\s*(\d{2,4})/);
  if (!match) return {start:'2018-04-01',end:'2019-03-31'};
  const y = Number(match[1]);
  const endYear = match[2].length===2 ? 2000+Number(match[2]) : Number(match[2]);
  return {start:`${y}-04-01`,end:`${endYear}-03-31`};
};
const exportJson = (name:string,data:unknown) => {
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=name; a.click();
  URL.revokeObjectURL(url);
};

export const FinancialYearGovernance: React.FC<Props> = ({screen}) => {
  const config = SCREENS[screen];
  const [fy,setFy] = useState('FY 2018-19');
  const [tab,setTab] = useState(config.tab);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');
  const [review,setReview] = useState<Row|null>(null);
  const [checklist,setChecklist] = useState<Row[]>([]);
  const [observations,setObservations] = useState<Row[]>([]);
  const [updates,setUpdates] = useState<Row[]>([]);
  const [queries,setQueries] = useState<Row[]>([]);
  const [adjustments,setAdjustments] = useState<Row[]>([]);
  const [packages,setPackages] = useState<Row[]>([]);
  const [documents,setDocuments] = useState<Row[]>([]);
  const [approvals,setApprovals] = useState<Row[]>([]);
  const [snapshots,setSnapshots] = useState<Row[]>([]);
  const [transactions,setTransactions] = useState<Row[]>([]);
  const [demands,setDemands] = useState<Row[]>([]);
  const [bankBalances,setBankBalances] = useState<Row[]>([]);
  const [form,setForm] = useState({title:'',area:'Receipts & Payments',finding:'',risk:'Medium',recommendation:'',raisedBy:'Internal Auditor',targetDate:'',managementResponse:'',correctiveAction:'',referenceId:''});
  const [queryForm,setQueryForm] = useState({queryText:'',referenceArea:'Financial Statements',referenceId:'',raisedBy:'Statutory Auditor',priority:'Normal'});
  const [adjustmentForm,setAdjustmentForm] = useState({type:'Other',debit:'',credit:'',amount:'',narration:'',reference:''});
  const [signoff,setSignoff] = useState({name:'',role:'Internal Auditor',attestation:'I have completed the internal audit procedures recorded in this workspace. The observations and unresolved exceptions known to me are disclosed in the handover manifest.',opinion:'Completed with exceptions',remarks:''});
  const [approvalForm,setApprovalForm] = useState({name:'',role:'Treasurer',reference:'',attestation:''});
  const [issueTo,setIssueTo] = useState('');
  const [selectedPackage,setSelectedPackage] = useState<string|null>(null);
  const [docRefs,setDocRefs] = useState<Record<string,string>>({});

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const db:any = supabaseClient;
      const fyDatesForQuery = dateForFY(fy);
      const requests = await Promise.all([
        db.from('financial_year_reviews').select('*').eq('financial_year',fy).maybeSingle(),
        db.from('financial_year_checklist').select('*').eq('financial_year',fy).order('stage').order('work_area'),
        db.from('audit_observations').select('*').eq('financial_year',fy).order('created_at',{ascending:false}),
        db.from('audit_queries').select('*').eq('financial_year',fy).order('created_at',{ascending:false}),
        db.from('audit_adjustment_proposals').select('*').eq('financial_year',fy).order('created_at',{ascending:false}),
        db.from('audit_handover_packages').select('*').eq('financial_year',fy).order('package_version',{ascending:false}),
        db.from('closure_approvals').select('*').eq('financial_year',fy).order('signed_at',{ascending:false}),
        db.from('financial_year_snapshots').select('*').eq('financial_year',fy).order('snapshot_version',{ascending:false}),
        db.from('transactions').select('*').gte('transaction_date',fyDatesForQuery.start).lt('transaction_date',new Date(new Date(fyDatesForQuery.end+'T00:00:00').getTime()+86400000).toISOString().slice(0,10)).limit(10000),
        db.from('demand_register').select('*').eq('financial_year',fy).limit(10000),
        db.from('account_monthly_balance').select('*').eq('financial_year',fy),
      ]);
      const labels=['review','checklist','observations','queries','adjustments','packages','approvals','snapshots','transactions','demands','bank'];
      const failures=requests.map((r:any,i:number)=>r.error?{table:labels[i],message:r.error.message}:null).filter(Boolean);
      if (failures.length) throw new Error(failures.map((x:any)=>x.table+': '+x.message).join(' | '));
      setReview(requests[0].data); setChecklist(requests[1].data||[]); setObservations(requests[2].data||[]);
      setQueries(requests[3].data||[]); setAdjustments(requests[4].data||[]); setPackages(requests[5].data||[]);
      setApprovals(requests[6].data||[]); setSnapshots(requests[7].data||[]); setTransactions(requests[8].data||[]);
      setDemands(requests[9].data||[]); setBankBalances(requests[10].data||[]);
      const packageIds=(requests[5].data||[]).map((p:Row)=>p.handover_id);
      if(packageIds.length){
        const d=await db.from('audit_handover_documents').select('*').in('handover_id',packageIds).order('section_code');
        if(d.error) throw d.error; setDocuments(d.data||[]);
      } else setDocuments([]);
      const obsIds=(requests[2].data||[]).map((o:Row)=>o.observation_id);
      if(obsIds.length){
        const u=await db.from('audit_observation_updates').select('*').in('observation_id',obsIds).order('created_at',{ascending:false});
        if(u.error) throw u.error; setUpdates(u.data||[]);
      } else setUpdates([]);
    } catch(e:any) { setError(e?.message||'Unable to load the financial-year workflow. Apply the audit workflow database migration and verify access permissions.'); }
    finally { setBusy(false); }
  },[fy]);

  useEffect(()=>{setTab(config.tab);},[screen,config.tab]);
  useEffect(()=>{void load();},[load]);

  const totals = useMemo(()=>{
    const receipts=transactions.filter(t=>String(t.transaction_type||'').toLowerCase()==='receipt').reduce((s,t)=>s+Number(t.amount||0),0);
    const payments=transactions.filter(t=>String(t.transaction_type||'').toLowerCase()==='payment').reduce((s,t)=>s+Number(t.amount||0),0);
    const demand=demands.reduce((s,d)=>s+Number(d.demand_amount??d.total_demand??0),0);
    return {receipts,payments,demand,transactions:transactions.length,demands:demands.length};
  },[transactions,demands]);
  const openObs=observations.filter(o=>!['Closed','Accepted Risk'].includes(o.status));
  const criticalObs=openObs.filter(o=>['Critical','High'].includes(o.risk_level));
  const openQueries=queries.filter(q=>!['Accepted','Closed'].includes(q.status));
  const pendingChecklist=checklist.filter(c=>c.status==='Pending'||c.status==='In Progress');
  const internalSigned=approvals.some(a=>a.approval_stage==='Internal Audit Sign-off'&&['Approved','Approved with Exceptions'].includes(a.decision));
  const committeeApproved=approvals.some(a=>a.approval_stage==='Committee Approval'&&['Approved','Approved with Exceptions'].includes(a.decision));
  const agmAdopted=approvals.some(a=>a.approval_stage==='AGM Adoption'&&['Approved','Approved with Exceptions'].includes(a.decision));
  const statutoryComplete=approvals.some(a=>a.approval_stage==='Statutory Audit Completion'&&['Approved','Approved with Exceptions'].includes(a.decision));
  const latestPackage=packages[0];
  const latestSnapshot=snapshots[0];
  const fyDates=dateForFY(fy);

  const log = async (entityType:string,entityId:string|null,action:string,details:Row={}) => {
    const r=await (supabaseClient as any).from('audit_workflow_activity').insert({financial_year:fy,entity_type:entityType,entity_id:entityId,action,actor_name:approvalForm.name||signoff.name||'Society OS User',actor_role:approvalForm.role||signoff.role,details});
    if(r.error) throw r.error;
  };
  const initialize = async () => {
    setBusy(true);setError('');setMessage('');
    try{
      const db:any=supabaseClient;
      const r=await db.from('financial_year_reviews').upsert({financial_year:fy,period_start:fyDates.start,period_end:fyDates.end,status:'In Progress'},{onConflict:'financial_year'}).select().single();
      if(r.error)throw r.error;
      const rows=CHECKLIST.map(c=>({financial_year:fy,stage:c.stage,work_area:c.area,task:c.task,status:'Pending'}));
      const c=await db.from('financial_year_checklist').upsert(rows,{onConflict:'financial_year,stage,work_area,task',ignoreDuplicates:true});
      if(c.error)throw c.error;
      await log('Financial Year Review',r.data.review_id,'Workspace Initialized',{checklist_items:rows.length});
      setMessage('FY workspace initialized. Existing checklist progress was preserved.'); await load();
    }catch(e:any){setError(e.message||'Unable to initialize workspace.');}finally{setBusy(false);}
  };
  const updateChecklist = async (item:Row,status:string) => {
    try{
      const r=await (supabaseClient as any).from('financial_year_checklist').update({status,completed_at:status==='Completed'?new Date().toISOString():null,completed_by:status==='Completed'?'Society OS User':null,updated_at:new Date().toISOString()}).eq('checklist_id',item.checklist_id);
      if(r.error)throw r.error; await log('Checklist',item.checklist_id,'Checklist Status Changed',{task:item.task,status}); await load();
    }catch(e:any){setError(e.message||'Could not update checklist item.');}
  };
  const createObservation = async (e:React.FormEvent) => {
    e.preventDefault(); if(!form.title.trim()||!form.finding.trim())return;
    setBusy(true);
    try{
      const no='OBS-'+fy.replace(/[^0-9]/g,'').slice(-4)+'-'+String(observations.length+1).padStart(4,'0');
      const payload={observation_no:no,financial_year:fy,audit_stage:tab==='Review'?'FY Review':tab==='Internal Audit'?'Internal Audit':'Statutory Audit',audit_area:form.area,title:form.title, finding:form.finding,risk_level:form.risk,recommendation:form.recommendation,raised_by:form.raisedBy,target_date:form.targetDate||null,reference_id:form.referenceId||null};
      const r=await (supabaseClient as any).from('audit_observations').insert(payload).select().single();if(r.error)throw r.error;
      await log('Observation',r.data.observation_id,'Observation Raised',{observation_no:no,risk:form.risk});
      setForm({...form,title:'',finding:'',recommendation:'',targetDate:'',referenceId:''});setMessage('Observation recorded with a permanent reference.');await load();
    }catch(e:any){setError(e.message||'Unable to save observation.');}finally{setBusy(false);}
  };
  const addObservationUpdate = async (o:Row,type:string,text:string) => {
    if(!text.trim())return;
    try{
      const r=await (supabaseClient as any).from('audit_observation_updates').insert({observation_id:o.observation_id,update_type:type,update_text:text,actor_name:approvalForm.name||signoff.name||'Society OS User',actor_role:approvalForm.role||signoff.role});
      if(r.error)throw r.error;
      const patch:any={updated_at:new Date().toISOString()};
      if(type==='Management Response') {patch.management_response=text;patch.status='Management Responded';}
      if(type==='Corrective Action') {patch.corrective_action=text;patch.status='Action In Progress';}
      if(type==='Auditor Review') patch.auditor_conclusion=text;
      const u=await (supabaseClient as any).from('audit_observations').update(patch).eq('observation_id',o.observation_id);if(u.error)throw u.error;
      await log('Observation',o.observation_id,type+' Added',{text});await load();
    }catch(e:any){setError(e.message||'Unable to add observation update.');}
  };
  const changeObservationStatus = async (o:Row,status:string) => {
    try{
      const patch:any={status,updated_at:new Date().toISOString()};
      if(status==='Closed'){patch.closed_at=new Date().toISOString();patch.closed_by=approvalForm.name||signoff.name||'Society OS User';}
      const r=await (supabaseClient as any).from('audit_observations').update(patch).eq('observation_id',o.observation_id);if(r.error)throw r.error;
      await log('Observation',o.observation_id,'Observation Status Changed',{status});await load();
    }catch(e:any){setError(e.message||'Unable to change observation status.');}
  };
  const createQuery = async (e:React.FormEvent) => {
    e.preventDefault();if(!queryForm.queryText.trim())return;setBusy(true);
    try{
      const no='QRY-'+fy.replace(/[^0-9]/g,'').slice(-4)+'-'+String(queries.length+1).padStart(4,'0');
      const r=await (supabaseClient as any).from('audit_queries').insert({query_no:no,financial_year:fy,raised_by:queryForm.raisedBy,reference_area:queryForm.referenceArea,reference_id:queryForm.referenceId||null,query_text:queryForm.queryText,priority:queryForm.priority}).select().single();
      if(r.error)throw r.error;await log('Auditor Query',r.data.query_id,'Query Raised',{query_no:no});setQueryForm({...queryForm,queryText:'',referenceId:''});await load();
    }catch(e:any){setError(e.message||'Unable to save auditor query.');}finally{setBusy(false);}
  };
  const respondQuery = async (q:Row) => {
    const response=window.prompt('Enter management response. Add evidence reference in the response if applicable:');
    if(!response?.trim())return;
    const r=await (supabaseClient as any).from('audit_queries').update({management_response:response,status:'Response Submitted',responded_by:approvalForm.name||'Management',responded_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('query_id',q.query_id);
    if(r.error){setError(r.error.message);return;}await log('Auditor Query',q.query_id,'Management Response Submitted',{response});await load();
  };
  const concludeQuery = async (q:Row) => {
    const conclusion=window.prompt('Auditor conclusion / next action:');
    if(!conclusion?.trim())return;
    const choice=window.prompt('Status: Accepted, Further Information Required, or Closed','Closed');
    const status=['Accepted','Further Information Required','Closed'].includes(choice||'')?choice:'Closed';
    const r=await (supabaseClient as any).from('audit_queries').update({auditor_conclusion:conclusion,status,closed_at:status==='Closed'?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('query_id',q.query_id);
    if(r.error){setError(r.error.message);return;}
    await log('Auditor Query',q.query_id,'Auditor Conclusion Recorded',{conclusion,status});await load();
  };
  const acknowledgeHandover = async (p:Row) => {
    const by=window.prompt('Name of statutory auditor / firm representative acknowledging receipt:');
    if(!by?.trim())return;
    const r=await (supabaseClient as any).from('audit_handover_packages').update({status:'Auditor Acknowledged',acknowledged_by:by,acknowledged_at:new Date().toISOString()}).eq('handover_id',p.handover_id);
    if(r.error){setError(r.error.message);return;}
    await log('Handover Package',p.handover_id,'Auditor Acknowledged',{acknowledged_by:by});await load();
  };
  const updateAdjustment = async (a:Row,action:'decision'|'journal'|'verify') => {
    const patch:Row={updated_at:new Date().toISOString()};
    if(action==='decision'){
      const v=window.prompt('Management decision: Accepted, Rejected or Modified','Accepted');
      if(!['Accepted','Rejected','Modified'].includes(v||''))return;
      patch.management_decision=v;
      patch.approval_reference=window.prompt('Approval reference (if any):')||null;
    } else if(action==='journal'){
      const v=window.prompt('Posted journal / voucher reference. This only records the reference; it does not post a journal:');
      if(!v?.trim())return;
      patch.posted_journal_reference=v;patch.posted_at=new Date().toISOString();
    } else {
      patch.auditor_verified=true;
      patch.auditor_remarks=window.prompt('Auditor verification remarks:')||'Verified by auditor';
    }
    const r=await (supabaseClient as any).from('audit_adjustment_proposals').update(patch).eq('proposal_id',a.proposal_id);
    if(r.error){setError(r.error.message);return;}
    await log('Adjustment Proposal',a.proposal_id,'Adjustment Workflow Updated',patch);await load();
  };
  const createAdjustment = async (e:React.FormEvent) => {
    e.preventDefault();if(!adjustmentForm.amount||!adjustmentForm.narration.trim())return;setBusy(true);
    try{
      const no='ADJ-'+fy.replace(/[^0-9]/g,'').slice(-4)+'-'+String(adjustments.length+1).padStart(4,'0');
      const r=await (supabaseClient as any).from('audit_adjustment_proposals').insert({proposal_no:no,financial_year:fy,proposed_by:approvalForm.name||'Management',proposed_by_role:approvalForm.role,adjustment_type:adjustmentForm.type,account_debit:adjustmentForm.debit||null,account_credit:adjustmentForm.credit||null,amount:Number(adjustmentForm.amount),narration:adjustmentForm.narration,supporting_reference:adjustmentForm.reference||null}).select().single();
      if(r.error)throw r.error;await log('Adjustment Proposal',r.data.proposal_id,'Adjustment Proposed',{proposal_no:no,amount:Number(adjustmentForm.amount)});
      setAdjustmentForm({...adjustmentForm,amount:'',narration:'',reference:''});await load();
    }catch(e:any){setError(e.message||'Unable to create adjustment proposal.');}finally{setBusy(false);}
  };
  const createSignoff = async () => {
    if(!signoff.name.trim()||!signoff.attestation.trim()){setError('Internal auditor name and attestation are required.');return;}
    setBusy(true);setError('');
    try{
      const r=await (supabaseClient as any).from('closure_approvals').insert({financial_year:fy,approval_stage:'Internal Audit Sign-off',decision:signoff.opinion==='Completed without exceptions'?'Approved':'Approved with Exceptions',signatory_name:signoff.name,signatory_role:signoff.role,attestation:signoff.attestation,exception_count:openObs.length}).select().single();
      if(r.error)throw r.error;
      await log('Internal Audit Sign-off',r.data.approval_id,'Internal Audit Signed Off',{opinion:signoff.opinion,open_observations:openObs.length,critical_observations:criticalObs.length,remarks:signoff.remarks});
      setMessage('Internal audit sign-off recorded. It is now part of the statutory handover trail.');await load();
    }catch(e:any){setError(e.message||'Unable to record internal audit sign-off.');}finally{setBusy(false);}
  };
  const createHandover = async () => {
    if(!internalSigned){setError('Internal Audit Sign-off is mandatory before creating the statutory auditor handover.');return;}
    setBusy(true);setError('');
    try{
      const version=(packages.reduce((m,p)=>Math.max(m,Number(p.package_version)||0),0))+1;
      const manifest={
        society:APP_CONFIG.societyName,registration_no:APP_CONFIG.registrationNo,financial_year:fy,period:fyDates,
        generated_at:new Date().toISOString(),
        source_data:{transaction_count:totals.transactions,receipt_total:totals.receipts,payment_total:totals.payments,demand_count:totals.demands,demand_total:totals.demand,bank_month_rows:bankBalances.length},
        audit_status:{internal_audit_signed:internalSigned,open_observations:openObs.length,critical_or_high_open:criticalObs.length,open_statutory_queries:openQueries.length,unposted_adjustment_proposals:adjustments.filter(a=>a.management_decision==='Accepted'&&!a.posted_journal_reference).length},
        approvals:approvals.map(a=>({stage:a.approval_stage,decision:a.decision,signatory:a.signatory_name,signed_at:a.signed_at,reference:a.approval_reference})),
        disclaimer:'This manifest is an index and control summary. It does not represent generated or attached financial statements. Each schedule must be attached or explicitly disclosed as pending/not applicable.'
      };
      const disclosure=openObs.map(o=>({observation_no:o.observation_no,title:o.title,risk_level:o.risk_level,status:o.status,management_response:o.management_response||null}));
      const p=await (supabaseClient as any).from('audit_handover_packages').insert({financial_year:fy,package_version:version,status:'Internal Audit Signed',prepared_by:approvalForm.name||'Treasurer',internal_auditor_name:signoff.name,internal_auditor_signed_at:approvals.find(a=>a.approval_stage==='Internal Audit Sign-off')?.signed_at||new Date().toISOString(),internal_audit_opinion:signoff.opinion,internal_audit_remarks:signoff.remarks,handover_manifest:manifest,exception_disclosure:disclosure}).select().single();
      if(p.error)throw p.error;
      const docs=HANDOVER_DOCS.map(d=>({handover_id:p.data.handover_id,section_code:d.section,document_name:d.name,source_module:d.source,document_status:'Pending'}));
      const d=await (supabaseClient as any).from('audit_handover_documents').insert(docs);if(d.error)throw d.error;
      await log('Handover Package',p.data.handover_id,'Handover Package Generated',{version,document_count:docs.length,open_observations:openObs.length});
      setSelectedPackage(p.data.handover_id);setMessage('Handover index created. Attach or disclose each schedule before issue.');await load();
    }catch(e:any){setError(e.message||'Unable to generate handover package.');}finally{setBusy(false);}
  };
  const uploadHandoverFile = async (d:Row,file:File) => {
    if(file.size>25*1024*1024){setError('Maximum file size is 25 MB.');return;}
    setBusy(true);setError('');
    try{
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      const path=fy.replace(/[^a-zA-Z0-9_-]/g,'_')+'/'+d.handover_id+'/'+d.document_id+'_'+safeName;
      const upload=await supabaseClient.storage.from('audit-evidence').upload(path,file,{upsert:true,contentType:file.type||'application/octet-stream'});
      if(upload.error)throw upload.error;
      const update=await (supabaseClient as any).from('audit_handover_documents').update({file_path:path,document_status:'Attached'}).eq('document_id',d.document_id);
      if(update.error)throw update.error;
      await log('Handover Document',d.document_id,'Evidence Uploaded',{path,file_name:file.name,size:file.size});
      setMessage('Evidence uploaded to the private audit-evidence store.');await load();
    }catch(e:any){setError(e.message||'Evidence upload failed.');}finally{setBusy(false);}
  };
  const openHandoverFile = async (d:Row) => {
    if(!d.file_path)return;
    const result=await supabaseClient.storage.from('audit-evidence').createSignedUrl(d.file_path,300);
    if(result.error){setError(result.error.message);return;}
    window.open(result.data.signedUrl,'_blank','noopener,noreferrer');
  };
  const updateDoc = async (d:Row,status:string,reference?:string) => {
    const r=await (supabaseClient as any).from('audit_handover_documents').update({document_status:status,file_path:reference??d.file_path,generated_at:status==='Generated'?new Date().toISOString():d.generated_at}).eq('document_id',d.document_id);
    if(r.error){setError(r.error.message);return;}await log('Handover Document',d.document_id,'Document Status Changed',{status,reference});await load();
  };
  const issueHandover = async () => {
    if(!latestPackage||!issueTo.trim()){setError('Select a package and enter the statutory auditor / firm recipient.');return;}
    if(!internalSigned){setError('Internal audit sign-off is missing.');return;}
    const incomplete=documents.filter(d=>d.handover_id===latestPackage.handover_id&&!['Generated','Attached','Not Applicable','Exception Disclosed'].includes(d.document_status));
    if(incomplete.length){setError(`${incomplete.length} handover items are still Pending. Mark each as attached, not applicable or exception disclosed before issue.`);return;}
    const r=await (supabaseClient as any).from('audit_handover_packages').update({status:'Issued',issued_to:issueTo,issued_at:new Date().toISOString()}).eq('handover_id',latestPackage.handover_id);
    if(r.error){setError(r.error.message);return;}await log('Handover Package',latestPackage.handover_id,'Issued to Statutory Auditor',{recipient:issueTo});await load();
  };
  const recordApproval = async (stage:string) => {
    if(stage==='Statutory Audit Completion'&&!packages.some(p=>['Issued','Auditor Acknowledged'].includes(p.status))){setError('Issue the signed statutory auditor handover before recording audit completion.');return;}
    if(!approvalForm.name.trim()||!approvalForm.attestation.trim()){setError('Signatory name and attestation are required.');return;}
    if(stage==='Committee Approval'&&!statutoryComplete){setError('Record statutory audit completion before committee approval.');return;}
    if(stage==='AGM Adoption'&&!committeeApproved){setError('Record Managing Committee approval before AGM adoption.');return;}
    setBusy(true);
    try{
      const decision='Approved';
      const r=await (supabaseClient as any).from('closure_approvals').insert({financial_year:fy,approval_stage:stage,decision,signatory_name:approvalForm.name,signatory_role:approvalForm.role,approval_reference:approvalForm.reference||null,attestation:approvalForm.attestation,exception_count:openObs.length+openQueries.length}).select().single();
      if(r.error)throw r.error;await log('Closure Approval',r.data.approval_id,stage,{decision,reference:approvalForm.reference});setMessage(stage+' recorded.');await load();
    }catch(e:any){setError(e.message||'Unable to record approval.');}finally{setBusy(false);}
  };
  const freezeSnapshot = async () => {
    if(!committeeApproved||!agmAdopted){setError('Committee approval and AGM adoption are both required before freeze.');return;}
    if(!statutoryComplete){setError('Statutory audit completion must be recorded before freeze.');return;}
    setBusy(true);
    try{
      const version=snapshots.reduce((m,s)=>Math.max(m,Number(s.snapshot_version)||0),0)+1;
      const data={financial_year:fy,as_of_date:fyDates.end,transactions,demands,bankBalances,observations,queries,adjustments,approvals,source_totals:totals,disclosure:{open_observations:openObs.length,open_queries:openQueries.length,critical_or_high_open:criticalObs.length}};
      const r=await (supabaseClient as any).from('financial_year_snapshots').insert({financial_year:fy,snapshot_version:version,snapshot_status:'Frozen',as_of_date:fyDates.end,snapshot_data:data,created_by_name:approvalForm.name||'Society OS'}).select().single();
      if(r.error)throw r.error;
      await log('Financial Year Snapshot',r.data.snapshot_id,'Financial Year Frozen',{version,as_of_date:fyDates.end});
      setMessage('Immutable snapshot created. Any subsequent correction must be a separately approved restatement.');await load();
    }catch(e:any){setError(e.message||'Unable to freeze financial year.');}finally{setBusy(false);}
  };
  const packageExport = (p:Row) => {
    const data={package:p,documents:documents.filter(d=>d.handover_id===p.handover_id),source_registers:{transactions,demand_register:demands,account_monthly_balance:bankBalances},internal_audit_observations:observations,observation_updates:updates,auditor_queries:queries,adjustment_proposals:adjustments,approvals,financial_year_summary:totals,disclosure:{open_observations:openObs,open_queries:openQueries,critical_or_high_open:criticalObs}};
    exportJson(`Statutory_Audit_Handover_${fy.replace(/\s/g,'_')}_v${p.package_version}.json`,data);
  };

  const tabs=['Review','Closure','Internal Audit','Handover','Queries & Adjustments','Approvals'];
  const completed=checklist.filter(c=>['Completed','Not Applicable','Exception Disclosed'].includes(c.status)).length;
  const readiness=checklist.length?Math.round(completed/checklist.length*100):0;

  return <div className="max-w-7xl mx-auto space-y-5 pb-10">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div><div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wider"><BookOpenCheck className="w-4 h-4"/> Financial Year Governance</div><h1 className="text-2xl font-bold text-slate-900 mt-1">{config.title}</h1><p className="text-sm text-slate-600 mt-1 max-w-3xl">{config.description}</p></div>
      <div className="flex items-center gap-2 flex-wrap"><label className="text-xs font-semibold text-slate-600">Financial Year</label><select value={fy} onChange={e=>setFy(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"><option>FY 2018-19</option><option>FY 2019-20</option><option>FY 2020-21</option><option>FY 2021-22</option><option>FY 2022-23</option><option>FY 2023-24</option><option>FY 2024-25</option><option>FY 2025-26</option><option>FY 2026-27</option></select><button onClick={()=>void load()} disabled={busy} className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><RefreshCw className="w-4 h-4"/> Refresh</button></div>
    </div>
    {error&&<div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 p-3 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/><span>{error}</span></div>}
    {message&&<div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 p-3 text-sm">{message}</div>}
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
      {[['Transactions',totals.transactions.toLocaleString('en-IN'),'Database rows'],['Receipt total',money(totals.receipts),'Selected FY'],['Payment total',money(totals.payments),'Selected FY'],['Open audit observations',openObs.length,`${criticalObs.length} critical / high`],['Checklist readiness',`${readiness}%`,`${completed} / ${checklist.length} completed or disclosed`]].map(([label,value,sub])=><div key={label} className="bg-white border border-slate-200 rounded-xl p-4"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-bold text-slate-900 mt-1">{value}</div><div className="text-[11px] text-slate-500 mt-1">{sub}</div></div>)}
    </div>
    <div className="bg-white border border-slate-200 rounded-xl p-2 flex gap-1 overflow-x-auto">{tabs.map(t=><button key={t} onClick={()=>setTab(t)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${tab===t?'bg-slate-900 text-white':'text-slate-600 hover:bg-slate-100'}`}>{t}</button>)}</div>
    {!review&&<div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><div className="font-semibold text-blue-950 text-sm">Initialize this financial-year workspace</div><p className="text-xs text-blue-800 mt-1">Creates the review record and standard checklist. It does not alter accounting transactions or balances.</p></div><button disabled={busy} onClick={()=>void initialize()} className="bg-blue-700 text-white rounded-lg px-4 py-2 text-xs font-semibold">Initialize FY Workflow</button></div>}
    {tab==='Review'&&<section className="space-y-4">
      <div className="bg-white border rounded-xl p-4"><h2 className="font-semibold text-slate-900">Financial review snapshot</h2><p className="text-xs text-slate-500 mt-1">Source totals are read from existing FY transactions and demand records. These are control totals, not a certified trial balance.</p><div className="grid md:grid-cols-3 gap-3 mt-4"><div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Demand register total</div><div className="text-lg font-bold">{money(totals.demand)}</div><div className="text-[11px] text-slate-500">{totals.demands} demand records</div></div><div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Receipts recorded</div><div className="text-lg font-bold">{money(totals.receipts)}</div></div><div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">Payments recorded</div><div className="text-lg font-bold">{money(totals.payments)}</div></div></div></div>
      <ChecklistPanel items={checklist.filter(c=>c.stage==='FY Review')} onChange={updateChecklist}/>
    </section>}
    {tab==='Closure'&&<section className="space-y-4"><div className="bg-white border rounded-xl p-4"><h2 className="font-semibold">Year-end closure control</h2><p className="text-xs text-slate-500 mt-1">The selected year ends on {fyDates.end}. Keep provisional and approved closing figures distinct; missing or unverified opening balances must never be treated as zero.</p><div className="grid md:grid-cols-3 gap-3 mt-4"><StatusTile label="Bank / account-month rows" value={bankBalances.length} note="Rows returned from account_monthly_balance"/><StatusTile label="Demand records" value={demands.length} note="Source demand register rows"/><StatusTile label="Unresolved closure checklist" value={checklist.filter(c=>c.stage==='Account Closure'&&!['Completed','Not Applicable','Exception Disclosed'].includes(c.status)).length} note="Pending or in progress"/></div></div><ChecklistPanel items={checklist.filter(c=>c.stage==='Account Closure')} onChange={updateChecklist}/></section>}
    {tab==='Internal Audit'&&<section className="space-y-4">
      <ChecklistPanel items={checklist.filter(c=>c.stage==='Internal Audit')} onChange={updateChecklist}/>
      <div className="bg-white border rounded-xl p-4"><h2 className="font-semibold mb-3">Raise internal audit observation</h2><ObservationForm form={form} setForm={setForm} onSubmit={createObservation} busy={busy}/></div>
      <ObservationList observations={observations.filter(o=>o.audit_stage==='Internal Audit'||o.audit_stage==='FY Review')} onUpdate={addObservationUpdate} onStatus={changeObservationStatus}/>
      <div className="bg-white border rounded-xl p-4 space-y-3"><div><h2 className="font-semibold">Internal auditor sign-off</h2><p className="text-xs text-slate-500 mt-1">This is an authenticated workflow attestation, not a substitute for a legally required signed audit report or auditor certificate.</p></div><div className="grid md:grid-cols-2 gap-3"><Field label="Internal auditor name" value={signoff.name} onChange={v=>setSignoff({...signoff,name:v})}/><Field label="Role / firm" value={signoff.role} onChange={v=>setSignoff({...signoff,role:v})}/><SelectField label="Conclusion" value={signoff.opinion} onChange={v=>setSignoff({...signoff,opinion:v})} options={['Completed without exceptions','Completed with exceptions']}/><Field label="Remarks" value={signoff.remarks} onChange={v=>setSignoff({...signoff,remarks:v})}/></div><TextArea label="Sign-off attestation" value={signoff.attestation} onChange={v=>setSignoff({...signoff,attestation:v})}/><button disabled={busy||!signoff.name.trim()} onClick={()=>void createSignoff()} className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40">Record Internal Audit Sign-off</button>{internalSigned&&<span className="text-xs text-emerald-700 inline-flex items-center gap-1"><BadgeCheck className="w-4 h-4"/> Sign-off recorded</span>}</div>
    </section>}
    {tab==='Handover'&&<section className="space-y-4">
      <ChecklistPanel items={checklist.filter(c=>c.stage==='Statutory Audit')} onChange={updateChecklist}/>
      <div className="bg-white border rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h2 className="font-semibold">Statutory auditor handover package</h2><p className="text-xs text-slate-500 mt-1">The package is versioned. Internal audit sign-off is mandatory. Every schedule must be attached, marked not applicable, or explicitly disclosed as an exception.</p></div><button disabled={busy||!internalSigned} onClick={()=>void createHandover()} className="bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"><FileArchive className="w-4 h-4 inline mr-2"/>Create Handover Version</button></div>
      {packages.map(p=><div key={p.handover_id} className="bg-white border rounded-xl p-4 space-y-3"><div className="flex flex-wrap justify-between gap-2"><div><div className="font-semibold">Handover v{p.package_version}</div><div className="text-xs text-slate-500">{p.status} · Created {new Date(p.created_at).toLocaleString('en-IN')}</div></div><button onClick={()=>packageExport(p)} className="border rounded-lg px-3 py-2 text-xs font-semibold"><ArrowDownToLine className="inline w-4 h-4 mr-1"/>Export index JSON</button></div>{documents.filter(d=>d.handover_id===p.handover_id).map(d=><div key={d.document_id} className="grid md:grid-cols-[1fr_190px_1fr] gap-2 items-center border-t pt-2"><div><div className="text-xs font-semibold">{d.document_name}</div><div className="text-[10px] text-slate-500">{d.section_code} · {d.source_module}</div></div><select value={d.document_status} onChange={e=>void updateDoc(d,e.target.value,docRefs[d.document_id])} className="border rounded-md p-2 text-xs"><option>Pending</option><option>Generated</option><option>Attached</option><option>Not Applicable</option><option>Exception Disclosed</option></select><div className="flex flex-wrap gap-1 items-center"><input type="file" accept=".pdf,.xlsx,.xls,.docx,.doc,.csv,.png,.jpg,.jpeg" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadHandoverFile(d,file);e.currentTarget.value='';}} className="max-w-[190px] text-[10px]"/>{d.file_path&&<button onClick={()=>void openHandoverFile(d)} className="text-xs underline">Open evidence</button>}<input value={docRefs[d.document_id]??d.source_reference??''} onChange={e=>setDocRefs({...docRefs,[d.document_id]:e.target.value})} onBlur={()=>{if(docRefs[d.document_id]!==undefined)void updateDoc(d,d.document_status,docRefs[d.document_id]);}} placeholder="External reference / URL" className="w-full border rounded-md p-2 text-xs"/></div></div>)}{p.status==='Issued'&&<div className="border-t pt-3"><button onClick={()=>void acknowledgeHandover(p)} className="border rounded-lg px-3 py-2 text-xs font-semibold">Record Auditor Acknowledgement</button></div>}{p.status!=='Issued'&&p.status!=='Auditor Acknowledged'&&<div className="border-t pt-3 flex flex-col sm:flex-row gap-2"><input value={issueTo} onChange={e=>setIssueTo(e.target.value)} placeholder="Statutory auditor / firm name" className="flex-1 border rounded-lg px-3 py-2 text-sm"/><button onClick={()=>void issueHandover()} disabled={!internalSigned} className="bg-emerald-700 text-white rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-40">Issue Handover</button></div>}</div>)}
    </section>}
    {tab==='Queries & Adjustments'&&<section className="space-y-4"><div className="bg-white border rounded-xl p-4"><h2 className="font-semibold mb-3">Log statutory auditor query</h2><form onSubmit={createQuery} className="grid md:grid-cols-2 gap-3"><Field label="Reference area" value={queryForm.referenceArea} onChange={v=>setQueryForm({...queryForm,referenceArea:v})}/><Field label="Reference ID" value={queryForm.referenceId} onChange={v=>setQueryForm({...queryForm,referenceId:v})}/><SelectField label="Priority" value={queryForm.priority} onChange={v=>setQueryForm({...queryForm,priority:v})} options={['Critical','High','Normal','Low']}/><Field label="Raised by" value={queryForm.raisedBy} onChange={v=>setQueryForm({...queryForm,raisedBy:v})}/><div className="md:col-span-2"><TextArea label="Auditor query" value={queryForm.queryText} onChange={v=>setQueryForm({...queryForm,queryText:v})}/></div><button className="bg-blue-700 text-white rounded-lg px-4 py-2 text-xs font-semibold w-fit">Save Query</button></form></div><div className="bg-white border rounded-xl p-4"><h2 className="font-semibold mb-3">Auditor query register</h2><div className="space-y-2">{queries.map(q=><div key={q.query_id} className="border rounded-lg p-3"><div className="flex justify-between gap-2"><div className="text-sm font-semibold">{q.query_no} · {q.reference_area}</div><span className="text-xs">{q.status}</span></div><p className="text-sm mt-1">{q.query_text}</p>{q.management_response&&<p className="text-xs text-slate-600 mt-2">Management: {q.management_response}</p>}{!['Closed','Accepted'].includes(q.status)&&<div className="mt-2 flex flex-wrap gap-2"><button onClick={()=>void respondQuery(q)} className="border rounded-md px-3 py-1.5 text-xs">Add / update response</button><button onClick={()=>void concludeQuery(q)} className="border rounded-md px-3 py-1.5 text-xs">Record auditor conclusion</button></div>}</div>)}</div></div><div className="bg-white border rounded-xl p-4"><h2 className="font-semibold mb-3">Propose audit adjustment (does not post to books)</h2><form onSubmit={createAdjustment} className="grid md:grid-cols-2 gap-3"><SelectField label="Adjustment type" value={adjustmentForm.type} onChange={v=>setAdjustmentForm({...adjustmentForm,type:v})} options={['Reclassification','Accrual','Provision','Depreciation','Prior Period','Demand Correction','Receipt Allocation','Other']}/><Field label="Amount (₹)" value={adjustmentForm.amount} onChange={v=>setAdjustmentForm({...adjustmentForm,amount:v})} type="number"/><Field label="Debit account" value={adjustmentForm.debit} onChange={v=>setAdjustmentForm({...adjustmentForm,debit:v})}/><Field label="Credit account" value={adjustmentForm.credit} onChange={v=>setAdjustmentForm({...adjustmentForm,credit:v})}/><Field label="Supporting reference" value={adjustmentForm.reference} onChange={v=>setAdjustmentForm({...adjustmentForm,reference:v})}/><div className="md:col-span-2"><TextArea label="Narration / justification" value={adjustmentForm.narration} onChange={v=>setAdjustmentForm({...adjustmentForm,narration:v})}/></div><button className="bg-blue-700 text-white rounded-lg px-4 py-2 text-xs font-semibold w-fit">Save Proposal</button></form><div className="mt-4 space-y-2">{adjustments.map(a=><div key={a.proposal_id} className="border rounded-lg p-3 flex flex-wrap justify-between gap-2"><div><div className="text-sm font-semibold">{a.proposal_no} · {a.adjustment_type}</div><div className="text-xs text-slate-500">{a.narration} · {money(a.amount)}</div></div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold">{a.management_decision}{a.posted_journal_reference?' · Ref: '+a.posted_journal_reference:' · Not posted'}</span><button onClick={()=>void updateAdjustment(a,'decision')} className="border rounded px-2 py-1 text-[10px]">Management review</button>{a.management_decision==='Accepted'&&!a.posted_journal_reference&&<button onClick={()=>void updateAdjustment(a,'journal')} className="border rounded px-2 py-1 text-[10px]">Record posting ref</button>}<button onClick={()=>void updateAdjustment(a,'verify')} className="border rounded px-2 py-1 text-[10px]">{a.auditor_verified?'Auditor verified':'Auditor verify'}</button></div></div>)}</div></div></section>}
    {tab==='Approvals'&&<section className="space-y-4">
      <ChecklistPanel items={checklist.filter(c=>c.stage==='Final Approval')} onChange={updateChecklist}/>
      <div className="bg-white border rounded-xl p-4 space-y-3"><h2 className="font-semibold">Approval and certification register</h2><div className="grid md:grid-cols-2 gap-3"><Field label="Signatory name" value={approvalForm.name} onChange={v=>setApprovalForm({...approvalForm,name:v})}/><Field label="Role" value={approvalForm.role} onChange={v=>setApprovalForm({...approvalForm,role:v})}/><Field label="Resolution / minutes reference" value={approvalForm.reference} onChange={v=>setApprovalForm({...approvalForm,reference:v})}/></div><TextArea label="Attestation" value={approvalForm.attestation} onChange={v=>setApprovalForm({...approvalForm,attestation:v})}/><div className="flex flex-wrap gap-2">{['Treasurer Certification','Secretary Certification','Statutory Audit Completion','Committee Approval','AGM Adoption'].map(stage=><button key={stage} onClick={()=>void recordApproval(stage)} disabled={busy||!approvalForm.name.trim()} className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">Record {stage}</button>)}</div><div className="divide-y">{approvals.map(a=><div key={a.approval_id} className="py-2 flex justify-between gap-2 text-xs"><div><div className="font-semibold">{a.approval_stage}</div><div className="text-slate-500">{a.signatory_name} · {a.signatory_role} · {a.approval_reference||'No reference'}</div></div><span>{a.decision}</span></div>)}</div></div>
      <div className="bg-white border rounded-xl p-4"><h2 className="font-semibold">Financial year snapshot & freeze</h2><p className="text-xs text-slate-500 mt-1">Freeze is blocked by the database unless Committee Approval and AGM Adoption are recorded. The snapshot preserves source rows, audit disclosures and approvals for this version.</p><div className="flex items-center justify-between mt-3"><div className="text-xs text-slate-600">{latestSnapshot? `Latest: v${latestSnapshot.snapshot_version} · ${latestSnapshot.snapshot_status}`:'No snapshot created yet'}</div><button onClick={()=>void freezeSnapshot()} disabled={busy||!committeeApproved||!agmAdopted||!statutoryComplete} className="bg-slate-900 text-white rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-40"><LockKeyhole className="inline w-4 h-4 mr-1"/>Freeze Financial Year</button></div>{snapshots.map(s=><div key={s.snapshot_id} className="border-t mt-3 pt-2 text-xs flex justify-between"><span>Version {s.snapshot_version} · {s.snapshot_status} · {s.as_of_date}</span><button onClick={()=>exportJson(`FY_Snapshot_${fy.replace(/\s/g,'_')}_v${s.snapshot_version}.json`,s.snapshot_data)} className="underline">Export snapshot</button></div>)}</div>
    </section>}
    <div className="text-[11px] text-slate-500 flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0"/>This workflow is a control and evidence-management system. It does not replace prescribed Maharashtra co-operative audit formats, statutory filings, the appointed auditor's professional judgement, or society resolutions. Role-specific database permissions and document storage integration must be configured before production use.</div>
  </div>;
};

const Field:React.FC<{label:string;value:string;onChange:(v:string)=>void;type?:string}> = ({label,value,onChange,type='text'})=><label className="block text-xs font-medium text-slate-700">{label}<input type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-normal"/></label>;
const TextArea:React.FC<{label:string;value:string;onChange:(v:string)=>void}> = ({label,value,onChange})=><label className="block text-xs font-medium text-slate-700">{label}<textarea value={value} onChange={e=>onChange(e.target.value)} rows={3} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-normal"/></label>;
const SelectField:React.FC<{label:string;value:string;onChange:(v:string)=>void;options:string[]}> = ({label,value,onChange,options})=><label className="block text-xs font-medium text-slate-700">{label}<select value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-normal">{options.map(o=><option key={o}>{o}</option>)}</select></label>;
const StatusTile:React.FC<{label:string;value:number;note:string}> = ({label,value,note})=><div className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-bold mt-1">{value}</div><div className="text-[11px] text-slate-500">{note}</div></div>;
const ChecklistPanel:React.FC<{items:Row[];onChange:(item:Row,status:string)=>void}> = ({items,onChange})=><div className="bg-white border rounded-xl p-4"><h2 className="font-semibold mb-3">Stage checklist <span className="text-xs text-slate-500 font-normal">({items.filter(i=>['Completed','Not Applicable','Exception Disclosed'].includes(i.status)).length}/{items.length} closed or disclosed)</span></h2>{!items.length?<p className="text-xs text-slate-500">Initialize the FY workflow to create checklist tasks.</p>:<div className="space-y-2">{items.map(i=><div key={i.checklist_id} className="grid md:grid-cols-[1fr_190px] gap-2 items-center border-b last:border-0 pb-2"><div><div className="text-[10px] uppercase tracking-wide text-slate-500">{i.work_area}</div><div className="text-sm">{i.task}</div>{i.remarks&&<div className="text-xs text-slate-500">{i.remarks}</div>}</div><select value={i.status} onChange={e=>onChange(i,e.target.value)} className="border rounded-lg px-2 py-2 text-xs"><option>Pending</option><option>In Progress</option><option>Completed</option><option>Not Applicable</option><option>Exception Disclosed</option></select></div>)}</div>}</div>;
const ObservationForm:React.FC<{form:Row;setForm:(v:any)=>void;onSubmit:(e:React.FormEvent)=>void;busy:boolean}> = ({form,setForm,onSubmit,busy})=><form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-3"><Field label="Observation title" value={form.title} onChange={v=>setForm({...form,title:v})}/><Field label="Audit area" value={form.area} onChange={v=>setForm({...form,area:v})}/><SelectField label="Risk level" value={form.risk} onChange={v=>setForm({...form,risk:v})} options={['Critical','High','Medium','Low']}/><Field label="Source record / reference ID" value={form.referenceId} onChange={v=>setForm({...form,referenceId:v})}/><Field label="Raised by" value={form.raisedBy} onChange={v=>setForm({...form,raisedBy:v})}/><Field label="Target date" value={form.targetDate} onChange={v=>setForm({...form,targetDate:v})} type="date"/><div className="md:col-span-2"><TextArea label="Finding / condition and evidence" value={form.finding} onChange={v=>setForm({...form,finding:v})}/></div><div className="md:col-span-2"><TextArea label="Recommendation" value={form.recommendation} onChange={v=>setForm({...form,recommendation:v})}/></div><button disabled={busy||!form.title.trim()||!form.finding.trim()} className="bg-blue-700 text-white rounded-lg px-4 py-2 text-xs font-semibold w-fit disabled:opacity-40"><Plus className="inline w-4 h-4 mr-1"/>Add Observation</button></form>;
const ObservationList:React.FC<{observations:Row[];onUpdate:(o:Row,type:string,text:string)=>void;onStatus:(o:Row,status:string)=>void}> = ({observations,onUpdate,onStatus})=><div className="bg-white border rounded-xl p-4"><h2 className="font-semibold mb-3">Observation register ({observations.length})</h2>{!observations.length?<p className="text-xs text-slate-500">No observations recorded for this stage.</p>:<div className="space-y-3">{observations.map(o=><div key={o.observation_id} className="border rounded-lg p-3"><div className="flex flex-wrap justify-between gap-2"><div><div className="text-sm font-semibold">{o.observation_no} · {o.title}</div><div className="text-[11px] text-slate-500">{o.audit_area} · {o.risk_level} risk · {o.status}</div></div><select value={o.status} onChange={e=>onStatus(o,e.target.value)} className="border rounded-md px-2 py-1 text-xs"><option>Open</option><option>Management Responded</option><option>Action In Progress</option><option>Pending Verification</option><option>Closed</option><option>Accepted Risk</option><option>Carried Forward</option></select></div><p className="text-sm mt-2">{o.finding}</p>{o.management_response&&<p className="text-xs mt-2"><b>Management response:</b> {o.management_response}</p>}<div className="flex flex-wrap gap-2 mt-3"><button onClick={()=>{const v=window.prompt('Management response');if(v)onUpdate(o,'Management Response',v);}} className="border rounded-md px-2 py-1.5 text-[11px]">Management response</button><button onClick={()=>{const v=window.prompt('Corrective action and owner');if(v)onUpdate(o,'Corrective Action',v);}} className="border rounded-md px-2 py-1.5 text-[11px]">Corrective action</button><button onClick={()=>{const v=window.prompt('Auditor conclusion / verification remarks');if(v)onUpdate(o,'Auditor Review',v);}} className="border rounded-md px-2 py-1.5 text-[11px]">Auditor review</button></div></div>)}</div>}</div>;

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, CheckCircle2, Database, FileSpreadsheet, Loader2, UploadCloud } from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';

type ImportPlanRow = { table: string; count: number; note: string };
type ResultRow = { table: string; attempted: number; succeeded: number; error?: string };

const BATCH_SIZE = 200;
const clean = (v: unknown): any => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return v;
};
const str = (v: unknown): string | null => {
  const x = clean(v);
  return x === null ? null : String(x).trim();
};
const num = (v: unknown): number | null => {
  const x = clean(v);
  if (x === null) return null;
  const n = typeof x === 'number' ? x : Number(String(x).replace(/[,₹ ]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const boolFromYes = (v: unknown): boolean => ['yes', 'true', 'active', '1'].includes(String(v ?? '').trim().toLowerCase());
const isoDate = (v: unknown): string | null => {
  const x = clean(v);
  if (x === null) return null;
  if (x instanceof Date && !Number.isNaN(x.getTime())) return x.toISOString().slice(0, 10);
  if (typeof x === 'number') {
    const d = XLSX.SSF.parse_date_code(x);
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d)).toISOString().slice(0, 10);
  }
  const d = new Date(String(x));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const rowsFrom = (wb: XLSX.WorkBook, sheetName: string, headerRow = 4): Record<string, any>[] => {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const matrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: null, raw: true });
  const headers = (matrix[headerRow - 1] || []).map((h: unknown) => String(h ?? '').trim());
  return matrix.slice(headerRow).map((row: any[]) => {
    const out: Record<string, any> = {};
    headers.forEach((h: string, i: number) => { if (h) out[h] = row?.[i] ?? null; });
    return out;
  }).filter((row: Record<string, any>) => Object.values(row).some(v => clean(v) !== null));
};
const getFormulaId = (value: unknown, prefix: string, sheetRow: number, label: unknown): string | null => {
  const existing = str(value);
  if (existing && !existing.startsWith('=')) return existing;
  if (clean(label) === null) return null;
  return `${prefix}-${String(sheetRow - 4).padStart(4, '0')}`;
};
const sourceMeta = (notes: unknown, sourceLookup: Map<string, string>) => {
  const text = String(notes ?? '');
  const file = text.match(/Source file:\s*([^|]+)/i)?.[1]?.trim();
  const sheet = text.match(/(?:Sheet|Source sheet):\s*([^|]+)/i)?.[1]?.trim() || 'Transactions';
  const row = text.match(/Row:\s*(\d+)/i)?.[1];
  return { source_id: file ? sourceLookup.get(file) ?? null : null, source_sheet: sheet, source_row: row ? Number(row) : null };
};
const batches = <T,>(items: T[], size = BATCH_SIZE): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

export const FY2018WorkbookImport: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [plan, setPlan] = useState<ImportPlanRow[]>([]);
  const [previewError, setPreviewError] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [complete, setComplete] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [preflightMessage, setPreflightMessage] = useState('');

  useEffect(() => {
    let active = true;
    void supabaseClient.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthMessage(error.message);
      setSessionEmail(data.session?.user.email || '');
    });
    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (active) setSessionEmail(session?.user.email || '');
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    setAuthMessage('');
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } },
      });
      if (error) throw error;
    } catch (e: any) {
      setAuthMessage(e?.message || 'Could not start Google sign-in.');
      setAuthBusy(false);
    }
  };

  const buildPayload = async (chosenFile: File) => {
    const data = await chosenFile.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array', cellDates: true });
    const required = ['SOURCE_REGISTER', 'FLAT_OWNER_MASTER', 'RULES_MASTER', 'PARTY_MASTER', 'ACCOUNT_MASTER', 'BALANCE_REGISTER', 'DEMAND_REGISTER', 'CATEGORY_MASTER', 'TRANSACTIONS'];
    const missing = required.filter(name => !wb.Sheets[name]);
    if (missing.length) throw new Error(`Workbook is missing required sheets: ${missing.join(', ')}`);

    const sourceRows = rowsFrom(wb, 'SOURCE_REGISTER');
    const sourcePayload = sourceRows.map((r, i) => ({
      source_id: str(r.Source_ID) || `SRC-${String(i + 1).padStart(3, '0')}`,
      financial_year: str(r.Financial_Year) || 'FY 2018-19',
      reporting_month: str(r.Reporting_Month),
      original_file_name: str(r.Original_File_Name),
      source_file_link: str(r.Source_File_Link),
      source_status: str(r.Source_Status),
      audit_inspection_status: str(r.Audit_Inspection_Status),
      source_quality_notes: str(r.Source_Quality_Notes),
      pending_activities: str(r.Pending_Activities),
    })).filter(r => r.source_id && r.original_file_name);
    const sourceLookup = new Map<string, string>(sourcePayload.filter(r => r.original_file_name).map(r => [r.original_file_name!, r.source_id!] as [string, string]));

    const flatRows = rowsFrom(wb, 'FLAT_OWNER_MASTER');
    const flatPayload = flatRows.map(r => ({
      flat_owner_id: str(r.Flat_Owner_ID),
      asset_type: str(r.Asset_Type),
      flat_number_source_value: str(r.Flat_Number_Source_Value),
      owner_name: str(r.Owner_Name),
      owner_type: str(r.Owner_Type),
      ownership_start_date: isoDate(r.Ownership_Start_Date),
      ownership_end_date: isoDate(r.Ownership_End_Date),
      occupancy_status: str(r.Occupancy_Status),
      verification_status: str(r.Verification_Status),
      documentation_status: str(r.Documentation_Status),
      share_certificate_status: str(r.Share_Certificate_Status),
    })).filter(r => r.flat_owner_id);

    const partyRows = rowsFrom(wb, 'PARTY_MASTER');
    const partyPayload = partyRows.map((r, i) => ({
      party_id: getFormulaId(r.Party_ID, 'PTY', i + 5, r.Party_Name),
      party_name: str(r.Party_Name),
      party_type: str(r.Party_Type),
      contact_person: str(r.Contact_Person),
      mobile: str(r.Mobile),
      email: str(r.Email),
      address: str(r.Address),
      status: str(r.Status),
      notes: str(r.Notes),
    })).filter(r => r.party_id && r.party_name);

    const accountRows = rowsFrom(wb, 'ACCOUNT_MASTER');
    const accountPayload = accountRows.map((r, i) => ({
      account_id: getFormulaId(r.Account_ID, 'ACC', i + 5, r.Account_Name),
      account_name: str(r.Account_Name),
      account_type: str(r.Account_Type),
      bank_name: str(r.Bank_Name),
      account_number_masked: str(r.Account_Number_Masked),
      opening_balance: num(r.Opening_Balance),
      opening_balance_date: isoDate(r.Opening_Balance_Date),
      status: str(r.Status),
      notes: str(r.Notes),
    })).filter(r => r.account_id && r.account_name);

    const categoryRows = rowsFrom(wb, 'CATEGORY_MASTER');
    const categoryPayload = categoryRows.map(r => ({
      category_id: str(r.Category_ID),
      category_name: str(r.Category_Name),
      category_group: str(r.Category_Group),
      transaction_type: str(r.Transaction_Type),
      active: boolFromYes(r.Active),
      notes: str(r.Notes),
    })).filter(r => r.category_id && r.category_name);

    // RULES_MASTER repeats the "Notes" header, so use fixed positions to preserve dates and notes separately.
    const ruleMatrix = XLSX.utils.sheet_to_json<any[]>(wb.Sheets.RULES_MASTER, { header: 1, defval: null, raw: true });
    const rulePayload = ruleMatrix.slice(4).map((r: any[]) => ({
      rule_id: str(r[0]), rule_name: str(r[1]), rule_type: str(r[2]), applicable_to: str(r[3]),
      asset_type: str(r[4]), regular_charge: num(r[5]), penalised_charge: num(r[6]),
      charge_frequency: str(r[7]), due_day: num(r[8]), start_date: isoDate(r[9]), end_date: isoDate(r[10]),
      status: str(r[11]), notes: str(r[12]), category_id: str(r[13]),
      demand_creation_rule: str(r[14]), demand_period_rule: str(r[15]),
      payment_matching_rule: str(r[16]), review_required: /^yes/i.test(String(r[17] ?? '')),
    })).filter((r: any) => r.rule_id && r.rule_name);

    const transactionRows = rowsFrom(wb, 'TRANSACTIONS');
    const transactionPayload = transactionRows.map(r => {
      const meta = sourceMeta(r.Notes, sourceLookup);
      return {
        transaction_id: str(r.Transaction_ID),
        reporting_month: str(r['Reporting Month']),
        transaction_date: isoDate(r.Transaction_Date),
        transaction_type: str(r.Transaction_Type),
        voucher_receipt_no: str(r.Voucher_Receipt_No),
        cheque_no: str(r.Cheque_No),
        party_id: str(r.Party_ID),
        category_id: str(r.Category_ID),
        description: str(r.Description),
        amount: num(r.Amount),
        payment_mode: str(r.Payment_Mode),
        account_id: str(r.Account_ID),
        notes: str(r.Notes),
        voucher_available: str(r.Voucher_Available),
        bills_available: str(r.Bills_Available),
        bank_verified: str(r.Bank_Verified) || 'Pending',
        verified: str(r.Verified),
        audit_notes: str(r.Audit_Notes),
        source_id: meta.source_id,
        source_sheet: meta.source_sheet,
        source_row: meta.source_row,
      };
    }).filter(r => r.transaction_id && r.amount !== null);

    const demandRows = rowsFrom(wb, 'DEMAND_REGISTER');
    const demandPayload = demandRows.map(r => ({
      demand_id: str(r.Demand_ID),
      financial_year: str(r.Financial_Year),
      demand_month: str(r.Demand_Month),
      demand_date: isoDate(r.Demand_Date),
      due_date: isoDate(r.Due_Date),
      party_id: str(r.Party_ID),
      rule_id: str(r.Rule_ID),
      category_id: str(r.Category_ID),
      demand_amount: num(r.Demand_Amount),
      notes: [str(r.Notes), str(r.Party_Name) ? `Party name: ${str(r.Party_Name)}` : null,
        num(r.Adjustment_Amount) !== null ? `Adjustment amount: ${num(r.Adjustment_Amount)}` : null,
        num(r.Net_Demand) !== null ? `Net demand: ${num(r.Net_Demand)}` : null,
        num(r.Paid_Amount) !== null ? `Paid amount: ${num(r.Paid_Amount)}` : null,
        num(r.Outstanding_Amount) !== null ? `Outstanding amount: ${num(r.Outstanding_Amount)}` : null,
        str(r.Status) ? `Status: ${str(r.Status)}` : null].filter(Boolean).join(' | ') || null,
    })).filter(r => r.demand_id && r.party_id && r.demand_amount !== null);



    const optionPayload: any[] = [];
    const optionWs = wb.Sheets.OPTIONS;
    if (optionWs) {
      const matrix = XLSX.utils.sheet_to_json<any[]>(optionWs, { header: 1, defval: null, raw: true });
      const header = matrix[6] || [];
      for (let col = 0; col < header.length; col += 2) {
        const columnName = str(header[col]);
        if (!columnName || /meaning/i.test(columnName)) continue;
        for (let rowIndex = 7; rowIndex < matrix.length; rowIndex++) {
          const value = str(matrix[rowIndex]?.[col]);
          const description = str(matrix[rowIndex]?.[col + 1]);
          if (value && value !== columnName && value !== 'Allowed Value') {
            optionPayload.push({ column_name: columnName, option_value: value, description });
          }
        }
      }
    }

    const optionMap = new Map<string, any>();
    optionPayload.forEach(row => optionMap.set(`${row.column_name}::${row.option_value}`, row));
    optionPayload.splice(0, optionPayload.length, ...optionMap.values());

    const correctionRows = rowsFrom(wb, 'CORRECTION_LOG', 3);
    const correctionMap = new Map<string, any>();
    correctionRows.map(r => ({
      financial_year: 'FY 2018-19',
      rule_item: str(r['Rule / Item']),
      correction_applied: str(r['Correction applied']),
      scope_note: str(r['Scope / note']),
    })).filter(r => r.rule_item && r.correction_applied)
      .forEach(row => correctionMap.set(`${row.financial_year}::${row.rule_item}::${row.correction_applied}::${row.scope_note ?? ''}`, row));
    const correctionPayload = [...correctionMap.values()];

    const mappingRows = rowsFrom(wb, 'PARTY_CATEGORY_RULES');
    const partyRuleMap = new Map<string, any>();
    mappingRows.map(r => ({
      rule_id: str(r.Rule_ID),
      rule_area: str(r.Rule_Area),
      rule_text: str(r.Rule),
      implementation_example: str(r['Implementation / Example']),
      review_exception: str(r['Review or Exception Handling']),
    })).filter(r => r.rule_id && r.rule_text)
      .forEach(row => partyRuleMap.set(row.rule_id!, row));
    const partyRulePayload = [...partyRuleMap.values()];

    const transactionIds = transactionPayload.map(r => r.transaction_id);
    const duplicateTransactionIds = transactionIds.filter((id, index) => transactionIds.indexOf(id) !== index);
    if (duplicateTransactionIds.length) {
      throw new Error(`Duplicate Transaction_ID values found: ${[...new Set(duplicateTransactionIds)].slice(0, 10).join(', ')}`);
    }
    if (transactionPayload.length === 0) throw new Error('No valid transaction rows were found in the TRANSACTIONS sheet.');
    const missingAmounts = transactionRows.filter(r => str(r.Transaction_ID) && num(r.Amount) === null);
    if (missingAmounts.length) throw new Error(`${missingAmounts.length} transaction rows have a Transaction_ID but no valid Amount. Correct the workbook before importing.`);
    const missingSources = transactionPayload.filter(r => r.source_id === null || r.source_row === null);
    if (missingSources.length) throw new Error(`${missingSources.length} transactions do not resolve to a Source_Register row and source row number. Correct the source notes before importing.`);

    return {
      source_register: sourcePayload,
      flat_owner_master: flatPayload,
      account_master: accountPayload,
      category_master: categoryPayload,
      party_master: partyPayload,
      rules_master: rulePayload,
      transactions: transactionPayload,
      demand_register: demandPayload,
      society_dropdown_options: optionPayload,
      society_correction_log: correctionPayload,
      party_category_rules: partyRulePayload,
    };
  };

  const [payload, setPayload] = useState<Record<string, any[]> | null>(null);
  const [fileName, setFileName] = useState('');

  const preview = async (chosen: File) => {
    setPreviewError('');
    setResults([]);
    setComplete(false);
    setPayload(null);
    setPlan([]);
    setFile(chosen);
    setFileName(chosen.name);
    try {
      const data = await buildPayload(chosen);
      setPayload(data);
      const nextPlan: ImportPlanRow[] = [
        { table: 'source_register', count: data.source_register.length, note: 'Source files and review status' },
        { table: 'flat_owner_master', count: data.flat_owner_master.length, note: 'Owner/asset records' },
        { table: 'account_master', count: data.account_master.length, note: 'Bank, cash and deposit accounts' },
        { table: 'category_master', count: data.category_master.length, note: 'Transaction categories' },
        { table: 'party_master', count: data.party_master.length, note: 'Member, vendor and other parties' },
        { table: 'rules_master', count: data.rules_master.length, note: 'Rules and review controls' },
        { table: 'transactions', count: data.transactions.length, note: 'Transaction records, cheque_no and bank_verified' },
        { table: 'demand_register', count: data.demand_register.length, note: 'Source-supported demands only' },
        { table: 'society_dropdown_options', count: data.society_dropdown_options.length, note: 'Controlled dropdown options, kept separate from application configuration' },
        { table: 'society_correction_log', count: data.society_correction_log.length, note: 'Correction log audit trail' },
        { table: 'party_category_rules', count: data.party_category_rules.length, note: 'Persistent party/category rules' },
      ];
      setPlan(nextPlan);
      setSelectedTables(nextPlan.map(row => row.table));
      setPreflightMessage('');
    } catch (e: any) {
      setPreviewError(e?.message || 'Could not read workbook.');
    }
  };

  const runImport = async () => {
    if (!payload || !fileName || selectedTables.length === 0) return;
    setBusy(true);
    setResults([]);
    setComplete(false);
    setPreflightMessage('');
    let batchId = '';
    let hasFailure = false;
    try {
      const { data: authData, error: authError } = await supabaseClient.auth.getSession();
      if (authError) throw authError;
      if (!authData.session) throw new Error('Sign in with Google through Supabase before importing.');

      // Preflight: reject overlapping imports and inspect existing destination counts.
      const { data: status, error: statusError } = await supabaseClient.functions.invoke('import-fy2018-workbook', { body: { action: 'status' } });
      if (statusError) throw new Error(statusError.message || 'Could not check current import status.');
      if (status?.error) throw new Error(status.error);
      if (status?.active) throw new Error(`Import ${status.active.id} is already running. Do not start another import until it is resolved.`);
      const existingCounts = status?.counts || {};
      const existingSelected = selectedTables.filter(table => Number(existingCounts[table] || 0) > 0);
      if (existingSelected.length) {
        const summary = existingSelected.map(table => `${table}: ${existingCounts[table]} existing`).join('\n');
        const proceed = window.confirm(`Some selected tables already contain records. Matching IDs will be upserted, not blindly duplicated.\n\n${summary}\n\nContinue?`);
        if (!proceed) { setPreflightMessage('Import cancelled. Existing records were detected; no new import was started.'); return; }
      } else {
        setPreflightMessage('Pre-import check passed: no active import and selected destination tables are empty.');
      }

      const rowCounts = Object.fromEntries(selectedTables.map(table => [table, (payload[table] || []).length]));
      const { data: started, error: startError } = await supabaseClient.functions.invoke('import-fy2018-workbook', {
        body: { action: 'start', fileName, financialYear: 'FY 2018-19', tables: selectedTables, rowCounts },
      });
      if (startError) throw new Error(startError.message || 'Could not start import batch.');
      if (started?.error) throw new Error(started.error);
      batchId = String(started.batchId || '');
      if (!batchId) throw new Error('Server did not return an import batch ID.');

      const ordered = plan.filter(row => selectedTables.includes(row.table));
      setResults(ordered.map(row => ({ table: row.table, attempted: row.count, succeeded: 0 })));
      for (const tableRow of ordered) {
        const table = tableRow.table;
        const rows = payload[table] || [];
        if (rows.length === 0) {
          setResults(prev => prev.map(r => r.table === table ? { ...r, attempted: 0, succeeded: 0 } : r));
          continue;
        }
        for (const group of batches(rows, BATCH_SIZE)) {
          const { data: batchData, error: batchError } = await supabaseClient.functions.invoke('import-fy2018-workbook', {
            body: { action: 'batch', batchId, table, rows: group },
          });
          if (batchError) {
            let detail = batchError.message || `Batch failed for ${table}`;
            try {
              const context = (batchError as any).context;
              if (context && typeof context.json === 'function') {
                const body = await context.json();
                if (body?.error) detail = body.error;
              }
            } catch {}
            throw new Error(`${table} ${Math.min(group.length, rows.length)}-record batch failed: ${detail}`);
          }
          if (batchData?.error || batchData?.success !== true) throw new Error(batchData?.error || `Batch failed for ${table}`);
          const succeeded = Number(batchData.succeeded || 0);
          setResults(prev => prev.map(r => r.table === table ? { ...r, succeeded } : r));
        }
      }

      const { data: finished, error: finishError } = await supabaseClient.functions.invoke('import-fy2018-workbook', {
        body: { action: 'finish', batchId, success: true },
      });
      if (finishError) throw new Error(finishError.message || 'Records were written but final audit verification failed.');
      if (finished?.error || finished?.success !== true) throw new Error(finished?.error || 'Server did not confirm all selected table counts.');
      setResults(ordered.map(row => ({ table: row.table, attempted: row.count, succeeded: row.count })));
      setComplete(true);
      setPreflightMessage('Import completed and the server confirmed every selected table count.');
    } catch (e: any) {
      hasFailure = true;
      const message = e?.message || String(e);
      if (batchId) {
        try {
          await supabaseClient.functions.invoke('import-fy2018-workbook', { body: { action: 'finish', batchId, success: false, error: message } });
        } catch {}
      }
      setResults(prev => {
        const failedTable = plan.find(row => selectedTables.includes(row.table) && !prev.some(p => p.table === row.table && p.error));
        if (failedTable) {
          const existing = prev.find(r => r.table === failedTable.table);
          return existing
            ? prev.map(r => r.table === failedTable.table ? { ...r, error: message } : r)
            : [...prev, { table: failedTable.table, attempted: failedTable.count, succeeded: 0, error: message }];
        }
        return [...prev, { table: 'Import', attempted: 0, succeeded: 0, error: message }];
      });
      setPreflightMessage('Import stopped safely. Review the table progress and error before retrying.');
      setComplete(false);
    } finally {
      setBusy(false);
    }
  };

  const totalRecords = plan.filter(row => selectedTables.includes(row.table)).reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
        <div className="sticky top-0 bg-white z-10 border-b border-slate-200 px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Database className="w-5 h-5 text-blue-600" /> FY 2018–19 Workbook → Supabase</h2>
            <p className="text-xs text-slate-500 mt-1">Preview first. Existing IDs are upserted; no financial amount is recalculated.</p>
          </div>
          <button onClick={onClose} disabled={busy} className="text-slate-500 hover:text-slate-900 text-sm font-semibold px-3 py-2 rounded-lg border border-slate-200 disabled:opacity-50">Close</button>
        </div>
        <div className="p-5 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            {sessionEmail ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Google account: {sessionEmail}</p>
                  <p className="text-xs text-emerald-700 mt-1">{authMessage || 'Backend checks Society Admin permissions before writing.'}</p>
                </div>
                <button type="button" disabled={busy || authBusy} onClick={async () => {
                  await supabaseClient.auth.signOut();
                  setSessionEmail('');
                  setAuthMessage('Signed out.');
                }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Sign out</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Sign in with your existing Google account</p>
                  <p className="text-xs text-slate-500 mt-1">Uses the Google provider already configured in Supabase Auth.</p>
                </div>
                <button type="button" onClick={() => void handleGoogleSignIn()} disabled={authBusy} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{authBusy ? 'Opening Google…' : 'Continue with Google'}</button>
              </div>
            )}
            {authMessage && <p className="mt-2 text-xs text-rose-700">{authMessage}</p>}
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">Import order: source register → masters → demands/opening balances → transactions.</p>
            <p className="mt-1 text-xs">Blank opening balances are skipped. Import stops at the first table error so you can fix permissions or schema issues before retrying.</p>
          </div>
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center cursor-pointer hover:border-blue-400">
            <UploadCloud className="w-8 h-8 text-blue-600" />
            <span className="font-semibold text-sm text-slate-800">{file ? file.name : 'Select the approved FY 2018–19 Excel workbook'}</span>
            <span className="text-xs text-slate-500">.xlsx or .xls — data is previewed locally before upload.</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" disabled={busy} onChange={e => { const chosen = e.target.files?.[0]; if (chosen) void preview(chosen); }} />
          </label>
          {previewError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{previewError}</div>}
          {plan.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div><h3 className="text-sm font-bold text-slate-900">Import preview</h3><p className="text-xs text-slate-500 mt-0.5">{fileName} · {totalRecords.toLocaleString()} records across mapped tables</p></div>
                <span className="text-xs font-semibold text-slate-600">{plan.length} destinations</span>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="text-left bg-white border-b border-slate-100"><th className="px-4 py-2">Import</th><th className="px-4 py-2">Supabase table</th><th className="px-4 py-2">Records / progress</th><th className="px-4 py-2">Purpose</th></tr></thead>
                <tbody>{plan.map(row => {
                  const result = results.find(r => r.table === row.table);
                  const done = result?.succeeded ?? 0;
                  const pct = row.count ? Math.min(100, Math.round((done / row.count) * 100)) : 0;
                  const checked = selectedTables.includes(row.table);
                  return <tr key={row.table} className="border-b border-slate-50">
                    <td className="px-4 py-2"><input type="checkbox" aria-label={`Select ${row.table}`} checked={checked} disabled={busy || complete} onChange={e => setSelectedTables(prev => e.target.checked ? [...prev, row.table] : prev.filter(t => t !== row.table))} /></td>
                    <td className="px-4 py-2 font-mono">{row.table}</td>
                    <td className="px-4 py-2 min-w-44"><div className="font-semibold">{done.toLocaleString()}/{row.count.toLocaleString()} {result ? (result.error ? 'completed before error' : done === row.count ? 'imported' : 'completed') : 'records'}</div>
                      <div className="mt-1 h-2 w-full rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-blue-600 transition-all duration-200" style={{ width: `${pct}%` }} /></div>
                      {result?.error && <div className="mt-1 max-w-xs whitespace-normal text-rose-700">{result.error}</div>}
                    </td><td className="px-4 py-2 text-slate-600">{row.note}</td>
                  </tr>;
                })}</tbody>
              </table>
              {preflightMessage && <div className="px-4 py-2 text-xs text-slate-700 border-t border-slate-100">{preflightMessage}</div>}
              {complete && <div className="mx-4 mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="inline w-4 h-4 mr-1" />Import completed for all mapped tables. Verify table counts and monthly amount totals before production use.</div>}
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-[11px] text-slate-500 max-w-2xl">Uses the authenticated Supabase client and admin-only row-level security policies. No service-role key is used in the browser.</div>
            <button onClick={() => void runImport()} disabled={busy || authBusy || !sessionEmail || !payload || plan.length === 0 || complete} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" />Importing…</> : <><FileSpreadsheet className="w-4 h-4" />Import {totalRecords.toLocaleString()} selected records</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
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
    const sourceLookup = new Map(sourcePayload.filter(r => r.original_file_name).map(r => [r.original_file_name!, r.source_id!]));

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
        const meaningHeader = String(header[col + 1] ?? '');
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

    const correctionRows = rowsFrom(wb, 'CORRECTION_LOG', 3);
    const correctionPayload = correctionRows.map(r => ({
      financial_year: 'FY 2018-19',
      rule_item: str(r['Rule / Item']),
      correction_applied: str(r['Correction applied']),
      scope_note: str(r['Scope / note']),
    })).filter(r => r.rule_item && r.correction_applied);

    const mappingRows = rowsFrom(wb, 'PARTY_CATEGORY_RULES');
    const partyRulePayload = mappingRows.map(r => ({
      rule_id: str(r.Rule_ID),
      rule_area: str(r.Rule_Area),
      rule_text: str(r.Rule),
      implementation_example: str(r['Implementation / Example']),
      review_exception: str(r['Review or Exception Handling']),
    })).filter(r => r.rule_id && r.rule_text);

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
      setPlan([
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
      ]);
    } catch (e: any) {
      setPreviewError(e?.message || 'Could not read workbook.');
    }
  };

  const runImport = async () => {
    if (!payload || !fileName) return;
    setBusy(true);
    setResults([]);
    setComplete(false);
    const output: ResultRow[] = [];
    let batchId: string | null = null;
    const order = [
      'source_register', 'flat_owner_master', 'account_master', 'category_master',
      'party_master', 'rules_master', 'demand_register',
      'transactions', 'society_dropdown_options', 'society_correction_log', 'party_category_rules',
    ];
    let failed = false;
    try {
      const { data: authData, error: authError } = await supabaseClient.auth.getSession();
      if (authError) throw authError;
      if (!authData.session) throw new Error('Please sign in through Supabase Auth using an account granted the society_admin app_metadata role before importing.');
      const { data: batch, error: batchError } = await (supabaseClient as any)
        .from('society_import_batches')
        .insert({
          source_file: fileName,
          financial_year: 'FY 2018-19',
          status: 'Started',
          row_counts: Object.fromEntries(plan.map(row => [row.table, row.count])),
        })
        .select('id')
        .single();
      if (batchError) throw new Error(`Could not create import audit batch: ${batchError.message}`);
      batchId = batch.id;
      for (const table of order) {
        let records = payload[table] || [];
        if (batchId && (table === 'society_correction_log' || table === 'party_category_rules' || table === 'society_dropdown_options')) {
          records = records.map((record: any) => ({ ...record, import_batch_id: batchId }));
        }
        if (!records.length) { output.push({ table, attempted: 0, succeeded: 0 }); continue; }
        let succeeded = 0;
        let errorText = '';
        if (table === 'society_dropdown_options') {
          for (const group of batches(records)) {
            const { error } = await (supabaseClient as any).from(table).upsert(group, { onConflict: 'column_name,option_value' });
            if (error) { errorText = error.message; break; }
            succeeded += group.length;
          }
        } else {
          for (const group of batches(records)) {
            const conflictKey = table === 'member_opening_balances' ? 'opening_balance_id' :
              table === 'society_correction_log' ? 'financial_year,rule_item,correction_applied,scope_note' :
              table === 'party_category_rules' ? 'rule_id' :
              table === 'society_dropdown_options' ? 'column_name,option_value' :
              table === 'source_register' ? 'source_id' :
              table === 'flat_owner_master' ? 'flat_owner_id' :
              table === 'account_master' ? 'account_id' :
              table === 'category_master' ? 'category_id' :
              table === 'party_master' ? 'party_id' :
              table === 'rules_master' ? 'rule_id' :
              table === 'balance_register' ? 'balance_register_id' :
              table === 'demand_register' ? 'demand_id' : 'transaction_id';
            const query = (supabaseClient as any).from(table);
            const response = conflictKey ? await query.upsert(group, { onConflict: conflictKey }) : await query.insert(group);
            if (response.error) { errorText = response.error.message; break; }
            succeeded += group.length;
          }
        }
        output.push({ table, attempted: records.length, succeeded, error: errorText || undefined });
        if (errorText) { failed = true; break; }
      }
      setResults(output);
      setComplete(!failed);
      if (batchId) {
        const { error: batchUpdateError } = await (supabaseClient as any).from('society_import_batches')
          .update({
            status: failed ? 'Failed' : 'Completed',
            row_counts: Object.fromEntries(output.map(row => [row.table, { attempted: row.attempted, succeeded: row.succeeded, error: row.error || null }])),
            error_summary: output.find(row => row.error)?.error || null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', batchId);
        if (batchUpdateError) output.push({ table: 'society_import_batches', attempted: 1, succeeded: 0, error: batchUpdateError.message });
        setResults([...output]);
      }
    } catch (e: any) {
      output.push({ table: 'import', attempted: 0, succeeded: 0, error: e?.message || String(e) });
      setResults(output);
      setComplete(false);
    } finally {
      setBusy(false);
    }
  };

  const totalRecords = useMemo(() => plan.reduce((sum, row) => sum + row.count, 0), [plan]);

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
                <thead><tr className="text-left bg-white border-b border-slate-100"><th className="px-4 py-2">Supabase table</th><th className="px-4 py-2">Records</th><th className="px-4 py-2">Purpose</th></tr></thead>
                <tbody>{plan.map(row => <tr key={row.table} className="border-b border-slate-50"><td className="px-4 py-2 font-mono">{row.table}</td><td className="px-4 py-2 font-semibold">{row.count.toLocaleString()}</td><td className="px-4 py-2 text-slate-600">{row.note}</td></tr>)}</tbody>
              </table>
              {results.length > 0 && <div className="p-4 border-t border-slate-200 space-y-2">{results.map(r => <div key={r.table} className="flex flex-wrap items-center gap-2 text-xs"><span className={r.error ? 'text-rose-700' : 'text-emerald-700'}>{r.error ? <AlertTriangle className="inline w-3.5 h-3.5 mr-1" /> : <CheckCircle2 className="inline w-3.5 h-3.5 mr-1" />}{r.table}</span><span className="text-slate-600">{r.succeeded}/{r.attempted} records{r.error ? ` — ${r.error}` : ''}</span></div>)}</div>}
              {complete && <div className="mx-4 mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="inline w-4 h-4 mr-1" />Import completed for all mapped tables. Verify table counts and monthly amount totals before production use.</div>}
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-[11px] text-slate-500 max-w-2xl">Uses the connected Supabase client and current row-level security policies. No service-role key is used in the browser.</div>
            <button onClick={() => void runImport()} disabled={busy || !payload || plan.length === 0 || complete} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" />Importing…</> : <><FileSpreadsheet className="w-4 h-4" />Import {totalRecords.toLocaleString()} records</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

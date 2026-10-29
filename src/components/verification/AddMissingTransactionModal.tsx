import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Save, Loader2 } from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';
import { useVerification } from '../../context/VerificationContext';

type AccountOption = { account_id: string; account_name: string };
type Props = { onClose: () => void; onSaved: (transactionId: string) => void };

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

export const AddMissingTransactionModal: React.FC<Props> = ({ onClose, onSaved }) => {
  const { partyMaster, categoryMaster, fetchTransactions } = useVerification();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [date, setDate] = useState('2018-04-01');
  const [type, setType] = useState<'Receipt' | 'Payment'>('Payment');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [partyType, setPartyType] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [partyId, setPartyId] = useState('');
  const [categoryGroup, setCategoryGroup] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [voucher, setVoucher] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: loadError } = await supabaseClient
        .from('account_master')
        .select('account_id, account_name')
        .order('account_name');
      if (cancelled) return;
      if (loadError) setError('Unable to load accounts: ' + loadError.message);
      else {
        // Transaction Verification currently supports the three FY 2018–19 cash/bank ledgers only.
        // Exclude fixed-deposit accounts until the account model/reconciliation screens support them.
        const rows = ((data || []) as AccountOption[]).filter(a => ['ACC-0001', 'ACC-0002', 'ACC-0003'].includes(a.account_id) || /tdcc|bom|petty cash/i.test(a.account_name));
        setAccounts(rows);
        const firstCashBank = rows.find(a => /tdcc|bom|petty|cash/i.test(a.account_name));
        if (firstCashBank) setAccountId(firstCashBank.account_id);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Read the actual master classifications without assuming every member is a flat/parking owner.
  const partyTypes = Array.from(new Set(partyMaster.map(p => String(p.party_type || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const filteredParties = partyMaster.filter(p =>
    (!partyType || String(p.party_type || '') === partyType) &&
    (!partySearch.trim() || String(p.party_name || '').toLowerCase().includes(partySearch.trim().toLowerCase()) || String(p.party_id || '').toLowerCase().includes(partySearch.trim().toLowerCase()))
  ).sort((a, b) => String(a.party_name || '').localeCompare(String(b.party_name || '')));

  const getCategoryId = (c: any) => String(c.category_id || c.category_code || c.id || '');
  const getCategoryGroup = (c: any) => String(c.category_group || c.category_group_name || c.group_name || c.category || '').trim();
  const categoryGroups = Array.from(new Set(categoryMaster.map(c => getCategoryGroup(c)).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const filteredCategories = categoryMaster.filter(c =>
    (!categoryGroup || getCategoryGroup(c) === categoryGroup) &&
    (!categorySearch.trim() || String(c.category_name || '').toLowerCase().includes(categorySearch.trim().toLowerCase()) || getCategoryId(c).toLowerCase().includes(categorySearch.trim().toLowerCase()))
  ).sort((a, b) => String(a.category_name || '').localeCompare(String(b.category_name || '')));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsedAmount = Number(amount);
    if (!date || date < '2018-04-01' || date > '2019-03-31') {
      setError('Date must be within FY 2018–19 (01 Apr 2018 to 31 Mar 2019).');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than zero. Payment/receipt determines the sign automatically.');
      return;
    }
    if (!accountId || !description.trim() || !reason.trim()) {
      setError('Account, description, and reason for correction are required.');
      return;
    }
    setBusy(true);
    try {
      const { data, error: saveError } = await (supabaseClient as any).rpc('add_missing_transaction', {
        p_transaction_date: date,
        p_transaction_type: type,
        p_amount: parsedAmount,
        p_account_id: accountId,
        p_party_id: partyId || null,
        p_category_id: categoryId || null,
        p_description: description.trim(),
        p_voucher_receipt_no: voucher.trim() || null,
        p_payment_mode: paymentMode || null,
        p_reason: reason.trim(),
        p_supporting_reference: evidence.trim() || null,
        p_reporting_month: new Date(date + 'T12:00:00').toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
      });
      if (saveError) throw saveError;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.transaction_id) throw new Error('Saved response did not include a transaction ID.');
      await fetchTransactions();
      onSaved(result.transaction_id);
    } catch (e: any) {
      setError(e?.message || 'Unable to add the correction transaction.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="add-correction-title">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 id="add-correction-title" className="text-lg font-bold text-slate-900">Add Missing Transaction</h2>
            <p className="mt-1 text-sm text-slate-500">FY 2018–19 · New entry is marked as a correction and starts as Pending Review.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-5 p-6">
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Use this only after confirming the transaction is missing from the source data. Original imported transactions will not be changed. This entry will remain pending review until checked.</p>
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Transaction Date *
              <input className={fieldClass + ' mt-1'} type="date" min="2018-04-01" max="2019-03-31" value={date} onChange={e => setDate(e.target.value)} required />
            </label>
            <label className="text-sm font-medium text-slate-700">Transaction Type *
              <select className={fieldClass + ' mt-1'} value={type} onChange={e => setType(e.target.value as 'Receipt' | 'Payment')}>
                <option value="Receipt">Receipt (credit)</option><option value="Payment">Payment (debit)</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">Amount (₹) *
              <input className={fieldClass + ' mt-1'} type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter positive amount" required />
            </label>
            <label className="text-sm font-medium text-slate-700">Account *
              <select className={fieldClass + ' mt-1'} value={accountId} onChange={e => setAccountId(e.target.value)} required>
                <option value="">Select account</option>{accounts.map(a => <option key={a.account_id} value={a.account_id}>{a.account_name} ({a.account_id})</option>)}
              </select>
            </label>
            <div className="text-sm font-medium text-slate-700">
              <label htmlFor="correction-party-type">Party Type</label>
              <select id="correction-party-type" className={fieldClass + ' mt-1'} value={partyType} onChange={e => { setPartyType(e.target.value); setPartyId(''); setPartySearch(''); }}>
                <option value="">All party types</option>{partyTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <label htmlFor="correction-party-search" className="mt-2 block">Party / Member / Vendor</label>
              <input id="correction-party-search" className={fieldClass + ' mt-1'} value={partySearch} onChange={e => { setPartySearch(e.target.value); setPartyId(''); }} placeholder="Search party name or ID…" />
              <select aria-label="Select party" className={fieldClass + ' mt-1'} value={partyId} onChange={e => setPartyId(e.target.value)}>
                <option value="">Not mapped / unknown</option>{filteredParties.map(p => <option key={p.party_id} value={p.party_id}>{p.party_name} ({p.party_id})</option>)}
              </select>
              <p className="mt-1 text-xs font-normal text-slate-500">{filteredParties.length} matching parties</p>
            </div>
            <div className="text-sm font-medium text-slate-700">
              <label htmlFor="correction-category-group">Category Group</label>
              <select id="correction-category-group" className={fieldClass + ' mt-1'} value={categoryGroup} onChange={e => { setCategoryGroup(e.target.value); setCategoryId(''); setCategorySearch(''); }}>
                <option value="">All category groups</option>{categoryGroups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <label htmlFor="correction-category-search" className="mt-2 block">Category</label>
              <input id="correction-category-search" className={fieldClass + ' mt-1'} value={categorySearch} onChange={e => { setCategorySearch(e.target.value); setCategoryId(''); }} placeholder="Search category name or ID…" />
              <select aria-label="Select category" className={fieldClass + ' mt-1'} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">Not mapped / unknown</option>{filteredCategories.map(c => { const id = getCategoryId(c); return <option key={id} value={id}>{c.category_name} ({id})</option>; })}
              </select>
              <p className="mt-1 text-xs font-normal text-slate-500">{filteredCategories.length} matching categories</p>
            </div>
            <label className="text-sm font-medium text-slate-700">Voucher / Receipt Reference
              <input className={fieldClass + ' mt-1'} value={voucher} onChange={e => setVoucher(e.target.value)} placeholder="Reference number, if available" />
            </label>
            <label className="text-sm font-medium text-slate-700">Payment Mode
              <select className={fieldClass + ' mt-1'} value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                <option value="">Not specified</option><option>Cash</option><option>Cheque</option><option>NEFT / RTGS</option><option>UPI</option><option>Bank Transfer</option><option>Other</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">Description *
              <input className={fieldClass + ' mt-1'} value={description} onChange={e => setDescription(e.target.value)} placeholder="As stated in the source document" required />
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">Reason for Correction *
              <textarea className={fieldClass + ' mt-1'} rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this transaction is being added" required />
            </label>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">Supporting Evidence Reference
              <input className={fieldClass + ' mt-1'} value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="Bank statement page, cash book folio, voucher reference, file name, etc." />
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{busy ? 'Saving…' : 'Save Correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

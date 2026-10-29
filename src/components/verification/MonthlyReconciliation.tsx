import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Wallet,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  X,
  Save,
  ArrowRight,
  Layers,
  Edit2,
  FileSpreadsheet,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import { useVerification } from '../../context/VerificationContext';
import { formatINR, formatNumber } from '../../config';
import { Badge } from '../common/Badge';
import { AccountId, MonthlyReconciliationRecord, EnrichedTransaction } from '../../types';

export const MonthlyReconciliation: React.FC = () => {
  const {
    reconciliations,
    updateReconciliation,
    transactions,
    selectedAccountId,
    setSelectedAccountId,
    setSelectedMonthFilter,
    setCurrentScreen,
    setSelectedTransactionId,
    openingBalances,
    isLoadingReconciliation,
    reconciliationError,
    fetchMonthlyReconciliation,
    isSeedingDatabase,
    seedBaselineRecordsToSupabase,
  } = useVerification();

  const [activeAccount, setActiveAccount] = useState<AccountId>(selectedAccountId || 'TDCC');
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [drillDownMonth, setDrillDownMonth] = useState<string>('Jul 2018');
  const [showHowToModal, setShowHowToModal] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<MonthlyReconciliationRecord | null>(null);
  const [editAdjustments, setEditAdjustments] = useState<number>(0);
  const [editRemarks, setEditRemarks] = useState<string>('');

  const accountList = useMemo(() => {
    const stored = showAllAccounts
      ? [...(reconciliations.TDCC || []), ...(reconciliations.BOM || []), ...(reconciliations.CASH || [])]
      : (reconciliations[activeAccount] || []);
    if (stored.length > 0) return stored;

    // Derive calculated movements from live transactions when no source reconciliation rows exist.
    // Source closing balances remain unavailable; these months must never be marked reconciled.
    const months = ['Apr 2018','May 2018','Jun 2018','Jul 2018','Aug 2018','Sep 2018','Oct 2018','Nov 2018','Dec 2018','Jan 2019','Feb 2019','Mar 2019'];
    const accountIds: AccountId[] = showAllAccounts ? ['TDCC','BOM','CASH'] : [activeAccount];
    let carry = accountIds.reduce((sum, id) => sum + (openingBalances.find(o => o.accountId === id)?.recordedOpeningBalance || 0), 0);
    return months.map((month, monthIndex) => {
      const monthRows = transactions.filter(t => t.month === month && accountIds.includes(t.accountId));
      const credits = monthRows.filter(t => t.type === 'Receipt').reduce((sum,t) => sum + Math.abs(t.amount),0);
      const debits = monthRows.filter(t => t.type === 'Payment').reduce((sum,t) => sum + Math.abs(t.amount),0);
      const opening = carry;
      const closing = opening + credits - debits;
      carry = closing;
      return {
        id: 'CALC-' + (showAllAccounts ? 'ALL' : activeAccount) + '-' + monthIndex,
        month, monthIndex, accountId: activeAccount,
        sourceOpeningBalance: opening, calculatedOpeningBalance: opening, openingDifference: 0,
        credits, debits, adjustments: 0, calculatedClosingBalance: closing,
        sourceClosingBalance: 0, closingDifference: 0, status: 'Pending' as const,
        remarks: 'Source closing balance not loaded. Confirm against bank statement / cash book.',
      };
    });
  }, [showAllAccounts, reconciliations, activeAccount, openingBalances, transactions]);

  const handleAccountChange = (acc: AccountId) => {
    setShowAllAccounts(false);
    setActiveAccount(acc);
    setSelectedAccountId(acc);
  };

  const calculatedClosing = (accountId: AccountId) => {
    const opening = openingBalances.find((o) => o.accountId === accountId)?.recordedOpeningBalance || 0;
    const movement = transactions.filter(t => t.accountId === accountId).reduce((sum, t) =>
      sum + (t.type === 'Receipt' ? Math.abs(t.amount) : -Math.abs(t.amount)), 0);
    return reconciliations[accountId]?.[reconciliations[accountId].length - 1]?.calculatedClosingBalance ?? opening + movement;
  };
  const tdccClosing = calculatedClosing('TDCC');
  const bomClosing = calculatedClosing('BOM');
  const cashClosing = calculatedClosing('CASH');

  // Reconciled totals
  const totalCredits = useMemo(() => {
    return accountList.reduce((sum, item) => sum + item.credits, 0);
  }, [accountList]);

  const totalDebits = useMemo(() => {
    return accountList.reduce((sum, item) => sum + item.debits, 0);
  }, [accountList]);

  const totalAdjustments = useMemo(() => {
    return accountList.reduce((sum, item) => sum + item.adjustments, 0);
  }, [accountList]);

  const openingApr = accountList[0]?.calculatedOpeningBalance || 0;
  const closingMarCalc = accountList[accountList.length - 1]?.calculatedClosingBalance || 0;
  const closingMarSource = accountList[accountList.length - 1]?.sourceClosingBalance || 0;
  const finalDifference = closingMarCalc - closingMarSource;
  const sourceClosingUnavailable = accountList.some((row) => row.remarks.includes('Source closing balance not loaded'));

  // Chart data
  const chartData = useMemo(() => {
    return accountList.map((r) => ({
      name: r.month.split(' ')[0],
      'Opening Balance': r.calculatedOpeningBalance,
      'Closing Balance': r.calculatedClosingBalance,
      Debits: r.debits,
      Credits: r.credits,
    }));
  }, [accountList]);

  // Transactions for selected drill-down month
  const monthTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.month === drillDownMonth && (showAllAccounts || t.accountId === activeAccount)
    );
  }, [transactions, drillDownMonth, activeAccount, showAllAccounts]);

  const handleEditOpen = (rec: MonthlyReconciliationRecord) => {
    setEditingRecord(rec);
    setEditAdjustments(rec.adjustments);
    setEditRemarks(rec.remarks === '-' ? '' : rec.remarks);
  };

  const handleEditSave = () => {
    if (!editingRecord) return;
    updateReconciliation(activeAccount, editingRecord.id, {
      adjustments: Number(editAdjustments) || 0,
      remarks: editRemarks || '-',
    });
    setEditingRecord(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 3 Step Navigation Tabs */}
      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Account-wise Monthly Reconciliation
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Verify opening balances, inspect transactions and reconcile accounts month-wise. Original
            financial data is read-only.
          </p>
        </div>

        <button
          onClick={() => setShowHowToModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer transition-colors shrink-0 self-start sm:self-auto"
        >
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <span>How to Reconcile?</span>
        </button>
      </div>

      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
        <label htmlFor="reconciliation-account" className="text-xs font-semibold text-slate-600">Account</label>
        <select id="reconciliation-account" value={showAllAccounts ? 'All' : activeAccount}
          onChange={(e) => e.target.value === 'All' ? setShowAllAccounts(true) : handleAccountChange(e.target.value as AccountId)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white">
          <option value="All">All Accounts</option><option value="TDCC">TDCC</option><option value="BOM">BOM</option><option value="CASH">Petty Cash</option>
        </select>
        {accountList.some(r => r.remarks.includes('Source closing balance not loaded')) && <span className="text-xs text-amber-700">Calculated movements shown; source closing balances are not loaded, so months remain Pending.</span>}
      </div>
      {/* Top Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bank TDCC */}
        <div
          onClick={() => handleAccountChange('TDCC')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            activeAccount === 'TDCC'
              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                activeAccount === 'TDCC' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
              }`}
            >
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold">Bank – TDCC (Main A/c)</div>
              <div
                className={`text-[11px] ${
                  activeAccount === 'TDCC' ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                Calculated Closing Balance (source pending)
              </div>
              <div
                className={`text-lg font-bold font-mono mt-0.5 ${
                  activeAccount === 'TDCC' ? 'text-white' : 'text-slate-900'
                }`}
              >
                {formatINR(tdccClosing)}
              </div>
            </div>
          </div>
        </div>

        {/* Bank BOM */}
        <div
          onClick={() => handleAccountChange('BOM')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            activeAccount === 'BOM'
              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                activeAccount === 'BOM' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold">Bank – BOM (Secondary A/c)</div>
              <div
                className={`text-[11px] ${
                  activeAccount === 'BOM' ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                Current Balance (as per Mar 2019)
              </div>
              <div
                className={`text-lg font-bold font-mono mt-0.5 ${
                  activeAccount === 'BOM' ? 'text-white' : 'text-slate-900'
                }`}
              >
                {formatINR(bomClosing)}
              </div>
            </div>
          </div>
        </div>

        {/* Cash */}
        <div
          onClick={() => handleAccountChange('CASH')}
          className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
            activeAccount === 'CASH'
              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600/20'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                activeAccount === 'CASH' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold">Cash (Petty Cash)</div>
              <div
                className={`text-[11px] ${
                  activeAccount === 'CASH' ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                Current Balance (as per Mar 2019)
              </div>
              <div
                className={`text-lg font-bold font-mono mt-0.5 ${
                  activeAccount === 'CASH' ? 'text-white' : 'text-slate-900'
                }`}
              >
                {formatINR(cashClosing)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Reconciliation Grid: Left Table (7 Cols) + Right Charts & Summary (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Monthly Reconciliation Table */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-sm text-slate-900">
                Monthly Reconciliation –{' '}
                {activeAccount === 'TDCC'
                  ? 'Bank TDCC (Main A/c)'
                  : activeAccount === 'BOM'
                  ? 'Bank BOM (Secondary A/c)'
                  : 'Cash (Petty Cash)'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Calculated balances vs recorded source passbook entries
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedAccountId(activeAccount);
                setCurrentScreen('transaction-verification');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>View Transactions</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 whitespace-nowrap text-[11px]">
                  <th className="py-2.5 px-3">Month</th>
                  <th className="py-2.5 px-2 text-right">
                    Source Opening (A)
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    Calc Opening (B)
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    Opening Diff (B - A)
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    Credits (Receipts)
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    Debits (Payments)
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    Adjustments (+/-)
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    Calc Closing (C)
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    Source Closing (D)
                  </th>
                  <th className="py-2.5 px-2 text-right">
                    Closing Diff (C - D)
                  </th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-3">Remarks</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accountList.map((row) => {
                  const isDrillDown = row.month === drillDownMonth;
                  const sourceBalancesUnavailable = row.remarks.includes('Source closing balance not loaded');
                  const hasOpeningDiff = row.openingDifference !== 0;
                  const hasClosingDiff = row.closingDifference !== 0;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setDrillDownMonth(row.month)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isDrillDown ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {row.month}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        {sourceBalancesUnavailable ? 'Not loaded' : formatNumber(row.sourceOpeningBalance)}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-slate-900 font-medium">
                        {formatNumber(row.calculatedOpeningBalance)}
                      </td>

                      <td
                        className={`py-2.5 px-2 text-right font-mono font-bold ${
                          hasOpeningDiff ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {sourceBalancesUnavailable ? '—' : formatNumber(row.openingDifference)}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-emerald-700 font-medium">
                        {formatNumber(row.credits)}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-slate-800">
                        {formatNumber(row.debits)}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-slate-500">
                        {row.adjustments !== 0 ? formatNumber(row.adjustments) : '—'}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-slate-900 font-medium">
                        {formatNumber(row.calculatedClosingBalance)}
                      </td>

                      <td className="py-2.5 px-2 text-right font-mono text-slate-700">
                        {sourceBalancesUnavailable ? 'Not loaded' : formatNumber(row.sourceClosingBalance)}
                      </td>

                      <td
                        className={`py-2.5 px-2 text-right font-mono font-bold ${
                          hasClosingDiff ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {sourceBalancesUnavailable ? '—' : formatNumber(row.closingDifference)}
                      </td>

                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            row.status === 'Reconciled'
                              ? 'reconciled'
                              : row.status === 'Difference'
                              ? 'difference'
                              : 'pending'
                          }
                          label={row.status}
                          showIcon={false}
                          className="px-1.5 py-0 text-[10px]"
                        />
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 max-w-[130px] truncate" title={row.remarks}>
                        {row.remarks}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditOpen(row)}
                          disabled={row.id.startsWith('CALC-')}
                          title={row.id.startsWith('CALC-') ? 'Source reconciliation records are not loaded; this calculated row is read-only.' : 'Update reconciliation review'}
                          className="px-2 py-0.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {accountList.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500 text-xs">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <BarChart3 className="w-8 h-8 text-slate-300" />
                        <p className="font-semibold text-slate-700">0 Monthly Reconciliation Records</p>
                        <p className="text-[11px] text-slate-500 max-w-sm">
                          Table `account_monthly_balance` in your Supabase project currently contains 0 records for this account.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Total Row */}
                <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                  <td className="py-2.5 px-3">Total</td>
                  <td className="py-2.5 px-2 text-right">—</td>
                  <td className="py-2.5 px-2 text-right">—</td>
                  <td className="py-2.5 px-2 text-right">—</td>
                  <td className="py-2.5 px-2 text-right font-mono text-emerald-700">
                    {formatNumber(totalCredits)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {formatNumber(totalDebits)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono">
                    {totalAdjustments !== 0 ? formatNumber(totalAdjustments) : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right">—</td>
                  <td className="py-2.5 px-2 text-right">—</td>
                  <td className="py-2.5 px-2 text-right">—</td>
                  <td className="py-2.5 px-2 text-center">—</td>
                  <td className="py-2.5 px-3">—</td>
                  <td className="py-2.5 px-3 text-right">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Trend Chart, Summary & Observations */}
        <div className="lg:col-span-4 space-y-6">
          {/* Monthly Balance Trend Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-2">
              Monthly Balance Trend – {activeAccount}
            </h3>

            <div className="h-48 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    formatter={(val: any) => formatINR(Number(val))}
                    contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="Opening Balance" fill="#2563EB" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Closing Balance" fill="#10B981" radius={[2, 2, 0, 0]} />
                  <Line type="monotone" dataKey="Debits" stroke="#EF4444" strokeWidth={1.5} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="Credits" stroke="#F59E0B" strokeWidth={1.5} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reconciliation Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100">
              Reconciliation Summary – {activeAccount} (Apr 2018 – Mar 2019)
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Opening Balance (Apr 2018)</span>
                <span className="font-bold font-mono text-slate-900">{formatINR(openingApr)}</span>
              </div>

              <div className="flex justify-between py-1 text-slate-600">
                <span>Total Credits (Receipts)</span>
                <span className="font-bold font-mono text-emerald-600">+{formatINR(totalCredits)}</span>
              </div>

              <div className="flex justify-between py-1 text-slate-600">
                <span>Total Debits (Payments)</span>
                <span className="font-bold font-mono text-rose-600">-{formatINR(totalDebits)}</span>
              </div>

              <div className="flex justify-between py-1 text-slate-600">
                <span>Adjustments (+/-)</span>
                <span className="font-bold font-mono text-slate-700">{formatINR(totalAdjustments)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-t border-slate-200 text-slate-800 font-semibold">
                <span>Calculated Closing Balance (Mar 2019)</span>
                <span className="font-mono text-slate-900">{formatINR(closingMarCalc)}</span>
              </div>

              <div className="flex justify-between py-1 text-slate-600">
                <span>Source Closing Balance (Mar 2019)</span>
                <span className="font-bold font-mono text-slate-900">{sourceClosingUnavailable ? 'Not loaded' : formatINR(closingMarSource)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-t border-slate-200 font-bold">
                <span>Difference</span>
                <span className={`font-mono ${finalDifference === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {sourceClosingUnavailable ? '—' : formatINR(finalDifference)}
                </span>
              </div>
            </div>
          </div>

          {/* Key Observations Card */}
          <div className="bg-blue-50/60 rounded-xl border border-blue-200/80 p-5 shadow-xs">
            <h3 className="font-bold text-sm text-blue-950 mb-3">Key Observations</h3>

            <div className="space-y-2.5 text-xs text-blue-950/80">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  {sourceClosingUnavailable ? 'Source monthly closing balances are not loaded. Calculated movements are preliminary and cannot yet be marked reconciled.' : 'Review months with non-zero differences against the source bank statement or cash book.'}
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>Reconciliation status is based on saved source records and reviewer findings.</p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Opening balance verification status is taken from the saved account verification record.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <p>
                  Monthly credits and debits are calculated from transaction records; confirm against source records.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  5
                </span>
                <p>Proceed to finalise after resolving open discrepancies.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Reconciliation Dialog */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in fade-in">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Reconciliation Review – {editingRecord.month}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {activeAccount === 'TDCC' ? 'TDCC Main Account' : activeAccount}
                </span>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">Calculated Opening:</span>
                  <span className="font-mono font-bold">{formatINR(editingRecord.calculatedOpeningBalance)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Credits:</span>
                  <span className="font-mono font-bold text-emerald-600">+{formatINR(editingRecord.credits)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Debits:</span>
                  <span className="font-mono font-bold text-rose-600">-{formatINR(editingRecord.debits)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Source Closing:</span>
                  <span className="font-mono font-bold">{formatINR(editingRecord.sourceClosingBalance)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                  Adjustments (+/- ₹)
                </label>
                <input
                  type="number"
                  value={editAdjustments}
                  onChange={(e) => setEditAdjustments(Number(e.target.value))}
                  placeholder="0"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Adjustments require formal justification and must not hide unexplained differences.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                  Remarks / Explanation
                </label>
                <textarea
                  rows={3}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Reason for adjustment, cheque clearance delay, or bank charge note"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* How To Reconcile Modal */}
      {showHowToModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in fade-in">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Monthly Reconciliation Guide
              </h3>
              <button
                onClick={() => setShowHowToModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3">
              <p>
                <strong>Formula:</strong> Calculated Closing Balance = Calculated Opening Balance + Credits − Debits + Adjustments.
              </p>
              <p>
                <strong>Month-to-Month Carry Forward:</strong> In May 2018, the calculated opening balance automatically inherits April’s calculated closing balance. Any unresolved difference in July cascades directly into August.
              </p>
              <p>
                <strong>Zero Silent Corrections:</strong> Differences between calculated closing and source closing must be flagged in red. An adjustment without an auditable committee reason is prohibited.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHowToModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

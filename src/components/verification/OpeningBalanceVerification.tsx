import React, { useState } from 'react';
import {
  Landmark,
  Wallet,
  CheckCircle,
  AlertTriangle,
  Clock,
  HelpCircle,
  FileText,
  ExternalLink,
  Edit3,
  Check,
  Save,
  X,
  Lightbulb,
  CheckSquare,
} from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { formatINR } from '../../config';
import { Badge } from '../common/Badge';
import { AccountId, VerificationStatus } from '../../types';

export const OpeningBalanceVerification: React.FC = () => {
  const {
    openingBalances,
    isLoadingOpeningBalances,
    openingBalancesError,
    fetchOpeningBalances,
    updateOpeningBalance,
    selectedAccountId,
    setSelectedAccountId,
  } = useVerification();

  const [activeAccount, setActiveAccount] = useState<AccountId>(selectedAccountId || 'BOM');
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const selectedRecord = openingBalances.find((a) => a.accountId === activeAccount) || openingBalances[0] || {
    accountId: activeAccount || 'TDCC',
    accountName: `${activeAccount || 'TDCC'} Account`,
    accountType: 'Bank' as const,
    financialYear: 'FY 2018-19',
    auditClosingBalance: 0,
    recordedOpeningBalance: 0,
    difference: 0,
    sourceReference: 'account_master',
    supportingRecords: { auditReport: false, cashBook: false, bankPassbook: false },
    status: 'Pending' as const,
    remarks: '',
  };

  // Local editing state for the active account verification form
  const [formStatus, setFormStatus] = useState<VerificationStatus>(selectedRecord.status);
  const [formRemarks, setFormRemarks] = useState(selectedRecord.remarks === 'Loaded from Supabase database' ? '' : selectedRecord.remarks);
  const [formSupporting, setFormSupporting] = useState({ ...selectedRecord.supportingRecords });

  // Update form fields when selected record or balances load
  React.useEffect(() => {
    if (selectedRecord) {
      setFormStatus(selectedRecord.status);
      setFormRemarks(selectedRecord.remarks === 'Loaded from Supabase database' ? '' : selectedRecord.remarks);
      setFormSupporting({ ...selectedRecord.supportingRecords });
    }
  }, [selectedRecord.accountId, selectedRecord.status, selectedRecord.remarks]);

  // When selected account changes, update form
  const handleSelectAccount = (id: AccountId) => {
    setActiveAccount(id);
    setSelectedAccountId(id);
    const rec = openingBalances.find((a) => a.accountId === id);
    if (rec) {
      setFormStatus(rec.status);
      setFormRemarks(rec.remarks === 'Loaded from Supabase database' ? '' : rec.remarks);
      setFormSupporting({ ...rec.supportingRecords });
    }
  };

  const handleSave = async () => {
    const result = await updateOpeningBalance(activeAccount, {
      status: formStatus,
      remarks: formRemarks,
      supportingRecords: formSupporting,
    });
    if (!result.success) {
      window.alert(`Could not save verification: ${result.error || 'Unknown database error'}`);
      return;
    }
    setSuccessToast(`Verification for ${selectedRecord.accountName} saved to Supabase.`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const verifiedCount = openingBalances.filter((a) => a.status === 'Verified').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Opening Balance Verification
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl">
            Verify opening balances as per last audit report and supporting records (cash book / bank
            passbooks). This will be used as the starting balance for Apr 2018.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>
              {verifiedCount} of 3 accounts verified
              <span className="font-normal text-emerald-700 ml-1">
                {verifiedCount === 3
                  ? '— All accounts verified!'
                  : '— Verify all to proceed to transactions.'}
              </span>
            </span>
          </div>

          <button
            onClick={() => setShowHowToModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>How to Verify?</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Supabase Loading / Error Notification */}
      {isLoadingOpeningBalances && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="font-medium">Loading live opening balances from Supabase database...</span>
          </div>
        </div>
      )}

      {openingBalancesError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <div>
              <span className="font-semibold">Supabase sync error: </span>
              <span>{openingBalancesError}</span>
            </div>
          </div>
          <button
            onClick={() => fetchOpeningBalances()}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded text-xs cursor-pointer"
          >
            Retry Database Fetch
          </button>
        </div>
      )}


      {/* Empty State when no accounts exist in Supabase */}
      {!isLoadingOpeningBalances && !openingBalancesError && openingBalances.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100">
            <Landmark className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">0 Accounts Found in Supabase Database</h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1.5 mb-5 leading-relaxed">
            The remote table <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-800 border border-slate-200">account_master</code> in your Supabase project currently contains <strong>0 records</strong>.
            No mock data is presented as real records. You can import your Excel workbooks or click below to populate the baseline accounts into Supabase.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
          </div>
        </div>
      )}

      {openingBalances.length > 0 && (
        <>
          {/* Account cards removed: the table below is the single account summary. */}

      {/* Opening Balance Details Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h2 className="font-bold text-sm text-slate-900 mb-4 pb-2 border-b border-slate-100">
          Opening Balance Details
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Account</th>
                <th className="py-2.5 px-3 text-right">
                  Opening Balance <br />
                  <span className="text-[10px] text-slate-500 font-normal">(01 Apr 2018) (B)</span>
                </th>
                <th className="py-2.5 px-3 text-right">
                  Audit Closing Balance <br />
                  <span className="text-[10px] text-slate-500 font-normal">(31 Mar 2018) (A)</span>
                </th>
                <th className="py-2.5 px-3 text-right">
                  Difference <br />
                  <span className="text-[10px] text-slate-500 font-normal">(B - A)</span>
                </th>
                <th className="py-2.5 px-3 text-center" colSpan={3}>
                  Supporting Records Verified
                  <div className="grid grid-cols-3 text-[10px] text-slate-500 font-normal mt-0.5">
                    <span>Audit Report</span>
                    <span>Cash Book</span>
                    <span>Bank Passbook</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center">Verification Status</th>
                <th className="py-2.5 px-2 text-center">Verified By</th>
                <th className="py-2.5 px-2 text-center">Verified On</th>
                <th className="py-2.5 px-3">Remarks</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {openingBalances.map((acc) => (
                <tr
                  key={acc.accountId}
                  className={`hover:bg-slate-50 transition-colors ${
                    acc.accountId === activeAccount ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                    {acc.accountName}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                    {formatINR(acc.recordedOpeningBalance)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                    {formatINR(acc.auditClosingBalance)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    <span
                      className={
                        acc.difference === 0 ? 'text-slate-800' : 'text-rose-600'
                      }
                    >
                      {formatINR(acc.difference)}
                    </span>
                  </td>

                  {/* Supporting Records Verified Indicators */}
                  <td className="py-3 px-1 text-center">
                    {acc.supportingRecords.auditReport ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 inline-block" />
                    ) : (
                      <span className="text-slate-300 font-bold">—</span>
                    )}
                  </td>
                  <td className="py-3 px-1 text-center">
                    {acc.accountType === 'Cash' ? (
                      acc.supportingRecords.cashBook ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 inline-block" />
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )
                    ) : (
                      <span className="text-slate-300 font-bold">—</span>
                    )}
                  </td>
                  <td className="py-3 px-1 text-center">
                    {acc.accountType === 'Bank' ? (
                      acc.supportingRecords.bankPassbook ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 inline-block" />
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )
                    ) : (
                      <span className="text-slate-300 font-bold">—</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <Badge
                      variant={
                        acc.status === 'Verified'
                          ? 'verified'
                          : acc.status === 'Discrepancy'
                          ? 'discrepancy'
                          : 'pending'
                      }
                      label={acc.status}
                      showIcon={false}
                    />
                  </td>

                  <td className="py-3 px-2 text-center text-slate-700 font-medium">
                    {acc.verifiedBy || '—'}
                  </td>

                  <td className="py-3 px-2 text-center text-slate-500 whitespace-nowrap text-[11px]">
                    {acc.verifiedOn || '—'}
                  </td>

                  <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={acc.remarks || '—'}>
                    {acc.remarks}
                  </td>

                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleSelectAccount(acc.accountId)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                        acc.accountId === activeAccount
                          ? 'bg-blue-600 text-white'
                          : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>View / Update</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Verification Workspace & Guidelines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verification Form Card (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-slate-900">
                Account Verification – {selectedRecord.accountName}
              </h2>
              <Badge
                variant={
                  formStatus === 'Verified'
                    ? 'verified'
                    : formStatus === 'Discrepancy'
                    ? 'discrepancy'
                    : 'pending'
                }
                label={formStatus}
                showIcon={false}
              />
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Account ID: {selectedRecord.accountId}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* 1. Audit Information */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Audit Information
              </div>
              <div className="text-xs text-slate-600 mb-1">
                Previous Audit Report (FY 2017-18)
              </div>
              <a
                href="#audit-file"
                onClick={(e) => {
                  e.preventDefault();
                  alert(
                    'Opening statutory audit report reference: VarshaNivas_Audit_2017-18.pdf (Schedule C: Bank Balances)'
                  );
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline mb-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate max-w-[130px]">VarshaNivas_Audit_2017-18.pdf</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <div className="text-[10px] text-slate-400 mt-1">Audit Closing Balance (31 Mar 2018)</div>
              <div className="text-base font-bold text-slate-900 font-mono">
                {formatINR(selectedRecord.auditClosingBalance)}
              </div>
            </div>

            {/* 2. Recorded Information */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Recorded Information
              </div>
              <div className="text-[10px] text-slate-500">Opening Balance (01 Apr 2018)</div>
              <div className="text-base font-bold text-slate-900 font-mono mb-2">
                {formatINR(selectedRecord.recordedOpeningBalance)}
              </div>

              <div className="text-[10px] text-slate-500">Difference</div>
              <div
                className={`text-base font-bold font-mono ${
                  selectedRecord.difference === 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatINR(selectedRecord.difference)}
              </div>
            </div>

            {/* 3. Supporting Records (Verified) */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Supporting Records
              </div>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formSupporting.auditReport}
                    onChange={(e) =>
                      setFormSupporting({ ...formSupporting, auditReport: e.target.checked })
                    }
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700">Audit Report</span>
                  {formSupporting.auditReport && (
                    <span className="text-[10px] text-emerald-600 font-semibold ml-auto">Verified</span>
                  )}
                </label>

                {selectedRecord.accountType === 'Cash' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formSupporting.cashBook}
                      onChange={(e) =>
                        setFormSupporting({ ...formSupporting, cashBook: e.target.checked })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700">Cash Book</span>
                    {formSupporting.cashBook && (
                      <span className="text-[10px] text-emerald-600 font-semibold ml-auto">Verified</span>
                    )}
                  </label>
                ) : (
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Cash Book</span>
                    <span>Not Applicable</span>
                  </div>
                )}

                {selectedRecord.accountType === 'Bank' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formSupporting.bankPassbook}
                      onChange={(e) =>
                        setFormSupporting({ ...formSupporting, bankPassbook: e.target.checked })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700">Bank Passbook</span>
                    {formSupporting.bankPassbook && (
                      <span className="text-[10px] text-emerald-600 font-semibold ml-auto">Verified</span>
                    )}
                  </label>
                ) : (
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Bank Passbook</span>
                    <span>Not Applicable</span>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-200">
                Mark each item as verified after checking physical documents.
              </div>
            </div>

            {/* 4. Verification Outcome Form */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Verification Outcome
                </div>

                <div className="mb-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as VerificationStatus)}
                    className="w-full bg-white text-xs text-slate-900 border border-slate-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Verified">Verified</option>
                    <option value="Discrepancy">Discrepancy</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="text-[10px] text-slate-500">
                Reviewer: <span className="font-semibold text-slate-700">Sachin Parab</span>
              </div>
            </div>
          </div>

          {/* Remarks Textarea */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-800">
                Remarks <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {formRemarks.length} / 500
              </span>
            </div>
            <textarea
              rows={3}
              value={formRemarks}
              maxLength={500}
              onChange={(e) => setFormRemarks(e.target.value)}
              placeholder="Enter verification notes (e.g. checked with physical audit report pg 12, bank passbook stamp, reason for discrepancy)"
              className="w-full text-xs text-slate-800 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-normal leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => handleSelectAccount(activeAccount)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Verification</span>
            </button>
          </div>
        </div>

        {/* Right: Key Guidelines (4 Cols) */}
        <div className="lg:col-span-4 bg-amber-50/60 rounded-xl border border-amber-200/80 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3 text-amber-900 font-bold text-sm">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <span>Key Guidelines</span>
          </div>

          <div className="space-y-3 text-xs text-amber-950/80">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <p>
                Use the last statutory audit report closing balance for 31 Mar 2018 as the benchmark reference.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <p>
                Verify against cash book (for cash) and bank passbooks (for TDCC and BOM).
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <p>
                Do not change original opening balance here. Record the verification finding.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                4
              </div>
              <p>
                If there is a difference, investigate and record reason in remarks.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                5
              </div>
              <p>
                All accounts should be verified before proceeding to transaction verification.
              </p>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* How To Verify Modal */}
      {showHowToModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-900 animate-in fade-in">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                Opening Balance Verification Guide
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
                <strong>Audit Report Reference:</strong> Compare the statutory audit report for FY 2017–18 closing balances with the April 1, 2018 recorded opening balances.
              </p>
              <p>
                <strong>Bank Passbook Inspection:</strong> Check Bank of Maharashtra (BOM) and Thane District Central Co-op Bank (TDCC) passbooks on 31 Mar 2018 and 01 Apr 2018 to confirm cleared cheques and bank charges.
              </p>
              <p>
                <strong>Discrepancy Handling:</strong> If a difference exists (e.g. BOM ₹ 3,800), do NOT alter the source sheet. Flag it as <em>Discrepancy</em> and record the cheque number or timing difference.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHowToModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

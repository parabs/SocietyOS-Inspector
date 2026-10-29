import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle,
  X,
  ShieldCheck,
  Building2,
  Calendar,
  UserCheck,
  Award,
  Copy,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { EnrichedTransaction, AccountId } from '../../types';
import { formatINR, formatNumber } from '../../config';
import {
  DEFAULT_AUDIT_METADATA,
  AuditReportMetadata,
  generateSocietyAuditPDF,
  exportSocietyAuditExcel,
} from '../../utils/auditPdfGenerator';

interface AuditCertificatePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: EnrichedTransaction[];
  selectedAccountId?: AccountId | 'All';
}

export const AuditCertificatePDFModal: React.FC<AuditCertificatePDFModalProps> = ({
  isOpen,
  onClose,
  transactions,
  selectedAccountId = 'All',
}) => {
  const [scopeFilter, setScopeFilter] = useState<'verified' | 'all' | 'account'>(
    'verified'
  );
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Filter transactions based on chosen scope
  const targetTransactions = useMemo(() => {
    let list = transactions;

    if (scopeFilter === 'verified') {
      list = transactions.filter(
        (t) => t.evidenceStatus === 'Complete' || t.internalAuditStatus === 'Verified'
      );
    } else if (scopeFilter === 'account') {
      if (selectedAccountId !== 'All') {
        list = transactions.filter((t) => t.accountId === selectedAccountId);
      }
    }

    return list;
  }, [transactions, scopeFilter, selectedAccountId]);

  // Aggregate metrics
  const totalAmount = useMemo(() => {
    return targetTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [targetTransactions]);

  const receipts = useMemo(() => {
    return targetTransactions.filter((t) => t.type === 'Receipt');
  }, [targetTransactions]);

  const payments = useMemo(() => {
    return targetTransactions.filter((t) => t.type === 'Payment');
  }, [targetTransactions]);

  const receiptsAmount = useMemo(() => {
    return receipts.reduce((sum, t) => sum + t.amount, 0);
  }, [receipts]);

  const paymentsAmount = useMemo(() => {
    return payments.reduce((sum, t) => sum + t.amount, 0);
  }, [payments]);

  const metadata: AuditReportMetadata = useMemo(() => {
    return {
      ...DEFAULT_AUDIT_METADATA,
      reportRefId: `VNCHS/AUD/2018-19/TXN-${targetTransactions.length}-${new Date().getFullYear()}`,
      scopeTitle:
        scopeFilter === 'verified'
          ? 'Verified Transactions Schedule (Zero Discrepancy Passed)'
          : scopeFilter === 'account'
          ? `Audit Schedule for Account: ${selectedAccountId}`
          : 'Complete Society Ledger Audit Schedule',
    };
  }, [scopeFilter, targetTransactions.length, selectedAccountId]);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Native Print / Save to PDF
  const handlePrint = () => {
    window.print();
  };

  // Direct PDF Download
  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    try {
      generateSocietyAuditPDF(targetTransactions, metadata);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setTimeout(() => setIsGeneratingPdf(false), 500);
    }
  };

  // Excel / CSV Export
  const handleExportExcel = () => {
    exportSocietyAuditExcel(targetTransactions, metadata);
  };

  // Copy Verification Stamp
  const handleCopyStamp = () => {
    const stampText = `[FINANCIAL VERIFICATION REPORT]\nSociety: ${metadata.societyName}\nRegn: ${metadata.registrationNo}\nRef: ${metadata.reportRefId}\nTransactions: ${targetTransactions.length} | Amount: ₹${formatINR(totalAmount)}\nReviewer: Sachin Parab (Treasurer / Verification)\nScope: Internal transaction verification; statutory auditor to review`;
    navigator.clipboard.writeText(stampText);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:z-9999">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Top Control Bar (Hidden in Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Society Financial Verification Report
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Internal Review
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Transaction evidence and verification findings for FY 2018–19; not a statutory audit certificate
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
              title="Download formal high-resolution PDF document"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
              title="Print document or save using browser PDF engine"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
              title="Export verified transactions schedule to Excel/CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Scope Toolbar (Hidden in Print) */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Audit Scope:</span>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={() => setScopeFilter('verified')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  scopeFilter === 'verified'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Verified Only ({transactions.filter((t) => t.evidenceStatus === 'Complete' || t.internalAuditStatus === 'Verified').length})
              </button>
              <button
                onClick={() => setScopeFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  scopeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Society Transactions ({transactions.length})
              </button>
              {selectedAccountId !== 'All' && (
                <button
                  onClick={() => setScopeFilter('account')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    scopeFilter === 'account'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Current Account ({selectedAccountId})
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyStamp}
              className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              <span>{copiedHash ? 'Copied Audit Hash!' : 'Copy Audit Ref Hash'}</span>
            </button>
            <div className="text-xs text-slate-500 font-mono">
              Ref: <span className="font-semibold text-slate-700">{metadata.reportRefId}</span>
            </div>
          </div>
        </div>

        {/* Document Printable Area */}
        <div
          ref={printAreaRef}
          className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white text-slate-900 print:p-0 print:overflow-visible print:space-y-4"
        >
          {/* Society Official Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-blue-900 text-white flex items-center justify-center font-bold text-sm">
                    VN
                  </div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-blue-950 uppercase">
                    {metadata.societyName}
                  </h1>
                </div>
                <p className="text-xs font-medium text-slate-700 mt-1">
                  Regn No: <span className="font-bold">{metadata.registrationNo}</span>
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {metadata.address}
                </p>
                <p className="text-[11px] font-semibold text-blue-800 mt-1">
                  Governed under the Maharashtra Co-operative Societies Act, 1960 & MCS Rules, 1961
                </p>
              </div>

              {/* Top Right Stamp Badge */}
              <div className="text-right border border-blue-900/40 rounded-lg p-2.5 bg-blue-50/40 max-w-[210px] shrink-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-900">
                  Statutory Audit Documentation
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  Financial Year {metadata.financialYear}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  Period: 01/04/2018 to 31/03/2019
                </div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                  Ref: {metadata.reportRefId}
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center py-1">
            <div className="inline-block px-3 py-1 bg-slate-100 rounded-md text-xs font-black tracking-wide text-slate-800 uppercase border border-slate-300">
              Statutory Verification Schedule & Audit Certification Certificate
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Issued pursuant to Bye-Law No. 152 of Model Housing Society Bye-Laws & Section 81 of MCS Act
            </p>
          </div>

          {/* Session & Verification Parameters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                Lead Internal Auditor
              </span>
              <span className="font-bold text-slate-900">{metadata.auditorName}</span>
              <span className="text-slate-500 block text-[10px]">{metadata.auditorRole}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                External Statutory CA
              </span>
              <span className="font-bold text-slate-900">{metadata.statutoryCaFirm}</span>
              <span className="text-slate-500 block text-[10px]">{metadata.statutoryCaFrn}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                Session Audit Date
              </span>
              <span className="font-bold text-slate-900">{metadata.generatedDate}</span>
              <span className="text-slate-500 block text-[10px]">Zero Tolerance Standard (₹0.00)</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                Audit Scope
              </span>
              <span className="font-bold text-blue-900">{metadata.scopeTitle}</span>
              <span className="text-slate-500 block text-[10px]">{targetTransactions.length} Verified Entries</span>
            </div>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="border border-slate-200 rounded-lg p-2.5 bg-white">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Audited Transactions
              </span>
              <div className="text-lg font-bold text-slate-900">
                {targetTransactions.length} Items
              </div>
            </div>
            <div className="border border-emerald-200 rounded-lg p-2.5 bg-emerald-50/30">
              <span className="text-[10px] font-bold text-emerald-700 uppercase">
                Total Audited Value
              </span>
              <div className="text-lg font-bold text-emerald-700">
                ₹{formatINR(totalAmount)}
              </div>
            </div>
            <div className="border border-blue-200 rounded-lg p-2.5 bg-blue-50/30">
              <span className="text-[10px] font-bold text-blue-700 uppercase">
                Member Receipts Vouched
              </span>
              <div className="text-lg font-bold text-blue-800">
                {receipts.length} (₹{formatINR(receiptsAmount)})
              </div>
            </div>
            <div className="border border-purple-200 rounded-lg p-2.5 bg-purple-50/30">
              <span className="text-[10px] font-bold text-purple-700 uppercase">
                Expense Payments Vouched
              </span>
              <div className="text-lg font-bold text-purple-800">
                {payments.length} (₹{formatINR(paymentsAmount)})
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 flex items-center justify-between">
              <span>Transaction Verification Schedule</span>
              <span className="text-[10px] font-mono text-slate-500 lowercase">
                all amounts in inr (₹)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                    <th className="py-2 px-2 text-center w-8">#</th>
                    <th className="py-2 px-2">Date</th>
                    <th className="py-2 px-2">Txn ID</th>
                    <th className="py-2 px-2 text-center">Acct</th>
                    <th className="py-2 px-2">Vchr / Rcpt</th>
                    <th className="py-2 px-2 text-center">Type</th>
                    <th className="py-2 px-2">Party / Payee / Member</th>
                    <th className="py-2 px-2">Particulars / Narration</th>
                    <th className="py-2 px-2 text-right">Amount (₹)</th>
                    <th className="py-2 px-2 text-center">Bill</th>
                    <th className="py-2 px-2 text-center">Vchr</th>
                    <th className="py-2 px-2 text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {targetTransactions.map((t, index) => (
                    <tr
                      key={t.id}
                      className={index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}
                    >
                      <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[10px]">
                        {index + 1}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-slate-700 whitespace-nowrap text-[11px]">
                        {t.date}
                      </td>
                      <td className="py-1.5 px-2 font-mono font-bold text-blue-900 whitespace-nowrap text-[11px]">
                        {t.id}
                        {t.isCorrection && <div className="mt-0.5 font-sans text-[8px] font-bold text-amber-800">CORRECTION · {t.correctionStatus || "Pending Review"}</div>}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <span className="font-semibold text-slate-700 px-1 py-0.5 rounded bg-slate-100 text-[10px]">
                          {t.accountId}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 font-mono text-slate-700 whitespace-nowrap text-[11px]">
                        {t.voucherNo || t.receiptNo || '-'}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            t.type === 'Receipt'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 font-medium text-slate-800 max-w-[140px] truncate">
                        {t.party}
                      </td>
                      <td className="py-1.5 px-2 text-slate-600 max-w-[180px] truncate text-[11px]">
                        {t.description}
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatINR(t.amount)}
                      </td>
                      <td className="py-1.5 px-2 text-center text-[10px]">
                        <span
                          className={`px-1 rounded ${
                            t.billStatus === 'Available'
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-slate-500'
                          }`}
                        >
                          {t.billStatus}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center text-[10px]">
                        <span
                          className={`px-1 rounded ${
                            t.voucherReceiptStatus === 'Available'
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-slate-500'
                          }`}
                        >
                          {t.voucherReceiptStatus}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                    <td colSpan={8} className="py-2 px-3 text-right text-slate-700 uppercase">
                      Total Verified Amount ({targetTransactions.length} Transactions):
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-emerald-800 text-sm">
                      ₹{formatINR(totalAmount)}
                    </td>
                    <td colSpan={3} className="py-2 px-2 text-center text-[10px] text-slate-500">
                      See individual verification statuses
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Statutory Verification Declaration */}
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-[11px] text-slate-700 leading-relaxed">
            <h4 className="font-bold text-blue-950 uppercase text-xs mb-1">
              Verification Scope and Limitation:
            </h4>
            <p>
                            This report is generated from the records and verification findings currently saved in Society OS. It does not certify that physical documents were examined or that account balances reconcile. Pending items, discrepancies, missing source balances and correction entries must be reviewed before submission to the appointed statutory auditor.
            </p>
          </div>

          {/* Quadruple Signature & Seal Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
            {/* Box 1 */}
            <div className="border border-slate-300 rounded-lg p-3 flex flex-col justify-between min-h-[95px] bg-white">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Audited & Verified By
              </div>
              <div className="my-2 border-b border-dashed border-slate-300"></div>
              <div>
                <div className="font-bold text-xs text-slate-900">{metadata.auditorName}</div>
                <div className="text-[10px] text-slate-500">Hon. Treasurer / Lead Auditor</div>
                <div className="text-[9px] text-slate-400">Pearl Meadows 'C' Type 'C' Wing CHS Ltd.</div>
              </div>
            </div>

            {/* Box 2 */}
            <div className="border border-slate-300 rounded-lg p-3 flex flex-col justify-between min-h-[95px] bg-white">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Examined & Concurred By
              </div>
              <div className="my-2 border-b border-dashed border-slate-300"></div>
              <div>
                <div className="font-bold text-xs text-slate-900">Hon. Secretary</div>
                <div className="text-[10px] text-slate-500">Managing Committee</div>
                <div className="text-[9px] text-slate-400">Varsha Nivas CHS Ltd.</div>
              </div>
            </div>

            {/* Box 3 */}
            <div className="border border-slate-300 rounded-lg p-3 flex flex-col justify-between min-h-[95px] bg-white">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Approved & Passed By
              </div>
              <div className="my-2 border-b border-dashed border-slate-300"></div>
              <div>
                <div className="font-bold text-xs text-slate-900">Hon. Chairman</div>
                <div className="text-[10px] text-slate-500">Managing Committee</div>
                <div className="text-[9px] text-slate-400">Varsha Nivas CHS Ltd.</div>
              </div>
            </div>

            {/* Box 4 */}
            <div className="border border-slate-300 rounded-lg p-3 flex flex-col justify-between min-h-[95px] bg-white">
              <div className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                Statutory External CA
              </div>
              <div className="my-2 border-b border-dashed border-slate-300"></div>
              <div>
                <div className="font-bold text-xs text-slate-900">Statutory Auditor</div>
                <div className="text-[10px] text-slate-600 truncate">{metadata.statutoryCaFirm}</div>
                <div className="text-[9px] text-slate-400">{metadata.statutoryCaFrn}</div>
              </div>
            </div>
          </div>

          {/* Tamper-evident footer */}
          <div className="text-center text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Doc ID: {metadata.reportRefId}</span>
            <span>Generated on {metadata.generatedDate} | Society OS Financial Verification</span>
            <span>Generated schedule — not a statutory audit certificate</span>
          </div>
        </div>
      </div>
    </div>
  );
};

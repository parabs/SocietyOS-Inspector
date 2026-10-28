import React from 'react';
import { Lock, AlertCircle, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useVerification } from '../../context/VerificationContext';
import { formatNumber } from '../../config';

interface FinancialPlaceholderProps {
  moduleName: string;
  moduleDescription: string;
}

export const FinancialPlaceholder: React.FC<FinancialPlaceholderProps> = ({
  moduleName,
  moduleDescription,
}) => {
  const { setCurrentScreen, stats } = useVerification();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Lock className="w-7 h-7" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-3">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Verification Gate Enforced</span>
        </span>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          {moduleName} Locked
        </h1>

        <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6">
          {moduleDescription}. In accordance with society accounting standards, financial management
          dashboards and reports remain locked until Phase 1 historical record verification is
          complete.
        </p>

        {/* Readiness progress box */}
        <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8 text-left">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700">FY 2018–19 Verification Progress</span>
            <span className="text-xs font-bold text-blue-600">{stats.readinessPercentage}% Complete</span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.readinessPercentage}%` }}
            />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>• Opening Balances Verified</span>
              <span className="font-semibold text-slate-900">
                {stats.openingBalancesVerified} of {stats.openingBalancesTotal} Accounts
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>• Transactions Inspected</span>
              <span className="font-semibold text-slate-900">
                {stats.inspectedTransactions} of {formatNumber(stats.totalTransactions)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>• Monthly Accounts Reconciled</span>
              <span className="font-semibold text-slate-900">
                {stats.reconciledAccountMonths} of {stats.totalAccountMonths} Account-months
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setCurrentScreen('verification-dashboard')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Verification Dashboard</span>
        </button>
      </div>
    </div>
  );
};

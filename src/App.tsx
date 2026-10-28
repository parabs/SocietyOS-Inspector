/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VerificationProvider, useVerification } from './context/VerificationContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { VerificationDashboard } from './components/verification/VerificationDashboard';
import { OpeningBalanceVerification } from './components/verification/OpeningBalanceVerification';
import { TransactionVerification } from './components/verification/TransactionVerification';
import { MonthlyReconciliation } from './components/verification/MonthlyReconciliation';
import { FinancialPlaceholder } from './components/financial/FinancialPlaceholder';
import { SettingsView } from './components/admin/SettingsView';

const MainContent: React.FC = () => {
  const { currentScreen } = useVerification();

  switch (currentScreen) {
    case 'verification-dashboard':
      return <VerificationDashboard />;

    case 'opening-balances':
      return <OpeningBalanceVerification />;

    case 'transaction-verification':
      return <TransactionVerification />;

    case 'monthly-reconciliation':
      return <MonthlyReconciliation />;

    case 'financial-summary':
      return (
        <FinancialPlaceholder
          moduleName="Financial Summary Dashboard"
          moduleDescription="Demand, collections, expense analysis, and closing balance summaries"
        />
      );

    case 'demand-collections':
      return (
        <FinancialPlaceholder
          moduleName="Demand & Collections"
          moduleDescription="Flat-owner receivables, maintenance demands, collection efficiency, and ageing analysis"
        />
      );

    case 'payments-expenses':
      return (
        <FinancialPlaceholder
          moduleName="Payments & Expenses"
          moduleDescription="Vendor analysis, payment breakdown by category, advance payments, and AMC tracking"
        />
      );

    case 'party-ledger':
      return (
        <FinancialPlaceholder
          moduleName="Party-wise Ledger"
          moduleDescription="Member and vendor personal accounts, advances, and supporting document ledgers"
        />
      );

    case 'audit-evidence':
      return (
        <FinancialPlaceholder
          moduleName="Audit Evidence & Statutory Compliance"
          moduleDescription="Bylaw compliance tracking, voucher completeness registers, and statutory audit readiness"
        />
      );

    case 'bank-reconciliation':
      return (
        <FinancialPlaceholder
          moduleName="Bank Statement Direct Reconciliation"
          moduleDescription="Bank statement import, automated clearance date matching, and unpresented cheque tracking"
        />
      );

    case 'observations-actions':
      return (
        <FinancialPlaceholder
          moduleName="Observations & Action Items"
          moduleDescription="Managing Committee observations, auditor queries, and corrective action workflows"
        />
      );

    case 'reports':
      return (
        <FinancialPlaceholder
          moduleName="Statutory Reports & Registers"
          moduleDescription="Receipts and Payments Account, Income & Expenditure, Balance Sheet, Cash Book, and Bank Books"
        />
      );

    case 'settings':
    case 'data-management':
    case 'user-access':
      return <SettingsView />;

    default:
      return <VerificationDashboard />;
  }
};

export default function App() {
  return (
    <VerificationProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
            <MainContent />
          </main>
        </div>
      </div>
    </VerificationProvider>
  );
}

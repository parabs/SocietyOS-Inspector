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
import { SocietyRoleDashboards } from './components/financial/SocietyRoleDashboards';
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
    case 'demand-collections':
    case 'payments-expenses':
    case 'party-ledger':
    case 'audit-evidence':
    case 'bank-reconciliation':
    case 'observations-actions':
    case 'reports':
    case 'treasurer-dashboard':
    case 'secretary-dashboard':
    case 'chairman-dashboard':
    case 'member-dashboard':
    case 'auditor-dashboard':
      return <SocietyRoleDashboards screen={currentScreen} />;

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

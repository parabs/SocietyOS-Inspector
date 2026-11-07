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
import { SocietyFinancialDashboards } from './components/financial/SocietyFinancialDashboards';
import { SettingsView } from './components/admin/SettingsView';
import { DataManagement } from './components/admin/DataManagement';
import { DataManagementHub } from './components/admin/DataManagementHub';
import { DataManagementControlCenter } from './components/admin/DataManagementControlCenter';
import { FinancialYearGovernance } from './components/financial/FinancialYearGovernance';
import { AnnualAuditAccountClosure } from './components/financial/AnnualAuditAccountClosure';
import { ComplianceCommandCentre } from './components/compliance/ComplianceCommandCentre';

const MainContent: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useVerification();

  switch (currentScreen) {
    case 'compliance-command-centre':
      return <ComplianceCommandCentre />;
    case 'verification-dashboard':
      return <VerificationDashboard />;

    case 'opening-balances':
      return <OpeningBalanceVerification />;

    case 'transaction-verification':
      return <TransactionVerification />;

    case 'monthly-reconciliation':
      return <MonthlyReconciliation />;

    case 'annual-financial-review':
      return <AnnualAuditAccountClosure />;

    case 'year-end-closure':
    case 'internal-audit':
    case 'statutory-audit-handover':
    case 'final-approval-freeze':
      return <FinancialYearGovernance screen={currentScreen} />;

    case 'financial-summary':
    case 'demand-collections':
    case 'payments-expenses':
    case 'party-ledger':
    case 'audit-evidence':
    case 'bank-reconciliation':
    case 'observations-actions':
    case 'reports':
    case 'ledger-reports':
      return <SocietyFinancialDashboards screen={currentScreen} />;

    case 'data-management':
      return <DataManagementControlCenter initialTab="masters" />;

    case 'import-wizard':
      return <DataManagementHub initialSection="import" />;

    case 'data-quality':
      return <DataManagementControlCenter initialTab="quality" />;

    case 'options-config':
      return <DataManagementControlCenter initialTab="options" />;

    case 'data-audit-trail':
      return <DataManagementControlCenter initialTab="audit" />;

    case 'transactions':
      return <DataManagementControlCenter initialTab="transactions" />;

    case 'settings':
    case 'user-access':
      return <SettingsView />;

    default:
      return <VerificationDashboard />;
  }
};

export default function App() {
  return (
    <VerificationProvider>
      <div className="h-dvh min-h-0 overflow-hidden bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <div className="shrink-0"><Header /></div>
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <Sidebar />
          <main className="min-w-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 sm:px-6 lg:px-8 py-6">
            <MainContent />
          </main>
        </div>
      </div>
    </VerificationProvider>
  );
}

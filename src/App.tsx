/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { PublicDemoMode } from './components/demo/PublicDemoMode';
import { AuthGate } from './components/auth/AuthGate';
import { VerificationProvider, useVerification } from './context/VerificationContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { VerificationDashboard } from './components/verification/VerificationDashboard';
import { AuditComplianceHome } from './components/verification/AuditComplianceHome';
import { OpeningBalanceVerification } from './components/verification/OpeningBalanceVerification';
import { TransactionVerification } from './components/verification/TransactionVerification';
import { MonthlyReconciliation } from './components/verification/MonthlyReconciliation';
import { SocietyFinancialDashboards } from './components/financial/SocietyFinancialDashboards';
import { SettingsView } from './components/admin/SettingsView';
import { UserAccessManagement } from './components/admin/UserAccessManagement';
import { DataManagementControlCenter } from './components/admin/DataManagementControlCenter';
import { DataManagementHub } from './components/admin/DataManagementHub';
import { FinancialYearGovernance } from './components/financial/FinancialYearGovernance';
import { AnnualAuditAccountClosure } from './components/financial/AnnualAuditAccountClosure';
import { ComplianceCommandCentre } from './components/compliance/ComplianceCommandCentre';
import { useSocietyAccess } from './context/SocietyAccessContext';
import { SCREEN_PERMISSIONS } from './auth/permissions';

const MainContent: React.FC = () => {
  const { currentScreen } = useVerification();
  const { hasPermission } = useSocietyAccess();
  const requiredPermissions = SCREEN_PERMISSIONS[currentScreen] ?? [];

  if (!requiredPermissions.length || !hasPermission(...requiredPermissions)) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-base font-bold text-amber-900">Access restricted</h2>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Your active society membership does not include the permission required for this workspace.
          Contact the Society Admin if you believe this access is needed.
        </p>
      </div>
    );
  }

  switch (currentScreen) {
    case 'compliance-command-centre':
      return <ComplianceCommandCentre />;
    case 'verification-dashboard':
      return <AuditComplianceHome />;
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
    case 'user-access':
      return <UserAccessManagement />;
    case 'settings':
      return <SettingsView />;
    default:
      return <div className="p-6 text-sm text-slate-600">This workspace is not available for the selected role.</div>;
  }
};

export default function App() {
  const isLiveWorkspace = new URLSearchParams(window.location.search).get('mode') === 'live';
  if (!isLiveWorkspace) return <PublicDemoMode />;

  return (
    <AuthGate>
      <VerificationProvider>
        <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
          <div className="shrink-0"><Header /></div>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <Sidebar />
            <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6 lg:px-8">
              <MainContent />
            </main>
          </div>
        </div>
      </VerificationProvider>
    </AuthGate>
  );
}

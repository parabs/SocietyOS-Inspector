import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, ClipboardCheck, ShieldCheck, FileChartColumn,
  Settings, Database, FileCheck2, CheckSquare, BarChart3, PieChart,
  Receipt, CreditCard, Users, Files, FileText, Landmark, AlertCircle,
  ChevronDown, ChevronRight, Menu, X, Lock, CalendarCheck, FolderCheck,
} from 'lucide-react';
import { useVerification, ScreenId } from '../../context/VerificationContext';

type SectionId = 'dashboard' | 'verification' | 'compliance' | 'reports' | 'admin';

const SECTION_SCREENS: Record<SectionId, ScreenId[]> = {
  dashboard: ['financial-summary', 'demand-collections', 'payments-expenses', 'party-ledger', 'bank-reconciliation', 'verification-dashboard'],
  verification: ['opening-balances', 'transaction-verification', 'monthly-reconciliation'],
  compliance: ['compliance-command-centre', 'internal-audit', 'statutory-audit-handover', 'annual-financial-review', 'year-end-closure', 'final-approval-freeze', 'audit-evidence', 'observations-actions'],
  reports: ['reports'],
  admin: ['data-management', 'import-wizard', 'transactions', 'data-quality', 'data-audit-trail', 'options-config', 'user-access', 'settings'],
};

export const Sidebar: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useVerification();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<SectionId | null>(null);

  useEffect(() => {
    const section = (Object.keys(SECTION_SCREENS) as SectionId[])
      .find(key => SECTION_SCREENS[key].includes(currentScreen));
    setExpanded(section || null);
  }, [currentScreen]);

  const navItemClass = (screen: ScreenId) =>
    `w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
      currentScreen === screen ? 'bg-blue-600 text-white font-semibold shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;

  const go = (screen: ScreenId) => {
    setCurrentScreen(screen);
    setMobileOpen(false);
  };

  const sectionButton = (id: SectionId, title: string, icon: React.ReactNode) => (
    <button onClick={() => setExpanded(prev => prev === id ? null : id)}
      aria-expanded={expanded === id}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
        expanded === id ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}>
      <span className="grid min-w-0 flex-1 grid-cols-[20px_minmax(0,1fr)] items-center gap-2 text-left">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
        <span className="block min-w-0 whitespace-nowrap !text-left text-[12px] font-semibold leading-5">{title}</span>
      </span>
      <span className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center">
        {expanded === id ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
      </span>
    </button>
  );

  const item = (screen: ScreenId, label: string, icon: React.ReactNode, locked = false) => (
    <button key={screen} onClick={() => go(screen)} className={navItemClass(screen)}>
      {icon}<span className="min-w-0 flex-1 truncate">{label}</span>
      {locked && <Lock className="h-3 w-3 shrink-0 text-slate-500"/>}
    </button>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 rounded-full bg-blue-600 p-3 text-white shadow-lg"
        aria-label="Toggle navigation">
        {mobileOpen ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}
      </button>
      {mobileOpen && <div onClick={() => setMobileOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-slate-900/60"/>}
      <aside className={`fixed top-[89px] bottom-0 left-0 z-40 flex w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-800 bg-slate-900 transition-transform duration-200 lg:sticky lg:top-0 lg:h-full lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-2 p-3">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Workspace</div>
          <div className="pt-3">
            {sectionButton('dashboard', 'Dashboard', <LayoutDashboard className="h-5 w-5"/>)}
            {expanded === 'dashboard' && <div className="mt-1 space-y-1 pl-2">
              {item('financial-summary', 'Financial Summary', <PieChart className="h-4 w-4"/>)}
              {item('demand-collections', 'Demand & Collections', <Receipt className="h-4 w-4"/>)}
              {item('payments-expenses', 'Payments & Expenses', <CreditCard className="h-4 w-4"/>)}
              {item('party-ledger', 'Party-wise Ledger', <Users className="h-4 w-4"/>)}
              {item('verification-dashboard', 'Verification Dashboard', <LayoutDashboard className="h-4 w-4"/>)}
              {item('bank-reconciliation', 'Reconciliation Dashboard', <Landmark className="h-4 w-4"/>)}
            </div>}

            {sectionButton('verification', 'Verification', <ClipboardCheck className="h-5 w-5"/>)}
            {expanded === 'verification' && <div className="mt-1 space-y-1 pl-2">
              {item('opening-balances', 'Opening Balance Verification', <CheckSquare className="h-4 w-4"/>)}
              {item('transaction-verification', 'Transaction Verification', <FileCheck2 className="h-4 w-4"/>)}
              {item('monthly-reconciliation', 'Monthly Reconciliation', <BarChart3 className="h-4 w-4"/>)}
            </div>}

            {sectionButton('compliance', 'Compliance & Governance', <ShieldCheck className="h-5 w-5"/>)}
            {expanded === 'compliance' && <div className="mt-1 space-y-1 pl-2">
              {item('compliance-command-centre', 'Compliance Command Centre', <CalendarCheck className="h-4 w-4"/>)}
              {item('internal-audit', 'Internal Audit', <ShieldCheck className="h-4 w-4"/>)}
              {item('statutory-audit-handover', 'Statutory Audit Handover', <Files className="h-4 w-4"/>)}
              {item('annual-financial-review', 'Annual Financial Review', <PieChart className="h-4 w-4"/>)}
              {item('year-end-closure', 'Year-End Account Closure', <FileCheck2 className="h-4 w-4"/>)}
              {item('final-approval-freeze', 'Final Approval & Freeze', <Lock className="h-4 w-4"/>)}
              {item('audit-evidence', 'Evidence Register', <FolderCheck className="h-4 w-4"/>)}
              {item('observations-actions', 'Audit Observations & Actions', <AlertCircle className="h-4 w-4"/>)}
            </div>}

            {sectionButton('reports', 'Reports', <FileChartColumn className="h-5 w-5"/>)}
            {expanded === 'reports' && <div className="mt-1 space-y-1 pl-2">
              {item('reports', 'Reports & Registers', <Files className="h-4 w-4"/>)}
            </div>}

            {sectionButton('admin', 'Administration', <Settings className="h-5 w-5"/>)}
            {expanded === 'admin' && <div className="mt-1 space-y-1 pl-2">
              {item('data-management', 'Data Management & Masters', <Database className="h-4 w-4"/>)}
              {item('import-wizard', 'Import Wizard', <Files className="h-4 w-4"/>)}
              {item('transactions', 'Transactions Workspace', <Receipt className="h-4 w-4"/>)}
              {item('data-quality', 'Data Quality', <CheckSquare className="h-4 w-4"/>)}
              {item('data-audit-trail', 'Data Audit Trail', <FileText className="h-4 w-4"/>)}
              {item('options-config', 'Configuration', <Settings className="h-4 w-4"/>)}
              {item('user-access', 'User & Role Access', <ShieldCheck className="h-4 w-4"/>)}
              {item('settings', 'Settings', <Settings className="h-4 w-4"/>)}
            </div>}
          </div>
        </div>
        <div className="border-t border-slate-800 bg-slate-950/40 p-3 text-[11px] text-slate-400">
          <div className="mb-1 flex items-center justify-between font-semibold text-slate-300">
            <span>Verification Engine</span><span className="flex items-center gap-1 text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Phase 1 Active</span>
          </div>
          <div className="text-[10px]">Source data is strictly read-only. Inspections stored separately.</div>
        </div>
      </aside>
    </>
  );
};

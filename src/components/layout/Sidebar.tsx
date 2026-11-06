import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, ClipboardCheck, ShieldCheck, FileChartColumn,
  Settings, Database, FileCheck2, CheckSquare, BarChart3, PieChart,
  Receipt, CreditCard, Users, Files, FileText, Landmark, AlertCircle,
  ChevronDown, ChevronRight, Menu, X, Lock, CalendarCheck, FolderCheck,
  ClipboardList, Upload, SlidersHorizontal, History, Wallet, Building2,
} from 'lucide-react';
import { useVerification, ScreenId } from '../../context/VerificationContext';

type SectionId =
  | 'dashboards'
  | 'reports'
  | 'verification'
  | 'audit'
  | 'data'
  | 'admin';

const SECTION_SCREENS: Record<SectionId, ScreenId[]> = {
  dashboards: ['financial-summary', 'demand-collections', 'payments-expenses', 'party-ledger'],
  reports: ['reports', 'ledger-reports', 'bank-reconciliation'],
  verification: ['opening-balances', 'transaction-verification', 'monthly-reconciliation', 'data-quality'],
  audit: [
    'compliance-command-centre', 'annual-financial-review', 'year-end-closure',
    'internal-audit', 'statutory-audit-handover', 'final-approval-freeze',
    'audit-evidence', 'observations-actions', 'data-audit-trail',
  ],
  data: ['data-management', 'import-wizard', 'transactions', 'options-config'],
  admin: ['user-access', 'settings'],
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
      currentScreen === screen
        ? 'bg-blue-600 text-white font-semibold shadow-xs'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;

  const go = (screen: ScreenId) => {
    setCurrentScreen(screen);
    setMobileOpen(false);
  };

  const sectionButton = (id: SectionId, title: string, icon: React.ReactNode) => (
    <button
      onClick={() => setExpanded(prev => prev === id ? null : id)}
      aria-expanded={expanded === id}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
        expanded === id ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <span className="flex items-center gap-3">{icon}{title}</span>
      {expanded === id ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
    </button>
  );

  const item = (screen: ScreenId, label: string, icon: React.ReactNode) => (
    <button key={screen} onClick={() => go(screen)} className={navItemClass(screen)}>
      {icon}<span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 rounded-full bg-blue-600 p-3 text-white shadow-lg"
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}
      </button>
      {mobileOpen && <div onClick={() => setMobileOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-slate-900/60"/>}
      <aside className={`fixed top-[89px] bottom-0 left-0 z-40 flex w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-800 bg-slate-900 transition-transform duration-200 lg:sticky lg:top-0 lg:h-full lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-2 p-3">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Workspace</div>
          <button
            onClick={() => go('verification-dashboard')}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold ${
              currentScreen === 'verification-dashboard'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-5 w-5"/>Dashboard
          </button>

          <div className="pt-3">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Explore</div>

            {sectionButton('dashboards', 'Dashboards', <BarChart3 className="h-5 w-5"/>)}
            {expanded === 'dashboards' && <div className="mt-1 space-y-1 pl-2">
              {item('financial-summary', 'Overall Financial Position', <PieChart className="h-4 w-4"/>)}
              {item('demand-collections', 'Demand & Collections', <Receipt className="h-4 w-4"/>)}
              {item('payments-expenses', 'Payments & Expenses', <CreditCard className="h-4 w-4"/>)}
              {item('party-ledger', 'Financial Risk & Party Balances', <Users className="h-4 w-4"/>)}
            </div>}

            {sectionButton('reports', 'Reports & Registers', <FileChartColumn className="h-5 w-5"/>)}
            {expanded === 'reports' && <div className="mt-1 space-y-1 pl-2">
              {item('reports', 'All Reports & Registers', <Files className="h-4 w-4"/>)}
              {item('ledger-reports', 'Account, Party & Category Ledgers', <FileText className="h-4 w-4"/>)}
              {item('bank-reconciliation', 'Bank & UPI Reconciliation', <Landmark className="h-4 w-4"/>)}
            </div>}

            {sectionButton('verification', 'Verification & Data Quality', <ClipboardCheck className="h-5 w-5"/>)}
            {expanded === 'verification' && <div className="mt-1 space-y-1 pl-2">
              {item('opening-balances', 'Opening Balance Verification', <CheckSquare className="h-4 w-4"/>)}
              {item('transaction-verification', 'Transaction Verification', <FileCheck2 className="h-4 w-4"/>)}
              {item('monthly-reconciliation', 'Monthly Reconciliation', <BarChart3 className="h-4 w-4"/>)}
              {item('data-quality', 'Data Quality & Exceptions', <AlertCircle className="h-4 w-4"/>)}
            </div>}

            {sectionButton('audit', 'Audit & Governance', <ShieldCheck className="h-5 w-5"/>)}
            {expanded === 'audit' && <div className="mt-1 space-y-1 pl-2">
              {item('compliance-command-centre', 'Compliance Calendar & Controls', <CalendarCheck className="h-4 w-4"/>)}
              {item('annual-financial-review', 'Annual Financial Review', <PieChart className="h-4 w-4"/>)}
              {item('year-end-closure', 'Year-End Account Closure', <Wallet className="h-4 w-4"/>)}
              {item('internal-audit', 'Internal Audit', <ShieldCheck className="h-4 w-4"/>)}
              {item('statutory-audit-handover', 'Statutory Audit Handover', <Files className="h-4 w-4"/>)}
              {item('audit-evidence', 'Audit Evidence Register', <FolderCheck className="h-4 w-4"/>)}
              {item('observations-actions', 'Audit Rectification & Actions', <AlertCircle className="h-4 w-4"/>)}
              {item('final-approval-freeze', 'Final Approval & Books Freeze', <Lock className="h-4 w-4"/>)}
              {item('data-audit-trail', 'Data Audit Trail', <History className="h-4 w-4"/>)}
            </div>}

            {sectionButton('data', 'Data Management', <Database className="h-5 w-5"/>)}
            {expanded === 'data' && <div className="mt-1 space-y-1 pl-2">
              {item('transactions', 'Transactions Workspace', <Receipt className="h-4 w-4"/>)}
              {item('import-wizard', 'Import & Source Data', <Upload className="h-4 w-4"/>)}
              {item('data-management', 'Masters & Registers Setup', <Building2 className="h-4 w-4"/>)}
              {item('options-config', 'Rules & Configuration', <SlidersHorizontal className="h-4 w-4"/>)}
            </div>}

            {sectionButton('admin', 'Administration', <Settings className="h-5 w-5"/>)}
            {expanded === 'admin' && <div className="mt-1 space-y-1 pl-2">
              {item('user-access', 'User & Role Access', <ShieldCheck className="h-4 w-4"/>)}
              {item('settings', 'Society & System Settings', <Settings className="h-4 w-4"/>)}
            </div>}
          </div>
        </div>

        <div className="border-t border-slate-800 bg-slate-950/40 p-3 text-[11px] text-slate-400">
          <div className="mb-1 flex items-center justify-between font-semibold text-slate-300">
            <span>Verification Engine</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Phase 1 Active
            </span>
          </div>
          <div className="text-[10px]">Source records remain protected; verification and audit actions are tracked separately.</div>
        </div>
      </aside>
    </>
  );
};

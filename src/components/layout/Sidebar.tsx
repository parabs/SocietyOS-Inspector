import React, { useState } from 'react';
import {
  LayoutDashboard,
  Home,
  CheckSquare,
  FileCheck2,
  BarChart3,
  PieChart,
  Receipt,
  CreditCard,
  Users,
  FileText,
  Landmark,
  AlertCircle,
  Files,
  Settings,
  Database,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Lock,
} from 'lucide-react';
import { useVerification, ScreenId } from '../../context/VerificationContext';

export const Sidebar: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useVerification();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Collapsible group state
  const [openGroups, setOpenGroups] = useState({
    verification: true,
    financial: false,
    audit: false,
    reports: false,
    admin: false,
  });

  const toggleGroup = (key: keyof typeof openGroups) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const navItemClass = (screen: ScreenId) => {
    const isActive = currentScreen === screen;
    return `w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
      isActive
        ? 'bg-blue-600 text-white font-semibold shadow-xs'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;
  };

  const handleNavClick = (screen: ScreenId) => {
    setCurrentScreen(screen);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer"
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-[57px] left-0 bottom-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 overflow-y-auto transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ height: 'calc(100vh - 57px)' }}
      >
        <div className="p-3 space-y-4">
          {/* Quick Dashboard */}
          <button
            onClick={() => handleNavClick('verification-dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              currentScreen === 'verification-dashboard'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* Group 1: INITIAL VERIFICATION (PRIMARY) */}
          <div>
            <button
              onClick={() => toggleGroup('verification')}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 hover:text-slate-200 cursor-pointer"
            >
              <span>Initial Verification</span>
              {openGroups.verification ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {openGroups.verification && (
              <div className="mt-1 space-y-1 pl-1">
                <button
                  onClick={() => handleNavClick('verification-dashboard')}
                  className={navItemClass('verification-dashboard')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span className="truncate">Verification Dashboard</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('opening-balances')}
                  className={navItemClass('opening-balances')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <CheckSquare className="w-4 h-4 shrink-0" />
                    <span className="truncate">Opening Balance Verification</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('transaction-verification')}
                  className={navItemClass('transaction-verification')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileCheck2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">Transaction Verification</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('monthly-reconciliation')}
                  className={navItemClass('monthly-reconciliation')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <BarChart3 className="w-4 h-4 shrink-0" />
                    <span className="truncate">Monthly Reconciliation</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Group 2: FINANCIAL MANAGEMENT */}
          <div>
            <button
              onClick={() => toggleGroup('financial')}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 hover:text-slate-200 cursor-pointer"
            >
              <span>Financial Management</span>
              {openGroups.financial ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {openGroups.financial && (
              <div className="mt-1 space-y-1 pl-1">
                <button
                  onClick={() => handleNavClick('financial-summary')}
                  className={navItemClass('financial-summary')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <PieChart className="w-4 h-4 shrink-0" />
                    <span className="truncate">Financial Summary</span>
                  </div>
                  <Lock className="w-3 h-3 text-slate-500" />
                </button>

                <button
                  onClick={() => handleNavClick('demand-collections')}
                  className={navItemClass('demand-collections')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Receipt className="w-4 h-4 shrink-0" />
                    <span className="truncate">Demand &amp; Collections</span>
                  </div>
                  <Lock className="w-3 h-3 text-slate-500" />
                </button>

                <button
                  onClick={() => handleNavClick('payments-expenses')}
                  className={navItemClass('payments-expenses')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span className="truncate">Payments &amp; Expenses</span>
                  </div>
                  <Lock className="w-3 h-3 text-slate-500" />
                </button>

                <button
                  onClick={() => handleNavClick('party-ledger')}
                  className={navItemClass('party-ledger')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Users className="w-4 h-4 shrink-0" />
                    <span className="truncate">Party-wise Ledger</span>
                  </div>
                  <Lock className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            )}
          </div>

          {/* Group 3: AUDIT & COMPLIANCE */}
          <div>
            <button
              onClick={() => toggleGroup('audit')}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 hover:text-slate-200 cursor-pointer"
            >
              <span>Audit &amp; Compliance</span>
              {openGroups.audit ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {openGroups.audit && (
              <div className="mt-1 space-y-1 pl-1">
                <button
                  onClick={() => handleNavClick('audit-evidence')}
                  className={navItemClass('audit-evidence')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">Audit Evidence</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('bank-reconciliation')}
                  className={navItemClass('bank-reconciliation')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Landmark className="w-4 h-4 shrink-0" />
                    <span className="truncate">Bank Reconciliation</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('observations-actions')}
                  className={navItemClass('observations-actions')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate">Observations &amp; Actions</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Group 4: REPORTS */}
          <div>
            <button
              onClick={() => toggleGroup('reports')}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 hover:text-slate-200 cursor-pointer"
            >
              <span>Reports</span>
              {openGroups.reports ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {openGroups.reports && (
              <div className="mt-1 space-y-1 pl-1">
                <button
                  onClick={() => handleNavClick('reports')}
                  className={navItemClass('reports')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Files className="w-4 h-4 shrink-0" />
                    <span className="truncate">Reports &amp; Registers</span>
                  </div>
                  <Lock className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            )}
          </div>

          {/* Group 5: ADMINISTRATION */}
          <div>
            <button
              onClick={() => toggleGroup('admin')}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 hover:text-slate-200 cursor-pointer"
            >
              <span>Administration</span>
              {openGroups.admin ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {openGroups.admin && (
              <div className="mt-1 space-y-1 pl-1">
                <button
                  onClick={() => handleNavClick('settings')}
                  className={navItemClass('settings')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Settings className="w-4 h-4 shrink-0" />
                    <span className="truncate">Settings</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('data-management')}
                  className={navItemClass('data-management')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Database className="w-4 h-4 shrink-0" />
                    <span className="truncate">Data Management</span>
                  </div>
                </button>

                <button
                  onClick={() => handleNavClick('user-access')}
                  className={navItemClass('user-access')}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span className="truncate">User Access</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom verification badge */}
        <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
          <div className="flex items-center justify-between mb-1 text-slate-300 font-semibold">
            <span>Verification Engine</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
              Phase 1 Active
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            Source data is strictly read-only. Inspections stored separately.
          </div>
        </div>
      </aside>
    </>
  );
};

import React, { useState } from 'react';
import {
  Bell,
  ChevronDown,
  Building2,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { APP_CONFIG } from '../../config';
import { useVerification } from '../../context/VerificationContext';

export const Header: React.FC = () => {
  const { resetAllData, currentScreen, stats, supabaseSync, refetchFromSupabase } = useVerification();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-white">Varsha</span>
              <span className="font-bold text-lg text-blue-400">निवास</span>
            </div>
            <div className="text-xs text-slate-400 font-medium leading-none">
              Co-operative Housing Society
            </div>
            <div className="text-[10px] text-slate-500 font-mono tracking-wider mt-0.5">
              Financial Management | Transaction Verification
            </div>
          </div>
        </div>

        {/* Center FY Status Badge & Supabase Connection */}
        <div className="hidden lg:flex items-center gap-3 bg-slate-800/80 px-4 py-1.5 rounded-lg border border-slate-700/60">
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-2">
              <span>FY 2018–19</span>
              <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                Verification in Progress
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              01 Apr 2018 – 31 Mar 2019
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700 mx-1" />

          {/* Supabase Status */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                supabaseSync.isLoading
                  ? 'bg-amber-400 animate-pulse'
                  : supabaseSync.isConnected
                  ? 'bg-emerald-400'
                  : 'bg-rose-500'
              }`}
            />
            <div className="text-left">
              <div className="text-[11px] font-medium text-slate-200 flex items-center gap-1.5">
                <span>Supabase</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  supabaseSync.isLoading
                    ? 'bg-amber-500/20 text-amber-300'
                    : supabaseSync.isConnected
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {supabaseSync.isLoading ? 'Syncing...' : supabaseSync.isConnected ? 'Connected' : 'Offline'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {supabaseSync.lastSyncedAt ? `Synced ${supabaseSync.lastSyncedAt}` : supabaseSync.error ? 'Connection error' : 'hklibokniuwurdxndxfd'}
              </div>
            </div>

            <button
              onClick={() => refetchFromSupabase()}
              disabled={supabaseSync.isLoading}
              title="Refresh Supabase data"
              className="p-1 rounded hover:bg-slate-700/70 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${supabaseSync.isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* FY Selector */}
          <div className="hidden md:flex flex-col text-right">
            <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Financial Year
            </label>
            <select
              defaultValue="2018-2019"
              className="bg-slate-800 text-xs text-white rounded px-2.5 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="2018-2019">2018 - 2019</option>
              <option value="2019-2020">2019 - 2020 (Locked)</option>
            </select>
          </div>

          {/* Period Selector */}
          <div className="hidden md:flex flex-col text-right">
            <label className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Period
            </label>
            <select
              defaultValue="Apr 2018 - Mar 2019"
              className="bg-slate-800 text-xs text-white rounded px-2.5 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Apr 2018 - Mar 2019">Apr 2018 – Mar 2019</option>
              <option value="Q1">Q1 (Apr - Jun 2018)</option>
              <option value="Q2">Q2 (Jul - Sep 2018)</option>
              <option value="Q3">Q3 (Oct - Dec 2018)</option>
              <option value="Q4">Q4 (Jan - Mar 2019)</option>
            </select>
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationToast(!showNotificationToast)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-900" />
            </button>

            {showNotificationToast && (
              <div className="absolute right-0 mt-2 w-80 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 p-3 z-50 text-xs animate-in fade-in slide-in-from-top-1">
                <div className="font-semibold text-slate-900 mb-1 flex items-center justify-between">
                  <span>Audit Alert</span>
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-medium">High</span>
                </div>
                <p className="text-slate-600 mb-2">
                  BOM Secondary A/c opening balance differs from audit report by ₹ 3,800. Also check Jul 2018 reconciliation difference.
                </p>
                <div className="text-[10px] text-slate-400">Last updated: {APP_CONFIG.lastUpdated}</div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-800 hover:bg-slate-700/80 rounded-full border border-slate-700/80 transition-colors cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                {APP_CONFIG.currentReviewer.initials}
              </div>
              <div className="hidden sm:block text-xs leading-tight">
                <div className="font-semibold text-white">{APP_CONFIG.currentReviewer.name}</div>
                <div className="text-[10px] text-slate-400">{APP_CONFIG.currentReviewer.role}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="font-semibold text-slate-900">{APP_CONFIG.currentReviewer.name}</div>
                  <div className="text-[11px] text-slate-500">{APP_CONFIG.currentReviewer.email}</div>
                  <div className="text-[10px] text-blue-600 font-medium mt-1">Authorized Reviewer</div>
                </div>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowResetConfirm(true);
                  }}
                  className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Sample Data</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-slate-900">
            <h3 className="font-bold text-base text-slate-900 mb-2">Reset Verification Data?</h3>
            <p className="text-xs text-slate-600 mb-4">
              This will reset opening balances, transaction inspection statuses, and monthly reconciliation entries back to initial FY 2018-19 sample values.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetAllData();
                  setShowResetConfirm(false);
                }}
                className="px-3 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold cursor-pointer shadow-sm"
              >
                Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

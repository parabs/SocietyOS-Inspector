/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseClient } from './services/supabaseClient';
import { VerificationProvider, useVerification } from './context/VerificationContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { VerificationDashboard } from './components/verification/VerificationDashboard';
import { OpeningBalanceVerification } from './components/verification/OpeningBalanceVerification';
import { TransactionVerification } from './components/verification/TransactionVerification';
import { MonthlyReconciliation } from './components/verification/MonthlyReconciliation';
import { SocietyFinancialDashboards } from './components/financial/SocietyFinancialDashboards';
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
      return <SocietyFinancialDashboards screen={currentScreen} />;

    case 'settings':
    case 'data-management':
    case 'user-access':
      return <SettingsView />;

    default:
      return <VerificationDashboard />;
  }
};

const AuthGate: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setSignInError(error.message);
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setSignInError(null);
    setSigningIn(true);
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) {
      setSignInError(error.message);
      setSigningIn(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">Checking secure session…</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold">S</div>
          <h1 className="text-2xl font-bold">SocietyOS Inspector</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Sign in with your authorized Google account to load the society's financial records securely.</p>
          {signInError && <div role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{signInError}</div>}
          <button onClick={signInWithGoogle} disabled={signingIn} className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
            {signingIn ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>
          <p className="mt-4 text-xs text-slate-500">Only accounts granted Society Administrator access can view the financial data.</p>
        </div>
      </div>
    );
  }

  const metadata = session.user.app_metadata || {};
  const isSocietyAdmin = metadata.role === 'society_admin' || (Array.isArray(metadata.roles) && metadata.roles.includes('society_admin'));

  if (!isSocietyAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-8">
          <h1 className="text-xl font-bold">Access not authorized</h1>
          <p className="mt-2 text-sm text-slate-300">This Google account is authenticated but has not been granted Society Administrator access.</p>
          <button onClick={() => supabaseClient.auth.signOut()} className="mt-5 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-600">Sign out</button>
        </div>
      </div>
    );
  }

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
};

export default function App() {
  return <AuthGate />;
}

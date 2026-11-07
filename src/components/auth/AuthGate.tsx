import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseClient } from '../../services/supabaseClient';

type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'unauthorized'; email: string | null }
  | { status: 'authorized'; session: Session }
  | { status: 'error'; message: string };

const isSocietyAdmin = (session: Session) => {
  const metadata = session.user.app_metadata ?? {};
  const roles = metadata.roles;
  return metadata.role === 'society_admin' ||
    (Array.isArray(roles) && roles.includes('society_admin'));
};

export const AuthGate: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    const applySession = (session: Session | null) => {
      if (!mounted) return;
      if (!session) {
        setAuth({ status: 'signed-out' });
      } else if (!isSocietyAdmin(session)) {
        setAuth({ status: 'unauthorized', email: session.user.email ?? null });
      } else {
        setAuth({ status: 'authorized', session });
      }
    };

    supabaseClient.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        applySession(data.session);
      })
      .catch((error: unknown) => {
        if (mounted) setAuth({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to verify your session.',
        });
      });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuth({ status: 'error', message: error.message });
      setBusy(false);
    }
  };

  const signOut = async () => {
    setBusy(true);
    const { error } = await supabaseClient.auth.signOut();
    if (error) setAuth({ status: 'error', message: error.message });
    setBusy(false);
  };

  if (auth.status === 'loading') {
    return <AuthMessage title="Checking secure session" detail="Verifying your Society OS access…" />;
  }

  if (auth.status === 'authorized') {
    return <>{children}</>;
  }

  if (auth.status === 'signed-out') {
    return (
      <AuthPanel title="Society OS" detail="Sign in with your authorized Google account to continue.">
        <button onClick={signIn} disabled={busy} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {busy ? 'Redirecting…' : 'Continue with Google'}
        </button>
      </AuthPanel>
    );
  }

  if (auth.status === 'unauthorized') {
    return (
      <AuthPanel title="Access not authorized" detail={auth.email ? `The signed-in account (${auth.email}) does not have the Society Admin role.` : 'This account does not have the Society Admin role.'}>
        <button onClick={signOut} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel title="Unable to verify access" detail={auth.message}>
      <button onClick={() => window.location.reload()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        Retry
      </button>
    </AuthPanel>
  );
};

const AuthMessage: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
    <div className="text-center"><div className="text-lg font-semibold">{title}</div><p className="mt-2 text-sm text-slate-400">{detail}</p></div>
  </div>
);

const AuthPanel: React.FC<React.PropsWithChildren<{ title: string; detail: string }>> = ({ title, detail, children }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
      <div className="mb-6 text-center">
        <div className="text-xl font-bold">{title}</div>
        <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
      </div>
      {children}
    </div>
  </div>
);

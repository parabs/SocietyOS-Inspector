import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseClient } from '../../services/supabaseClient';
import { SocietyAccessProvider } from '../../context/SocietyAccessContext';
import type { SocietyAccess } from '../../context/SocietyAccessContext';

const callSocietyRpc = (supabaseClient.rpc as unknown as (name: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>).bind(supabaseClient);

interface SocietyInvitation {
  membership_id: string;
  society_id: string;
  tenant_code: string;
  display_name: string;
  legal_name: string;
  valid_from: string;
  valid_until: string | null;
  roles: string[];
}

type AuthState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'unassigned'; email: string | null }
  | { status: 'role-unavailable'; email: string | null; roles: string[] }
  | { status: 'invited'; email: string | null; invitations: SocietyInvitation[] }
  | { status: 'authorized'; session: Session; societies: SocietyAccess[] }
  | { status: 'error'; message: string };

export const AuthGate: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });
  const [busy, setBusy] = useState(false);
  const requestSequence = useRef(0);

  const applySession = useCallback(async (session: Session | null) => {
    const requestId = ++requestSequence.current;
    if (!session) {
      setAuth({ status: 'signed-out' });
      return;
    }

    // Keep an authorized workspace mounted while the same user session is revalidated.
    // Unmounting children resets the active screen and causes financial data to reload.
    setAuth((current) => current.status === 'authorized' && current.session.user.id === session.user.id
      ? current
      : { status: 'loading' });
    try {
      const { data: accessData, error: accessError } = await supabaseClient.rpc('get_my_society_access');
      if (accessError) throw accessError;
      const societies = Array.isArray(accessData) ? accessData as SocietyAccess[] : [];
      if (requestId !== requestSequence.current) return;
      const authorizedSocieties = societies.filter((society) => society.roles.length > 0 && society.permissions.length > 0);
      const workspacePermissions = new Set([
        'finance.read.society', 'finance.read.audit', 'finance.read.linked',
        'compliance.read', 'compliance.manage', 'master.read.society', 'master.draft.manage',
        'finance.import.manage', 'finance.reconciliation.manage', 'data_quality.read',
        'audit.evidence.read', 'society.roles.manage', 'society.settings.manage',
        'governance.read', 'finance.transaction.create_draft', 'finance.transaction.edit_draft',
      ]);
      const workspaceSocieties = authorizedSocieties.filter((society) => society.permissions.some((permission) => workspacePermissions.has(permission)));
      if (workspaceSocieties.length > 0) {
        setAuth({ status: 'authorized', session, societies: workspaceSocieties });
        return;
      }
      if (authorizedSocieties.length > 0) {
        setAuth({ status: 'role-unavailable', email: session.user.email ?? null, roles: authorizedSocieties.flatMap((society) => society.roles.map((role) => role.role_name)) });
        return;
      }

      const { data: invitationData, error: invitationError } = await supabaseClient.rpc('get_my_society_invitations');
      if (invitationError) throw invitationError;
      const invitations = Array.isArray(invitationData) ? invitationData as SocietyInvitation[] : [];
      if (requestId !== requestSequence.current) return;
      if (invitations.length) {
        setAuth({ status: 'invited', email: session.user.email ?? null, invitations });
      } else {
        setAuth({ status: 'unassigned', email: session.user.email ?? null });
      }
    } catch (error) {
      if (requestId !== requestSequence.current) return;
      setAuth({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to verify your society membership.',
      });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabaseClient.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (mounted) void applySession(data.session);
      })
      .catch((error: unknown) => {
        if (mounted) setAuth({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to verify your session.',
        });
      });

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      // Returning to a tab can trigger token refresh. It must not remount the workspace.
      if (event === 'TOKEN_REFRESHED' && session) {
        setAuth((current) => current.status === 'authorized' && current.session.user.id === session.user.id
          ? { ...current, session }
          : current);
        return;
      }
      void applySession(session);
    });

    return () => {
      mounted = false;
      requestSequence.current += 1;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = async () => {
    setBusy(true);
    const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
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

  const acceptInvitation = async (societyId: string) => {
    setBusy(true);
    const { error } = await callSocietyRpc('accept_society_invitation', { p_society_id: societyId });
    if (error) {
      setAuth({ status: 'error', message: error.message });
      setBusy(false);
      return;
    }
    const { data } = await supabaseClient.auth.getSession();
    await applySession(data.session);
    setBusy(false);
  };

  if (auth.status === 'loading') {
    return <AuthMessage title="Checking secure session" detail="Verifying your society membership and assigned permissions…" />;
  }

  if (auth.status === 'authorized') {
    return (
      <SocietyAccessProvider societies={auth.societies}>
        {children}
      </SocietyAccessProvider>
    );
  }

  if (auth.status === 'invited') {
    return (
      <AuthPanel title="Society invitation" detail="Your Google account has a pending society invitation. Accept it to activate your assigned role.">
        <div className="space-y-3">
          {auth.invitations.map((invitation) => (
            <div key={invitation.membership_id} className="rounded-lg border border-slate-700 bg-slate-800/70 p-3">
              <div className="font-semibold text-white">{invitation.display_name}</div>
              <div className="mt-1 text-xs text-slate-400">{invitation.roles.join(', ') || 'Role assignment pending'}</div>
              <button
                onClick={() => void acceptInvitation(invitation.society_id)}
                disabled={busy}
                className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? 'Activating…' : 'Accept invitation'}
              </button>
            </div>
          ))}
          <button onClick={signOut} disabled={busy} className="w-full rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-60">
            Sign out
          </button>
        </div>
      </AuthPanel>
    );
  }

  if (auth.status === 'role-unavailable') {
    return (
      <AuthPanel
        title="Role assigned — workspace not yet available"
        detail={`Your account has the assigned role(s): ${auth.roles.join(', ')}. The current application release does not yet include the dedicated workspace for this role. Your access to financial and society records remains blocked until the relevant module is released.`}
      >
        <button onClick={signOut} disabled={busy} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-60">
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </AuthPanel>
    );
  }

  if (auth.status === 'unassigned') {
    return (
      <AuthPanel
        title="Society access not assigned"
        detail={auth.email
          ? `Your Google account (${auth.email}) is signed in, but there is no active society membership with an assigned role. Contact the Society Admin to request access.`
          : 'Your Google account is signed in, but there is no active society membership with an assigned role. Contact the Society Admin to request access.'}
      >
        <button onClick={signOut} disabled={busy} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-60">
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </AuthPanel>
    );
  }

  if (auth.status === 'signed-out') {
    return (
      <AuthPanel title="Society OS" detail="Sign in with your Google account to continue. Your society membership and assigned role will be checked after sign-in.">
        <button onClick={signIn} disabled={busy} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {busy ? 'Redirecting…' : 'Continue with Google'}
        </button>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel title="Unable to verify access" detail={auth.message}>
      <button onClick={() => window.location.reload()} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">
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

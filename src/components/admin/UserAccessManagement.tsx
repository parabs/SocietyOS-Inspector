import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, UserPlus, ShieldCheck, UserX, UserCheck, AlertCircle } from 'lucide-react';
import { supabaseClient } from '../../services/supabaseClient';
import { useSocietyAccess } from '../../context/SocietyAccessContext';

const callSocietyRpc = (supabaseClient.rpc as unknown as (name: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>).bind(supabaseClient);

interface MemberRole {
  role_code: string;
  role_name: string;
  valid_from: string;
  valid_until: string | null;
  revoked_at: string | null;
}

interface MemberRecord {
  membership_id: string;
  user_id: string;
  email: string;
  display_name: string;
  status: 'invited' | 'active' | 'suspended' | 'ended';
  valid_from: string;
  valid_until: string | null;
  roles: MemberRole[];
}

interface RoleOption {
  role_code: string;
  role_name: string;
}

export const UserAccessManagement: React.FC = () => {
  const { activeSociety, hasPermission } = useSocietyAccess();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [email, setEmail] = useState('');
  const [roleCode, setRoleCode] = useState('member');
  const [validUntil, setValidUntil] = useState('');
  const [reason, setReason] = useState('Society role assignment');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const canManage = hasPermission('society.members.manage') && hasPermission('society.roles.manage');

  const refresh = useCallback(async () => {
    if (!activeSociety || !canManage) return;
    setLoading(true);
    setMessage(null);
    const [directory, roleResult] = await Promise.all([
      callSocietyRpc('get_society_members_directory', { p_society_id: activeSociety.society_id }),
      supabaseClient.from('society_roles').select('role_code,role_name')
        .eq('society_id', activeSociety.society_id).order('role_name'),
    ]);
    if (directory.error) {
      setMessage({ kind: 'error', text: directory.error.message });
    } else {
      setMembers(Array.isArray(directory.data) ? directory.data as MemberRecord[] : []);
    }
    if (roleResult.error) {
      setMessage({ kind: 'error', text: roleResult.error.message });
    } else {
      setRoles(roleResult.data ?? []);
    }
    setLoading(false);
  }, [activeSociety, canManage]);

  useEffect(() => { void refresh(); }, [refresh]);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeSociety || !email.trim() || !roleCode) return;
    setSubmitting(true);
    setMessage(null);
    const { data, error } = await supabaseClient.functions.invoke('manage-society-members', {
      body: {
        societyId: activeSociety.society_id,
        email: email.trim(),
        roleCode,
        validUntil: validUntil || null,
        reason: reason.trim() || 'Society role assignment',
      },
    });
    if (error || data?.error) {
      setMessage({ kind: 'error', text: data?.error ?? error?.message ?? 'Invitation could not be completed.' });
    } else {
      setMessage({
        kind: 'success',
        text: data?.inviteSent
          ? `Invitation sent. ${roleCode} access will activate after the user accepts.`
          : `Existing account assigned the ${roleCode} role.`,
      });
      setEmail('');
      setValidUntil('');
      await refresh();
    }
    setSubmitting(false);
  };

  const revokeRole = async (member: MemberRecord, role: MemberRole) => {
    if (!activeSociety || !window.confirm(`Revoke ${role.role_name} from ${member.email}?`)) return;
    setSubmitting(true);
    const { error } = await callSocietyRpc('revoke_society_role', {
      p_society_id: activeSociety.society_id,
      p_user_id: member.user_id,
      p_role_code: role.role_code,
      p_reason: 'Revoked by Society Admin through User & Role Access',
    });
    setMessage(error ? { kind: 'error', text: error.message } : { kind: 'success', text: `${role.role_name} revoked.` });
    await refresh();
    setSubmitting(false);
  };

  const changeMembership = async (member: MemberRecord, status: 'active' | 'suspended' | 'ended') => {
    if (!activeSociety || !window.confirm(`${status === 'suspended' ? 'Suspend' : status === 'active' ? 'Reactivate' : 'End'} access for ${member.email}?`)) return;
    setSubmitting(true);
    const { error } = await callSocietyRpc('set_society_membership_status', {
      p_society_id: activeSociety.society_id,
      p_user_id: member.user_id,
      p_status: status,
      p_reason: `Membership ${status} by Society Admin through User & Role Access`,
    });
    setMessage(error ? { kind: 'error', text: error.message } : { kind: 'success', text: `Membership status changed to ${status}.` });
    await refresh();
    setSubmitting(false);
  };

  if (!canManage) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">You do not have permission to manage society memberships and roles.</div>;
  }
  if (!activeSociety) return <div className="text-sm text-slate-600">No active society is selected.</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">User &amp; Role Access</h1>
          <p className="mt-1 text-xs text-slate-600">{activeSociety.display_name} · Access is granted per society membership, not by Google sign-in alone.</p>
        </div>
        <button onClick={() => void refresh()} disabled={loading || submitting} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh members
        </button>
      </div>

      {message && (
        <div className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${message.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {message.kind === 'success' ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={invite} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-2 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-700">Google account email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-700">Assigned role</label>
          <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900">
            {roles.map((role) => <option key={role.role_code} value={role.role_code}>{role.role_name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-700">Access valid until (optional)</label>
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} min={new Date().toISOString().slice(0, 10)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={submitting || !email.trim() || !roleCode} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            <UserPlus className="h-4 w-4" /> {submitting ? 'Processing…' : 'Invite / Assign'}
          </button>
        </div>
        <div className="md:col-span-2 xl:col-span-5">
          <label className="mb-1 block text-[11px] font-semibold text-slate-700">Reason for assignment</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={250} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900" />
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-bold text-slate-900">Society members</div>
          <div className="text-[11px] text-slate-500">{members.length} membership records</div>
        </div>
        {loading ? <div className="p-6 text-sm text-slate-500">Loading membership directory…</div> : (
          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <div key={member.membership_id} className="space-y-3 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{member.display_name || member.email}</div>
                    <div className="truncate text-xs text-slate-500">{member.email}</div>
                    <div className="mt-1 text-[10px] text-slate-400">Member since {member.valid_from}{member.valid_until ? ` · Valid until ${member.valid_until}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold capitalize ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : member.status === 'invited' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{member.status}</span>
                    {member.status === 'active' && <button onClick={() => void changeMembership(member, 'suspended')} disabled={submitting} className="rounded-md border border-amber-200 px-2 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-50"><UserX className="mr-1 inline h-3 w-3" />Suspend</button>}
                    {member.status === 'suspended' && <button onClick={() => void changeMembership(member, 'active')} disabled={submitting} className="rounded-md border border-emerald-200 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"><UserCheck className="mr-1 inline h-3 w-3" />Reactivate</button>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {member.roles.map((role) => (
                    <span key={`${role.role_code}-${role.valid_from}`} className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] ${role.revoked_at ? 'border-slate-200 bg-slate-50 text-slate-400 line-through' : 'border-blue-100 bg-blue-50 text-blue-800'}`}>
                      {role.role_name}
                      {!role.revoked_at && <button title={`Revoke ${role.role_name}`} onClick={() => void revokeRole(member, role)} disabled={submitting} className="rounded text-blue-700 hover:text-rose-600 disabled:opacity-50">×</button>}
                    </span>
                  ))}
                  {!member.roles.length && <span className="text-[11px] text-slate-400">No roles assigned</span>}
                </div>
              </div>
            ))}
            {!members.length && <div className="p-6 text-sm text-slate-500">No members are assigned to this society yet.</div>}
          </div>
        )}
      </div>
      <p className="text-[11px] leading-5 text-slate-500">Role changes are recorded in the membership audit log. Members cannot assign roles to themselves. Financial approvals and audit sign-off remain subject to separate workflow controls.</p>
    </div>
  );
};

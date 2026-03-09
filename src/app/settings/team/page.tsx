// src/app/settings/team/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: Array<{
    role: string;
    scope: string;
    scopeId: string | null;
  }>;
  createdAt: string;
  lastActiveAt?: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string;
  createdAt: string;
}

const ROLE_OPTIONS = [
  { value: 'ORG_OWNER', label: 'Organization Owner', description: 'Full access to everything' },
  { value: 'ORG_ADMIN', label: 'Organization Admin', description: 'Manage organization except deletion' },
  { value: 'PROJECT_ADMIN', label: 'Project Admin', description: 'Manage projects and applications' },
  { value: 'QA_LEAD', label: 'QA Lead', description: 'Full visibility, manage flaky tests' },
  { value: 'PROJECT_MEMBER', label: 'Project Member', description: 'Create apps and view runs' },
  { value: 'DEVELOPER', label: 'Developer', description: 'Submit runs and view results' },
  { value: 'VIEWER', label: 'Viewer', description: 'Read-only access' },
];

export default function TeamManagementPage() {
  const { getCurrentOrgId } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const orgId = getCurrentOrgId();
      if (!orgId) {
        setError('No organization found');
        return;
      }

      const [membersData, invitationsData] = await Promise.all([
        api.organizations.listMembers(orgId),
        api.organizations.listInvitations(orgId),
      ]);

      setMembers(membersData);
      setInvitations(invitationsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplay = (member: TeamMember) => {
    const orgRole = member.roles.find(r => r.scope === 'ORGANIZATION');
    return orgRole?.role || 'VIEWER';
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      ORG_OWNER: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      ORG_ADMIN: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      PROJECT_ADMIN: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      QA_LEAD: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      PROJECT_MEMBER: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      DEVELOPER: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      VIEWER: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    };
    return colors[role] || colors.VIEWER;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold mb-1">Team Management</h2>
          <p className="text-sm text-slate-400">
            Manage your organization members and invitations
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
        >
          + Invite Member
        </button>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          {success}
        </div>
      )}

      {/* Team Members */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Team Members ({members.length})</h3>

        <div className="space-y-2">
          {members.map((member) => {
            const role = getRoleDisplay(member);
            const displayName = member.firstName && member.lastName
              ? `${member.firstName} ${member.lastName}`
              : member.email;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 font-medium">
                    {(member.firstName?.[0] || member.email[0]).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{displayName}</div>
                    <div className="text-sm text-slate-400">{member.email}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(role)}`}>
                    {role.replace('_', ' ')}
                  </div>
                  {member.lastActiveAt && (
                    <div className="text-xs text-slate-500">
                      Last active: {new Date(member.lastActiveAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setEditingMember(member)}
                    className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-sm transition-colors"
                  >
                    Edit Role
                  </button>
                  <button
                    onClick={() => setRemovingMember(member)}
                    className="px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-800">
          <h3 className="text-lg font-medium">Pending Invitations ({invitations.length})</h3>

          <div className="space-y-2">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 font-medium">
                    {invitation.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-amber-200">{invitation.email}</div>
                    <div className="text-sm text-amber-300/70">
                      Invited {new Date(invitation.createdAt).toLocaleDateString()} • Role: {invitation.role.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm transition-colors">
                    Resend
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await api.invitations.cancel(invitation.id);
                        setSuccess('Invitation cancelled');
                        loadTeamData();
                      } catch (err: any) {
                        setError(err.message || 'Failed to cancel invitation');
                      }
                    }}
                    className="px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            setSuccess('Invitation sent successfully');
            loadTeamData();
          }}
        />
      )}

      {editingMember && (
        <EditMemberRoleModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSuccess={() => {
            setEditingMember(null);
            setSuccess('Member role updated successfully');
            loadTeamData();
          }}
        />
      )}

      {removingMember && (
        <RemoveMemberModal
          member={removingMember}
          onClose={() => setRemovingMember(null)}
          onSuccess={() => {
            setRemovingMember(null);
            setSuccess('Member removed successfully');
            loadTeamData();
          }}
        />
      )}
    </div>
  );
}

function InviteMemberModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { getCurrentOrgId } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('PROJECT_MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const orgId = getCurrentOrgId();
      if (!orgId) {
        setError('No organization found');
        return;
      }

      const result = await api.organizations.inviteMember(orgId, { email, role });
      const { acceptUrl } = result.invitation;

      // Open email client (Outlook/Gmail/etc) with invite pre-filled
      const subject = encodeURIComponent("You've been invited to join QOP");
      const roleName = ROLE_OPTIONS.find(r => r.value === role)?.label || role;
      const body = encodeURIComponent(
        `Hi,\n\nYou've been invited to join QOP as ${roleName}.\n\nClick the link below to accept your invitation:\n${acceptUrl}\n\nThis invitation expires in 7 days.\n\nWelcome aboard!`
      );
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Invite Team Member</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
              placeholder="colleague@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditMemberRoleModal({
  member,
  onClose,
  onSuccess,
}: {
  member: TeamMember;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { getCurrentOrgId } = useAuth();
  const currentRole = member.roles.find(r => r.scope === 'ORGANIZATION')?.role || 'VIEWER';
  const [role, setRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const orgId = getCurrentOrgId();
      if (!orgId) {
        setError('No organization found');
        return;
      }

      await api.organizations.updateMemberRole(orgId, member.id, role);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Edit Member Role</h2>

        <div className="mb-4 p-3 rounded bg-slate-800/50">
          <div className="font-medium">{member.firstName} {member.lastName}</div>
          <div className="text-sm text-slate-400">{member.email}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RemoveMemberModal({
  member,
  onClose,
  onSuccess,
}: {
  member: TeamMember;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { getCurrentOrgId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const handleRemove = async () => {
    if (confirmText !== 'REMOVE') {
      setError('Please type REMOVE to confirm');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const orgId = getCurrentOrgId();
      if (!orgId) {
        setError('No organization found');
        return;
      }

      await api.organizations.removeMember(orgId, member.id);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl border border-rose-800 p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-rose-300 mb-4">Remove Team Member</h2>

        <div className="mb-4 p-3 rounded bg-rose-500/10 border border-rose-500/30">
          <div className="font-medium text-rose-200">{member.firstName} {member.lastName}</div>
          <div className="text-sm text-rose-300/70">{member.email}</div>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          This member will lose access to the organization and all its projects.
          Type <strong className="text-white">REMOVE</strong> to confirm.
        </p>

        <div className="space-y-4">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-700 focus:border-rose-500 focus:outline-none"
            placeholder="Type REMOVE"
          />

          {error && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              className="flex-1 px-4 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium disabled:opacity-50"
              disabled={loading || confirmText !== 'REMOVE'}
            >
              {loading ? 'Removing...' : 'Remove Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

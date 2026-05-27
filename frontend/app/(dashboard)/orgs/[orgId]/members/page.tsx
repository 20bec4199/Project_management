"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import {
  useOrgMembers,
  useOrgInvites,
  useInviteMember,
  useRevokeInvite,
  useUpdateMemberRole,
  useRemoveMember,
  type OrgMember,
} from "../../../../../lib/hooks";
import { useAuthStore, type AuthState } from "../../../../../store/auth.store";

const ROLES = ["viewer", "member", "admin", "owner"];

export default function MembersPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const userId = useAuthStore((s: AuthState) => s.user?.id);

  const { data: members, isLoading: loadingMembers } = useOrgMembers(orgId);
  const { data: invites, isLoading: loadingInvites } = useOrgInvites(orgId);

  const inviteMember = useInviteMember(orgId);
  const revokeInvite = useRevokeInvite(orgId);
  const updateRole = useUpdateMemberRole(orgId);
  const removeMember = useRemoveMember(orgId);

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    try {
      await inviteMember.mutateAsync({ email, role });
      setEmail("");
      setShowInvite(false);
    } catch {
      setInviteError("Failed to send invite.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Invite member
        </button>
      </div>

      {showInvite && (
        <form
          onSubmit={handleInvite}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3"
        >
          <h2 className="font-semibold text-gray-800">Invite member</h2>
          <div className="flex gap-3">
            <input
              autoFocus
              required
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {ROLES.slice(0, 3).map((r) => (
                <option key={r} value={r}>
                  {r.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={inviteMember.isPending}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {inviteMember.isPending ? "Sending…" : "Send invite"}
            </button>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="text-sm text-gray-500 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Members */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Active members
        </h2>
        {loadingMembers && <p className="text-sm text-gray-400">Loading…</p>}
        <div className="space-y-2">
          {members?.map((m) => (
            <div
              key={m.id}
              className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {m.user?.email ?? m.userId}
                  {m.userId === userId && (
                    <span className="ml-2 text-xs text-blue-600">(you)</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={m.role}
                  onChange={(e) =>
                    updateRole.mutate({ memberId: m.userId, role: e.target.value })
                  }
                  disabled={m.userId === userId}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none disabled:opacity-50"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.toUpperCase()}
                    </option>
                  ))}
                </select>
                {m.userId !== userId && (
                  <button
                    onClick={() => removeMember.mutate(m.userId)}
                    className="text-xs text-gray-300 hover:text-red-500 transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pending invites */}
      {invites && invites.filter((i) => !i.acceptedAt).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Pending invites
          </h2>
          <div className="space-y-2">
            {invites
              .filter((i) => !i.acceptedAt)
              .map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white border border-dashed border-gray-300 rounded-xl px-5 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-gray-700">{inv.email}</p>
                    <p className="text-xs text-gray-400">
                      {inv.role} · expires{" "}
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeInvite.mutate(inv.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition"
                  >
                    Revoke
                  </button>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

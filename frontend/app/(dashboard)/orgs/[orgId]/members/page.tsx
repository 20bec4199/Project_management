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
  type OrgRole,
} from "../../../../../lib/hooks";
import { useAuthStore, type AuthState } from "../../../../../store/auth.store";

/** All roles that can be assigned when inviting or editing a member. */
const ALL_ROLES: Array<{ value: OrgRole; label: string }> = [
  { value: "viewer",            label: "Viewer" },
  { value: "member",            label: "Member" },
  { value: "developer",         label: "Developer" },
  { value: "qa_engineer",       label: "QA Engineer" },
  { value: "devops_engineer",   label: "DevOps Engineer" },
  { value: "designer",          label: "Designer" },
  { value: "data_analyst",      label: "Data Analyst" },
  { value: "security_engineer", label: "Security Engineer" },
  { value: "senior_developer",  label: "Senior Developer" },
  { value: "scrum_master",      label: "Scrum Master" },
  { value: "product_owner",     label: "Product Owner" },
  { value: "tech_lead",         label: "Tech Lead" },
  { value: "project_manager",   label: "Project Manager" },
  { value: "cto",               label: "CTO" },
  { value: "admin",             label: "Admin" },
  { value: "owner",             label: "Owner" },
];

/** Roles available when sending an invite (can't invite as owner). */
const INVITE_ROLES = ALL_ROLES.filter((r) => r.value !== "owner");

function roleBadgeColor(role: OrgRole): string {
  if (role === "owner")            return "bg-purple-100 text-purple-700";
  if (role === "admin")            return "bg-red-100 text-red-700";
  if (role === "cto")              return "bg-pink-100 text-pink-700";
  if (["project_manager", "tech_lead", "scrum_master", "product_owner"].includes(role))
    return "bg-orange-100 text-orange-700";
  if (role === "senior_developer") return "bg-blue-100 text-blue-700";
  if (["developer", "qa_engineer", "devops_engineer", "designer", "data_analyst", "security_engineer"].includes(role))
    return "bg-cyan-100 text-cyan-700";
  if (role === "member")           return "bg-gray-100 text-gray-600";
  return "bg-gray-50 text-gray-400";
}

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
  const [role, setRole] = useState<OrgRole>("developer");
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
      <div className="flex items-start sm:items-center justify-between mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Members</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition shrink-0"
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
          <div className="flex flex-col sm:flex-row gap-3">
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
              onChange={(e) => setRole(e.target.value as OrgRole)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              {INVITE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
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

      {/* Members list */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Active members ({members?.length ?? 0})
        </h2>
        {loadingMembers && <p className="text-sm text-gray-400">Loading…</p>}
        <div className="space-y-2">
          {members?.map((m) => (
            <div
              key={m.id}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {m.user?.email ?? m.userId}
                  {m.userId === userId && (
                    <span className="ml-2 text-xs text-blue-600">(you)</span>
                  )}
                </p>
                {m.user?.name && (
                  <p className="text-xs text-gray-400 truncate">{m.user.name}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColor(m.role)}`}>
                  {ALL_ROLES.find((r) => r.value === m.role)?.label ?? m.role}
                </span>
                <select
                  value={m.role}
                  onChange={(e) =>
                    updateRole.mutate({ memberId: m.userId, role: e.target.value })
                  }
                  disabled={m.userId === userId}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none disabled:opacity-50"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {m.userId !== userId && (
                  <button
                    onClick={() => removeMember.mutate(m.userId)}
                    className="text-xs text-gray-400 hover:text-red-500 transition"
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
      {!loadingInvites && invites && invites.filter((i) => !i.acceptedAt).length > 0 && (
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
                      {ALL_ROLES.find((r) => r.value === inv.role)?.label ?? inv.role}
                      {" · "}expires {new Date(inv.expiresAt).toLocaleDateString()}
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


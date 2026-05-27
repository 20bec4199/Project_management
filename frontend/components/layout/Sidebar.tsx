"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrgStore, type OrgState } from "../../store/org.store";

function navItems(orgId: string) {
  return [
    { href: `/orgs/${orgId}`, label: "Dashboard", icon: "⊞", exact: true },
    { href: `/orgs/${orgId}/projects`, label: "Projects", icon: "📁" },
    { href: `/orgs/${orgId}/tasks`, label: "Tasks", icon: "✓" },
    { href: `/orgs/${orgId}/members`, label: "Members", icon: "👥" },
    { href: `/orgs/${orgId}/settings`, label: "Settings", icon: "⚙" },
  ];
}

export function Sidebar() {
  const pathname = usePathname();
  const activeOrg = useOrgStore((s: OrgState) => s.activeOrg);

  const items = activeOrg ? navItems(activeOrg.id) : [];

  return (
    <aside className="w-60 bg-gray-900 text-gray-100 flex flex-col shrink-0 h-full">
      {/* Org name / switcher */}
      <div className="px-4 py-5 border-b border-gray-700">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
          Organization
        </p>
        <Link
          href="/dashboard"
          className="text-sm font-semibold truncate block hover:text-blue-400 transition"
        >
          {activeOrg?.name ?? "Select org"}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

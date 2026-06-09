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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const activeOrg = useOrgStore((s: OrgState) => s.activeOrg);

  const items = activeOrg ? navItems(activeOrg.id) : [];

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-gray-100 flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 md:w-60 md:shrink-0 md:h-full md:z-auto
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition md:hidden"
          aria-label="Close navigation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Org name / switcher */}
        <div className="px-4 py-5 border-b border-gray-700 pr-12 md:pr-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Organization
          </p>
          <Link
            href="/dashboard"
            onClick={onClose}
            className="text-sm font-semibold truncate block hover:text-blue-400 transition"
          >
            {activeOrg?.name ?? "Select org"}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active
                    ? "bg-blue-600 text-white font-medium"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

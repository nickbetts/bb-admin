"use client";

import Link from "next/link";

type AdminTabKey =
  | "users"
  | "roles"
  | "cron"
  | "settings"
  | "api-status"
  | "logs"
  | "activity"
  | "task-categories"
  | "ai-costs";

interface AdminNavProps {
  active: AdminTabKey;
  /** Effective permissions of the current user. Tabs the user cannot open are hidden. */
  permissions?: string[];
}

const TABS: { href: string; key: AdminTabKey; label: string; permission: string }[] = [
  { href: "/admin", key: "users", label: "Users", permission: "users" },
  { href: "/admin/roles", key: "roles", label: "Roles & Permissions", permission: "admin.roles" },
  {
    href: "/admin/task-categories",
    key: "task-categories",
    label: "Task Categories",
    permission: "admin.task_categories",
  },
  { href: "/admin/cron", key: "cron", label: "Cron & Snapshots", permission: "admin.cron" },
  {
    href: "/admin/api-status",
    key: "api-status",
    label: "API Status",
    permission: "admin.api_status",
  },
  { href: "/admin/ai-costs", key: "ai-costs", label: "AI Costs", permission: "users" },
  { href: "/admin/activity", key: "activity", label: "Activity Log", permission: "admin.activity" },
  { href: "/admin/logs", key: "logs", label: "Logs", permission: "admin.logs" },
  { href: "/admin/settings", key: "settings", label: "Settings", permission: "admin.settings" },
];

export function AdminNav({ active, permissions }: AdminNavProps) {
  const visibleTabs = permissions
    ? TABS.filter((tab) => tab.key === active || permissions.includes(tab.permission))
    : TABS;

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        marginBottom: 28,
        borderBottom: "1px solid var(--border)",
        paddingBottom: 0,
      }}
    >
      {visibleTabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            borderBottom:
              active === tab.key ? "2px solid var(--primary, #6366f1)" : "2px solid transparent",
            color: active === tab.key ? "var(--primary, #6366f1)" : "var(--text-3)",
            textDecoration: "none",
            marginBottom: -1,
            transition: "color 0.15s",
          }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";

interface AdminNavProps {
  active: "users" | "roles";
}

export function AdminNav({ active }: AdminNavProps) {
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
      {[
        { href: "/admin", key: "users", label: "Users" },
        { href: "/admin/roles", key: "roles", label: "Roles & Permissions" },
      ].map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            borderBottom: active === tab.key ? "2px solid var(--primary, #6366f1)" : "2px solid transparent",
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

"use client";
// TODO: Implement Clickr dashboard — see CLICKR_PLAN.md § Phase 6
// Auth guard: GET /api/clickr/auth/me → redirect to /clickr/login if 401
// Content:
//   - Plan badge + usage meter (lpsThisMonth / limit)
//   - Upgrade CTA if free or starter
//   - LP list: title, status, view count, publicSlug link, created date
//   - "New Landing Page" button → /clickr/pages/new

import Link from "next/link";

export default function ClickrDashboardPage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "40px 20px" }}>
      <h1>Your landing pages</h1>
      <p>TODO: implement dashboard</p>
      <Link href="/clickr/pages/new">+ New landing page</Link>
    </main>
  );
}

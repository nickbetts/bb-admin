// TODO: Implement Clickr admin overview — see src/app/(clickr)/CLICKR_PLAN.md § Phase 10
// Auth guard: requireAuth, check permissions.includes("users")
// Sections:
//   Stats row: total users, paid users, MRR (£), LPs this month, est. AI cost
//   Pie chart: users by tier (free / starter / pro)
//   Bar chart: LPs generated per day this month
//   Quick link to /admin/clickr/users

import Link from "next/link";

export default function AdminClickrPage() {
  return (
    <div style={{ padding: "32px", fontFamily: "sans-serif" }}>
      <h1>Clickr Public — Overview</h1>
      <p>TODO: implement admin overview dashboard</p>
      <Link href="/admin/clickr/users">View all users →</Link>
    </div>
  );
}

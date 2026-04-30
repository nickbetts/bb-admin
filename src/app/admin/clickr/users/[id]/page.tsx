// TODO: Implement Clickr admin user detail — see src/app/(clickr)/CLICKR_PLAN.md § Phase 10
// Auth guard: requireAuth, check permissions.includes("users")
// Sections:
//   Profile card: email, name, plan badge, Stripe customer ID (link to Stripe dashboard), created
//   LP list: title, status, view count, /lp/{slug} link, created date
//   Admin actions:
//     - Override plan tier (dropdown: free / starter / pro → PATCH /api/admin/clickr/users/[id])
//     - Reset LP counter (lpsThisMonth = 0)
//     - Disable account (planStatus = "disabled")

export default function AdminClickrUserDetailPage() {
  return (
    <div style={{ padding: "32px", fontFamily: "sans-serif" }}>
      <h1>Clickr User Detail</h1>
      <p>TODO: implement user detail page</p>
    </div>
  );
}

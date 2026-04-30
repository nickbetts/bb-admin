// TODO: Implement Clickr admin user list — see src/app/(clickr)/CLICKR_PLAN.md § Phase 10
// Auth guard: requireAuth, check permissions.includes("users")
// Table columns: Email, Name, Plan (badge), Status (badge), LPs this month, Created, Actions
// Features: email search input, plan tier filter dropdown, pagination

export default function AdminClickrUsersPage() {
  return (
    <div style={{ padding: "32px", fontFamily: "sans-serif" }}>
      <h1>Clickr Users</h1>
      <p>TODO: implement user list table</p>
    </div>
  );
}

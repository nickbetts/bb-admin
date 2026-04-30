"use client";
// TODO: Implement Clickr login page — see CLICKR_PLAN.md § Phase 6
// Form: email + password → POST /api/clickr/auth/login → redirect /clickr/dashboard

export default function ClickrLoginPage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "40px 20px", textAlign: "center" }}>
      <h1>Log in to Clickr</h1>
      <p>TODO: implement login form</p>
      <a href="/clickr/signup">No account? Sign up free</a>
    </main>
  );
}

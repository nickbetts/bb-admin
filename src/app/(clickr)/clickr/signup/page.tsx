"use client";
// TODO: Implement Clickr signup page — see CLICKR_PLAN.md § Phase 6
// Form: name + email + password + confirm password
// → POST /api/clickr/auth/signup → redirect /clickr/dashboard
// Also creates Stripe customer on signup (handled server-side in the API route).

export default function ClickrSignupPage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "40px 20px", textAlign: "center" }}>
      <h1>Create your Clickr account</h1>
      <p>TODO: implement signup form</p>
      <a href="/clickr/login">Already have an account? Log in</a>
    </main>
  );
}

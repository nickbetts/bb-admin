"use client";
// TODO: Implement Clickr LP creation form — see CLICKR_PLAN.md § Phase 6
// Mirrors src/app/tools/landing-pages/new/page.tsx but simplified:
//   - No clientId picker (Clickr users don't have clients)
//   - No templateId picker (v1)
//   - Clickr-branded UI, no Stratos chrome
//   - Same streaming NDJSON response handling
//   - Shows 402 "upgrade" prompt if plan limit hit

export default function ClickrNewPagePage() {
  return (
    <main style={{ fontFamily: "sans-serif", padding: "40px 20px" }}>
      <h1>Create a landing page</h1>
      <p>TODO: implement LP creation form</p>
    </main>
  );
}

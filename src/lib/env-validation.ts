/**
 * Boot-time environment variable validation.
 *
 * Loaded once from `instrumentation.ts` on every server worker start. Logs a
 * concise table of missing / placeholder variables, grouped by criticality:
 *
 *  - **CRITICAL** — server cannot function safely (DATABASE_URL, SESSION_SECRET).
 *    These cause an early throw in production; in dev they log a loud warning.
 *  - **CORE** — features that the platform is built around (OPENAI_API_KEY,
 *    GA4_*, META_*). Missing → those features will fail at runtime, but the
 *    server boots.
 *  - **OPTIONAL** — channel-specific or feature-flag credentials. Missing →
 *    the corresponding feature is silently disabled. Logged at info level.
 *
 * Add new vars by extending the `ENV_SCHEMA` constant. Keep it short — the
 * goal is fast feedback, not exhaustive documentation. The `.env.local.example`
 * file remains the source of truth for the full list.
 */

type Criticality = "critical" | "core" | "optional";

interface EnvVar {
  name: string;
  criticality: Criticality;
  /** Treat these literal values as "missing" (e.g. CI placeholders). */
  placeholderValues?: string[];
  /** Only required when this predicate returns true. */
  requiredWhen?: () => boolean;
}

// Common placeholder values used in CI and `.env.local.example`
const PLACEHOLDERS = ["placeholder", "xxx", "changeme", "your-key-here", ""];

const ENV_SCHEMA: EnvVar[] = [
  // ── CRITICAL ────────────────────────────────────────────────────────────
  { name: "DATABASE_URL", criticality: "critical" },
  { name: "SESSION_SECRET", criticality: "critical", placeholderValues: PLACEHOLDERS },
  { name: "NEXTAUTH_SECRET", criticality: "critical", placeholderValues: PLACEHOLDERS },

  // ── CORE ────────────────────────────────────────────────────────────────
  // OpenAI key may also be stored in DB AppSetting; only warn at boot, never throw.
  { name: "OPENAI_API_KEY", criticality: "core", placeholderValues: PLACEHOLDERS },
  { name: "BLOB_READ_WRITE_TOKEN", criticality: "core", placeholderValues: PLACEHOLDERS },
  { name: "CRON_SECRET", criticality: "core", placeholderValues: PLACEHOLDERS },
  { name: "NEXT_PUBLIC_APP_URL", criticality: "core", placeholderValues: PLACEHOLDERS },

  // ── OPTIONAL (per-channel credentials) ──────────────────────────────────
  { name: "GA4_CLIENT_EMAIL", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "GA4_PRIVATE_KEY", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "META_ACCESS_TOKEN", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "GOOGLE_ADS_DEVELOPER_TOKEN", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "GOOGLE_ADS_CLIENT_ID", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "GOOGLE_ADS_CLIENT_SECRET", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "GOOGLE_ADS_REFRESH_TOKEN", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "MICROSOFT_ADS_DEVELOPER_TOKEN", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "TIKTOK_ACCESS_TOKEN", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "MOZ_ACCESS_ID", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "SEMRUSH_API_KEY", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "GOOGLE_API_KEY", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "GOOGLE_CRUX_API_KEY", criticality: "optional", placeholderValues: PLACEHOLDERS },
  { name: "MS365_CLIENT_ID", criticality: "optional", placeholderValues: PLACEHOLDERS },
];

interface ValidationResult {
  missingCritical: string[];
  missingCore: string[];
  missingOptional: string[];
}

function validate(): ValidationResult {
  const result: ValidationResult = {
    missingCritical: [],
    missingCore: [],
    missingOptional: [],
  };

  for (const v of ENV_SCHEMA) {
    if (v.requiredWhen && !v.requiredWhen()) continue;
    const raw = process.env[v.name];
    const placeholders = v.placeholderValues ?? [""];
    const isMissing = raw === undefined || placeholders.includes(raw.trim().toLowerCase());
    if (!isMissing) continue;

    if (v.criticality === "critical") result.missingCritical.push(v.name);
    else if (v.criticality === "core") result.missingCore.push(v.name);
    else result.missingOptional.push(v.name);
  }

  return result;
}

/**
 * Validate environment at boot. Logs results, throws in production if any
 * CRITICAL vars are missing. Safe to call multiple times.
 */
export function validateEnvOnBoot(): void {
  // Skip during `next build` static analysis — `phase` env var is set by Next.js
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { missingCritical, missingCore, missingOptional } = validate();

  if (missingCritical.length === 0 && missingCore.length === 0 && missingOptional.length === 0) {
    console.log("[env] ✅ all environment variables present");
    return;
  }

  if (missingCritical.length > 0) {
    const msg =
      `[env] ❌ CRITICAL env vars missing or placeholder: ${missingCritical.join(", ")}\n` +
      `      The server cannot boot safely without these. See .env.local.example.`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    } else {
      console.error(msg);
    }
  }

  if (missingCore.length > 0) {
    console.warn(
      `[env] ⚠️  CORE env vars missing or placeholder: ${missingCore.join(", ")}\n` +
      `      Related features will fail at runtime. See .env.local.example.`
    );
  }

  if (missingOptional.length > 0) {
    console.log(
      `[env] ℹ️  optional channel credentials missing: ${missingOptional.join(", ")} ` +
      `(${missingOptional.length} channel${missingOptional.length > 1 ? "s" : ""} disabled)`
    );
  }
}

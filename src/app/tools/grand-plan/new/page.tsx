"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Map,
  ChevronRight,
  Loader2,
  Plus,
  X,
  Sparkles,
  Globe,
  Check,
  Users,
  Building2,
  Search as SearchIcon,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
  website?: string;
  /** JSON string. Stratos persists per-client production rates under
   *  `grandPlan.hoursPerItem` so future plans pre-fill the capacity form. */
  contractedHours?: string | null;
}

// ─── Capacity allocator ─────────────────────────────────────────────────
//
// Strategist enters total hours available across the plan window and
// allocates them across four output types. The form derives the
// quantities the AI will produce (page optimisations, landing pages,
// blog posts, social posts). Pillar pages are explicitly dropped per
// the locked scope — landing pages cover dedicated campaign topics.

type OutputKey = "pageOptimisations" | "landingPages" | "blogPosts" | "socialPosts";

interface OutputDef {
  key: OutputKey;
  label: string;
  hoursPerItem: number;
  sprintHours: number;
  hint: string;
}

const OUTPUT_DEFS: readonly OutputDef[] = [
  {
    key: "pageOptimisations",
    label: "Page optimisations",
    hoursPerItem: 1,
    sprintHours: 8,
    hint: "Title/meta/H1 rewrite, schema, internal links",
  },
  {
    key: "landingPages",
    label: "Landing pages",
    hoursPerItem: 6,
    sprintHours: 12,
    hint: "LP build, copy, tracking, ad set — one per campaign",
  },
  {
    key: "blogPosts",
    label: "Blog posts",
    hoursPerItem: 2,
    sprintHours: 16,
    hint: "Research, write, on-page, publish",
  },
  {
    key: "socialPosts",
    label: "Social posts",
    hoursPerItem: 0.25,
    sprintHours: 24,
    hint: "Caption + asset spec",
  },
];

type OutputCapacity = Record<OutputKey, { hoursPerItem: number; allocatedHours: number }>;

function defaultOutputCapacity(scale: number): OutputCapacity {
  const out: Partial<OutputCapacity> = {};
  for (const def of OUTPUT_DEFS) {
    out[def.key] = { hoursPerItem: def.hoursPerItem, allocatedHours: def.sprintHours * scale };
  }
  return out as OutputCapacity;
}

interface AudienceSuggestion {
  name: string;
  description: string;
  primaryPain?: string;
  decisionTrigger?: string;
}

interface CompetitorEntry {
  domain: string;
  status: "valid" | "no-overlap" | "checking" | "invalid";
  commonKeywords?: number;
  pageContext?: { headings?: string[]; description?: string; ctaTexts?: string[]; h1?: string };
  source: "manual" | "auto";
  message?: string;
}

const SECTORS = [
  { value: "dental", label: "Dental Practices" },
  { value: "ecommerce", label: "Ecommerce & DTC" },
  { value: "industrial", label: "Industrial & Manufacturing" },
  { value: "charities", label: "Charities & Non-Profits" },
  { value: "healthcare", label: "Private Healthcare" },
  { value: "hospitality", label: "Hospitality & Events" },
  { value: "professional_services", label: "Professional Services" },
  { value: "saas", label: "SaaS & Technology" },
  { value: "education", label: "Education & Training" },
  { value: "other", label: "Other" },
];

// Platform options. Each platform maps to one or more generator section
// keys (see src/lib/grand-plan-generator.ts:282-293). Always-on sections
// like Executive Summary, Strategy Plan, Audiences, Content Calendar,
// Competitor Intel, Example Articles and Media Plan are added separately
// regardless of platform selection.
type PlatformId = "googleAds" | "metaAds" | "linkedInAds";

const PLATFORMS: { id: PlatformId; label: string; description: string; sections: string[] }[] = [
  {
    id: "googleAds",
    label: "Google Ads",
    description: "Search campaigns, RSA ad copy",
    sections: ["googleAdsCampaigns"],
  },
  {
    id: "metaAds",
    label: "Meta Ads",
    description: "Facebook & Instagram audience-led campaigns",
    sections: ["metaCampaigns"],
  },
  {
    id: "linkedInAds",
    label: "LinkedIn Ads",
    description: "B2B targeting and ad mockups",
    sections: ["linkedInAds"],
  },
];

// Sections that can be toggled on/off independently of platform selection.
const ALWAYS_ON_SECTIONS: { key: string; label: string }[] = [
  { key: "executiveSummary", label: "Executive Summary" },
  { key: "audiences", label: "Audiences" },
  { key: "contentStrategy", label: "Content Strategy" },
  { key: "contentCalendar", label: "Content Calendar" },
  { key: "seoFoundations", label: "SEO Foundations" },
  { key: "competitorIntel", label: "Competitor Intelligence" },
];

export default function NewGrandPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");

  // Core
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(preselectedClientId || "");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState<"pitch" | "onboarding" | "strategy_refresh">("pitch");
  const [sector, setSector] = useState("");
  const [website, setWebsite] = useState("");
  const [prospectName, setProspectName] = useState("");
  const [brief, setBrief] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [channelBudgets, setChannelBudgets] = useState<Record<string, string>>({});

  // Manual page URLs — pages the user explicitly wants the AI + SEMrush to
  // analyse for SEO Quick Wins and Page Optimisations (commercial /
  // transactional intent keyword recommendations: primary, secondary,
  // long-tail).
  const [manualPageUrlsText, setManualPageUrlsText] = useState("");

  // Audiences — chip list with optional AI auto-populate from the brief.
  const [audiences, setAudiences] = useState<AudienceSuggestion[]>([]);
  const [suggestingAudiences, setSuggestingAudiences] = useState(false);
  const [audienceInput, setAudienceInput] = useState("");

  // Competitors — chip list with auto-detect (SEMrush) + manual add (validate).
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([]);
  const [detectingCompetitors, setDetectingCompetitors] = useState(false);
  const [competitorInput, setCompetitorInput] = useState("");
  const [validatingCompetitor, setValidatingCompetitor] = useState(false);
  const [competitorError, setCompetitorError] = useState<string | null>(null);

  // Team capacity — strategist allocates total hours across output types,
  // form derives the quantities the AI will produce. Defaults assume a
  // 90-day sprint (60h total). Annual plans scale ×4 (240h, 12 months).
  const [outputCapacity, setOutputCapacity] = useState<OutputCapacity>(() =>
    defaultOutputCapacity(1),
  );
  const [totalCapacityHours, setTotalCapacityHours] = useState<number>(60);

  // Plan duration mode — "annual" (default) or "sprint90" (12-week sprint).
  // Sprint mode reframes calendar, roadmap, quick wins and exec summary
  // around a 12-week window. When sprint + previousPlanId are both set the
  // generator treats the plan as a strategy refresh by default.
  const [planMode, setPlanMode] = useState<"annual" | "sprint90">("annual");

  // Previous sprint to continue from — only used when planMode === "sprint90"
  // AND a clientId is selected. The picker is populated from past sprint
  // plans for that client. When chosen, brief / audiences / competitors are
  // pre-filled from the prior plan (still editable) and the generator
  // receives a "do not duplicate" block listing prior items.
  interface PriorSprintOption {
    id: string;
    title: string;
    createdAt: string;
  }
  const [priorSprints, setPriorSprints] = useState<PriorSprintOption[]>([]);
  const [previousPlanId, setPreviousPlanId] = useState<string>("");
  const [loadingPriorSprints, setLoadingPriorSprints] = useState(false);

  // Platforms — controls which paid/organic channels the AI focuses on
  const [platforms, setPlatforms] = useState<PlatformId[]>(["googleAds", "metaAds", "linkedInAds"]);

  function togglePlatform(id: PlatformId) {
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  // Always-on section toggles — defaults to all enabled
  const [enabledAlwaysOn, setEnabledAlwaysOn] = useState<Set<string>>(
    () => new Set(ALWAYS_ON_SECTIONS.map((s) => s.key)),
  );

  function toggleAlwaysOn(key: string) {
    setEnabledAlwaysOn((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // UI
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : (data.clients ?? [])))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (clientId) {
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        if (!title) setTitle(`${client.name} — Go-to-Market Plan`);
        if (client.website && !website) setWebsite(client.website);
        // Pre-fill per-item hours from the client's stored production rates
        // (set last time a Grand Plan was created for them). Allocations
        // stay at the current sprint/annual defaults — the strategist
        // re-allocates per plan.
        if (client.contractedHours) {
          try {
            const parsed = JSON.parse(client.contractedHours);
            const stored = parsed?.grandPlan?.hoursPerItem as
              | Partial<Record<OutputKey, number>>
              | undefined;
            if (stored && typeof stored === "object") {
              setOutputCapacity((prev) => {
                const next = { ...prev };
                for (const def of OUTPUT_DEFS) {
                  const v = stored[def.key];
                  if (typeof v === "number" && v > 0) {
                    next[def.key] = { ...next[def.key], hoursPerItem: v };
                  }
                }
                return next;
              });
            }
          } catch {
            // Ignore parse errors — older clients may have non-JSON values.
          }
        }
      }
    }
  }, [clientId, clients, title, website]);

  // Annual plans get 4× the default sprint allocation. Reset only when
  // the strategist hasn't customised the totals — otherwise leave their
  // values alone so flipping mode after editing is non-destructive.
  useEffect(() => {
    const scale = planMode === "annual" ? 4 : 1;
    const expectedSprint = OUTPUT_DEFS.reduce((s, d) => s + d.sprintHours, 0);
    const currentSum = Object.values(outputCapacity).reduce((s, v) => s + v.allocatedHours, 0);
    const isDefault = currentSum === expectedSprint || currentSum === expectedSprint * 4;
    if (isDefault) {
      setOutputCapacity(defaultOutputCapacity(scale));
      setTotalCapacityHours(expectedSprint * scale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planMode]);

  // Suggest a sprint-flavoured title when sprint mode flips on. Only sets
  // a title if one hasn't been customised already.
  useEffect(() => {
    if (planMode !== "sprint90") return;
    const client = clients.find((c) => c.id === clientId);
    const clientName = client?.name ?? prospectName ?? "";
    if (!clientName) return;
    const annualSuffix = " — Go-to-Market Plan";
    if (!title || title === `${clientName}${annualSuffix}`) {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      setTitle(`${clientName} — 90-Day Sprint (Q${quarter} ${now.getFullYear()})`);
    }
  }, [planMode, clientId, clients, prospectName, title]);

  // Load prior sprint plans for the picker when sprint+client are both set.
  useEffect(() => {
    if (planMode !== "sprint90" || !clientId) {
      setPriorSprints([]);
      setPreviousPlanId("");
      return;
    }
    let cancelled = false;
    setLoadingPriorSprints(true);
    fetch(`/api/tools/grand-plan?clientId=${encodeURIComponent(clientId)}&planMode=sprint90`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = (Array.isArray(data) ? data : (data.grandPlans ?? [])) as Array<{
          id: string;
          title: string;
          createdAt: string;
        }>;
        setPriorSprints(list.map((p) => ({ id: p.id, title: p.title, createdAt: p.createdAt })));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingPriorSprints(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planMode, clientId]);

  // When user picks a previous sprint, prefill brief / audiences / competitors
  // from that plan (still editable). Existing user input is preserved.
  useEffect(() => {
    if (!previousPlanId) return;
    let cancelled = false;
    fetch(`/api/tools/grand-plan/${previousPlanId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const prior = data.grandPlan ?? data;
        if (!prior) return;
        if (!brief && prior.clientBrief) setBrief(prior.clientBrief);
        if (
          audiences.length === 0 &&
          typeof prior.targetAudiences === "string" &&
          prior.targetAudiences.trim()
        ) {
          const lines = prior.targetAudiences
            .split(/\r?\n/)
            .map((line: string) => line.trim())
            .filter(Boolean);
          const parsed: AudienceSuggestion[] = lines.map((line: string) => {
            const idx = line.indexOf(":");
            return idx > -1
              ? { name: line.slice(0, idx).trim(), description: line.slice(idx + 1).trim() }
              : { name: line, description: "" };
          });
          if (parsed.length) setAudiences(parsed);
        }
        if (competitors.length === 0 && prior.competitorsJson) {
          try {
            const list = JSON.parse(prior.competitorsJson) as Array<{
              domain: string;
              commonKeywords?: number;
              pageContext?: CompetitorEntry["pageContext"];
              source?: "auto" | "manual";
            }>;
            if (Array.isArray(list) && list.length) {
              setCompetitors(
                list.map((c) => ({
                  domain: c.domain,
                  status: "valid",
                  commonKeywords: c.commonKeywords,
                  pageContext: c.pageContext,
                  source: c.source ?? "auto",
                })),
              );
            }
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousPlanId]);

  const domain = website
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");

  // ── Audience helpers ─────────────────────────────────────────────────────
  const addAudience = useCallback((a: AudienceSuggestion) => {
    setAudiences((prev) => {
      if (prev.some((p) => p.name.toLowerCase() === a.name.toLowerCase())) return prev;
      return [...prev, a];
    });
  }, []);

  const removeAudience = useCallback((name: string) => {
    setAudiences((prev) => prev.filter((a) => a.name !== name));
  }, []);

  const handleSuggestAudiences = useCallback(async () => {
    if (brief.trim().length < 20) return;
    setSuggestingAudiences(true);
    try {
      const res = await fetch("/api/tools/grand-plan/suggest-audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          clientId: clientId || undefined,
          sector: sector || undefined,
          clientName: clients.find((c) => c.id === clientId)?.name,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { audiences?: AudienceSuggestion[] };
      if (Array.isArray(data.audiences)) setAudiences(data.audiences);
    } finally {
      setSuggestingAudiences(false);
    }
  }, [brief, clientId, sector, clients]);

  const handleAddManualAudience = useCallback(() => {
    const name = audienceInput.trim();
    if (!name) return;
    addAudience({ name, description: "" });
    setAudienceInput("");
  }, [audienceInput, addAudience]);

  // ── Competitor helpers ───────────────────────────────────────────────────
  const handleDetectCompetitors = useCallback(async () => {
    if (!domain && !clientId) return;
    setDetectingCompetitors(true);
    setCompetitorError(null);
    try {
      const res = await fetch("/api/tools/grand-plan/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "detect",
          domain: domain || undefined,
          clientId: clientId || undefined,
        }),
      });
      const data = (await res.json()) as {
        competitors?: {
          domain: string;
          commonKeywords?: number;
          pageContext?: CompetitorEntry["pageContext"];
        }[];
        error?: string;
      };
      if (!res.ok) {
        setCompetitorError(
          data.error ?? "Could not auto-detect competitors. Please try again or add them manually.",
        );
        return;
      }
      const detected: CompetitorEntry[] = (data.competitors ?? []).slice(0, 6).map((c) => ({
        domain: c.domain,
        commonKeywords: c.commonKeywords,
        pageContext: c.pageContext,
        status: "valid",
        source: "auto",
      }));
      let addedCount = 0;
      setCompetitors((prev) => {
        const seen = new Set(prev.map((p) => p.domain.toLowerCase()));
        const fresh = detected.filter((d) => !seen.has(d.domain.toLowerCase()));
        addedCount = fresh.length;
        return [...prev, ...fresh];
      });
      if (detected.length === 0) {
        setCompetitorError(
          "SEMrush returned no competitors for this domain. Add competitors manually below.",
        );
      } else if (addedCount === 0) {
        setCompetitorError(
          "No new competitors found — the detected domains are already in your list.",
        );
      }
    } catch {
      setCompetitorError(
        "Could not auto-detect competitors. Please try again or add them manually.",
      );
    } finally {
      setDetectingCompetitors(false);
    }
  }, [domain, clientId]);

  const handleAddManualCompetitor = useCallback(async () => {
    const raw = competitorInput
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");
    if (!raw) return;
    if (competitors.some((c) => c.domain.toLowerCase() === raw)) {
      setCompetitorInput("");
      return;
    }
    const placeholder: CompetitorEntry = { domain: raw, status: "checking", source: "manual" };
    setCompetitors((prev) => [...prev, placeholder]);
    setCompetitorInput("");
    setValidatingCompetitor(true);
    try {
      const res = await fetch("/api/tools/grand-plan/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "validate",
          competitor: raw,
          domain: domain || undefined,
          clientId: clientId || undefined,
        }),
      });
      const data = (await res.json()) as {
        commonKeywords?: number;
        scraped?: boolean;
        pageContext?: CompetitorEntry["pageContext"];
        error?: string;
      };
      setCompetitors((prev) =>
        prev.map((c) => {
          if (c.domain !== raw) return c;
          // API error or non-OK response → mark invalid
          if (!res.ok || data.error)
            return { ...c, status: "invalid", message: data.error ?? "Could not validate" };
          // Successful response: use keyword count to decide status.
          // Even with 0 overlap (scraped fallback), keep as no-overlap so it's
          // still included and the AI uses the scraped page context.
          return {
            ...c,
            status: (data.commonKeywords ?? 0) > 0 ? "valid" : "no-overlap",
            commonKeywords: data.commonKeywords,
            pageContext: data.pageContext,
          };
        }),
      );
    } catch {
      setCompetitors((prev) =>
        prev.map((c) =>
          c.domain === raw ? { ...c, status: "invalid", message: "Validation failed" } : c,
        ),
      );
    } finally {
      setValidatingCompetitor(false);
    }
  }, [competitorInput, competitors, domain, clientId]);

  const removeCompetitor = useCallback((d: string) => {
    setCompetitors((prev) => prev.filter((c) => c.domain !== d));
  }, []);

  async function handleCreate() {
    if (!title) return;
    setCreating(true);
    try {
      // Build the section enable list from toggled always-on sections + selected platforms.
      const platformSections = platforms.flatMap(
        (id) => PLATFORMS.find((p) => p.id === id)?.sections ?? [],
      );
      const enabledSections = Array.from(
        new Set([...Array.from(enabledAlwaysOn), ...platformSections]),
      );

      // Stringify audiences in the same "Name: Description" format the
      // existing generator already understands when targetAudiences is set.
      const audiencesText = audiences.length
        ? audiences.map((a) => `${a.name}: ${a.description}`.trim().replace(/:\s*$/, "")).join("\n")
        : "";

      // Strip out invalid competitors before sending. We do persist no-overlap
      // ones because the generator falls back to scraped page context.
      const finalCompetitors = competitors
        .filter((c) => c.status === "valid" || c.status === "no-overlap")
        .map((c) => ({
          domain: c.domain,
          commonKeywords: c.commonKeywords,
          pageContext: c.pageContext,
          source: c.source,
        }));

      // Parse the manual page URLs textarea: one URL per line, trim, dedupe,
      // keep only http(s) URLs, cap at 10 to stay within the SEMrush quota
      // and keep the prepare-research step inside the lambda budget.
      const manualPageUrls = Array.from(
        new Set(
          manualPageUrlsText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => /^https?:\/\//i.test(line)),
        ),
      ).slice(0, 10);

      const res = await fetch("/api/tools/grand-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || undefined,
          prospectName: !clientId && prospectName.trim() ? prospectName.trim() : undefined,
          prospectWebsite: !clientId && website ? website : undefined,
          title,
          // In sprint mode with a previous sprint chosen, treat as a strategy
          // refresh — this aligns audit trails / pipeline buckets.
          purpose: planMode === "sprint90" && previousPlanId ? "strategy_refresh" : purpose,
          clientBrief: brief || undefined,
          targetAudiences: audiencesText || undefined,
          sector: sector || undefined,
          competitors: finalCompetitors,
          previousPlanId: planMode === "sprint90" && previousPlanId ? previousPlanId : undefined,
          config: (() => {
            const monthsInWindow = planMode === "annual" ? 12 : 3;
            const counts = OUTPUT_DEFS.reduce(
              (acc, def) => {
                const row = outputCapacity[def.key];
                acc[def.key] =
                  row.hoursPerItem > 0 ? Math.floor(row.allocatedHours / row.hoursPerItem) : 0;
                return acc;
              },
              {} as Record<OutputKey, number>,
            );
            // Derive per-month cadence for the calendar / social generators
            // (existing generator code expects per-month numbers).
            const derivedPostsPerMonth = Math.max(
              1,
              Math.round(counts.blogPosts / monthsInWindow) || 1,
            );
            const derivedSocialPerMonth = Math.max(
              0,
              Math.round(counts.socialPosts / monthsInWindow),
            );
            const capacityItems = OUTPUT_DEFS.reduce(
              (acc, def) => {
                acc[def.key] = {
                  hoursPerItem: outputCapacity[def.key].hoursPerItem,
                  allocatedHours: outputCapacity[def.key].allocatedHours,
                  count: counts[def.key],
                };
                return acc;
              },
              {} as Record<
                OutputKey,
                { hoursPerItem: number; allocatedHours: number; count: number }
              >,
            );
            return {
              sections: enabledSections,
              postsPerMonth: derivedPostsPerMonth,
              socialPostsPerMonth: derivedSocialPerMonth,
              planMode,
              ...(sector ? { sector } : {}),
              ...(manualPageUrls.length ? { manualPageUrls } : {}),
              // Pillar pages set to 0 — landing pages cover dedicated campaign topics.
              contentLimits: {
                ...(counts.pageOptimisations > 0
                  ? { pageOptimisations: counts.pageOptimisations }
                  : {}),
                ...(counts.landingPages > 0 ? { landingPages: counts.landingPages } : {}),
                ...(counts.blogPosts > 0 ? { blogPosts: counts.blogPosts } : {}),
                pillarPages: 0,
              },
              capacity: {
                totalHours: totalCapacityHours,
                window: planMode === "annual" ? "annual" : "90d",
                monthsInWindow,
                items: capacityItems,
              },
              ...(website
                ? {
                    kwBrief: {
                      website,
                      brief,
                      monthlyBudget: channelBudgets.googleAds || monthlyBudget,
                    },
                  }
                : {}),
              ...(domain
                ? {
                    contentBrief: {
                      domain,
                      brief,
                      competitors: finalCompetitors.map((c) => c.domain).join(","),
                    },
                  }
                : {}),
              ...(Object.keys(channelBudgets).length > 0
                ? {
                    channelBudgets: Object.fromEntries(
                      Object.entries(channelBudgets)
                        .filter(([, v]) => v && Number(v.replace(/[^0-9.]/g, "")) > 0)
                        .map(([k, v]) => [k, Number(v.replace(/[^0-9.]/g, ""))]),
                    ),
                  }
                : {}),
            };
          })(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Persist the per-item hours back onto the client so future plans
        // pre-fill from the same baseline. Allocations stay per-plan.
        if (clientId) {
          try {
            const client = clients.find((c) => c.id === clientId);
            const existing = (() => {
              if (!client?.contractedHours) return {};
              try {
                return JSON.parse(client.contractedHours) ?? {};
              } catch {
                return {};
              }
            })();
            const hoursPerItem = OUTPUT_DEFS.reduce(
              (acc, def) => {
                acc[def.key] = outputCapacity[def.key].hoursPerItem;
                return acc;
              },
              {} as Record<OutputKey, number>,
            );
            const merged = {
              ...existing,
              grandPlan: { ...(existing?.grandPlan ?? {}), hoursPerItem },
            };
            await fetch(`/api/clients/${clientId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contractedHours: JSON.stringify(merged) }),
            });
          } catch {
            // Non-fatal — the plan is already saved.
          }
        }
        // Redirect with autoStart so the view page kicks off generation
        // immediately — the user shouldn't have to press another button.
        router.push(`/tools/grand-plan/${data.grandPlan.id}?autoStart=1`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--r-sm)",
              background: "var(--gradient-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Map style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <h1 className="page-title">New Grand Plan</h1>
        </div>
        <p className="page-desc" style={{ marginLeft: 52 }}>
          One brief, every deliverable. Keywords, ads, content, a landing page, and a full strategy
          document.
        </p>
      </div>

      {/* ═══════ THE BRIEF ═══════ */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--text-3)",
            marginBottom: 12,
          }}
        >
          The Brief
        </div>

        <div className="card">
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Client + Title row */}
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}>
              <div>
                <label className="form-label">Client</label>
                <select
                  className="form-input form-select"
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                  }}
                >
                  <option value="">No client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Plan Title</label>
                <input
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Acme Co — Go-to-Market Plan 2026"
                />
              </div>
            </div>

            {/* Prospect name — only for cold prospects with no client linked */}
            {!clientId && (
              <div>
                <label className="form-label">Prospect name</label>
                <input
                  className="form-input"
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  placeholder="e.g. Acme Co (cold prospect)"
                />
                <span className="form-hint">
                  Used for the share-page heading and pipeline. Convert to a full client later when
                  they sign.
                </span>
              </div>
            )}

            {/* Website + Budget row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 16 }}>
              <div>
                <label
                  className="form-label"
                  style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                  <Globe style={{ width: 13, height: 13 }} />
                  Website
                </label>
                <input
                  className="form-input"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                />
                <span className="form-hint">
                  Used for keyword research, content strategy, brand extraction, and landing page
                </span>
              </div>
              <div>
                <label className="form-label">Monthly Budget</label>
                <input
                  className="form-input"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  placeholder="£5,000"
                />
              </div>
            </div>

            {/* Plan duration — annual vs 90-day sprint */}
            <div>
              <label className="form-label">Plan duration</label>
              <div style={{ display: "flex", gap: 6 }}>
                {(
                  [
                    { id: "annual", label: "Annual" },
                    { id: "sprint90", label: "90-Day Sprint" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPlanMode(m.id)}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      borderRadius: "var(--r-sm)",
                      fontSize: 13,
                      fontWeight: 600,
                      border: `1.5px solid ${planMode === m.id ? "var(--accent)" : "var(--border)"}`,
                      background: planMode === m.id ? "var(--gradient-accent)" : "transparent",
                      color: planMode === m.id ? "white" : "var(--text-3)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <span className="form-hint">
                Annual = 12-month strategy. 90-Day Sprint = focused 12-week plan you can re-run
                quarterly.
              </span>
            </div>

            {/* Previous sprint picker — only shown in sprint mode with a client. */}
            {planMode === "sprint90" && clientId && (
              <div>
                <label className="form-label">Continue from previous sprint</label>
                <select
                  className="form-input form-select"
                  value={previousPlanId}
                  onChange={(e) => setPreviousPlanId(e.target.value)}
                  disabled={loadingPriorSprints}
                >
                  <option value="">
                    {loadingPriorSprints ? "Loading…" : "(none — fresh sprint)"}
                  </option>
                  {priorSprints.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {new Date(p.createdAt).toLocaleDateString("en-GB")}
                    </option>
                  ))}
                </select>
                <span className="form-hint">
                  When set, the new sprint reads the prior plan and won&apos;t propose the same
                  quick wins, pillars, page optimisations or blog topics again. Brief, audiences and
                  competitors are pre-filled but stay editable.
                </span>
              </div>
            )}

            {/* Purpose + Sector row — Purpose hidden in sprint mode (sprint IS the purpose). */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: planMode === "sprint90" ? "1fr" : "1fr 1fr",
                gap: 16,
              }}
            >
              {planMode !== "sprint90" && (
                <div>
                  <label className="form-label">Purpose</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["pitch", "onboarding", "strategy_refresh"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPurpose(p)}
                        style={{
                          flex: 1,
                          padding: "9px 0",
                          borderRadius: "var(--r-sm)",
                          fontSize: 13,
                          fontWeight: 600,
                          border: `1.5px solid ${purpose === p ? "var(--accent)" : "var(--border)"}`,
                          background: purpose === p ? "var(--gradient-accent)" : "transparent",
                          color: purpose === p ? "white" : "var(--text-3)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {p === "pitch" ? "Pitch" : p === "onboarding" ? "Onboarding" : "Refresh"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="form-label">Sector</label>
                <select
                  className="form-input form-select"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                >
                  <option value="">Select...</option>
                  {SECTORS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Brief */}
            <div>
              <label className="form-label">Brief</label>
              <textarea
                className="form-input form-textarea"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Describe the business, their goals, campaign focus, and any pain points. This single brief powers keywords, ads, content, and the landing page."
              />
            </div>

            {/* Manual page URLs to optimise — drives SEO Quick Wins + Page Optimisations
                with per-page SEMrush keyword data and AI commercial-intent recommendations. */}
            <div>
              <label className="form-label">Pages to optimise (one URL per line)</label>
              <textarea
                className="form-input form-textarea"
                value={manualPageUrlsText}
                onChange={(e) => setManualPageUrlsText(e.target.value)}
                placeholder={
                  "https://www.example.com/services/example-service/\nhttps://www.example.com/locations/london/"
                }
                style={{
                  minHeight: 90,
                  fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
                  fontSize: 12.5,
                }}
              />
              <div style={{ fontSize: 11.5, color: "var(--mid)", marginTop: 4, lineHeight: 1.45 }}>
                We&apos;ll scrape each page (title, H1, meta, body), pull the SEMrush keywords each
                one currently ranks for, and bias the SEO Quick Wins and Page Optimisations toward
                commercial / transactional intent — primary, secondary, long-tail. Up to 10 URLs.
              </div>
            </div>

            {/* Target Audiences — chips with optional Suggest from brief */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <label
                  className="form-label"
                  style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 0 }}
                >
                  <Users style={{ width: 13, height: 13 }} />
                  Target Audiences
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={brief.trim().length < 20 || suggestingAudiences}
                  onClick={handleSuggestAudiences}
                  title={
                    brief.trim().length < 20
                      ? "Write a brief first (20+ characters)"
                      : "Auto-populate audiences from the brief"
                  }
                >
                  {suggestingAudiences ? (
                    <Loader2
                      style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <Sparkles style={{ width: 12, height: 12 }} />
                  )}
                  {suggestingAudiences ? "Suggesting…" : "Suggest from brief"}
                </button>
              </div>
              {audiences.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {audiences.map((a) => (
                    <span
                      key={a.name}
                      style={{
                        display: "inline-flex",
                        alignItems: "flex-start",
                        gap: 6,
                        padding: "6px 10px",
                        borderRadius: 8,
                        background: "var(--accent-bg)",
                        border: "1px solid var(--accent)",
                        color: "var(--text)",
                        fontSize: 12,
                        lineHeight: 1.35,
                        maxWidth: 320,
                      }}
                    >
                      <span style={{ flex: 1 }}>
                        <strong>{a.name}</strong>
                        {a.description && (
                          <span
                            style={{
                              display: "block",
                              color: "var(--text-3)",
                              fontSize: 11,
                              marginTop: 2,
                            }}
                          >
                            {a.description}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAudience(a.name)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-3)",
                          padding: 0,
                          marginTop: 1,
                        }}
                        aria-label={`Remove ${a.name}`}
                      >
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="form-input"
                  style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
                  value={audienceInput}
                  onChange={(e) => setAudienceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddManualAudience();
                    }
                  }}
                  placeholder="Add an audience name and press Enter"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddManualAudience}
                  disabled={!audienceInput.trim()}
                >
                  <Plus style={{ width: 12, height: 12 }} /> Add
                </button>
              </div>
              <span className="form-hint">
                Use Suggest to auto-populate from the brief, or add manually. Empty list = AI infers
                them.
              </span>
            </div>

            {/* Competitors — chips with auto-detect (SEMrush) + manual add */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <label
                  className="form-label"
                  style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 0 }}
                >
                  <Building2 style={{ width: 13, height: 13 }} />
                  Competitors
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={(!domain && !clientId) || detectingCompetitors}
                  onClick={handleDetectCompetitors}
                  title={
                    !domain && !clientId
                      ? "Set a website or pick a client first"
                      : "Auto-detect competitors via SEMrush"
                  }
                >
                  {detectingCompetitors ? (
                    <Loader2
                      style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <SearchIcon style={{ width: 12, height: 12 }} />
                  )}
                  {detectingCompetitors ? "Detecting…" : "Auto-detect"}
                </button>
              </div>
              {competitorError && (
                <div
                  style={{
                    marginBottom: 8,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "#fef3c7",
                    border: "1px solid #f59e0b",
                    color: "#92400e",
                    fontSize: 12,
                  }}
                >
                  {competitorError}
                </div>
              )}
              {competitors.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {competitors.map((c) => {
                    const tone =
                      c.status === "valid"
                        ? { bg: "#d1fae5", fg: "#065f46", border: "#059669" }
                        : c.status === "no-overlap"
                          ? { bg: "#fef3c7", fg: "#92400e", border: "#f59e0b" }
                          : c.status === "checking"
                            ? {
                                bg: "var(--accent-bg)",
                                fg: "var(--accent)",
                                border: "var(--accent)",
                              }
                            : { bg: "#fee2e2", fg: "#991b1b", border: "#dc2626" };
                    return (
                      <span
                        key={c.domain}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 10px",
                          borderRadius: 8,
                          background: tone.bg,
                          border: `1px solid ${tone.border}`,
                          color: tone.fg,
                          fontSize: 12,
                        }}
                      >
                        <strong>{c.domain}</strong>
                        {c.status === "checking" && (
                          <Loader2
                            style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }}
                          />
                        )}
                        {typeof c.commonKeywords === "number" && c.commonKeywords > 0 && (
                          <span style={{ fontSize: 11, opacity: 0.85 }}>
                            {c.commonKeywords} common KWs
                          </span>
                        )}
                        {c.status === "no-overlap" && (
                          <span style={{ fontSize: 11 }}>
                            {c.pageContext ? "scraped — no SEMrush overlap" : "no SEMrush overlap"}
                          </span>
                        )}
                        {c.status === "invalid" && (
                          <span style={{ fontSize: 11 }}>{c.message ?? "invalid"}</span>
                        )}
                        <span style={{ fontSize: 10, opacity: 0.7, textTransform: "uppercase" }}>
                          {c.source}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCompetitor(c.domain)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: tone.fg,
                            padding: 0,
                          }}
                          aria-label={`Remove ${c.domain}`}
                        >
                          <X style={{ width: 11, height: 11 }} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="form-input"
                  style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddManualCompetitor();
                    }
                  }}
                  placeholder="competitor.com"
                  disabled={validatingCompetitor}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddManualCompetitor}
                  disabled={!competitorInput.trim() || validatingCompetitor}
                >
                  <Plus style={{ width: 12, height: 12 }} /> Add
                </button>
              </div>
              <span className="form-hint">
                Auto-detect uses SEMrush keyword overlap. Manual entries are scraped for
                headlines/CTAs when SEMrush has no data.
              </span>
            </div>

            {/* Team capacity — derives the AI's output quantities */}
            {(() => {
              const monthsInWindow = planMode === "annual" ? 12 : 3;
              const windowLabel = planMode === "annual" ? "12 months" : "90 days";
              const allocatedSum = Object.values(outputCapacity).reduce(
                (s, v) => s + v.allocatedHours,
                0,
              );
              const remaining = totalCapacityHours - allocatedSum;
              const overBudget = remaining < 0;
              const counts: Record<OutputKey, number> = OUTPUT_DEFS.reduce(
                (acc, def) => {
                  const row = outputCapacity[def.key];
                  acc[def.key] =
                    row.hoursPerItem > 0 ? Math.floor(row.allocatedHours / row.hoursPerItem) : 0;
                  return acc;
                },
                {} as Record<OutputKey, number>,
              );

              function updateRow(
                key: OutputKey,
                patch: Partial<{ hoursPerItem: number; allocatedHours: number }>,
              ) {
                setOutputCapacity((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
              }

              function autoAllocateEvenly() {
                const empty = OUTPUT_DEFS.filter((d) => outputCapacity[d.key].allocatedHours === 0);
                const target = empty.length ? empty : OUTPUT_DEFS;
                const pool = empty.length ? remaining : totalCapacityHours;
                if (pool <= 0 || target.length === 0) return;
                const slice = pool / target.length;
                setOutputCapacity((prev) => {
                  const next = { ...prev };
                  for (const def of target) {
                    next[def.key] = { ...next[def.key], allocatedHours: Math.round(slice * 4) / 4 };
                  }
                  return next;
                });
              }

              function resetDefaults() {
                const scale = planMode === "annual" ? 4 : 1;
                setOutputCapacity(defaultOutputCapacity(scale));
                setTotalCapacityHours(OUTPUT_DEFS.reduce((s, d) => s + d.sprintHours, 0) * scale);
              }

              return (
                <div>
                  <label className="form-label">Team capacity</label>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-3)",
                      marginBottom: 10,
                      marginTop: -4,
                    }}
                  >
                    Allocate the hours you have available across {windowLabel}. The form derives how
                    many of each output the AI will produce.
                  </div>

                  {/* Total + summary row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "200px 1fr",
                      gap: 12,
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <input
                        className="form-input"
                        type="number"
                        min={0}
                        step={1}
                        value={totalCapacityHours}
                        onChange={(e) =>
                          setTotalCapacityHours(Math.max(0, Number(e.target.value) || 0))
                        }
                      />
                      <span className="form-hint">Total hours over {windowLabel}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: overBudget ? "var(--danger)" : "var(--text-2)",
                      }}
                    >
                      {allocatedSum}h allocated · {remaining}h{" "}
                      {overBudget ? "over budget" : "remaining"}
                    </div>
                  </div>

                  {/* Per-output rows */}
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-sm)",
                      padding: "8px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                        gap: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "var(--text-3)",
                        paddingBottom: 6,
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div>Output</div>
                      <div>Hours / item</div>
                      <div>Hours allocated</div>
                      <div>Quantity</div>
                    </div>
                    {OUTPUT_DEFS.map((def) => {
                      const row = outputCapacity[def.key];
                      const count = counts[def.key];
                      return (
                        <div
                          key={def.key}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
                            gap: 10,
                            alignItems: "center",
                            padding: "4px 0",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                              {def.label}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-3)" }}>{def.hint}</div>
                          </div>
                          <input
                            className="form-input"
                            type="number"
                            min={0}
                            step={0.25}
                            value={row.hoursPerItem}
                            onChange={(e) =>
                              updateRow(def.key, {
                                hoursPerItem: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            style={{ padding: "6px 10px", fontSize: 13 }}
                          />
                          <input
                            className="form-input"
                            type="number"
                            min={0}
                            step={0.25}
                            value={row.allocatedHours}
                            onChange={(e) =>
                              updateRow(def.key, {
                                allocatedHours: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            style={{ padding: "6px 10px", fontSize: 13 }}
                          />
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--accent)",
                              background: "var(--accent-soft, rgba(99,102,241,0.1))",
                              padding: "6px 10px",
                              borderRadius: "var(--r-sm)",
                              textAlign: "center",
                            }}
                          >
                            {count} {count === 1 ? "item" : "items"}
                            {def.key === "socialPosts" && monthsInWindow > 0 && count > 0 && (
                              <span style={{ fontWeight: 400, opacity: 0.8 }}>
                                {" "}
                                · ~{Math.round(count / monthsInWindow)}/mo
                              </span>
                            )}
                            {def.key === "blogPosts" && monthsInWindow > 0 && count > 0 && (
                              <span style={{ fontWeight: 400, opacity: 0.8 }}>
                                {" "}
                                · ~{Math.round(count / monthsInWindow)}/mo
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 12 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={autoAllocateEvenly}
                    >
                      Auto-allocate evenly
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={resetDefaults}>
                      Reset to defaults
                    </button>
                    {overBudget && (
                      <span style={{ color: "var(--danger)", alignSelf: "center" }}>
                        Over budget by {Math.abs(remaining)}h — submit allowed but worth a sanity
                        check.
                      </span>
                    )}
                  </div>
                  <span className="form-hint" style={{ marginTop: 6, display: "block" }}>
                    Pillar pages are intentionally excluded — landing pages cover dedicated campaign
                    topics, and pillar setup is included in the landing-page hours.
                  </span>
                </div>
              );
            })()}

            {/* Platforms */}
            <div>
              <label className="form-label">Platforms</label>
              <div
                style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 10, marginTop: -4 }}
              >
                Choose which channels the plan should focus on. Sections for unselected platforms
                are skipped.
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 8,
                }}
              >
                {PLATFORMS.map((p) => {
                  const checked = platforms.includes(p.id);
                  const isPaid =
                    p.id === "googleAds" || p.id === "metaAds" || p.id === "linkedInAds";
                  return (
                    <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => togglePlatform(p.id)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "12px 14px",
                          borderRadius: "var(--r-sm)",
                          border: `1.5px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                          background: checked ? "var(--accent-bg)" : "var(--white, #fff)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s",
                          width: "100%",
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 5,
                            border: `1.5px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                            background: checked ? "var(--accent)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          {checked && <Check style={{ width: 11, height: 11, color: "white" }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                            {p.label}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                            {p.description}
                          </div>
                        </div>
                      </button>
                      {isPaid && checked && (
                        <div style={{ paddingLeft: 2 }}>
                          <input
                            className="form-input"
                            style={{ fontSize: 12, padding: "6px 10px" }}
                            value={channelBudgets[p.id] ?? ""}
                            onChange={(e) =>
                              setChannelBudgets((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            placeholder="Monthly budget e.g. £500"
                          />
                          <span className="form-hint" style={{ fontSize: 11 }}>
                            Budget shapes the number of campaigns and ad groups the AI will plan
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ WHAT GETS GENERATED ═══════ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ padding: "20px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--text-3)",
              }}
            >
              What gets generated
            </div>
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>
              Click to toggle sections on or off
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {/* Always-on sections — individually toggleable */}
            {ALWAYS_ON_SECTIONS.map((s) => {
              const on = enabledAlwaysOn.has(s.key);
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleAlwaysOn(s.key)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "var(--r-sm)",
                    fontSize: 12,
                    fontWeight: 500,
                    border: `1.5px solid ${on ? "var(--accent)" : "var(--border)"}`,
                    background: on ? "var(--accent-bg)" : "transparent",
                    color: on ? "var(--accent)" : "var(--text-3)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    opacity: on ? 1 : 0.55,
                    transition: "all 0.15s",
                  }}
                  title={on ? `Disable ${s.label}` : `Enable ${s.label}`}
                >
                  {on ? (
                    <Sparkles style={{ width: 10, height: 10 }} />
                  ) : (
                    <X style={{ width: 10, height: 10 }} />
                  )}
                  <span dangerouslySetInnerHTML={{ __html: s.label }} />
                </button>
              );
            })}
            {/* Platform sections — reflect the platform toggles above, not individually toggleable here */}
            {(
              [
                { label: "Google Ads", on: platforms.includes("googleAds") },
                { label: "Meta Campaigns", on: platforms.includes("metaAds") },
                { label: "LinkedIn Ads", on: platforms.includes("linkedInAds") },
              ] as { label: string; on: boolean }[]
            ).map((item) => (
              <span
                key={item.label}
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--r-sm)",
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1.5px solid ${item.on ? "var(--accent)" : "var(--border)"}`,
                  background: item.on ? "var(--accent-bg)" : "transparent",
                  color: item.on ? "var(--accent)" : "var(--text-3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  opacity: item.on ? 1 : 0.45,
                }}
                title="Toggle this in the Platforms section above"
              >
                {item.on ? (
                  <Sparkles style={{ width: 10, height: 10 }} />
                ) : (
                  <X style={{ width: 10, height: 10 }} />
                )}
                {item.label}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 10 }}>
            Platform sections (Google Ads, Meta, etc.) are toggled in the <strong>Platforms</strong>{" "}
            panel above. Pressing <strong>Create &amp; Generate</strong> starts the pipeline
            immediately.
          </div>
        </div>
      </div>

      {/* ═══════ ACTIONS ═══════ */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingBottom: 40 }}>
        <button className="btn btn-ghost" onClick={() => router.push("/tools/grand-plan")}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={!title || creating} onClick={handleCreate}>
          {creating ? (
            <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
          ) : (
            <ChevronRight style={{ width: 15, height: 15 }} />
          )}
          Create &amp; Generate
        </button>
      </div>
    </div>
  );
}

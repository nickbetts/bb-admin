// Helpers for the Meta Audience Scraper tool.
// Wraps Meta's Graph API targeting endpoints — interests, behaviours,
// demographics, geolocations and reach-estimate / delivery-estimate.

const META_API = "https://graph.facebook.com/v19.0";

export type MetaTargetingType =
  | "adinterest"
  | "adworkemployer"
  | "adworkposition"
  | "adeducationschool"
  | "adeducationmajor"
  | "adgeolocation"
  | "adlocale"
  | "adTargetingCategory";

export interface MetaTargetingResult {
  id: string;
  name: string;
  type: string;                 // "interests", "behaviors", "demographics", "life_events", etc.
  topic?: string;
  path?: string[];
  description?: string;
  audienceSizeLower?: number;
  audienceSizeUpper?: number;
  raw?: unknown;
}

export interface MetaDeliveryEstimate {
  estimatedDauLower: number;
  estimatedDauUpper: number;
  estimatedMauLower: number;
  estimatedMauUpper: number;
}

export interface MetaTargetingSpec {
  // Minimal subset of the Meta targeting spec.
  geo_locations?: {
    countries?: string[];
    regions?: { key: string }[];
    cities?: { key: string; radius?: number; distance_unit?: "mile" | "kilometer" }[];
  };
  age_min?: number;
  age_max?: number;
  genders?: number[];           // 1 = male, 2 = female
  interests?: { id: string; name?: string }[];
  behaviors?: { id: string; name?: string }[];
  flexible_spec?: { interests?: { id: string }[]; behaviors?: { id: string }[] }[];
  publisher_platforms?: string[];
  facebook_positions?: string[];
  instagram_positions?: string[];
  device_platforms?: string[];
}

function getToken(clientToken?: string): string {
  const t = clientToken || process.env.META_ACCESS_TOKEN;
  if (!t) throw new Error("META_ACCESS_TOKEN is not configured");
  return t;
}

interface SearchEntity {
  id: string;
  name: string;
  type?: string;
  path?: string[];
  description?: string;
  topic?: string;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
}

function normalise(row: SearchEntity): MetaTargetingResult {
  return {
    id: row.id,
    name: row.name,
    type: row.type ?? "",
    topic: row.topic,
    path: row.path,
    description: row.description,
    audienceSizeLower: row.audience_size_lower_bound,
    audienceSizeUpper: row.audience_size_upper_bound,
    raw: row,
  };
}

// ─── Search the global targeting catalogue ──────────────────────────────────
// Uses the /search?type=adTargetingCategory endpoint which spans interests,
// behaviours, life events, demographics, etc. Returns a flat list with `type`
// indicating what each row is.

export async function searchTargetingCategories(
  query: string,
  opts: { token?: string; limit?: number; classes?: string[] } = {}
): Promise<MetaTargetingResult[]> {
  const params = new URLSearchParams({
    type: "adTargetingCategory",
    q: query,
    access_token: getToken(opts.token),
    limit: String(opts.limit ?? 30),
  });
  if (opts.classes?.length) params.set("class", opts.classes.join(","));

  const res = await fetch(`${META_API}/search?${params}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta targeting search failed: ${body}`);
  }
  const json = (await res.json()) as { data?: SearchEntity[] };
  return (json.data ?? []).map(normalise);
}

// Targeted interest-only search via /search?type=adinterest (richer fields,
// e.g. audience_size_lower_bound/upper_bound).

export async function searchInterests(
  query: string,
  opts: { token?: string; limit?: number } = {}
): Promise<MetaTargetingResult[]> {
  const params = new URLSearchParams({
    type: "adinterest",
    q: query,
    access_token: getToken(opts.token),
    limit: String(opts.limit ?? 25),
  });
  const res = await fetch(`${META_API}/search?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Meta interest search failed: ${await res.text()}`);
  const json = (await res.json()) as { data?: SearchEntity[] };
  return (json.data ?? []).map((d) => normalise({ ...d, type: d.type ?? "interests" }));
}

// Suggest interests based on an existing list — useful for expanding seed
// audiences out of a single keyword.

export async function suggestSimilarInterests(
  interestNames: string[],
  opts: { token?: string; limit?: number } = {}
): Promise<MetaTargetingResult[]> {
  if (!interestNames.length) return [];
  const params = new URLSearchParams({
    type: "adinterestsuggestion",
    interest_list: JSON.stringify(interestNames.slice(0, 10)),
    access_token: getToken(opts.token),
    limit: String(opts.limit ?? 25),
  });
  const res = await fetch(`${META_API}/search?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Meta interest suggestion failed: ${await res.text()}`);
  const json = (await res.json()) as { data?: SearchEntity[] };
  return (json.data ?? []).map((d) => normalise({ ...d, type: d.type ?? "interests" }));
}

// Geolocation lookup — used to build a geo_locations spec for delivery
// estimates ("London" → key "2643743", country_code "GB").

export interface MetaGeoResult {
  key: string;
  name: string;
  type: string;        // city, region, country, zip, ...
  countryCode?: string;
  countryName?: string;
  region?: string;
  supportsCity?: boolean;
}

export async function searchGeolocations(
  query: string,
  opts: { token?: string; types?: string[]; limit?: number } = {}
): Promise<MetaGeoResult[]> {
  const params = new URLSearchParams({
    type: "adgeolocation",
    q: query,
    access_token: getToken(opts.token),
    limit: String(opts.limit ?? 15),
  });
  if (opts.types?.length) params.set("location_types", JSON.stringify(opts.types));

  const res = await fetch(`${META_API}/search?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Meta geolocation search failed: ${await res.text()}`);
  const json = (await res.json()) as {
    data?: {
      key: string;
      name: string;
      type: string;
      country_code?: string;
      country_name?: string;
      region?: string;
      supports_city?: boolean;
    }[];
  };
  return (json.data ?? []).map((d) => ({
    key: d.key,
    name: d.name,
    type: d.type,
    countryCode: d.country_code,
    countryName: d.country_name,
    region: d.region,
    supportsCity: d.supports_city,
  }));
}

// Delivery estimate — gives audience reach for a candidate targeting spec.
// Requires an ad account.

export async function getDeliveryEstimate(
  accountId: string,
  spec: MetaTargetingSpec,
  opts: {
    token?: string;
    optimization_goal?: string;          // default REACH
  } = {}
): Promise<MetaDeliveryEstimate> {
  const params = new URLSearchParams({
    access_token: getToken(opts.token),
    targeting_spec: JSON.stringify(spec),
    optimization_goal: opts.optimization_goal ?? "REACH",
  });

  const res = await fetch(
    `${META_API}/act_${accountId}/delivery_estimate?${params}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Meta delivery_estimate failed: ${await res.text()}`);
  const json = (await res.json()) as {
    data?: {
      estimate_dau_lower_bound?: number;
      estimate_dau_upper_bound?: number;
      estimate_mau_lower_bound?: number;
      estimate_mau_upper_bound?: number;
      // Newer alias used by some API versions:
      daily_outcomes_curve?: unknown;
      users_lower_bound?: number;
      users_upper_bound?: number;
    }[];
  };
  const row = json.data?.[0] ?? {};
  return {
    estimatedDauLower: row.estimate_dau_lower_bound ?? 0,
    estimatedDauUpper: row.estimate_dau_upper_bound ?? 0,
    estimatedMauLower: row.estimate_mau_lower_bound ?? row.users_lower_bound ?? 0,
    estimatedMauUpper: row.estimate_mau_upper_bound ?? row.users_upper_bound ?? 0,
  };
}

// Convenience: run several targeting-search queries in parallel and merge,
// de-duplicating by id. Great for AI-generated query plans.

export async function searchTargetingMany(
  queries: string[],
  opts: { token?: string; perQueryLimit?: number } = {}
): Promise<MetaTargetingResult[]> {
  const unique = Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean)));
  const settled = await Promise.allSettled(
    unique.map((q) => searchTargetingCategories(q, { token: opts.token, limit: opts.perQueryLimit ?? 20 }))
  );

  const byId = new Map<string, MetaTargetingResult>();
  for (const s of settled) {
    if (s.status !== "fulfilled") continue;
    for (const r of s.value) {
      if (!byId.has(r.id)) byId.set(r.id, r);
    }
  }
  return [...byId.values()];
}

// ─── Exhaustive multi-endpoint search ──────────────────────────────────
// For each query we hit:
//   1. /search?type=adTargetingCategory                  (everything: interests, behaviours, demos, life events)
//   2. /search?type=adinterest                           (interests-only, often returns better audience-size data)
//   3. /search?type=adTargetingCategory&class=behaviors  (forces Meta to surface behaviour signals it might rank
//      lower in the unfiltered call)
//   4. /search?type=adTargetingCategory&class=demographics
// We also synthesise extra single-word variants for any multi-word query
// (e.g. "Middle Eastern cuisine" also fires "Middle", "Eastern", "cuisine"
// — Meta's search ranks single nouns differently and typically returns a
// broader spread).
// After the broad pass, we expand the catalogue once via /search?type=
// adinterestsuggestion using the top N highest-audience interests as
// seeds — Meta's own "people who like X also like Y" recommender.
//
// Returns the merged, deduped catalogue plus telemetry so the UI can show
// coverage stats (queries fired, results per endpoint, expansion seeds).

export interface ExhaustiveSearchResult {
  results: MetaTargetingResult[];
  telemetry: {
    queriesUsed: number;
    callsFired: number;
    byEndpoint: Record<string, number>;
    expansionSeeds: string[];
    expansionAdded: number;
  };
}

function expandToSingleWords(queries: string[]): string[] {
  const out = new Set<string>(queries);
  for (const q of queries) {
    const words = q.split(/\s+/).filter((w) => w.length >= 4);
    if (words.length <= 1) continue;
    // Add each word individually. Meta's search handles single nouns well
    // and often returns audiences the multi-word query missed.
    for (const w of words) out.add(w);
  }
  return [...out];
}

export async function exhaustiveTargetingSearch(
  queries: string[],
  opts: { token?: string; perQueryLimit?: number; expansionLimit?: number; concurrency?: number } = {}
): Promise<ExhaustiveSearchResult> {
  const trimmed = Array.from(new Set(queries.map((q) => q.trim()).filter(Boolean)));
  const expanded = expandToSingleWords(trimmed);
  const limit = opts.perQueryLimit ?? 18;
  const expansionLimit = opts.expansionLimit ?? 30;

  const byId = new Map<string, MetaTargetingResult>();
  const byEndpoint: Record<string, number> = {
    adTargetingCategory: 0,
    adinterest: 0,
    behaviors: 0,
    demographics: 0,
    interestSuggestion: 0,
  };

  // Build the call plan: 4 endpoints per unique query.
  type Call = () => Promise<{ endpoint: keyof typeof byEndpoint; results: MetaTargetingResult[] }>;
  const calls: Call[] = [];
  for (const q of expanded) {
    calls.push(async () => ({
      endpoint: "adTargetingCategory",
      results: await searchTargetingCategories(q, { token: opts.token, limit }).catch(() => []),
    }));
    calls.push(async () => ({
      endpoint: "adinterest",
      results: await searchInterests(q, { token: opts.token, limit: Math.min(limit, 15) }).catch(() => []),
    }));
    calls.push(async () => ({
      endpoint: "behaviors",
      results: await searchTargetingCategories(q, { token: opts.token, limit: 10, classes: ["behaviors"] }).catch(() => []),
    }));
    calls.push(async () => ({
      endpoint: "demographics",
      results: await searchTargetingCategories(q, { token: opts.token, limit: 8, classes: ["demographics", "life_events", "family_statuses"] }).catch(() => []),
    }));
  }

  // Run with a concurrency cap to be polite to the Meta API.
  const concurrency = opts.concurrency ?? 8;
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= calls.length) return;
      try {
        const { endpoint, results } = await calls[i]();
        byEndpoint[endpoint] += results.length;
        for (const r of results) if (!byId.has(r.id)) byId.set(r.id, r);
      } catch {
        // ignore individual failures
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, calls.length) }, worker));

  // Expansion pass: take the top interests we already have and ask Meta's
  // recommender for more like them. Skip if we have nothing yet.
  const topInterests = [...byId.values()]
    .filter((r) => /interest/i.test(r.type ?? ""))
    .sort((a, b) => ((b.audienceSizeUpper ?? 0) - (a.audienceSizeUpper ?? 0)))
    .slice(0, 8);

  let expansionAdded = 0;
  const expansionSeeds = topInterests.map((r) => r.name);
  if (topInterests.length > 0) {
    try {
      const similar = await suggestSimilarInterests(
        topInterests.map((r) => r.name),
        { token: opts.token, limit: expansionLimit }
      );
      byEndpoint.interestSuggestion += similar.length;
      for (const r of similar) {
        if (!byId.has(r.id)) {
          byId.set(r.id, r);
          expansionAdded += 1;
        }
      }
    } catch {
      // best-effort
    }
  }

  return {
    results: [...byId.values()],
    telemetry: {
      queriesUsed: expanded.length,
      callsFired: calls.length + (topInterests.length > 0 ? 1 : 0),
      byEndpoint,
      expansionSeeds,
      expansionAdded,
    },
  };
}

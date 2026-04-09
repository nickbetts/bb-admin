/**
 * Seasonality context helpers for AI prompts.
 *
 * Returns a short, structured description of the current time-of-year — including
 * season, upcoming retail/marketing events, and quarter context — so every AI
 * endpoint can anchor its analysis and recommendations in calendar reality.
 */

interface SeasonalityContext {
  /** Current calendar quarter, e.g. "Q2 (April–June)" */
  quarter: string;
  /** Season name, e.g. "Spring" */
  season: string;
  /** UK/global retail events active or approaching within ~6 weeks */
  upcomingEvents: string[];
  /** Free-text paragraph suitable for injecting into an AI prompt */
  promptText: string;
}

const MONTHLY_EVENTS: Record<number, string[]> = {
  1:  ["Post-Christmas sale period", "New Year campaigns", "January blues (consumer spending dip)", "Q1 budget planning"],
  2:  ["Valentine's Day (14 Feb)", "Half-term holiday", "Spring product launches beginning"],
  3:  ["Mother's Day (UK — 4th Sunday)", "St Patrick's Day (17 Mar)", "Spring equinox", "end of financial year (31 Mar — UK businesses)", "Easter approaching"],
  4:  ["Easter weekend (variable)", "Earth Day (22 Apr)", "Spring bank holiday", "new financial year"],
  5:  ["May bank holidays", "Mental Health Awareness Week", "Eurovision (media noise)", "early summer campaigns"],
  6:  ["Summer solstice (21 Jun)", "Father's Day (3rd Sunday UK)", "end of Q2", "mid-year reviews"],
  7:  ["Summer holidays begin", "Amazon Prime Day (mid-Jul)", "school-summer spending peak"],
  8:  ["Peak summer / holiday season", "Back-to-school campaigns (late Aug)", "Summer Bank Holiday (UK)"],
  9:  ["Back-to-school peak", "Autumn equinox", "end of summer sales", "Q3 close / Q4 planning"],
  10: ["Black Friday build-up begins", "Halloween (31 Oct)", "Breast Cancer Awareness Month", "pre-Christmas campaigns"],
  11: ["Black Friday (last Fri)", "Cyber Monday", "Singles Day (11 Nov)", "Christmas shopping peak begins"],
  12: ["Christmas peak", "Boxing Day sales (26 Dec)", "New Year countdown", "end of financial year approach"],
};

const QUARTER_LABELS: Record<number, string> = {
  1: "Q1 (January–March)",
  2: "Q2 (April–June)",
  3: "Q3 (July–September)",
  4: "Q4 (October–December)",
};

const SEASON_NAMES: Record<number, string> = {
  12: "Winter", 1: "Winter", 2: "Winter",
  3: "Spring", 4: "Spring", 5: "Spring",
  6: "Summer", 7: "Summer", 8: "Summer",
  9: "Autumn", 10: "Autumn", 11: "Autumn",
};

/**
 * Returns structured seasonality context for the given date (defaults to now).
 * The `promptText` field is ready to inject verbatim into an AI system or user prompt.
 */
export function getSeasonalityContext(date: Date = new Date()): SeasonalityContext {
  const month = date.getMonth() + 1; // 1-12
  const quarter = Math.ceil(month / 3);
  const season = SEASON_NAMES[month] ?? "Unknown";
  const quarterLabel = QUARTER_LABELS[quarter] ?? `Q${quarter}`;

  // Collect events for current month + next month (look ahead ~6 weeks)
  const nextMonth = month === 12 ? 1 : month + 1;
  const currentEvents = MONTHLY_EVENTS[month] ?? [];
  const nextEvents = MONTHLY_EVENTS[nextMonth] ?? [];

  const upcomingEvents = [...new Set([...currentEvents, ...nextEvents])];

  const monthName = date.toLocaleString("en-GB", { month: "long" });
  const promptText = [
    `SEASONALITY CONTEXT: ${monthName} — ${season}, ${quarterLabel}.`,
    upcomingEvents.length > 0
      ? `Upcoming / active marketing events: ${upcomingEvents.join("; ")}.`
      : "",
    "Factor this calendar context into your analysis — e.g. expected seasonal demand shifts, budget pacing for upcoming peaks, creative fatigue risk ahead of major retail events, and whether current performance reflects seasonal norms or genuine under/over-performance.",
  ]
    .filter(Boolean)
    .join(" ");

  return { quarter: quarterLabel, season, upcomingEvents, promptText };
}

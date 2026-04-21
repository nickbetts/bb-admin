/**
 * Unified Action Engine — scoring.
 *
 * Pure functions that turn raw signals (anomalies, alert rules, etc.) into
 * a numeric score so the action queue can rank "what to do this week" across
 * all 15 channels in a single, comparable list.
 *
 * Score = severity × recency × confidence
 *
 *  - severity: 0..1 derived from the upstream `severity` enum + magnitude
 *  - recency:  0..1 (1 = brand new, decays over the period)
 *  - confidence: 0..1 (1 = signal has strong supporting data, 0.5 = thin)
 *
 * Final score is in [0, 1]. Multiply by 100 for display.
 *
 * No AI here — keep this deterministic and cheap. AI happens later in the
 * queue, only on the top-N items, to generate recommendation text.
 */

export type SeverityLabel = "low" | "medium" | "high" | "critical";

export interface ScoreInputs {
  /** Severity label from upstream (anomaly severity, signal severity, etc.). */
  severity: SeverityLabel;
  /** Absolute magnitude of the change, expressed as a fraction (0.25 = 25%). */
  changeMagnitude?: number;
  /** When the underlying signal was created. */
  detectedAt: Date;
  /** End of the analysis window — for recency normalisation. */
  windowEnd?: Date;
  /** Length of the analysis window in days (for recency normalisation). */
  windowDays?: number;
  /** Optional confidence override in 0..1; when omitted, inferred from inputs. */
  confidence?: number;
}

const SEVERITY_BASE: Record<SeverityLabel, number> = {
  critical: 1.0,
  high: 0.8,
  medium: 0.55,
  low: 0.3,
};

/**
 * Combines severity label with magnitude. A "high" anomaly with a 60% change
 * scores higher than a "high" anomaly with a 22% change.
 */
export function severityScore(label: SeverityLabel, magnitude?: number): number {
  const base = SEVERITY_BASE[label] ?? 0.5;
  if (magnitude == null || !Number.isFinite(magnitude)) return base;
  // Magnitude bonus: cap at 0.2 so severity ranking still dominates.
  const bonus = Math.min(0.2, Math.abs(magnitude) * 0.2);
  return Math.min(1, base + bonus);
}

/**
 * Linear decay from 1 (today) to 0.4 (windowDays old). Older signals still
 * matter — we never zero them — but newer signals win ties.
 */
export function recencyScore(detectedAt: Date, windowEnd: Date, windowDays: number): number {
  const ageDays = Math.max(0, (windowEnd.getTime() - detectedAt.getTime()) / 86_400_000);
  const ratio = Math.min(1, ageDays / Math.max(1, windowDays));
  return 1 - ratio * 0.6;
}

export function priorityScore(inputs: ScoreInputs): number {
  const sev = severityScore(inputs.severity, inputs.changeMagnitude);
  const windowEnd = inputs.windowEnd ?? new Date();
  const windowDays = inputs.windowDays ?? 30;
  const rec = recencyScore(inputs.detectedAt, windowEnd, windowDays);
  const conf = inputs.confidence ?? 0.8;
  return Number((sev * rec * conf).toFixed(4));
}

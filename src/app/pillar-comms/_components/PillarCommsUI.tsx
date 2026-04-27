"use client";

/**
 * Pillar Comms UI primitives.
 * Re-exports shared atoms from PillarUI (intelligence module) and adds
 * comms-specific components: ChannelChip, MessageBubble, SentimentBadge,
 * AIDraftCard, ConversationRow, CallRow, Waveform, TranscriptLine,
 * EmotionDot, UrgencyMeter.
 */

import React from "react";
import { Mail, MessageSquare, Phone, MessagesSquare, Stamp, Sparkles } from "lucide-react";

// Re-export all shared visual atoms from the insights module so comms pages
// can import everything from a single file.
export {
  PageHeader,
  MockupBanner,
  Stat,
  Section,
  BarChart,
  Donut,
  Spark,
  Progress,
  ScoreRing,
  AIInsight,
  FunnelChart,
  StatusBadge,
  Avatar,
  Tag,
  KeyValue,
  Tabs,
  Timeline,
  EmptyState,
  LineChart,
  Heatmap,
  Funnel,
  TopBar,
} from "../../pillar-insights/_components/PillarUI";

export type Channel = "email" | "sms" | "whatsapp" | "voice" | "direct-mail";

const CHANNEL_META: Record<Channel, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  email: { label: "Email", color: "#6366f1", bg: "rgb(99 102 241 / 0.12)", icon: <Mail className="h-3 w-3" /> },
  sms: { label: "SMS", color: "#10b981", bg: "rgb(16 185 129 / 0.12)", icon: <MessageSquare className="h-3 w-3" /> },
  whatsapp: { label: "WhatsApp", color: "#22c55e", bg: "rgb(34 197 94 / 0.14)", icon: <MessagesSquare className="h-3 w-3" /> },
  voice: { label: "Voice", color: "#f59e0b", bg: "rgb(245 158 11 / 0.14)", icon: <Phone className="h-3 w-3" /> },
  "direct-mail": { label: "Direct Mail", color: "#a855f7", bg: "rgb(168 85 247 / 0.14)", icon: <Stamp className="h-3 w-3" /> },
};

export function ChannelChip({ channel, size = "sm" }: { channel: Channel; size?: "sm" | "md" }) {
  const meta = CHANNEL_META[channel];
  const padding = size === "md" ? "4px 10px" : "2px 8px";
  const fontSize = size === "md" ? 12 : 11;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding,
        borderRadius: 99,
        background: meta.bg,
        color: meta.color,
        fontSize,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}

export type Sentiment = "positive" | "neutral" | "negative" | "mixed";

const SENTIMENT_META: Record<Sentiment, { label: string; color: string; emoji: string }> = {
  positive: { label: "Positive", color: "#10b981", emoji: "😊" },
  neutral: { label: "Neutral", color: "#94a3b8", emoji: "😐" },
  negative: { label: "Negative", color: "#ef4444", emoji: "😞" },
  mixed: { label: "Mixed", color: "#f59e0b", emoji: "😕" },
};

export function SentimentBadge({ sentiment, score }: { sentiment: Sentiment; score?: number }) {
  const meta = SENTIMENT_META[sentiment];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        borderRadius: 99,
        background: `${meta.color}15`,
        color: meta.color,
        fontSize: 11,
        fontWeight: 600,
        border: `1px solid ${meta.color}30`,
      }}
    >
      <span style={{ fontSize: 11 }}>{meta.emoji}</span>
      {meta.label}
      {score !== undefined && <span style={{ opacity: 0.8, fontVariantNumeric: "tabular-nums" }}>· {score}</span>}
    </span>
  );
}

export function EmotionDot({ emotion, size = 10 }: { emotion: "joy" | "gratitude" | "anger" | "sadness" | "anticipation" | "trust" | "fear"; size?: number }) {
  const palette: Record<string, string> = {
    joy: "#fbbf24",
    gratitude: "#10b981",
    anger: "#ef4444",
    sadness: "#3b82f6",
    anticipation: "#a855f7",
    trust: "#14b8a6",
    fear: "#6b7280",
  };
  return (
    <span
      title={emotion}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: palette[emotion],
        boxShadow: `0 0 0 2px ${palette[emotion]}22`,
      }}
    />
  );
}

export function UrgencyMeter({ value }: { value: number }) {
  const color = value >= 75 ? "#ef4444" : value >= 50 ? "#f59e0b" : value >= 25 ? "#3b82f6" : "#94a3b8";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 36,
          height: 4,
          background: "var(--border-subtle)",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${value}%`, height: "100%", background: color }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

export function MessageBubble({
  side = "in",
  channel,
  body,
  meta,
  sentiment,
}: {
  side?: "in" | "out";
  channel: Channel;
  body: string;
  meta?: string;
  sentiment?: Sentiment;
}) {
  const isOut = side === "out";
  const ch = CHANNEL_META[channel];
  return (
    <div style={{ display: "flex", justifyContent: isOut ? "flex-end" : "flex-start" }}>
      <div style={{ maxWidth: "78%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
            flexDirection: isOut ? "row-reverse" : "row",
          }}
        >
          <ChannelChip channel={channel} />
          {sentiment && !isOut && <SentimentBadge sentiment={sentiment} />}
        </div>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            background: isOut ? `linear-gradient(135deg, ${ch.color}, #6366f1)` : "rgb(255 255 255 / 0.85)",
            color: isOut ? "white" : "var(--text)",
            border: isOut ? "none" : "1px solid var(--border-subtle)",
            fontSize: 13,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
          }}
        >
          {body}
        </div>
        {meta && (
          <div
            style={{
              fontSize: 10,
              color: "var(--text-3)",
              marginTop: 4,
              textAlign: isOut ? "right" : "left",
            }}
          >
            {meta}
          </div>
        )}
      </div>
    </div>
  );
}

export function AIDraftCard({
  tone,
  body,
  empathyScore,
  predictedReplyRate,
}: {
  tone: string;
  body: string;
  empathyScore: number;
  predictedReplyRate: number;
}) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: "var(--r-lg)",
        border: "1px solid rgb(139 92 246 / 0.25)",
        background: "linear-gradient(135deg, rgb(139 92 246 / 0.06), rgb(244 63 94 / 0.04))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: "linear-gradient(135deg, #8b5cf6, #f43f5e)",
              color: "white",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            AI
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{tone}</span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
          <span style={{ color: "#10b981" }}>
            <strong>{empathyScore}</strong> empathy
          </span>
          <span style={{ color: "#6366f1" }}>
            <strong>{predictedReplyRate}%</strong> reply
          </span>
        </div>
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--text-2)",
          lineHeight: 1.55,
          background: "rgb(255 255 255 / 0.7)",
          padding: 12,
          borderRadius: 8,
          border: "1px solid var(--border-subtle)",
          whiteSpace: "pre-wrap",
        }}
      >
        {body}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button className="btn btn-primary btn-sm" style={{ background: "linear-gradient(135deg, #8b5cf6, #f43f5e)" }}>
          <Sparkles className="h-3 w-3" /> Send
        </button>
        <button className="btn btn-secondary btn-sm">Edit</button>
        <button className="btn btn-ghost btn-sm">Regenerate</button>
      </div>
    </div>
  );
}

export function ConversationRow({
  name,
  preview,
  channel,
  sentiment,
  urgency,
  unread,
  meta,
  language,
  href,
}: {
  name: string;
  preview: string;
  channel: Channel;
  sentiment: Sentiment;
  urgency: number;
  unread?: boolean;
  meta?: string;
  language?: string;
  href?: string;
}) {
  const Wrap: React.ElementType = href ? "a" : "div";
  return (
    <Wrap
      href={href}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 14,
        alignItems: "center",
        padding: "12px 16px",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--r-lg)",
        background: unread ? "rgb(139 92 246 / 0.04)" : "rgb(255 255 255 / 0.6)",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
    >
      <ChannelChip channel={channel} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{name}</span>
          {unread && (
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6" }} />
          )}
          {language && language !== "en" && (
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "var(--border-subtle)", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>
              {language}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-2)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.5,
          }}
        >
          {preview}
        </div>
        {meta && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{meta}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <SentimentBadge sentiment={sentiment} />
        <UrgencyMeter value={urgency} />
      </div>
    </Wrap>
  );
}

export function CallRow({
  name,
  number,
  direction,
  duration,
  sentiment,
  summary,
  agent,
  recordedAt,
  href,
}: {
  name: string;
  number: string;
  direction: "in" | "out";
  duration: string;
  sentiment: Sentiment;
  summary: string;
  agent: string;
  recordedAt: string;
  href?: string;
}) {
  const Wrap: React.ElementType = href ? "a" : "div";
  return (
    <Wrap
      href={href}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 14,
        alignItems: "center",
        padding: "12px 16px",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--r-lg)",
        background: "rgb(255 255 255 / 0.6)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: direction === "in" ? "rgb(16 185 129 / 0.14)" : "rgb(99 102 241 / 0.14)",
          color: direction === "in" ? "#10b981" : "#6366f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Phone className="h-4 w-4" />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{name}</span>
          <span style={{ fontSize: 11, color: "var(--text-3)" }}>{number}</span>
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "var(--border-subtle)", color: "var(--text-3)", fontWeight: 600, textTransform: "uppercase" }}>
            {direction === "in" ? "Inbound" : "Outbound"}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {summary}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>
          {agent} · {recordedAt}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{duration}</div>
        <div style={{ fontSize: 10, color: "var(--text-3)" }}>duration</div>
      </div>
      <SentimentBadge sentiment={sentiment} />
    </Wrap>
  );
}

export function Waveform({
  bars,
  height = 60,
  width = 600,
  sentimentHeat,
}: {
  bars: number[];
  height?: number;
  width?: number;
  sentimentHeat?: number[]; // -1..1 per bar
}) {
  const barWidth = width / bars.length;
  const max = Math.max(...bars, 1);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {bars.map((b, i) => {
        const h = (b / max) * (height - 6);
        const heat = sentimentHeat?.[i] ?? 0;
        const color = heat > 0.3 ? "#10b981" : heat < -0.3 ? "#ef4444" : "#94a3b8";
        return (
          <rect
            key={i}
            x={i * barWidth + 0.5}
            y={(height - h) / 2}
            width={Math.max(1, barWidth - 1)}
            height={h}
            fill={color}
            rx={1}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}

export function TranscriptLine({
  speaker,
  role,
  time,
  text,
  highlight,
}: {
  speaker: string;
  role: "agent" | "supporter";
  time: string;
  text: string;
  highlight?: boolean;
}) {
  const colour = role === "agent" ? "#6366f1" : "#f43f5e";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "60px 1fr",
        gap: 12,
        padding: "8px 12px",
        borderLeft: `3px solid ${colour}`,
        background: highlight ? `${colour}08` : "transparent",
        borderRadius: 4,
        marginBottom: 4,
      }}
    >
      <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "monospace" }}>{time}</div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: colour, marginBottom: 2 }}>{speaker}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>{text}</div>
      </div>
    </div>
  );
}

export function ChannelMixDot({ channel }: { channel: Channel }) {
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: CHANNEL_META[channel].color, display: "inline-block" }} />;
}

export const CHANNEL_COLORS = {
  email: "#6366f1",
  sms: "#10b981",
  whatsapp: "#22c55e",
  voice: "#f59e0b",
  "direct-mail": "#a855f7",
} as const;

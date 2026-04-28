"use client";
import { MockupBanner, Section, Stat, Tag, AIInsight, CallRow, Spark, PageStack } from "../../_components/PillarCommsUI";
import { CALLS } from "../../_data/messagesData";

export default function Page() {
  return (
    <div className="page animate-in">
      <MockupBanner />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#f59e0b", marginBottom: 8 }}>Channel · Voice & VOIP</div>
        <h1 className="page-title gradient-text" style={{ fontSize: 30, margin: 0, background: "linear-gradient(135deg, #f59e0b, #f43f5e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Voice & VOIP
        </h1>
        <p className="page-desc" style={{ margin: "8px 0 0", maxWidth: 720 }}>Inbound + outbound calls, AI transcription, sentiment-scored recordings and real-time agent coaching.</p>
      </div>

      <PageStack>
      <div className="stat-card-grid">
        <Stat label="Calls · 30d" value="4,218" hint="2,890 inbound · 1,328 outbound" />
        <Stat label="Avg duration" value="6:14" hint="-32s vs prior month" />
        <Stat label="First-call resolution" value="78%" hint="+8 pts" />
        <Stat label="Avg empathy score" value="82 / 100" hint="AI-rated · agents" />
        <Stat label="Voicemails translated" value="218" hint="EN + AR + UR + BN + SO" />
        <Stat label="Compliance score" value="98 / 100" hint="GDPR, recording disclosure" />
      </div>

      <AIInsight title="AI summaries on every call" tone="amber">
        Every recording is transcribed, diarised and summarised in 60 seconds. Action items, amounts mentioned, campaigns referenced and complaints are auto-extracted into the donor record.
      </AIInsight>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}>
        <Section title="Recent calls" subtitle="Click to open transcript + waveform + AI actions">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {CALLS.map((c) => (
              <CallRow
                key={c.id}
                href={`/pillar-comms/voice/${c.id}`}
                name={c.name}
                number={c.number}
                direction={c.direction as "in" | "out"}
                duration={c.duration}
                sentiment={c.sentiment}
                summary={c.summary}
                agent={c.agent}
                recordedAt={c.recordedAt}
              />
            ))}
          </div>
        </Section>

        <Section title="Call sentiment heatmap · last 14 days" subtitle="Composite empathy + outcome score">
          <Spark data={[72, 74, 76, 78, 80, 82, 81, 82, 84, 82, 82, 84, 85, 82]} color="#f59e0b" height={120} width={600} />
        </Section>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Tag label="Mockup" /></div>
      </PageStack>
    </div>
  );
}

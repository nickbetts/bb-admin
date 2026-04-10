"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Mail, Phone, Users, FileText, Loader2 } from "lucide-react";
import Link from "next/link";

interface Communication {
  id: string;
  clientId: string;
  userId: string;
  type: string;
  direction: string;
  subject: string;
  body: string | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
}

interface CommWithClient extends Communication {
  clientName?: string;
  clientSlug?: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  email: <Mail style={{ width: 14, height: 14 }} />,
  call: <Phone style={{ width: 14, height: 14 }} />,
  meeting: <Users style={{ width: 14, height: 14 }} />,
  note: <FileText style={{ width: 14, height: 14 }} />,
  report_share: <FileText style={{ width: 14, height: 14 }} />,
  proposal_share: <FileText style={{ width: 14, height: 14 }} />,
};

const typeColors: Record<string, string> = {
  email: "#6366f1",
  call: "#22c55e",
  meeting: "#f59e0b",
  note: "#9ca3af",
  report_share: "#3b82f6",
  proposal_share: "#ec4899",
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function CommunicationsPage() {
  const [comms, setComms] = useState<CommWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [clients, setClients] = useState<Client[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const clientsRes = await fetch("/api/clients");
      if (clientsRes.ok) {
        const data = await clientsRes.json() as { clients: Client[] };
        setClients(data.clients ?? []);

        const allComms: CommWithClient[] = [];
        await Promise.all(
          (data.clients ?? []).map(async (client) => {
            const res = await fetch(`/api/clients/${client.id}/communications`);
            if (res.ok) {
              const clientComms = await res.json() as Communication[];
              allComms.push(...clientComms.map((c) => ({ ...c, clientName: client.name, clientSlug: client.slug })));
            }
          })
        );
        allComms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setComms(allComms);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = comms.filter((c) => {
    if (filterClient !== "all" && c.clientId !== filterClient) return false;
    if (filterType !== "all" && c.type !== filterType) return false;
    return true;
  });

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Communications</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Timeline of all client communications</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <select className="form-input" style={{ width: "auto", fontSize: 13 }} value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
          <option value="all">All Clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-input" style={{ width: "auto", fontSize: 13 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {["email", "call", "meeting", "note", "report_share", "proposal_share"].map((t) => (
            <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-3)", fontSize: 14 }}>
          <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite", margin: "0 auto 8px", display: "block" }} />
          Loading communications…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: "center" }}>
          <MessageSquare style={{ width: 40, height: 40, color: "var(--text-4)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>No communications yet</p>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>
            Log communications from individual client dashboards.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {filtered.map((comm, i) => (
            <div key={comm.id} style={{ display: "flex", gap: 16, paddingBottom: 20 }}>
              {/* Timeline line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${typeColors[comm.type] ?? "#6366f1"}20`, color: typeColors[comm.type] ?? "#6366f1", flexShrink: 0,
                }}>
                  {typeIcons[comm.type] ?? <MessageSquare style={{ width: 14, height: 14 }} />}
                </div>
                {i < filtered.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: "var(--border)", marginTop: 4 }} />
                )}
              </div>
              <div className="card" style={{ flex: 1, padding: 14, marginBottom: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{comm.subject}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      <Link href={`/clients/${comm.clientSlug}`} style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>
                        {comm.clientName}
                      </Link>
                      <span style={{ fontSize: 11, color: "var(--text-4)", background: "var(--bg-2)", padding: "1px 6px", borderRadius: 99 }}>
                        {comm.type.replace("_", " ")}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-4)", background: "var(--bg-2)", padding: "1px 6px", borderRadius: 99 }}>
                        {comm.direction}
                      </span>
                    </div>
                    {comm.body && (
                      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8, lineHeight: 1.6 }}>{comm.body}</p>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-4)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {timeAgo(comm.sentAt ?? comm.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, CheckCircle2, Loader2, Send, Sparkles } from "lucide-react";
import { TrackingClientNav } from "@/components/tracking/TrackingClientNav";
import { LoadingSpinner } from "@/components/ui/index";
import { Button } from "@/components/ui/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";
import { Textarea } from "@/components/ui/shadcn/textarea";

interface TrackingSetupResponse {
  id: string;
  gtmAccountId: string | null;
  gtmContainerApiId: string | null;
  gtmContainerId: string | null;
  gtmWorkspaceId: string | null;
  ga4PropertyId: string | null;
  metaPixelId: string | null;
  googleAdsConversionId: string | null;
  status: string;
  audits?: Array<{ auditType: string; status: string; auditedAt: string }>;
}

interface TrackingEventSummary {
  id: string;
  eventName: string;
  eventCategory: string | null;
  status: "DRAFT" | "ACTIVE";
}

interface ProposedAction {
  id: string;
  type:
    | "update_setup"
    | "create_event"
    | "activate_event"
    | "delete_event"
    | "create_gtm_event_tag"
    | "publish_workspace";
  title: string;
  description: string;
  reasoning: string;
  params: Record<string, unknown>;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposedActions?: ProposedAction[];
}

interface TrackingChatPageProps {
  params: Promise<{ clientId: string }>;
}

const DEFAULT_QUICK_PROMPTS = [
  "Audit my full tracking setup",
  "What events should I be tracking for ecommerce?",
  "Create a standard purchase event",
  "Help me fix my GTM configuration",
];

function makeId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

export default function TrackingChatPage({ params }: TrackingChatPageProps) {
  const { clientId } = use(params);
  const [setup, setSetup] = useState<TrackingSetupResponse | null>(null);
  const [events, setEvents] = useState<TrackingEventSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const recentAudit = useMemo(() => setup?.audits?.[0] ?? null, [setup]);
  const quickPrompts = useMemo(() => {
    if (!setup) return DEFAULT_QUICK_PROMPTS;

    const prompts: string[] = [];
    const gtmConnected =
      !!setup.gtmAccountId && !!setup.gtmContainerApiId && !!setup.gtmWorkspaceId;

    if (!gtmConnected) {
      prompts.push("Help me fix my GTM configuration");
    }

    if (!setup.ga4PropertyId) {
      prompts.push("Help me configure GA4 tracking");
    }

    if (events.length === 0) {
      prompts.push("Create a standard purchase event");
    }

    prompts.push("Audit my full tracking setup");
    prompts.push("What events should I be tracking for ecommerce?");

    return [...new Set(prompts)].slice(0, 4);
  }, [events.length, setup]);

  const loadContext = async () => {
    const setupResponse = await fetch(`/api/tracking/setup?clientId=${clientId}`);
    if (!setupResponse.ok) {
      throw new Error("Failed to load tracking setup");
    }

    const setupData = (await setupResponse.json()) as TrackingSetupResponse;
    setSetup(setupData);

    const eventsResponse = await fetch(`/api/tracking/events?setupId=${setupData.id}`);
    if (eventsResponse.ok) {
      setEvents((await eventsResponse.json()) as TrackingEventSummary[]);
    } else {
      setEvents([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadContext();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [clientId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = { id: makeId(), role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/tracking/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          message: trimmed,
          conversationHistory: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const payload = (await response.json()) as {
        reply?: string;
        proposedActions?: ProposedAction[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to get tracking guidance");
      }

      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: payload.reply || "I have a suggested tracking plan ready.",
          proposedActions: payload.proposedActions ?? [],
        },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: err instanceof Error ? err.message : "Unknown error",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const approveAction = async (action: ProposedAction) => {
    setExecutingActionId(action.id);
    setError(null);

    try {
      const response = await fetch("/api/tracking/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, action }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to execute approved tracking action");
      }

      const actionNote = payload.message || "Action executed";
      setActionNotes((current) => ({
        ...current,
        [action.id]: actionNote,
      }));
      await loadContext();
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: `Applied: ${actionNote}`,
        },
      ]);
    } catch (err) {
      setActionNotes((current) => ({
        ...current,
        [action.id]: err instanceof Error ? err.message : "Unknown error",
      }));
    } finally {
      setExecutingActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_35%),linear-gradient(180deg,var(--bg),var(--bg))] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/tools/tracking-guru/${clientId}`}
            className="transition-opacity hover:opacity-70"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-(--accent-text)">
              <Sparkles className="h-4 w-4" />
              Tracking Guru AI
            </div>
            <h1 className="text-3xl font-bold text-(--text)">Conversational tracking changes</h1>
            <p className="text-sm text-(--text-3)">
              Ask the assistant to audit, plan, and prepare tracking updates. Nothing is written
              until you approve it.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-(--border) bg-(--surface) px-2.5 py-1 text-(--text-2)">
                Setup: {setup?.status ?? "Not configured"}
              </span>
              <span className="rounded-full border border-(--border) bg-(--surface) px-2.5 py-1 text-(--text-2)">
                Latest audit:{" "}
                {recentAudit ? `${recentAudit.auditType} · ${recentAudit.status}` : "No audit yet"}
              </span>
            </div>
          </div>
        </div>

        <TrackingClientNav clientId={clientId} />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
          <Card className="border-(--border) bg-(--surface) shadow-sm">
            <CardHeader>
              <CardTitle>Chat</CardTitle>
              <CardDescription>
                Use plain language. The assistant will propose changes as approval cards when a
                write is needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="secondary"
                    onClick={() => void sendMessage(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>

              <div className="space-y-4 rounded-xl border border-(--border) bg-(--bg) p-4">
                {messages.length === 0 ? (
                  <div className="space-y-2 text-sm text-(--text-3)">
                    <div className="flex items-center gap-2 text-(--text)">
                      <Bot className="h-4 w-4" />
                      Ready when you are
                    </div>
                    <p>
                      Try asking for an audit, a new event plan, or a GTM change. If the assistant
                      suggests a write action, you will see an approval card.
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="space-y-3">
                      <div
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                            message.role === "user"
                              ? "bg-(--accent) text-white"
                              : "border border-(--border) bg-white text-(--text)"
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>

                      {message.proposedActions && message.proposedActions.length > 0 && (
                        <div className="space-y-3 pl-4">
                          {message.proposedActions.map((action) => (
                            <div
                              key={action.id}
                              className="rounded-xl border border-sky-200 bg-sky-50 p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm font-semibold text-sky-900">
                                    <CheckCircle2 className="h-4 w-4" />
                                    {action.title}
                                  </div>
                                  <p className="text-sm text-sky-900/80">{action.description}</p>
                                </div>
                                <Button
                                  type="button"
                                  onClick={() => void approveAction(action)}
                                  disabled={
                                    executingActionId === action.id || !!actionNotes[action.id]
                                  }
                                >
                                  {executingActionId === action.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Applying
                                    </>
                                  ) : actionNotes[action.id] ? (
                                    "Applied"
                                  ) : (
                                    "Approve"
                                  )}
                                </Button>
                              </div>
                              <div className="mt-3 space-y-2 text-xs text-sky-900/80">
                                <p>{action.reasoning}</p>
                                {actionNotes[action.id] && (
                                  <div className="rounded-md border border-sky-200 bg-white px-3 py-2 text-sky-950">
                                    {actionNotes[action.id]}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="space-y-3">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask Tracking Guru to audit, plan, or change tracking..."
                  className="min-h-28"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                />
                <div className="flex justify-end">
                  <Button type="button" onClick={() => void sendMessage(input)} disabled={sending}>
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Thinking
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send message
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-(--border) bg-(--surface) shadow-sm">
              <CardHeader>
                <CardTitle>Current setup</CardTitle>
                <CardDescription>What the assistant is working from right now.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-(--text-2)">
                <div className="rounded-lg border border-(--border) bg-(--bg) p-3">
                  <div className="text-xs tracking-wide text-(--text-3) uppercase">
                    Tracking status
                  </div>
                  <div className="mt-1 font-medium text-(--text)">
                    {setup?.status ?? "Not configured"}
                  </div>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-lg border border-(--border) bg-(--bg) p-3">
                    <div className="text-xs tracking-wide text-(--text-3) uppercase">GTM</div>
                    <div className="mt-1">Account: {setup?.gtmAccountId ?? "Not set"}</div>
                    <div>
                      Container: {setup?.gtmContainerId ?? setup?.gtmContainerApiId ?? "Not set"}
                    </div>
                    <div>Workspace: {setup?.gtmWorkspaceId ?? "Not set"}</div>
                  </div>
                  <div className="rounded-lg border border-(--border) bg-(--bg) p-3">
                    <div className="text-xs tracking-wide text-(--text-3) uppercase">GA4</div>
                    <div className="mt-1">Property: {setup?.ga4PropertyId ?? "Not set"}</div>
                  </div>
                </div>
                <div className="rounded-lg border border-(--border) bg-(--bg) p-3">
                  <div className="text-xs tracking-wide text-(--text-3) uppercase">Events</div>
                  <div className="mt-1 font-medium text-(--text)">
                    {events.length} saved event{events.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="rounded-lg border border-(--border) bg-(--bg) p-3">
                  <div className="text-xs tracking-wide text-(--text-3) uppercase">
                    Latest audit
                  </div>
                  <div className="mt-1 font-medium text-(--text)">
                    {recentAudit
                      ? `${recentAudit.auditType} · ${recentAudit.status}`
                      : "No audit history yet"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-(--border) bg-(--surface) shadow-sm">
              <CardHeader>
                <CardTitle>Recent events</CardTitle>
                <CardDescription>These are the active inputs for chat context.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {events.length === 0 ? (
                  <div className="text-sm text-(--text-3)">No events yet.</div>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-(--border) bg-(--bg) p-3 text-sm"
                    >
                      <div className="font-medium text-(--text)">{event.eventName}</div>
                      <div className="text-(--text-3)">
                        {event.eventCategory || "Uncategorised"}
                      </div>
                      <div className="text-xs text-(--text-3)">{event.status}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

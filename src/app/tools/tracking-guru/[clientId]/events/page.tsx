"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { TrackingClientNav } from "@/components/tracking/TrackingClientNav";
import { Card } from "@/components/ui/shadcn/card";
import { LoadingSpinner } from "@/components/ui/index";
import { ArrowLeft, Plus, Trash2, Check } from "lucide-react";

interface TrackingEvent {
  id: string;
  eventName: string;
  eventCategory?: string;
  status: "DRAFT" | "ACTIVE";
  createdAt: string;
}

interface EventsPageProps {
  params: Promise<{ clientId: string }>;
}

export default function EventsPage({ params }: EventsPageProps) {
  const { clientId } = use(params);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    eventName: "",
    eventCategory: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [setupId, setSetupId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSetup = async () => {
      try {
        const response = await fetch(`/api/tracking/setup?clientId=${clientId}`);
        if (!response.ok) throw new Error("No tracking setup found");
        const data = await response.json();
        setSetupId(data.id);

        // Fetch events for this setup
        const eventsResponse = await fetch(`/api/tracking/events?setupId=${data.id}`);
        if (!eventsResponse.ok) throw new Error("Failed to fetch events");
        const eventsData = await eventsResponse.json();
        setEvents(eventsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchSetup();
  }, [clientId]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupId) return;

    try {
      const response = await fetch("/api/tracking/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingSetupId: setupId,
          eventName: formData.eventName,
          eventCategory: formData.eventCategory || null,
          eventParameters: [],
          firingRules: [{ action: "PAGEVIEW" }],
          status: "DRAFT",
        }),
      });

      if (!response.ok) throw new Error("Failed to create event");
      const newEvent = await response.json();
      setEvents([newEvent, ...events]);
      setFormData({ eventName: "", eventCategory: "" });
      setShowForm(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/tracking/events?eventId=${eventId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete event");
      setEvents(events.filter((e) => e.id !== eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleActivateEvent = async (eventId: string) => {
    try {
      const response = await fetch("/api/tracking/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          status: "ACTIVE",
        }),
      });

      if (!response.ok) throw new Error("Failed to activate event");
      const updated = await response.json();
      setEvents(events.map((e) => (e.id === eventId ? updated : e)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/tools/tracking-guru/${clientId}`}
            className="transition-opacity hover:opacity-70"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold">Custom Events</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
        >
          <Plus className="h-4 w-4" />
          New Event
        </button>
      </div>

      <TrackingClientNav clientId={clientId} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {showForm && (
        <Card className="border-blue-200 bg-blue-50 p-6">
          <form onSubmit={handleAddEvent} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Event Name (GA4 format: lowercase_with_underscores)
              </label>
              <input
                type="text"
                value={formData.eventName}
                onChange={(e) =>
                  setFormData({ ...formData, eventName: e.target.value.toLowerCase() })
                }
                placeholder="e.g., purchase_completed"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Category (optional)
              </label>
              <input
                type="text"
                value={formData.eventCategory}
                onChange={(e) => setFormData({ ...formData, eventCategory: e.target.value })}
                placeholder="e.g., ecommerce"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-green-500 px-4 py-2 text-white transition-colors hover:bg-green-600"
              >
                Create Event
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {events.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            No custom events yet. Create one to get started!
          </Card>
        ) : (
          events.map((event) => (
            <Card
              key={event.id}
              className={`border-2 p-4 transition-colors ${
                event.status === "ACTIVE"
                  ? "border-green-200 bg-green-50"
                  : "border-yellow-200 bg-yellow-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{event.eventName}</h3>
                  {event.eventCategory && (
                    <p className="text-sm text-gray-600">Category: {event.eventCategory}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Created: {new Date(event.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      event.status === "ACTIVE"
                        ? "bg-green-200 text-green-800"
                        : "bg-yellow-200 text-yellow-800"
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                {event.status === "DRAFT" && (
                  <button
                    onClick={() => handleActivateEvent(event.id)}
                    className="flex items-center gap-1 rounded bg-green-500 px-3 py-1 text-sm text-white transition-colors hover:bg-green-600"
                  >
                    <Check className="h-3 w-3" />
                    Activate
                  </button>
                )}
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="flex items-center gap-1 rounded bg-red-500 px-3 py-1 text-sm text-white transition-colors hover:bg-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/shadcn/card";
import { LoadingSpinner } from "@/components/ui/index";
import { BarChart3, Zap, Bug, History } from "lucide-react";

interface TrackingSetup {
  id: string;
  clientId: string;
  gtmContainerId?: string;
  ga4PropertyId?: string;
  metaPixelId?: string;
  googleAdsConversionId?: string;
  status: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  trackingSetups?: TrackingSetup[];
}

export default function TrackingGuruPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/tracking/clients");
        if (!response.ok) throw new Error("Failed to fetch clients");
        const data = await response.json();
        setClients(data);
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Tracking Guru</h1>
        <p className="mt-2 text-neutral-600">
          Audit and configure GTM, GA4, Meta, and Google Ads tracking for your clients.
        </p>
      </div>

      {clients.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-neutral-600">
            No clients available. Create a client first to set up tracking.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => {
            const setup = client.trackingSetups?.[0];
            return (
              <Card
                key={client.id}
                className="cursor-pointer p-6 transition-shadow hover:shadow-md"
                onClick={() => router.push(`/tools/tracking-guru/${client.id}`)}
              >
                <h2 className="mb-4 text-lg font-semibold">{client.name}</h2>

                <div className="mb-6 space-y-3">
                  <div className="text-sm">
                    <span className="text-neutral-600">GTM:</span>{" "}
                    <span className="font-mono text-sm">
                      {setup?.gtmContainerId || "Not configured"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-neutral-600">GA4:</span>{" "}
                    <span className="font-mono text-sm">
                      {setup?.ga4PropertyId || "Not configured"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-neutral-600">Meta Pixel:</span>{" "}
                    <span className="font-mono text-sm">
                      {setup?.metaPixelId || "Not configured"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-neutral-600">Google Ads:</span>{" "}
                    <span className="font-mono text-sm">
                      {setup?.googleAdsConversionId || "Not configured"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/tools/tracking-guru/${client.id}/audit`}
                    className="flex items-center gap-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <BarChart3 className="h-3 w-3" />
                    Audit
                  </Link>
                  <Link
                    href={`/tools/tracking-guru/${client.id}/events`}
                    className="flex items-center gap-2 rounded bg-purple-50 px-3 py-2 text-xs text-purple-700 transition-colors hover:bg-purple-100"
                  >
                    <Zap className="h-3 w-3" />
                    Events
                  </Link>
                  <Link
                    href={`/tools/tracking-guru/${client.id}/test`}
                    className="flex items-center gap-2 rounded bg-green-50 px-3 py-2 text-xs text-green-700 transition-colors hover:bg-green-100"
                  >
                    <Bug className="h-3 w-3" />
                    Test
                  </Link>
                  <Link
                    href={`/tools/tracking-guru/${client.id}/history`}
                    className="flex items-center gap-2 rounded bg-neutral-50 px-3 py-2 text-xs text-neutral-700 transition-colors hover:bg-neutral-100"
                  >
                    <History className="h-3 w-3" />
                    History
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

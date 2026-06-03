"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { TrackingClientNav } from "@/components/tracking/TrackingClientNav";
import { Card } from "@/components/ui/shadcn/card";
import { LoadingSpinner } from "@/components/ui/index";
import { ArrowLeft, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface AuditRecord {
  id: string;
  auditType: string;
  status: "PASS" | "WARNING" | "FAIL";
  createdAt: string;
  findings: Record<string, unknown>;
}

interface HistoryPageProps {
  params: Promise<{ clientId: string }>;
}

export default function HistoryPage({ params }: HistoryPageProps) {
  const { clientId } = use(params);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const setupResponse = await fetch(`/api/tracking/setup?clientId=${clientId}`);
        if (!setupResponse.ok) throw new Error("No tracking setup found");
        const setup = await setupResponse.json();

        // Get audits from setup response
        if (setup.audits) {
          setAudits(setup.audits);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [clientId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PASS":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "WARNING":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "FAIL":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PASS":
        return "bg-green-50 border-green-200";
      case "WARNING":
        return "bg-yellow-50 border-yellow-200";
      case "FAIL":
        return "bg-red-50 border-red-200";
      default:
        return "";
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
      <div className="flex items-center gap-4">
        <Link
          href={`/tools/tracking-guru/${clientId}`}
          className="transition-opacity hover:opacity-70"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold">Audit History</h1>
      </div>

      <TrackingClientNav clientId={clientId} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <div className="space-y-3">
        {audits.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            No audit history yet. Run your first audit to get started!
          </Card>
        ) : (
          audits.map((audit) => (
            <Card
              key={audit.id}
              className={`border-2 p-6 transition-colors ${getStatusColor(audit.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex flex-1 items-center gap-3">
                  {getStatusIcon(audit.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold">{audit.auditType}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(audit.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                    audit.status === "PASS"
                      ? "bg-green-200 text-green-800"
                      : audit.status === "WARNING"
                        ? "bg-yellow-200 text-yellow-800"
                        : "bg-red-200 text-red-800"
                  }`}
                >
                  {audit.status}
                </span>
              </div>

              {audit.findings && typeof audit.findings === "object" && (
                <div className="mt-4 max-h-40 overflow-y-auto rounded border border-gray-200 bg-white p-3 font-mono text-xs text-gray-600">
                  <pre>{JSON.stringify(audit.findings, null, 2)}</pre>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

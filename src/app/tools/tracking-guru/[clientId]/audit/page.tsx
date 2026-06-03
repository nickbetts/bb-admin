"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/shadcn/card";
import { LoadingSpinner } from "@/components/ui/index";
import { ArrowLeft, RefreshCw, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface ValidationFinding {
  status: "PASS" | "WARNING" | "FAIL";
  message: string;
  recommendation?: string;
}

interface ValidationResult {
  platform: string;
  status: "PASS" | "WARNING" | "FAIL";
  findings: ValidationFinding[];
}

interface AuditResult {
  clientId: string;
  clientName: string;
  auditType: string;
  overallStatus: "PASS" | "WARNING" | "FAIL";
  results: ValidationResult[];
  auditedAt: string;
}

interface AuditPageProps {
  params: Promise<{ clientId: string }>;
}

export default function AuditPage({ params }: AuditPageProps) {
  const { clientId } = use(params);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const response = await fetch(`/api/tracking/audit?clientId=${clientId}`);
        if (!response.ok) throw new Error("Failed to fetch audit");
        const data = await response.json();
        setAudit(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchAudit();
  }, [clientId]);

  const handleRunAudit = async () => {
    setAuditing(true);
    try {
      const response = await fetch("/api/tracking/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, platforms: "gtm,ga4,meta,google-ads" }),
      });
      if (!response.ok) throw new Error("Failed to run audit");
      const data = await response.json();
      setAudit(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAuditing(false);
    }
  };

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/tools/tracking-guru" className="transition-opacity hover:opacity-70">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{audit?.clientName}</h1>
            <p className="text-sm text-gray-500">Tracking Audit Dashboard</p>
          </div>
        </div>
        <button
          onClick={handleRunAudit}
          disabled={auditing}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${auditing ? "animate-spin" : ""}`} />
          {auditing ? "Auditing..." : "Run Audit"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {audit && (
        <>
          <div className="grid gap-4">
            {audit.results.map((result) => (
              <Card
                key={result.platform}
                className={`border-2 p-6 transition-colors ${getStatusColor(result.status)}`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h3 className="font-semibold">{result.platform}</h3>
                      <p className="text-sm text-gray-600">
                        {result.status === "PASS"
                          ? "All checks passed"
                          : result.status === "WARNING"
                            ? "Minor issues detected"
                            : "Configuration issues found"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      result.status === "PASS"
                        ? "bg-green-200 text-green-800"
                        : result.status === "WARNING"
                          ? "bg-yellow-200 text-yellow-800"
                          : "bg-red-200 text-red-800"
                    }`}
                  >
                    {result.status}
                  </span>
                </div>

                <div className="space-y-3">
                  {result.findings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="space-y-2 rounded border border-gray-200 bg-white p-3"
                    >
                      <div className="flex items-start gap-2">
                        {getStatusIcon(finding.status)}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{finding.message}</p>
                          {finding.recommendation && (
                            <p className="mt-1 text-xs text-gray-600">
                              💡 {finding.recommendation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <div className="text-xs text-gray-500">
            Last audited: {new Date(audit.auditedAt).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}

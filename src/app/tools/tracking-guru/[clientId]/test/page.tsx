"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/shadcn/card";
import { ArrowLeft, Send, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface TestResult {
  status: "SUCCESS" | "ERROR" | "SKIPPED" | "WARNING";
  message: string;
  eventData?: Record<string, unknown>;
  trackingPixel?: string;
}

interface TestResponse {
  clientId: string;
  clientName: string;
  eventName: string;
  results: {
    ga4?: TestResult;
    meta?: TestResult;
    googleAds?: TestResult;
  };
  testedAt: string;
}

interface TestPageProps {
  params: Promise<{ clientId: string }>;
}

export default function TestPage({ params }: TestPageProps) {
  const { clientId } = use(params);
  const [eventName, setEventName] = useState("test_event");
  const [eventData, setEventData] = useState("{}");
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendTestEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);

    try {
      let parsedEventData;
      try {
        parsedEventData = JSON.parse(eventData);
      } catch {
        parsedEventData = {};
      }

      const response = await fetch("/api/tracking/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          eventName,
          eventData: parsedEventData,
          platforms: ["ga4", "meta", "google-ads"],
        }),
      });

      if (!response.ok) throw new Error("Failed to send test event");
      const data = await response.json();
      setTestResults(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "WARNING":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "ERROR":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "SKIPPED":
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "bg-green-50 border-green-200";
      case "WARNING":
        return "bg-yellow-50 border-yellow-200";
      case "ERROR":
        return "bg-red-50 border-red-200";
      case "SKIPPED":
        return "bg-gray-50 border-gray-200";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/tools/tracking-guru" className="transition-opacity hover:opacity-70">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold">Test Tracking</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSendTestEvent} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Event Name</label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="test_event"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Event Data (JSON)
            </label>
            <textarea
              value={eventData}
              onChange={(e) => setEventData(e.target.value)}
              placeholder='{"value": 99.99, "currency": "USD"}'
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional: JSON object with custom event parameters
            </p>
          </div>

          <button
            type="submit"
            disabled={testing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {testing ? "Sending..." : "Send Test Event"}
          </button>
        </form>
      </Card>

      {testResults && (
        <>
          <h2 className="text-xl font-semibold">Test Results</h2>

          <div className="grid gap-4">
            {Object.entries(testResults.results).map(([platform, result]) => (
              <Card
                key={platform}
                className={`border-2 p-6 transition-colors ${getStatusColor(result.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h3 className="font-semibold capitalize">{platform}</h3>
                      <p className="text-sm text-gray-600">{result.message}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      result.status === "SUCCESS"
                        ? "bg-green-200 text-green-800"
                        : result.status === "WARNING"
                          ? "bg-yellow-200 text-yellow-800"
                          : result.status === "ERROR"
                            ? "bg-red-200 text-red-800"
                            : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {result.status}
                  </span>
                </div>

                {result.trackingPixel && (
                  <div className="mt-4 rounded border border-gray-200 bg-white p-3">
                    <p className="mb-2 text-xs font-medium text-gray-700">Tracking Pixel:</p>
                    <code className="text-xs break-all text-gray-600">{result.trackingPixel}</code>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="text-xs text-gray-500">
            Tested at: {new Date(testResults.testedAt).toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}

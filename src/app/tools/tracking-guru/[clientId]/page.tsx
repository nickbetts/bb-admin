"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, RefreshCw, Rocket, Wrench } from "lucide-react";
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
import { Input } from "@/components/ui/shadcn/input";
import { Select } from "@/components/ui/shadcn/select";

interface TrackingSetupResponse {
  id: string;
  clientId: string;
  gtmAccountId: string | null;
  gtmContainerApiId: string | null;
  gtmContainerId: string | null;
  gtmWorkspaceId: string | null;
  ga4PropertyId: string | null;
  metaPixelId: string | null;
  googleAdsConversionId: string | null;
  status: string;
}

interface GTMConnectionSummary {
  id: string;
  email: string;
  label: string;
}

interface GTMAccountSummary {
  accountId: string;
  name: string;
}

interface GTMContainerSummary {
  accountId: string;
  containerId: string;
  name: string;
  publicId?: string;
}

interface GTMWorkspaceSummary {
  workspaceId: string;
  name: string;
  description?: string;
}

interface GTMTargetsResponse {
  connected: boolean;
  connection: GTMConnectionSummary | null;
  selected: {
    accountId: string | null;
    containerApiId: string | null;
    containerId: string | null;
    workspaceId: string | null;
  };
  accounts: GTMAccountSummary[];
  containers: GTMContainerSummary[];
  workspaces: GTMWorkspaceSummary[];
  previewUrl: string | null;
}

interface TrackingOverviewPageProps {
  params: Promise<{ clientId: string }>;
}

interface GTMDeployResponse {
  success: boolean;
  action: "create_event_tag" | "publish_workspace";
  trigger?: { triggerId: string; name: string; type: string };
  tag?: { tagId: string; name: string; type: string };
  publishResult?: {
    containerVersionId?: string;
    containerVersionName?: string;
  } | null;
}

export default function TrackingOverviewPage({ params }: TrackingOverviewPageProps) {
  const { clientId } = use(params);
  const searchParams = useSearchParams();
  const [setup, setSetup] = useState<TrackingSetupResponse | null>(null);
  const [targets, setTargets] = useState<GTMTargetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deployingTag, setDeployingTag] = useState(false);
  const [publishingWorkspace, setPublishingWorkspace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deployMessage, setDeployMessage] = useState<string | null>(null);
  const [eventTagName, setEventTagName] = useState("purchase");
  const [formData, setFormData] = useState({
    gtmAccountId: "",
    gtmContainerApiId: "",
    gtmContainerId: "",
    gtmWorkspaceId: "1",
    ga4PropertyId: "",
    metaPixelId: "",
    googleAdsConversionId: "",
  });

  const selectedContainer = useMemo(
    () =>
      targets?.containers.find(
        (container) => container.containerId === formData.gtmContainerApiId,
      ) ?? null,
    [formData.gtmContainerApiId, targets?.containers],
  );

  const canDeployToGTM =
    !!setup &&
    !!formData.gtmAccountId &&
    !!formData.gtmContainerApiId &&
    !!formData.gtmWorkspaceId &&
    !!formData.ga4PropertyId;

  const fetchSetup = async () => {
    const response = await fetch(`/api/tracking/setup?clientId=${clientId}`);
    if (response.status === 404) {
      setSetup(null);
      return null;
    }
    if (!response.ok) {
      throw new Error("Failed to fetch tracking setup");
    }

    const data = (await response.json()) as TrackingSetupResponse;
    setSetup(data);
    return data;
  };

  const fetchTargets = async (next?: {
    accountId?: string;
    containerApiId?: string;
    workspaceId?: string;
  }) => {
    const query = new URLSearchParams({ clientId });
    if (next?.accountId) query.set("accountId", next.accountId);
    if (next?.containerApiId) query.set("containerApiId", next.containerApiId);
    if (next?.workspaceId) query.set("workspaceId", next.workspaceId);

    const response = await fetch(`/api/tracking/gtm/targets?${query.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to fetch GTM targets");
    }

    const data = (await response.json()) as GTMTargetsResponse;
    setTargets(data);
    return data;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [setupData, targetData] = await Promise.all([fetchSetup(), fetchTargets()]);
        setFormData({
          gtmAccountId: setupData?.gtmAccountId ?? targetData.selected.accountId ?? "",
          gtmContainerApiId:
            setupData?.gtmContainerApiId ?? targetData.selected.containerApiId ?? "",
          gtmContainerId: setupData?.gtmContainerId ?? targetData.selected.containerId ?? "",
          gtmWorkspaceId: setupData?.gtmWorkspaceId ?? targetData.selected.workspaceId ?? "1",
          ga4PropertyId: setupData?.ga4PropertyId ?? "",
          metaPixelId: setupData?.metaPixelId ?? "",
          googleAdsConversionId: setupData?.googleAdsConversionId ?? "",
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [clientId]);

  useEffect(() => {
    if (searchParams.get("gtmConnected") === "1") {
      setSuccess(
        "Google account connected for GTM. Choose the GTM account, container, and workspace for this client.",
      );
    }
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(`Google GTM connection failed: ${oauthError}`);
    }
  }, [searchParams]);

  const handleAccountChange = async (accountId: string) => {
    setFormData((current) => ({
      ...current,
      gtmAccountId: accountId,
      gtmContainerApiId: "",
      gtmContainerId: "",
      gtmWorkspaceId: "1",
    }));

    try {
      const targetData = await fetchTargets({ accountId });
      setTargets(targetData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleContainerChange = async (containerApiId: string) => {
    const container =
      targets?.containers.find((item) => item.containerId === containerApiId) ?? null;
    setFormData((current) => ({
      ...current,
      gtmContainerApiId: containerApiId,
      gtmContainerId: container?.publicId ?? "",
      gtmWorkspaceId: "1",
    }));

    try {
      const targetData = await fetchTargets({
        accountId: formData.gtmAccountId,
        containerApiId,
      });
      setTargets(targetData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...(setup ? { setupId: setup.id } : { clientId }),
        gtmAccountId: formData.gtmAccountId || null,
        gtmContainerApiId: formData.gtmContainerApiId || null,
        gtmContainerId: formData.gtmContainerId || null,
        gtmWorkspaceId: formData.gtmWorkspaceId || "1",
        ga4PropertyId: formData.ga4PropertyId || null,
        metaPixelId: formData.metaPixelId || null,
        googleAdsConversionId: formData.googleAdsConversionId || null,
      };

      const response = await fetch("/api/tracking/setup", {
        method: setup ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save tracking setup");
      }

      const saved = (await response.json()) as TrackingSetupResponse;
      setSetup(saved);
      setSuccess(
        "Tracking setup saved. All audit and test actions will now use this GTM target by default.",
      );
      await fetchTargets({
        accountId: saved.gtmAccountId ?? undefined,
        containerApiId: saved.gtmContainerApiId ?? undefined,
        workspaceId: saved.gtmWorkspaceId ?? undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEventTag = async () => {
    if (!eventTagName.trim()) {
      setError("Event name is required before creating a GTM event tag");
      return;
    }

    setDeployingTag(true);
    setError(null);
    setDeployMessage(null);

    try {
      const response = await fetch("/api/tracking/gtm/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_event_tag",
          clientId,
          eventName: eventTagName.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to create GTM event tag");
      }

      const payload = (await response.json()) as GTMDeployResponse;
      setDeployMessage(
        `Created trigger ${payload.trigger?.name ?? ""} and tag ${payload.tag?.name ?? ""} in the selected GTM workspace.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeployingTag(false);
    }
  };

  const handlePublishWorkspace = async () => {
    setPublishingWorkspace(true);
    setError(null);
    setDeployMessage(null);

    try {
      const response = await fetch("/api/tracking/gtm/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish_workspace",
          clientId,
          versionName: `Tracking Guru publish ${new Date().toISOString()}`,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to publish GTM workspace");
      }

      const payload = (await response.json()) as GTMDeployResponse;
      setDeployMessage(
        `Published GTM workspace successfully${payload.publishResult?.containerVersionId ? ` (version ${payload.publishResult.containerVersionId})` : ""}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPublishingWorkspace(false);
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
        <Link href="/tools/tracking-guru" className="transition-opacity hover:opacity-70">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Tracking Setup</h1>
          <p className="text-sm text-(--text-3)">
            Choose one GTM target for this client, then keep every audit, test, and future AI action
            scoped to it.
          </p>
        </div>
      </div>

      <TrackingClientNav clientId={clientId} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>GTM Target</CardTitle>
              <CardDescription>
                Connect a Google account, then choose the exact GTM account, container, and
                workspace for this client.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {targets?.connected ? (
                <div className="rounded-lg border border-(--border) bg-(--bg) p-4 text-sm text-(--text-2)">
                  Connected as{" "}
                  <span className="font-medium text-(--text)">{targets.connection?.email}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3 rounded-lg border border-dashed border-(--border) bg-(--bg) p-4">
                  <p className="text-sm text-(--text-2)">
                    No Google account is connected for GTM yet.
                  </p>
                  <div>
                    <Button asChild>
                      <Link
                        href={`/api/auth/google-gtm?returnTo=${encodeURIComponent(`/tools/tracking-guru/${clientId}`)}`}
                      >
                        Connect Google for GTM
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-(--text)">GTM account</label>
                  <Select
                    value={formData.gtmAccountId}
                    onChange={(event) => handleAccountChange(event.target.value)}
                    disabled={!targets?.connected}
                  >
                    <option value="">Select an account</option>
                    {targets?.accounts.map((account) => (
                      <option key={account.accountId} value={account.accountId}>
                        {account.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-(--text)">Workspace</label>
                  <Select
                    value={formData.gtmWorkspaceId}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, gtmWorkspaceId: event.target.value }))
                    }
                    disabled={!targets?.connected || !formData.gtmContainerApiId}
                  >
                    <option value="">Select a workspace</option>
                    {targets?.workspaces.map((workspace) => (
                      <option key={workspace.workspaceId} value={workspace.workspaceId}>
                        {workspace.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-(--text)">Container</label>
                  <Select
                    value={formData.gtmContainerApiId}
                    onChange={(event) => handleContainerChange(event.target.value)}
                    disabled={!targets?.connected || !formData.gtmAccountId}
                  >
                    <option value="">Select a container</option>
                    {targets?.containers.map((container) => (
                      <option key={container.containerId} value={container.containerId}>
                        {container.name}
                        {container.publicId ? ` (${container.publicId})` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tracking IDs</CardTitle>
              <CardDescription>
                Keep the core platform IDs in one place. The GTM selection above is what scopes
                future audit and deployment actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-(--text)">GA4 property ID</label>
                <Input
                  value={formData.ga4PropertyId}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, ga4PropertyId: event.target.value }))
                  }
                  placeholder="G-XXXXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-(--text)">Meta pixel ID</label>
                <Input
                  value={formData.metaPixelId}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, metaPixelId: event.target.value }))
                  }
                  placeholder="123456789012345"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-(--text)">
                  Google Ads conversion ID
                </label>
                <Input
                  value={formData.googleAdsConversionId}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      googleAdsConversionId: event.target.value,
                    }))
                  }
                  placeholder="AW-123456789"
                />
              </div>

              <div className="flex justify-end md:col-span-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save tracking setup"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current scope</CardTitle>
              <CardDescription>
                This is the GTM target every future workflow will use by default for this client.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-(--text-2)">
              <div>
                <p className="font-medium text-(--text)">Account</p>
                <p>
                  {targets?.accounts.find((account) => account.accountId === formData.gtmAccountId)
                    ?.name ?? "Not selected"}
                </p>
              </div>
              <div>
                <p className="font-medium text-(--text)">Container</p>
                <p>{selectedContainer?.name ?? "Not selected"}</p>
                <p className="text-xs text-(--text-3)">
                  {formData.gtmContainerId || "No GTM public ID saved yet"}
                </p>
              </div>
              <div>
                <p className="font-medium text-(--text)">Workspace</p>
                <p>
                  {targets?.workspaces.find(
                    (workspace) => workspace.workspaceId === formData.gtmWorkspaceId,
                  )?.name ??
                    formData.gtmWorkspaceId ??
                    "Not selected"}
                </p>
              </div>
              <div className="pt-2">
                <Button variant="outline" asChild disabled={!targets?.previewUrl}>
                  <Link href={targets?.previewUrl ?? "#"} target="_blank" rel="noreferrer">
                    Open GTM Preview
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next step</CardTitle>
              <CardDescription>
                Once the GTM target is saved, every audit and test screen can stay focused instead
                of asking you to browse accounts repeatedly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" asChild>
                  <Link href={`/tools/tracking-guru/${clientId}/audit`}>Run audit</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link
                    href={`/api/auth/google-gtm?returnTo=${encodeURIComponent(`/tools/tracking-guru/${clientId}`)}`}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reconnect GTM
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GTM Deploy Actions</CardTitle>
              <CardDescription>
                Create GTM event tags and publish the selected workspace without leaving Tracking
                Guru.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-(--text)">Custom event name</label>
                <Input
                  value={eventTagName}
                  onChange={(event) => setEventTagName(event.target.value.toLowerCase())}
                  placeholder="purchase"
                  disabled={!canDeployToGTM || deployingTag || publishingWorkspace}
                />
                <p className="text-xs text-(--text-3)">
                  This will create both a custom event trigger and a GA4 event tag.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={handleCreateEventTag}
                  disabled={!canDeployToGTM || deployingTag || publishingWorkspace}
                >
                  <Wrench className="h-4 w-4" />
                  {deployingTag ? "Creating tag..." : "Create Event Tag"}
                </Button>

                <Button
                  onClick={handlePublishWorkspace}
                  disabled={!canDeployToGTM || deployingTag || publishingWorkspace}
                >
                  <Rocket className="h-4 w-4" />
                  {publishingWorkspace ? "Publishing..." : "Publish Workspace"}
                </Button>
              </div>

              {!canDeployToGTM && (
                <p className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
                  Save a complete GTM target (account, container, workspace) and GA4 property ID to
                  enable deploy actions.
                </p>
              )}

              {deployMessage && (
                <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {deployMessage}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

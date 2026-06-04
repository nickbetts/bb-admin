"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
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

interface GA4Property {
  id: string;
  displayName: string;
  account: string;
}

interface MetaPixelOption {
  id: string;
  name: string;
  adAccountId: string;
  adAccountName: string;
}

interface GoogleAdsAccountOption {
  id: string;
  name: string;
  currencyCode: string;
  isManager: boolean;
}

interface GoogleAdsConversionActionOption {
  id: string;
  name: string;
  category: string;
  type: string;
  conversions: number;
  conversionsValue: number;
  costPerConversion: number;
}

interface TrackingWorkspaceState {
  gtmAccountId: string;
  gtmContainerId: string;
  gtmWorkspaceId: string;
  ga4PropertyId: string;
  metaPixelId: string;
  googleAdsCustomerId: string;
  googleAdsConversionId: string;
}

const STORAGE_KEY = "tracking-guru-workspace";

const DEFAULT_STATE: TrackingWorkspaceState = {
  gtmAccountId: "",
  gtmContainerId: "",
  gtmWorkspaceId: "",
  ga4PropertyId: "",
  metaPixelId: "",
  googleAdsCustomerId: "",
  googleAdsConversionId: "",
};

function formatConversionId(customerId: string, conversionActionId: string): string {
  return `AW-${customerId.replace(/-/g, "")}/${conversionActionId}`;
}

export function TrackingWorkspaceSelector() {
  const [state, setState] = useState<TrackingWorkspaceState>(DEFAULT_STATE);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [ga4Properties, setGa4Properties] = useState<GA4Property[]>([]);
  const [ga4Loading, setGa4Loading] = useState(true);

  const [metaPixels, setMetaPixels] = useState<MetaPixelOption[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [googleAdsAccounts, setGoogleAdsAccounts] = useState<GoogleAdsAccountOption[]>([]);
  const [googleAdsLoading, setGoogleAdsLoading] = useState(true);

  const [googleAdsActions, setGoogleAdsActions] = useState<GoogleAdsConversionActionOption[]>([]);
  const [googleAdsActionsLoading, setGoogleAdsActionsLoading] = useState(false);

  useEffect(() => {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<TrackingWorkspaceState>;
      setState((current) => ({ ...current, ...parsed }));
    } catch {
      // Ignore invalid cached payloads.
    }
  }, []);

  useEffect(() => {
    const loadGa4Properties = async () => {
      try {
        const response = await fetch("/api/ga4/properties");
        const payload = (await response.json()) as GA4Property[];
        if (response.ok && Array.isArray(payload)) {
          setGa4Properties(payload);
        }
      } finally {
        setGa4Loading(false);
      }
    };

    const loadMetaPixels = async () => {
      try {
        const response = await fetch("/api/meta/pixels");
        const payload = (await response.json()) as MetaPixelOption[];
        if (response.ok && Array.isArray(payload)) {
          setMetaPixels(payload);
        }
      } finally {
        setMetaLoading(false);
      }
    };

    const loadGoogleAdsAccounts = async () => {
      try {
        const response = await fetch("/api/google-ads/accounts");
        const payload = (await response.json()) as GoogleAdsAccountOption[];
        if (response.ok && Array.isArray(payload)) {
          const nonManagerAccounts = payload.filter((account) => !account.isManager);
          setGoogleAdsAccounts(nonManagerAccounts.length > 0 ? nonManagerAccounts : payload);
        }
      } finally {
        setGoogleAdsLoading(false);
      }
    };

    void Promise.all([loadGa4Properties(), loadMetaPixels(), loadGoogleAdsAccounts()]);
  }, []);

  useEffect(() => {
    const loadConversionActions = async () => {
      if (!state.googleAdsCustomerId) {
        setGoogleAdsActions([]);
        return;
      }

      setGoogleAdsActionsLoading(true);
      try {
        const response = await fetch(
          `/api/google-ads/conversion-actions?customerId=${encodeURIComponent(state.googleAdsCustomerId)}`,
        );
        const payload = (await response.json()) as GoogleAdsConversionActionOption[];
        if (response.ok && Array.isArray(payload)) {
          setGoogleAdsActions(payload);
        } else {
          setGoogleAdsActions([]);
        }
      } finally {
        setGoogleAdsActionsLoading(false);
      }
    };

    void loadConversionActions();
  }, [state.googleAdsCustomerId]);

  const completedCount = useMemo(() => {
    const values = [
      state.gtmAccountId,
      state.gtmContainerId,
      state.gtmWorkspaceId,
      state.ga4PropertyId,
      state.metaPixelId,
      state.googleAdsConversionId,
    ];
    return values.filter(Boolean).length;
  }, [state]);

  const handleSave = () => {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setSavedMessage("Tracking audit workspace saved.");
    globalThis.setTimeout(() => setSavedMessage(null), 2500);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Tracking IDs Workspace</CardTitle>
          <CardDescription>
            Select the IDs you are auditing. This context is not tied to any client and stays in
            your browser for repeat audits.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-(--text)">GTM account ID</label>
            <Input
              value={state.gtmAccountId}
              onChange={(event) =>
                setState((current) => ({ ...current, gtmAccountId: event.target.value }))
              }
              placeholder="123456789"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-(--text)">GTM container ID</label>
            <Input
              value={state.gtmContainerId}
              onChange={(event) =>
                setState((current) => ({ ...current, gtmContainerId: event.target.value }))
              }
              placeholder="GTM-XXXXXXX"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-(--text)">GTM workspace ID</label>
            <Input
              value={state.gtmWorkspaceId}
              onChange={(event) =>
                setState((current) => ({ ...current, gtmWorkspaceId: event.target.value }))
              }
              placeholder="1"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-(--text)">GA4 property</label>
            {ga4Loading ? (
              <div className="flex items-center gap-2 rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text-3)">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading GA4 properties...
              </div>
            ) : ga4Properties.length > 0 ? (
              <Select
                value={state.ga4PropertyId}
                onChange={(event) =>
                  setState((current) => ({ ...current, ga4PropertyId: event.target.value }))
                }
              >
                <option value="">Select a GA4 property</option>
                {ga4Properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.displayName} ({property.account})
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={state.ga4PropertyId}
                onChange={(event) =>
                  setState((current) => ({ ...current, ga4PropertyId: event.target.value }))
                }
                placeholder="G-XXXXXXXXXX"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-(--text)">Meta pixel</label>
            {metaLoading ? (
              <div className="flex items-center gap-2 rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text-3)">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading Meta pixels...
              </div>
            ) : metaPixels.length > 0 ? (
              <Select
                value={state.metaPixelId}
                onChange={(event) =>
                  setState((current) => ({ ...current, metaPixelId: event.target.value }))
                }
              >
                <option value="">Select a Meta pixel</option>
                {metaPixels.map((pixel) => (
                  <option key={pixel.id} value={pixel.id}>
                    {pixel.name} ({pixel.adAccountName})
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                value={state.metaPixelId}
                onChange={(event) =>
                  setState((current) => ({ ...current, metaPixelId: event.target.value }))
                }
                placeholder="123456789012345"
              />
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-(--text)">Google Ads conversion</label>
            <div className="grid gap-2 md:grid-cols-2">
              {googleAdsLoading ? (
                <div className="flex items-center gap-2 rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text-3) md:col-span-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading Google Ads accounts...
                </div>
              ) : (
                <Select
                  value={state.googleAdsCustomerId}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      googleAdsCustomerId: event.target.value,
                      googleAdsConversionId: "",
                    }))
                  }
                >
                  <option value="">Select Google Ads account</option>
                  {googleAdsAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.id})
                    </option>
                  ))}
                </Select>
              )}

              {googleAdsActionsLoading ? (
                <div className="flex items-center gap-2 rounded-md border border-(--border) bg-(--surface) px-3 py-2 text-sm text-(--text-3)">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading conversion actions...
                </div>
              ) : googleAdsActions.length > 0 ? (
                <Select
                  value={state.googleAdsConversionId}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      googleAdsConversionId: event.target.value,
                    }))
                  }
                >
                  <option value="">Select conversion action</option>
                  {googleAdsActions.map((action) => {
                    const value = formatConversionId(state.googleAdsCustomerId, action.id);
                    return (
                      <option key={action.id} value={value}>
                        {action.name} ({action.conversions} conv)
                      </option>
                    );
                  })}
                </Select>
              ) : (
                <Input
                  value={state.googleAdsConversionId}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      googleAdsConversionId: event.target.value,
                    }))
                  }
                  placeholder="AW-123456789/987654321"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end md:col-span-2">
            <Button onClick={handleSave}>Save audit workspace</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace status</CardTitle>
          <CardDescription>Current IDs selected for auditing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-(--text-2)">
          <div className="rounded-lg border border-(--border) bg-(--bg) p-3">
            <div className="text-xs tracking-wide text-(--text-3) uppercase">Completion</div>
            <div className="mt-1 font-medium text-(--text)">
              {completedCount}/6 key IDs selected
            </div>
          </div>
          <div className="space-y-2 rounded-lg border border-(--border) bg-(--bg) p-3">
            <p>GA4: {state.ga4PropertyId || "Not set"}</p>
            <p>Meta: {state.metaPixelId || "Not set"}</p>
            <p>Google Ads: {state.googleAdsConversionId || "Not set"}</p>
            <p>GTM container: {state.gtmContainerId || "Not set"}</p>
          </div>
          {savedMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              {savedMessage}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

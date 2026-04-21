"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Save, PoundSterling, Package, Zap, RotateCcw } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ServiceTier {
  name: string;
  monthlyFee: string;
  hoursPerMonth: number;
  description: string;
  includes: string[];
}

interface AddOn {
  name: string;
  channels: string;  // e.g. "+£500"
  growth: string;    // e.g. "+£1000"
  elevate: string;   // e.g. "+£1500"
}

interface Package {
  name: string;
  subtitle: string;
  priceRange: string;
  description: string;
  includes: string[];
  quarterlyAccelerator: string[];
}

interface SingleService {
  name: string;
  monthlyFee: string;
  notes: string;
}

interface PricingStrategy {
  singleServices: SingleService[];
  focusPackages: ServiceTier[];
  focusAddOns: {
    seoFocus: AddOn[];
    paidFocus: AddOn[];
  };
  retainerPackages: Package[];
  otherServices: SingleService[];
  notes: string;
}

// ─── Default pricing (pre-populated from known structure) ─────────────────────

const DEFAULT_PRICING: PricingStrategy = {
  notes: "Email marketing is not sold as a standalone service — it is bolted on for an additional £250–£500/mo to an existing package.",
  singleServices: [
    { name: "SEO", monthlyFee: "£750", notes: "Single-channel retainer" },
    { name: "Google PPC", monthlyFee: "£750", notes: "Single-channel retainer" },
    { name: "Paid Social", monthlyFee: "£750", notes: "Single-channel retainer" },
    { name: "Content Creation", monthlyFee: "£750", notes: "Single-channel retainer" },
    { name: "Organic Social", monthlyFee: "£750", notes: "Single-channel retainer" },
  ],
  focusPackages: [
    {
      name: "SEO Focus",
      monthlyFee: "from £1,250",
      hoursPerMonth: 15,
      description: "Ideal for organisations focused purely on organic growth. We strengthen rankings, boost visibility, and build long-term authority while paid activity runs elsewhere.",
      includes: ["15 hrs/mo. resource", "SEO Optimisation", "Content Creation", "Reporting & Analytics"],
    },
    {
      name: "Paid Marketing Focus",
      monthlyFee: "from £1,000",
      hoursPerMonth: 10,
      description: "If your organic marketing is already covered, we'll take charge of paid performance to drive fast, measurable growth through focused campaigns and constant optimisation.",
      includes: ["10 hrs/mo. resource", "Paid Social & PPC", "Content Creation", "Reporting & Analytics"],
    },
  ],
  focusAddOns: {
    seoFocus: [
      { name: "Paid Social", channels: "+£500", growth: "+£1,000", elevate: "+£1,500" },
      { name: "Google PPC", channels: "+£750", growth: "+£1,500", elevate: "" },
    ],
    paidFocus: [
      { name: "SEO", channels: "+£1,000", growth: "", elevate: "+£1,500" },
      { name: "Organic Social", channels: "+£1,000", growth: "", elevate: "+£1,500" },
    ],
  },
  retainerPackages: [
    {
      name: "Growth Core",
      subtitle: "A structured, performance-led monthly growth model",
      priceRange: "£1,750 – £2,500/mo",
      description: "Built to generate demand, strengthen authority, and improve performance month after month.",
      includes: [
        "SEO — Long-term authority & search visibility",
        "Google PPC — Immediate demand capture",
        "Paid Social — Scalable audience growth",
        "Content — Conversion & brand engagement",
        "Dedicated account lead",
        "Monthly performance reporting",
      ],
      quarterlyAccelerator: [
        "Creative production hours (x3)",
        "Landing page builds",
        "Additional paid budget management",
        "Conversion rate optimisation sprint",
      ],
    },
    {
      name: "Growth Accelerator",
      subtitle: "Higher intensity, faster scaling, deeper testing",
      priceRange: "£3,000 – £4,000/mo",
      description: "Everything in Growth Core, with deeper strategic involvement and faster scaling.",
      includes: [
        "Monthly strategic growth clinics — 1:1",
        "Dedicated growth roadmap refinement",
        "Extended creative & landing page builds",
        "CRO testing & optimisation sprints",
        "AI / GPT search authority expansion",
        "Enhanced reporting & forecasting",
        "Dedicated account lead",
        "Guided monthly performance reporting",
      ],
      quarterlyAccelerator: [
        "Email Marketing",
        "Creative production hours",
        "Landing page builds",
        "AI search visibility expansion",
        "Additional paid budget management",
        "Conversion rate optimisation sprint",
      ],
    },
  ],
  otherServices: [
    { name: "Consultancy & Auditing", monthlyFee: "POA", notes: "Project-based pricing" },
    { name: "Email Marketing", monthlyFee: "+£250–£500", notes: "Add-on only — not sold standalone" },
    { name: "Training & Up-skilling", monthlyFee: "POA", notes: "Project-based pricing" },
  ],
};

// ─── Input helpers ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  border: "1px solid var(--border)", borderRadius: "var(--r)",
  fontSize: 13, color: "var(--text)", background: "var(--surface)",
  outline: "none", fontFamily: "inherit",
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [pricing, setPricing] = useState<PricingStrategy>(DEFAULT_PRICING);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json() as Record<string, string>;
        if (data.pricingStrategy) {
          setPricing(JSON.parse(data.pricingStrategy) as PricingStrategy);
        }
      }
    } catch { /* use default */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricingStrategy: JSON.stringify(pricing) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (await confirm({ title: "Reset to default pricing?", description: "This will overwrite your current pricing settings.", confirmLabel: "Reset", danger: true })) {
      setPricing(DEFAULT_PRICING);
    }
  }

  // ── Generic helpers ──────────────────────────────────────────────────────────
  function updateNotes(val: string) {
    setPricing(p => ({ ...p, notes: val }));
  }

  // ── Single Services ──────────────────────────────────────────────────────────
  function updateSingleService(idx: number, field: keyof SingleService, val: string) {
    setPricing(p => {
      const list = [...p.singleServices];
      list[idx] = { ...list[idx], [field]: val };
      return { ...p, singleServices: list };
    });
  }
  function addSingleService() {
    setPricing(p => ({ ...p, singleServices: [...p.singleServices, { name: "", monthlyFee: "£750", notes: "" }] }));
  }
  function removeSingleService(idx: number) {
    setPricing(p => ({ ...p, singleServices: p.singleServices.filter((_, i) => i !== idx) }));
  }

  // ── Focus Packages ───────────────────────────────────────────────────────────
  function updateFocusPackage(idx: number, field: keyof ServiceTier, val: string | number | string[]) {
    setPricing(p => {
      const list = [...p.focusPackages];
      list[idx] = { ...list[idx], [field]: val };
      return { ...p, focusPackages: list };
    });
  }
  function updateFocusInclude(pkgIdx: number, lineIdx: number, val: string) {
    const list = [...pricing.focusPackages[pkgIdx].includes];
    list[lineIdx] = val;
    updateFocusPackage(pkgIdx, "includes", list);
  }
  function addFocusInclude(pkgIdx: number) {
    const list = [...pricing.focusPackages[pkgIdx].includes, ""];
    updateFocusPackage(pkgIdx, "includes", list);
  }
  function removeFocusInclude(pkgIdx: number, lineIdx: number) {
    const list = pricing.focusPackages[pkgIdx].includes.filter((_, i) => i !== lineIdx);
    updateFocusPackage(pkgIdx, "includes", list);
  }

  // ── Focus Add-ons ────────────────────────────────────────────────────────────
  function updateAddOn(focus: "seoFocus" | "paidFocus", idx: number, field: keyof AddOn, val: string) {
    setPricing(p => {
      const list = [...p.focusAddOns[focus]];
      list[idx] = { ...list[idx], [field]: val };
      return { ...p, focusAddOns: { ...p.focusAddOns, [focus]: list } };
    });
  }
  function addAddOn(focus: "seoFocus" | "paidFocus") {
    setPricing(p => ({
      ...p,
      focusAddOns: { ...p.focusAddOns, [focus]: [...p.focusAddOns[focus], { name: "", channels: "", growth: "", elevate: "" }] },
    }));
  }
  function removeAddOn(focus: "seoFocus" | "paidFocus", idx: number) {
    setPricing(p => ({
      ...p,
      focusAddOns: { ...p.focusAddOns, [focus]: p.focusAddOns[focus].filter((_, i) => i !== idx) },
    }));
  }

  // ── Retainer Packages ────────────────────────────────────────────────────────
  function updateRetainer(idx: number, field: keyof Package, val: string | string[]) {
    setPricing(p => {
      const list = [...p.retainerPackages];
      list[idx] = { ...list[idx], [field]: val };
      return { ...p, retainerPackages: list };
    });
  }
  function updateRetainerInclude(pkgIdx: number, lineIdx: number, val: string) {
    const list = [...pricing.retainerPackages[pkgIdx].includes];
    list[lineIdx] = val;
    updateRetainer(pkgIdx, "includes", list);
  }
  function addRetainerInclude(pkgIdx: number) {
    updateRetainer(pkgIdx, "includes", [...pricing.retainerPackages[pkgIdx].includes, ""]);
  }
  function removeRetainerInclude(pkgIdx: number, lineIdx: number) {
    updateRetainer(pkgIdx, "includes", pricing.retainerPackages[pkgIdx].includes.filter((_, i) => i !== lineIdx));
  }
  function updateRetainerQA(pkgIdx: number, lineIdx: number, val: string) {
    const list = [...pricing.retainerPackages[pkgIdx].quarterlyAccelerator];
    list[lineIdx] = val;
    updateRetainer(pkgIdx, "quarterlyAccelerator", list);
  }
  function addRetainerQA(pkgIdx: number) {
    updateRetainer(pkgIdx, "quarterlyAccelerator", [...pricing.retainerPackages[pkgIdx].quarterlyAccelerator, ""]);
  }
  function removeRetainerQA(pkgIdx: number, lineIdx: number) {
    updateRetainer(pkgIdx, "quarterlyAccelerator", pricing.retainerPackages[pkgIdx].quarterlyAccelerator.filter((_, i) => i !== lineIdx));
  }

  // ── Other Services ───────────────────────────────────────────────────────────
  function updateOtherService(idx: number, field: keyof SingleService, val: string) {
    setPricing(p => {
      const list = [...p.otherServices];
      list[idx] = { ...list[idx], [field]: val };
      return { ...p, otherServices: list };
    });
  }
  function addOtherService() {
    setPricing(p => ({ ...p, otherServices: [...p.otherServices, { name: "", monthlyFee: "POA", notes: "" }] }));
  }
  function removeOtherService(idx: number) {
    setPricing(p => ({ ...p, otherServices: p.otherServices.filter((_, i) => i !== idx) }));
  }

  if (loading) {
    return (
      <div className="page" style={{ color: "var(--text-3)", fontSize: 14 }}>Loading pricing…</div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 960 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--gradient-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <PoundSterling style={{ width: 20, height: 20, color: "white" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>Pricing Strategy</h1>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>Define your packages and rates — the AI references these when generating proposals</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleReset} style={{ gap: 6 }}>
            <RotateCcw style={{ width: 13, height: 13 }} /> Reset defaults
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 8 }}>
            <Save style={{ width: 14, height: 14 }} />
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save Pricing"}
          </button>
        </div>
      </div>

      {/* Global Notes */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <p className="card-title">Pricing Notes for AI</p>
          <p className="card-subtitle">These notes are passed directly to the AI when generating proposals — use them for exceptions, rules, and context.</p>
        </div>
        <div className="card-body">
          <textarea
            style={{ ...inputStyle, minHeight: 72, resize: "vertical", lineHeight: 1.6 }}
            value={pricing.notes}
            onChange={e => updateNotes(e.target.value)}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")}
          />
        </div>
      </div>

      {/* Single Services */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="card-title">Single-Channel Services</p>
              <p className="card-subtitle">Standalone monthly retainers for one channel</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={addSingleService} style={{ gap: 6 }}>
              <Plus style={{ width: 13, height: 13 }} /> Add
            </button>
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Service", "Monthly Fee", "Notes", ""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", borderBottom: "1px solid var(--border-subtle)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pricing.singleServices.map((s, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <input style={inputStyle} value={s.name} onChange={e => updateSingleService(i, "name", e.target.value)}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                  </td>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-subtle)", width: 140 }}>
                    <input style={inputStyle} value={s.monthlyFee} onChange={e => updateSingleService(i, "monthlyFee", e.target.value)}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                  </td>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <input style={inputStyle} value={s.notes} onChange={e => updateSingleService(i, "notes", e.target.value)}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                  </td>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-subtle)", width: 40, textAlign: "center" }}>
                    <button onClick={() => removeSingleService(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Focus Packages */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Package style={{ width: 15, height: 15, color: "var(--accent)" }} />
            <p className="card-title">Focus Packages</p>
          </div>
          <p className="card-subtitle">Base packages with a single-channel focus (SEO or Paid)</p>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {pricing.focusPackages.map((pkg, i) => (
            <div key={i} style={{ padding: "20px", background: "var(--bg)", border: "1px solid var(--border-subtle)", borderRadius: "var(--r-lg)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Package Name</label>
                  <input style={inputStyle} value={pkg.name} onChange={e => updateFocusPackage(i, "name", e.target.value)}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Monthly Fee</label>
                  <input style={inputStyle} value={pkg.monthlyFee} onChange={e => updateFocusPackage(i, "monthlyFee", e.target.value)}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Hrs/mo</label>
                  <input type="number" style={inputStyle} value={pkg.hoursPerMonth} onChange={e => updateFocusPackage(i, "hoursPerMonth", parseInt(e.target.value) || 0)}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: 56, resize: "vertical", lineHeight: 1.6 }} value={pkg.description}
                  onChange={e => updateFocusPackage(i, "description", e.target.value)}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Includes</label>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => addFocusInclude(i)}>
                    <Plus style={{ width: 11, height: 11 }} /> Add line
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {pkg.includes.map((line, j) => (
                    <div key={j} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input style={{ ...inputStyle, flex: 1 }} value={line} onChange={e => updateFocusInclude(i, j, e.target.value)}
                        onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                      <button onClick={() => removeFocusInclude(i, j)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4, flexShrink: 0 }}>
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Focus Add-ons */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap style={{ width: 15, height: 15, color: "var(--accent)" }} />
            <p className="card-title">Impact Add-ons</p>
          </div>
          <p className="card-subtitle">Channel add-ons at three intensity tiers (Channels / Growth / Elevate)</p>
        </div>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {(["seoFocus", "paidFocus"] as const).map(focus => (
            <div key={focus}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{focus === "seoFocus" ? "SEO Focus" : "Paid Marketing Focus"} Add-ons</p>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => addAddOn(focus)}>
                  <Plus style={{ width: 11, height: 11 }} /> Add
                </button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Channel", "Channels", "Growth", "Elevate", ""].map(h => (
                      <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", borderBottom: "1px solid var(--border-subtle)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pricing.focusAddOns[focus].map((addon, i) => (
                    <tr key={i}>
                      {(["name", "channels", "growth", "elevate"] as const).map(field => (
                        <td key={field} style={{ padding: "4px 8px", borderBottom: "1px solid var(--border-subtle)" }}>
                          <input style={{ ...inputStyle, padding: "5px 8px", fontSize: 12 }} value={addon[field]}
                            onChange={e => updateAddOn(focus, i, field, e.target.value)}
                            onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                            onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                        </td>
                      ))}
                      <td style={{ padding: "4px 8px", borderBottom: "1px solid var(--border-subtle)", width: 30 }}>
                        <button onClick={() => removeAddOn(focus, i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 2 }}>
                          <Trash2 style={{ width: 11, height: 11 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* Retainer Packages */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Package style={{ width: 15, height: 15, color: "var(--accent)" }} />
            <p className="card-title">Multi-Channel Retainer Packages</p>
          </div>
          <p className="card-subtitle">Growth Core and Growth Accelerator tiers</p>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {pricing.retainerPackages.map((pkg, i) => (
            <div key={i} style={{ padding: "20px", background: "var(--bg)", border: "1px solid var(--border-subtle)", borderRadius: "var(--r-lg)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Package Name</label>
                  <input style={inputStyle} value={pkg.name} onChange={e => updateRetainer(i, "name", e.target.value)}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Price Range</label>
                  <input style={inputStyle} value={pkg.priceRange} onChange={e => updateRetainer(i, "priceRange", e.target.value)}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Description</label>
                <textarea style={{ ...inputStyle, minHeight: 56, resize: "vertical", lineHeight: 1.6 }} value={pkg.description}
                  onChange={e => updateRetainer(i, "description", e.target.value)}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Includes</label>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => addRetainerInclude(i)}>
                      <Plus style={{ width: 11, height: 11 }} /> Add
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {pkg.includes.map((line, j) => (
                      <div key={j} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input style={{ ...inputStyle, flex: 1, fontSize: 12 }} value={line}
                          onChange={e => updateRetainerInclude(i, j, e.target.value)}
                          onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                          onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                        <button onClick={() => removeRetainerInclude(i, j)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 2, flexShrink: 0 }}>
                          <Trash2 style={{ width: 11, height: 11 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Quarterly Accelerator</label>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => addRetainerQA(i)}>
                      <Plus style={{ width: 11, height: 11 }} /> Add
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {pkg.quarterlyAccelerator.map((line, j) => (
                      <div key={j} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input style={{ ...inputStyle, flex: 1, fontSize: 12 }} value={line}
                          onChange={e => updateRetainerQA(i, j, e.target.value)}
                          onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                          onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                        <button onClick={() => removeRetainerQA(i, j)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 2, flexShrink: 0 }}>
                          <Trash2 style={{ width: 11, height: 11 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other Services */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="card-title">Other Services</p>
              <p className="card-subtitle">Consultancy, add-ons, and project-based work</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={addOtherService} style={{ gap: 6 }}>
              <Plus style={{ width: 13, height: 13 }} /> Add
            </button>
          </div>
        </div>
        <div className="card-body" style={{ paddingTop: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Service", "Fee / Notes", "Context for AI", ""].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", borderBottom: "1px solid var(--border-subtle)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pricing.otherServices.map((s, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <input style={inputStyle} value={s.name} onChange={e => updateOtherService(i, "name", e.target.value)}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                  </td>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-subtle)", width: 140 }}>
                    <input style={inputStyle} value={s.monthlyFee} onChange={e => updateOtherService(i, "monthlyFee", e.target.value)}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                  </td>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <input style={inputStyle} value={s.notes} onChange={e => updateOtherService(i, "notes", e.target.value)}
                      onFocus={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                      onBlur={e => (e.currentTarget.style.borderColor = "var(--border)")} />
                  </td>
                  <td style={{ padding: "6px 12px", borderBottom: "1px solid var(--border-subtle)", width: 40, textAlign: "center" }}>
                    <button onClick={() => removeOtherService(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}>
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save footer */}
      <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 8 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 8, height: 42, paddingInline: 28 }}>
          <Save style={{ width: 15, height: 15 }} />
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Pricing Strategy"}
        </button>
      </div>

    </div>
  );
}

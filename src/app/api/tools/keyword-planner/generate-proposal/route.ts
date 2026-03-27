import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdGroup {
  name: string;
  keywords: string[];
}

interface KeywordIdea {
  text: string;
  adGroup: string;
  avgMonthlySearches: number;
  competition: string;
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
}

interface Service {
  name: string;
  price: string;
  description?: string;
}

interface TimelinePhase {
  title: string;
  duration: string;
  description: string;
}

interface ProposalGap {
  title: string;
  description: string;
  impact: string;
}

interface KeywordCluster {
  intent: string;
  keywords: string[];
  searchVolume: number;
  opportunity: string;
}

interface ContentArticle {
  title: string;
  targetKeyword: string;
}

interface ProposalData {
  hero: {
    tagline: string;
    description: string;
  };
  whereYouAreNow: {
    summary: string;
    positives: Array<{ title: string; description: string }>;
    gaps: ProposalGap[];
  };
  keywordClusters: KeywordCluster[];
  contentCluster: {
    pillarPage: { title: string; description: string };
    articles: ContentArticle[];
  };
  whyUs: Array<{ stat: string; title: string; description: string }>;
  cta: {
    headline: string;
    body: string;
  };
}

// ─── HTML Template ────────────────────────────────────────────────────────────

function competitionLabel(comp: string): string {
  if (comp === "HIGH") return "High";
  if (comp === "MEDIUM") return "Med";
  if (comp === "LOW") return "Low";
  return comp || "—";
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

function fmtCurrency(micros: number): string {
  if (!micros) return "—";
  return `£${(micros / 1_000_000).toFixed(2)}`;
}

function generateProposalHTML(params: {
  clientName: string;
  website: string;
  services: Service[];
  timeline: TimelinePhase[];
  ideas: KeywordIdea[];
  adGroups: AdGroup[];
  proposalData: ProposalData;
  stats: {
    totalKeywords: number;
    totalSearchVolume: number;
    avgCpc: string;
    estimatedClicks: number;
    estimatedConversions: number;
  };
  ppc: {
    maxCpc: number;
    monthlyBudget: number;
    conversionRate: number;
  };
}): string {
  const { clientName, website, services, timeline, ideas, adGroups, proposalData, stats, ppc } = params;
  const pd = proposalData;

  const topKeywords = [...ideas]
    .sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches)
    .slice(0, 20);

  const uniqueGroups = [...new Set(ideas.map((i) => i.adGroup))];

  const adGroupRows = uniqueGroups
    .map((groupName) => {
      const groupIdeas = ideas.filter((i) => i.adGroup === groupName);
      const totalSearches = groupIdeas.reduce((s, i) => s + i.avgMonthlySearches, 0);
      return `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-weight:600;color:#1e293b">${groupName}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#475569">${groupIdeas.length}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#475569">${fmtNum(totalSearches)}</td>
        </tr>`;
    })
    .join("");

  const keywordRows = topKeywords
    .map(
      (kw) => `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-weight:500">${kw.text}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#6366f1;text-align:right;font-weight:600">${fmtNum(kw.avgMonthlySearches)}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#475569;text-align:center">${competitionLabel(kw.competition)}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;color:#475569;text-align:right">${fmtCurrency(kw.highTopOfPageBidMicros)}</td>
        </tr>`
    )
    .join("");

  const gapCards = (pd.whereYouAreNow?.gaps ?? [])
    .map(
      (gap) => `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;flex:1;min-width:200px;border-left:4px solid #ef4444">
        <div style="width:32px;height:32px;border-radius:8px;background:#fee2e2;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 style="font-size:15px;font-weight:700;color:#1e293b;margin:0 0 8px">${gap.title}</h3>
        <p style="font-size:13px;color:#475569;line-height:1.6;margin:0 0 8px">${gap.description}</p>
        <p style="font-size:12px;color:#ef4444;font-weight:600;margin:0">Impact: ${gap.impact}</p>
      </div>`
    )
    .join("");

  const positiveCards = (pd.whereYouAreNow?.positives ?? [])
    .map(
      (pos) => `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;flex:1;min-width:200px;border-left:4px solid #22c55e">
        <div style="width:32px;height:32px;border-radius:8px;background:#dcfce7;display:flex;align-items:center;justify-content:center;margin-bottom:12px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h3 style="font-size:15px;font-weight:700;color:#1e293b;margin:0 0 8px">${pos.title}</h3>
        <p style="font-size:13px;color:#475569;line-height:1.6;margin:0">${pos.description}</p>
      </div>`
    )
    .join("");

  const whyUsCards = (pd.whyUs ?? [
    { stat: "10+", title: "Years of experience", description: "Deep expertise in performance marketing across every major digital channel." },
    { stat: "£2M+", title: "Ad spend managed", description: "Proven track record delivering results with budgets of all sizes." },
    { stat: "3.2x", title: "Average ROAS", description: "Our clients consistently outperform industry benchmarks on return on ad spend." },
  ])
    .map(
      (item) => `
      <div style="text-align:center;padding:32px 24px">
        <p style="font-size:48px;font-weight:900;color:#ffffff;line-height:1;margin:0 0 8px">${item.stat}</p>
        <p style="font-size:15px;font-weight:700;color:#c7d2fe;margin:0 0 10px">${item.title}</p>
        <p style="font-size:13px;color:#a5b4fc;line-height:1.6;margin:0;max-width:220px;margin-inline:auto">${item.description}</p>
      </div>`
    )
    .join("");

  const clusterRows = (pd.keywordClusters ?? [])
    .map(
      (cluster) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#1e293b;font-weight:500">${cluster.keywords.slice(0, 3).join(", ")}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:center">
            <span style="padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;background:${cluster.intent === "Transactional" ? "#d1fae5" : cluster.intent === "Commercial" ? "#dbeafe" : "#fef3c7"};color:${cluster.intent === "Transactional" ? "#065f46" : cluster.intent === "Commercial" ? "#1e40af" : "#92400e"}">${cluster.intent}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#6366f1;text-align:right;font-weight:600">${fmtNum(cluster.searchVolume)}/mo</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:13px">${cluster.opportunity}</td>
        </tr>`
    )
    .join("");

  const articleCards = (pd.contentCluster?.articles ?? [])
    .map(
      (article) => `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px">
        <p style="font-size:13px;font-weight:600;color:#1e293b;margin:0 0 4px">${article.title}</p>
        <p style="font-size:11px;color:#6366f1;margin:0">Target: ${article.targetKeyword}</p>
      </div>`
    )
    .join("");

  const serviceCards = services
    .map(
      (service) => `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;flex:1;min-width:200px;text-align:center">
        <p style="font-size:16px;font-weight:700;color:#6366f1;margin:0 0 6px">${service.price}</p>
        <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 8px">${service.name}</p>
        ${service.description ? `<p style="font-size:13px;color:#64748b;margin:0">${service.description}</p>` : ""}
      </div>`
    )
    .join("");

  const timelineItems = timeline
    .map(
      (phase, i) => `
      <div style="display:flex;gap:20px;align-items:flex-start;padding:20px 0;border-bottom:1px solid #f1f5f9">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#7c3aed);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;flex-shrink:0">${i + 1}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <p style="font-size:15px;font-weight:700;color:#1e293b;margin:0">${phase.title}</p>
            <span style="font-size:12px;font-weight:600;color:#6366f1;background:#ede9fe;padding:3px 10px;border-radius:99px">${phase.duration}</span>
          </div>
          <p style="font-size:13px;color:#475569;margin:0;line-height:1.6">${phase.description}</p>
        </div>
      </div>`
    )
    .join("");

  const totalServices = services.length;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const domainLabel = (() => {
    try {
      return new URL(website).hostname.replace(/^www\./, "");
    } catch {
      return website;
    }
  })();

  // ── Interactive PPC Forecaster (for downloaded HTML) ──────────────────────
  const ppcMaxCpc = ppc.maxCpc > 0 ? ppc.maxCpc : 1.5;
  const ppcBudget = ppc.monthlyBudget > 0 ? ppc.monthlyBudget : 1500;
  const ppcConvRate = ppc.conversionRate > 0 ? ppc.conversionRate : 3;

  const ppcForecastSection = `
  <!-- ── PPC Forecaster ── -->
  <section id="ppc-forecaster" style="padding:64px 0">
    <div class="container">
      <p class="section-label">PPC Forecaster</p>
      <h2>Interactive PPC Forecast</h2>
      <p style="font-size:16px;color:#475569;margin-bottom:40px;max-width:680px;line-height:1.7">Use the sliders to model different scenarios. Adjust your budget, CPC, and conversion rate to see projected performance.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px">
        <div style="background:#f8fafc;border-radius:16px;padding:28px;border:1px solid #e2e8f0">
          <h3 style="font-size:15px;font-weight:700;color:#1e293b;margin:0 0 24px">Adjust Inputs</h3>
          <div style="margin-bottom:24px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <label style="font-size:13px;font-weight:600;color:#475569">Average CPC</label>
              <span id="pfc-cpc-val" style="font-size:14px;font-weight:700;color:#6366f1;background:#ede9fe;padding:3px 10px;border-radius:99px">\u00a3${ppcMaxCpc.toFixed(2)}</span>
            </div>
            <input type="range" id="pfc-cpc" min="0.10" max="15" step="0.10" value="${ppcMaxCpc}">
            <div style="display:flex;justify-content:space-between;margin-top:4px"><span style="font-size:10px;color:#94a3b8">\u00a30.10</span><span style="font-size:10px;color:#94a3b8">\u00a315.00</span></div>
          </div>
          <div style="margin-bottom:24px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <label style="font-size:13px;font-weight:600;color:#475569">Monthly Budget</label>
              <span id="pfc-budget-val" style="font-size:14px;font-weight:700;color:#6366f1;background:#ede9fe;padding:3px 10px;border-radius:99px">\u00a3${ppcBudget.toLocaleString("en-GB")}</span>
            </div>
            <input type="range" id="pfc-budget" min="100" max="10000" step="100" value="${ppcBudget}">
            <div style="display:flex;justify-content:space-between;margin-top:4px"><span style="font-size:10px;color:#94a3b8">\u00a3100</span><span style="font-size:10px;color:#94a3b8">\u00a310,000</span></div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <label style="font-size:13px;font-weight:600;color:#475569">Conversion Rate</label>
              <span id="pfc-conv-val" style="font-size:14px;font-weight:700;color:#6366f1;background:#ede9fe;padding:3px 10px;border-radius:99px">${ppcConvRate}%</span>
            </div>
            <input type="range" id="pfc-conv" min="0.5" max="15" step="0.5" value="${ppcConvRate}">
            <div style="display:flex;justify-content:space-between;margin-top:4px"><span style="font-size:10px;color:#94a3b8">0.5%</span><span style="font-size:10px;color:#94a3b8">15%</span></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <div style="background:linear-gradient(135deg,#6366f1,#7c3aed);border-radius:16px;padding:24px;color:#fff">
            <p style="font-size:12px;font-weight:700;color:#c4b5fd;margin:0 0 4px;letter-spacing:.06em;text-transform:uppercase">Est. Monthly Clicks</p>
            <p id="pfc-clicks" style="font-size:40px;font-weight:900;margin:0;line-height:1">\u2014</p>
          </div>
          <div style="background:#f0fdf4;border-radius:16px;padding:24px;border:1px solid #bbf7d0">
            <p style="font-size:12px;font-weight:700;color:#16a34a;margin:0 0 4px;letter-spacing:.06em;text-transform:uppercase">Est. Conversions/Month</p>
            <p id="pfc-convs" style="font-size:40px;font-weight:900;color:#15803d;margin:0;line-height:1">\u2014</p>
          </div>
          <div style="background:#fff7ed;border-radius:16px;padding:24px;border:1px solid #fed7aa">
            <p style="font-size:12px;font-weight:700;color:#ea580c;margin:0 0 4px;letter-spacing:.06em;text-transform:uppercase">Cost Per Conversion</p>
            <p id="pfc-cpa" style="font-size:40px;font-weight:900;color:#c2410c;margin:0;line-height:1">\u2014</p>
          </div>
        </div>
      </div>
      <div style="background:#f8fafc;border-radius:16px;padding:28px;border:1px solid #e2e8f0">
        <h3 style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 16px">6-Month Performance Ramp</h3>
        <div id="pfc-chart" style="display:flex;align-items:flex-end;gap:6px;height:140px;padding:0 4px"></div>
        <p style="font-size:12px;color:#94a3b8;margin-top:12px;text-align:center">Campaigns typically ramp up over 6 months as Quality Scores and ad relevancy improve.</p>
      </div>
    </div>
  </section>`;

  const interactiveScript = `<script>
(function(){
  function fmtN(n){if(n>=1000000)return(n/1000000).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'K';return String(Math.round(n));}
  function fmtC(n){return'\u00a3'+Math.round(n).toLocaleString('en-GB');}
  var ms=['M1','M2','M3','M4','M5','M6'];
  var cpcEl=document.getElementById('pfc-cpc'),budgetEl=document.getElementById('pfc-budget'),convEl=document.getElementById('pfc-conv');
  var cpcV=document.getElementById('pfc-cpc-val'),budgetV=document.getElementById('pfc-budget-val'),convV=document.getElementById('pfc-conv-val');
  var clicksEl=document.getElementById('pfc-clicks'),convsEl=document.getElementById('pfc-convs'),cpaEl=document.getElementById('pfc-cpa');
  var chartEl=document.getElementById('pfc-chart');
  if(!cpcEl||!chartEl)return;
  function update(){
    var cpc=parseFloat(cpcEl.value),budget=parseFloat(budgetEl.value),conv=parseFloat(convEl.value);
    cpcV.textContent='\u00a3'+cpc.toFixed(2);
    budgetV.textContent=fmtC(budget);
    convV.textContent=conv+'%';
    var clicks=cpc>0?Math.round(budget/cpc):0;
    var convs=Math.round(clicks*conv/100);
    clicksEl.textContent=fmtN(clicks);
    convsEl.textContent=String(convs);
    cpaEl.textContent=convs>0?fmtC(Math.round(budget/convs)):'\u2014';
    var mdata=ms.map(function(l,i){return{label:l,clicks:Math.round(clicks*Math.min(1,0.6+i*0.08))};});
    var maxC=mdata.reduce(function(m,d){return Math.max(m,d.clicks);},1);
    chartEl.innerHTML='';
    mdata.forEach(function(d){
      var h=Math.max(4,Math.round(d.clicks/maxC*100));
      var col=document.createElement('div');
      col.style.cssText='flex:1;display:flex;flex-direction:column;align-items:center;gap:4px';
      col.innerHTML='<div style="width:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:110px"><div style="width:70%;height:'+h+'px;background:linear-gradient(to top,#6366f1,#818cf8);border-radius:4px 4px 0 0;min-height:4px;position:relative"><div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);font-size:9px;color:#6366f1;font-weight:700;white-space:nowrap">'+fmtN(d.clicks)+'</div></div></div><div style="font-size:10px;color:#94a3b8;text-align:center">'+d.label+'</div>';
      chartEl.appendChild(col);
    });
  }
  cpcEl.addEventListener('input',update);
  budgetEl.addEventListener('input',update);
  convEl.addEventListener('input',update);
  update();
})();
<\/script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${clientName} — Digital Marketing Proposal</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;color:#1e293b;line-height:1.5}
    @media print{body{background:#fff}section{break-inside:avoid}}
    .container{max-width:900px;margin:0 auto;padding:0 24px}
    h2{font-size:26px;font-weight:800;color:#1e293b;margin:0 0 8px}
    h3{font-size:16px;font-weight:700;color:#1e293b;margin:0 0 6px}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:10px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;border-bottom:2px solid #e2e8f0;background:#fff}
    .section-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6366f1;margin-bottom:12px}
  input[type=range]{accent-color:#6366f1;cursor:pointer;width:100%}
  </style>
</head>
<body>

  <!-- ── Hero ── -->
  <div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%);color:white;padding:72px 0 56px">
    <div class="container">
      <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.15em;color:#a5b4fc;margin-bottom:16px">Digital Marketing Proposal</p>
      <h1 style="font-size:48px;font-weight:900;line-height:1.1;margin-bottom:16px">${clientName}</h1>
      <p style="font-size:20px;color:#c7d2fe;margin-bottom:8px;font-weight:500">${pd.hero?.tagline ?? ""}</p>
      <p style="font-size:15px;color:#a5b4fc;max-width:600px;line-height:1.7;margin-bottom:40px">${pd.hero?.description ?? ""}</p>
      <!-- Stats band -->
      <div style="display:flex;gap:32px;flex-wrap:wrap">
        <div>
          <p style="font-size:32px;font-weight:900;color:#fff;line-height:1">${stats.totalKeywords}</p>
          <p style="font-size:12px;color:#a5b4fc;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-top:4px">Keywords Researched</p>
        </div>
        <div style="width:1px;background:rgba(255,255,255,.15)"></div>
        <div>
          <p style="font-size:32px;font-weight:900;color:#fff;line-height:1">${fmtNum(stats.totalSearchVolume)}</p>
          <p style="font-size:12px;color:#a5b4fc;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-top:4px">Monthly Searches</p>
        </div>
        <div style="width:1px;background:rgba(255,255,255,.15)"></div>
        <div>
          <p style="font-size:32px;font-weight:900;color:#fff;line-height:1">${adGroups.length}</p>
          <p style="font-size:12px;color:#a5b4fc;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-top:4px">Ad Groups</p>
        </div>
        <div style="width:1px;background:rgba(255,255,255,.15)"></div>
        <div>
          <p style="font-size:32px;font-weight:900;color:#fff;line-height:1">${totalServices}</p>
          <p style="font-size:12px;color:#a5b4fc;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-top:4px">Services Proposed</p>
        </div>
      </div>
    </div>
  </div>

  <div style="background:#6366f1;padding:12px 0">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <p style="font-size:13px;color:white;opacity:.85">${domainLabel}</p>
      <p style="font-size:13px;color:white;opacity:.85">Prepared: ${today}</p>
    </div>
  </div>

  <!-- ── 01. Where You Are Now ── -->
  <section style="padding:64px 0">
    <div class="container">
      <p class="section-label">01 — Situation Analysis</p>
      <h2>Where You Are Now</h2>
      <p style="font-size:16px;color:#475569;margin-bottom:40px;max-width:680px;line-height:1.7">${pd.whereYouAreNow?.summary ?? ""}</p>
      ${positiveCards ? `
      <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#16a34a;margin-bottom:16px">What you do well</p>
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:32px">
        ${positiveCards}
      </div>` : ""}
      <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#ef4444;margin-bottom:16px">Where the gaps are</p>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        ${gapCards}
      </div>
    </div>
  </section>

  <!-- ── 02. Keyword Research ── -->
  <section style="padding:64px 0;background:#fff">
    <div class="container">
      <p class="section-label">02 — Keyword Research</p>
      <h2>Search Opportunity</h2>
      <p style="font-size:16px;color:#475569;margin-bottom:40px;max-width:680px;line-height:1.7">Based on live Google Ads data, we have identified ${stats.totalKeywords} high-value keywords across ${adGroups.length} themed ad groups with a combined monthly search volume of ${fmtNum(stats.totalSearchVolume)}.</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:40px">
        <!-- Ad Groups table -->
        <div style="background:#f8fafc;border-radius:12px;overflow:hidden">
          <div style="padding:20px 20px 12px">
            <p style="font-size:14px;font-weight:700;color:#1e293b">Ad Group Structure</p>
            <p style="font-size:12px;color:#64748b;margin-top:2px">${adGroups.length} themed groups</p>
          </div>
          <table>
            <thead><tr>
              <th>Group</th><th>Keywords</th><th>Monthly Searches</th>
            </tr></thead>
            <tbody>${adGroupRows}</tbody>
          </table>
        </div>
        <!-- Top Keywords table -->
        <div style="background:#f8fafc;border-radius:12px;overflow:hidden">
          <div style="padding:20px 20px 12px">
            <p style="font-size:14px;font-weight:700;color:#1e293b">Top Keywords</p>
            <p style="font-size:12px;color:#64748b;margin-top:2px">By monthly search volume</p>
          </div>
          <table>
            <thead><tr>
              <th>Keyword</th><th style="text-align:right">Vol/mo</th><th style="text-align:center">Comp</th><th style="text-align:right">Max Bid</th>
            </tr></thead>
            <tbody>${keywordRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  ${ppcForecastSection}

  <!-- ── 03. Keyword Clusters ── -->
  ${(pd.keywordClusters ?? []).length > 0 ? `
  <section style="padding:64px 0">
    <div class="container">
      <p class="section-label">03 — Keyword Clusters</p>
      <h2>Intent-Based Opportunities</h2>
      <p style="font-size:16px;color:#475569;margin-bottom:40px;max-width:680px;line-height:1.7">We have grouped keywords by search intent to enable targeted messaging and landing page strategies.</p>
      <div style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <table>
          <thead><tr>
            <th>Keywords</th><th style="text-align:center">Intent</th><th style="text-align:right">Volume</th><th>Opportunity</th>
          </tr></thead>
          <tbody>${clusterRows}</tbody>
        </table>
      </div>
    </div>
  </section>
  ` : ""}

  <!-- ── 04. Content Strategy ── -->
  ${pd.contentCluster?.pillarPage ? `
  <section style="padding:64px 0;background:#fff">
    <div class="container">
      <p class="section-label">04 — Content Strategy</p>
      <h2>Content Cluster Plan</h2>
      <p style="font-size:16px;color:#475569;margin-bottom:40px;max-width:680px;line-height:1.7">A hub-and-spoke content model to build topical authority and capture organic traffic at every stage of the buyer journey.</p>
      <div style="background:linear-gradient(135deg,#ede9fe,#dbeafe);border-radius:16px;padding:32px;margin-bottom:24px">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6366f1;margin-bottom:8px">Pillar Page</p>
        <h3 style="font-size:20px;font-weight:800;color:#1e1b4b;margin-bottom:8px">${pd.contentCluster.pillarPage.title}</h3>
        <p style="font-size:14px;color:#4338ca;line-height:1.6">${pd.contentCluster.pillarPage.description}</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
        ${articleCards}
      </div>
    </div>
  </section>
  ` : ""}

  <!-- ── 05. Services & Investment ── -->
  ${services.length > 0 ? `
  <section style="padding:64px 0">
    <div class="container">
      <p class="section-label">05 — Investment</p>
      <h2>Services & Pricing</h2>
      <p style="font-size:16px;color:#475569;margin-bottom:40px;max-width:680px;line-height:1.7">A tailored package designed to maximise your digital presence and deliver measurable ROI.</p>
      <div style="display:flex;gap:20px;flex-wrap:wrap">
        ${serviceCards}
      </div>
    </div>
  </section>
  ` : ""}

  <!-- ── 06. Timeline ── -->
  ${timeline.length > 0 ? `
  <section style="padding:64px 0;background:#fff">
    <div class="container">
      <p class="section-label">06 — Timeline</p>
      <h2>Project Roadmap</h2>
      <p style="font-size:16px;color:#475569;margin-bottom:40px;max-width:680px;line-height:1.7">A phased approach to ensure a smooth launch and ongoing optimisation.</p>
      <div>
        ${timelineItems}
      </div>
    </div>
  </section>
  ` : ""}

  <!-- ── Why i3media ── -->
  <section style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%);padding:80px 0">
    <div class="container">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#a5b4fc;margin-bottom:12px;text-align:center">Why choose us</p>
      <h2 style="color:#ffffff;text-align:center;margin-bottom:56px">Why i3media?</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">
        ${whyUsCards}
      </div>
    </div>
  </section>

  <!-- ── CTA ── -->
  <section style="background:#f0f4ff;padding:80px 0">
    <div class="container" style="text-align:center;max-width:640px">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#6366f1;margin-bottom:12px">Next steps</p>
      <h2 style="font-size:36px;font-weight:900;color:#1e1b4b;margin-bottom:20px;line-height:1.15">${pd.cta?.headline ?? `Ready to grow ${clientName}?`}</h2>
      <p style="font-size:16px;color:#475569;line-height:1.8;margin-bottom:40px">${pd.cta?.body ?? "Let's talk about how we can accelerate your digital growth. Our team is ready to build a campaign tailored specifically to your business."}</p>
      <div style="display:inline-flex;gap:16px;flex-wrap:wrap;justify-content:center">
        <div style="background:#6366f1;color:#fff;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700">Get in touch</div>
        <div style="background:#fff;color:#6366f1;border:2px solid #6366f1;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700">hello@i3media.co.uk</div>
      </div>
    </div>
  </section>

  <!-- ── Footer ── -->
  <div style="background:#1e1b4b;padding:32px 0">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <p style="font-size:14px;color:#a5b4fc">Prepared by <strong style="color:white">i3media</strong></p>
      <p style="font-size:12px;color:#6366f1">${today}</p>
    </div>
  </div>

${interactiveScript}
</body>
</html>`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { researchId, clientName, services, timeline } = body as {
      researchId?: string;
      clientName: string;
      services: Service[];
      timeline: TimelinePhase[];
      // Inline data (when research hasn't been saved yet)
      inlineData?: {
        website: string;
        brief: string;
        adGroups: AdGroup[];
        ideas: KeywordIdea[];
        maxCpc: string;
        monthlyBudget: string;
        conversionRate: string;
        websiteContext?: string;
      };
    };

    if (!clientName) {
      return NextResponse.json({ error: "clientName is required" }, { status: 400 });
    }

    // ── Load research data ──────────────────────────────────────────────────
    let website: string;
    let brief: string;
    let adGroups: AdGroup[];
    let ideas: KeywordIdea[];
    let maxCpc: string;
    let monthlyBudget: string;
    let conversionRate: string;
    let websiteContext: string;

    if (researchId) {
      const research = await prisma.keywordPlannerResearch.findUnique({
        where: { id: researchId },
      });
      if (!research || research.userId !== session.user.id) {
        return NextResponse.json({ error: "Research not found" }, { status: 404 });
      }
      website = research.website;
      brief = research.brief;
      adGroups = JSON.parse(research.adGroups) as AdGroup[];
      ideas = JSON.parse(research.ideas) as KeywordIdea[];
      maxCpc = research.maxCpc;
      monthlyBudget = research.monthlyBudget;
      conversionRate = research.conversionRate;
      websiteContext = research.websiteContext ?? "";
    } else if (body.inlineData) {
      ({ website, brief, adGroups, ideas, maxCpc, monthlyBudget, conversionRate } = body.inlineData);
      websiteContext = body.inlineData.websiteContext ?? "";
    } else {
      return NextResponse.json(
        { error: "Either researchId or inlineData is required" },
        { status: 400 }
      );
    }

    if (!ideas || ideas.length === 0) {
      return NextResponse.json({ error: "No keyword data found" }, { status: 400 });
    }

    // ── Get OpenAI API key ──────────────────────────────────────────────────
    const [apiKeySetting, taskBenchmarksSetting] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: "openaiApiKey" } }),
      prisma.appSetting.findUnique({ where: { key: "taskBenchmarks" } }),
    ]);
    const apiKey = apiKeySetting?.value ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Add it in Settings." },
        { status: 400 }
      );
    }

    // ── Load task benchmarks ────────────────────────────────────────────────
    let taskBenchmarks: Array<{ task: string; hours: number }> = [];
    if (taskBenchmarksSetting?.value) {
      try {
        taskBenchmarks = JSON.parse(taskBenchmarksSetting.value) as Array<{ task: string; hours: number }>;
      } catch { /* ignore malformed JSON */ }
    }

    const openai = new OpenAI({ apiKey });

    // ── Compute stats ───────────────────────────────────────────────────────
    const totalSearchVolume = ideas.reduce((s, i) => s + i.avgMonthlySearches, 0);
    const maxCpcVal = parseFloat(maxCpc) || 0;
    const budgetVal = parseFloat(monthlyBudget) || 0;
    const convRateVal = parseFloat(conversionRate) || 3;
    const estimatedClicks = maxCpcVal > 0 && budgetVal > 0 ? Math.round(budgetVal / maxCpcVal) : 0;
    const estimatedConversions = Math.round(estimatedClicks * convRateVal / 100);

    const stats = {
      totalKeywords: ideas.length,
      totalSearchVolume,
      avgCpc: maxCpc || "0",
      estimatedClicks,
      estimatedConversions,
    };

    // ── Build prompt context for hours/benchmarks ───────────────────────────
    const servicesWithHours = (services ?? []) as Array<Service & { hoursPerMonth?: number }>;
    const contractedHoursContext = servicesWithHours.some((s) => s.hoursPerMonth)
      ? `\nContracted Monthly Hours per Service:\n${servicesWithHours
          .filter((s) => s.hoursPerMonth)
          .map((s) => `- ${s.name}: ${s.hoursPerMonth}h/month`)
          .join("\n")}`
      : "";

    const benchmarksContext = taskBenchmarks.length > 0
      ? `\nTask Time Benchmarks (hours per deliverable):\n${taskBenchmarks
          .map((b) => `- ${b.task}: ${b.hours}h`)
          .join("\n")}`
      : "";

    const hasHoursContext = contractedHoursContext || benchmarksContext;

    // ── Call OpenAI ─────────────────────────────────────────────────────────
    const topGroupSummary = [...new Set(ideas.map((i) => i.adGroup))]
      .slice(0, 8)
      .map((g) => {
        const group = ideas.filter((i) => i.adGroup === g);
        const vol = group.reduce((s, i) => s + i.avgMonthlySearches, 0);
        return `${g} (${group.length} keywords, ${fmtNum(vol)}/mo searches)`;
      })
      .join("; ");

    const prompt = `You are an expert digital marketing strategist writing a client proposal in British English.

Client: ${clientName}
Website: ${website}
Brief: ${brief}
${websiteContext ? `\nWebsite Context (crawled):\n${websiteContext}\n` : ""}
Keyword Research Summary:
- Total Keywords: ${ideas.length}
- Ad Groups: ${topGroupSummary}
- Total Monthly Search Volume: ${fmtNum(totalSearchVolume)}
- Average CPC: £${maxCpcVal.toFixed(2)}
- Estimated Monthly Budget: £${budgetVal.toFixed(0)}
- Estimated Conversion Rate: ${convRateVal}%
${contractedHoursContext}${benchmarksContext}
${hasHoursContext ? `
IMPORTANT: Use the contracted hours and task benchmarks above to generate a REALISTIC timeline. Calculate how many deliverables can be completed each month given the contracted hours. For example, if the client has 10h/month for SEO & Content and a blog post takes 3h, that's roughly 3 blog posts per month. Make these calculations explicit in the timeline phase descriptions.
` : ""}
Generate a comprehensive proposal in JSON with this exact structure:

{
  "hero": {
    "tagline": "Short punchy tagline (max 10 words) specific to this client",
    "description": "2-3 sentences about the digital opportunity for this client"
  },
  "whereYouAreNow": {
    "summary": "2-3 sentences about their current digital situation and what they are missing",
    "positives": [
      { "title": "What they do well", "description": "A genuine strength based on their website or business" },
      { "title": "Another positive", "description": "Another genuine strength" }
    ],
    "gaps": [
      { "title": "Gap title", "description": "What they are missing", "impact": "Why it matters to their business" },
      { "title": "Gap title", "description": "What they are missing", "impact": "Why it matters to their business" },
      { "title": "Gap title", "description": "What they are missing", "impact": "Why it matters to their business" }
    ]
  },
  "keywordClusters": [
    {
      "intent": "Commercial",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "searchVolume": 5000,
      "opportunity": "Why this cluster matters"
    },
    {
      "intent": "Transactional",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "searchVolume": 3000,
      "opportunity": "Why this cluster matters"
    },
    {
      "intent": "Informational",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "searchVolume": 8000,
      "opportunity": "Why this cluster matters"
    }
  ],
  "contentCluster": {
    "pillarPage": {
      "title": "Main pillar page topic",
      "description": "What the pillar page covers and why it builds authority"
    },
    "articles": [
      { "title": "Supporting article title", "targetKeyword": "target keyword" },
      { "title": "Supporting article title", "targetKeyword": "target keyword" },
      { "title": "Supporting article title", "targetKeyword": "target keyword" },
      { "title": "Supporting article title", "targetKeyword": "target keyword" }
    ]
  },
  "whyUs": [
    { "stat": "10+", "title": "Years of experience", "description": "Why this matters for the client's sector" },
    { "stat": "£2M+", "title": "Ad spend managed", "description": "Proven track record with budgets like theirs" },
    { "stat": "3.2x", "title": "Average ROAS", "description": "Typical return on ad spend we deliver" }
  ],
  "cta": {
    "headline": "Ready to grow ${clientName}?",
    "body": "2-3 sentences inviting the client to take the next step, referencing their specific opportunity."
  }
}

Use specific, actionable insights from the keyword data${websiteContext ? " and the crawled website content" : ""}. Match the client's brand voice. Write in British English.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert digital marketing strategist. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });

    const proposalData = JSON.parse(
      completion.choices[0].message.content ?? "{}"
    ) as ProposalData;

    // ── Generate HTML ───────────────────────────────────────────────────────
    const html = generateProposalHTML({
      clientName,
      website,
      services: services ?? [],
      timeline: timeline ?? [],
      ideas,
      adGroups,
      proposalData,
      stats,
      ppc: { maxCpc: maxCpcVal, monthlyBudget: budgetVal, conversionRate: convRateVal },
    });

    const slugName = clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "client";
    const filename = `${slugName}-proposal.html`;

    // ── Save proposal to database ───────────────────────────────────────────
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    // Build structured data for the interactive viewer
    const proposalDataJson = JSON.stringify({
      clientName,
      website,
      brief,
      proposalData,
      stats,
      services: services ?? [],
      timeline: timeline ?? [],
      ppc: { maxCpc: maxCpcVal, monthlyBudget: budgetVal, conversionRate: convRateVal },
      topKeywords: [...ideas]
        .sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches)
        .slice(0, 30),
      adGroups,
    });

    const savedProposal = await prisma.proposal.create({
      data: {
        userId: session.user.id,
        clientName,
        website,
        title: `${clientName} — Proposal (${today})`,
        html,
        servicesJson: JSON.stringify(services ?? []),
        timelineJson: JSON.stringify(timeline ?? []),
        proposalDataJson,
        researchId: researchId ?? null,
      },
    });

    return NextResponse.json({ html, filename, proposalId: savedProposal.id });
  } catch (err) {
    console.error("generate-proposal error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

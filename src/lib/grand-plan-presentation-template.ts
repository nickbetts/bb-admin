import type { PresentationData, PresentationSlide } from "@/lib/grand-plan-presentation-generator";

function esc(text: string | undefined | null): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSlide(slide: PresentationSlide, index: number, total: number): string {
  const eyebrow = slide.eyebrow ? `<div class="eyebrow">${esc(slide.eyebrow)}</div>` : "";
  const counter = `<div class="counter">${index + 1} / ${total}</div>`;
  const title = `<h2 class="slide-title">${esc(slide.title)}</h2>`;

  let body = "";
  switch (slide.kind) {
    case "headline": {
      body = `
        <div class="headline-block">
          ${slide.headline ? `<div class="big-headline">${esc(slide.headline)}</div>` : ""}
          ${slide.subhead ? `<p class="big-subhead">${esc(slide.subhead)}</p>` : ""}
        </div>`;
      break;
    }
    case "outcome": {
      const metric = slide.metric
        ? `<div class="metric-card">
            <div class="metric-value">${esc(slide.metric.value)}</div>
            <div class="metric-label">${esc(slide.metric.label)}</div>
          </div>`
        : "";
      body = `
        <div class="outcome-block">
          ${metric}
          ${slide.headline ? `<div class="big-headline">${esc(slide.headline)}</div>` : ""}
          ${slide.subhead ? `<p class="big-subhead">${esc(slide.subhead)}</p>` : ""}
        </div>`;
      break;
    }
    case "pillars": {
      const cards = (slide.pillars ?? [])
        .map(
          (p) => `
            <div class="pillar-card">
              <div class="pillar-title">${esc(p.title)}</div>
              <p class="pillar-body">${esc(p.body)}</p>
            </div>`
        )
        .join("");
      body = `<div class="pillars-grid pillars-${slide.pillars?.length ?? 0}">${cards}</div>`;
      break;
    }
    case "audience": {
      const cards = (slide.audiences ?? [])
        .map(
          (a) => `
            <div class="audience-card">
              <div class="audience-name">${esc(a.name)}</div>
              <p class="audience-insight">${esc(a.insight)}</p>
            </div>`
        )
        .join("");
      body = `<div class="audience-grid audience-${slide.audiences?.length ?? 0}">${cards}</div>`;
      break;
    }
    case "channels": {
      const chips = (slide.channels ?? [])
        .map(
          (c) => `
            <div class="channel-chip">
              <div class="channel-name">${esc(c.name)}</div>
              <div class="channel-role">${esc(c.role)}</div>
            </div>`
        )
        .join("");
      body = `<div class="channels-grid">${chips}</div>`;
      break;
    }
    case "timeline": {
      const phases = (slide.phases ?? [])
        .map(
          (p, i) => `
            <div class="timeline-phase">
              <div class="phase-marker">${i + 1}</div>
              <div class="phase-label">${esc(p.label)}</div>
              <ul class="phase-items">
                ${p.items.map((it) => `<li>${esc(it)}</li>`).join("")}
              </ul>
            </div>`
        )
        .join("");
      body = `<div class="timeline-strip">${phases}</div>`;
      break;
    }
    case "investment": {
      const inv = slide.investment;
      const headline = inv?.headlineFigure
        ? `<div class="invest-headline">${esc(inv.headlineFigure)}</div>`
        : "";
      const breakdown = inv?.breakdown?.length
        ? `<div class="invest-breakdown">
            ${inv.breakdown
              .map(
                (b) => `
                  <div class="invest-row">
                    <div class="invest-row-head">
                      <span class="invest-label">${esc(b.label)}</span>
                      <span class="invest-amount">${esc(b.amount)}</span>
                    </div>
                    <div class="invest-bar"><div class="invest-fill" style="width:${Math.min(100, Math.max(0, b.percentage))}%"></div></div>
                    <div class="invest-pct">${b.percentage}%</div>
                  </div>`
              )
              .join("")}
          </div>`
        : "";
      body = `<div class="investment-block">${headline}${breakdown}</div>`;
      break;
    }
    case "next-steps": {
      const items = (slide.steps ?? [])
        .map(
          (s, i) => `
            <li class="step-item">
              <div class="step-num">${i + 1}</div>
              <div class="step-body">
                <div class="step-title">${esc(s.title)}</div>
                <p class="step-detail">${esc(s.detail)}</p>
              </div>
            </li>`
        )
        .join("");
      body = `<ol class="steps-list">${items}</ol>`;
      break;
    }
  }

  return `
    <section class="slide" data-slide-index="${index}">
      <div class="slide-inner">
        <div class="slide-head">
          ${eyebrow}
          ${counter}
        </div>
        ${title}
        <div class="slide-body">${body}</div>
        <div class="slide-foot">
          <div class="brand-mark">i3media</div>
        </div>
      </div>
    </section>`;
}

function renderCover(data: PresentationData, total: number): string {
  const c = data.cover;
  return `
    <section class="slide cover-slide" data-slide-index="0">
      <div class="cover-orb cover-orb-1"></div>
      <div class="cover-orb cover-orb-2"></div>
      <div class="cover-orb cover-orb-3"></div>
      <div class="slide-inner">
        <div class="slide-head">
          <div class="eyebrow eyebrow-light">i3media · Strategy Deck${c.period ? ` · ${esc(c.period)}` : ""}</div>
          <div class="counter">1 / ${total}</div>
        </div>
        <div class="cover-body">
          <h1 class="cover-title">${esc(c.title)}</h1>
          ${c.subtitle ? `<p class="cover-subtitle">${esc(c.subtitle)}</p>` : ""}
          ${c.sprintWindow ? `<div class="cover-sprint">${esc(c.sprintWindow)}</div>` : ""}
          <div class="cover-meta">
            <div><strong>Prepared for</strong><span>${esc(c.clientName)}</span></div>
            <div><strong>Prepared by</strong><span>i3media</span></div>
            <div><strong>Date</strong><span>${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span></div>
          </div>
        </div>
        <div class="slide-foot cover-foot">
          <span>Confidential — for internal review with ${esc(c.clientName)}</span>
        </div>
      </div>
    </section>`;
}

const PRESENTATION_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0b1020;--surface:#11172e;--surface-2:#162042;
  --ink:#0f172a;--text:#e5e7f5;--muted:#9aa3c4;--mid:#6b7494;
  --accent:#6366f1;--accent-2:#a855f7;--accent-3:#ec4899;
  --gradient:linear-gradient(135deg,#6366f1,#a855f7);
  --gradient-wide:linear-gradient(135deg,#6366f1,#a855f7,#ec4899);
  --border:rgba(255,255,255,0.10);
}
html,body{height:100%;background:var(--bg);color:var(--text);font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
body{overflow:hidden}

.deck{position:relative;width:100vw;height:100vh;overflow:hidden}
.slide{position:absolute;inset:0;display:flex;align-items:stretch;justify-content:center;padding:48px 64px;opacity:0;pointer-events:none;transition:opacity .35s ease}
.slide.is-active{opacity:1;pointer-events:auto;z-index:1}

.slide-inner{width:100%;max-width:1280px;display:flex;flex-direction:column;gap:24px;position:relative;z-index:2}
.slide-head{display:flex;justify-content:space-between;align-items:center;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted)}
.eyebrow{padding:4px 10px;border:1px solid var(--border);border-radius:999px;color:var(--muted)}
.eyebrow-light{color:#fff;border-color:rgba(255,255,255,0.25)}
.counter{font-variant-numeric:tabular-nums;color:var(--mid)}

.slide-title{font-size:46px;line-height:1.1;font-weight:700;color:#fff;letter-spacing:-0.02em;max-width:980px}

.slide-body{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0}

.slide-foot{display:flex;justify-content:space-between;align-items:center;color:var(--mid);font-size:11px;letter-spacing:0.12em;text-transform:uppercase}
.brand-mark{font-weight:700;color:var(--muted)}

/* ── Cover ──────────────────────────────────────────────────────────────── */
.cover-slide{background:radial-gradient(120% 100% at 0% 0%, #1a2356 0%, #0b1020 60%) ,#0b1020}
.cover-orb{position:absolute;border-radius:50%;filter:blur(60px);opacity:0.5;pointer-events:none}
.cover-orb-1{width:520px;height:520px;background:#6366f1;top:-160px;right:-120px}
.cover-orb-2{width:420px;height:420px;background:#a855f7;bottom:-180px;left:-120px;opacity:0.4}
.cover-orb-3{width:300px;height:300px;background:#ec4899;top:30%;left:40%;opacity:0.25}
.cover-body{flex:1;display:flex;flex-direction:column;justify-content:center;gap:18px}
.cover-title{font-size:78px;line-height:1.05;font-weight:800;letter-spacing:-0.03em;color:#fff;max-width:980px;background:linear-gradient(180deg,#fff,#cbd1ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.cover-subtitle{font-size:24px;line-height:1.4;color:#cdd5f5;max-width:820px;font-weight:400}
.cover-sprint{display:inline-block;align-self:flex-start;padding:8px 14px;border-radius:8px;background:rgba(99,102,241,0.18);color:#c5cbff;border:1px solid rgba(99,102,241,0.4);font-size:13px;font-weight:500;letter-spacing:0.04em}
.cover-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:760px;margin-top:28px}
.cover-meta>div{display:flex;flex-direction:column;gap:4px}
.cover-meta strong{font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:500}
.cover-meta span{font-size:18px;color:#fff;font-weight:500}
.cover-foot{margin-top:0}

/* ── Headline / Outcome ────────────────────────────────────────────────── */
.headline-block,.outcome-block{display:flex;flex-direction:column;gap:18px;justify-content:center;height:100%}
.big-headline{font-size:54px;line-height:1.15;font-weight:700;letter-spacing:-0.02em;color:#fff;max-width:1080px}
.big-subhead{font-size:22px;line-height:1.5;color:#cdd5f5;max-width:880px;font-weight:400}
.metric-card{display:inline-flex;flex-direction:column;align-items:flex-start;padding:18px 24px;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(168,85,247,0.10));border:1px solid rgba(99,102,241,0.35);border-radius:16px;align-self:flex-start;gap:6px}
.metric-value{font-size:62px;line-height:1;font-weight:800;background:var(--gradient-wide);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.02em}
.metric-label{font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:0.12em;font-weight:500}

/* ── Pillars ───────────────────────────────────────────────────────────── */
.pillars-grid{display:grid;gap:20px}
.pillars-grid.pillars-3{grid-template-columns:repeat(3,1fr)}
.pillars-grid.pillars-4{grid-template-columns:repeat(4,1fr)}
.pillars-grid.pillars-5{grid-template-columns:repeat(5,1fr)}
.pillars-grid.pillars-2{grid-template-columns:repeat(2,1fr);max-width:900px}
.pillar-card{padding:24px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01));border:1px solid var(--border);border-radius:18px;display:flex;flex-direction:column;gap:10px;min-height:200px}
.pillars-5 .pillar-card{min-height:160px;padding:18px}
.pillar-card:hover{border-color:rgba(99,102,241,0.35)}
.pillar-title{font-size:20px;font-weight:600;color:#fff;line-height:1.3}
.pillar-body{font-size:14px;line-height:1.6;color:#bcc3df}

/* ── Audience ──────────────────────────────────────────────────────────── */
.audience-grid{display:grid;gap:18px;grid-template-columns:repeat(2,1fr);max-width:1080px}
.audience-grid.audience-3,.audience-grid.audience-4{grid-template-columns:repeat(2,1fr)}
.audience-grid.audience-5,.audience-grid.audience-6{grid-template-columns:repeat(3,1fr)}
.audience-card{padding:22px 24px;border-radius:16px;background:linear-gradient(135deg,rgba(99,102,241,0.10),rgba(168,85,247,0.06));border:1px solid rgba(99,102,241,0.25);display:flex;flex-direction:column;gap:8px}
.audience-name{font-size:20px;font-weight:600;color:#fff}
.audience-insight{font-size:15px;line-height:1.55;color:#cdd5f5}

/* ── Channels ──────────────────────────────────────────────────────────── */
.channels-grid{display:grid;gap:14px;grid-template-columns:repeat(3,1fr);max-width:1080px}
.channel-chip{padding:18px 20px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid var(--border);display:flex;flex-direction:column;gap:6px}
.channel-name{font-size:17px;font-weight:600;color:#fff}
.channel-role{font-size:13px;color:var(--muted);line-height:1.5}

/* ── Timeline ──────────────────────────────────────────────────────────── */
.timeline-strip{display:grid;gap:18px;grid-template-columns:repeat(3,1fr);max-width:1180px}
.timeline-phase{padding:22px;border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01));border:1px solid var(--border);display:flex;flex-direction:column;gap:12px;position:relative}
.phase-marker{width:32px;height:32px;border-radius:50%;background:var(--gradient);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px}
.phase-label{font-size:18px;font-weight:600;color:#fff}
.phase-items{list-style:none;display:flex;flex-direction:column;gap:6px}
.phase-items li{font-size:14px;line-height:1.5;color:#cdd5f5;padding-left:14px;position:relative}
.phase-items li::before{content:"";position:absolute;left:0;top:8px;width:6px;height:6px;border-radius:50%;background:var(--accent)}

/* ── Investment ────────────────────────────────────────────────────────── */
.investment-block{display:flex;flex-direction:column;gap:24px;max-width:880px}
.invest-headline{font-size:56px;font-weight:800;background:var(--gradient-wide);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-0.02em}
.invest-breakdown{display:flex;flex-direction:column;gap:14px}
.invest-row{display:grid;grid-template-columns:1fr 56px;column-gap:16px;row-gap:6px;align-items:center}
.invest-row-head{grid-column:1 / 3;display:flex;justify-content:space-between;font-size:15px;color:#fff;font-weight:500}
.invest-label{color:#fff}
.invest-amount{color:#cdd5f5;font-variant-numeric:tabular-nums}
.invest-bar{grid-column:1;height:8px;border-radius:4px;background:rgba(255,255,255,0.06);overflow:hidden}
.invest-fill{height:100%;background:var(--gradient);border-radius:4px}
.invest-pct{grid-column:2;font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums;text-align:right}

/* ── Next steps ────────────────────────────────────────────────────────── */
.steps-list{list-style:none;display:flex;flex-direction:column;gap:14px;max-width:980px}
.step-item{display:flex;gap:18px;padding:18px 22px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:14px;align-items:flex-start}
.step-num{width:36px;height:36px;border-radius:50%;background:var(--gradient);color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.step-body{display:flex;flex-direction:column;gap:4px}
.step-title{font-size:17px;font-weight:600;color:#fff}
.step-detail{font-size:13px;line-height:1.5;color:#cdd5f5}

/* ── Nav controls ──────────────────────────────────────────────────────── */
.deck-controls{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(17,23,46,0.85);border:1px solid var(--border);border-radius:999px;backdrop-filter:blur(8px);z-index:100;font-size:13px;color:var(--muted)}
.nav-btn{width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:rgba(255,255,255,0.04);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s}
.nav-btn:hover{background:rgba(255,255,255,0.10)}
.nav-btn:disabled{opacity:0.3;cursor:not-allowed}
.deck-progress{font-variant-numeric:tabular-nums;padding:0 8px;min-width:56px;text-align:center}

/* ── Print: one slide per page ─────────────────────────────────────────── */
@media print{
  body{overflow:visible;background:#fff}
  .deck-controls{display:none}
  .deck{height:auto;width:auto;overflow:visible}
  .slide{position:relative;inset:auto;opacity:1!important;pointer-events:auto;page-break-after:always;height:100vh;min-height:100vh}
  .slide:last-child{page-break-after:auto}
}

/* ── Responsive ────────────────────────────────────────────────────────── */
@media (max-width: 900px){
  .slide{padding:32px 24px}
  .slide-title{font-size:32px}
  .cover-title{font-size:48px}
  .cover-subtitle{font-size:18px}
  .big-headline{font-size:34px}
  .big-subhead{font-size:18px}
  .metric-value{font-size:46px}
  .pillars-grid,.audience-grid,.channels-grid,.timeline-strip{grid-template-columns:repeat(2,1fr)!important;max-width:none}
  .pillars-5,.audience-grid.audience-5,.audience-grid.audience-6{grid-template-columns:repeat(2,1fr)!important}
  .cover-meta{grid-template-columns:1fr}
}
`;

const DECK_JS = `
(function(){
  var slides = document.querySelectorAll('.slide');
  var current = 0;
  var prevBtn = document.getElementById('navPrev');
  var nextBtn = document.getElementById('navNext');
  var progress = document.getElementById('navProgress');
  function render(){
    slides.forEach(function(s,i){ s.classList.toggle('is-active', i===current); });
    if(prevBtn) prevBtn.disabled = current===0;
    if(nextBtn) nextBtn.disabled = current===slides.length-1;
    if(progress) progress.textContent = (current+1)+' / '+slides.length;
    try{ history.replaceState(null,'','#'+(current+1)); }catch(e){}
  }
  function go(i){ current = Math.max(0, Math.min(slides.length-1, i)); render(); }
  document.addEventListener('keydown', function(e){
    if(e.key==='ArrowRight' || e.key===' ' || e.key==='PageDown') { go(current+1); e.preventDefault(); }
    else if(e.key==='ArrowLeft' || e.key==='PageUp') { go(current-1); e.preventDefault(); }
    else if(e.key==='Home') { go(0); e.preventDefault(); }
    else if(e.key==='End') { go(slides.length-1); e.preventDefault(); }
  });
  if(prevBtn) prevBtn.addEventListener('click', function(){ go(current-1); });
  if(nextBtn) nextBtn.addEventListener('click', function(){ go(current+1); });
  // Touch swipe
  var touchX = null;
  document.addEventListener('touchstart', function(e){ touchX = e.touches[0].clientX; }, {passive:true});
  document.addEventListener('touchend', function(e){
    if(touchX===null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if(Math.abs(dx)>50){ go(current + (dx<0 ? 1 : -1)); }
    touchX = null;
  }, {passive:true});
  // Initial slide from hash
  var h = parseInt((location.hash||'').replace('#',''),10);
  if(!isNaN(h) && h>=1 && h<=slides.length){ current = h-1; }
  render();
})();
`;

/**
 * Render a self-contained presentation deck HTML document.
 * Single-file, embedded CSS + JS, no external dependencies.
 */
export function renderPresentationHtml(data: PresentationData, _isPublicView = false): string {
  void _isPublicView; // reserved for future per-view tweaks
  const slides = data.slides ?? [];
  const total = slides.length + 1; // +1 for cover

  const cover = renderCover(data, total);
  const slideHtml = slides
    .map((s, i) => renderSlide(s, i + 1, total))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${esc(data.cover?.title ?? "Strategy Deck")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${PRESENTATION_CSS}</style>
</head>
<body>
<main class="deck">
  ${cover}
  ${slideHtml}
</main>
<div class="deck-controls" role="navigation" aria-label="Slide navigation">
  <button id="navPrev" class="nav-btn" type="button" aria-label="Previous slide">&larr;</button>
  <div id="navProgress" class="deck-progress">1 / ${total}</div>
  <button id="navNext" class="nav-btn" type="button" aria-label="Next slide">&rarr;</button>
</div>
<script>${DECK_JS}</script>
</body>
</html>`;
}

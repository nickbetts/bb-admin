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

function renderBullets(bullets: string[] | undefined): string {
  if (!bullets || bullets.length === 0) return "";
  return `<ul class="bullets-list">${bullets
    .map((b) => `<li>${esc(b)}</li>`)
    .join("")}</ul>`;
}

function renderImageMedia(slide: PresentationSlide): string {
  // Prefer the multi-image gallery when present, otherwise fall back to the
  // legacy single image field.
  const gallery = slide.images && slide.images.length > 0
    ? slide.images
    : slide.image
      ? [{ url: slide.image.url, alt: slide.image.alt }]
      : [];
  if (gallery.length === 0) return "";
  if (gallery.length === 1) {
    const img = gallery[0];
    return `<div class="slide-image"><img src="${esc(img.url)}" alt="${esc(img.alt ?? "")}" loading="lazy" /></div>`;
  }
  const tiles = gallery
    .map((img) => `<div class="gallery-tile"><img src="${esc(img.url)}" alt="${esc(img.alt ?? "")}" loading="lazy" /></div>`)
    .join("");
  return `<div class="slide-gallery gallery-${gallery.length}">${tiles}</div>`;
}

function effectiveImagePosition(slide: PresentationSlide): "left" | "right" | "top" | "background" {
  return slide.imagesPosition ?? slide.image?.position ?? "right";
}

function slideHasMedia(slide: PresentationSlide): boolean {
  return Boolean((slide.images && slide.images.length > 0) || slide.image?.url);
}

function slideHasBodyContent(slide: PresentationSlide): boolean {
  return Boolean(
    slide.headline?.trim() ||
    slide.subhead?.trim() ||
    (slide.bullets && slide.bullets.some((b) => b.trim())) ||
    (slide.pillars && slide.pillars.length > 0) ||
    (slide.audiences && slide.audiences.length > 0) ||
    (slide.channels && slide.channels.length > 0) ||
    (slide.steps && slide.steps.length > 0) ||
    (slide.phases && slide.phases.length > 0) ||
    slide.metric?.value ||
    slide.investment?.headlineFigure ||
    (slide.investment?.breakdown && slide.investment.breakdown.length > 0)
  );
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
    case "content": {
      body = `
        <div class="content-block">
          ${slide.headline ? `<div class="content-headline">${esc(slide.headline)}</div>` : ""}
          ${slide.subhead ? `<p class="content-subhead">${esc(slide.subhead)}</p>` : ""}
          ${renderBullets(slide.bullets)}
        </div>`;
      break;
    }
    case "bullets": {
      body = `
        <div class="content-block">
          ${slide.subhead ? `<p class="content-subhead">${esc(slide.subhead)}</p>` : ""}
          ${renderBullets(slide.bullets)}
        </div>`;
      break;
    }
  }

  // Append supplementary bullets to other kinds when present (excluding content/bullets where they are primary)
  if (slide.bullets && slide.bullets.length > 0 && slide.kind !== "content" && slide.kind !== "bullets") {
    body = `${body}<div class="extra-bullets">${renderBullets(slide.bullets)}</div>`;
  }

  // Image layout — wrap body in a media + content grid when one or more images are present
  const hasImage = slideHasMedia(slide);
  const imgPos = effectiveImagePosition(slide);
  const hasBody = slideHasBodyContent(slide);
  const slideClasses = ["slide"];
  if (slide.density === "compact") slideClasses.push("density-compact");
  if (hasImage) slideClasses.push("with-image", `image-${imgPos}`);
  if (hasImage && !hasBody) slideClasses.push("images-only");

  let bodyWithMedia = body;
  if (hasImage) {
    if (!hasBody) {
      // No body copy on this slide — let the gallery take the full slide-body area.
      bodyWithMedia = renderImageMedia(slide);
    } else if (imgPos === "background") {
      bodyWithMedia = `${renderImageMedia(slide)}<div class="slide-body-content">${body}</div>`;
    } else if (imgPos === "top") {
      bodyWithMedia = `${renderImageMedia(slide)}<div class="slide-body-content">${body}</div>`;
    } else {
      // left or right
      const mediaSlot = renderImageMedia(slide);
      const content = `<div class="slide-body-content">${body}</div>`;
      bodyWithMedia = imgPos === "left" ? `${mediaSlot}${content}` : `${content}${mediaSlot}`;
    }
  }

  return `
    <section class="${slideClasses.join(" ")}" data-slide-index="${index}">
      <div class="slide-inner">
        <div class="slide-head">
          ${eyebrow}
          ${counter}
        </div>
        ${title}
        <div class="slide-body">${bodyWithMedia}</div>
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

/* ── Content / Bullets ─────────────────────────────────────────────────── */
.content-block{display:flex;flex-direction:column;gap:14px;max-width:1080px;justify-content:center;height:100%}
.content-headline{font-size:38px;line-height:1.18;font-weight:700;color:#fff;letter-spacing:-0.015em;max-width:1000px}
.content-subhead{font-size:20px;line-height:1.55;color:#cdd5f5;max-width:880px;font-weight:400}
.bullets-list{list-style:none;display:flex;flex-direction:column;gap:10px;max-width:920px;padding:0;margin:0}
.bullets-list li{font-size:18px;line-height:1.55;color:#e5e7f5;padding-left:24px;position:relative}
.bullets-list li::before{content:"";position:absolute;left:4px;top:11px;width:8px;height:8px;border-radius:50%;background:var(--gradient);box-shadow:0 0 0 3px rgba(99,102,241,0.18)}
.extra-bullets{margin-top:20px}
.extra-bullets .bullets-list li{font-size:15px}

/* ── Image layout ──────────────────────────────────────────────────────── */
.slide-body-content{flex:1;display:flex;flex-direction:column;justify-content:center;min-height:0}
.slide-image{position:relative;border-radius:16px;overflow:hidden;border:1px solid var(--border);background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center}
.slide-image img{display:block;max-width:100%;max-height:100%;object-fit:cover;width:100%;height:100%}

.slide.with-image .slide-body{flex:1;display:grid;gap:32px;min-height:0}
.slide.with-image.image-right .slide-body{grid-template-columns:1.2fr 1fr}
.slide.with-image.image-left .slide-body{grid-template-columns:1fr 1.2fr}
.slide.with-image.image-left .slide-image{order:-1}
.slide.with-image.image-top .slide-body{grid-template-rows:auto 1fr}
.slide.with-image.image-top .slide-image{height:300px}
/* Slide has only images (no body copy) — let the gallery fill the slide body */
.slide.with-image.images-only .slide-body{display:flex;grid-template-columns:none;grid-template-rows:none}
.slide.with-image.images-only .slide-image,.slide.with-image.images-only .slide-gallery{flex:1;width:100%;height:100%}
.slide.with-image.images-only.image-top .slide-gallery,.slide.with-image.images-only.image-top .slide-image{height:auto}
.slide.with-image.image-background .slide-image,.slide.with-image.image-background .slide-gallery{position:absolute;inset:0;z-index:0;opacity:0.18;border:none;border-radius:0}
.slide.with-image.image-background .slide-image::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,16,32,0.4),rgba(11,16,32,0.85))}
.slide.with-image.image-background .slide-inner{position:relative;z-index:1}

/* ── Multi-image gallery ───────────────────────────────────────────────── */
.slide-gallery{position:relative;border-radius:16px;overflow:hidden;display:grid;gap:8px;background:rgba(255,255,255,0.02)}
.slide-gallery .gallery-tile{overflow:hidden;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,0.03);min-height:0}
.slide-gallery .gallery-tile img{display:block;width:100%;height:100%;object-fit:cover}
.gallery-2{grid-template-columns:1fr 1fr}
.gallery-3{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.gallery-3 .gallery-tile:nth-child(1){grid-column:1 / 3}
.gallery-4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.gallery-5{grid-template-columns:repeat(6,1fr);grid-template-rows:1fr 1fr}
.gallery-5 .gallery-tile:nth-child(1){grid-column:1 / 4}
.gallery-5 .gallery-tile:nth-child(2){grid-column:4 / 7}
.gallery-5 .gallery-tile:nth-child(3){grid-column:1 / 3}
.gallery-5 .gallery-tile:nth-child(4){grid-column:3 / 5}
.gallery-5 .gallery-tile:nth-child(5){grid-column:5 / 7}
/* When a multi-image gallery sits at the top, give it a fixed band */
.slide.with-image.image-top .slide-gallery{height:300px}
/* When background, just stack as a single-image cover */
.slide.with-image.image-background .slide-gallery{display:block}
.slide.with-image.image-background .slide-gallery .gallery-tile{position:absolute;inset:0;border:none;border-radius:0}
.slide.with-image.image-background .slide-gallery .gallery-tile:not(:first-child){display:none}

/* ── Density ───────────────────────────────────────────────────────────── */
.slide.density-compact .slide-title{font-size:36px}
.slide.density-compact .content-headline{font-size:30px}
.slide.density-compact .content-subhead{font-size:16px}
.slide.density-compact .bullets-list li{font-size:15px}
.slide.density-compact .pillar-title{font-size:17px}
.slide.density-compact .pillar-body{font-size:13px}
.slide.density-compact .audience-name{font-size:17px}
.slide.density-compact .audience-insight{font-size:13px}
.slide.density-compact .channel-name{font-size:15px}
.slide.density-compact .channel-role{font-size:12px}
.slide.density-compact .big-headline{font-size:42px}
.slide.density-compact .big-subhead{font-size:18px}
.slide.density-compact .step-title{font-size:15px}
.slide.density-compact .step-detail{font-size:12px}

/* ── Auto-fit scaling — applied via JS data-fit attribute ──────────────── */
.slide[data-fit-scale]{--fit-scale:attr(data-fit-scale number, 1)}
.slide.fit-90 .slide-title,.slide.fit-90 .content-headline,.slide.fit-90 .big-headline{font-size:90%}
.slide.fit-90 .bullets-list li,.slide.fit-90 .content-subhead,.slide.fit-90 .big-subhead{font-size:90%}
.slide.fit-80 .slide-title{font-size:38px}
.slide.fit-80 .content-headline{font-size:30px}
.slide.fit-80 .content-subhead,.slide.fit-80 .bullets-list li{font-size:16px}
.slide.fit-80 .big-headline{font-size:44px}
.slide.fit-80 .big-subhead{font-size:18px}
.slide.fit-80 .pillar-title{font-size:17px}
.slide.fit-80 .pillar-body{font-size:13px}
.slide.fit-80 .audience-name{font-size:17px}
.slide.fit-80 .audience-insight{font-size:13px}
.slide.fit-70 .slide-title{font-size:32px}
.slide.fit-70 .content-headline{font-size:26px}
.slide.fit-70 .content-subhead,.slide.fit-70 .bullets-list li{font-size:14px}
.slide.fit-70 .big-headline{font-size:36px}
.slide.fit-70 .big-subhead{font-size:16px}
.slide.fit-70 .pillar-title{font-size:15px}
.slide.fit-70 .pillar-body{font-size:12px}
.slide.fit-70 .audience-name{font-size:15px}
.slide.fit-70 .audience-insight{font-size:12px}
.slide.fit-70 .step-title{font-size:14px}
.slide.fit-70 .step-detail{font-size:12px}

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
  .slide.with-image.image-right .slide-body,.slide.with-image.image-left .slide-body{grid-template-columns:1fr;grid-template-rows:240px 1fr}
  .slide.with-image.image-left .slide-image{order:-1}
}
`;

const DECK_JS = `
(function(){
  var slides = document.querySelectorAll('.slide');
  var current = 0;
  var didInit = false;
  var prevBtn = document.getElementById('navPrev');
  var nextBtn = document.getElementById('navNext');
  var progress = document.getElementById('navProgress');
  function notifyParent(){
    // Don't notify on initial render — the parent already knows the active
    // slide it asked for, and during a save the inline iframe reloads in the
    // background and would otherwise race and stomp the parent's state.
    if(!didInit) return;
    try{ if(window.parent&&window.parent!==window) window.parent.postMessage({type:'pres:slide-change',index:current,total:slides.length},'*'); }catch(e){}
  }
  // Auto-fit: if a slide's content overflows the inner box, step down a fit class.
  // Runs once on load and again after image loads / resize.
  function autoFitSlide(slide){
    var inner = slide.querySelector('.slide-inner');
    if(!inner) return;
    slide.classList.remove('fit-90','fit-80','fit-70');
    var steps = ['fit-90','fit-80','fit-70'];
    var i = 0;
    while ((inner.scrollHeight > slide.clientHeight - 8 || inner.scrollWidth > slide.clientWidth - 8) && i < steps.length){
      slide.classList.add(steps[i]);
      // remove previous step so we don't stack
      if(i>0) slide.classList.remove(steps[i-1]);
      i++;
    }
  }
  function autoFitAll(){
    // Briefly mark each slide active so we can measure (then restore)
    var prev = current;
    slides.forEach(function(s,i){
      var wasActive = s.classList.contains('is-active');
      s.classList.add('is-active');
      autoFitSlide(s);
      if(!wasActive) s.classList.remove('is-active');
    });
    // Reapply current
    if(slides[prev]) slides[prev].classList.add('is-active');
  }
  function render(){
    slides.forEach(function(s,i){ s.classList.toggle('is-active', i===current); });
    if(prevBtn) prevBtn.disabled = current===0;
    if(nextBtn) nextBtn.disabled = current===slides.length-1;
    if(progress) progress.textContent = (current+1)+' / '+slides.length;
    try{ history.replaceState(null,'','#'+(current+1)); }catch(e){}
    notifyParent();
  }
  function go(i){ current = Math.max(0, Math.min(slides.length-1, i)); render(); }
  document.addEventListener('keydown', function(e){
    if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')) return;
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
  // Listen for parent commands (goto, sync)
  window.addEventListener('message', function(event){
    var d=event&&event.data;
    if(!d||typeof d!=='object') return;
    if(d.type==='pres:goto-slide'&&typeof d.index==='number') go(d.index);
  });
  // Initial slide from hash
  var h = parseInt((location.hash||'').replace('#',''),10);
  if(!isNaN(h) && h>=1 && h<=slides.length){ current = h-1; }
  render();
  didInit = true;
  // Run auto-fit after fonts and any images have settled.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function(){ setTimeout(autoFitAll, 30); });
  } else {
    setTimeout(autoFitAll, 100);
  }
  document.querySelectorAll('.slide-image img, .slide-gallery img').forEach(function(img){
    if (img.complete) return;
    img.addEventListener('load', function(){ autoFitAll(); });
  });
  var resizeT;
  window.addEventListener('resize', function(){ clearTimeout(resizeT); resizeT = setTimeout(autoFitAll, 120); });
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

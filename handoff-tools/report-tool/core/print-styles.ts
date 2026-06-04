export const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1e293b; }
  .print-only-hide { display: flex; }
  @media print {
    .print-only-hide { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }
    @page { margin: 16mm 14mm; }
  }
  .cover { background: var(--gradient-accent); color: #fff; padding: 52px 56px; }
  .cover h1 { font-size: 30px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2; margin-bottom: 10px; }
  .cover p { font-size: 14px; color: rgba(255,255,255,0.72); }
  .cover-meta { display: flex; align-items: center; justify-content: space-between; padding: 14px 56px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
  .section-card { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 32px; }
  .section-header { display: flex; align-items: center; gap: 8px; padding: 16px 24px; border-bottom: 1px solid #f1f5f9; background: #fafbfc; }
  .section-body { padding: 20px 24px; }
  .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; }
  .badge-slate { background: #f1f5f9; color: #475569; }
  .badge-indigo { background: #eef2ff; color: #4338ca; }
  .badge-blue { background: #eff6ff; color: #1d4ed8; }
  .badge-orange { background: #fff7ed; color: #c2410c; }
  .badge-green { background: #ecfdf5; color: #065f46; }
  .badge-purple { background: #f5f3ff; color: #6d28d9; }
  .badge-amber { background: #fffbeb; color: #b45309; }
  .badge-emerald { background: #ecfdf5; color: #047857; }
  .commentary-box { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 14px 18px; }
  .commentary-label { font-size: 10px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px; }
  .commentary-text { font-size: 14px; color: #1e293b; line-height: 1.7; white-space: pre-wrap; }
  .content-text { font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-wrap; }
  .screenshots-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; }
  .screenshot-item { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .screenshot-item img { width: 100%; display: block; object-fit: cover; }
  .screenshot-caption { padding: 7px 12px; background: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; }
  .toc { margin-bottom: 40px; padding: 20px 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
  .toc h2 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 12px; }
  .toc-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .toc-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #475569; }
  .toc-num { font-size: 11px; font-weight: 600; color: #c8d3e0; width: 18px; text-align: right; }
`;

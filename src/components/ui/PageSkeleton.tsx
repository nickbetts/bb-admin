export function PageSkeleton({ title = true, cards = 3, rows = 5 }: { title?: boolean; cards?: number; rows?: number }) {
  return (
    <div className="page">
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .skeleton-shimmer {
          background: linear-gradient(90deg, var(--border-subtle) 25%, var(--surface) 37%, var(--border-subtle) 63%);
          background-size: 800px 100%;
          animation: shimmer 1.4s infinite linear;
        }
      `}</style>
      {title && (
        <div style={{ marginBottom: 48 }}>
          <div className="skeleton-shimmer" style={{ height: 28, width: 200, borderRadius: "var(--r-sm)" }} />
          <div className="skeleton-shimmer" style={{ height: 16, width: 300, borderRadius: "var(--r-sm)", marginTop: 8 }} />
        </div>
      )}
      {cards > 0 && (
        <div className="grid-3" style={{ marginBottom: 32 }}>
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="card" style={{ height: 120 }}>
              <div className="card-body">
                <div className="skeleton-shimmer" style={{ height: 12, width: 80, borderRadius: "var(--r-sm)" }} />
                <div className="skeleton-shimmer" style={{ height: 24, width: 60, borderRadius: "var(--r-sm)", marginTop: 12 }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {rows > 0 && (
        <div className="card">
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="skeleton-shimmer" style={{ height: 16, borderRadius: "var(--r-sm)", width: `${85 - i * 8}%` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

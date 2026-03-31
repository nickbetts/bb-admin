export function PageSkeleton({ title = true, cards = 3, rows = 5 }: { title?: boolean; cards?: number; rows?: number }) {
  return (
    <div className="page" style={{ animation: "pulse 2s ease-in-out infinite" }}>
      {title && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ height: 28, width: 200, background: "var(--border)", borderRadius: "var(--r-sm)" }} />
          <div style={{ height: 16, width: 300, background: "var(--border-subtle)", borderRadius: "var(--r-sm)", marginTop: 8 }} />
        </div>
      )}
      {cards > 0 && (
        <div className="grid-3" style={{ marginBottom: 32 }}>
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="card" style={{ height: 120 }}>
              <div className="card-body">
                <div style={{ height: 12, width: 80, background: "var(--border-subtle)", borderRadius: "var(--r-sm)" }} />
                <div style={{ height: 24, width: 60, background: "var(--border)", borderRadius: "var(--r-sm)", marginTop: 12 }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {rows > 0 && (
        <div className="card">
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} style={{ height: 16, background: "var(--border-subtle)", borderRadius: "var(--r-sm)", width: `${85 - i * 8}%` }} />
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}

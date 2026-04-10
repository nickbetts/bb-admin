/**
 * SectionSkeleton — shimmer placeholder for a channel section while data loads.
 * Shows metric card skeletons + optional table rows.
 */

interface SectionSkeletonProps {
  /** Number of metric card skeletons. Default: 4 */
  cards?: number;
  /** Number of table row skeletons. 0 = no table. Default: 0 */
  tableRows?: number;
  className?: string;
}

function SkeletonBlock({ height = 12, width = "100%", radius = 6 }: { height?: number; width?: number | string; radius?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        width,
        borderRadius: radius,
        background: "var(--border)",
        animation: "shimmer 1.4s ease-in-out infinite",
        backgroundImage: "linear-gradient(90deg, var(--border) 0%, var(--border-subtle) 50%, var(--border) 100%)",
        backgroundSize: "400% 100%",
      }}
    />
  );
}

export function SectionSkeleton({ cards = 4, tableRows = 0, className }: SectionSkeletonProps) {
  const colClass =
    cards <= 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
      : cards <= 3
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      : "grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4";

  return (
    <div className={className} aria-busy="true" aria-label="Loading section data">
      {/* Metric cards */}
      <div className={colClass}>
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <SkeletonBlock height={11} width="55%" />
            <SkeletonBlock height={22} width="70%" />
            <SkeletonBlock height={10} width="40%" />
          </div>
        ))}
      </div>

      {/* Table */}
      {tableRows > 0 && (
        <div
          style={{
            marginTop: 24,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
            <SkeletonBlock height={11} width="30%" />
          </div>
          {/* Rows */}
          {Array.from({ length: tableRows }).map((_, i) => (
            <div
              key={i}
              style={{
                padding: "12px 16px",
                borderBottom: i < tableRows - 1 ? "1px solid var(--border-subtle)" : undefined,
                display: "flex",
                gap: 16,
              }}
            >
              <SkeletonBlock height={11} width="40%" />
              <SkeletonBlock height={11} width="20%" />
              <SkeletonBlock height={11} width="20%" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

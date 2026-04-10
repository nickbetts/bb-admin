import { ReactNode } from "react";

interface MetricGridProps {
  /** Number of columns on desktop. Default: 4 */
  cols?: 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  className?: string;
}

const COL_CLASS: Record<number, string> = {
  2: "grid grid-cols-1 sm:grid-cols-2",
  3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4",
  5: "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  6: "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
};

export function MetricGrid({ cols = 4, children, className }: MetricGridProps) {
  return (
    <div className={`${COL_CLASS[cols]} gap-4 ${className ?? ""}`}>
      {children}
    </div>
  );
}

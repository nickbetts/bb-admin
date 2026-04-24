import { PillarSidebar } from "../_components/PillarSidebar";
import { TopBar } from "../_components/PillarUI";

export default function PillarGatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <PillarSidebar />
      <main className="app-main" style={{ display: "flex", flexDirection: "column" }}>
        <TopBar alerts={3} />
        <div style={{ flex: 1 }}>{children}</div>
      </main>
    </div>
  );
}

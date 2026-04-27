import { PillarCommsSidebar } from "../_components/PillarCommsSidebar";
import { TopBar } from "../_components/PillarCommsUI";

export default function PillarCommsGatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell" data-theme="light">
      <PillarCommsSidebar />
      <main className="app-main" style={{ display: "flex", flexDirection: "column" }}>
        <TopBar alerts={7} />
        <div style={{ flex: 1 }}>{children}</div>
      </main>
    </div>
  );
}

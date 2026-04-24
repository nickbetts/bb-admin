import { PillarSidebar } from "../_components/PillarSidebar";

export default function PillarGatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <PillarSidebar />
      <main className="app-main">{children}</main>
    </div>
  );
}

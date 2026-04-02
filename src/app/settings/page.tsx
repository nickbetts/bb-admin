import { SettingsPanel } from "@/components/admin/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-desc">Manage global integrations and API configuration</p>
        </div>
      </div>
      <SettingsPanel />
    </div>
  );
}

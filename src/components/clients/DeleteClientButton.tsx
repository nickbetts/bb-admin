"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface Props {
  clientId: string;
  clientName: string;
}

export function DeleteClientButton({ clientId, clientName }: Props) {
  const confirm = useConfirm();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Delete ${clientName}?`,
      description:
        "This will permanently delete the client and all associated data including reports, goals, and communications. This action cannot be undone.",
      confirmLabel: "Delete client",
      cancelLabel: "Cancel",
      danger: true,
    });

    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete client");
      }
      router.push("/clients");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete client");
      setDeleting(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 40,
        padding: 24,
        borderRadius: "var(--r-lg)",
        border: "1px solid rgba(239,68,68,0.25)",
        background: "rgba(239,68,68,0.04)",
      }}
    >
      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#dc2626", marginBottom: 6 }}>
        Danger Zone
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 16 }}>
        Permanently delete this client and all associated data. This action cannot be undone.
      </p>
      {error && (
        <p style={{ fontSize: 13, color: "#dc2626", marginBottom: 12 }}>{error}</p>
      )}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="btn btn-sm"
        style={{
          background: "#dc2626",
          color: "#fff",
          border: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          opacity: deleting ? 0.6 : 1,
          cursor: deleting ? "not-allowed" : "pointer",
        }}
      >
        <Trash2 style={{ width: 14, height: 14 }} />
        {deleting ? "Deleting…" : "Delete client"}
      </button>
    </div>
  );
}

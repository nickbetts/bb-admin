"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, FileText, Download, Trash2, Loader2, Search, AlertCircle, Pencil, Check, X } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";

interface ClientFileRecord {
  id: string;
  blobUrl: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  description: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string | null; email: string };
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ClientFilesView({ clientId }: { clientId: string }) {
  const confirm = useConfirm();
  const [files, setFiles] = useState<ClientFileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients/${clientId}/files`, { cache: "no-store" });
    if (res.ok) setFiles(await res.json() as ClientFileRecord[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  async function uploadFiles(list: FileList | File[]) {
    const arr = Array.from(list);
    if (arr.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of arr) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/clients/${clientId}/files`, { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: string };
          setError(err.error ?? `Failed to upload ${file.name}`);
          continue;
        }
        const created = await res.json() as ClientFileRecord;
        setFiles((f) => [created, ...f]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(file: ClientFileRecord) {
    if (!(await confirm({ title: `Delete "${file.fileName}"?`, confirmLabel: "Delete", danger: true }))) return;
    const res = await fetch(`/api/clients/${clientId}/files/${file.id}`, { method: "DELETE" });
    if (res.ok) setFiles((f) => f.filter((x) => x.id !== file.id));
  }

  async function saveDescription(id: string) {
    const res = await fetch(`/api/clients/${clientId}/files/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: editDesc }),
    });
    if (res.ok) {
      const updated = await res.json() as ClientFileRecord;
      setFiles((f) => f.map((x) => x.id === id ? updated : x));
      setEditingId(null);
    }
  }

  const filtered = search.trim()
    ? files.filter((f) =>
        f.fileName.toLowerCase().includes(search.toLowerCase())
        || (f.description ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : files;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", gap: 12, alignItems: "center",
        padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)",
      }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--text-3)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="form-input"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto" }}
        >
          {uploading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <Upload style={{ width: 14, height: 14 }} />}
          Upload files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => e.target.files && void uploadFiles(e.target.files)}
        />
      </div>

      {error && (
        <div style={{
          margin: 16, padding: "10px 14px",
          background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: 8, fontSize: 13, color: "var(--danger)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Drop zone + list */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) void uploadFiles(e.dataTransfer.files);
        }}
        style={{
          padding: 16, minHeight: 240,
          background: dragOver ? "rgba(59, 130, 246, 0.05)" : "transparent",
          transition: "background 0.15s",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: "var(--text-3)" }}>
            <Loader2 className="animate-spin" style={{ width: 20, height: 20 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Upload style={{ width: 36, height: 36, color: "var(--text-4)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 4px" }}>
              {search ? "No matching files" : "No files yet"}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-3)", margin: 0 }}>
              {search ? "Try a different search term." : "Drop files here or click \u201CUpload files\u201D."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {filtered.map((f) => {
              const isImage = f.contentType.startsWith("image/");
              return (
                <div key={f.id} style={{
                  display: "flex", flexDirection: "column", gap: 10,
                  padding: 12, borderRadius: 12,
                  background: "var(--bg)", border: "1px solid var(--border-subtle)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.blobUrl} alt={f.fileName} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                        background: "var(--bg-2)", border: "1px solid var(--border-subtle)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--text-3)",
                      }}>
                        <FileText style={{ width: 18, height: 18 }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a
                        href={f.blobUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 13, fontWeight: 600, color: "var(--text)",
                          textDecoration: "none", display: "block",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        {f.fileName}
                      </a>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                        {formatBytes(f.sizeBytes)} · {new Date(f.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  </div>

                  {editingId === f.id ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Add a description…"
                        className="form-input"
                        style={{ flex: 1, fontSize: 12, padding: "6px 8px" }}
                        autoFocus
                      />
                      <button onClick={() => void saveDescription(f.id)} className="btn btn-primary btn-sm" style={{ padding: "4px 8px" }}>
                        <Check style={{ width: 12, height: 12 }} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn btn-secondary btn-sm" style={{ padding: "4px 8px" }}>
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--text-2)", minHeight: 18 }}>
                      {f.description || <span style={{ color: "var(--text-4)", fontStyle: "italic" }}>No description</span>}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: "auto", borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--text-4)", marginRight: "auto", alignSelf: "center" }}>
                      by {f.uploadedBy.name ?? f.uploadedBy.email}
                    </span>
                    <button
                      onClick={() => { setEditingId(f.id); setEditDesc(f.description ?? ""); }}
                      title="Edit description"
                      style={{ background: "transparent", border: "none", color: "var(--text-3)", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex" }}
                    >
                      <Pencil style={{ width: 13, height: 13 }} />
                    </button>
                    <a
                      href={f.blobUrl}
                      download={f.fileName}
                      title="Download"
                      style={{ color: "var(--text-3)", display: "flex", padding: 4, borderRadius: 4 }}
                    >
                      <Download style={{ width: 13, height: 13 }} />
                    </a>
                    <button
                      onClick={() => void handleDelete(f)}
                      title="Delete"
                      style={{ background: "transparent", border: "none", color: "var(--text-4)", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex" }}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

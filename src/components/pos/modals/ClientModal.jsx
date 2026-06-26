import React, { useState } from "react";
import { IconUserOff, IconRefresh, IconAlertCircle, IconUsers, IconLoader2 } from "@tabler/icons-react";
import usePosStore from "../../../store/usePosStore";
import { C, fmt } from "../posTheme";
import Modal from "../ui/Modal";
import Btn from "../ui/Btn";

export default function ClientModal() {
  const {
    clientModal, closeClientModal,
    assignClient, cartClient, clearClient,
    clients, clientsLoading, clientsError,
    loadClients,
  } = usePosStore();

  const [search, setSearch] = useState("");

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone_number && c.phone_number.includes(search))
  );

  // Reset search when modal closes
  const handleClose = () => {
    setSearch("");
    closeClientModal();
  };

  return (
    <Modal open={clientModal} onClose={handleClose} title="Assign client" width={440}>
      <div style={{ padding: "16px 20px" }}>

        {/* ── Search input ─────────────────────────────────────────────── */}
        <input
          autoFocus
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={clientsLoading}
          style={{
            width: "100%", height: 38, borderRadius: 8,
            border: `1px solid ${C.border}`, padding: "0 12px",
            fontSize: 13, fontFamily: "inherit", outline: "none",
            marginBottom: 10, opacity: clientsLoading ? 0.5 : 1,
          }}
        />

        {/* ── Loading state ────────────────────────────────────────────── */}
        {clientsLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0", gap: 10, color: C.text3 }}>
            <IconLoader2 size={26} stroke={1.75} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: 13 }}>Loading customers…</span>
          </div>
        )}

        {/* ── Error state ──────────────────────────────────────────────── */}
        {clientsError && !clientsLoading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 0", gap: 10 }}>
            <IconAlertCircle size={28} stroke={1.5} style={{ color: C.danger, opacity: 0.8 }} />
            <div style={{ fontSize: 13, color: C.danger, textAlign: "center" }}>Failed to load customers</div>
            <div style={{ fontSize: 11, color: C.text3, textAlign: "center", maxWidth: 260 }}>{clientsError}</div>
            <button
              onClick={() => loadClients()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "7px 14px", borderRadius: 8,
                border: `1px solid ${C.border}`, background: C.surface,
                cursor: "pointer", fontSize: 12, color: C.text2, fontFamily: "inherit",
              }}
            >
              <IconRefresh size={13} stroke={2} /> Retry
            </button>
          </div>
        )}

        {/* ── Client list ──────────────────────────────────────────────── */}
        {!clientsLoading && !clientsError && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0", color: C.text3, gap: 8 }}>
                <IconUsers size={28} stroke={1} style={{ opacity: 0.4 }} />
                <div style={{ fontSize: 13 }}>
                  {search ? "No customers match your search" : "No customers found"}
                </div>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{ fontSize: 11, color: C.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              filtered.map((c) => {
                const active = cartClient?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => { assignClient(c); handleClose(); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", borderRadius: 10, textAlign: "left",
                      border: `1.5px solid ${active ? C.accent : C.border}`,
                      background: active ? C.accent + "0D" : C.surface,
                      cursor: "pointer", fontFamily: "inherit", transition: "border-color 0.12s",
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = C.accent + "66"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = C.border; }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: C.text1 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>
                        {c.phone_number || "No phone"} · {c.address || "No address"}
                      </div>
                    </div>
                    {c.total_debt > 0 && (
                      <span style={{
                        fontSize: 11, background: "#FCEBEB", color: C.danger,
                        borderRadius: 5, padding: "2px 7px", fontWeight: 600, flexShrink: 0, marginLeft: 8,
                      }}>
                        Debt: {fmt(c.total_debt)}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* ── Remove current client ─────────────────────────────────────── */}
        {cartClient && !clientsLoading && (
          <Btn
            onClick={() => { clearClient(); handleClose(); }}
            variant="outline"
            style={{ width: "100%", marginTop: 12, color: C.danger, justifyContent: "center" }}
          >
            <IconUserOff size={15} stroke={2} /> Remove assigned client
          </Btn>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
}
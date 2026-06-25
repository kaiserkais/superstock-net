import React, { useState } from "react";
import { IconUserOff } from "@tabler/icons-react";
import usePosStore, { MOCK_CLIENTS } from "../../../store/usePosStore";
import { C, fmt } from "../posTheme";
import Modal from "../ui/Modal";
import Btn from "../ui/Btn";

export default function ClientModal() {
  const { clientModal, closeClientModal, assignClient, cartClient, clearClient } = usePosStore();
  const [search, setSearch] = useState("");

  const filtered = MOCK_CLIENTS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone_number.includes(search)
  );

  return (
    <Modal open={clientModal} onClose={closeClientModal} title="Assign client" width={440}>
      <div style={{ padding: "16px 20px" }}>
        <input
          autoFocus
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 12px", fontSize: 13, fontFamily: "inherit", outline: "none", marginBottom: 12 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {filtered.map((c) => {
            const active = cartClient?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => { assignClient(c); closeClientModal(); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${active ? C.accent : C.border}`,
                  background: active ? C.accent + "0D" : C.surface, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text1 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: C.text3 }}>{c.phone_number} · {c.address}</div>
                </div>
                {c.total_debt > 0 && (
                  <span style={{ fontSize: 11, background: "#FCEBEB", color: C.danger, borderRadius: 5, padding: "2px 7px", fontWeight: 600 }}>
                    Debt: {fmt(c.total_debt)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {cartClient && (
          <Btn onClick={() => { clearClient(); closeClientModal(); }} variant="outline" style={{ width: "100%", marginTop: 12, color: C.danger }}>
            <IconUserOff size={15} stroke={2} /> Remove client
          </Btn>
        )}
      </div>
    </Modal>
  );
}
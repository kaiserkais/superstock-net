import React from "react";
import { IconPlayerPause, IconPlayerPlay, IconX } from "@tabler/icons-react";
import usePosStore from "../../store/usePosStore";
import { C, fmt } from "./posTheme";

export default function ParkedCarts() {
  const { parkedCarts, restoreParkedCart, deleteParkedCart } = usePosStore();

  if (parkedCarts.length === 0) {
    return (
      <div style={{ padding: "12px", textAlign: "center", color: C.text3, fontSize: 12 }}>
        <IconPlayerPause size={22} stroke={1.25} style={{ display: "block", margin: "0 auto 6px", opacity: 0.4 }} />
        No parked carts
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
      {parkedCarts.map((c) => {
        const t = c.items.reduce((s, i) => s + i.lineTotal, 0);
        const ts = new Date(c.parkedAt);
        const timeStr = ts.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" });
        return (
          <div
            key={c.id}
            style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: "9px 11px", display: "flex", alignItems: "center", gap: 8 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</div>
              <div style={{ fontSize: 11, color: C.text3 }}>{c.items.length} item{c.items.length !== 1 ? "s" : ""} · {fmt(t)} · {timeStr}</div>
            </div>
            <button
              onClick={() => restoreParkedCart(c.id)}
              title="Restore"
              style={{ background: C.accent + "18", border: "none", borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: C.accent, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500 }}
            >
              <IconPlayerPlay size={12} stroke={2.5} /> Restore
            </button>
            <button
              onClick={() => deleteParkedCart(c.id)}
              title="Delete"
              style={{ background: "none", border: "none", borderRadius: 7, padding: 5, cursor: "pointer", color: C.text3 }}
            >
              <IconX size={13} stroke={2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
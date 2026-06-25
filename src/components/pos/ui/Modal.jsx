import React, { useEffect } from "react";
import { IconX } from "@tabler/icons-react";
import { C } from "../posTheme";

export default function Modal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(20,20,30,0.55)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.card, borderRadius: 16, width: "100%", maxWidth: width,
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          display: "flex", flexDirection: "column", maxHeight: "90vh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: C.text1 }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.text3, borderRadius: 6, padding: 4 }}
          >
            <IconX size={18} stroke={2} />
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
import React, { useEffect } from "react";
import { IconCheck, IconAlertTriangle } from "@tabler/icons-react";
import { C } from "../posTheme";

export default function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  const bg = type === "success" ? C.success : type === "error" ? C.danger : C.accent;
  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      background: bg, color: "#fff", borderRadius: 10, padding: "10px 18px",
      fontSize: 13, fontWeight: 500, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      {type === "success" ? <IconCheck size={15} stroke={2.5} /> : <IconAlertTriangle size={15} stroke={2} />}
      {message}
    </div>
  );
}
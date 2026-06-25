import React from "react";
import { C } from "../posTheme";

export default function Badge({ children, color = C.accent, bg }) {
  return (
    <span style={{
      background: bg || color + "22", color,
      fontSize: 10, fontWeight: 600, padding: "2px 7px",
      borderRadius: 5, letterSpacing: "0.02em",
    }}>
      {children}
    </span>
  );
}
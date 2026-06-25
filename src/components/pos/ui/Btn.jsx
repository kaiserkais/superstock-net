import React from "react";
import { C } from "../posTheme";

export default function Btn({ children, onClick, variant = "ghost", size = "md", style: sx, disabled, className = "" }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 6, border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 500, fontFamily: "inherit", transition: "all 0.13s", opacity: disabled ? 0.5 : 1,
  };
  const sizes = { 
    sm: { fontSize: 12, padding: "5px 10px", height: 30 }, 
    md: { fontSize: 13, padding: "0 14px", height: 36 }, 
    lg: { fontSize: 14, padding: "0 18px", height: 42 } 
  };
  const variants = {
    primary:  { background: C.accent,   color: "#fff"  },
    danger:   { background: C.danger,   color: "#fff"  },
    success:  { background: C.success,  color: "#fff"  },
    outline:  { background: "transparent", color: C.text2, border: `1px solid ${C.border}` },
    ghost:    { background: "transparent", color: C.text2 },
    dark:     { background: C.sidebar,  color: "#fff"  },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...sx }}
      className={className}
    >
      {children}
    </button>
  );
}
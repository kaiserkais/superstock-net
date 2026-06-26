import React, { useState, useEffect, useRef } from "react";
import { IconBarcode, IconChevronRight } from "@tabler/icons-react";
import usePosStore from "../../store/usePosStore";
import { C } from "./posTheme";
import Btn from "./ui/Btn";

export default function BarcodeBar({ activeMode, setActiveMode }) {
  const { processBarcode, barcodeBuffer, setBarcodeBuffer } = usePosStore();
  const [flash, setFlash] = useState(null); 
  const inputRef = useRef();

  const handleSubmit = (e) => {
    e?.preventDefault();
    const result = processBarcode(barcodeBuffer);
    setBarcodeBuffer("");
    if (!result) return;
    if (result.type === "not_found") {
      setFlash("error");
      setTimeout(() => setFlash(null), 900);
    } else {
      setFlash("success");
      setTimeout(() => setFlash(null), 600);
    }
  };

  // Auto-focus when barcode mode becomes active
  useEffect(() => {
    if (activeMode === "barcode") {
      inputRef.current?.focus();
    }
  }, [activeMode]);

  useEffect(() => {
    const handler = (e) => {
      if (activeMode !== "barcode") return; // Skip if text search mode handles focus
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      inputRef.current?.focus();
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [activeMode]);

  if (activeMode !== "barcode") return null; // Safe hidden layout collapsing 

  const borderColor = flash === "success" ? C.success : flash === "error" ? C.danger : C.border;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0, alignItems: "center" }}>
      
      {/* Mode Select Button */}
      <button
        type="button"
        onClick={() => setActiveMode("search")}
        title="Switch to Name/Ref Search (F2)"
        style={{ height: 38, padding: "0 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text2, display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none" }}
      >
        <IconBarcode size={15} style={{ color: C.accent }} />
        <span>BARCODE (F2)</span>
      </button>

      <div style={{ position: "relative", flex: 1 }}>
        <input
          ref={inputRef}
          value={barcodeBuffer}
          
          onChange={(e) => setBarcodeBuffer(e.target.value)}
          placeholder="Scan physical codebar item here..."
          autoFocus
          style={{
            width: "100%", height: 38, paddingLeft: 12, paddingRight: 12,
            borderRadius: 8, border: `1.5px solid ${borderColor}`,
            fontSize: 13, fontFamily: "inherit", outline: "none",
            background: flash === "error" ? "#FFF0F0" : flash === "success" ? "#F0FFF6" : C.surface,
            transition: "border-color 0.1s, background 0.1s",
          }}
        />
      </div>
      <Btn variant="primary" size="md" onClick={handleSubmit} style={{ height: 38, paddingLeft: 14, paddingRight: 14 }}>
        <IconChevronRight size={16} stroke={2.5} />
      </Btn>
    </form>
  );
}
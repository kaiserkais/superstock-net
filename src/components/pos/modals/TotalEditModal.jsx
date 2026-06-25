import React, { useState, useEffect } from "react";
import { IconTag, IconPlus, IconCheck, IconX } from "@tabler/icons-react";
import usePosStore from "../../../store/usePosStore";
import { C, fmt } from "../posTheme";
import Modal from "../ui/Modal";
import Btn from "../ui/Btn";

export default function TotalEditModal() {
  const {
    totalEditModal, closeTotalEditModal,
    setCartAdjustment, clearCartAdjustment,
    cartAdjustment, getCartTotals,
  } = usePosStore();

  const [adjType, setAdjType] = useState("discount");
  const [value, setValue] = useState("");

  // Seed from current adjustment when modal opens
  useEffect(() => {
    if (totalEditModal) {
      setAdjType(cartAdjustment.type);
      setValue(cartAdjustment.value > 0 ? String(cartAdjustment.value) : "");
    }
  }, [totalEditModal]);

  if (!totalEditModal) return null;

  const { subtotal } = getCartTotals();
  const parsed = parseFloat(value) || 0;

  const preview =
    adjType === "discount"
      ? Math.max(0, subtotal - parsed)
      : subtotal + parsed;

  const confirm = () => {
    if (parsed > 0) {
      setCartAdjustment(adjType, parsed);
    } else {
      clearCartAdjustment();
    }
    closeTotalEditModal();
  };

  const remove = () => {
    clearCartAdjustment();
    closeTotalEditModal();
  };

  return (
    <Modal open title="Adjust total" onClose={closeTotalEditModal} width={380}>
      <div style={{ padding: "18px 20px 20px" }}>

        {/* Type selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {[
            { key: "discount",  label: "Discount",  Icon: IconTag,  color: C.success },
            { key: "surcharge", label: "Surcharge", Icon: IconPlus, color: C.warning },
          ].map(({ key, label, Icon, color }) => {
            const active = adjType === key;
            return (
              <button
                key={key}
                onClick={() => setAdjType(key)}
                style={{
                  flex: 1, height: 40, borderRadius: 9,
                  border: `1.5px solid ${active ? color : C.border}`,
                  background: active ? color + "12" : C.surface,
                  color: active ? color : C.text2,
                  fontWeight: 500, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 6, fontFamily: "inherit", transition: "all 0.12s",
                }}
              >
                <Icon size={14} stroke={2.5} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Amount input */}
        <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 6 }}>
          Amount (DA)
        </label>
        <input
          autoFocus
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirm()}
          placeholder="0"
          style={{
            width: "100%", height: 44, borderRadius: 9,
            border: `1.5px solid ${adjType === "discount" ? C.success : C.warning}`,
            padding: "0 14px", fontSize: 17, fontFamily: "inherit",
            outline: "none", background: "#fff",
          }}
        />

        {/* Live preview */}
        {parsed > 0 && (
          <div style={{
            marginTop: 14, padding: "10px 13px", borderRadius: 9,
            background: C.surface, border: `1px solid ${C.border}`,
            display: "flex", flexDirection: "column", gap: 5,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.text3 }}>
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: adjType === "discount" ? C.success : C.warning, fontWeight: 500 }}>
              <span>{adjType === "discount" ? "− Discount" : "+ Surcharge"}</span>
              <span>{fmt(parsed)}</span>
            </div>
            <div style={{ height: 1, background: C.border, margin: "2px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: C.text1 }}>
              <span>Total</span>
              <span>{fmt(preview)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {cartAdjustment.value > 0 && (
            <Btn onClick={remove} variant="outline" size="md" style={{ color: C.danger, flexShrink: 0 }}>
              <IconX size={14} stroke={2.5} /> Remove
            </Btn>
          )}
          <Btn onClick={closeTotalEditModal} variant="outline" size="md" style={{ flex: 1 }}>
            Cancel
          </Btn>
          <Btn onClick={confirm} variant="primary" size="md" style={{ flex: 2 }}>
            <IconCheck size={15} stroke={2.5} /> Apply
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
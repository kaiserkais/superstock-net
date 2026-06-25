import React, { useState, useEffect, useRef } from "react";
import { IconCheck } from "@tabler/icons-react";
import usePosStore from "../../../store/usePosStore";
import { C, fmt } from "../posTheme";
import Modal from "../../pos/ui/Modal";
import Btn from "../../pos/ui/Btn";

export default function WeightModal() {
  const { weightModal, closeWeightModal, addWeightedProduct, editWeightedItem } = usePosStore();

  const [unitPrice, setUnitPrice] = useState("");
  const [qtyValue,  setQtyValue]  = useState("");
  const [daValue,   setDaValue]   = useState("");

  // Track which field the user last typed in so we know which is the "source"
  const lastEdited = useRef(null);
  const qtyRef     = useRef();

  const product = weightModal?.product;

  useEffect(() => {
    if (weightModal) {
      const p = String(product?.selling_price_1 ?? "");
      setUnitPrice(p);
      setQtyValue("");
      setDaValue("");
      lastEdited.current = null;
      // Focus the qty input after the modal mounts
      setTimeout(() => qtyRef.current?.focus(), 60);
    }
  }, [weightModal, product]);

  if (!weightModal) return null;

  const isEdit = weightModal.mode === "edit";
  const unit   = product?.measurement_unit ?? "kg";

  // ── Sync handlers ──────────────────────────────────────────────────────────
  const handleUnitPriceChange = (raw) => {
    setUnitPrice(raw);
    const up = parseFloat(raw);
    if (!up || up <= 0) return;
    // Re-derive the non-focused field from the focused one
    if (lastEdited.current === "qty") {
      const q = parseFloat(qtyValue);
      if (!isNaN(q)) setDaValue((q * up).toFixed(2));
    } else if (lastEdited.current === "da") {
      const da = parseFloat(daValue);
      if (!isNaN(da)) setQtyValue((da / up).toFixed(3));
    }
  };

  const handleQtyChange = (raw) => {
    lastEdited.current = "qty";
    setQtyValue(raw);
    const q  = parseFloat(raw);
    const up = parseFloat(unitPrice);
    if (!isNaN(q) && !isNaN(up) && up > 0) {
      setDaValue((q * up).toFixed(2));
    } else {
      setDaValue("");
    }
  };

  const handleDaChange = (raw) => {
    lastEdited.current = "da";
    setDaValue(raw);
    const da = parseFloat(raw);
    const up = parseFloat(unitPrice);
    if (!isNaN(da) && !isNaN(up) && up > 0) {
      setQtyValue((da / up).toFixed(3));
    } else {
      setQtyValue("");
    }
  };

  // ── Confirm ────────────────────────────────────────────────────────────────
  const confirm = () => {
    const up = parseFloat(unitPrice) || product.selling_price_1;

    // Prefer whichever field was last edited; fall back to the other
    if (lastEdited.current === "da" || (lastEdited.current === null && daValue)) {
      const da = parseFloat(daValue);
      if (!da || da <= 0) return;
      isEdit
        ? editWeightedItem(weightModal.cartId, { byPrice: da }, up)
        : addWeightedProduct(product, { byPrice: da }, up);
    } else {
      const q = parseFloat(qtyValue);
      if (!q || q <= 0) return;
      isEdit
        ? editWeightedItem(weightModal.cartId, { qty: q }, up)
        : addWeightedProduct(product, { qty: q }, up);
    }
    closeWeightModal();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") confirm();
  };

  // ── Shared input style ─────────────────────────────────────────────────────
  const inputStyle = (focused) => ({
    width: "100%", height: 44, borderRadius: 9,
    border: `1.5px solid ${focused ? C.accent : C.border}`,
    padding: "0 12px", fontSize: 15,
    fontFamily: "inherit", outline: "none",
    background: "#fff", color: C.text1,
    transition: "border-color 0.12s",
  });

  return (
    <Modal
      open
      title={`${isEdit ? "Edit" : "Add"}: ${product?.name}`}
      onClose={closeWeightModal}
      width={400}
    >
      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Unit price */}
        <div>
          <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 6 }}>
            Unit selling price (DA / {unit})
          </label>
          <input
            value={unitPrice}
            onChange={(e) => handleUnitPriceChange(e.target.value)}
            onKeyDown={handleKeyDown}
            type="number"
            style={{
              ...inputStyle(false),
              height: 38, fontSize: 14,
              background: C.surface,
            }}
          />
        </div>

        {/* Divider label */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 11, color: C.text3, whiteSpace: "nowrap" }}>enter quantity or amount</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* Two synced inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

          {/* By quantity */}
          <div>
            <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 6 }}>
              By {unit}
            </label>
            <input
              ref={qtyRef}
              value={qtyValue}
              onChange={(e) => handleQtyChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => lastEdited.current = "qty"}
              type="number"
              step="0.001"
              placeholder={`0.000`}
              style={inputStyle(lastEdited.current === "qty")}
            />
          </div>

          {/* By price */}
          <div>
            <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 6 }}>
              By price (DA)
            </label>
            <input
              value={daValue}
              onChange={(e) => handleDaChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => lastEdited.current = "da"}
              type="number"
              step="1"
              placeholder="0"
              style={inputStyle(lastEdited.current === "da")}
            />
          </div>
        </div>

        {/* Live total line — shown only when something is entered */}
        {(qtyValue || daValue) && parseFloat(unitPrice) > 0 && (
          <div style={{
            background: C.surface, borderRadius: 8, padding: "9px 12px",
            border: `1px solid ${C.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 12, color: C.text3 }}>
              {parseFloat(qtyValue) > 0 ? `${parseFloat(qtyValue).toFixed(3)} ${unit}` : "—"}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>
              {parseFloat(daValue) > 0 ? fmt(parseFloat(daValue)) : "—"}
            </span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={closeWeightModal} variant="outline" style={{ flex: 1 }}>Cancel</Btn>
          <Btn onClick={confirm} variant="primary" style={{ flex: 2 }}>
            <IconCheck size={16} stroke={2.5} />
            {isEdit ? "Update" : "Add to cart"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
import React, { useState, useEffect } from "react";
import { IconCheck, IconMinus, IconPlus } from "@tabler/icons-react";
import usePosStore from "../../../store/usePosStore";
import { C, fmt } from "../posTheme";
import Modal from "../ui/Modal";
import Btn from "../ui/Btn";

export default function VariantModal() {
  const { variantModal, closeVariantModal, addVariantProduct } = usePosStore();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [customPrice, setCustomPrice] = useState("");
  const [qty, setQty] = useState(1);

  const product = variantModal?.product;

  useEffect(() => {
    if (variantModal) { setSelectedVariant(null); setCustomPrice(""); setQty(1); }
  }, [variantModal]);

  if (!variantModal || !product) return null;

  const confirm = () => {
    if (!selectedVariant) return;
    const price = parseFloat(customPrice) || selectedVariant.selling_price_1;
    addVariantProduct(product, selectedVariant, qty, price);
    closeVariantModal();
  };

  return (
    <Modal open title={`Select variant — ${product.name}`} onClose={closeVariantModal} width={500}>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {product.variants.map((v) => {
            const sel = selectedVariant?.id === v.id;
            return (
              <button
                key={v.id}
                onClick={() => { setSelectedVariant(v); setCustomPrice(String(v.selling_price_1)); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderRadius: 10,
                  border: `1.5px solid ${sel ? C.accent : C.border}`,
                  background: sel ? C.accent + "0D" : C.surface,
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  transition: "all 0.12s",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text1 }}>{v.variant_name}</div>
                  <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                    Barcode: {v.codebar} &nbsp;·&nbsp; Stock: {v.quantity} pcs
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: sel ? C.accent : C.text1 }}>{fmt(v.selling_price_1)}</div>
                  <div style={{ fontSize: 11, color: C.text3 }}>cost {fmt(v.product_cost)}</div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedVariant && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 5 }}>Selling price (DA)</label>
              <input
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                type="number"
                style={{ width: "100%", height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 12px", fontSize: 14, fontFamily: "inherit", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 5 }}>Quantity</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconMinus size={14} stroke={2.5} />
                </button>
                <input
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  type="number" min="1"
                  style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 12px", fontSize: 14, textAlign: "center", fontFamily: "inherit", outline: "none" }}
                />
                <button onClick={() => setQty(qty + 1)} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconPlus size={14} stroke={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <Btn onClick={closeVariantModal} variant="outline" style={{ flex: 1 }}>Cancel</Btn>
          <Btn onClick={confirm} variant="primary" disabled={!selectedVariant} style={{ flex: 2 }}>
            <IconCheck size={16} stroke={2.5} />
            Add to cart
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
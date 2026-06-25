import React from "react";
import { IconEdit, IconMinus, IconPlus, IconTrash } from "@tabler/icons-react";
import usePosStore, { MOCK_PRODUCTS } from "../../store/usePosStore";
import { C, fmt } from "./posTheme";

export default function CartItemRow({ item }) {
  const { updateQty, removeCartItem, openWeightEditModal } = usePosStore();

  const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);

  const handleEditWeighted = () => {
    if (!product) return;
    openWeightEditModal(item.cartId, product);
  };

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 0",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.text1, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name}
        </div>
        <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>
          {fmt(item.unitPrice)} × {item.isWeighted ? `${item.qty} ${item.unit}` : item.qty}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>{fmt(item.lineTotal)}</span>

        {item.isWeighted ? (
          <button
            onClick={handleEditWeighted}
            style={{ display: "flex", alignItems: "center", gap: 3, background: C.tag, border: "none", borderRadius: 6, padding: "3px 7px", cursor: "pointer", color: C.text2, fontSize: 11 }}
          >
            <IconEdit size={11} stroke={2} /> Edit
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <button
              onClick={() => updateQty(item.cartId, -1)}
              style={{ width: 22, height: 22, borderRadius: 5, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <IconMinus size={11} stroke={2.5} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, minWidth: 20, textAlign: "center", color: C.text1 }}>{item.qty}</span>
            <button
              onClick={() => updateQty(item.cartId, 1)}
              style={{ width: 22, height: 22, borderRadius: 5, border: `1px solid ${C.accent}`, background: C.accent + "15", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <IconPlus size={11} stroke={2.5} style={{ color: C.accent }} />
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => removeCartItem(item.cartId)}
        style={{ background: "none", border: "none", padding: "2px 2px 0", cursor: "pointer", color: C.text3, flexShrink: 0 }}
      >
        <IconTrash size={14} stroke={1.75} />
      </button>
    </div>
  );
}
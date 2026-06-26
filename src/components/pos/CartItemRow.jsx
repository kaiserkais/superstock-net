import React from "react";
import { IconEdit, IconMinus, IconPlus, IconTrash } from "@tabler/icons-react";
import usePosStore from "../../store/usePosStore";
import { C, fmt } from "./posTheme";

export default function CartItemRow({ item }) {
  const { products, updateQty, removeCartItem, openWeightEditModal } = usePosStore();

  // Guard: product may not be in the loaded catalog yet (e.g. store still loading)
  const product = products.find((p) => p.id === item.productId) ?? null;

  const handleEditWeighted = () => {
    // Fall back to a minimal product shell if catalog isn't loaded yet
    // so the weight modal can still function with the data already on the cart item
    const productForModal = product ?? {
      id:               item.productId,
      name:             item.name,
      selling_price_1:  item.unitPrice,
      product_cost:     item.cost,
      measurement_unit: item.unit,
    };
    openWeightEditModal(item.cartId, productForModal);
  };

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 0",
      borderBottom: `1px solid ${C.border}`,
    }}>

      {/* ── Name + price-per-unit ──────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 500, color: C.text1, lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.name}
        </div>
        <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>
          {fmt(item.unitPrice)}
          {" × "}
          {item.isWeighted ? `${item.qty} ${item.unit}` : item.qty}
        </div>
      </div>

      {/* ── Controls + line total ──────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text1 }}>
          {fmt(item.lineTotal)}
        </span>

        {item.isWeighted ? (
          /* Weighted: open edit modal */
          <button
            onClick={handleEditWeighted}
            style={{
              display: "flex", alignItems: "center", gap: 3,
              background: C.tag, border: "none", borderRadius: 6,
              padding: "3px 7px", cursor: "pointer", color: C.text2, fontSize: 11,
              fontFamily: "inherit",
            }}
          >
            <IconEdit size={11} stroke={2} /> Edit
          </button>
        ) : (
          /* Pcs: inline +/- stepper */
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <button
              onClick={() => updateQty(item.cartId, -1)}
              style={{
                width: 22, height: 22, borderRadius: 5,
                border: `1px solid ${C.border}`, background: C.surface,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <IconMinus size={11} stroke={2.5} />
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, minWidth: 20, textAlign: "center", color: C.text1 }}>
              {item.qty}
            </span>
            <button
              onClick={() => updateQty(item.cartId, 1)}
              style={{
                width: 22, height: 22, borderRadius: 5,
                border: `1px solid ${C.accent}`, background: C.accent + "15",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <IconPlus size={11} stroke={2.5} style={{ color: C.accent }} />
            </button>
          </div>
        )}
      </div>

      {/* ── Remove ────────────────────────────────────────────────────── */}
      <button
        onClick={() => removeCartItem(item.cartId)}
        title="Remove item"
        style={{
          background: "none", border: "none", padding: "2px 2px 0",
          cursor: "pointer", color: C.text3, flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = C.danger)}
        onMouseLeave={(e) => (e.currentTarget.style.color = C.text3)}
      >
        <IconTrash size={14} stroke={1.75} />
      </button>
    </div>
  );
}
import React from "react";
import {
  IconUser, IconChevronRight, IconShoppingCart,
  IconEdit, IconCash, IconPlayerPause, IconTrash,
  IconCreditCard, IconReceipt, IconTag, IconPlus,
  IconLoader,
} from "@tabler/icons-react";
import usePosStore from "../../store/usePosStore";
import { C, fmt } from "./posTheme";
import CartItemRow from "./CartItemRow";
import Btn from "./ui/Btn";

export default function CartPanel({
  onExecuteSale, onPark, onClear, onPrintInvoice, onPrintReceipt,saleLoading = false
}) {
  const {
    cartItems, cartClient,
    openClientModal, openTotalEditModal,
    getCartTotals,
  } = usePosStore();

  const { subtotal, adjustmentType, adjustmentValue, hasAdjustment, total } = getCartTotals();
  const isEmpty = cartItems.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Client row ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "10px 14px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 8,
          cursor: "pointer", background: cartClient ? C.accent + "0A" : "transparent",
        }}
        onClick={openClientModal}
      >
        {cartClient ? (
          <>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconUser size={14} stroke={2} style={{ color: "#fff" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cartClient.name}</div>
              {cartClient.total_debt > 0 && <div style={{ fontSize: 10, color: C.danger }}>Debt: {fmt(cartClient.total_debt)}</div>}
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.tag, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconUser size={14} stroke={1.75} style={{ color: C.text3 }} />
            </div>
            <span style={{ fontSize: 12, color: C.text3 }}>No client assigned</span>
          </>
        )}
        <IconChevronRight size={14} stroke={1.75} style={{ color: C.text3, flexShrink: 0 }} />
      </div>

      {/* ── Cart items ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
        {isEmpty ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: C.text3, gap: 10 }}>
            <IconShoppingCart size={40} stroke={1} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: 13 }}>Cart is empty</div>
            <div style={{ fontSize: 11, color: C.text3, textAlign: "center", maxWidth: 160, lineHeight: 1.5 }}>
              Scan a barcode or select a product from the grid
            </div>
          </div>
        ) : (
          cartItems.map((item) => <CartItemRow key={item.cartId} item={item} />)
        )}
      </div>

      {/* ── Totals block ───────────────────────────────────────────────── */}
      {!isEmpty && (
        <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>

          {/* Subtotal row — only shown when there's an active adjustment */}
          {hasAdjustment && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 14px 4px" }}>
              <span style={{ fontSize: 12, color: C.text3 }}>Subtotal</span>
              <span style={{ fontSize: 12, color: C.text3 }}>{fmt(subtotal)}</span>
            </div>
          )}

          {/* Discount or surcharge row */}
          {hasAdjustment && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 14px 6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {adjustmentType === "discount" ? (
                  <IconTag size={12} stroke={2} style={{ color: C.success }} />
                ) : (
                  <IconPlus size={12} stroke={2.5} style={{ color: C.warning }} />
                )}
                <span style={{ fontSize: 12, color: adjustmentType === "discount" ? C.success : C.warning, fontWeight: 500 }}>
                  {adjustmentType === "discount" ? "Discount" : "Surcharge"}
                </span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: adjustmentType === "discount" ? C.success : C.warning }}>
                {adjustmentType === "discount" ? "−" : "+"}{fmt(adjustmentValue)}
              </span>
            </div>
          )}

          {/* Total row — always shown, clickable to open adjustment modal */}
          <div
            onClick={openTotalEditModal}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: hasAdjustment ? "6px 14px 10px" : "10px 14px",
              cursor: "pointer",
              borderTop: hasAdjustment ? `1px dashed ${C.border}` : "none",
            }}
          >
            <span style={{ fontSize: 13, color: C.text2, fontWeight: 500 }}>Total</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: C.text1 }}>{fmt(total)}</span>
              <IconEdit size={13} stroke={1.75} style={{ color: C.text3 }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Action buttons ─────────────────────────────────────────────── */}
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
        <button
          onClick={onExecuteSale}
          disabled={isEmpty || saleLoading}
          style={{
            width: "100%", height: 44, borderRadius: 10, border: "none",
            background: isEmpty || saleLoading ? C.border : C.accent,
            color: isEmpty || saleLoading ? C.text3 : "#fff",
            fontSize: 14, fontWeight: 600, cursor: isEmpty || saleLoading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            fontFamily: "inherit", transition: "background 0.13s",
          }}
        >
          {
          saleLoading ? (
            <>
            <IconLoader size={17} stroke={2} style={{animation: 'spin 1s Linear infinit'}}/>
            proccessing ...
            </>
          ) : (
            <>
            <IconCash size={18} stroke={2} />
          Execute sale
          <span style={{ fontSize: 10, opacity: 0.75, marginLeft: 2 }}>F5</span>
            </>
          ) 
        }
          
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <Btn onClick={onPark} variant="outline" size="sm" style={{ justifyContent: "center", gap: 4 }}>
            <IconPlayerPause size={13} stroke={2} /> Park <span style={{ fontSize: 10, opacity: 0.6 }}>F3</span>
          </Btn>
          <Btn onClick={onClear} variant="outline" size="sm" style={{ justifyContent: "center", gap: 4, color: C.danger }}>
            <IconTrash size={13} stroke={2} /> Clear <span style={{ fontSize: 10, opacity: 0.6 }}>F4</span>
          </Btn>
          <Btn onClick={onPrintInvoice} variant="outline" size="sm" style={{ justifyContent: "center", gap: 4 }}>
            <IconCreditCard size={13} stroke={1.75} /> Invoice <span style={{ fontSize: 10, opacity: 0.6 }}>F6</span>
          </Btn>
          <Btn onClick={onPrintReceipt} variant="outline" size="sm" style={{ justifyContent: "center", gap: 4 }}>
            <IconReceipt size={13} stroke={1.75} /> Receipt <span style={{ fontSize: 10, opacity: 0.6 }}>F7</span>
          </Btn>
        </div>
      </div>
    </div>
  );
}
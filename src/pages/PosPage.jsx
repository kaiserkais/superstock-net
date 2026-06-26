import React, { useState, useEffect } from "react";
import { IconShoppingCart, IconKeyboard, IconPlayerPause } from "@tabler/icons-react";
import usePosStore from "../store/usePosStore";
import { C } from "../components/pos/posTheme";

// Import core layouts
import BarcodeBar from "../components/pos/BarcodeBar";
import ProductGrid from "../components/pos/ProductGrid";
import CartPanel from "../components/pos/CartPanel";
import ParkedCarts from "../components/pos/ParkedCarts";

// Import context modals
import WeightModal from "../components/pos/modals/WeightModal";
import VariantModal from "../components/pos/modals/VariantModal";
import ClientModal from "../components/pos/modals/ClientModal";
import TotalEditModal from "../components/pos/modals/TotalEditModal";
import ConfirmClearModal from "../components/pos/modals/ConfirmClearModal";
import useAuthStore from "../store/useAuthStore";
// Import feedback components
import Toast from "../components/pos/ui/Toast";

export default function PosPage() {
  const { user } = useAuthStore();

  const {
    cartItems, parkedCarts,
    parkCart, openConfirmClearModal, executeSale,saleLoading,loadAll
  } = usePosStore();

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type, key: Date.now() });
  };
  useEffect(() => {
    // This runs every time the POS page is opened/rendered
    // It will fetch fresh products, categories, and clients from the DB
    loadAll();
  }, [loadAll]);
  const handleExecuteSale = async () => {
    if (cartItems.length === 0 || saleLoading) return;
    const result = await executeSale(user?.id);
    if (result.success) {
      showToast("Sale completed successfully!", "success");
      // loadAll();
    } else {
      const msg = result.reason === 'empty_cart' ? 'Cart is empty' : 
      result.reason === 'no_user' ? 'Not authenticated please log in' : 
      result.reason;
      showToast(msg, "error")
    }
    
  };

  const handlePark = () => {
    if (cartItems.length === 0) return;
    parkCart();
    showToast("Cart parked", "success");
  };

  const handlePrintInvoice = () => {
    alert("🖨️ Print Invoice — Feature coming soon!\n\nThis will open the invoice print dialog.");
  };

  const handlePrintReceipt = () => {
    alert("🧾 Print Receipt — Feature coming soon!\n\nThis will send the receipt to the ESC/POS printer.");
  };

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (inInput) return;

      switch (e.key) {
        case "F3":
          e.preventDefault();
          handlePark();
          break;
        case "F4":
          e.preventDefault();
          openConfirmClearModal();
          break;
        case "F5":
          e.preventDefault();
          handleExecuteSale();
          break;
        case "F6":
          e.preventDefault();
          handlePrintInvoice();
          break;
        case "F7":
          e.preventDefault();
          handlePrintReceipt();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cartItems]);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: C.surface, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── LEFT: Product grid + barcode bar ─────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.surface }}>
        <BarcodeBar />
        <ProductGrid />
      </div>

      {/* ── RIGHT: Cart + parked ─────────────────────────────────────────── */}
      <div style={{ width: 320, display: "flex", flexDirection: "column", borderLeft: `1px solid ${C.border}`, background: C.card, overflow: "hidden", flexShrink: 0 }}>

        {/* Cart header */}
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <IconShoppingCart size={16} stroke={2} style={{ color: C.accent }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>Cart</span>
            {cartItems.length > 0 && (
              <span style={{ background: C.accent, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 8, padding: "1px 6px", lineHeight: "16px" }}>
                {cartItems.length}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <IconKeyboard size={13} stroke={1.5} style={{ color: C.text3 }} />
            <span style={{ fontSize: 10, color: C.text3 }}>F3–F7</span>
          </div>
        </div>

        {/* Cart body */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <CartPanel
            onExecuteSale={handleExecuteSale}
            onPark={handlePark}
            onClear={openConfirmClearModal}
            onPrintInvoice={handlePrintInvoice}
            onPrintReceipt={handlePrintReceipt}
            saleLoading = {saleLoading}
          />
        </div>

        {/* Parked carts section */}
        {parkedCarts.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.border}`, flexShrink: 0, maxHeight: 180, overflowY: "auto" }}>
            <div style={{ padding: "8px 14px 4px", display: "flex", alignItems: "center", gap: 6 }}>
              <IconPlayerPause size={13} stroke={2} style={{ color: C.text3 }} />
              <span style={{ fontSize: 11, color: C.text3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Parked ({parkedCarts.length})
              </span>
            </div>
            <ParkedCarts />
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <WeightModal />
      <VariantModal />
      <ClientModal />
      <TotalEditModal />
      <ConfirmClearModal />

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}
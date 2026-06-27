import React, { useState, useEffect } from "react";
import { IconShoppingCart, IconKeyboard, IconPlayerPause } from "@tabler/icons-react";
import usePosStore from "../store/usePosStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { printRepository } from "../services/printRepository";
import useAuthStore from "../store/useAuthStore";
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

// Import feedback components
import Toast from "../components/pos/ui/Toast";

export default function PosPage() {
  const { user } = useAuthStore();
  const [activeMode, setActiveMode] = useState("barcode");
  const [toast, setToast] = useState(null);

  // Print operational loading states
  const [printReceiptLoading, setPrintReceiptLoading] = useState(false);
  const [printInvoiceLoading, setPrintInvoiceLoading] = useState(false);

  const {
    cartItems, parkedCarts, cartClient, getCartTotals,
    parkCart, openConfirmClearModal, executeSale, saleLoading, loadAll
  } = usePosStore();

  const settings = useSettingsStore((state) => state.settings);

  const showToast = (message, type = "success") => {
    setToast({ message, type, key: Date.now() });
  };

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleExecuteSale = async () => {
    if (cartItems.length === 0 || saleLoading) return;
    const result = await executeSale(user?.id);
    if (result.success) {
      showToast("Sale completed successfully!", "success");
    } else {
      const msg = result.reason === 'empty_cart' ? 'Cart is empty' : 
                  result.reason === 'no_user' ? 'Not authenticated please log in' : 
                  result.reason;
      showToast(msg, "error");
    }
  };

  const handlePark = () => {
    if (cartItems.length === 0) return;
    parkCart();
    showToast("Cart parked", "success");
  };

  // ── Centralized Printing Draft Payload Generator ──────────────────────────
  const buildDraftSalePayload = () => {
    const totals = getCartTotals() || {};
    const subtotal = Number(totals.subtotal) || 0;
    const adjustmentValue = Number(totals.adjustmentValue) || 0;
    const adjustmentType = totals.adjustmentType || "discount";
    const total = Number(totals.total) || 0;
    const discountAmount = adjustmentType === "discount" ? adjustmentValue : 0;

    return {
      id: "DRAFT",
      created_at: new Date().toISOString(),
      cashier_name: "Active Session",
      customer_name: cartClient?.name || "Walk-in Client",
      customer_phone: cartClient?.phone || "", 
      subtotal,
      adj_value: adjustmentValue,
      adj_type: adjustmentType,
      discount: discountAmount,
      total,
      items: cartItems.map((item) => {
        const itemQty = Number(item.qty ?? item.quantity ?? 1);
        const itemPrice = Number(item.unitPrice ?? item.price ?? item.selling_price ?? 0);
        return {
          product_name: item.name || "Item",
          combination: item.combination || item.variant_name || "Standard",
          qty: itemQty,
          unit_price: itemPrice, 
          line_total: Number(item.lineTotal ?? item.line_total) || (itemPrice * itemQty),
        };
      }),
    };
  };

  const handlePrintReceipt = async () => {
    if (cartItems.length === 0 || printReceiptLoading || printInvoiceLoading) return;
    setPrintReceiptLoading(true);
    try {
      const currentDraftSale = buildDraftSalePayload();
      await printRepository.printInvoiceReceipt(currentDraftSale, settings || {});
    } catch (err) {
      console.error("Receipt printing failed:", err);
      alert(err.message);
    } finally {
      setPrintReceiptLoading(false);
    }
  };

  const handlePrintInvoice = async () => {
    if (cartItems.length === 0 || printReceiptLoading || printInvoiceLoading) return;
    setPrintInvoiceLoading(true);
    try {
      const currentDraftSale = buildDraftSalePayload();
      await printRepository.printInvoice(currentDraftSale, settings || {});
    } catch (err) {
      console.error("Invoice printing failed:", err);
      alert(err.message);
    } finally {
      setPrintInvoiceLoading(false);
    }
  };

  // ── Consolidated Global Keyboard shortcuts ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const isFunctionKey = e.key.startsWith("F") && !isNaN(e.key.substring(1));
      
      // If it's an F-key, always let it pass through even if typing in an input
      const tag = document.activeElement?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (inInput && !isFunctionKey) return;

      switch (e.key) {
        case "F2":
          e.preventDefault();
          setActiveMode((prev) => (prev === "barcode" ? "search" : "barcode"));
          break;
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
  }, [cartItems, activeMode, cartClient, settings, printReceiptLoading, printInvoiceLoading, user]);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: C.surface, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── LEFT: Product grid + barcode bar ─────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.surface }}>
        <BarcodeBar activeMode={activeMode} setActiveMode={setActiveMode} />
        <ProductGrid activeMode={activeMode} setActiveMode={setActiveMode} />
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
            <span style={{ fontSize: 10, color: C.text3 }}>F2–F7</span>
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
            saleLoading={saleLoading}
            printInvoiceLoading={printInvoiceLoading}
            printReceiptLoading={printReceiptLoading}
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

      <WeightModal />
      <VariantModal />
      <ClientModal />
      <TotalEditModal />
      <ConfirmClearModal />

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
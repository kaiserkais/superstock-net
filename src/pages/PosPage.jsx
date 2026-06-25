/**
 * PosPage.jsx — SuperStock POS Terminal
 * Stack: React + Zustand + @tabler/icons-react + Tailwind CSS
 *
 * Features:
 *  - Product grid (30/page, infinite scroll, category filter, search)
 *  - Simple / weighted / variant product flows
 *  - Cart with qty editing, line removal, total override
 *  - Parked carts (restore ↔ park swap)
 *  - Client assignment
 *  - Keyboard shortcuts: F3 park | F4 clear | F5 sale | F6 print invoice | F7 print receipt
 *  - All modals: weight, variant, client, total edit, confirm clear
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  IconSearch,
  IconBarcode,
  IconShoppingCart,
  IconPlus,
  IconMinus,
  IconTrash,
  IconUser,
  IconUserOff,
  IconChevronDown,
  IconX,
  IconCheck,
  IconPlayerPause,
  IconPlayerPlay,
  IconReceipt,
  IconReceiptRefund,
  IconCreditCard,
  IconCash,
  IconScale,
  IconEdit,
  IconAlertTriangle,
  IconPackage,
  IconTag,
  IconCategory,
  IconRefresh,
  IconClockHour4,
  IconChevronRight,
  IconKeyboard,
} from "@tabler/icons-react";
import usePosStore, {
  MOCK_PRODUCTS,
  MOCK_CATEGORIES,
  MOCK_CLIENTS,
} from "../store/usePosStore";

// ─── Design tokens (match POSLayout palette) ──────────────────────────────────
const C = {
  accent: "#E8A04B",
  accentDim: "#C8873A",
  sidebar: "#1A1A22",
  surface: "#F7F6F3",
  card: "#FFFFFF",
  text1: "#1C1C24",
  text2: "#6B6B7A",
  text3: "#9B9BA8",
  border: "#E4E3E0",
  tag: "#F0EFE9",
  success: "#1D9E75",
  danger: "#E24B4A",
  warning: "#E8A04B",
  infoBg: "#EAF3DE",
  infoText: "#3B6D11",
};

const fmt = (n) =>
  new Intl.NumberFormat("fr-DZ", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n) + " DA";

// ─── Reusable primitives ──────────────────────────────────────────────────────
function Btn({ children, onClick, variant = "ghost", size = "md", style: sx, disabled, className = "" }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 6, border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 500, fontFamily: "inherit", transition: "all 0.13s", opacity: disabled ? 0.5 : 1,
  };
  const sizes = { sm: { fontSize: 12, padding: "5px 10px", height: 30 }, md: { fontSize: 13, padding: "0 14px", height: 36 }, lg: { fontSize: 14, padding: "0 18px", height: 42 } };
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

function Modal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(20,20,30,0.55)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.card, borderRadius: 16, width: "100%", maxWidth: width,
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          display: "flex", flexDirection: "column", maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: C.text1 }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.text3, borderRadius: 6, padding: 4 }}
          >
            <IconX size={18} stroke={2} />
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

function Badge({ children, color = C.accent, bg }) {
  return (
    <span style={{
      background: bg || color + "22", color,
      fontSize: 10, fontWeight: 600, padding: "2px 7px",
      borderRadius: 5, letterSpacing: "0.02em",
    }}>
      {children}
    </span>
  );
}

// ─── Weight / Measure modal ───────────────────────────────────────────────────
function WeightModal() {
  const { weightModal, closeWeightModal, addWeightedProduct, editWeightedItem } = usePosStore();
  const [mode, setMode] = useState("qty"); // "qty" | "price"
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const inputRef = useRef();

  const product = weightModal?.product;

  useEffect(() => {
    if (weightModal) {
      setMode("qty"); setQty(""); setPrice("");
      setUnitPrice(String(product?.selling_price_1 ?? ""));
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [weightModal, product]);

  if (!weightModal) return null;

  const isEdit = weightModal.mode === "edit";

  const confirm = () => {
    const up = parseFloat(unitPrice) || product.selling_price_1;
    if (mode === "price") {
      const p = parseFloat(price);
      if (!p || p <= 0) return;
      isEdit
        ? editWeightedItem(weightModal.cartId, { byPrice: p }, up)
        : addWeightedProduct(product, { byPrice: p }, up);
    } else {
      const q = parseFloat(qty);
      if (!q || q <= 0) return;
      isEdit
        ? editWeightedItem(weightModal.cartId, { qty: q }, up)
        : addWeightedProduct(product, { qty: q }, up);
    }
    closeWeightModal();
  };

  return (
    <Modal open title={`${isEdit ? "Edit" : "Add"}: ${product?.name}`} onClose={closeWeightModal} width={420}>
      <div style={{ padding: "20px" }}>
        {/* Unit price override */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 5 }}>
            Unit selling price (DA / {product?.measurement_unit})
          </label>
          <input
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            type="number"
            style={{ width: "100%", height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 12px", fontSize: 14, fontFamily: "inherit", outline: "none", background: C.surface }}
          />
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["qty", "price"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, height: 36, borderRadius: 8, border: `1px solid ${mode === m ? C.accent : C.border}`,
                background: mode === m ? C.accent + "15" : C.surface, color: mode === m ? C.accent : C.text2,
                fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {m === "qty" ? `By ${product?.measurement_unit}` : "By price (DA)"}
            </button>
          ))}
        </div>

        {mode === "qty" ? (
          <div>
            <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 5 }}>
              Quantity ({product?.measurement_unit})
            </label>
            <input
              ref={inputRef}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirm()}
              type="number" step="0.01"
              placeholder={`e.g. 2.5 ${product?.measurement_unit}`}
              style={{ width: "100%", height: 42, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 12px", fontSize: 15, fontFamily: "inherit", outline: "none" }}
            />
            {qty && unitPrice && (
              <div style={{ marginTop: 8, fontSize: 13, color: C.text2 }}>
                Total: <strong style={{ color: C.text1 }}>{fmt(parseFloat(qty) * parseFloat(unitPrice))}</strong>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label style={{ fontSize: 12, color: C.text2, display: "block", marginBottom: 5 }}>
              Amount in DA
            </label>
            <input
              ref={inputRef}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirm()}
              type="number"
              placeholder="e.g. 500"
              style={{ width: "100%", height: 42, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 12px", fontSize: 15, fontFamily: "inherit", outline: "none" }}
            />
            {price && unitPrice && parseFloat(unitPrice) > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, color: C.text2 }}>
                Qty: <strong style={{ color: C.text1 }}>{(parseFloat(price) / parseFloat(unitPrice)).toFixed(3)} {product?.measurement_unit}</strong>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
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

// ─── Variant selection modal ──────────────────────────────────────────────────
function VariantModal() {
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
        {/* Variant list */}
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

// ─── Client selection modal ───────────────────────────────────────────────────
function ClientModal() {
  const { clientModal, closeClientModal, assignClient, cartClient, clearClient } = usePosStore();
  const [search, setSearch] = useState("");

  const filtered = MOCK_CLIENTS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone_number.includes(search)
  );

  return (
    <Modal open={clientModal} onClose={closeClientModal} title="Assign client" width={440}>
      <div style={{ padding: "16px 20px" }}>
        <input
          autoFocus
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", height: 38, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 12px", fontSize: 13, fontFamily: "inherit", outline: "none", marginBottom: 12 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {filtered.map((c) => {
            const active = cartClient?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => { assignClient(c); closeClientModal(); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${active ? C.accent : C.border}`,
                  background: active ? C.accent + "0D" : C.surface, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text1 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: C.text3 }}>{c.phone_number} · {c.address}</div>
                </div>
                {c.total_debt > 0 && (
                  <span style={{ fontSize: 11, background: "#FCEBEB", color: C.danger, borderRadius: 5, padding: "2px 7px", fontWeight: 600 }}>
                    Debt: {fmt(c.total_debt)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {cartClient && (
          <Btn onClick={() => { clearClient(); closeClientModal(); }} variant="outline" style={{ width: "100%", marginTop: 12, color: C.danger }}>
            <IconUserOff size={15} stroke={2} /> Remove client
          </Btn>
        )}
      </div>
    </Modal>
  );
}

// ─── Total edit modal ─────────────────────────────────────────────────────────
function TotalEditModal() {
  const { totalEditModal, closeTotalEditModal, setTotalOverride, clearTotalOverride, cartTotalOverride, getCartTotal } = usePosStore();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (totalEditModal) setValue(String(getCartTotal()));
  }, [totalEditModal]);

  const confirm = () => {
    const v = parseFloat(value);
    if (!isNaN(v) && v >= 0) setTotalOverride(v);
    closeTotalEditModal();
  };

  return (
    <Modal open={totalEditModal} onClose={closeTotalEditModal} title="Override cart total" width={380}>
      <div style={{ padding: "20px" }}>
        <p style={{ fontSize: 13, color: C.text2, marginBottom: 14, lineHeight: 1.5 }}>
          Enter a custom total for this cart. Useful for applying manual discounts.
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirm()}
          type="number"
          style={{ width: "100%", height: 44, borderRadius: 8, border: `1px solid ${C.accent}`, padding: "0 14px", fontSize: 16, fontFamily: "inherit", outline: "none" }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {cartTotalOverride && (
            <Btn onClick={() => { clearTotalOverride(); closeTotalEditModal(); }} variant="outline" style={{ color: C.danger }}>
              Reset
            </Btn>
          )}
          <Btn onClick={closeTotalEditModal} variant="outline" style={{ flex: 1 }}>Cancel</Btn>
          <Btn onClick={confirm} variant="primary" style={{ flex: 2 }}>
            <IconCheck size={16} stroke={2.5} /> Apply
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Confirm clear modal ──────────────────────────────────────────────────────
function ConfirmClearModal() {
  const { confirmClearModal, closeConfirmClearModal, clearCart } = usePosStore();
  return (
    <Modal open={confirmClearModal} onClose={closeConfirmClearModal} title="Clear cart?" width={360}>
      <div style={{ padding: "20px" }}>
        <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>
          All items in the current cart will be removed. This cannot be undone.
          Consider parking the cart instead.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <Btn onClick={closeConfirmClearModal} variant="outline" style={{ flex: 1 }}>Cancel</Btn>
          <Btn onClick={() => { clearCart(); closeConfirmClearModal(); }} variant="danger" style={{ flex: 2 }}>
            <IconTrash size={15} stroke={2.5} /> Clear cart
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────
function ProductCard({ product }) {
  const {
    addSimpleProduct, openWeightModal, openVariantModal,
  } = usePosStore();

  const handleClick = () => {
    if (product.product_type === "variable") {
      openVariantModal(product);
    } else if (product.measurement_unit !== "pcs") {
      openWeightModal(product);
    } else {
      addSimpleProduct(product);
    }
  };

  const isVariable = product.product_type === "variable";
  const isWeighted = !isVariable && product.measurement_unit !== "pcs";

  return (
    <button
      onClick={handleClick}
      style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: "12px 13px", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
        display: "flex", flexDirection: "column", gap: 6,
        transition: "border-color 0.13s, box-shadow 0.13s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.accent;
        e.currentTarget.style.boxShadow = `0 0 0 3px ${C.accent}18`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Product icon placeholder */}
      <div style={{
        width: "100%", height: 72, borderRadius: 8, background: C.surface,
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2,
      }}>
        <IconPackage size={28} stroke={1.25} style={{ color: C.text3 }} />
      </div>

      <div style={{ fontSize: 12, fontWeight: 500, color: C.text1, lineHeight: 1.3, minHeight: 30 }}>
        {product.name}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {isVariable && <Badge color={C.accent}>Variable</Badge>}
        {isWeighted && <Badge color="#7C5CBF">{product.measurement_unit}</Badge>}
        <Badge color={C.text3} bg={C.tag}>{product.category_name?.split(" / ")[0]}</Badge>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>{fmt(product.selling_price_1)}</span>
        {!isVariable && (
          <span style={{ fontSize: 11, color: product.quantity < 5 ? C.danger : C.text3 }}>
            {product.quantity} {product.measurement_unit}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Product grid ─────────────────────────────────────────────────────────────
function ProductGrid() {
  const {
    search, setSearch, categoryFilter, setCategoryFilter,
    loadMoreProducts, getFilteredProducts,
  } = usePosStore();

  const { products, hasMore, total } = getFilteredProducts();
  const sentinelRef = useRef();

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreProducts(); },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadMoreProducts]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Search + filter bar */}
      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <IconSearch size={15} stroke={1.75} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.text3 }} />
          <input
            placeholder="Product name, ref, barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", height: 34, borderRadius: 8, border: `1px solid ${C.border}`, paddingLeft: 28, paddingRight: 10, fontSize: 12, fontFamily: "inherit", outline: "none", background: C.surface }}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ height: 34, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 10px", fontSize: 12, fontFamily: "inherit", background: C.surface, color: C.text1, cursor: "pointer", outline: "none" }}
        >
          <option value="all">All categories</option>
          {MOCK_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <div style={{ padding: "6px 12px", fontSize: 11, color: C.text3, flexShrink: 0 }}>
        {total} product{total !== 1 ? "s" : ""}{search || categoryFilter !== "all" ? " (filtered)" : ""}
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1, overflowY: "auto", padding: "6px 12px 12px",
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10,
          alignContent: "start",
        }}
      >
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
        {products.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: C.text3 }}>
            <IconPackage size={40} stroke={1} style={{ display: "block", margin: "0 auto 10px" }} />
            <div style={{ fontSize: 13 }}>No products found</div>
          </div>
        )}
        {hasMore && <div ref={sentinelRef} style={{ height: 20, gridColumn: "1/-1" }} />}
      </div>
    </div>
  );
}

// ─── Parked carts panel ───────────────────────────────────────────────────────
function ParkedCarts() {
  const { parkedCarts, restoreParkedCart, deleteParkedCart } = usePosStore();

  if (parkedCarts.length === 0) {
    return (
      <div style={{ padding: "12px", textAlign: "center", color: C.text3, fontSize: 12 }}>
        <IconPlayerPause size={22} stroke={1.25} style={{ display: "block", margin: "0 auto 6px", opacity: 0.4 }} />
        No parked carts
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
      {parkedCarts.map((c) => {
        const t = c.items.reduce((s, i) => s + i.lineTotal, 0);
        const ts = new Date(c.parkedAt);
        const timeStr = ts.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" });
        return (
          <div
            key={c.id}
            style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: "9px 11px", display: "flex", alignItems: "center", gap: 8 }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.text1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</div>
              <div style={{ fontSize: 11, color: C.text3 }}>{c.items.length} item{c.items.length !== 1 ? "s" : ""} · {fmt(t)} · {timeStr}</div>
            </div>
            <button
              onClick={() => restoreParkedCart(c.id)}
              title="Restore"
              style={{ background: C.accent + "18", border: "none", borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: C.accent, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500 }}
            >
              <IconPlayerPlay size={12} stroke={2.5} /> Restore
            </button>
            <button
              onClick={() => deleteParkedCart(c.id)}
              title="Delete"
              style={{ background: "none", border: "none", borderRadius: 7, padding: 5, cursor: "pointer", color: C.text3 }}
            >
              <IconX size={13} stroke={2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Cart item row ────────────────────────────────────────────────────────────
function CartItemRow({ item }) {
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

// ─── Cart panel ───────────────────────────────────────────────────────────────
function CartPanel({
  onExecuteSale, onPark, onClear, onPrintInvoice, onPrintReceipt,
}) {
  const {
    cartItems, cartClient, cartTotalOverride,
    openClientModal, openTotalEditModal, getCartTotal,
  } = usePosStore();

  const total = getCartTotal();
  const isEmpty = cartItems.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Client row */}
      <div
        style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: cartClient ? C.accent + "0A" : "transparent" }}
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

      {/* Items */}
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

      {/* Total */}
      {!isEmpty && (
        <div
          style={{ padding: "10px 14px", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: cartTotalOverride ? "#FAEEDA" : "transparent" }}
          onClick={openTotalEditModal}
        >
          <div>
            <span style={{ fontSize: 12, color: C.text2 }}>Total</span>
            {cartTotalOverride && <span style={{ fontSize: 10, color: C.warning, marginLeft: 6 }}>overridden</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: C.text1 }}>{fmt(total)}</span>
            <IconEdit size={13} stroke={1.75} style={{ color: C.text3 }} />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
        {/* Execute sale */}
        <button
          onClick={onExecuteSale}
          disabled={isEmpty}
          style={{
            width: "100%", height: 44, borderRadius: 10, border: "none",
            background: isEmpty ? C.border : C.accent,
            color: isEmpty ? C.text3 : "#fff",
            fontSize: 14, fontWeight: 600, cursor: isEmpty ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            fontFamily: "inherit", transition: "background 0.13s",
          }}
        >
          <IconCash size={18} stroke={2} />
          Execute sale
          <span style={{ fontSize: 10, opacity: 0.75, marginLeft: 2 }}>F5</span>
        </button>

        {/* Secondary row */}
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

// ─── Barcode / lookup input bar ───────────────────────────────────────────────
function BarcodeBar() {
  const { processBarcode, barcodeBuffer, setBarcodeBuffer } = usePosStore();
  const [flash, setFlash] = useState(null); // null | "success" | "error"
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

  // Keep focus on input unless user is in a modal
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
      inputRef.current?.focus();
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const borderColor = flash === "success" ? C.success : flash === "error" ? C.danger : C.border;

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
      <div style={{ position: "relative", flex: 1 }}>
        <IconBarcode size={17} stroke={1.75} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.text3 }} />
        <input
          ref={inputRef}
          value={barcodeBuffer}
          onChange={(e) => setBarcodeBuffer(e.target.value)}
          placeholder="Scan barcode, enter reference or product name…"
          autoFocus
          style={{
            width: "100%", height: 38, paddingLeft: 34, paddingRight: 12,
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

// ─── Toast notification (simple) ─────────────────────────────────────────────
function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  const bg = type === "success" ? C.success : type === "error" ? C.danger : C.accent;
  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      background: bg, color: "#fff", borderRadius: 10, padding: "10px 18px",
      fontSize: 13, fontWeight: 500, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      {type === "success" ? <IconCheck size={15} stroke={2.5} /> : <IconAlertTriangle size={15} stroke={2} />}
      {message}
    </div>
  );
}

// ─── POS Page root ────────────────────────────────────────────────────────────
export default function PosPage() {
  const {
    cartItems, parkedCarts,
    parkCart, openConfirmClearModal, executeSale,
    processBarcode,
  } = usePosStore();

  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type, key: Date.now() });
  };

  const handleExecuteSale = () => {
    if (cartItems.length === 0) return;
    executeSale();
    showToast("Sale completed successfully!", "success");
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
      // Ignore if user is typing in an input / textarea / select
      const tag = document.activeElement?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

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
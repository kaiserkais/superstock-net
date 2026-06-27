/**
 * cartSlice.js — Shopping Cart Operations & Sale Execution Slice
 */
import { posRepository } from "../services/posRepository";

const uuid = () => Math.random().toString(36).slice(2, 10);

export const createCartSlice = (set, get) => ({
  // ── Cart State ─────────────────────────────────────────────────────────
  cartItems: [], 
  cartClient: null,
  cartAdjustment: { type: "discount", value: 0 },
  parkedCarts: [],
  barcodeBuffer: "",
  selectedIndex: 0, // 👈 Added selected index tracking state

  // Checkout Modals
  clientModal: false,
  totalEditModal: false,
  confirmClearModal: false,

  // Sale Submission State
  saleLoading: false,
  saleError: null,

  // ── 🧠 SELECTION & KEYBOARD ACTIONS ─────────────────────────────────────
  setSelectedIndex: (idx) => set((s) => {
    if (s.cartItems.length === 0) s.selectedIndex = 0;
    else s.selectedIndex = Math.max(0, Math.min(idx, s.cartItems.length - 1));
  }),

  selectNextItem: () => set((s) => {
    if (s.cartItems.length === 0) return;
    s.selectedIndex = Math.min(s.selectedIndex + 1, s.cartItems.length - 1);
  }),

  selectPrevItem: () => set((s) => {
    if (s.cartItems.length === 0) return;
    s.selectedIndex = Math.max(s.selectedIndex - 1, 0);
  }),

  incrementSelectedItem: () => set((s) => {
    if (s.cartItems.length === 0) return;
    const item = s.cartItems[s.selectedIndex];
    
    // 🛑 Guard condition: Only allow increment if item is measured by piece (pcs)
    if (item && item.unit === "pcs") {
      item.qty += 1;
      item.lineTotal = item.qty * item.unitPrice;
    }
  }),

  decrementSelectedItem: () => set((s) => {
    if (s.cartItems.length === 0) return;
    const item = s.cartItems[s.selectedIndex];

    // 🛑 Guard condition: Only allow decrement if item is measured by piece (pcs)
    if (item && item.unit === "pcs") {
      const newQty = item.qty - 1;
      if (newQty <= 0) {
        s.cartItems.splice(s.selectedIndex, 1);
        // Balance out index safety boundaries after safe deletion
        if (s.selectedIndex >= s.cartItems.length && s.cartItems.length > 0) {
          s.selectedIndex = s.cartItems.length - 1;
        } else if (s.cartItems.length === 0) {
          s.selectedIndex = 0;
        }
      } else {
        item.qty = newQty;
        item.lineTotal = newQty * item.unitPrice;
      }
    }
  }),

  // ── CART ADD/UPDATE REDUCERS (Auto-Selection Aware) ────────────────────
  addSimpleProduct: (product, qty = 1, unitPrice = null) => {
    set((state) => {
      const price = unitPrice ?? product.selling_price_1;
      const idx = state.cartItems.findIndex(
        (i) => i.productId === product.id && !i.variantId && !i.isWeighted
      );
      if (idx !== -1) {
        state.cartItems[idx].qty += qty;
        state.cartItems[idx].lineTotal = state.cartItems[idx].qty * state.cartItems[idx].unitPrice;
        state.selectedIndex = idx; // Highlight existing item match
      } else {
        state.cartItems.push({
          cartId: uuid(),
          productId: product.id,
          variantId: null,
          name: product.name,
          qty,
          unit: product.measurement_unit,
          unitPrice: price,
          cost: product.product_cost,
          lineTotal: qty * price,
          isWeighted: false,
        });
        state.selectedIndex = state.cartItems.length - 1; // Highlight brand new item row
      }
    });
  },

  addWeightedProduct: (product, { qty = null, byPrice = null }, unitPrice = null) => {
    set((state) => {
      const price = unitPrice ?? product.selling_price_1;
      let lineTotal, displayQty;
      if (byPrice !== null) {
        lineTotal = byPrice;
        displayQty = byPrice / price;
      } else {
        displayQty = qty;
        lineTotal = qty * price;
      }
      state.cartItems.push({
        cartId: uuid(),
        productId: product.id,
        variantId: null,
        name: product.name,
        qty: parseFloat(displayQty.toFixed(3)),
        unit: product.measurement_unit,
        unitPrice: price,
        cost: product.product_cost,
        lineTotal,
        isWeighted: true,
        byPrice: byPrice !== null,
      });
      state.selectedIndex = state.cartItems.length - 1; // Highlight weighted item row
    });
  },

  addVariantProduct: (product, variant, qty = 1, unitPrice = null) => {
    set((state) => {
      const price = unitPrice ?? variant.selling_price_1;
      const idx = state.cartItems.findIndex((i) => i.variantId === variant.id);
      if (idx !== -1) {
        state.cartItems[idx].qty += qty;
        state.cartItems[idx].lineTotal = state.cartItems[idx].qty * state.cartItems[idx].unitPrice;
        state.selectedIndex = idx; // Highlight existing variant match
      } else {
        state.cartItems.push({
          cartId: uuid(),
          productId: product.id,
          variantId: variant.id,
          name: variant.variant_name,
          qty,
          unit: "pcs",
          unitPrice: price,
          cost: variant.product_cost,
          lineTotal: qty * price,
          isWeighted: false,
        });
        state.selectedIndex = state.cartItems.length - 1; // Highlight variant row
      }
    });
  },

  updateQty: (cartId, delta) => {
    set((state) => {
      const item = state.cartItems.find((i) => i.cartId === cartId);
      if (!item) return;
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        state.cartItems = state.cartItems.filter((i) => i.cartId !== cartId);
        if (state.selectedIndex >= state.cartItems.length) {
          state.selectedIndex = Math.max(0, state.cartItems.length - 1);
        }
      } else {
        item.qty = newQty;
        item.lineTotal = newQty * item.unitPrice;
      }
    });
  },

  removeCartItem: (cartId) => set((state) => {
    state.cartItems = state.cartItems.filter((i) => i.cartId !== cartId);
    if (state.selectedIndex >= state.cartItems.length) {
      state.selectedIndex = Math.max(0, state.cartItems.length - 1);
    }
  }),

  editWeightedItem: (cartId, { qty, byPrice }, unitPrice) => {
    set((state) => {
      const item = state.cartItems.find((i) => i.cartId === cartId);
      if (!item) return;
      const price = unitPrice ?? item.unitPrice;
      if (byPrice !== null && byPrice !== undefined) {
        item.qty = parseFloat((byPrice / price).toFixed(3));
        item.lineTotal = byPrice;
        item.byPrice = true;
      } else {
        item.qty = parseFloat(qty.toFixed(3));
        item.lineTotal = qty * price;
        item.byPrice = false;
      }
      item.unitPrice = price;
    });
  },

  setCartAdjustment: (type, value) => set((state) => {
    state.cartAdjustment = { type, value: Math.max(0, value) };
  }),

  clearCartAdjustment: () => set((state) => {
    state.cartAdjustment = { type: "discount", value: 0 };
  }),

  assignClient: (client) => set((state) => { state.cartClient = client; }),
  clearClient: () => set((state) => { state.cartClient = null; }),
  
  clearCart: () => set((state) => {
    state.cartItems = [];
    state.cartClient = null;
    state.cartAdjustment = { type: "discount", value: 0 };
    state.selectedIndex = 0; // Reset index
  }),

  // ── Suspension Parking Slots ──────────────────────────────────────────
  parkCart: () => set((state) => {
    if (state.cartItems.length === 0) return;
    state.parkedCarts.push({
      id: uuid(),
      items: JSON.parse(JSON.stringify(state.cartItems)),
      client: state.cartClient,
      adjustment: { ...state.cartAdjustment },
      parkedAt: new Date().toISOString(),
      label: state.cartClient ? state.cartClient.name : `Cart ${state.parkedCarts.length + 1}`,
    });
    state.cartItems = [];
    state.cartClient = null;
    state.cartAdjustment = { type: "discount", value: 0 };
    state.selectedIndex = 0; // Reset index
  }),

  restoreParkedCart: (parkedId) => set((state) => {
    const idx = state.parkedCarts.findIndex((c) => c.id === parkedId);
    if (idx === -1) return;

    if (state.cartItems.length > 0) {
      state.parkedCarts.push({
        id: uuid(),
        items: JSON.parse(JSON.stringify(state.cartItems)),
        client: state.cartClient,
        adjustment: { ...state.cartAdjustment },
        parkedAt: new Date().toISOString(),
        label: state.cartClient ? state.cartClient.name : `Cart ${state.parkedCarts.length + 1}`,
      });
    }

    const restored = state.parkedCarts[idx];
    state.cartItems = restored.items;
    state.cartClient = restored.client;
    state.cartAdjustment = restored.adjustment ?? { type: "discount", value: 0 };
    state.selectedIndex = 0; // Reset index to first position of restored elements
    state.parkedCarts.splice(idx, 1);
  }),

  deleteParkedCart: (parkedId) => set((state) => {
    state.parkedCarts = state.parkedCarts.filter((c) => c.id !== parkedId);
  }),

  // ── Checkout Modals Visibility ─────────────────────────────────────────
  openClientModal: () => set((s) => { s.clientModal = true; }),
  closeClientModal: () => set((s) => { s.clientModal = false; }),
  openTotalEditModal: () => set((s) => { s.totalEditModal = true; }),
  closeTotalEditModal: () => set((s) => { s.totalEditModal = false; }),
  openConfirmClearModal: () => set((s) => { s.confirmClearModal = true; }),
  closeConfirmClearModal: () => set((s) => { s.confirmClearModal = false; }),
  setBarcodeBuffer: (v) => set((s) => { s.barcodeBuffer = v; }),

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSACTION SALES DISPATCHER
  // ─────────────────────────────────────────────────────────────────────────
  executeSale: async (userId) => {
    const { cartItems, cartClient, cartAdjustment, getCartTotals } = get();

    if (cartItems.length === 0) return { success: false, reason: "empty_cart" };
    if (!userId) return { success: false, reason: "no_user" };

    const { subtotal, adjustmentType, adjustmentValue, total } = getCartTotals();

    const items = cartItems.map((item) => ({
      product_id: item.productId,
      variant_id: item.variantId ?? null,
      product_name: item.name,
      unit: item.unit,
      qty: item.qty,
      unit_cost: item.cost,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
      is_weighted: item.isWeighted,
    }));

    const payload = {
      user_id: userId,
      session_id: 1, 
      customer_id: cartClient?.id ?? null,
      subtotal,
      adj_type: adjustmentValue > 0 ? adjustmentType : "none",
      adj_value: adjustmentValue,
      total,
      items,
    };

    set((s) => { s.saleLoading = true; s.saleError = null; });
    try {
      const data = await posRepository.createSale(payload);
      set((s) => {
        s.cartItems = [];
        s.cartClient = null;
        s.cartAdjustment = { type: "discount", value: 0 };
        s.selectedIndex = 0; // Reset index
        s.saleLoading = false;
      });
      return { success: true, saleId: data.id };
    } catch (err) {
      const message = err?.response?.data ?? "Sale submission failed";
      set((s) => { s.saleError = message; s.saleLoading = false; });
      return { success: false, reason: message };
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BARCODE STREAM PROCESSING ENGINE
  // ─────────────────────────────────────────────────────────────────────────
  processBarcode: async (raw) => {
    const code = raw.trim();
    if (!code) return null;

    const evaluateProductMatch = (productList) => {
      for (const p of productList) {
        if (p.variants?.length) {
          const v = p.variants.find((vr) => vr.codebar === code);
          if (v) return { type: "variant_added", product: p, variant: v };
        }
      }
      const byCodebar = productList.find((p) => p.codebar === code);
      if (byCodebar) {
        if (byCodebar.product_type === "variable") return { type: "variant_modal", product: byCodebar };
        if (byCodebar.measurement_unit !== "pcs") return { type: "weight_modal", product: byCodebar };
        return { type: "simple_added", product: byCodebar };
      }
      const byRef = productList.find((p) => p.reference?.toLowerCase() === code.toLowerCase());
      if (byRef) {
        if (byRef.product_type === "variable") return { type: "variant_modal", product: byRef };
        if (byRef.measurement_unit !== "pcs") return { type: "weight_modal", product: byRef };
        return { type: "simple_added", product: byRef };
      }
      return null;
    };

    const localResult = evaluateProductMatch(get().products);
    
    if (localResult) {
      if (localResult.type === "variant_added") get().addVariantProduct(localResult.product, localResult.variant);
      if (localResult.type === "simple_added") get().addSimpleProduct(localResult.product);
      if (localResult.type === "variant_modal") get().openVariantModal(localResult.product);
      if (localResult.type === "weight_modal") get().openWeightModal(localResult.product);
      return localResult;
    }

    try {
      const response = await posRepository.getProducts(1, 1, code);

      if (response && response.data && response.data.length > 0) {
        const matchedProduct = response.data[0];
        const remoteResult = evaluateProductMatch([matchedProduct]);

        if (remoteResult) {
          set((state) => {
            if (!state.products.some((p) => p.id === matchedProduct.id)) {
              state.products.unshift(matchedProduct);
            }
          });

          if (remoteResult.type === "variant_added") get().addVariantProduct(matchedProduct, remoteResult.variant);
          if (remoteResult.type === "simple_added") get().addSimpleProduct(matchedProduct);
          if (remoteResult.type === "variant_modal") get().openVariantModal(matchedProduct);
          if (remoteResult.type === "weight_modal") get().openWeightModal(matchedProduct);
          return remoteResult;
        }
      }
    } catch (err) {
      console.error("❌ Live backend barcode query look-up collapsed:", err);
    }

    return { type: "not_found", code };
  },

  getCartTotals: () => {
    const { cartItems, cartAdjustment } = get();
    const subtotal = cartItems.reduce((s, i) => s + i.lineTotal, 0);
    const adj = cartAdjustment.value || 0;
    const total = cartAdjustment.type === "discount" ? Math.max(0, subtotal - adj) : subtotal + adj;
    return { subtotal, adjustmentType: cartAdjustment.type, adjustmentValue: adj, hasAdjustment: adj > 0, total };
  },

  getCartTotal: () => {
    const { cartItems, cartAdjustment } = get();
    const subtotal = cartItems.reduce((s, i) => s + i.lineTotal, 0);
    const adj = cartAdjustment.value || 0;
    return cartAdjustment.type === "discount" ? Math.max(0, subtotal - adj) : subtotal + adj;
  },

  getCartItemCount: () => get().cartItems.reduce((s, i) => s + i.qty, 0),
});
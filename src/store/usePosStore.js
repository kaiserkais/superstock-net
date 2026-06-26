/**
 * usePosStore.js — Zustand state management for the POS terminal
 * Now strictly handles state. Network calls are delegated to posRepository.
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { posRepository } from "../services/posRepository"; // <-- Update this path as needed

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uuid = () => Math.random().toString(36).slice(2, 10);

// ─── Store ────────────────────────────────────────────────────────────────────
const usePosStore = create(
  immer((set, get) => ({

    // ── Remote data ───────────────────────────────────────────────────────────
    products:   [],      // ProductOut[]
    categories: [],      // CategoryOut[]
    clients:    [],      // CustomerOut[]

    // Loading / error states per resource
    productsLoading:   false,
    categoriesLoading: false,
    clientsLoading:    false,
    productsError:     null,
    categoriesError:   null,
    clientsError:      null,

    // Sale submission state
    saleLoading: false,
    saleError:   null,

    // ── Cart ──────────────────────────────────────────────────────────────────
    cartItems:      [],    // [{ cartId, productId, variantId?, name, qty, unit, unitPrice, cost, lineTotal, isWeighted }]
    cartClient:     null,  // assigned customer object
    cartAdjustment: { type: "discount", value: 0 },

    // ── Parked carts ──────────────────────────────────────────────────────────
    parkedCarts: [],

    // ── Modals ────────────────────────────────────────────────────────────────
    weightModal:        null,   // { product, mode: 'add'|'edit', cartId? }
    variantModal:       null,   // { product }
    clientModal:        false,
    totalEditModal:     false,
    confirmClearModal:  false,

    // ── Product grid ──────────────────────────────────────────────────────────
    search:         "",
    categoryFilter: "all",
    gridPage:       1,
    PAGE_SIZE:      30,

    // ── Barcode buffer ────────────────────────────────────────────────────────
    barcodeBuffer: "",

    // ─────────────────────────────────────────────────────────────────────────
    // REMOTE DATA LOADERS
    // ─────────────────────────────────────────────────────────────────────────

    /** Load product catalog from the backend */
    loadProducts: async () => {
      set((s) => { s.productsLoading = true; s.productsError = null; });
      try {
        const data = await posRepository.getProducts();
        set((s) => {
          s.products = data;
          s.productsLoading = false;
        });
      } catch (err) {
        set((s) => {
          s.productsError = err?.response?.data ?? "Failed to load products";
          s.productsLoading = false;
        });
      }
    },

    /** Load category list from the backend */
    loadCategories: async () => {
      set((s) => { s.categoriesLoading = true; s.categoriesError = null; });
      try {
        const data = await posRepository.getCategories();
        set((s) => {
          s.categories = data;
          s.categoriesLoading = false;
        });
      } catch (err) {
        set((s) => {
          s.categoriesError = err?.response?.data ?? "Failed to load categories";
          s.categoriesLoading = false;
        });
      }
    },

    /** Load customer list from the backend */
    loadClients: async () => {
      set((s) => { s.clientsLoading = true; s.clientsError = null; });
      try {
        const data = await posRepository.getClients();
        set((s) => {
          s.clients = data;
          s.clientsLoading = false;
        });
      } catch (err) {
        set((s) => {
          s.clientsError = err?.response?.data ?? "Failed to load customers";
          s.clientsLoading = false;
        });
      }
    },

    /** Bootstrap: load all remote data in parallel */
    loadAll: async () => {
      const { loadProducts, loadCategories, loadClients } = get();
      await Promise.all([loadProducts(), loadCategories(), loadClients()]);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // CART ACTIONS (Unchanged)
    // ─────────────────────────────────────────────────────────────────────────

    addSimpleProduct: (product, qty = 1, unitPrice = null) => {
      set((state) => {
        const price = unitPrice ?? product.selling_price_1;
        const existing = state.cartItems.find(
          (i) => i.productId === product.id && !i.variantId && !i.isWeighted
        );
        if (existing) {
          existing.qty      += qty;
          existing.lineTotal = existing.qty * existing.unitPrice;
        } else {
          state.cartItems.push({
            cartId:    uuid(),
            productId: product.id,
            variantId: null,
            name:      product.name,
            qty,
            unit:      product.measurement_unit,
            unitPrice: price,
            cost:      product.product_cost,
            lineTotal: qty * price,
            isWeighted: false,
          });
        }
      });
    },

    addWeightedProduct: (product, { qty = null, byPrice = null }, unitPrice = null) => {
      set((state) => {
        const price = unitPrice ?? product.selling_price_1;
        let lineTotal, displayQty;
        if (byPrice !== null) {
          lineTotal  = byPrice;
          displayQty = byPrice / price;
        } else {
          displayQty = qty;
          lineTotal  = qty * price;
        }
        state.cartItems.push({
          cartId:     uuid(),
          productId:  product.id,
          variantId:  null,
          name:       product.name,
          qty:        parseFloat(displayQty.toFixed(3)),
          unit:       product.measurement_unit,
          unitPrice:  price,
          cost:       product.product_cost,
          lineTotal,
          isWeighted: true,
          byPrice:    byPrice !== null,
        });
      });
    },

    addVariantProduct: (product, variant, qty = 1, unitPrice = null) => {
      set((state) => {
        const price    = unitPrice ?? variant.selling_price_1;
        const existing = state.cartItems.find((i) => i.variantId === variant.id);
        if (existing) {
          existing.qty      += qty;
          existing.lineTotal = existing.qty * existing.unitPrice;
        } else {
          state.cartItems.push({
            cartId:     uuid(),
            productId:  product.id,
            variantId:  variant.id,
            name:       variant.variant_name,
            qty,
            unit:       "pcs",
            unitPrice:  price,
            cost:       variant.product_cost,
            lineTotal:  qty * price,
            isWeighted: false,
          });
        }
      });
    },

    updateQty: (cartId, delta) => {
      set((state) => {
        const item   = state.cartItems.find((i) => i.cartId === cartId);
        if (!item) return;
        const newQty = item.qty + delta;
        if (newQty <= 0) {
          state.cartItems = state.cartItems.filter((i) => i.cartId !== cartId);
        } else {
          item.qty       = newQty;
          item.lineTotal = newQty * item.unitPrice;
        }
      });
    },

    removeCartItem: (cartId) => {
      set((state) => {
        state.cartItems = state.cartItems.filter((i) => i.cartId !== cartId);
      });
    },

    editWeightedItem: (cartId, { qty, byPrice }, unitPrice) => {
      set((state) => {
        const item  = state.cartItems.find((i) => i.cartId === cartId);
        if (!item) return;
        const price = unitPrice ?? item.unitPrice;
        if (byPrice !== null && byPrice !== undefined) {
          item.qty       = parseFloat((byPrice / price).toFixed(3));
          item.lineTotal = byPrice;
          item.byPrice   = true;
        } else {
          item.qty       = parseFloat(qty.toFixed(3));
          item.lineTotal = qty * price;
          item.byPrice   = false;
        }
        item.unitPrice = price;
      });
    },

    setCartAdjustment: (type, value) => {
      set((state) => {
        state.cartAdjustment = { type, value: Math.max(0, value) };
      });
    },

    clearCartAdjustment: () => {
      set((state) => {
        state.cartAdjustment = { type: "discount", value: 0 };
      });
    },

    assignClient: (client) => {
      set((state) => { state.cartClient = client; });
    },

    clearClient: () => {
      set((state) => { state.cartClient = null; });
    },

    parkCart: () => {
      set((state) => {
        if (state.cartItems.length === 0) return;
        state.parkedCarts.push({
          id:         uuid(),
          items:      JSON.parse(JSON.stringify(state.cartItems)),
          client:     state.cartClient,
          adjustment: { ...state.cartAdjustment },
          parkedAt:   new Date().toISOString(),
          label:      state.cartClient
            ? state.cartClient.name
            : `Cart ${state.parkedCarts.length + 1}`,
        });
        state.cartItems      = [];
        state.cartClient     = null;
        state.cartAdjustment = { type: "discount", value: 0 };
      });
    },

    restoreParkedCart: (parkedId) => {
      set((state) => {
        const idx = state.parkedCarts.findIndex((c) => c.id === parkedId);
        if (idx === -1) return;

        if (state.cartItems.length > 0) {
          state.parkedCarts.push({
            id:         uuid(),
            items:      JSON.parse(JSON.stringify(state.cartItems)),
            client:     state.cartClient,
            adjustment: { ...state.cartAdjustment },
            parkedAt:   new Date().toISOString(),
            label:      state.cartClient
              ? state.cartClient.name
              : `Cart ${state.parkedCarts.length + 1}`,
          });
        }

        const restored          = state.parkedCarts[idx];
        state.cartItems         = restored.items;
        state.cartClient        = restored.client;
        state.cartAdjustment    = restored.adjustment ?? { type: "discount", value: 0 };
        state.parkedCarts.splice(idx, 1);
      });
    },

    deleteParkedCart: (parkedId) => {
      set((state) => {
        state.parkedCarts = state.parkedCarts.filter((c) => c.id !== parkedId);
      });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // EXECUTE SALE
    // ─────────────────────────────────────────────────────────────────────────

    executeSale: async (userId) => {
      const { cartItems, cartClient, cartAdjustment, getCartTotals } = get();

      if (cartItems.length === 0) return { success: false, reason: "empty_cart" };
      if (!userId)                return { success: false, reason: "no_user" };

      const { subtotal, adjustmentType, adjustmentValue, total } = getCartTotals();

      const items = cartItems.map((item) => ({
        product_id:   item.productId,
        variant_id:   item.variantId ?? null,
        product_name: item.name,
        unit:         item.unit,
        qty:          item.qty,
        unit_cost:    item.cost,
        unit_price:   item.unitPrice,
        line_total:   item.lineTotal,
        is_weighted:  item.isWeighted,
      }));

      const payload = {
        user_id:     userId,
        session_id:  1,
        customer_id: cartClient?.id ?? null,
        subtotal,
        adj_type:    adjustmentValue > 0 ? adjustmentType : "none",
        adj_value:   adjustmentValue,
        total,
        items,
      };

      set((s) => { s.saleLoading = true; s.saleError = null; });
      try {
        // Delegate to repository
        const data = await posRepository.createSale(payload);

        set((s) => {
          s.cartItems      = [];
          s.cartClient     = null;
          s.cartAdjustment = { type: "discount", value: 0 };
          s.saleLoading    = false;
        });
        
        return { success: true, saleId: data.id };
      } catch (err) {
        const message = err?.response?.data ?? "Sale submission failed";
        set((s) => { s.saleError = message; s.saleLoading = false; });
        return { success: false, reason: message };
      }
    },

    clearCart: () => {
      set((state) => {
        state.cartItems      = [];
        state.cartClient     = null;
        state.cartAdjustment = { type: "discount", value: 0 };
      });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MODAL & FILTER CONTROLS (Unchanged)
    // ─────────────────────────────────────────────────────────────────────────

    openWeightModal:      (product)        => set((s) => { s.weightModal = { product, mode: "add" }; }),
    openWeightEditModal:  (cartId, product) => set((s) => { s.weightModal = { product, mode: "edit", cartId }; }),
    closeWeightModal:     ()               => set((s) => { s.weightModal = null; }),
    openVariantModal:     (product)        => set((s) => { s.variantModal = { product }; }),
    closeVariantModal:    ()               => set((s) => { s.variantModal = null; }),
    openClientModal:      ()               => set((s) => { s.clientModal = true; }),
    closeClientModal:     ()               => set((s) => { s.clientModal = false; }),
    openTotalEditModal:   ()               => set((s) => { s.totalEditModal = true; }),
    closeTotalEditModal:  ()               => set((s) => { s.totalEditModal = false; }),
    openConfirmClearModal:  ()             => set((s) => { s.confirmClearModal = true; }),
    closeConfirmClearModal: ()             => set((s) => { s.confirmClearModal = false; }),
    setSearch:         (v) => set((s) => { s.search = v; s.gridPage = 1; }),
    setCategoryFilter: (v) => set((s) => { s.categoryFilter = v; s.gridPage = 1; }),
    loadMoreProducts:  ()  => set((s) => { s.gridPage += 1; }),
    setBarcodeBuffer: (v) => set((s) => { s.barcodeBuffer = v; }),

    // ─────────────────────────────────────────────────────────────────────────
    // BARCODE SCANNER (Unchanged)
    // ─────────────────────────────────────────────────────────────────────────

    processBarcode: (raw) => {
      const code     = raw.trim();
      if (!code) return null;
      const products = get().products;

      for (const p of products) {
        if (p.variants?.length) {
          const v = p.variants.find((vr) => vr.codebar === code);
          if (v) {
            get().addVariantProduct(p, v);
            return { type: "variant_added", product: p, variant: v };
          }
        }
      }

      const byCodebar = products.find((p) => p.codebar === code);
      if (byCodebar) {
        if (byCodebar.product_type === "variable") {
          get().openVariantModal(byCodebar);
          return { type: "variant_modal", product: byCodebar };
        }
        if (byCodebar.measurement_unit !== "pcs") {
          get().openWeightModal(byCodebar);
          return { type: "weight_modal", product: byCodebar };
        }
        get().addSimpleProduct(byCodebar);
        return { type: "simple_added", product: byCodebar };
      }

      const byRef = products.find(
        (p) => p.reference?.toLowerCase() === code.toLowerCase()
      );
      if (byRef) {
        if (byRef.product_type === "variable") {
          get().openVariantModal(byRef);
          return { type: "variant_modal", product: byRef };
        }
        if (byRef.measurement_unit !== "pcs") {
          get().openWeightModal(byRef);
          return { type: "weight_modal", product: byRef };
        }
        get().addSimpleProduct(byRef);
        return { type: "simple_added", product: byRef };
      }

      return { type: "not_found", code };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // DERIVED GETTERS (Unchanged)
    // ─────────────────────────────────────────────────────────────────────────

    getFilteredProducts: () => {
      const { products, search, categoryFilter, gridPage, PAGE_SIZE } = get();
      let list = products;
      if (categoryFilter !== "all") {
        list = list.filter((p) => p.category_id === categoryFilter);
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.reference?.toLowerCase().includes(q) ||
            p.codebar?.includes(q) ||
            p.variants?.some(
              (v) =>
                v.variant_name.toLowerCase().includes(q) ||
                v.codebar.includes(q)
            )
        );
      }
      const total   = list.length;
      const visible = list.slice(0, gridPage * PAGE_SIZE);
      return { products: visible, hasMore: visible.length < total, total };
    },

    getCartTotals: () => {
      const { cartItems, cartAdjustment } = get();
      const subtotal = cartItems.reduce((s, i) => s + i.lineTotal, 0);
      const adj      = cartAdjustment.value || 0;
      const total    =
        cartAdjustment.type === "discount"
          ? Math.max(0, subtotal - adj)
          : subtotal + adj;
      return { subtotal, adjustmentType: cartAdjustment.type, adjustmentValue: adj, hasAdjustment: adj > 0, total };
    },

    getCartTotal: () => {
      const { cartItems, cartAdjustment } = get();
      const subtotal = cartItems.reduce((s, i) => s + i.lineTotal, 0);
      const adj      = cartAdjustment.value || 0;
      return cartAdjustment.type === "discount" ? Math.max(0, subtotal - adj) : subtotal + adj;
    },

    getCartItemCount: () => get().cartItems.reduce((s, i) => s + i.qty, 0),
  }))
);

export default usePosStore;
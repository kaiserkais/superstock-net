/**
 * usePosStore.js — Zustand state management for the POS terminal
 * Handles application state. Network calls are delegated to posRepository.
 * Fully optimized for Historical Snapshotting of sales records.
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { posRepository } from "../services/posRepository"; // Update this path based on your directory structure

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uuid = () => Math.random().toString(36).slice(2, 10);

// ─── Store ────────────────────────────────────────────────────────────────────
const usePosStore = create(
  immer((set, get) => ({

    // ── Remote data ───────────────────────────────────────────────────────────
    products: [],

    productsTotal: 0,
    productsPage: 1,
    productsPerPage: 30,
    productsHasMore: true,   // ProductOut[]
    categories: [],      // CategoryOut[]
    clients: [],      // CustomerOut[]

    // Loading / error states per resource
    productsLoading: false,
    categoriesLoading: false,
    clientsLoading: false,
    productsError: null,
    categoriesError: null,
    clientsError: null,

    // Sale submission state
    saleLoading: false,
    saleError: null,

    // ── Cart ──────────────────────────────────────────────────────────────────
    // Each item explicitly captures 'name', 'cost', 'unitPrice', and 'unit' 
    // to safeguard historical snapshotting integrity.
    cartItems: [],    // [{ cartId, productId, variantId?, name, qty, unit, unitPrice, cost, lineTotal, isWeighted }]
    cartClient: null,  // Assigned customer object
    cartAdjustment: { type: "discount", value: 0 },

    // ── Parked carts ──────────────────────────────────────────────────────────
    parkedCarts: [],

    // ── Modals ────────────────────────────────────────────────────────────────
    weightModal: null,   // { product, mode: 'add'|'edit', cartId? }
    variantModal: null,   // { product }
    clientModal: false,
    totalEditModal: false,
    confirmClearModal: false,

    // ── Product grid ──────────────────────────────────────────────────────────
    search: "",
    categoryFilter: "all",
    gridPage: 1,
    PAGE_SIZE: 30,

    // ── Barcode buffer ────────────────────────────────────────────────────────
    barcodeBuffer: "",

    // ─────────────────────────────────────────────────────────────────────────
    // REMOTE DATA LOADERS
    // ─────────────────────────────────────────────────────────────────────────

    /** Load product catalog from the backend */
    loadProducts: async (reset = true) => {
      // 1. If resetting, force the page back to 1 immediately
      if (reset) {
        set((s) => {
          s.productsPage = 1;
          s.productsHasMore = true;
          // Optional: s.products = []; // Clear current list to avoid layout jumps
        });
      }

      const {
        productsPage,
        productsPerPage,
        search,
      } = get();

      set((s) => {
        s.productsLoading = true;
        s.productsError = null;
      });

      try {
        const response = await posRepository.getProducts(
          productsPage,
          productsPerPage,
          search
        );

        set((s) => {
          if (reset) {
            s.products = response.data;
          } else {
            // Prevent duplicate items if network requests overlap
            const existingIds = new Set(s.products.map((p) => p.id));
            const newProducts = response.data.filter((p) => !existingIds.has(p.id));
            s.products.push(...newProducts);
          }

          s.productsTotal = response.total;
          // If our local array matches or exceeds total items, we are done
          s.productsHasMore = s.products.length < response.total;
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
    // CART ACTIONS (Captures immutable field states at insertion time)
    // ─────────────────────────────────────────────────────────────────────────

    addSimpleProduct: (product, qty = 1, unitPrice = null) => {
      set((state) => {
        const price = unitPrice ?? product.selling_price_1;
        const existing = state.cartItems.find(
          (i) => i.productId === product.id && !i.variantId && !i.isWeighted
        );
        if (existing) {
          existing.qty += qty;
          existing.lineTotal = existing.qty * existing.unitPrice;
        } else {
          state.cartItems.push({
            cartId: uuid(),
            productId: product.id,
            variantId: null,
            name: product.name, // Snapshot name
            qty,
            unit: product.measurement_unit, // Snapshot unit
            unitPrice: price, // Snapshot current unit price
            cost: product.product_cost, // Snapshot cost price
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
          name: product.name, // Snapshot name
          qty: parseFloat(displayQty.toFixed(3)),
          unit: product.measurement_unit, // Snapshot unit
          unitPrice: price, // Snapshot unit price
          cost: product.product_cost, // Snapshot cost price
          lineTotal,
          isWeighted: true,
          byPrice: byPrice !== null,
        });
      });
    },

    addVariantProduct: (product, variant, qty = 1, unitPrice = null) => {
      set((state) => {
        const price = unitPrice ?? variant.selling_price_1;
        const existing = state.cartItems.find((i) => i.variantId === variant.id);
        if (existing) {
          existing.qty += qty;
          existing.lineTotal = existing.qty * existing.unitPrice;
        } else {
          state.cartItems.push({
            cartId: uuid(),
            productId: product.id,
            variantId: variant.id,
            name: variant.variant_name, // Snapshot variant-specific name
            qty,
            unit: "pcs",
            unitPrice: price, // Snapshot unit price
            cost: variant.product_cost, // Snapshot variant cost price
            lineTotal: qty * price,
            isWeighted: false,
          });
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
        } else {
          item.qty = newQty;
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
          id: uuid(),
          items: JSON.parse(JSON.stringify(state.cartItems)),
          client: state.cartClient,
          adjustment: { ...state.cartAdjustment },
          parkedAt: new Date().toISOString(),
          label: state.cartClient
            ? state.cartClient.name
            : `Cart ${state.parkedCarts.length + 1}`,
        });
        state.cartItems = [];
        state.cartClient = null;
        state.cartAdjustment = { type: "discount", value: 0 };
      });
    },

    restoreParkedCart: (parkedId) => {
      set((state) => {
        const idx = state.parkedCarts.findIndex((c) => c.id === parkedId);
        if (idx === -1) return;

        if (state.cartItems.length > 0) {
          state.parkedCarts.push({
            id: uuid(),
            items: JSON.parse(JSON.stringify(state.cartItems)),
            client: state.cartClient,
            adjustment: { ...state.cartAdjustment },
            parkedAt: new Date().toISOString(),
            label: state.cartClient
              ? state.cartClient.name
              : `Cart ${state.parkedCarts.length + 1}`,
          });
        }

        const restored = state.parkedCarts[idx];
        state.cartItems = restored.items;
        state.cartClient = restored.client;
        state.cartAdjustment = restored.adjustment ?? { type: "discount", value: 0 };
        state.parkedCarts.splice(idx, 1);
      });
    },

    deleteParkedCart: (parkedId) => {
      set((state) => {
        state.parkedCarts = state.parkedCarts.filter((c) => c.id !== parkedId);
      });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // EXECUTE SALE (Compiles snapshot values into the outbound network request)
    // ─────────────────────────────────────────────────────────────────────────

    executeSale: async (userId) => {
      const { cartItems, cartClient, cartAdjustment, getCartTotals } = get();

      if (cartItems.length === 0) return { success: false, reason: "empty_cart" };
      if (!userId) return { success: false, reason: "no_user" };

      const { subtotal, adjustmentType, adjustmentValue, total } = getCartTotals();

      // Compiling the items payload using explicit snapshot values from cartItems
      const items = cartItems.map((item) => ({
        product_id: item.productId,
        variant_id: item.variantId ?? null,
        product_name: item.name,        // Preserved historical name/variant name
        unit: item.unit,        // Preserved historical unit (e.g., 'pcs', 'kg')
        qty: item.qty,
        unit_cost: item.cost,        // Preserved historical purchasing cost
        unit_price: item.unitPrice,   // Preserved historical retail selling price
        line_total: item.lineTotal,
        is_weighted: item.isWeighted,
      }));

      const payload = {
        user_id: userId,
        session_id: 1, // Replace with dynamic active session ID tracking if added later
        customer_id: cartClient?.id ?? null,
        subtotal,
        adj_type: adjustmentValue > 0 ? adjustmentType : "none",
        adj_value: adjustmentValue,
        total,
        items,
      };

      set((s) => { s.saleLoading = true; s.saleError = null; });
      try {
        // Delegate to repository network boundary
        const data = await posRepository.createSale(payload);

        set((s) => {
          s.cartItems = [];
          s.cartClient = null;
          s.cartAdjustment = { type: "discount", value: 0 };
          s.saleLoading = false;
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
        state.cartItems = [];
        state.cartClient = null;
        state.cartAdjustment = { type: "discount", value: 0 };
      });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MODAL & FILTER CONTROLS 
    // ─────────────────────────────────────────────────────────────────────────

    openWeightModal: (product) => set((s) => { s.weightModal = { product, mode: "add" }; }),
    openWeightEditModal: (cartId, product) => set((s) => { s.weightModal = { product, mode: "edit", cartId }; }),
    closeWeightModal: () => set((s) => { s.weightModal = null; }),
    openVariantModal: (product) => set((s) => { s.variantModal = { product }; }),
    closeVariantModal: () => set((s) => { s.variantModal = null; }),
    openClientModal: () => set((s) => { s.clientModal = true; }),
    closeClientModal: () => set((s) => { s.clientModal = false; }),
    openTotalEditModal: () => set((s) => { s.totalEditModal = true; }),
    closeTotalEditModal: () => set((s) => { s.totalEditModal = false; }),
    openConfirmClearModal: () => set((s) => { s.confirmClearModal = true; }),
    closeConfirmClearModal: () => set((s) => { s.confirmClearModal = false; }),
    setSearch: (v) =>
      set((s) => {
        s.search = v;
        s.products = [];
        s.productsPage = 1;
        s.productsHasMore = true;
      }),
    setCategoryFilter: (v) => 
      set((s) => { 
        s.categoryFilter = v; 
        s.products = [];      // 👈 Clear list on category change
        s.productsPage = 1;   // 👈 Reset pagination index
        s.productsHasMore = true;
      }),
    loadMoreProducts: async () => {
      const {
        productsLoading,
        productsHasMore,
        productsPage,
        loadProducts,
      } = get();

      // Prevent duplicate requests
      if (productsLoading || !productsHasMore) return;

      set((s) => {
        s.productsPage += 1;
      });

      await loadProducts(false);
    },
    setBarcodeBuffer: (v) => set((s) => { s.barcodeBuffer = v; }),

    // ─────────────────────────────────────────────────────────────────────────
    // BARCODE SCANNER 
    // ─────────────────────────────────────────────────────────────────────────

    processBarcode: async (raw) => {
      const code = raw.trim();
      if (!code) return null;

      // Inner helper to handle local scanning evaluation logic matching your rules
      const evaluateProductMatch = (productList) => {
        // A. Look for matches in variant sub-matrices first
        for (const p of productList) {
          if (p.variants?.length) {
            const v = p.variants.find((vr) => vr.codebar === code);
            if (v) {
              return { type: "variant_added", product: p, variant: v };
            }
          }
        }

        // B. Look for matches against standard codebar
        const byCodebar = productList.find((p) => p.codebar === code);
        if (byCodebar) {
          if (byCodebar.product_type === "variable") return { type: "variant_modal", product: byCodebar };
          if (byCodebar.measurement_unit !== "pcs") return { type: "weight_modal", product: byCodebar };
          return { type: "simple_added", product: byCodebar };
        }

        // C. Look for matches against standard product SKU / references
        const byRef = productList.find((p) => p.reference?.toLowerCase() === code.toLowerCase());
        if (byRef) {
          if (byRef.product_type === "variable") return { type: "variant_modal", product: byRef };
          if (byRef.measurement_unit !== "pcs") return { type: "weight_modal", product: byRef };
          return { type: "simple_added", product: byRef };
        }

        return null;
      };

      // STEP 1: Attempt matching against current locally loaded page arrays
      const localResult = evaluateProductMatch(get().products);
      
      if (localResult) {
        // Execute state actions for cache hits
        if (localResult.type === "variant_added") get().addVariantProduct(localResult.product, localResult.variant);
        if (localResult.type === "simple_added") get().addSimpleProduct(localResult.product);
        if (localResult.type === "variant_modal") get().openVariantModal(localResult.product);
        if (localResult.type === "weight_modal") get().openWeightModal(localResult.product);
        return localResult;
      }

      // STEP 2: Fallback to Backend if the scanned barcode isn't loaded in the current page block
      try {
        // Search the backend using code as the string query parameter (1 item limit)
        const response = await posRepository.getProducts(1, 1, code);

        if (response && response.data && response.data.length > 0) {
          const matchedProduct = response.data[0];
          const remoteResult = evaluateProductMatch([matchedProduct]);

          if (remoteResult) {
            // Push it into our local product list so components reference it seamlessly
            set((state) => {
              if (!state.products.some((p) => p.id === matchedProduct.id)) {
                state.products.unshift(matchedProduct);
              }
            });

            // Execute state actions for database hits
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

    // ─────────────────────────────────────────────────────────────────────────
    // DERIVED GETTERS 
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
      const { productsHasMore, productsTotal } = get();

      return {
        products: list,
        hasMore: productsHasMore,
        total: productsTotal,
      };
    },

    getCartTotals: () => {
      const { cartItems, cartAdjustment } = get();
      const subtotal = cartItems.reduce((s, i) => s + i.lineTotal, 0);
      const adj = cartAdjustment.value || 0;
      const total =
        cartAdjustment.type === "discount"
          ? Math.max(0, subtotal - adj)
          : subtotal + adj;
      return { subtotal, adjustmentType: cartAdjustment.type, adjustmentValue: adj, hasAdjustment: adj > 0, total };
    },

    getCartTotal: () => {
      const { cartItems, cartAdjustment } = get();
      const subtotal = cartItems.reduce((s, i) => s + i.lineTotal, 0);
      const adj = cartAdjustment.value || 0;
      return cartAdjustment.type === "discount" ? Math.max(0, subtotal - adj) : subtotal + adj;
    },

    getCartItemCount: () => get().cartItems.reduce((s, i) => s + i.qty, 0),
  }))
);

export default usePosStore;
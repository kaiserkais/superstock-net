/**
 * usePosStore.js — Zustand state management for the POS terminal
 * Handles: cart items, parked carts, client assignment,
 *          weighted/variant modals, keyboard shortcuts, search/filter
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uuid = () => Math.random().toString(36).slice(2, 10);

const calcCartTotals = (items) => {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { subtotal, total: subtotal };
};

// ─── Mock product catalog (mirrors your SQLite schema) ────────────────────────
// Replace these with real Tauri invoke calls later
export const MOCK_PRODUCTS = [
  {
    id: "p_simple_1",
    name: "Air Jordan 1 Low",
    product_type: "simple",
    reference: "SKU-AJ1-LOW",
    codebar: "6131234567890",
    quantity: 12,
    product_cost: 11000,
    selling_price_1: 15000,
    selling_price_2: 14000,
    selling_price_3: 13500,
    selling_price_4: 13000,
    measurement_unit: "pcs",
    category_id: "cat_1",
    category_name: "Footwear / Shoes",
    supplier_id: "s1",
    image_path: null,
  },
  {
    id: "p_var_1",
    name: "Premium Suede Loafers",
    product_type: "variable",
    reference: "SKU-LOAF-SR",
    codebar: null,
    quantity: 0, // derived from variants
    product_cost: 8500,
    selling_price_1: 12000,
    selling_price_2: 11000,
    selling_price_3: 10500,
    selling_price_4: 10000,
    measurement_unit: "pcs",
    category_id: "cat_1",
    category_name: "Footwear / Shoes",
    supplier_id: "s1",
    image_path: null,
    variants: [
      { id: "v_1", variant_name: "Suede Loafers (41 - Black)", codebar: "613998877001", quantity: 5, product_cost: 8500, selling_price_1: 12000 },
      { id: "v_2", variant_name: "Suede Loafers (42 - Black)", codebar: "613998877002", quantity: 8, product_cost: 8500, selling_price_1: 12000 },
      { id: "v_3", variant_name: "Suede Loafers (43 - Brown)", codebar: "613998877003", quantity: 3, product_cost: 8500, selling_price_1: 12000 },
    ],
  },
  {
    id: "p_simple_2",
    name: "Caftan Traditionnel Doré",
    product_type: "simple",
    reference: "SKU-CAFT-001",
    codebar: "6139988770099",
    quantity: 6,
    product_cost: 18000,
    selling_price_1: 28000,
    selling_price_2: 26000,
    selling_price_3: 25000,
    selling_price_4: 24000,
    measurement_unit: "pcs",
    category_id: "cat_2",
    category_name: "Traditional Clothing",
    supplier_id: "s1",
    image_path: null,
  },
  {
    id: "p_simple_3",
    name: "Tissu Broderie Algéroise",
    product_type: "simple",
    reference: "SKU-TIS-ALG",
    codebar: "6139988770100",
    quantity: 50,
    product_cost: 1200,
    selling_price_1: 2000,
    selling_price_2: 1800,
    selling_price_3: 1700,
    selling_price_4: 1600,
    measurement_unit: "kg",
    category_id: "cat_2",
    category_name: "Traditional Clothing",
    supplier_id: "s1",
    image_path: null,
  },
  {
    id: "p_simple_4",
    name: "Sneakers Urban Runner",
    product_type: "simple",
    reference: "SKU-URB-RUN",
    codebar: "6131234567891",
    quantity: 20,
    product_cost: 7000,
    selling_price_1: 10000,
    selling_price_2: 9500,
    selling_price_3: 9000,
    selling_price_4: 8500,
    measurement_unit: "pcs",
    category_id: "cat_1",
    category_name: "Footwear / Shoes",
    supplier_id: "s1",
    image_path: null,
  },
  {
    id: "p_var_2",
    name: "Djellaba Homme Premium",
    product_type: "variable",
    reference: "SKU-DJEL-H",
    codebar: null,
    quantity: 0,
    product_cost: 5000,
    selling_price_1: 8500,
    selling_price_2: 8000,
    selling_price_3: 7500,
    selling_price_4: 7000,
    measurement_unit: "pcs",
    category_id: "cat_2",
    category_name: "Traditional Clothing",
    supplier_id: "s1",
    image_path: null,
    variants: [
      { id: "v_d1", variant_name: "Djellaba Homme (S - Blanc)", codebar: "613000100001", quantity: 4, product_cost: 5000, selling_price_1: 8500 },
      { id: "v_d2", variant_name: "Djellaba Homme (M - Blanc)", codebar: "613000100002", quantity: 7, product_cost: 5000, selling_price_1: 8500 },
      { id: "v_d3", variant_name: "Djellaba Homme (L - Beige)", codebar: "613000100003", quantity: 2, product_cost: 5000, selling_price_1: 8500 },
    ],
  },
  {
    id: "p_simple_5",
    name: "Sandales Cuir Kabyle",
    product_type: "simple",
    reference: "SKU-SAND-KAB",
    codebar: "6131234500001",
    quantity: 15,
    product_cost: 3500,
    selling_price_1: 5500,
    selling_price_2: 5000,
    selling_price_3: 4800,
    selling_price_4: 4500,
    measurement_unit: "pcs",
    category_id: "cat_1",
    category_name: "Footwear / Shoes",
    supplier_id: "s1",
    image_path: null,
  },
  {
    id: "p_simple_6",
    name: "Encens Bakhour El Hanou",
    product_type: "simple",
    reference: "SKU-BAK-001",
    codebar: "6139900000001",
    quantity: 100,
    product_cost: 300,
    selling_price_1: 500,
    selling_price_2: 450,
    selling_price_3: 420,
    selling_price_4: 400,
    measurement_unit: "g",
    category_id: "cat_2",
    category_name: "Traditional Clothing",
    supplier_id: "s1",
    image_path: null,
  },
];

export const MOCK_CATEGORIES = [
  { id: "cat_1", name: "Footwear / Shoes" },
  { id: "cat_2", name: "Traditional Clothing" },
];

export const MOCK_CLIENTS = [
  { id: "c1", name: "Amine Belkacem",   phone_number: "0666123456", address: "Constantine", total_debt: 2500 },
  { id: "c2", name: "Fatima Zerrouki",  phone_number: "0777234567", address: "Alger",       total_debt: 0    },
  { id: "c3", name: "Yacine Hamidi",    phone_number: "0555345678", address: "Oran",        total_debt: 0    },
];

// ─── Store ────────────────────────────────────────────────────────────────────
const usePosStore = create(
  immer((set, get) => ({
    // ── Cart ──────────────────────────────────────────────────────────────────
    cartItems: [],         // [{ cartId, productId, variantId?, name, qty, unit, unitPrice, cost, lineTotal, isWeighted }]
    cartClient: null,      // assigned client object
    cartTotal: 0,          // editable override (null = auto from items)
    cartTotalOverride: false,

    // ── Parked carts ──────────────────────────────────────────────────────────
    parkedCarts: [],       // [{ id, items, client, total, parkedAt, label }]

    // ── Modals ────────────────────────────────────────────────────────────────
    weightModal: null,     // { product, mode: 'add' | 'edit', cartId? }
    variantModal: null,    // { product }
    clientModal: false,
    totalEditModal: false,
    confirmClearModal: false,

    // ── Product grid ─────────────────────────────────────────────────────────
    search: "",
    categoryFilter: "all",
    gridPage: 1,           // for infinite scroll simulation
    PAGE_SIZE: 30,

    // ── Barcode / search input ────────────────────────────────────────────────
    barcodeBuffer: "",

    // ─────────────────────────────────────────────────────────────────────────
    // CART ACTIONS
    // ─────────────────────────────────────────────────────────────────────────

    /** Add a simple pcs product directly */
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
            name: product.name,
            qty,
            unit: product.measurement_unit,
            unitPrice: price,
            cost: product.product_cost,
            lineTotal: qty * price,
            isWeighted: false,
          });
        }
        _recalcTotal(state);
      });
    },

    /** Add a weighted/measured product (kg/g/etc) or by price */
    addWeightedProduct: (product, { qty = null, byPrice = null }, unitPrice = null) => {
      set((state) => {
        const price = unitPrice ?? product.selling_price_1;
        let lineTotal, displayQty;
        if (byPrice !== null) {
          // client asks for X DA worth → qty = byPrice / price
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
        _recalcTotal(state);
      });
    },

    /** Add a product variant to the cart */
    addVariantProduct: (product, variant, qty = 1, unitPrice = null) => {
      set((state) => {
        const price = unitPrice ?? variant.selling_price_1;
        const existing = state.cartItems.find(
          (i) => i.variantId === variant.id
        );
        if (existing) {
          existing.qty += qty;
          existing.lineTotal = existing.qty * existing.unitPrice;
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
        }
        _recalcTotal(state);
      });
    },

    /** Update quantity of a pcs cart item */
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
        _recalcTotal(state);
      });
    },

    /** Remove a cart item */
    removeCartItem: (cartId) => {
      set((state) => {
        state.cartItems = state.cartItems.filter((i) => i.cartId !== cartId);
        _recalcTotal(state);
      });
    },

    /** Edit weighted item: replace with new measurement */
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
        _recalcTotal(state);
      });
    },

    /** Set cart total override */
    setTotalOverride: (value) => {
      set((state) => {
        state.cartTotal = value;
        state.cartTotalOverride = true;
      });
    },

    clearTotalOverride: () => {
      set((state) => {
        state.cartTotalOverride = false;
        _recalcTotal(state);
      });
    },

    /** Assign client to current cart */
    assignClient: (client) => {
      set((state) => { state.cartClient = client; });
    },

    clearClient: () => {
      set((state) => { state.cartClient = null; });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PARKED CARTS
    // ─────────────────────────────────────────────────────────────────────────

    /** Park the current cart (if has items) and start fresh */
    parkCart: () => {
      set((state) => {
        if (state.cartItems.length === 0) return;
        state.parkedCarts.push({
          id: uuid(),
          items: JSON.parse(JSON.stringify(state.cartItems)),
          client: state.cartClient,
          total: state.cartTotal,
          totalOverride: state.cartTotalOverride,
          parkedAt: new Date().toISOString(),
          label: state.cartClient
            ? state.cartClient.name
            : `Cart ${state.parkedCarts.length + 1}`,
        });
        state.cartItems = [];
        state.cartClient = null;
        state.cartTotal = 0;
        state.cartTotalOverride = false;
      });
    },

    /** Restore a parked cart — current active cart gets parked if non-empty */
    restoreParkedCart: (parkedId) => {
      set((state) => {
        const idx = state.parkedCarts.findIndex((c) => c.id === parkedId);
        if (idx === -1) return;

        // Park current if non-empty
        if (state.cartItems.length > 0) {
          state.parkedCarts.push({
            id: uuid(),
            items: JSON.parse(JSON.stringify(state.cartItems)),
            client: state.cartClient,
            total: state.cartTotal,
            totalOverride: state.cartTotalOverride,
            parkedAt: new Date().toISOString(),
            label: state.cartClient
              ? state.cartClient.name
              : `Cart ${state.parkedCarts.length + 1}`,
          });
        }

        const restored = state.parkedCarts[idx];
        state.cartItems = restored.items;
        state.cartClient = restored.client;
        state.cartTotal = restored.total;
        state.cartTotalOverride = restored.totalOverride;

        // Remove from parked
        state.parkedCarts.splice(idx, 1);
      });
    },

    deleteParkedCart: (parkedId) => {
      set((state) => {
        state.parkedCarts = state.parkedCarts.filter((c) => c.id !== parkedId);
      });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SALE / CLEAR
    // ─────────────────────────────────────────────────────────────────────────

    executeSale: () => {
      set((state) => {
        // TODO: call Tauri invoke to persist the sale to SQLite
        // For now just clear
        state.cartItems = [];
        state.cartClient = null;
        state.cartTotal = 0;
        state.cartTotalOverride = false;
      });
    },

    clearCart: () => {
      set((state) => {
        state.cartItems = [];
        state.cartClient = null;
        state.cartTotal = 0;
        state.cartTotalOverride = false;
      });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MODAL CONTROLS
    // ─────────────────────────────────────────────────────────────────────────

    openWeightModal: (product) =>
      set((state) => { state.weightModal = { product, mode: "add" }; }),

    openWeightEditModal: (cartId, product) =>
      set((state) => { state.weightModal = { product, mode: "edit", cartId }; }),

    closeWeightModal: () =>
      set((state) => { state.weightModal = null; }),

    openVariantModal: (product) =>
      set((state) => { state.variantModal = { product }; }),

    closeVariantModal: () =>
      set((state) => { state.variantModal = null; }),

    openClientModal: () =>
      set((state) => { state.clientModal = true; }),

    closeClientModal: () =>
      set((state) => { state.clientModal = false; }),

    openTotalEditModal: () =>
      set((state) => { state.totalEditModal = true; }),

    closeTotalEditModal: () =>
      set((state) => { state.totalEditModal = false; }),

    openConfirmClearModal: () =>
      set((state) => { state.confirmClearModal = true; }),

    closeConfirmClearModal: () =>
      set((state) => { state.confirmClearModal = false; }),

    // ─────────────────────────────────────────────────────────────────────────
    // PRODUCT GRID FILTERS
    // ─────────────────────────────────────────────────────────────────────────

    setSearch: (v) =>
      set((state) => { state.search = v; state.gridPage = 1; }),

    setCategoryFilter: (v) =>
      set((state) => { state.categoryFilter = v; state.gridPage = 1; }),

    loadMoreProducts: () =>
      set((state) => { state.gridPage += 1; }),

    // ─────────────────────────────────────────────────────────────────────────
    // BARCODE SCANNER BUFFER
    // ─────────────────────────────────────────────────────────────────────────
    setBarcodeBuffer: (v) =>
      set((state) => { state.barcodeBuffer = v; }),

    /** Process a scanned/typed barcode or search string */
    processBarcode: (raw) => {
      const code = raw.trim();
      if (!code) return;

      // 1. Try exact variant codebar match
      for (const p of MOCK_PRODUCTS) {
        if (p.variants) {
          const v = p.variants.find((vr) => vr.codebar === code);
          if (v) {
            get().addVariantProduct(p, v);
            return { type: "variant_added", product: p, variant: v };
          }
        }
      }

      // 2. Try exact product codebar match
      const byCodebar = MOCK_PRODUCTS.find((p) => p.codebar === code);
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

      // 3. Try reference match
      const byRef = MOCK_PRODUCTS.find(
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
    // DERIVED GETTERS
    // ─────────────────────────────────────────────────────────────────────────

    getFilteredProducts: () => {
      const { search, categoryFilter, gridPage, PAGE_SIZE } = get();
      let list = MOCK_PRODUCTS;
      if (categoryFilter !== "all") {
        list = list.filter((p) => p.category_id === categoryFilter);
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.reference?.toLowerCase().includes(q) ||
            p.codebar?.includes(q)
        );
      }
      const total = list.length;
      const visible = list.slice(0, gridPage * PAGE_SIZE);
      return { products: visible, hasMore: visible.length < total, total };
    },

    getCartTotal: () => {
      const { cartItems, cartTotal, cartTotalOverride } = get();
      if (cartTotalOverride) return cartTotal;
      return cartItems.reduce((s, i) => s + i.lineTotal, 0);
    },

    getCartItemCount: () => {
      return get().cartItems.reduce((s, i) => s + i.qty, 0);
    },
  }))
);

// ── Internal helper: recalculate total from items (mutates immer draft) ───────
function _recalcTotal(state) {
  if (!state.cartTotalOverride) {
    state.cartTotal = state.cartItems.reduce((s, i) => s + i.lineTotal, 0);
  }
}

export default usePosStore;
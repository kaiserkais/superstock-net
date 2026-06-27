/**
 * productSlice.js — Product Catalog & Reference Data Slice
 */
import { posRepository } from "../services/posRepository";

export const createProductSlice = (set, get) => ({
  // ── Remote Data State ──────────────────────────────────────────────────
  products: [],
  productsTotal: 0,
  productsPage: 1,
  productsPerPage: 30,
  productsHasMore: true,
  categories: [],
  clients: [],

  // Loading & Error States
  productsLoading: false,
  categoriesLoading: false,
  clientsLoading: false,
  productsError: null,
  categoriesError: null,
  clientsError: null,

  // Product Grid Filters & Layout
  search: "",
  categoryFilter: "all",
  gridPage: 1,
  PAGE_SIZE: 30,

  // Product Modals
  weightModal: null,  // { product, mode: 'add'|'edit', cartId? }
  variantModal: null, // { product }

  // ─────────────────────────────────────────────────────────────────────────
  // REMOTE DATA LOADERS
  // ─────────────────────────────────────────────────────────────────────────

  loadProducts: async (reset = true) => {
    if (reset) {
      set((s) => {
        s.productsPage = 1;
        s.productsHasMore = true;
      });
    }

    const { productsPage, productsPerPage, search } = get();

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
          const existingIds = new Set(s.products.map((p) => p.id));
          const newProducts = response.data.filter((p) => !existingIds.has(p.id));
          s.products.push(...newProducts);
        }

        s.productsTotal = response.total;
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

  loadAll: async () => {
    const { loadProducts, loadCategories, loadClients } = get();
    await Promise.all([loadProducts(), loadCategories(), loadClients()]);
  },

  loadMoreProducts: async () => {
    const { productsLoading, productsHasMore, loadProducts } = get();
    if (productsLoading || !productsHasMore) return;

    set((s) => { s.productsPage += 1; });
    await loadProducts(false);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FILTER ACTIONS & MODAL CONTROLS
  // ─────────────────────────────────────────────────────────────────────────

  setSearch: (v) => set((s) => {
    s.search = v;
    s.products = [];
    s.productsPage = 1;
    s.productsHasMore = true;
  }),

  setCategoryFilter: (v) => set((s) => {
    s.categoryFilter = v;
    s.products = [];
    s.productsPage = 1;
    s.productsHasMore = true;
  }),

  openWeightModal: (product) => set((s) => { s.weightModal = { product, mode: "add" }; }),
  openWeightEditModal: (cartId, product) => set((s) => { s.weightModal = { product, mode: "edit", cartId }; }),
  closeWeightModal: () => set((s) => { s.weightModal = null; }),
  openVariantModal: (product) => set((s) => { s.variantModal = { product }; }),
  closeVariantModal: () => set((s) => { s.variantModal = null; }),

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED CATALOG GETTERS
  // ─────────────────────────────────────────────────────────────────────────

  getFilteredProducts: () => {
    const { products, search, categoryFilter, productsHasMore, productsTotal } = get();
    let list = products;

    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category_id === categoryFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.reference?.toLowerCase().includes(q) ||
        p.codebar?.includes(q) ||
        p.variants?.some((v) =>
          v.variant_name.toLowerCase().includes(q) ||
          v.codebar.includes(q)
        )
      );
    }

    return {
      products: list,
      hasMore: productsHasMore,
      total: productsTotal,
    };
  },
});
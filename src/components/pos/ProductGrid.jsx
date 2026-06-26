import React, { useEffect, useRef } from "react";
import { IconSearch, IconPackage, IconRefresh, IconAlertCircle, IconLoader2, IconBarcode } from "@tabler/icons-react";
import usePosStore from "../../store/usePosStore";
import { C } from "./posTheme";
import ProductCard from "./ProductCard";

export default function ProductGrid({ activeMode, setActiveMode }) {
  const {
    search, setSearch,
    categoryFilter, setCategoryFilter,
    loadMoreProducts, getFilteredProducts,
    categories,
    productsLoading, productsError,
    loadProducts,
    loadAll,
  } = usePosStore();

  const { products, hasMore, total } = getFilteredProducts();
  const gridRef = useRef(null);
  const sentinelRef = useRef(null);
  const searchInputRef = useRef(null);

  // ── NEW: Clear search input when switching away to barcode mode ──────────────
  useEffect(() => {
    if (activeMode === "barcode") {
      setSearch("");        // Clear the search buffer string in store
      loadProducts(true);   // Reload products from page 1 without filters
    }
  }, [activeMode, setSearch, loadProducts]);

  // Auto-focus text search field when search mode becomes active
  useEffect(() => {
    if (activeMode === "search") {
      searchInputRef.current?.focus();
    }
  }, [activeMode]);

  // Bootstrap: load all remote data once on mount if not yet loaded
  useEffect(() => {
    const { products: currentProducts, productsLoading: isLoading } = usePosStore.getState();
    if (currentProducts.length === 0 && !isLoading) {
      loadAll();
    }
  }, []);

  // Infinite scroll sentinel observer
  useEffect(() => {
    if (!hasMore || productsLoading) return;
    const sentinel = sentinelRef.current;
    const root = gridRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreProducts();
        }
      },
      { root, rootMargin: "150px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, products.length, productsLoading]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Search + filter bar ─────────────────────────────────────────── */}
      <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
        
        {/* Persistent Mode Switch Indicator Button */}
        <button
          type="button"
          onClick={() => setActiveMode((p) => p === "barcode" ? "search" : "barcode")}
          title="Toggle selection method (F2)"
          style={{ height: 34, padding: "0 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: activeMode === "search" ? C.accent : C.surface, color: activeMode === "search" ? "#fff" : C.text2, display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none" }}
        >
          {activeMode === "search" ? <IconSearch size={14} /> : <IconBarcode size={14} />}
          <span>SEARCH (F2)</span>
        </button>

        {activeMode === "search" ? (
          <div style={{ flex: 1, position: "relative" }}>
            <IconSearch size={15} stroke={1.75} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.text3 }} />
            <input
              ref={searchInputRef}
              placeholder="Type product name or reference code…"
              value={search}
              onChange={async (e) => {
                setSearch(e.target.value);
                await loadProducts(true);
              }}
              style={{ width: "100%", height: 34, borderRadius: 8, border: `1px solid ${C.border}`, paddingLeft: 28, paddingRight: 10, fontSize: 12, fontFamily: "inherit", outline: "none", background: C.surface }}
            />
          </div>
        ) : (
          <div 
            onClick={() => setActiveMode("search")}
            style={{ flex: 1, height: 34, borderRadius: 8, border: `1.5px dashed ${C.border}`, background: C.card, display: "flex", alignItems: "center", paddingLeft: 12, fontSize: 12, color: C.text3, cursor: "pointer" }}
          >
            <span>Scanner active... click here or press <b style={{ color: C.text1 }}>F2</b> for keyword typing</span>
          </div>
        )}

        <select
          value={categoryFilter}
          onChange={async (e) => {
            setCategoryFilter(e.target.value);
            await loadProducts(true);
          }}
          disabled={productsLoading}
          style={{ height: 34, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 10px", fontSize: 12, fontFamily: "inherit", background: C.surface, color: C.text1, cursor: "pointer", outline: "none", opacity: productsLoading ? 0.5 : 1 }}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* ── Count bar ───────────────────────────────────────────────────── */}
      <div style={{ padding: "6px 12px", fontSize: 11, color: C.text3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>
          {productsLoading && products.length === 0
            ? "Loading catalog…"
            : `${total} product${total !== 1 ? "s" : ""}${search || categoryFilter !== "all" ? " (filtered)" : ""}`
          }
        </span>
        {productsError && (
          <button
            onClick={() => loadAll()}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: C.danger, fontSize: 11, padding: 0 }}
          >
            <IconRefresh size={12} stroke={2} /> Retry
          </button>
        )}
      </div>

      {/* ── Grid body ───────────────────────────────────────────────────── */}
      <div
        ref={gridRef}
        style={{
          flex: 1, overflowY: "auto", padding: "6px 12px 12px",
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10,
          alignContent: "start",
        }}
      >
        {productsLoading && products.length === 0 && (
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                borderRadius: 12, border: `1px solid ${C.border}`,
                background: C.card, height: 160,
                animation: "pulse 1.4s ease-in-out infinite",
                opacity: 0.6,
              }}
            />
          ))
        )}

        {productsError && products.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: C.text3 }}>
            <IconAlertCircle size={36} stroke={1} style={{ display: "block", margin: "0 auto 10px", color: C.danger, opacity: 0.7 }} />
            <div style={{ fontSize: 13, color: C.danger, Typography: 6 }}>Failed to load products</div>
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 14 }}>{productsError}</div>
            <button
              onClick={() => loadAll()}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 12, color: C.text2, fontFamily: "inherit" }}
            >
              <IconRefresh size={13} stroke={2} /> Retry
            </button>
          </div>
        )}

        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}

        {!productsLoading && !productsError && products.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px 0", color: C.text3 }}>
            <IconPackage size={40} stroke={1} style={{ display: "block", margin: "0 auto 10px" }} />
            <div style={{ fontSize: 13 }}>No products found</div>
            {(search || categoryFilter !== "all") && (
              <button
                onClick={async () => { 
                  setSearch(""); 
                  setCategoryFilter("all"); 
                  await loadProducts(true);
                }}
                style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", fontSize: 11, color: C.text2, fontFamily: "inherit" }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {hasMore && (
          <div ref={sentinelRef} style={{ height: 40, gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {productsLoading && (
              <IconLoader2 size={16} stroke={2} style={{ color: C.text3, animation: "spin 1s linear infinite" }} />
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
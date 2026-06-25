import React, { useEffect, useRef } from "react";
import { IconSearch, IconPackage } from "@tabler/icons-react";
import usePosStore, { MOCK_CATEGORIES } from "../../store/usePosStore";
import { C } from "./posTheme";
import ProductCard from "./ProductCard";

export default function ProductGrid() {
  const {
    search, setSearch, categoryFilter, setCategoryFilter,
    loadMoreProducts, getFilteredProducts,
  } = usePosStore();

  const { products, hasMore, total } = getFilteredProducts();
  const sentinelRef = useRef();

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

      <div style={{ padding: "6px 12px", fontSize: 11, color: C.text3, flexShrink: 0 }}>
        {total} product{total !== 1 ? "s" : ""}{search || categoryFilter !== "all" ? " (filtered)" : ""}
      </div>

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
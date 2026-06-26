import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  IconSearch, 
  IconCalendar, 
  IconReceipt, 
  IconBan, 
  IconX, 
  IconTrendingUp, 
  IconCash, 
  IconShoppingBag,
  IconCheck,
  IconAlertCircle
} from "@tabler/icons-react";
import { C, fmt } from "../../components/pos/posTheme"; // Adjust the relative path to your theme file if needed

const API_BASE = "http://localhost:8080";

export default function SalesHistory() {
  // --- State Management ---
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // --- Filter Controls State ---
  const [searchId, setSearchId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // --- Active Selection State (Master-Detail Pane) ---
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saleDetails, setSaleDetails] = useState(null);

  // --- Fetch Sales Headers on Mount ---
  const fetchSales = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/sales`);
      setSales(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching sales history:", err);
      setError("Failed to load sales history records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // --- Fetch Detailed Sub-Items when a Sale Row is Selected ---
  const handleSelectSale = async (sale) => {
    setSelectedSale(sale);
    setDetailLoading(true);
    setSaleDetails(null);
    try {
      const response = await axios.get(`${API_BASE}/api/sales/${sale.id}`);
      setSaleDetails(response.data);
    } catch (err) {
      console.error("Error fetching invoice details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // --- Execute Transaction Void with Auto-Replenishment Loop ---
  const handleVoidSale = async (saleId) => {
    if (!window.confirm(`Are you sure you want to void Invoice #${saleId}? This will automatically return all quantities back to the stock inventory.`)) {
      return;
    }

    try {
      await axios.patch(`${API_BASE}/api/sales/${saleId}/void`);
      
      // Optimistically update the list status in UI local state
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: "voided" } : s));
      
      // Update currently active side view details if open
      if (selectedSale && selectedSale.id === saleId) {
        setSelectedSale(prev => ({ ...prev, status: "voided" }));
        setSaleDetails(prev => prev ? { ...prev, status: "voided" } : null);
      }
    } catch (err) {
      alert(err.response?.data || "Failed to void transaction entry.");
    }
  };

  // --- Client-Side Multi-Filter Matrix Evaluation ---
  const filteredSales = sales.filter(sale => {
    const matchesId = searchId ? sale.id.toLowerCase().includes(searchId.toLowerCase()) : true;
    const matchesStatus = statusFilter === "all" ? true : sale.status === statusFilter;
    
    let matchesDate = true;
    if (startDate || endDate) {
      const saleDate = new Date(sale.created_at);
      if (startDate && saleDate < new Date(startDate)) {
        matchesDate = false;
      }
      if (endDate) {
        const endThreshold = new Date(endDate);
        endThreshold.setHours(23, 59, 59, 999); // Include full end day bounds
        if (saleDate > endThreshold) {
          matchesDate = false;
        }
      }
    }

    return matchesId && matchesStatus && matchesDate;
  });

  // --- Live Reactive Metric Aggregations (KPIs) ---
  // Note: Voided sales are safely stripped away from active financial sums
  const stats = filteredSales.reduce((acc, sale) => {
    if (sale.status !== "voided") {
      acc.revenue += sale.total;
      // Calculate profit: uses 20% fallback margin if profit field isn't populated on database query
      acc.profit += (sale.profit !== undefined ? sale.profit : sale.total * 0.20);
      acc.activeCount += 1;
    }
    return acc;
  }, { revenue: 0, profit: 0, activeCount: 0 });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg || "#F8F9FA", fontFamily: "inherit" }}>
      
      {/* ─── HEADER TITLE ─── */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.text1 }}>Sales History Ledger</h1>
        <p style={{ margin: "4px 0 0 0", fontSize: 12, color: C.text3 }}>Review invoices, monitor margins, and void historical records.</p>
      </div>

      {/* ─── LIVE FINANCIAL KPI METRICS MATRIX ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, padding: "20px 24px 10px" }}>
        
        {/* Sales Volume Metric */}
        <div style={{ background: C.surface, borderRadius: 12, padding: 16, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#E8F0FE", color: "#1A73E8", display: "flex", alignItems: "center", justifyValue: "center", justifyContent: "center" }}>
            <IconShoppingBag size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>Transactions Listed</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text1, marginTop: 2 }}>
              {filteredSales.length} <span style={{ fontSize: 12, fontWeight: 400, color: C.text3 }}>({stats.activeCount} Active)</span>
            </div>
          </div>
        </div>

        {/* Gross Revenue Metric */}
        <div style={{ background: C.surface, borderRadius: 12, padding: 16, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#E6F4EA", color: "#137333", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconCash size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>Gross Financial Revenue</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#137333", marginTop: 2 }}>{fmt(stats.revenue)}</div>
          </div>
        </div>

        {/* Net Profit Margin Metric */}
        <div style={{ background: C.surface, borderRadius: 12, padding: 16, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "#EAF2F8", color: "#2980B9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconTrendingUp size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>Estimated Profit Margin</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#2980B9", marginTop: 2 }}>{fmt(stats.profit)}</div>
          </div>
        </div>

      </div>

      {/* ─── SEARCH & FILTER UTILITY MATRIX ─── */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, margin: "10px 24px 16px", padding: 14, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end" }}>
        
        {/* Search Input Box */}
        <div style={{ flex: "2 1 200px", minWidth: 180 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 6 }}>Search Invoice ID</label>
          <div style={{ position: "relative" }}>
            <IconSearch size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.text3 }} />
            <input 
              type="text" 
              placeholder="Ex: sale_xyz..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 10px 0 32px", fontSize: 13, background: C.bg, color: C.text1, outline: "none" }}
            />
          </div>
        </div>

        {/* Date Ranges bounds */}
        <div style={{ flex: "1 1 140px" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 6 }}>From Date</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 10px", fontSize: 13, background: C.bg, color: C.text1, outline: "none" }}
          />
        </div>

        <div style={{ flex: "1 1 140px" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 6 }}>To Date</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 10px", fontSize: 13, background: C.bg, color: C.text1, outline: "none" }}
          />
        </div>

        {/* Status Dropdown selector */}
        <div style={{ flex: "1 1 130px" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 6 }}>Invoice Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "100%", height: 36, borderRadius: 8, border: `1px solid ${C.border}`, padding: "0 10px", fontSize: 13, background: C.bg, color: C.text1, outline: "none", cursor: "pointer" }}
          >
            <option value="all">All Receipts</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided Records</option>
          </select>
        </div>

        {/* Reset Buttons */}
        <button 
          onClick={() => { setSearchId(""); setStartDate(""); setEndDate(""); setStatusFilter("all"); }}
          style={{ height: 36, padding: "0 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text2, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
        >
          Clear
        </button>
      </div>

      {/* ─── MAIN MASTER-DETAIL WORKSPACE ─── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: "0 24px 24px", gap: 16 }}>
        
        {/* LEFT COMPONENT: MASTER DATATABLE */}
        <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.text3, fontSize: 13 }}>Reading audit stream logs...</div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: "center", color: C.danger, fontSize: 13 }}>{error}</div>
          ) : filteredSales.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: C.text3, fontSize: 13 }}>No matching transaction receipts found.</div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                <thead style={{ background: C.bg, position: "sticky", top: 0, zIndex: 1, borderBottom: `1px solid ${C.border}` }}>
                  <tr>
                    <th style={{ padding: "12px 16px", color: C.text2, fontWeight: 600 }}>Invoice ID</th>
                    <th style={{ padding: "12px 16px", color: C.text2, fontWeight: 600 }}>Timestamp Date</th>
                    <th style={{ padding: "12px 16px", color: C.text2, fontWeight: 600 }}>Client Target</th>
                    <th style={{ padding: "12px 16px", color: C.text2, fontWeight: 600 }}>Total (DA)</th>
                    <th style={{ padding: "12px 16px", color: C.text2, fontWeight: 600, textAnchor: "middle" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => {
                    const isSelected = selectedSale?.id === sale.id;
                    const isVoided = sale.status === "voided";

                    return (
                      <tr 
                        key={sale.id}
                        onClick={() => handleSelectSale(sale)}
                        style={{ 
                          borderBottom: `1px solid ${C.border}`, 
                          cursor: "pointer",
                          background: isSelected ? "#F1F5F9" : "transparent",
                          transition: "background 0.1s ease"
                        }}
                      >
                        <td style={{ padding: "14px 16px", fontWeight: 600, color: C.text1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <IconReceipt size={14} style={{ color: C.text3 }} />
                            {sale.id}
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px", color: C.text2 }}>
                          {new Date(sale.created_at).toLocaleString("fr-DZ", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td style={{ padding: "14px 16px", color: C.text1 }}>
                          {sale.customer_name || <span style={{ color: C.text3, fontSize: 12 }}>Walk-in Client</span>}
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: 700, color: isVoided ? C.text3 : C.text1, textDecoration: isVoided ? "line-through" : "none" }}>
                          {fmt(sale.total)}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ 
                            fontSize: 11, 
                            fontWeight: 600, 
                            padding: "3px 8px", 
                            borderRadius: 6,
                            background: isVoided ? "#FEE2E2" : "#DCFCE7",
                            color: isVoided ? "#EF4444" : "#15803D"
                          }}>
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT COMPONENT: DETAIL SUMMARY SLIDEOUT/DRAWER */}
        <div style={{ width: 380, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {selectedSale ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              
              {/* Context Action Header */}
              <div style={{ padding: "16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text3 }}>INVOICE SHEET</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginTop: 2 }}>#{selectedSale.id}</div>
                </div>
                <button 
                  onClick={() => { setSelectedSale(null); setSaleDetails(null); }}
                  style={{ border: "none", background: "none", cursor: "pointer", color: C.text3 }}
                >
                  <IconX size={18} />
                </button>
              </div>

              {/* Snapshot Payload Window */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                
                {/* Meta Summary fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16, borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C.text3 }}>Cashier / Operator:</span>
                    <span style={{ color: C.text1, fontWeight: 500 }}>{selectedSale.cashier_name || "System"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C.text3 }}>Session Sequence:</span>
                    <span style={{ color: C.text1, fontWeight: 500 }}>#{selectedSale.session_id}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C.text3 }}>Timestamp:</span>
                    <span style={{ color: C.text1 }}>{selectedSale.created_at}</span>
                  </div>
                </div>

                {/* Sub-item Line Matrix */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, marginBottom: 10 }}>CART CONTENT SNAPSHOT</div>
                  
                  {detailLoading ? (
                    <div style={{ fontSize: 12, color: C.text3, textAlign: "center", padding: 20 }}>Reading item indices...</div>
                  ) : saleDetails ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {saleDetails.items.map((item) => (
                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <div style={{ flex: 1, paddingRight: 10 }}>
                            <div style={{ fontWeight: 500, color: C.text1 }}>{item.product_name}</div>
                            <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                              {item.qty} {item.unit} × {fmt(item.unit_price)}
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, color: C.text1, textAlign: "right" }}>
                            {fmt(item.line_total)}
                          </div>
                        </div>
                      ))}

                      {/* Mathematical Calculations breakdown */}
                      <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: C.text2 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Subtotal Basket:</span>
                          <span>{fmt(saleDetails.subtotal)}</span>
                        </div>
                        {saleDetails.adj_value > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", color: saleDetails.adj_type === "discount" ? C.danger : C.text1 }}>
                            <span>Adjustment ({saleDetails.adj_type}):</span>
                            <span>{saleDetails.adj_type === "discount" ? "-" : "+"}{fmt(saleDetails.adj_value)}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: C.text1, paddingTop: 4, borderTop: `1px solid ${C.border}` }}>
                          <span>Total Balanced:</span>
                          <span>{fmt(saleDetails.total)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: C.danger }}>Failed to parse cart metadata loop.</div>
                  )}
                </div>
              </div>

              {/* Operational Action Footer Bar */}
              <div style={{ padding: 16, borderTop: `1px solid ${C.border}`, background: C.bg }}>
                {selectedSale.status === "voided" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#EF4444", justifyContent: "center", fontSize: 13, fontWeight: 500, background: "#FEE2E2", padding: "10px", borderRadius: 8 }}>
                    <IconAlertCircle size={16} />
                    This transaction has been voided
                  </div>
                ) : (
                  <button
                    onClick={() => handleVoidSale(selectedSale.id)}
                    style={{ 
                      width: "100%", 
                      height: 40, 
                      background: "#EF4444", 
                      color: "#FFFFFF", 
                      border: "none", 
                      borderRadius: 8, 
                      fontSize: 13, 
                      fontWeight: 600, 
                      cursor: "pointer", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: 8,
                      boxShadow: "0 1px 2px rgba(239, 68, 68, 0.2)"
                    }}
                  >
                    <IconBan size={16} />
                    Void Transaction & Return Stock
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, color: C.text3, textAlign: "center" }}>
              <IconReceipt size={36} stroke={1.25} style={{ marginBottom: 12, color: C.text3 }} />
              <div style={{ fontSize: 13, fontWeight: 500 }}>No Invoice Highlighted</div>
              <div style={{ fontSize: 11, marginTop: 4, maxWidth: 220 }}>Select a historical row on the ledger matrix to view snapshot properties or void items.</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
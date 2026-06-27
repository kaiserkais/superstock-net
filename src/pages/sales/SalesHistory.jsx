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
  IconAlertCircle,
  IconPrinter 
} from "@tabler/icons-react";
import { C, fmt } from "../../components/pos/posTheme"; 
import Pagination from "../../components/ui/Pagination";

// Import global settings store context links & printer logic repository
import { useSettingsStore } from "../../store/useSettingsStore";
import { printRepository } from "../../services/printRepository";

const API_BASE = "http://localhost:8080";
const ITEMS_PER_PAGE = 10;

// Helper to get local date string in YYYY-MM-DD format safely
const getTodayString = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split("T")[0];
};

export default function SalesHistory() {
  const todayStr = getTodayString();

  // --- State Management ---
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // --- Filter Controls State (Defaulted to Today) ---
  const [searchId, setSearchId] = useState("");
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState("all");

  // --- Backend Pagination Metadata States ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // --- Active Selection State (Master-Detail Pane) ---
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saleDetails, setSaleDetails] = useState(null);
  
  // Action Feedback Loading Indicator States
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrintingInvoice, setIsPrintingInvoice] = useState(false);

  // Pull global state configurations directly from your Zustand container
  const settings = useSettingsStore((state) => state.settings);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);

  // --- Dynamic Fetch Pipeline via Backend Routing Parameters ---
  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        per_page: ITEMS_PER_PAGE,
      };

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (startDate) {
        params.start_date = `${startDate} 00:00:00`;
      }
      if (endDate) {
        params.end_date = `${endDate} 23:59:59`;
      }

      const response = await axios.get(`${API_BASE}/api/sales`, { params });
      const { data, total_count, total_pages } = response.data;
      
      setSales(data || []);
      setTotalCount(total_count || 0);
      setTotalPages(total_pages || 1);
      setError(null);
    } catch (err) {
      console.error("Error fetching sales history:", err);
      setError("Failed to load sales history records.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger query dispatch loop context on state/pagination change
  useEffect(() => {
    fetchSales();
  }, [currentPage, startDate, endDate, statusFilter]);

  // Sync settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Reset page index safely to page 1 on filter state mutations
  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

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

  // 🌟 Routine A: Thermal Receipt Hardware Pipeline 
  const handlePrintReceipt = async () => {
    if (!saleDetails || !selectedSale) return;
    setIsPrinting(true);
    try {
      const discountAmount = saleDetails.adj_type === "discount" ? Number(saleDetails.adj_value) || 0 : 0;

      const combinedSalePayload = {
        ...selectedSale,
        ...saleDetails,
        discount: discountAmount,
        items: saleDetails.items.map((item) => ({
          product_name: item.product_name || "Item",
          qty: Number(item.qty) || 1,
          unit_price: Number(item.unit_price) || 0, 
          line_total: Number(item.line_total) || 0,
        })),
      };

      await printRepository.printInvoiceReceipt(combinedSalePayload, settings);
    } catch (err) {
      alert(err.message || "Failed to trigger spool automation routing maps.");
    } finally {
      setIsPrinting(false);
    }
  };

  // 🌟 Routine B: Standard Invoice Layout Document Pipeline (A4/Letter)
  const handlePrintFullInvoice = async () => {
    if (!saleDetails || !selectedSale) return;
    setIsPrintingInvoice(true);
    try {
      const discountAmount = saleDetails.adj_type === "discount" ? Number(saleDetails.adj_value) || 0 : 0;

      const combinedSalePayload = {
        ...selectedSale,
        ...saleDetails,
        discount: discountAmount,
        items: saleDetails.items.map((item) => ({
          product_name: item.product_name || "Item",
          qty: Number(item.qty) || 1,
          unit_price: Number(item.unit_price) || 0,
          line_total: Number(item.line_total) || 0,
        })),
      };

      await printRepository.printInvoice(combinedSalePayload, settings);
    } catch (err) {
      alert(err.message || "Failed to compile document sheet blueprint.");
    } finally {
      setIsPrintingInvoice(false);
    }
  };

  // --- Execute Transaction Void with Auto-Replenishment Loop ---
  const handleVoidSale = async (saleId) => {
    if (!window.confirm(`Are you sure you want to void Invoice #${saleId}? This will automatically return all quantities back to the stock inventory.`)) {
      return;
    }

    try {
      await axios.patch(`${API_BASE}/api/sales/${saleId}/void`);
      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: "voided" } : s));
      
      if (selectedSale && selectedSale.id === saleId) {
        setSelectedSale(prev => ({ ...prev, status: "voided" }));
        setSaleDetails(prev => prev ? { ...prev, status: "voided" } : null);
      }
    } catch (err) {
      alert(err.response?.data || "Failed to void transaction entry.");
    }
  };

  const displayedSales = sales.filter(sale => {
    return searchId ? sale.id.toLowerCase().includes(searchId.toLowerCase()) : true;
  });

  const pageStats = displayedSales.reduce((acc, sale) => {
    if (sale.status !== "voided") {
      acc.revenue += sale.total;
      acc.profit += (sale.profit !== undefined ? sale.profit : sale.total * 0.20);
    }
    return acc;
  }, { revenue: 0, profit: 0 });

  return (
    <div className="flex flex-col h-screen font-sans antialiased" style={{ backgroundColor: C.bg || "#F8F9FA" }}>
      
      {/* ─── HEADER TITLE ─── */}
      <div className="p-4 px-6 border-b" style={{ backgroundColor: C.surface, borderColor: C.border }}>
        <h1 className="m-0 text-xl font-semibold tracking-tight" style={{ color: C.text1 }}>Sales History Ledger</h1>
        <p className="m-0 mt-1 text-xs" style={{ color: C.text3 }}>Review invoices, monitor margins, and void historical records.</p>
      </div>

      {/* ─── LIVE FINANCIAL KPI METRICS MATRIX ─── */}
      <div className="grid grid-cols-3 gap-4 pt-5 px-6 pb-2.5">
        {/* KPI: Listed Records */}
        <div className="rounded-xl p-4 border flex items-center gap-3.5 shadow-sm" style={{ backgroundColor: C.surface, borderColor: C.border }}>
          <div className="w-11 h-11 rounded-lg bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center shrink-0">
            <IconShoppingBag size={22} />
          </div>
          <div>
            <div className="text-xs font-medium" style={{ color: C.text3 }}>Total Found Records</div>
            <div className="text-2xl font-bold mt-0.5" style={{ color: C.text1 }}>
              {totalCount} <span className="text-xs font-normal" style={{ color: C.text3 }}>(Filtered Scope)</span>
            </div>
          </div>
        </div>

        {/* KPI: Gross Revenue */}
        <div className="rounded-xl p-4 border flex items-center gap-3.5 shadow-sm" style={{ backgroundColor: C.surface, borderColor: C.border }}>
          <div className="w-11 h-11 rounded-lg bg-[#E6F4EA] text-[#137333] flex items-center justify-center shrink-0">
            <IconCash size={22} />
          </div>
          <div>
            <div className="text-xs font-medium" style={{ color: C.text3 }}>Gross Revenue <span className="text-[10px] font-normal" style={{ color: C.text3 }}>(This Page)</span></div>
            <div className="text-2xl font-bold mt-0.5 text-[#137333]">{fmt(pageStats.revenue)}</div>
          </div>
        </div>

        {/* KPI: Profit Margin */}
        <div className="rounded-xl p-4 border flex items-center gap-3.5 shadow-sm" style={{ backgroundColor: C.surface, borderColor: C.border }}>
          <div className="w-11 h-11 rounded-lg bg-[#EAF2F8] text-[#2980B9] flex items-center justify-center shrink-0">
            <IconTrendingUp size={22} />
          </div>
          <div>
            <div className="text-xs font-medium" style={{ color: C.text3 }}>Est. Profit Margin <span className="text-[10px] font-normal" style={{ color: C.text3 }}>(This Page)</span></div>
            <div className="text-2xl font-bold mt-0.5 text-[#2980B9]">{fmt(pageStats.profit)}</div>
          </div>
        </div>
      </div>

      {/* ─── SEARCH & FILTER UTILITY MATRIX ─── */}
      <div className="border rounded-xl mx-6 my-2.5 p-3.5 flex flex-wrap gap-3 items-end shadow-sm" style={{ backgroundColor: C.surface, borderColor: C.border }}>
        {/* Search Input Box */}
        <div className="flex-[2_1_200px] min-w-[180px]">
          <label className="block text-[11px] font-semibold mb-1.5 tracking-wide uppercase" style={{ color: C.text2 }}>Search Visible Page ID</label>
          <div className="relative">
            <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.text3 }} />
            <input 
              type="text" 
              placeholder="Ex: sale_xyz..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full h-9 rounded-lg border pl-9 pr-3 text-xs focus:outline-none transition-colors"
              style={{ backgroundColor: C.bg, color: C.text1, borderColor: C.border }}
            />
          </div>
        </div>

        {/* From Date Input */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[11px] font-semibold mb-1.5 tracking-wide uppercase" style={{ color: C.text2 }}>From Date</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => handleFilterChange(setStartDate, e.target.value)}
            className="w-full h-9 rounded-lg border px-3 text-xs focus:outline-none transition-colors"
            style={{ backgroundColor: C.bg, color: C.text1, borderColor: C.border }}
          />
        </div>

        {/* To Date Input */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[11px] font-semibold mb-1.5 tracking-wide uppercase" style={{ color: C.text2 }}>To Date</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => handleFilterChange(setEndDate, e.target.value)}
            className="w-full h-9 rounded-lg border px-3 text-xs focus:outline-none transition-colors"
            style={{ backgroundColor: C.bg, color: C.text1, borderColor: C.border }}
          />
        </div>

        {/* Status Dropdown Options */}
        <div className="flex-1 min-w-[130px]">
          <label className="block text-[11px] font-semibold mb-1.5 tracking-wide uppercase" style={{ color: C.text2 }}>Invoice Status</label>
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
            className="w-full h-9 rounded-lg border px-2.5 text-xs focus:outline-none cursor-pointer transition-colors"
            style={{ backgroundColor: C.bg, color: C.text1, borderColor: C.border }}
          >
            <option value="all">All Receipts</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided Records</option>
          </select>
        </div>

        {/* Clear Action Pin */}
        <button 
          onClick={() => { 
            setSearchId(""); 
            setStartDate(todayStr); 
            setEndDate(todayStr); 
            setStatusFilter("all"); 
            setCurrentPage(1);
          }}
          className="h-9 px-4 rounded-lg border text-xs font-medium cursor-pointer transition-colors"
          style={{ backgroundColor: C.surface, color: C.text2, borderColor: C.border }}
        >
          Clear
        </button>
      </div>

      {/* ─── MAIN MASTER-DETAIL WORKSPACE ─── */}
      <div className="flex-1 flex overflow-hidden px-6 pb-6 gap-4">
        
        {/* LEFT COMPONENT: MASTER DATATABLE CONTAINER */}
        <div className="flex-1 border rounded-xl flex flex-col overflow-hidden shadow-sm" style={{ backgroundColor: C.surface, borderColor: C.border }}>
          {loading ? (
            <div className="p-10 text-center text-xs font-medium tracking-wide" style={{ color: C.text3 }}>Reading audit stream logs...</div>
          ) : error ? (
            <div className="p-10 text-center text-xs font-medium" style={{ color: C.danger }}>{error}</div>
          ) : displayedSales.length === 0 ? (
            <div className="p-10 text-center text-xs font-medium" style={{ color: C.text3 }}>No matching transaction receipts found.</div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b" style={{ backgroundColor: C.bg, borderColor: C.border }}>
                    <tr>
                      <th className="p-3 px-4 font-semibold uppercase tracking-wider text-[10px]" style={{ color: C.text2 }}>Invoice ID</th>
                      <th className="p-3 px-4 font-semibold uppercase tracking-wider text-[10px]" style={{ color: C.text2 }}>Timestamp Date</th>
                      <th className="p-3 px-4 font-semibold uppercase tracking-wider text-[10px]" style={{ color: C.text2 }}>Client Target</th>
                      <th className="p-3 px-4 font-semibold uppercase tracking-wider text-[10px]" style={{ color: C.text2 }}>Total (DA)</th>
                      <th className="p-3 px-4 font-semibold uppercase tracking-wider text-[10px]" style={{ color: C.text2 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedSales.map((sale) => {
                      const isSelected = selectedSale?.id === sale.id;
                      const isVoided = sale.status === "voided";

                      return (
                        <tr 
                          key={sale.id}
                          onClick={() => handleSelectSale(sale)}
                          className="cursor-pointer transition-colors duration-150 border-b"
                          style={{ 
                            borderColor: C.border, 
                            backgroundColor: isSelected ? "#F1F5F9" : "transparent" 
                          }}
                        >
                          <td className="p-3.5 px-4 font-semibold" style={{ color: C.text1 }}>
                            <div className="flex items-center gap-2">
                              <IconReceipt size={14} style={{ color: C.text3 }} />
                              {sale.id}
                            </div>
                          </td>
                          <td className="p-3.5 px-4" style={{ color: C.text2 }}>
                            {new Date(sale.created_at).toLocaleString("fr-DZ", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="p-3.5 px-4" style={{ color: C.text1 }}>
                            {sale.customer_name || <span className="italic text-[11px]" style={{ color: C.text3 }}>Walk-in Client</span>}
                          </td>
                          <td className="p-3.5 px-4 font-bold" style={{ 
                            color: isVoided ? C.text3 : C.text1, 
                            textDecoration: isVoided ? "line-through" : "none" 
                          }}>
                            {fmt(sale.total)}
                          </td>
                          <td className="p-3.5 px-4">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{
                              backgroundColor: isVoided ? "#FEE2E2" : "#DCFCE7",
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

              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>

        {/* RIGHT COMPONENT: DETAIL SUMMARY DRAWER CARD */}
        <div className="w-[380px] border rounded-xl flex flex-col overflow-hidden shadow-sm" style={{ backgroundColor: C.surface, borderColor: C.border }}>
          {selectedSale ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b flex justify-between items-center" style={{ backgroundColor: C.bg, borderColor: C.border }}>
                <div>
                  <div className="text-[10px] font-bold tracking-wider uppercase" style={{ color: C.text3 }}>Invoice Sheet</div>
                  <div className="text-sm font-bold mt-0.5" style={{ color: C.text1 }}>#{selectedSale.id}</div>
                </div>
                <button 
                  onClick={() => { setSelectedSale(null); setSaleDetails(null); }}
                  className="border-none bg-none cursor-pointer transition-colors"
                  style={{ color: C.text3 }}
                >
                  <IconX size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* Meta Summary Properties Block */}
                <div className="flex flex-col gap-2 pb-4 border-b text-xs" style={{ borderColor: C.border }}>
                  <div className="flex justify-between">
                    <span style={{ color: C.text3 }}>Cashier / Operator:</span>
                    <span className="font-medium" style={{ color: C.text1 }}>{selectedSale.cashier_name || "System"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: C.text3 }}>Session Sequence:</span>
                    <span className="font-medium" style={{ color: C.text1 }}>#{selectedSale.session_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: C.text3 }}>Timestamp:</span>
                    <span style={{ color: C.text2 }}>{selectedSale.created_at}</span>
                  </div>
                </div>

                {/* Sub-Items Cart Frame List */}
                <div className="mt-4">
                  <div className="text-[10px] font-bold tracking-wider uppercase mb-3" style={{ color: C.text2 }}>Cart Content Snapshot</div>
                  
                  {detailLoading ? (
                    <div className="text-xs text-center py-6 tracking-wide" style={{ color: C.text3 }}>Reading item indices...</div>
                  ) : saleDetails ? (
                    <div className="flex flex-col gap-3.5">
                      {saleDetails.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-xs items-start">
                          <div className="flex-1 pr-3">
                            <div className="font-medium" style={{ color: C.text1 }}>{item.product_name}</div>
                            <div className="text-[11px] mt-0.5" style={{ color: C.text3 }}>
                              {item.qty} {item.unit} × {fmt(item.unit_price)}
                            </div>
                          </div>
                          <div className="font-semibold text-right shrink-0" style={{ color: C.text1 }}>
                            {fmt(item.line_total)}
                          </div>
                        </div>
                      ))}

                      {/* Summary Pricing Math Breakdown */}
                      <div className="border-t border-dashed pt-3.5 flex flex-col gap-2 text-xs" style={{ borderColor: C.border }}>
                        <div className="flex justify-between">
                          <span style={{ color: C.text3 }}>Subtotal Basket:</span>
                          <span className="font-medium" style={{ color: C.text2 }}>{fmt(saleDetails.subtotal)}</span>
                        </div>
                        {saleDetails.adj_value > 0 && (
                          <div className="flex justify-between font-medium" style={{ color: saleDetails.adj_type === "discount" ? C.danger : C.text1 }}>
                            <span>Adjustment ({saleDetails.adj_type}):</span>
                            <span>{saleDetails.adj_type === "discount" ? "-" : "+"}{fmt(saleDetails.adj_value)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-base font-bold pt-2 border-t" style={{ borderColor: C.border, color: C.text1 }}>
                          <span>Total Balanced:</span>
                          <span>{fmt(saleDetails.total)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-medium" style={{ color: C.danger }}>Failed to parse cart metadata loop.</div>
                  )}
                </div>
              </div>

              {/* ACTION BUTTON CONTROL INTERFACE BAR */}
              <div className="p-4 border-t flex flex-col gap-2.5" style={{ backgroundColor: C.bg, borderColor: C.border }}>
                
                <div className="flex gap-2 w-full">
                  {/* Thermal Ticket Printer Trigger */}
                  <button
                    onClick={handlePrintReceipt}
                    disabled={isPrinting || isPrintingInvoice || !saleDetails}
                    className="flex-1 h-10 bg-[#2563EB] hover:opacity-90 disabled:opacity-50 text-white border-none rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-opacity"
                  >
                    <IconPrinter size={15} />
                    {isPrinting ? "Spooling..." : "Thermal Ticket"}
                  </button>

                  {/* Document/A4 System Printer Trigger */}
                  <button
                    onClick={handlePrintFullInvoice}
                    disabled={isPrinting || isPrintingInvoice || !saleDetails}
                    className="flex-1 h-10 bg-[#1E293B] hover:opacity-90 disabled:opacity-50 text-white border-none rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-opacity"
                  >
                    <IconReceipt size={15} />
                    {isPrintingInvoice ? "Compiling..." : "Full Invoice"}
                  </button>
                </div>

                {/* Void State Guard Action Trigger */}
                {selectedSale.status === "voided" ? (
                  <div className="flex items-center gap-2 justify-center text-xs font-medium border p-2.5 rounded-lg bg-[#FEE2E2] border-[#FEE2E2] text-[#EF4444]">
                    <IconAlertCircle size={16} className="shrink-0" />
                    This transaction has been voided
                  </div>
                ) : (
                  <button
                    onClick={() => handleVoidSale(selectedSale.id)}
                    className="w-full h-10 bg-[#EF4444] hover:opacity-90 text-white border-none rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition-opacity"
                  >
                    <IconBan size={16} />
                    Void Transaction & Return Stock
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" style={{ color: C.text3 }}>
              <IconReceipt size={40} stroke={1.25} className="mb-3 opacity-60" />
              <div className="text-xs font-semibold">No Invoice Highlighted</div>
              <div className="text-[11px] mt-1 max-w-[240px] leading-relaxed">
                Select a historical row on the ledger matrix to view snapshot properties or void items.
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
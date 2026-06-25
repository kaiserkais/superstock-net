import React, { useState, useEffect } from "react";
import {
    IconPackage,
    IconPlus,
    IconPencil,
    IconTrash,
    IconSearch,
    IconBarcode,
    IconAlertTriangle,
    IconChevronDown,
    IconChevronRight,
    IconLoader2
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [deletingProduct, setDeletingProduct] = useState(null);
    const [expandedRows, setExpandedRows] = useState({}); // Tracks which variable products are open
    const [addBtnHover, setAddBtnHover] = useState(false);
    
    const navigate = useNavigate();

    // ─── DATA FETCHING FLOW ───────────────────────────────────────────────
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/products");
            if (!response.ok) {
                throw new Error(`Server returned status: ${response.status}`);
            }
            const data = await response.json();
            setProducts(data);
            setError(null);
        } catch (err) {
            console.error("❌ Failed to pull product catalog:", err);
            setError("Could not establish a stable connection to the inventory database.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // ─── DELETION SEQUENCE ────────────────────────────────────────────────
    const triggerDeleteSequence = async (id) => {
        try {
            const response = await fetch(`/api/products/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Deletion request denied by backend safety hooks.");
            }

            // Evict from local memory state cleanly
            setProducts(prev => prev.filter(item => item.id !== id));
            setDeletingProduct(null);
        } catch (err) {
            alert(err.message || "Failed to drop asset entry.");
        }
    };

    // ─── EXPANSION TOGGLE FOR MATRIX RECORDS ──────────────────────────────
    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // ─── SEARCH FILTER MATRIX MATCHING ────────────────────────────────────
    const filteredProducts = products.filter(p => {
        const query = searchQuery.toLowerCase();
        return (
            p.name.toLowerCase().includes(query) ||
            (p.reference && p.reference.toLowerCase().includes(query)) ||
            (p.codebar && p.codebar.includes(query)) ||
            (p.variants && p.variants.some(v => v.variant_name.toLowerCase().includes(query) || v.codebar.includes(query)))
        );
    });

    return (
        <>
            {/* Header Control Workspace */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1C1C24", lineHeight: 1.2 }}>
                        Product Master Ledger
                    </h1>
                    <p style={{ fontSize: 13, color: "#6B6B7A", marginTop: 4 }}>
                        Scan catalog assets, inspect structural matrix nodes, and oversee live vendor configurations.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/add-product')}
                    onMouseEnter={() => setAddBtnHover(true)}
                    onMouseLeave={() => setAddBtnHover(false)}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-white border-0 cursor-pointer font-medium"
                    style={{ fontSize: 13, background: addBtnHover ? "#C8873A" : "#E8A04B", transition: "background 0.15s" }}
                >
                    <IconPlus size={16} stroke={2} />
                    New Catalog Asset
                </button>
            </div>

            {/* Interactive Filters Bar */}
            <div className="mb-5 relative flex items-center max-w-sm">
                <IconSearch size={16} style={{ position: "absolute", left: 12, color: "#9B9BA8" }} />
                <input
                    type="text"
                    placeholder="Filter items, references, barcodes or variations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: "100%", height: 38, padding: "0 12px 0 36px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#fff", color: "#1C1C24", outline: "none" }}
                />
            </div>

            {/* System State Handlers */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-12 rounded-xl border bg-white text-[#6B6B7A]" style={{ borderColor: "#E4E3E0" }}>
                    <IconLoader2 className="animate-spin mb-2" size={28} style={{ color: "#E8A04B" }} />
                    <span style={{ fontSize: 13 }}>Syncing master data assets...</span>
                </div>
            ) : error ? (
                <div className="p-6 rounded-xl border bg-[#FFF5F5] text-[#E24B4A]" style={{ borderColor: "#F8D7D7", fontSize: 13 }}>
                    <strong>System Interruption:</strong> {error}
                </div>
            ) : (
                /* Data Table Wrapper Layout */
                <div className="rounded-xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E4E3E0" }}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse" style={{ fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: "#F7F6F3", borderBottom: "1px solid #E4E3E0", color: "#6B6B7A" }}>
                                    <th className="p-3.5 w-8"></th>
                                    <th className="p-3.5 font-medium">Product Matrix Node Identity</th>
                                    <th className="p-3.5 font-medium">Reference Code</th>
                                    <th className="p-3.5 font-medium">Classification</th>
                                    <th className="p-3.5 font-medium text-right">Available Stock</th>
                                    <th className="p-3.5 font-medium text-right">Wholesale Cost</th>
                                    <th className="p-3.5 font-medium text-right">Base Retail (P1)</th>
                                    <th className="p-3.5 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="p-8 text-center text-[#9B9BA8]">No inventory records match your criteria.</td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((p) => {
                                        const isVariable = p.product_type === "variable";
                                        const hasVariants = p.variants && p.variants.length > 0;
                                        const isExpanded = !!expandedRows[p.id];
                                        
                                        // Calculate global stock total dynamically if it is a parent variable asset
                                        const totalStock = isVariable 
                                            ? p.variants.reduce((acc, v) => acc + v.quantity, 0)
                                            : p.quantity;

                                        return (
                                            <React.Fragment key={p.id}>
                                                <tr className="border-b last:border-b-0 hover:bg-gray-50/50" style={{ borderColor: "#E4E3E0" }}>
                                                    {/* Expansion Trigger Node Column */}
                                                    <td className="p-2 text-center">
                                                        {isVariable && hasVariants && (
                                                            <button 
                                                                onClick={() => toggleRow(p.id)}
                                                                className="p-1 rounded hover:bg-gray-100 border-0 bg-transparent text-[#6B6B7A] cursor-pointer flex items-center justify-center"
                                                            >
                                                                {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                                                            </button>
                                                        )}
                                                    </td>
                                                    
                                                    <td className="p-3.5">
                                                        <div className="font-medium text-[#1C1C24]">{p.name}</div>
                                                        <div className="flex items-center gap-1 text-xs text-[#9B9BA8] font-mono mt-0.5">
                                                            <IconBarcode size={12} /> {p.codebar || "Matrix Group Identifier"}
                                                        </div>
                                                    </td>
                                                    
                                                    <td className="p-3.5 font-mono text-[#6B6B7A]">{p.reference || "—"}</td>
                                                    
                                                    <td className="p-3.5">
                                                        <span className="rounded font-medium text-[11px]" style={{
                                                            padding: "3px 7px",
                                                            background: isVariable ? "#FAEEDA" : "#EAF3DE",
                                                            color: isVariable ? "#633806" : "#3B6D11"
                                                        }}>
                                                            {isVariable ? `Variable (${p.variants.length} Matrix Layers)` : "Standard Entry"}
                                                        </span>
                                                    </td>
                                                    
                                                    <td className="p-3.5 text-right font-semibold font-mono text-[#1C1C24]">
                                                        {totalStock} <span className="text-[11px] text-[#6B6B7A] font-normal font-sans">{p.measurement_unit}</span>
                                                    </td>
                                                    
                                                    <td className="p-3.5 text-right font-mono font-semibold text-[#6B6B7A]">
                                                        {Number(p.product_cost).toFixed(2)} DA
                                                    </td>
                                                    
                                                    <td className="p-3.5 text-right font-mono font-bold text-[#1C1C24]">
                                                        {Number(p.selling_price_1).toFixed(2)} DA
                                                    </td>
                                                    
                                                    <td className="p-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button onClick={() => navigate(`/edit-product/${p.id}`)} className="p-1.5 rounded-lg border bg-transparent cursor-pointer text-[#6B6B7A]" style={{ borderColor: "#E4E3E0" }}>
                                                                <IconPencil size={15} />
                                                            </button>
                                                            <button onClick={() => setDeletingProduct(p)} className="p-1.5 rounded-lg border bg-transparent cursor-pointer text-[#E24B4A]" style={{ borderColor: "#E4E3E0" }}>
                                                                <IconTrash size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* NESTED LAYER VARIANT RENDERING */}
                                                {isVariable && isExpanded && hasVariants && (
                                                    <tr style={{ background: "#FAFAF9" }}>
                                                        <td colSpan="8" className="p-3 pl-12 border-b" style={{ borderColor: "#E4E3E0" }}>
                                                            <div className="rounded-lg border bg-white overflow-hidden" style={{ borderColor: "#E4E3E0" }}>
                                                                <table className="w-full text-left border-collapse" style={{ fontSize: 12 }}>
                                                                    <thead>
                                                                        <tr style={{ background: "#F5F5F3", color: "#6B6B7A", borderBottom: "1px solid #E4E3E0" }}>
                                                                            <th className="p-2 font-medium pl-4">Sub-Combination Token Spec</th>
                                                                            <th className="p-2 font-medium">Barcode Tag</th>
                                                                            <th className="p-2 font-medium text-right">Localized Cost</th>
                                                                            <th className="p-2 font-medium text-right">Retail Price (P1)</th>
                                                                            <th className="p-2 font-medium text-right pr-4">Active Stock</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {p.variants.map((v) => (
                                                                            <tr key={v.id} className="border-b last:border-b-0 hover:bg-gray-50/60" style={{ borderColor: "#E4E3E0" }}>
                                                                                <td className="p-2 font-medium text-[#1C1C24] pl-4">{v.variant_name}</td>
                                                                                <td className="p-2 font-mono text-[#6B6B7A]">{v.codebar}</td>
                                                                                <td className="p-2 text-right font-mono text-[#6B6B7A]">{Number(v.product_cost).toFixed(2)} DA</td>
                                                                                <td className="p-2 text-right font-mono font-semibold text-[#1C1C24]">{Number(v.selling_price_1).toFixed(2)} DA</td>
                                                                                <td className="p-2 text-right font-bold font-mono text-[#E8A04B] pr-4">{v.quantity}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* In-Line Destructive Warn Overlay Confirmation Modal */}
            {deletingProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(26, 26, 34, 0.45)", backdropFilter: "blur(2px)" }}>
                    <div className="w-full max-w-sm rounded-xl border bg-white" style={{ borderColor: "#E4E3E0" }}>
                        <div style={{ padding: 20 }} className="flex flex-col items-center text-center gap-3">
                            <div className="flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: "#FCEBEB", color: "#E24B4A" }}>
                                <IconAlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 500, color: "#1C1C24" }}>Wipe Asset Ledger Entry?</h3>
                                <p style={{ fontSize: 12, color: "#6B6B7A", marginTop: 4, lineHeight: 1.4 }}>
                                    This removes the product file "{deletingProduct.name}" and clears cascading variation data layers across all cash registers permanently.
                                </p>
                            </div>
                            <div className="w-full flex gap-2 mt-2">
                                <button onClick={() => setDeletingProduct(null)} className="flex-1 h-9 rounded-lg border bg-transparent text-[#6B6B7A] cursor-pointer" style={{ fontSize: 13, borderColor: "#E4E3E0" }}>Cancel</button>
                                <button onClick={() => triggerDeleteSequence(deletingProduct.id)} className="flex-1 h-9 rounded-lg text-white border-0 bg-[#E24B4A] cursor-pointer" style={{ fontSize: 13 }}>Wipe Record</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
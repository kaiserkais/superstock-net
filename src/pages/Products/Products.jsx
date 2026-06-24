import React, { useState } from "react";
import {
    IconPackage,
    IconPlus,
    IconPencil,
    IconTrash,
    IconSearch,
    IconBarcode,
    IconAlertTriangle
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom"; // Use "react-router" in v7+


// Runtime Seed Registry for UI Visualization
const MOCK_PRODUCTS = [
    {
        id: "prod_1",
        name: "Premium Leather Loafers",
        reference: "SKU-LOAF-01",
        codebar: "613110123456",
        product_cost: "3200",
        selling_price_1: "4500",
        measurement_unit: "pcs",
        category_name: "Footwear / Shoes",
        supplier_name: "Constantine Leather Imports",
        supplier_paid: "true",
        has_variations: true,
        variant_count: 6
    },
    {
        id: "prod_2",
        name: "Pure Olive Oil Extract",
        reference: "OIL-DZ-99",
        codebar: "613998877665",
        product_cost: "750",
        selling_price_1: "1100",
        measurement_unit: "litre",
        category_name: "Imported Accessories",
        supplier_name: "El Hamiz Wholesale Center",
        supplier_paid: "false",
        has_variations: false,
        variant_count: 0
    }
];

export default function Products({ onNavigate }) {
    const [products, setProducts] = useState(MOCK_PRODUCTS);
    const [searchQuery, setSearchQuery] = useState("");
    const [deletingProduct, setDeletingProduct] = useState(null);
    const [addBtnHover, setAddBtnHover] = useState(false);
    const navigate = useNavigate();
    const filteredProducts = products.filter(p => {
        const query = searchQuery.toLowerCase();
        return (
            p.name.toLowerCase().includes(query) ||
            (p.reference && p.reference.toLowerCase().includes(query)) ||
            (p.codebar && p.codebar.includes(query))
        );
    });

    const triggerDeleteSequence = (id) => {
        setProducts(prev => prev.filter(item => item.id !== id));
        setDeletingProduct(null);
    };

    return (
        <>
            {/* Header Control Workspace */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1C1C24", lineHeight: 1.2 }}>
                        Product Master Ledger
                    </h1>
                    <p style={{ fontSize: 13, color: "#6B6B7A", marginTop: 4 }}>
                        Scan catalog assets, inspect structural parameters, and oversee active vendor configurations.
                    </p>
                </div>
                {/* On a live system with routing, this replaces with <Link to="/products/add"> */}
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
                    placeholder="Filter standard items, references, barcodes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: "100%", height: 38, padding: "0 12px 0 36px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#fff", color: "#1C1C24", outline: "none" }}
                />
            </div>

            {/* Data Table Wrapper Layout */}
            <div className="rounded-xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E4E3E0" }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse" style={{ fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#F7F6F3", borderBottom: "1px solid #E4E3E0", color: "#6B6B7A" }}>
                                <th className="p-3.5 font-medium">Product Matrix Node Identity</th>
                                <th className="p-3.5 font-medium">Reference Code</th>
                                <th className="p-3.5 font-medium">Classification</th>
                                <th className="p-3.5 font-medium">Scale Metric</th>
                                <th className="p-3.5 font-medium">Assigned Vendor Log</th>
                                <th className="p-3.5 font-medium text-right">Wholesale Cost</th>
                                <th className="p-3.5 font-medium text-right">Base Retail (P1)</th>
                                <th className="p-3.5 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((p) => (
                                <tr key={p.id} className="border-b last:border-b-0 hover:bg-gray-50/50" style={{ borderColor: "#E4E3E0" }}>
                                    <td className="p-3.5">
                                        <div className="font-medium text-[#1C1C24]">{p.name}</div>
                                        <div className="flex items-center gap-1 text-xs text-[#9B9BA8] font-mono mt-0.5">
                                            <IconBarcode size={12} /> {p.codebar || "No Barcode Value Assigned"}
                                        </div>
                                    </td>
                                    
                                    <td className="p-3.5 font-mono text-[#6B6B7A]">{p.reference || "—"}</td>
                                    
                                    <td className="p-3.5">
                                        <span className="rounded font-medium text-[11px]" style={{
                                            padding: "3px 7px",
                                            background: p.has_variations ? "#FAEEDA" : "#EAF3DE",
                                            color: p.has_variations ? "#633806" : "#3B6D11"
                                        }}>
                                            {p.has_variations ? `Variable (${p.variant_count} rows)` : "Standard Entry"}
                                        </span>
                                    </td>
                                    
                                    <td className="p-3.5 text-[#6B6B7A] font-medium font-mono">{p.measurement_unit}</td>
                                    
                                    <td className="p-3.5">
                                        <div className="text-[#1C1C24]">{p.supplier_name || "—"}</div>
                                        <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: p.supplier_paid === "true" ? "#3B6D11" : "#E24B4A" }}>
                                            {p.supplier_paid === "true" ? "Invoice Paid" : "Liability Debt Statement"}
                                        </span>
                                    </td>
                                    
                                    <td className="p-3.5 text-right font-mono font-semibold text-[#6B6B7A]">{Number(p.product_cost).toFixed(2)} DA</td>
                                    <td className="p-3.5 text-right font-mono font-bold text-[#1C1C24]">{Number(p.selling_price_1).toFixed(2)} DA</td>
                                    
                                    <td className="p-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button className="p-1.5 rounded-lg border bg-transparent cursor-pointer text-[#6B6B7A]" style={{ borderColor: "#E4E3E0" }}>
                                                <IconPencil size={15} />
                                            </button>
                                            <button onClick={() => setDeletingProduct(p)} className="p-1.5 rounded-lg border bg-transparent cursor-pointer text-[#E24B4A]" style={{ borderColor: "#E4E3E0" }}>
                                                <IconTrash size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

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
                                    This removes the product file and clears cascading variation data layers across all cash registers.
                                </p>
                            </div>
                            <div className="w-full flex gap-2 mt-2">
                                <button onClick={() => setDeletingProduct(null)} className="flex-1 h-9 rounded-lg border bg-transparent text-[#6B6B7A]" style={{ fontSize: 13, borderColor: "#E4E3E0" }}>Cancel</button>
                                <button onClick={() => triggerDeleteSequence(deletingProduct.id)} className="flex-1 h-9 rounded-lg text-white border-0 bg-[#E24B4A]" style={{ fontSize: 13 }}>Wipe Record</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
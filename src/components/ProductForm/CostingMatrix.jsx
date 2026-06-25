import React from "react";

export default function CostingMatrix({ baseForm, setBaseForm }) {
    return (
        <div className="p-5 rounded-xl border bg-white flex flex-col gap-4" style={{ borderColor: "#E4E3E0" }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: "#1C1C24" }} className="border-b pb-2 mb-1 text-[#6B6B7A]">Four-Tier Costing Matrix Framework (DA)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6B6B7A" }} className="uppercase tracking-wider">Wholesale Cost</label>
                    <input type="number" step="0.01" value={baseForm.product_cost} onChange={(e) => setBaseForm({ ...baseForm, product_cost: e.target.value })} style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, fontWeight: "600", borderRadius: 8, border: "1px solid #E4E3E0" }} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#3B6D11" }} className="uppercase tracking-wider">Retail Price (P1)</label>
                    <input type="number" step="0.01" value={baseForm.selling_price_1} onChange={(e) => setBaseForm({ ...baseForm, selling_price_1: e.target.value })} style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, fontWeight: "700", borderRadius: 8, border: "1px solid #E4E3E0", color: "#3B6D11" }} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#C8873A" }} className="uppercase tracking-wider">Wholesale Price (P2)</label>
                    <input type="number" step="0.01" value={baseForm.selling_price_2} onChange={(e) => setBaseForm({ ...baseForm, selling_price_2: e.target.value })} style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0" }} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6B6B7A" }} className="uppercase tracking-wider">Bulk Multi-Tier (P3)</label>
                    <input type="number" step="0.01" value={baseForm.selling_price_3} onChange={(e) => setBaseForm({ ...baseForm, selling_price_3: e.target.value })} style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0" }} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6B6B7A" }} className="uppercase tracking-wider">Special Contract (P4)</label>
                    <input type="number" step="0.01" value={baseForm.selling_price_4} onChange={(e) => setBaseForm({ ...baseForm, selling_price_4: e.target.value })} style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0" }} />
                </div>
            </div>
        </div>
    );
}
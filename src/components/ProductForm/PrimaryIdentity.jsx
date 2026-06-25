import React from "react";
import { IconPackage, IconSparkles } from "@tabler/icons-react";

export default function PrimaryIdentity({ baseForm, setBaseForm, productType }) {
    const generateBaseBarcode = () => {
        const prefix = "613";
        const randomBody = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        setBaseForm({ ...baseForm, codebar: prefix + randomBody });
    };

    return (
        <div className="p-5 rounded-xl border bg-white flex flex-col gap-4" style={{ borderColor: "#E4E3E0" }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: "#1C1C24" }} className="border-b pb-2 mb-1 flex items-center gap-1.5 text-[#6B6B7A]">
                <IconPackage size={16} style={{ color: "#E8A04B" }} /> Primary Identity Spec Matrix
            </h3>
            
            <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Product Descriptor Name *</label>
                <input required type="text" placeholder="e.g., Premium Suede Loafers" value={baseForm.name} onChange={(e) => setBaseForm({ ...baseForm, name: e.target.value })} style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Internal Reference / SKU ID</label>
                    <input type="text" placeholder="e.g., SKU-LOAF-01" value={baseForm.reference} onChange={(e) => setBaseForm({ ...baseForm, reference: e.target.value })} style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Primary Barcode (Codebar)</label>
                    <div className="flex gap-1.5 relative w-full">
                        <input type="text" placeholder="Scan or generate barcode" value={baseForm.codebar} onChange={(e) => setBaseForm({ ...baseForm, codebar: e.target.value })} style={{ flex: 1, height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }} />
                        <button type="button" onClick={generateBaseBarcode} className="h-[38px] px-3 bg-[#2D2230] border-0 text-[#E8A04B] rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer hover:bg-[#3d3042]">
                            <IconSparkles size={14} /> Generate
                        </button>
                    </div>
                </div>
            </div>

            {productType === "simple" && (
                <div className="flex flex-col gap-1.5 w-full md:w-1/2">
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Starting Quantity Unit Level</label>
                    <input type="number" value={baseForm.quantity} onChange={(e) => setBaseForm({ ...baseForm, quantity: e.target.value })} style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }} />
                </div>
            )}
        </div>
    );
}
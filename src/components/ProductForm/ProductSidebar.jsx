import React from "react";
import { IconPackage, IconUpload } from "@tabler/icons-react";

export default function ProductSidebar({ productType, setProductType, baseForm, setBaseForm, imagePreview, handleFileStreamInject }) {
    const BACKEND_URL = "http://localhost:8080";

    // Helper to safely format image source paths depending on origin
    const computeImageSource = () => {
        if (!imagePreview) return "/placeholder.png";
        
        // If it's a local browser blob preview or a base64 string, don't prepend backend URL
        if (imagePreview.startsWith("blob:") || imagePreview.startsWith("data:")) {
            return imagePreview;
        }
        
        // Clean up leading slashes if present to prevent double slashes (e.g. http://localhost:8080//image.jpg)
        const cleanPath = imagePreview.startsWith("/") ? imagePreview : `/${imagePreview}`;
        return `${BACKEND_URL}${cleanPath}`;
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="p-4 rounded-xl border bg-[#F7F6F3] flex flex-col gap-3" style={{ borderColor: "#E4E3E0" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1C24" }}>Asset Structural Paradigm</div>
                <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setProductType("simple")} className="h-8 rounded-lg text-xs font-semibold border cursor-pointer transition-all" style={{ background: productType === "simple" ? "#2D2230" : "#fff", color: productType === "simple" ? "#E8A04B" : "#6B6B7A", borderColor: productType === "simple" ? "#2D2230" : "#E4E3E0" }}>Standard Unit</button>
                    <button type="button" onClick={() => setProductType("variable")} className="h-8 rounded-lg text-xs font-semibold border cursor-pointer transition-all" style={{ background: productType === "variable" ? "#2D2230" : "#fff", color: productType === "variable" ? "#E8A04B" : "#6B6B7A", borderColor: productType === "variable" ? "#2D2230" : "#E4E3E0" }}>Variable Option</button>
                </div>
            </div>

            <div className="p-5 rounded-xl border bg-white flex flex-col gap-4" style={{ borderColor: "#E4E3E0" }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1C1C24" }} className="border-b pb-2 mb-1 text-[#6B6B7A]">Logistics Mapping Registry</h3>
                
                <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Category Segment</label>
                    <select value={baseForm.category_id} onChange={(e) => setBaseForm({ ...baseForm, category_id: e.target.value })} style={{ width: "100%", height: 38, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0" }}>
                        <option value="1">Placeholder Default Category (ID: 1)</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Measurement Scale Metric</label>
                    <select value={baseForm.measurement_unit} onChange={(e) => setBaseForm({ ...baseForm, measurement_unit: e.target.value })} style={{ width: "100%", height: 38, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0" }}>
                        <option value="pcs">pcs (Pieces / Units)</option>
                        <option value="kg">kg (Kilograms)</option>
                        <option value="metre">metre (Linear Meters)</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Vendor Account Link</label>
                    <select value={baseForm.supplier_id} onChange={(e) => setBaseForm({ ...baseForm, supplier_id: e.target.value })} style={{ width: "100%", height: 38, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0" }}>
                        <option value="1">Placeholder Default Supplier (ID: 1)</option>
                    </select>
                </div>
            </div>

            <div className="p-5 rounded-xl border bg-white flex flex-col gap-3" style={{ borderColor: "#E4E3E0" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1C24" }}>Visual Representation File</div>
                <div className="flex items-center gap-3">
                    <div style={{ width: 56, height: 56, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3" }} className="flex items-center justify-center overflow-hidden shrink-0">
                        {imagePreview ? (
                            <img 
                                src={computeImageSource()} 
                                alt="Preview" 
                                className="w-full h-full object-cover" 
                            />
                        ) : (
                            <IconPackage style={{ color: "#9B9BA8" }} />
                        )}
                    </div>
                    <label className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold cursor-pointer hover:bg-gray-50" style={{ borderColor: "#E4E3E0", color: "#1C1C24" }}>
                        <IconUpload size={14} /> Upload Binary Image
                        <input type="file" accept="image/*" onChange={handleFileStreamInject} className="hidden" />
                    </label>
                </div>
            </div>
        </div>
    );
}
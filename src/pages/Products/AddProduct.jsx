import React, { useState } from "react";
import {
    IconPackage,
    IconArrowLeft,
    IconUpload,
    IconLayersLinked,
    IconX,
    IconBarcode,
    IconDeviceFloppy,
    IconSparkles,
    IconAdjustmentsHorizontal
} from "@tabler/icons-react";

export default function AddProduct({ onNavigate }) {
    const [productType, setProductType] = useState("simple"); // "simple" | "variable"
    
    const [baseForm, setBaseForm] = useState({
        name: "", reference: "", codebar: "", quantity: "0",
        product_cost: "0", selling_price_1: "0", selling_price_2: "0", selling_price_3: "0", selling_price_4: "0",
        measurement_unit: "pcs", category_id: "cat_1", supplier_id: "sup_1", supplier_paid: "false"
    });

    const [imagePreview, setImagePreview] = useState(null);

    // ─── TAG BASED ATTRIBUTE STATE ───────────────────────────────────────────
    const [attributes, setAttributes] = useState([
        { name: "Size", values: ["40", "41", "42", "43"], currentInput: "" },
        { name: "Color", values: ["Black", "White"], currentInput: "" }
    ]);
    const [variations, setVariations] = useState([]);

    // ─── BULK MODIFICATION INPUT STATES ──────────────────────────────────────
    const [bulkCost, setBulkCost] = useState("");
    const [bulkPrice, setBulkPrice] = useState("");
    const [bulkQty, setBulkQty] = useState("");

    // ─── AUTOMATIC BARCODE GENERATION UTILITY ────────────────────────────────
    const triggerBarcodeGeneration = (targetField, variantIdx = null) => {
        // Generates a mock standard 13-digit EAN barcode utilizing the regional 613 prefix
        const prefix = "613";
        const randomBody = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const synthesizedBarcode = prefix + randomBody;

        if (targetField === "base") {
            setBaseForm(prev => ({ ...prev, codebar: synthesizedBarcode }));
        } else if (targetField === "variant" && variantIdx !== null) {
            const updated = [...variations];
            updated[variantIdx].codebar = synthesizedBarcode;
            setVariations(updated);
        }
    };

    const triggerBulkBarcodeGeneration = () => {
        setVariations(prev => prev.map((v, idx) => {
            const prefix = "613";
            // Ensure unique timestamp variation keys to prevent overlaps
            const randomBody = Math.floor(1000000000 + Math.random() * 9000000000).toString();
            return { ...v, codebar: prefix + randomBody };
        }));
    };

    // ─── BULK VALUES INTERCEPT ENGINE ────────────────────────────────────────
    const executeBulkMatrixOverride = () => {
        if (!bulkCost && !bulkPrice && !bulkQty) {
            alert("Please fill in at least one bulk parameter field to apply updates.");
            return;
        }

        setVariations(prev => prev.map(variant => ({
            ...variant,
            product_cost: bulkCost.trim() !== "" ? bulkCost : variant.product_cost,
            selling_price_1: bulkPrice.trim() !== "" ? bulkPrice : variant.selling_price_1,
            quantity: bulkQty.trim() !== "" ? bulkQty : variant.quantity
        })));

        // Clear overrides inputs after successful application
        setBulkCost("");
        setBulkPrice("");
        setBulkQty("");
    };

    // ─── FILE AND TAG HANDLERS ───────────────────────────────────────────────
    const handleFileStreamInject = (e) => {
        const targetFile = e.target.files[0];
        if (!targetFile) return;
        const fileReader = new FileReader();
        fileReader.onloadend = () => setImagePreview(fileReader.result);
        fileReader.readAsDataURL(targetFile);
    };

    const handleAttributeNameChange = (index, value) => {
        const updated = [...attributes];
        updated[index].name = value;
        setAttributes(updated);
    };

    const handleTagInputChange = (index, value) => {
        const updated = [...attributes];
        updated[index].currentInput = value;
        setAttributes(updated);
    };

    const handleTagInputKeyDown = (e, index) => {
        if (e.key === "Enter") {
            e.preventDefault(); // Prevents accidental form submissions
            const prospectiveTag = attributes[index].currentInput.trim();
            if (prospectiveTag === "") return;

            if (attributes[index].values.includes(prospectiveTag)) {
                const updated = [...attributes];
                updated[index].currentInput = "";
                setAttributes(updated);
                return;
            }

            const updated = [...attributes];
            updated[index].values.push(prospectiveTag);
            updated[index].currentInput = "";
            setAttributes(updated);
        }
    };

    const removeTagValueNode = (attrIndex, tagIndex) => {
        const updated = [...attributes];
        updated[attrIndex].values.splice(tagIndex, 1);
        setAttributes(updated);
    };

    // ─── MATRIX CALCULATOR GENERATOR ─────────────────────────────────────────
    const cleanAndGenerateVariations = () => {
        const validAttrs = attributes.filter(a => a.name.trim() !== "" && a.values.length > 0);
        if (validAttrs.length === 0) return;

        const optionGroups = validAttrs.map(a => a.values);
        const cartesianProduct = (...arrays) => 
            arrays.reduce((acc, curr) => acc.flatMap(d => curr.map(e => [d, e].flat())), [[]]);

        const combinations = cartesianProduct(...optionGroups);

        const generatedRows = combinations.map((combo, idx) => {
            return {
                id: `v_mock_${Date.now()}_${idx}`,
                variant_name: `${baseForm.name || "Product"} (${combo.join(" - ")})`,
                codebar: `${baseForm.codebar ? baseForm.codebar : "613"}${idx + 1}`,
                product_cost: baseForm.product_cost || "0",
                selling_price_1: baseForm.selling_price_1 || "0",
                quantity: baseForm.quantity || "0"
            };
        });
        setVariations(generatedRows);
    };

    const handleVariantRowEdit = (id, field, value) => {
        setVariations(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const executeFormCommit = (e) => {
        e.preventDefault();
        alert("Form Intercepted! Product data structured cleanly.");
        if (onNavigate) onNavigate("list");
    };

    return (
        <form onSubmit={executeFormCommit} className="max-w-5xl mx-auto pb-12">
            
            {/* Header Dashboard Workspace Hook */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: "#E4E3E0" }}>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => onNavigate ? onNavigate("list") : null}
                        className="p-2 rounded-lg border bg-white cursor-pointer text-[#6B6B7A] flex items-center justify-center hover:bg-gray-50"
                        style={{ borderColor: "#E4E3E0" }}
                    >
                        <IconArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1C1C24", lineHeight: 1.1 }}>
                            Provision New Product Asset
                        </h1>
                        <p style={{ fontSize: 12, color: "#6B6B7A", marginTop: 2 }}>
                            Manage inventory metrics and multi-tier pricing schemes.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onNavigate("list")} className="h-9 px-4 rounded-lg border bg-white text-[#6B6B7A] text-sm font-medium cursor-pointer">
                        Discard
                    </button>
                    <button type="submit" className="h-9 px-5 rounded-lg text-white border-0 text-sm font-medium cursor-pointer" style={{ background: "#E8A04B" }}>
                        Commit Master Asset File
                    </button>
                </div>
            </div>

            {/* Split Form Layout Panel Array */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Frame: Core Parameters */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    
                    {/* Primary Taxonomy Info */}
                    <div className="p-5 rounded-xl border bg-white flex flex-col gap-4" style={{ borderColor: "#E4E3E0" }}>
                        <h3 style={{ fontSize: 14, fontWeight: 500, color: "#1C1C24" }} className="border-b pb-2 mb-1 flex items-center gap-1.5 text-[#6B6B7A]">
                            <IconPackage size={16} style={{ color: "#E8A04B" }} /> Primary Identity Spec Matrix
                        </h3>
                        
                        <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Product Descriptor Name *</label>
                            <input required type="text" placeholder="e.g., Casual Running Shoes" value={baseForm.name} onChange={(e) => setBaseForm({ ...baseForm, name: e.target.value })}
                                style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Internal Reference / SKU ID</label>
                                <input type="text" placeholder="e.g., SKU-SHOE-88" value={baseForm.reference} onChange={(e) => setBaseForm({ ...baseForm, reference: e.target.value })}
                                    style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }} />
                            </div>
                            
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Primary Barcode (Codebar)</label>
                                <div className="flex gap-1.5 relative w-full">
                                    <input type="text" placeholder="Scan or generate barcode" value={baseForm.codebar} onChange={(e) => setBaseForm({ ...baseForm, codebar: e.target.value })}
                                        style={{ flex: 1, height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }} />
                                    <button
                                        type="button"
                                        onClick={() => triggerBarcodeGeneration("base")}
                                        className="h-[38px] px-3 bg-[#2D2230] border-0 text-[#E8A04B] rounded-lg flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors hover:bg-[#3d3042]"
                                    >
                                        <IconSparkles size={14} /> Generate
                                    </button>
                                </div>
                            </div>
                        </div>

                        {productType === "simple" && (
                            <div className="flex flex-col gap-1.5 max-w-xs">
                                <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Initial Stock Level Quantity</label>
                                <input type="number" value={baseForm.quantity} onChange={(e) => setBaseForm({ ...baseForm, quantity: e.target.value })}
                                    style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", color: "#1C1C24" }} />
                            </div>
                        )}
                    </div>

                    {/* Costing Infrastructure Matrix */}
                    <div className="p-5 rounded-xl border bg-white flex flex-col gap-4" style={{ borderColor: "#E4E3E0" }}>
                        <h3 style={{ fontSize: 14, fontWeight: 500, color: "#1C1C24" }} className="border-b pb-2 mb-1 text-[#6B6B7A]">
                            Four-Tier Costing Matrix Framework (DA)
                        </h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: 11, fontWeight: 600, color: "#6B6B7A" }} className="uppercase tracking-wider">Wholesale Cost</label>
                                <input type="number" step="0.01" value={baseForm.product_cost} onChange={(e) => setBaseForm({ ...baseForm, product_cost: e.target.value })}
                                    style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, fontWeight: "600", borderRadius: 8, border: "1px solid #E4E3E0" }} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: 11, fontWeight: 600, color: "#3B6D11" }} className="uppercase tracking-wider">Retail Price (P1)</label>
                                <input type="number" step="0.01" value={baseForm.selling_price_1} onChange={(e) => setBaseForm({ ...baseForm, selling_price_1: e.target.value })}
                                    style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, fontWeight: "700", borderRadius: 8, border: "1px solid #E4E3E0", color: "#3B6D11" }} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: 11, fontWeight: 600, color: "#C8873A" }} className="uppercase tracking-wider">Wholesale Price (P2)</label>
                                <input type="number" step="0.01" value={baseForm.selling_price_2} onChange={(e) => setBaseForm({ ...baseForm, selling_price_2: e.target.value })}
                                    style={{ width: "100%", height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0" }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side Window Panel Components */}
                <div className="flex flex-col gap-6">
                    
                    {/* Structure Switcher */}
                    <div className="p-4 rounded-xl border bg-[#F7F6F3] flex flex-col gap-3" style={{ borderColor: "#E4E3E0" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1C24" }}>Asset Structural Paradigm</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setProductType("simple")} className="h-8 rounded-lg text-xs font-semibold border cursor-pointer transition-all"
                                style={{
                                    background: productType === "simple" ? "#2D2230" : "#fff",
                                    color: productType === "simple" ? "#E8A04B" : "#6B6B7A",
                                    borderColor: productType === "simple" ? "#2D2230" : "#E4E3E0"
                                }}>Standard Unit</button>
                            <button type="button" onClick={() => setProductType("variable")} className="h-8 rounded-lg text-xs font-semibold border cursor-pointer transition-all"
                                style={{
                                    background: productType === "variable" ? "#2D2230" : "#fff",
                                    color: productType === "variable" ? "#E8A04B" : "#6B6B7A",
                                    borderColor: productType === "variable" ? "#2D2230" : "#E4E3E0"
                                }}>Variable Option</button>
                        </div>
                    </div>

                    {/* Logistics Configuration Metadata */}
                    <div className="p-5 rounded-xl border bg-white flex flex-col gap-4" style={{ borderColor: "#E4E3E0" }}>
                        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#1C1C24" }} className="border-b pb-2 mb-1 text-[#6B6B7A]">
                            Logistics Mapping Registry
                        </h3>

                        <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Category Segment</label>
                            <select value={baseForm.category_id} onChange={(e) => setBaseForm({ ...baseForm, category_id: e.target.value })}
                                style={{ width: "100%", height: 38, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0" }}>
                                <option value="cat_1">Footwear / Shoes</option>
                                <option value="cat_2">Traditional Clothing</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Measurement Unit</label>
                            <select value={baseForm.measurement_unit} onChange={(e) => setBaseForm({ ...baseForm, measurement_unit: e.target.value })}
                                style={{ width: "100%", height: 38, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0" }}>
                                <option value="pcs">pcs (Pieces / Units)</option>
                                <option value="kg">kg (Kilograms)</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Vendor Account Link</label>
                            <select value={baseForm.supplier_id} onChange={(e) => setBaseForm({ ...baseForm, supplier_id: e.target.value })}
                                style={{ width: "100%", height: 38, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0" }}>
                                <option value="sup_1">El Hamiz Wholesale Center</option>
                                <option value="sup_2">Constantine Leather Imports</option>
                            </select>
                        </div>
                    </div>

                    {/* Image Upload Block */}
                    <div className="p-5 rounded-xl border bg-white flex flex-col gap-3" style={{ borderColor: "#E4E3E0" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1C1C24" }}>Visual Representation File</div>
                        <div className="flex items-center gap-3">
                            <div style={{ width: 56, height: 56, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3" }} className="flex items-center justify-center overflow-hidden shrink-0">
                                {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <IconPackage style={{ color: "#9B9BA8" }} />}
                            </div>
                            <label className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold cursor-pointer hover:bg-gray-50" style={{ borderColor: "#E4E3E0", color: "#1C1C24" }}>
                                <IconUpload size={14} /> Upload Binary Image
                                <input type="file" accept="image/*" onChange={handleFileStreamInject} className="hidden" />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row Block: Token Input System & Bulk Variations Updates */}
            {productType === "variable" && (
                <div className="p-5 rounded-xl border mt-6 flex flex-col gap-5 bg-white" style={{ borderColor: "#E8A04B" }}>
                    <div>
                        <h4 style={{ fontSize: 14, fontWeight: 600, color: "#1C1C24" }} className="flex items-center gap-1.5">
                            <IconLayersLinked size={16} style={{ color: "#E8A04B" }} /> Advanced Combinatorial Option Token Matrix
                        </h4>
                        <p style={{ fontSize: 12, color: "#6B6B7A", marginTop: 2 }}>
                            Type the variation model entry value (e.g., <code>43</code> or <code>White</code>) then press <kbd className="bg-gray-100 px-1 border rounded text-[11px] font-mono text-black font-bold">Enter</kbd> to add it cleanly.
                        </p>
                    </div>

                    {/* Dynamic Badged Rows */}
                    <div className="flex flex-col gap-4">
                        {attributes.map((attr, attrIdx) => (
                            <div key={attrIdx} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-[#F7F6F3]/60 border border-[#E4E3E0] items-start relative group">
                                <div className="flex flex-col gap-1.5">
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6B6B7A" }} className="uppercase tracking-wider">Option Parameter Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g., Size" 
                                        value={attr.name} 
                                        onChange={(e) => handleAttributeNameChange(attrIdx, e.target.value)} 
                                        style={{ height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#fff" }} 
                                    />
                               </div>
                                
                                <div className="md:col-span-2 flex flex-col gap-1.5">
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6B6B7A" }} className="uppercase tracking-wider">Option Token Values</label>
                                    <div className="w-full min-h-[38px] p-1.5 flex flex-wrap items-center gap-1.5 rounded-lg border bg-white" style={{ borderColor: "#E4E3E0" }}>
                                        {attr.values.map((tagString, tagIdx) => (
                                            <span key={tagIdx} className="inline-flex items-center gap-1 text-xs font-semibold pl-2.5 pr-1.5 py-0.5 rounded-md border" style={{ background: "#2D2230", color: "#E8A04B", borderColor: "#2D2230" }}>
                                                {tagString}
                                                <button type="button" onClick={() => removeTagValueNode(attrIdx, tagIdx)} className="w-4 h-4 p-0 rounded-md border-0 bg-white/10 hover:bg-white/20 text-[#E8A04B] flex items-center justify-center cursor-pointer">
                                                    <IconX size={10} stroke={3} />
                                                </button>
                                            </span>
                                        ))}
                                        <input 
                                            type="text" 
                                            placeholder="Type item and press Enter..."
                                            value={attr.currentInput}
                                            onChange={(e) => handleTagInputChange(attrIdx, e.target.value)}
                                            onKeyDown={(e) => handleTagInputKeyDown(e, attrIdx)}
                                            className="flex-1 min-w-[140px] border-0 outline-none text-sm p-0.5 text-[#1C1C24] bg-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button type="button" onClick={() => setAttributes([...attributes, { name: "", values: [], currentInput: "" }])} className="h-8 px-3 rounded-lg text-xs font-medium border bg-white cursor-pointer hover:bg-gray-50" style={{ borderColor: "#E4E3E0" }}>
                            + Add Option Parameter Group
                        </button>
                        <button type="button" onClick={cleanAndGenerateVariations} className="h-8 px-4 rounded-lg text-xs font-semibold text-white border-0 cursor-pointer" style={{ background: "#2D2230" }}>
                            ⚡ Compute Combined Permutations Matrix
                        </button>
                    </div>

                    {/* ─── NEW ADDITION: DYNAMIC BULK MODIFICATION PANEL ROW ────────────────── */}
                    {variations.length > 0 && (
                        <div className="p-4 rounded-xl border flex flex-col md:flex-row items-end gap-4 mt-2 bg-[#F7F6F3]/90 border-dashed" style={{ borderColor: "#E8A04B" }}>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "#6B6B7A" }} className="flex items-center gap-1 uppercase tracking-wider">
                                        <IconAdjustmentsHorizontal size={13} /> Bulk Wholesale Cost
                                    </label>
                                    <input type="number" placeholder="Set global cost" value={bulkCost} onChange={(e) => setBulkCost(e.target.value)}
                                        style={{ height: 34, padding: "0 10px", fontSize: 12, borderRadius: 6, border: "1px solid #E4E3E0", background: "#fff" }} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "#3B6D11" }} className="flex items-center gap-1 uppercase tracking-wider">
                                        <IconAdjustmentsHorizontal size={13} /> Bulk Retail Price (P1)
                                    </label>
                                    <input type="number" placeholder="Set global price" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)}
                                        style={{ height: 34, padding: "0 10px", fontSize: 12, borderRadius: 6, border: "1px solid #E4E3E0", background: "#fff" }} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "#1C1C24" }} className="flex items-center gap-1 uppercase tracking-wider">
                                        <IconAdjustmentsHorizontal size={13} /> Bulk Stock Quantity
                                    </label>
                                    <input type="number" placeholder="Set global quantity" value={bulkQty} onChange={(e) => setBulkQty(e.target.value)}
                                        style={{ height: 34, padding: "0 10px", fontSize: 12, borderRadius: 6, border: "1px solid #E4E3E0", background: "#fff" }} />
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button type="button" onClick={triggerBulkBarcodeGeneration} className="h-[34px] px-3 rounded-6 border bg-white font-medium text-xs text-[#2D2230] cursor-pointer hover:bg-gray-50" style={{ borderColor: "#E4E3E0", borderRadius: 6 }}>
                                    Bulk Barcodes ⚡
                                </button>
                                <button type="button" onClick={executeBulkMatrixOverride} className="h-[34px] px-4 rounded-6 border-0 bg-[#3B6D11] text-white font-semibold text-xs cursor-pointer hover:bg-[#2d540d]" style={{ borderRadius: 6 }}>
                                    Apply to All Rows
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Output Matrix Table */}
                    {variations.length > 0 && (
                        <div className="rounded-xl border overflow-hidden bg-white shadow-sm" style={{ borderColor: "#E4E3E0" }}>
                            <table className="w-full text-left border-collapse" style={{ fontSize: 12 }}>
                                <thead>
                                    <tr style={{ background: "#F7F6F3", borderBottom: "1px solid #E4E3E0", color: "#6B6B7A" }}>
                                        <th className="p-2.5 font-medium">Permutation Variant Sub-Model</th>
                                        <th className="p-2.5 font-medium w-48">Allocated Barcode Slot</th>
                                        <th className="p-2.5 font-medium w-28 text-right">Cost (DA)</th>
                                        <th className="p-2.5 font-medium w-28 text-right">Retail Price P1 (DA)</th>
                                        <th className="p-2.5 font-medium w-24 text-right">Qty Available</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {variations.map((v, index) => (
                                        <tr key={v.id} className="border-b last:border-b-0 hover:bg-gray-50/40" style={{ borderColor: "#E4E3E0" }}>
                                            <td className="p-2.5 font-medium text-[#1C1C24]">{v.variant_name}</td>
                                            <td className="p-1">
                                                <div className="flex gap-1 items-center">
                                                    <input type="text" value={v.codebar} onChange={(e) => handleVariantRowEdit(v.id, "codebar", e.target.value)}
                                                        style={{ flex: 1, height: 28, padding: "0 6px", fontSize: 11, borderRadius: 4, border: "1px solid #E4E3E0", fontFamily: "mono" }} />
                                                    <button type="button" onClick={() => triggerBarcodeGeneration("variant", index)} title="Generate Row Barcode"
                                                        className="p-1 h-7 w-7 rounded bg-gray-100 border-0 text-[#2D2230] flex items-center justify-center cursor-pointer hover:bg-gray-200">
                                                        <IconBarcode size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-1 text-right">
                                                <input type="number" step="0.01" value={v.product_cost} onChange={(e) => handleVariantRowEdit(v.id, "product_cost", e.target.value)}
                                                    style={{ width: "100%", height: 28, padding: "0 8px", fontSize: 11, borderRadius: 4, border: "1px solid #E4E3E0", textAlign: "right" }} />
                                            </td>
                                            <td className="p-1 text-right">
                                                <input type="number" step="0.01" value={v.selling_price_1} onChange={(e) => handleVariantRowEdit(v.id, "selling_price_1", e.target.value)}
                                                    style={{ width: "100%", height: 28, padding: "0 8px", fontSize: 11, borderRadius: 4, border: "1px solid #E4E3E0", textAlign: "right", fontWeight: "bold", color: "#3B6D11" }} />
                                            </td>
                                            <td className="p-1 text-right">
                                                <input type="number" value={v.quantity} onChange={(e) => handleVariantRowEdit(v.id, "quantity", e.target.value)}
                                                    style={{ width: "100%", height: 28, padding: "0 8px", fontSize: 11, borderRadius: 4, border: "1px solid #E4E3E0", textAlign: "right", color: "#1C1C24" }} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </form>
    );
}
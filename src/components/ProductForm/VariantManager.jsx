import React, { useState } from "react";
import { IconLayersLinked, IconX, IconBarcode, IconAdjustmentsHorizontal } from "@tabler/icons-react";

export default function VariantManager({ baseForm, attributes, setAttributes, variations, setVariations }) {
    const [bulkCost, setBulkCost] = useState("");
    const [bulkPrice, setBulkPrice] = useState("");
    const [bulkQty, setBulkQty] = useState("");

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
            e.preventDefault(); 
            const prospectiveTag = attributes[index].currentInput.trim();
            if (prospectiveTag === "") return;

            if (!attributes[index].values.includes(prospectiveTag)) {
                const updated = [...attributes];
                updated[index].values.push(prospectiveTag);
                updated[index].currentInput = ""; 
                setAttributes(updated);
            } else {
                const updated = [...attributes];
                updated[index].currentInput = ""; 
                setAttributes(updated);
            }
        }
    };

    const removeTagValueNode = (attrIndex, tagIndex) => {
        const updated = [...attributes];
        updated[attrIndex].values.splice(tagIndex, 1);
        setAttributes(updated);
    };

    const addNewEmptyAttributeRow = () => {
        setAttributes([...attributes, { name: "", values: [], currentInput: "" }]);
    };

    const removeWholeAttributeRow = (index) => {
        const updated = [...attributes];
        updated.splice(index, 1);
        setAttributes(updated);
    };

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
                product_cost: baseForm.product_cost,
                selling_price_1: baseForm.selling_price_1,
                quantity: "0"
            };
        });
        setVariations(generatedRows);
    };

    const triggerVariantBarcode = (variantIdx) => {
        const randomBody = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const synthesizedBarcode = "613" + randomBody;
        setVariations(prev => prev.map((v, idx) => idx === variantIdx ? { ...v, codebar: synthesizedBarcode } : v));
    };

    const triggerBulkBarcodeGeneration = () => {
        setVariations(prev => prev.map(v => {
            const randomBody = Math.floor(1000000000 + Math.random() * 9000000000).toString();
            return { ...v, codebar: "613" + randomBody };
        }));
    };

    const executeBulkMatrixOverride = () => {
        if (!bulkCost && !bulkPrice && !bulkQty) {
            alert("Please fill in at least one bulk parameter to apply updates.");
            return;
        }

        setVariations(prev => prev.map(v => ({
            ...v,
            product_cost: bulkCost.trim() !== "" ? bulkCost : v.product_cost,
            selling_price_1: bulkPrice.trim() !== "" ? bulkPrice : v.selling_price_1,
            quantity: bulkQty.trim() !== "" ? bulkQty : v.quantity
        })));

        setBulkCost("");
        setBulkPrice("");
        setBulkQty("");
    };

    const handleVariantRowEdit = (id, field, value) => {
        setVariations(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    return (
        <div className="p-5 rounded-xl border mt-6 flex flex-col gap-5 bg-white" style={{ borderColor: "#E8A04B" }}>
            <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: "#1C1C24" }} className="flex items-center gap-1.5">
                    <IconLayersLinked size={16} style={{ color: "#E8A04B" }} /> Advanced Combinatorial Option Token Matrix
                </h4>
                <p style={{ fontSize: 12, color: "#6B6B7A", marginTop: 2 }}>
                    Type the variation model variable (e.g., <code>42</code> or <code>Crimson Red</code>) then press <kbd className="bg-gray-100 px-1 border rounded text-[11px] font-mono text-black font-bold">Enter</kbd>.
                </p>
            </div>

            <div className="flex flex-col gap-4">
                {attributes.map((attr, attrIdx) => (
                    <div key={attrIdx} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-[#F7F6F3]/60 border border-[#E4E3E0] items-start relative group">
                        <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: 11, fontWeight: 600, color: "#6B6B7A" }} className="uppercase tracking-wider">Option Parameter Name</label>
                            <input type="text" placeholder="e.g., Size or Color" value={attr.name} onChange={(e) => handleAttributeNameChange(attrIdx, e.target.value)} style={{ height: 38, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#fff" }} />
                        </div>
                        
                        <div className="md:col-span-2 flex flex-col gap-1.5">
                            <label style={{ fontSize: 11, fontWeight: 600, color: "#6B6B7A" }} className="uppercase tracking-wider">Option Token Values</label>
                            <div className="w-full min-h-[38px] p-1.5 flex flex-wrap items-center gap-1.5 rounded-lg border bg-white" style={{ borderColor: "#E4E3E0" }}>
                                {attr.values.map((tagString, tagIdx) => (
                                    <span key={tagIdx} className="inline-flex items-center gap-1 text-xs font-semibold pl-2.5 pr-1.5 py-0.5 rounded-md border" style={{ background: "#2D2230", color: "#E8A04B", borderColor: "#2D2230" }}>
                                        {tagString}
                                        <button type="button" onClick={() => removeTagValueNode(attrIdx, tagIdx)} className="w-4 h-4 p-0 rounded-md border-0 bg-white/10 hover:bg-white/20 text-[#E8A04B] flex items-center justify-center cursor-pointer transition-colors">
                                            <IconX size={10} stroke={3} />
                                        </button>
                                    </span>
                                ))}
                                <input type="text" placeholder={attr.values.length === 0 ? "Type option value and press Enter..." : "Next item..."} value={attr.currentInput} onChange={(e) => handleTagInputChange(attrIdx, e.target.value)} onKeyDown={(e) => handleTagInputKeyDown(e, attrIdx)} className="flex-1 min-w-[140px] border-0 outline-none text-sm p-0.5 text-[#1C1C24]" style={{ background: "transparent" }} />
                            </div>
                        </div>

                        {attributes.length > 1 && (
                            <button type="button" onClick={() => removeWholeAttributeRow(attrIdx)} className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-[#E4E3E0] text-[#E24B4A] rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:bg-red-50">
                                <IconX size={12} stroke={2.5} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <button type="button" onClick={addNewEmptyAttributeRow} className="h-8 px-3 rounded-lg text-xs font-medium border bg-white cursor-pointer hover:bg-gray-50" style={{ borderColor: "#E4E3E0", color: "#1C1C24" }}>
                    + Add Option Parameter Group
                </button>
                <button type="button" onClick={cleanAndGenerateVariations} className="h-8 px-4 rounded-lg text-xs font-semibold text-white border-0 cursor-pointer" style={{ background: "#2D2230" }}>
                    ⚡ Compute Combined Permutations Matrix
                </button>
            </div>

            {variations.length > 0 && (
                <div className="p-4 rounded-xl border flex flex-col md:flex-row items-end gap-4 mt-2 bg-[#F7F6F3]/90 border-dashed" style={{ borderColor: "#E8A04B" }}>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: 11, fontWeight: 600, color: "#6B6B7A" }} className="flex items-center gap-1 uppercase tracking-wider">
                                <IconAdjustmentsHorizontal size={13} /> Bulk Cost
                            </label>
                            <input type="number" placeholder="Set global cost" value={bulkCost} onChange={(e) => setBulkCost(e.target.value)} style={{ height: 34, padding: "0 10px", fontSize: 12, borderRadius: 6, border: "1px solid #E4E3E0", background: "#fff" }} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: 11, fontWeight: 600, color: "#3B6D11" }} className="flex items-center gap-1 uppercase tracking-wider">
                                <IconAdjustmentsHorizontal size={13} /> Bulk Retail P1
                            </label>
                            <input type="number" placeholder="Set global price" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} style={{ height: 34, padding: "0 10px", fontSize: 12, borderRadius: 6, border: "1px solid #E4E3E0", background: "#fff" }} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: 11, fontWeight: 600, color: "#1C1C24" }} className="flex items-center gap-1 uppercase tracking-wider">
                                <IconAdjustmentsHorizontal size={13} /> Bulk Qty
                            </label>
                            <input type="number" placeholder="Set global quantity" value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} style={{ height: 34, padding: "0 10px", fontSize: 12, borderRadius: 6, border: "1px solid #E4E3E0", background: "#fff" }} />
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

            {variations.length > 0 && (
                <div className="rounded-xl border overflow-hidden mt-2 bg-white shadow-sm" style={{ borderColor: "#E4E3E0" }}>
                    <table className="w-full text-left border-collapse" style={{ fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: "#F7F6F3", borderBottom: "1px solid #E4E3E0", color: "#6B6B7A" }}>
                                <th className="p-2.5 font-medium">Permutation Variant Sub-Model</th>
                                <th className="p-2.5 font-medium w-48">Allocated Barcode Slot</th>
                                <th className="p-2.5 font-medium w-24 text-right">Qty</th>
                                <th className="p-2.5 font-medium w-32 text-right">Cost (DA)</th>
                                <th className="p-2.5 font-medium w-32 text-right">Retail Price P1 (DA)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variations.map((v, index) => (
                                <tr key={v.id} className="border-b last:border-b-0 hover:bg-gray-50/40" style={{ borderColor: "#E4E3E0" }}>
                                    <td className="p-2.5 font-medium text-[#1C1C24]">{v.variant_name}</td>
                                    <td className="p-1">
                                        <div className="flex gap-1 items-center">
                                            <input type="text" value={v.codebar} onChange={(e) => handleVariantRowEdit(v.id, "codebar", e.target.value)} style={{ flex: 1, height: 28, padding: "0 6px", fontSize: 11, borderRadius: 4, border: "1px solid #E4E3E0", fontFamily: "mono" }} />
                                            <button type="button" onClick={() => triggerVariantBarcode(index)} className="p-1 h-7 w-7 rounded bg-gray-100 border-0 text-[#2D2230] flex items-center justify-center cursor-pointer hover:bg-gray-200">
                                                <IconBarcode size={13} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-1 text-right">
                                        <input type="number" value={v.quantity} onChange={(e) => handleVariantRowEdit(v.id, "quantity", e.target.value)} style={{ width: "100%", height: 28, padding: "0 8px", fontSize: 11, borderRadius: 4, border: "1px solid #E4E3E0", textAlign: "right" }} />
                                    </td>
                                    <td className="p-1 text-right">
                                        <input type="number" step="0.01" value={v.product_cost} onChange={(e) => handleVariantRowEdit(v.id, "product_cost", e.target.value)} style={{ width: "100%", height: 28, padding: "0 8px", fontSize: 11, borderRadius: 4, border: "1px solid #E4E3E0", textAlign: "right" }} />
                                    </td>
                                    <td className="p-1 text-right">
                                        <input type="number" step="0.01" value={v.selling_price_1} onChange={(e) => handleVariantRowEdit(v.id, "selling_price_1", e.target.value)} style={{ width: "100%", height: 28, padding: "0 8px", fontSize: 11, borderRadius: 4, border: "1px solid #E4E3E0", textAlign: "right", fontWeight: "bold", color: "#3B6D11" }} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
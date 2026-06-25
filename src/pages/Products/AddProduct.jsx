import React, { useState } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

import PrimaryIdentity from "../../components/ProductForm/PrimaryIdentity";
import CostingMatrix from "../../components/ProductForm/CostingMatrix";
import ProductSidebar from "../../components/ProductForm/ProductSidebar";
import VariantManager from "../../components/ProductForm/VariantManager";

export default function AddProduct({ onNavigate }) {
    const [productType, setProductType] = useState("simple");
    const navigate = useNavigate();

    const [baseForm, setBaseForm] = useState({
        name: "",
        reference: "",
        codebar: "",
        quantity: "0",
        product_cost: "0",
        selling_price_1: "0",
        selling_price_2: "0",
        selling_price_3: "0",
        selling_price_4: "0",
        measurement_unit: "pcs",
        category_id: "cat_1",  // ✅ Matches seeded data key
        supplier_id: "s1",     // ✅ Matches seeded data key
        supplier_paid: "false"
    });

    const [imagePreview, setImagePreview] = useState(null);
    const [actualImageFile, setActualImageFile] = useState(null);

    const [attributes, setAttributes] = useState([
        { name: "Size", values: ["40", "41", "42", "43"], currentInput: "" },
        { name: "Color", values: ["Black", "White", "Navy"], currentInput: "" }
    ]);
    const [variations, setVariations] = useState([]);

    const handleFileStreamInject = (e) => {
        const targetFile = e.target.files[0];
        if (!targetFile) return;
        setActualImageFile(targetFile);
        const fileReader = new FileReader();
        fileReader.onloadend = () => setImagePreview(fileReader.result);
        fileReader.readAsDataURL(targetFile);
    };

    const executeFormCommit = async (e) => {
        e.preventDefault();
        const formData = new FormData();

        formData.append("name", baseForm.name);
        formData.append("product_type", productType);
        formData.append("reference", baseForm.reference);
        formData.append("codebar",  baseForm.codebar); // leave the main codebar this what it was productType === "simple" ? baseForm.codebar : ""
        formData.append("quantity", productType === "simple" ? baseForm.quantity : "0");
        formData.append("product_cost", baseForm.product_cost);
        formData.append("selling_price_1", baseForm.selling_price_1);
        formData.append("selling_price_2", baseForm.selling_price_2);
        formData.append("selling_price_3", baseForm.selling_price_3);
        formData.append("selling_price_4", baseForm.selling_price_4);
        formData.append("measurement_unit", baseForm.measurement_unit);
        formData.append("category_id", baseForm.category_id);
        formData.append("supplier_id", baseForm.supplier_id);

        if (productType === "variable") {
            const normalizedVariants = variations.map(v => ({
                variant_name: v.variant_name,
                codebar: v.codebar,
                product_cost: v.product_cost.toString(),
                selling_price_1: v.selling_price_1.toString(),
                quantity: v.quantity.toString()
            }));
            formData.append("variations", JSON.stringify(normalizedVariants));
        }

        if (actualImageFile) {
            formData.append("image", actualImageFile);
        }

        try {
            const response = await fetch("/api/products", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                alert(`🎉 Product asset successfully provisioned! Key: ${data.id}`);
                navigate(-1);
            } else {
                const errorMessage = await response.text();
                alert(`❌ Server rejected asset registry: ${errorMessage}`);
            }
        } catch (error) {
            console.error("Network write exception intercepted:", error);
            alert("🚨 Communication error. Failed to establish connection with server inventory logs.");
        } 
    };

    return (
        <form onSubmit={executeFormCommit} className="max-w-5xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: "#E4E3E0" }}>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate(-1)} className="p-2 rounded-lg border bg-white cursor-pointer text-[#6B6B7A] flex items-center justify-center hover:bg-gray-50" style={{ borderColor: "#E4E3E0" }}>
                        <IconArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1C1C24", lineHeight: 1.1 }}>Provision New Product Asset</h1>
                        <p style={{ fontSize: 12, color: "#6B6B7A", marginTop: 2 }}>Dedicated workspace window for processing multi-tier retail stock.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => navigate(-1)} className="h-9 px-4 rounded-lg border bg-white text-[#6B6B7A] text-sm font-medium cursor-pointer">Discard</button>
                    <button type="submit" className="h-9 px-5 rounded-lg text-white border-0 text-sm font-medium cursor-pointer" style={{ background: "#E8A04B" }}>Commit Master Asset File</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <PrimaryIdentity baseForm={baseForm} setBaseForm={setBaseForm} productType={productType} />
                    <CostingMatrix baseForm={baseForm} setBaseForm={setBaseForm} />
                </div>

                <ProductSidebar
                    productType={productType}
                    setProductType={setProductType}
                    baseForm={baseForm}
                    setBaseForm={setBaseForm}
                    imagePreview={imagePreview}
                    handleFileStreamInject={handleFileStreamInject}
                />
            </div>

            {productType === "variable" && (
                <VariantManager
                    baseForm={baseForm}
                    attributes={attributes}
                    setAttributes={setAttributes}
                    variations={variations}
                    setVariations={setVariations}
                />
            )}
        </form>
    );
}
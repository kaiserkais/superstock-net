import React, { useState, useEffect } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";

import PrimaryIdentity from "../../components/ProductForm/PrimaryIdentity";
import CostingMatrix from "../../components/ProductForm/CostingMatrix";
import ProductSidebar from "../../components/ProductForm/ProductSidebar";
import VariantManager from "../../components/ProductForm/VariantManager";

export default function EditProduct({ onNavigate }) {
    const navigate = useNavigate();
    const { id } = useParams(); // Retrieves ID string if using router parameters

    const [loading, setLoading] = useState(true);
    const [productType, setProductType] = useState("simple");

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
        category_id: "cat_1",
        supplier_id: "s1",
        supplier_paid: "false"
    });

    const [imagePreview, setImagePreview] = useState(null);
    const [actualImageFile, setActualImageFile] = useState(null);
    
    const [attributes, setAttributes] = useState([
        { name: "Size", values: ["40", "41", "42", "43"], currentInput: "" },
        { name: "Color", values: ["Black", "White", "Navy"], currentInput: "" }
    ]);
    const [variations, setVariations] = useState([]);

    // Hydrate existing inventory asset details on mount
    useEffect(() => {
        async function fetchProductData() {
            try {
                const res = await fetch("/api/products");
                if (!res.ok) throw new Error("Failed to read system catalog record");
                
                const catalog = await res.json();
                const product = catalog.find((p) => p.id === id);
                if (!product) {
                    alert("🚨 Selected asset entry was missing or dropped.");
                    if (onNavigate) onNavigate("list");
                    return;
                }

                // Hydrate base metadata structure
                setProductType(product.product_type);
                setBaseForm({
                    name: product.name || "",
                    reference: product.reference || "",
                    codebar: product.codebar || "",
                    quantity: String(product.quantity ?? 0),
                    product_cost: String(product.product_cost ?? 0),
                    selling_price_1: String(product.selling_price_1 ?? 0),
                    selling_price_2: String(product.selling_price_2 ?? 0),
                    selling_price_3: String(product.selling_price_3 ?? 0),
                    selling_price_4: String(product.selling_price_4 ?? 0),
                    measurement_unit: product.measurement_unit || "pcs",
                    category_id: product.category_id || "cat_1",
                    supplier_id: product.supplier_id || "s1",
                    supplier_paid: "false"
                });

                // Hydrate existing image if tracked by database rows
                
                if (product.image_path) {
                    
                    setImagePreview(`/images/${product.image_path}`);
                }

                // Hydrate variation child configurations if flagged as variable type
                if (product.product_type === "variable" && product.variants) {
                    setVariations(product.variants.map(v => ({
                        variant_name: v.variant_name,
                        codebar: v.codebar,
                        product_cost: v.product_cost,
                        selling_price_1: v.selling_price_1,
                        quantity: v.quantity
                    })));
                }
                
                setLoading(false);
            } catch (err) {
                console.error("Hydration runtime error:", err);
                alert("❌ Critical communication failure resolving target metadata mapping.");
            }
        }
        fetchProductData();
    }, [id]);

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
        formData.append("codebar", baseForm.codebar); /// leave main codebard cause we will need it productType === "simple" ? baseForm.codebar : ""
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
            const response = await fetch(`/api/products/${id}`, {
                method: "PUT",
                body: formData,
            });

            if (response.ok) {
                alert(`🎉 Product asset successfully modified!`);
                navigate(-1);
            } else {
                const errorMessage = await response.text();
                alert(`❌ Server rejected asset update checkpoint: ${errorMessage}`);
                
            }
        } catch (error) {
            console.error("Network write exception intercepted:", error);
            alert("🚨 Communication error. Failed to execute update request.");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-[#6B6B7A]">
                <p className="text-sm font-medium animate-pulse">Syncing system product records...</p>
            </div>
        );
    }

    return (
        <form onSubmit={executeFormCommit} className="max-w-5xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: "#E4E3E0" }}>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate(-1)} className="p-2 rounded-lg border bg-white cursor-pointer text-[#6B6B7A] flex items-center justify-center hover:bg-gray-50" style={{ borderColor: "#E4E3E0" }}>
                        <IconArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1C1C24", lineHeight: 1.1 }}>Modify Product Configurations</h1>
                        <p style={{ fontSize: 12, color: "#6B6B7A", marginTop: 2 }}>Edit tracking metadata values for active stock index items.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => navigate(-1)} className="h-9 px-4 rounded-lg border bg-white text-[#6B6B7A] text-sm font-medium cursor-pointer">Discard Changes</button>
                    <button type="submit" className="h-9 px-5 rounded-lg text-white border-0 text-sm font-medium cursor-pointer" style={{ background: "#E8A04B" }}>Save Asset Updates</button>
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
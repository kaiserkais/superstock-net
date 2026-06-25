import React, { useState, useEffect } from "react";
import { 
    IconFolder, 
    IconPlus, 
    IconEdit, 
    IconTrash, 
    IconX, 
    IconAlertTriangle, 
    IconLoader2 
} from "@tabler/icons-react";

export default function CategoriesPage() {
    const BACKEND_URL = "http://localhost:8080";

    // ─── STATE MANAGEMENT ──────────────────────────────────────────────────
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    // Modal Control Switches
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Form Tracking States
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [formData, setFormData] = useState({ name: "", description: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ─── CORE API INTERACTIONS ──────────────────────────────────────────────
    
    // Fetch all rows
    const fetchCategories = async () => {
        setIsLoading(true);
        setErrorMessage("");
        try {
            const response = await fetch(`${BACKEND_URL}/api/categories`);
            if (!response.ok) throw new Error("Could not retrieve category records.");
            const data = await response.json();
            setCategories(data);
        } catch (err) {
            setErrorMessage(err.message || "An unexpected network error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Create Action
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSubmitting(true);
        setErrorMessage("");
        try {
            const response = await fetch(`${BACKEND_URL}/api/categories`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || "Failed to generate structural segment.");
            }

            // Reset & Refresh
            setIsAddModalOpen(false);
            setFormData({ name: "", description: "" });
            fetchCategories();
        } catch (err) {
            setErrorMessage(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Update Action
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !selectedCategory) return;

        setIsSubmitting(true);
        setErrorMessage("");
        try {
            const response = await fetch(`${BACKEND_URL}/api/categories/${selectedCategory.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || "Modification payload rejected.");
            }

            setIsEditModalOpen(false);
            setSelectedCategory(null);
            setFormData({ name: "", description: "" });
            fetchCategories();
        } catch (err) {
            setErrorMessage(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete Action
    const handleDeleteConfirm = async () => {
        if (!selectedCategory) return;

        setIsSubmitting(true);
        setErrorMessage("");
        try {
            const response = await fetch(`${BACKEND_URL}/api/categories/${selectedCategory.id}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Eviction routine dropped by data engine.");

            setIsDeleteModalOpen(false);
            setSelectedCategory(null);
            fetchCategories();
        } catch (err) {
            setErrorMessage(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper triggers to set up data forms safely
    const openEditModal = (category) => {
        setSelectedCategory(category);
        setFormData({ name: category.name, description: category.description || "" });
        setErrorMessage("");
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (category) => {
        setSelectedCategory(category);
        setErrorMessage("");
        setIsDeleteModalOpen(true);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6 bg-[#FAF9F6] min-h-screen text-[#1C1C24]">
            
            {/* ─── PAGE HEADER ────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5" style={{ borderColor: "#E4E3E0" }}>
                <div>
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <IconFolder size={24} className="text-[#6B6B7A]" /> 
                        Category Structural Layout
                    </h1>
                    <p className="text-xs text-[#6B6B7A] mt-0.5">Define classifications and link active stock parameters cleanly.</p>
                </div>
                
                <button
                    onClick={() => {
                        setFormData({ name: "", description: "" });
                        setErrorMessage("");
                        setIsAddModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    style={{ background: "#2D2230", color: "#E8A04B" }}
                >
                    <IconPlus size={16} /> New Segment Allocation
                </button>
            </div>

            {/* Error banner notification framework */}
            {errorMessage && !isAddModalOpen && !isEditModalOpen && !isDeleteModalOpen && (
                <div className="p-4 rounded-xl border bg-red-50 text-red-700 text-xs font-medium border-red-200 flex items-center gap-2">
                    <IconAlertTriangle size={16} className="shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* ─── DATA TABLE VIEWS ───────────────────────────────────────── */}
            <div className="bg-white rounded-xl border overflow-hidden shadow-sm" style={{ borderColor: "#E4E3E0" }}>
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-2 text-[#6B6B7A]">
                        <IconLoader2 className="animate-spin text-[#2D2230]" size={28} />
                        <span className="text-xs font-medium">Interrogating indexed registry...</span>
                    </div>
                ) : categories.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center gap-2 bg-[#F7F6F3]">
                        <IconFolder size={36} className="text-[#9B9BA8]" />
                        <span className="text-sm font-semibold text-[#1C1C24]">No Segment Found</span>
                        <p className="text-xs text-[#6B6B7A] max-w-xs">Your system has no custom tracking segments initialized. Click button above to assign records.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#F7F6F3] border-b text-xs font-semibold text-[#6B6B7A]" style={{ borderColor: "#E4E3E0" }}>
                                    <th className="p-4 w-32">Unique Identifier</th>
                                    <th className="p-4">Classification Title</th>
                                    <th className="p-4">Structural Mapping Note</th>
                                    <th className="p-4 text-center w-40">Linked Products</th>
                                    <th className="p-4 text-right w-28">Actions Matrix</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-xs" style={{ borderColor: "#E4E3E0" }}>
                                {categories.map((category) => (
                                    <tr key={category.id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="p-4 font-mono text-[11px] text-[#9B9BA8]">{category.id}</td>
                                        <td className="p-4 font-semibold text-[#1C1C24]">{category.name}</td>
                                        <td className="p-4 text-[#6B6B7A] max-w-sm truncate">
                                            {category.description ? category.description : <span className="italic text-gray-300">No descriptive brief registered</span>}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px]" 
                                                  style={{ 
                                                      background: category.product_count > 0 ? "#E2F0D9" : "#F7F6F3", 
                                                      color: category.product_count > 0 ? "#385723" : "#9B9BA8" 
                                                  }}>
                                                {category.product_count} Units
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    onClick={() => openEditModal(category)}
                                                    className="w-7 h-7 rounded-md border flex items-center justify-center text-[#6B6B7A] hover:text-[#2D2230] bg-white transition-all hover:bg-gray-50 cursor-pointer"
                                                    style={{ borderColor: "#E4E3E0" }}
                                                    title="Modify Properties"
                                                >
                                                    <IconEdit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(category)}
                                                    className="w-7 h-7 rounded-md border flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 transition-all cursor-pointer"
                                                    style={{ borderColor: "#E4E3E0" }}
                                                    title="Purge From Index"
                                                >
                                                    <IconTrash size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ─── MODAL 1: ADD CATEGORY SEGMENT ───────────────────────────────── */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border shadow-xl w-full max-w-md overflow-hidden flex flex-col anim-fade-in" style={{ borderColor: "#E4E3E0" }}>
                        <div className="p-4 border-b flex justify-between items-center bg-[#F7F6F3]" style={{ borderColor: "#E4E3E0" }}>
                            <h2 className="text-xs font-bold tracking-wider text-[#1C1C24] uppercase">New Segment Allocation</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-[#6B6B7A] hover:text-[#1C1C24] cursor-pointer"><IconX size={16} /></button>
                        </div>
                        
                        <form onSubmit={handleCreateSubmit}>
                            <div className="p-5 flex flex-col gap-4">
                                {errorMessage && (
                                    <div className="p-3 rounded-lg border bg-red-50 text-red-700 text-xs font-medium border-red-100 flex items-center gap-1.5">
                                        <IconAlertTriangle size={14} className="shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}
                                
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold text-[#6B6B7A] uppercase tracking-wider">Classification Title *</label>
                                    <input 
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Running Shoes, Leather Belts"
                                        className="w-full h-9 px-3 text-xs rounded-lg border outline-none focus:ring-1 focus:ring-[#2D2230] transition-all bg-white"
                                        style={{ borderColor: "#E4E3E0" }}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold text-[#6B6B7A] uppercase tracking-wider">Structural Mapping Note (Optional)</label>
                                    <textarea 
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Add context descriptions about items matching this group segment row..."
                                        className="w-full p-3 text-xs rounded-lg border outline-none focus:ring-1 focus:ring-[#2D2230] transition-all resize-none bg-white"
                                        style={{ borderColor: "#E4E3E0" }}
                                    />
                                </div>
                            </div>

                            <div className="p-4 border-t bg-[#F7F6F3] flex justify-end gap-2" style={{ borderColor: "#E4E3E0" }}>
                                <button 
                                    type="button" 
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="h-9 px-4 rounded-lg text-xs font-semibold border bg-white text-[#6B6B7A] hover:bg-gray-50 cursor-pointer"
                                    style={{ borderColor: "#E4E3E0" }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-[#E8A04B] cursor-pointer hover:opacity-90 disabled:opacity-50"
                                    style={{ background: "#2D2230" }}
                                >
                                    {isSubmitting && <IconLoader2 size={14} className="animate-spin" />}
                                    Commit Entry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL 2: EDIT CATEGORY PROPERTIES ───────────────────────────── */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border shadow-xl w-full max-w-md overflow-hidden flex flex-col" style={{ borderColor: "#E4E3E0" }}>
                        <div className="p-4 border-b flex justify-between items-center bg-[#F7F6F3]" style={{ borderColor: "#E4E3E0" }}>
                            <h2 className="text-xs font-bold tracking-wider text-[#1C1C24] uppercase">Modify Properties</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-[#6B6B7A] hover:text-[#1C1C24] cursor-pointer"><IconX size={16} /></button>
                        </div>
                        
                        <form onSubmit={handleEditSubmit}>
                            <div className="p-5 flex flex-col gap-4">
                                {errorMessage && (
                                    <div className="p-3 rounded-lg border bg-red-50 text-red-700 text-xs font-medium border-red-100 flex items-center gap-1.5">
                                        <IconAlertTriangle size={14} className="shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}
                                
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold text-[#6B6B7A] uppercase tracking-wider">Classification Title *</label>
                                    <input 
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full h-9 px-3 text-xs rounded-lg border outline-none focus:ring-1 focus:ring-[#2D2230] transition-all bg-white"
                                        style={{ borderColor: "#E4E3E0" }}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[11px] font-bold text-[#6B6B7A] uppercase tracking-wider">Structural Mapping Note (Optional)</label>
                                    <textarea 
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full p-3 text-xs rounded-lg border outline-none focus:ring-1 focus:ring-[#2D2230] transition-all resize-none bg-white"
                                        style={{ borderColor: "#E4E3E0" }}
                                    />
                                </div>
                            </div>

                            <div className="p-4 border-t bg-[#F7F6F3] flex justify-end gap-2" style={{ borderColor: "#E4E3E0" }}>
                                <button 
                                    type="button" 
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="h-9 px-4 rounded-lg text-xs font-semibold border bg-white text-[#6B6B7A] hover:bg-gray-50 cursor-pointer"
                                    style={{ borderColor: "#E4E3E0" }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-[#E8A04B] cursor-pointer hover:opacity-90 disabled:opacity-50"
                                    style={{ background: "#2D2230" }}
                                >
                                    {isSubmitting && <IconLoader2 size={14} className="animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL 3: PURGE CONFIRMATION MATRIX ─────────────────────────── */}
            {isDeleteModalOpen && selectedCategory && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl border shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-scale-up" style={{ borderColor: "#E4E3E0" }}>
                        <div className="p-5 flex flex-col items-center text-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                                <IconAlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#1C1C24]">Confirm Record Eviction</h3>
                                <p className="text-xs text-[#6B6B7A] mt-1.5">
                                    Are you sure you want to delete <span className="font-semibold text-black">"{selectedCategory.name}"</span>?
                                </p>
                                {selectedCategory.product_count > 0 && (
                                    <p className="mt-3 text-[11px] bg-amber-50 text-amber-800 border border-amber-200 p-2.5 rounded-lg text-left">
                                        ⚠️ <strong>Notice:</strong> There are <strong>{selectedCategory.product_count} products</strong> linked directly to this classification. Due to SQLite architecture integrity restrictions, their category targets will automatically be detached and set to empty safely.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-[#F7F6F3] flex justify-end gap-2" style={{ borderColor: "#E4E3E0" }}>
                            <button 
                                type="button" 
                                disabled={isSubmitting}
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="h-9 px-4 rounded-lg text-xs font-semibold border bg-white text-[#6B6B7A] hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                                style={{ borderColor: "#E4E3E0" }}
                            >
                                Abort
                            </button>
                            <button 
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleDeleteConfirm}
                                className="h-9 px-4 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting && <IconLoader2 size={14} className="animate-spin" />}
                                Confirm Purge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
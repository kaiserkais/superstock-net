import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    IconUserPlus,
    IconPencil,
    IconTrash,
    IconX,
    IconDeviceMobile,
    IconAlertTriangle,
    IconMapPin,
    IconCoins,
    IconSearch
} from "@tabler/icons-react";

export default function Customers() {
    // ─── STATE MANAGEMENT ────────────────────────────────────────────────────────
    const [customerList, setCustomerList] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    // Modal Control States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Form / Action Targets
    const [editingCustomer, setEditingCustomer] = useState(null); // null = Add Mode, object = Edit Mode
    const [deletingCustomer, setDeletingCustomer] = useState(null);

    // Controlled Form Fields (Aligned precisely with Axum structs)
    const [formData, setFormData] = useState({ name: "", phone_number: "", address: "", initial_debt: "0" });

    // Dynamic Button Hover Flags
    const [addBtnHover, setAddBtnHover] = useState(false);
    const [confirmDeleteHover, setConfirmDeleteHover] = useState(false);

    // ─── DATABASE SYNC (LIFECYCLE) ───────────────────────────────────────────────
    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/api/customers");
            
            console.log("Axum Customers Response Raw Payload:", response.data);

            const actualArray = Array.isArray(response.data)
                ? response.data
                : (response.data.customers || response.data.data || []);

            setCustomerList(actualArray);
        } catch (error) {
            console.error("Database connection failed while fetching customer registry:", error);
            setCustomerList([]);
        } finally {
            setLoading(false);
        }
    };

    // ─── HANDLERS ────────────────────────────────────────────────────────────────
    const openAddModal = () => {
        setEditingCustomer(null);
        setFormData({ name: "", phone_number: "", address: "", initial_debt: "0" });
        setIsFormModalOpen(true);
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            phone_number: customer.phone_number || "",
            address: customer.address || "",
            initial_debt: "0" // Ignored during PUT operations on the backend
        });
        setIsFormModalOpen(true);
    };

    const openDeleteModal = (customer) => {
        setDeletingCustomer(customer);
        setIsDeleteModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const cleanPayload = {
                name: formData.name,
                phone_number: formData.phone_number.trim() !== "" ? formData.phone_number : null,
                address: formData.address.trim() !== "" ? formData.address : null,
            };

            if (editingCustomer) {
                // UPDATE Route: PUT /api/customers/{id}
                await axios.put(`/api/customers/${editingCustomer.id}`, cleanPayload);
                
                setCustomerList(prev => prev.map(item =>
                    item.id === editingCustomer.id ? { ...item, ...cleanPayload } : item
                ));
            } else {
                // CREATE Route: POST /api/customers
                const finalCreatePayload = {
                    ...cleanPayload,
                    initial_debt: parseFloat(formData.initial_debt) || 0.0
                };

                const response = await axios.post("/api/customers", finalCreatePayload);

                const newCustomerNode = {
                    id: response.data.id,
                    name: cleanPayload.name,
                    phone_number: cleanPayload.phone_number,
                    address: cleanPayload.address,
                    total_debt: finalCreatePayload.initial_debt
                };

                setCustomerList(prev => [...prev, newCustomerNode]);
            }
            setIsFormModalOpen(false);
        } catch (error) {
            console.error("Database write synchronization dropped:", error);
            alert(error.response?.data || "Operation failed. Verify internal ledger data.");
        }
    };

    const handleDeleteConfirm = async () => {
        try {
            // DESTROY Route: DELETE /api/customers/{id}
            await axios.delete(`/api/customers/${deletingCustomer.id}`);
            setCustomerList(prev => prev.filter(item => item.id !== deletingCustomer.id));
            setIsDeleteModalOpen(false);
            setDeletingCustomer(null);
        } catch (error) {
            console.error("Failed to execute database cascade deletion:", error);
            alert(error.response?.data || "Error processing profile deletion.");
        }
    };

    // ─── LOCAL FILTERING PIPELINE ────────────────────────────────────────────────
    const filteredCustomers = customerList.filter(customer => {
        const query = searchQuery.toLowerCase();
        return (
            customer.name.toLowerCase().includes(query) ||
            (customer.phone_number && customer.phone_number.includes(query)) ||
            (customer.address && customer.address.toLowerCase().includes(query)) ||
            customer.id.toLowerCase().includes(query)
        );
    });

    return (
        <>
            {/* ─── PAGE HEADER ────────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 500, color: "#1C1C24", lineHeight: 1.2 }}>
                        Customer Registry
                    </h1>
                    <p style={{ fontSize: 13, color: "#6B6B7A", marginTop: 3 }}>
                        Manage local client records, tracking profiles, addresses, and open credit ledger balances.
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    onMouseEnter={() => setAddBtnHover(true)}
                    onMouseLeave={() => setAddBtnHover(false)}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-white border-0 cursor-pointer font-medium"
                    style={{ fontSize: 13, background: addBtnHover ? "#C8873A" : "#E8A04B", transition: "background 0.15s" }}
                >
                    <IconUserPlus size={16} stroke={2} />
                    Register New Customer
                </button>
            </div>

            {/* ─── SEARCH & FILTER INPUT BAR ──────────────────────────────────────── */}
            <div className="mb-4 relative flex items-center max-w-sm">
                <IconSearch size={16} style={{ position: "absolute", left: 12, color: "#9B9BA8" }} />
                <input
                    type="text"
                    placeholder="Search by client name, terminal, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: "100%", height: 36, padding: "0 12px 0 36px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#fff", color: "#1C1C24", outline: "none" }}
                />
            </div>

            {/* ─── MAIN REGISTRY CONTAINER ────────────────────────────────────────── */}
            <div className="rounded-xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E4E3E0" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #E4E3E0", fontSize: 14, fontWeight: 500, color: "#1C1C24" }}>
                    Active Client Accounts ({loading ? "..." : filteredCustomers.length})
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse" style={{ fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#F7F6F3", borderBottom: "1px solid #E4E3E0", color: "#6B6B7A" }}>
                                <th className="p-3.5 font-medium">Customer Profile</th>
                                <th className="p-3.5 font-medium">Phone Terminal</th>
                                <th className="p-3.5 font-medium">Geographic Location</th>
                                <th className="p-3.5 font-medium text-right">Ledger Balance</th>
                                <th className="p-3.5 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-[#6B6B7A]">
                                        Querying local database instance for client indices...
                                    </td>
                                </tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-[#6B6B7A]">
                                        No active configurations registered matching current criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="border-b last:border-b-0" style={{ borderColor: "#E4E3E0" }}>
                                        {/* Avatar and Username */}
                                        <td className="p-3.5 flex items-center gap-3">
                                            <div
                                                className="flex items-center justify-center rounded-full text-white font-medium shrink-0 font-mono"
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    background: "#4A4A5A",
                                                    color: "#fff",
                                                    fontSize: 12
                                                }}
                                            >
                                                {customer.name ? customer.name.substring(0, 2).toUpperCase() : "??"}
                                            </div>
                                            <span className="font-medium" style={{ color: "#1C1C24" }}>{customer.name}</span>
                                        </td>

                                        {/* Phone */}
                                        <td className="p-3.5" style={{ color: "#6B6B7A" }}>
                                            <div className="flex items-center gap-1">
                                                <IconDeviceMobile size={14} style={{ color: "#9B9BA8" }} />
                                                {customer.phone_number || "—"}
                                            </div>
                                        </td>

                                        {/* Address Area */}
                                        <td className="p-3.5" style={{ color: "#6B6B7A" }}>
                                            <div className="flex items-center gap-1">
                                                <IconMapPin size={14} style={{ color: "#9B9BA8" }} />
                                                {customer.address || "—"}
                                            </div>
                                        </td>

                                        {/* Debt Allocation Column */}
                                        <td className="p-3.5 text-right font-mono font-semibold">
                                            <span 
                                                className="rounded inline-flex items-center gap-1"
                                                style={{
                                                    fontSize: 12,
                                                    padding: "2px 6px",
                                                    background: customer.total_debt > 0 ? "#FCEBEB" : "#EAF3DE",
                                                    color: customer.total_debt > 0 ? "#E24B4A" : "#3B6D11",
                                                }}
                                            >
                                                <IconCoins size={12} />
                                                {Number(customer.total_debt).toFixed(2)} DA
                                            </span>
                                        </td>

                                        {/* Action Triggers */}
                                        <td className="p-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => openEditModal(customer)}
                                                    className="p-1.5 rounded-lg border bg-transparent cursor-pointer transition-colors"
                                                    style={{ borderColor: "#E4E3E0", color: "#6B6B7A" }}
                                                    title="Modify client file"
                                                >
                                                    <IconPencil size={15} stroke={1.75} />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(customer)}
                                                    className="p-1.5 rounded-lg border bg-transparent cursor-pointer transition-colors"
                                                    style={{ borderColor: "#E4E3E0", color: "#E24B4A" }}
                                                    title="Purge profile registry"
                                                >
                                                    <IconTrash size={15} stroke={1.75} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── MODAL: ADD / EDIT CUSTOMER ────────────────────────────────────── */}
            {isFormModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(26, 26, 34, 0.45)", backdropFilter: "blur(2px)" }}>
                    <div className="w-full max-w-md rounded-xl border" style={{ background: "#fff", borderColor: "#E4E3E0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#E4E3E0" }}>
                            <span style={{ fontSize: 15, fontWeight: 500, color: "#1C1C24" }}>
                                {editingCustomer ? `Modify Client Parameters (${editingCustomer.name})` : "Register New Client Profile"}
                            </span>
                            <button onClick={() => setIsFormModalOpen(false)} className="border-0 bg-transparent text-[#9B9BA8] cursor-pointer">
                                <IconX size={18} />
                            </button>
                        </div>

                        {/* Modal Body Form */}
                        <form onSubmit={handleFormSubmit} style={{ padding: 20 }} className="flex flex-col gap-4">
                            {/* Input Field: Name */}
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Full Client Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Youcef Benelkadi"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: "100%", height: 36, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }}
                                />
                            </div>

                            {/* Input Field: Phone */}
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Phone Contact</label>
                                <input
                                    type="text"
                                    placeholder="e.g., 0661000000 (Optional)"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    style={{ width: "100%", height: 36, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }}
                                />
                            </div>

                            {/* Input Field: Address */}
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Geographic Address</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Cite 5 Juillet, Constantine (Optional)"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    style={{ width: "100%", height: 36, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }}
                                />
                            </div>

                            {/* Starting Debt Field — Only applicable on explicit creation layout */}
                            {!editingCustomer && (
                                <div className="flex flex-col gap-1.5">
                                    <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Initial Open Credit Debt (DA)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={formData.initial_debt}
                                        onChange={(e) => setFormData({ ...formData, initial_debt: e.target.value })}
                                        style={{ width: "100%", height: 36, padding: "0 12px", fontSize: 13, fontWeight: "600", borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#E24B4A", outline: "none" }}
                                    />
                                    <p style={{ fontSize: 11, color: "#9B9BA8", marginTop: -2 }}>Sets baseline starting liabilities for open credit tabs.</p>
                                </div>
                            )}

                            {/* Form Actions Footer */}
                            <div className="flex justify-end gap-2 mt-2 pt-4 border-t" style={{ borderColor: "#E4E3E0" }}>
                                <button
                                    type="button"
                                    onClick={() => setIsFormModalOpen(false)}
                                    className="h-9 px-4 rounded-lg border bg-transparent cursor-pointer text-[#6B6B7A]"
                                    style={{ fontSize: 13, borderColor: "#E4E3E0" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-9 px-4 rounded-lg text-white border-0 cursor-pointer font-medium"
                                    style={{ fontSize: 13, background: "#E8A04B" }}
                                >
                                    Commit Record Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: DELETION CRITICAL WARNING ────────────────────────────────── */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(26, 26, 34, 0.45)", backdropFilter: "blur(2px)" }}>
                    <div className="w-full max-w-sm rounded-xl border" style={{ background: "#fff", borderColor: "#E4E3E0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}>
                        <div style={{ padding: 20 }} className="flex flex-col items-center text-center gap-3">
                            <div className="flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: "#FCEBEB", color: "#E24B4A" }}>
                                <IconAlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 500, color: "#1C1C24" }}>Purge Client Profile?</h3>
                                <p style={{ fontSize: 12, color: "#6B6B7A", marginTop: 4, lineHeight: 1.4 }}>
                                    Are you sure you want to completely clear <strong style={{ color: "#1C1C24" }}>{deletingCustomer?.name}</strong>? This operation erases matching account balance metadata completely.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="w-full flex gap-2 mt-2">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 h-9 rounded-lg border bg-transparent cursor-pointer text-[#6B6B7A]"
                                    style={{ fontSize: 13, borderColor: "#E4E3E0" }}
                                >
                                    Keep File
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    onMouseEnter={() => setConfirmDeleteHover(true)}
                                    onMouseLeave={() => setConfirmDeleteHover(false)}
                                    className="flex-1 h-9 rounded-lg text-white border-0 cursor-pointer font-medium"
                                    style={{ fontSize: 13, background: confirmDeleteHover ? "#C33F3E" : "#E24B4A", transition: "background 0.15s" }}
                                >
                                    Delete Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
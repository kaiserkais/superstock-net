import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    IconUserPlus,
    IconPencil,
    IconTrash,
    IconX,
    IconShield,
    IconDeviceMobile,
    IconAlertTriangle,
    IconKey
} from "@tabler/icons-react";

export default function Staff() {
    // ─── STATE MANAGEMENT ────────────────────────────────────────────────────────
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal Control States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Form / Action Target Targets
    const [editingStaff, setEditingStaff] = useState(null); // null = Add Mode, object = Edit Mode
    const [deletingStaff, setDeletingStaff] = useState(null);

    // Controlled Form Fields (Aligned exactly with Axum structs)
    const [formData, setFormData] = useState({ username: "", password: "", phone_number: "", role: "cashier" });

    // Dynamic Button Hover Flags
    const [addBtnHover, setAddBtnHover] = useState(false);
    const [confirmDeleteHover, setConfirmDeleteHover] = useState(false);

    // ─── DATABASE SYNC (LIFECYCLE) ───────────────────────────────────────────────
    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/api/staff");

            // 💡 ADD THIS LINE TO DEBUG IN YOUR BROWSER DEVTOOLS:
            console.log("Axum Staff Response Raw Payload:", response.data);

            // Fallback safety net parsing
            const actualArray = Array.isArray(response.data)
                ? response.data
                : (response.data.staff || response.data.users || response.data.data || []);

            setStaffList(actualArray);
        } catch (error) {
            console.error("Database connection failed while fetching staff registry:", error);
            setStaffList([]);
        } finally {
            setLoading(false);
        }
    };

    // ─── HANDLERS ────────────────────────────────────────────────────────────────
    const openAddModal = () => {
        setEditingStaff(null);
        setFormData({ username: "", password: "", phone_number: "", role: "cashier" });
        setIsFormModalOpen(true);
    };

    const openEditModal = (staff) => {
        setEditingStaff(staff);
        // Password left empty by default during edits (indicates 'no change' to the backend)
        setFormData({
            username: staff.username,
            password: "",
            phone_number: staff.phone_number || "",
            role: staff.role
        });
        setIsFormModalOpen(true);
    };

    const openDeleteModal = (staff) => {
        setDeletingStaff(staff);
        setIsDeleteModalOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            // Clean up optional phone numbers for SQLite
            const cleanPayload = {
                username: formData.username,
                phone_number: formData.phone_number.trim() !== "" ? formData.phone_number : null,
                role: formData.role,
            };

            if (editingStaff) {
                // UPDATE Route: PUT /api/staff/{id}
                // Only ship password to Rust if operator is overriding it
                if (formData.password.trim() !== "") {
                    cleanPayload.password = formData.password;
                } else {
                    cleanPayload.password = null;
                }

                await axios.put(`/api/staff/${editingStaff.id}`, cleanPayload);

                // Axum returns status string, update frontend array manually
                setStaffList(prev => prev.map(item =>
                    item.id === editingStaff.id ? { ...item, ...cleanPayload } : item
                ));
            } else {
                // CREATE Route: POST /api/staff
                const finalCreatePayload = {
                    ...cleanPayload,
                    password: formData.password // Required on create
                };

                const response = await axios.post("/api/staff", finalCreatePayload);

                // Axum returns json payload containing { id: "u_..." }
                const newStaffNode = {
                    id: response.data.id,
                    username: cleanPayload.username,
                    phone_number: cleanPayload.phone_number,
                    role: cleanPayload.role
                };

                setStaffList(prev => [...prev, newStaffNode]);
            }
            setIsFormModalOpen(false);
        } catch (error) {
            console.error("Database write synchronization dropped:", error);
            alert(error.response?.data || "Operation failed. Check terminal credentials.");
        }
    };

    const handleDeleteConfirm = async () => {
        try {
            // DESTROY Route: DELETE /api/staff/{id}
            await axios.delete(`/api/staff/${deletingStaff.id}`);
            setStaffList(prev => prev.filter(item => item.id !== deletingStaff.id));
            setIsDeleteModalOpen(false);
            setDeletingStaff(null);
        } catch (error) {
            console.error("Failed to execute database cascade deletion:", error);
            alert(error.response?.data || "Root administrator protection rule violated.");
        }
    };

    return (
        <>
            {/* ─── PAGE HEADER ────────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 500, color: "#1C1C24", lineHeight: 1.2 }}>
                        Staff Registry
                    </h1>
                    <p style={{ fontSize: 13, color: "#6B6B7A", marginTop: 3 }}>
                        Manage local node credentials, administrative authorizations, and cashier system privileges.
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
                    Add Staff Member
                </button>
            </div>

            {/* ─── MAIN REGISTRY CONTAINER ────────────────────────────────────────── */}
            <div className="rounded-xl border overflow-hidden" style={{ background: "#fff", borderColor: "#E4E3E0" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #E4E3E0", fontSize: 14, fontWeight: 500, color: "#1C1C24" }}>
                    Active System Operators ({loading ? "..." : staffList.length})
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse" style={{ fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: "#F7F6F3", borderBottom: "1px solid #E4E3E0", color: "#6B6B7A" }}>
                                <th className="p-3.5 font-medium">System Operator</th>
                                <th className="p-3.5 font-medium">Phone Network</th>
                                <th className="p-3.5 font-medium">System Role</th>
                                <th className="p-3.5 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-[#6B6B7A]">
                                        Querying local SQLite instance for active profiles...
                                    </td>
                                </tr>
                            ) : staffList.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-[#6B6B7A]">
                                        No active configurations registered. Click 'Add Staff Member' to populate.
                                    </td>
                                </tr>
                            ) : (
                                staffList.map((user) => (
                                    <tr key={user.id} className="border-b last:border-b-0" style={{ borderColor: "#E4E3E0" }}>
                                        {/* Avatar and Username directly parsed */}
                                        <td className="p-3.5 flex items-center gap-3">
                                            <div
                                                className="flex items-center justify-center rounded-full text-white font-medium shrink-0 font-mono"
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    background: user.role === "admin" ? "#2D2230" : "#E8A04B",
                                                    color: user.role === "admin" ? "#E8A04B" : "#fff",
                                                    fontSize: 12
                                                }}
                                            >
                                                {user.username ? user.username.substring(0, 2).toUpperCase() : "??"}
                                            </div>
                                            <span className="font-medium" style={{ color: "#1C1C24" }}>{user.username}</span>
                                        </td>

                                        {/* Phone */}
                                        <td className="p-3.5" style={{ color: "#6B6B7A" }}>
                                            <div className="flex items-center gap-1">
                                                <IconDeviceMobile size={14} style={{ color: "#9B9BA8" }} />
                                                {user.phone_number || "—"}
                                            </div>
                                        </td>

                                        {/* Role Pill */}
                                        <td className="p-3.5">
                                            <span
                                                className="rounded font-medium inline-flex items-center gap-1"
                                                style={{
                                                    fontSize: 11,
                                                    padding: "2px 8px",
                                                    background: user.role === "admin" ? "#FAEEDA" : "#EAF3DE",
                                                    color: user.role === "admin" ? "#633806" : "#3B6D11",
                                                }}
                                            >
                                                <IconShield size={12} stroke={2} />
                                                {user.role === "admin" ? "Administrator" : "Cashier"}
                                            </span>
                                        </td>

                                        {/* Action Triggers */}
                                        <td className="p-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-1.5 rounded-lg border bg-transparent cursor-pointer transition-colors"
                                                    style={{ borderColor: "#E4E3E0", color: "#6B6B7A" }}
                                                    title="Modify permissions"
                                                >
                                                    <IconPencil size={15} stroke={1.75} />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(user)}
                                                    className="p-1.5 rounded-lg border bg-transparent cursor-pointer transition-colors"
                                                    style={{ borderColor: "#E4E3E0", color: "#E24B4A" }}
                                                    title="Revoke access"
                                                    disabled={user.id === "u1"} // Visual lockout for core root admin
                                                    {...(user.id === "u1" && { style: { opacity: 0.3, cursor: "not-allowed", color: "#9B9BA8" } })}
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

            {/* ─── MODAL: ADD / EDIT STAFF ────────────────────────────────────────── */}
            {isFormModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(26, 26, 34, 0.45)", backdropFilter: "blur(2px)" }}>
                    <div className="w-full max-w-md rounded-xl border" style={{ background: "#fff", borderColor: "#E4E3E0", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#E4E3E0" }}>
                            <span style={{ fontSize: 15, fontWeight: 500, color: "#1C1C24" }}>
                                {editingStaff ? `Modify Node Parameters (${editingStaff.username})` : "Provision New Operator"}
                            </span>
                            <button onClick={() => setIsFormModalOpen(false)} className="border-0 bg-transparent text-[#9B9BA8] cursor-pointer">
                                <IconX size={18} />
                            </button>
                        </div>

                        {/* Modal Body Form */}
                        <form onSubmit={handleFormSubmit} style={{ padding: 20 }} className="flex flex-col gap-4">
                            {/* Input Field: Username */}
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>System Username</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., kais_shoes"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    style={{ width: "100%", height: 36, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }}
                                />
                            </div>

                            {/* Input Field: Password Hash Trigger */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center">
                                    <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Access Password</label>
                                    {editingStaff && <span style={{ fontSize: 11, color: "#E8A04B" }}>Leave blank to keep current</span>}
                                </div>
                                <div className="relative flex items-center">
                                    <input
                                        type="password"
                                        required={!editingStaff} // Only mandatory on direct creation
                                        placeholder={editingStaff ? "••••••••" : "Enter structural password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        style={{ width: "100%", height: 36, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }}
                                    />
                                </div>
                            </div>

                            {/* Input Field: Phone Number */}
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Phone Contact</label>
                                <input
                                    type="text"
                                    placeholder="e.g., 0555000000 (Optional)"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    style={{ width: "100%", height: 36, padding: "0 12px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }}
                                />
                            </div>

                            {/* Input Field: System Role */}
                            <div className="flex flex-col gap-1.5">
                                <label style={{ fontSize: 12, fontWeight: 500, color: "#6B6B7A" }}>Privilege Group Allocation</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    style={{ width: "100%", height: 36, padding: "0 10px", fontSize: 13, borderRadius: 8, border: "1px solid #E4E3E0", background: "#F7F6F3", color: "#1C1C24", outline: "none" }}
                                >
                                    <option value="cashier">Cashier (POS Checkout Operations Only)</option>
                                    <option value="admin">Administrator (Full Master Node Access)</option>
                                </select>
                            </div>

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
                                <h3 style={{ fontSize: 15, fontWeight: 500, color: "#1C1C24" }}>Revoke Access Node?</h3>
                                <p style={{ fontSize: 12, color: "#6B6B7A", marginTop: 4, lineHeight: 1.4 }}>
                                    Are you sure you want to completely remove <strong style={{ color: "#1C1C24" }}>{deletingStaff?.username}</strong>? This will instantly close active network terminal sales operations under this license.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="w-full flex gap-2 mt-2">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 h-9 rounded-lg border bg-transparent cursor-pointer text-[#6B6B7A]"
                                    style={{ fontSize: 13, borderColor: "#E4E3E0" }}
                                >
                                    Keep Operator
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    onMouseEnter={() => setConfirmDeleteHover(true)}
                                    onMouseLeave={() => setConfirmDeleteHover(false)}
                                    className="flex-1 h-9 rounded-lg text-white border-0 cursor-pointer font-medium"
                                    style={{ fontSize: 13, background: confirmDeleteHover ? "#C33F3E" : "#E24B4A", transition: "background 0.15s" }}
                                >
                                    Disconnect Node
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
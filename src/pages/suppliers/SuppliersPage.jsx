import React, { useState, useEffect } from 'react';

export default function SuppliersPage() {
  // ─── STATE MANAGEMENT ──────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal controls
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null); // For edit or delete actions

  // Form Fields State
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    address: '',
    initial_debt: '0'
  });

  // ─── API INTERACTION HANDLERS ──────────────────────────────────────────────
  
  // Fetch all suppliers
  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/suppliers');
      if (!res.ok) throw new Error('Failed to fetch suppliers list');
      const data = await res.json();
      setSuppliers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Open modal for adding a fresh supplier
  const handleOpenAddModal = () => {
    setSelectedSupplier(null);
    setFormData({ name: '', phone_number: '', address: '', initial_debt: '0' });
    setIsFormModalOpen(true);
  };

  // Open modal for editing an existing profile
  const handleOpenEditModal = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone_number: supplier.phone_number || '',
      address: supplier.address || '',
      initial_debt: '0' // Not mutated during structural profile edits
    });
    setIsFormModalOpen(true);
  };

  // Submit Logic (Handles both POST and PUT)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    const url = selectedSupplier ? `/api/suppliers/${selectedSupplier.id}` : '/api/suppliers';
    const method = selectedSupplier ? 'PUT' : 'POST';
    
    // Construct valid payload matching Rust types
    const payload = selectedSupplier 
      ? { name: formData.name, phone_number: formData.phone_number, address: formData.address }
      : { 
          name: formData.name, 
          phone_number: formData.phone_number || null, 
          address: formData.address || null, 
          initial_debt: parseFloat(formData.initial_debt) || 0.0 
        };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save supplier data');
      
      setIsFormModalOpen(false);
      fetchSuppliers(); // Refresh table view
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete Action Trigger
  const handleOpenDeleteModal = (supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete target supplier');
      
      setIsDeleteModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      alert(err.message);
    }
  };

  // Calculate Total Global Debt Owed
  const totalGlobalDebt = suppliers.reduce((sum, s) => sum + (s.total_debt || 0), 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      
      {/* ─── HEADER & SUMMARY SECTION ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Suppliers Directory</h1>
          <p className="text-sm text-gray-500">Manage business partners, vendor contacts, and global outstanding balance ledgers.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Add Supplier
        </button>
      </div>

      {/* ─── QUICK METRICS CARD ───────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm max-w-sm mb-6">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Owed Debt</span>
        <div className="text-2xl font-bold text-red-600 mt-1">{totalGlobalDebt.toLocaleString()} DA</div>
      </div>

      {/* ─── DATA TABLE VIEW ──────────────────────────────────────────────────── */}
      {error && <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}
      
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading directory channels...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="px-6 py-4">Supplier Name</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Address Base</th>
                  <th className="px-6 py-4 text-right">Outstanding Debt</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-400">No vendors or suppliers found in the local profile log.</td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50/70 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">{supplier.name}</td>
                      <td className="px-6 py-4 text-gray-500">{supplier.phone_number || '—'}</td>
                      <td className="px-6 py-4 text-gray-500">{supplier.address || '—'}</td>
                      <td className={`px-6 py-4 text-right font-semibold ${supplier.total_debt > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {supplier.total_debt.toLocaleString()} DA
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          
                          {/* NEXT TASK: View Details & Ledger Button */}
                          <button 
                            title="View Details & Ledger" 
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                            onClick={() => alert(`Redirecting soon to ledger page for ID: ${supplier.id}`)}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
                          </button>

                          {/* Edit Button */}
                          <button 
                            onClick={() => handleOpenEditModal(supplier)}
                            title="Edit Supplier Profile" 
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                          </button>

                          {/* Delete Button */}
                          <button 
                            onClick={() => handleOpenDeleteModal(supplier)}
                            title="Remove Supplier" 
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
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
      )}

      {/* ─── DYNAMIC FORM MODAL (ADD & EDIT) ─────────────────────────────────── */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-gray-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">
                {selectedSupplier ? 'Edit Supplier Profile' : 'Add New Vendor Partner'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Supplier Name *</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  placeholder="e.g. Sourcing El-Eulma"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  placeholder="e.g. 0555001122"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Business Address Base</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  placeholder="e.g. Setif, Algeria"
                />
              </div>

              {/* Only show initial credit input if creating a brand new supplier */}
              {!selectedSupplier && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Initial Outstanding Debt (DA)</label>
                  <input
                    type="number" min="0" step="any"
                    value={formData.initial_debt}
                    onChange={(e) => setFormData({...formData, initial_debt: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button" onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── REMOVAL CONFIRMATION MODAL ──────────────────────────────────────── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 border border-gray-100 transform transition-all animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Supplier Connection?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to completely drop <span className="font-semibold text-gray-800">"{selectedSupplier?.name}"</span>? This action cannot be reversed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                Keep Partner
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
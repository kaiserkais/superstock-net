import { create } from 'zustand';

export const useSettingsStore = create((set, get) => ({
  settings: {
    store_name: 'SuperStock',
    welcome_message: '',
    thank_you_message: '',
    receipt_printer_name: '',
    receipt_paper_size: 'Mm80',
    invoice_printer_name: '',
    invoice_paper_size: 'A4',
    barcode_printer_name: '',
    barcode_paper_dimension: '40mm x 20mm',
    print_receipt_on_sale: true,
    tax_percentage: 0,
    balance_prefix: '21',
    automatic_backup: true,
  },
  isLoading: false,
  error: null,

  // Pull records from Axum API target backend
  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Could not pull systemic registry options.');
      const data = await res.json();
      set({ settings: data, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },

  // Save changes to backend and sync global memory state
  saveSettings: async (updatedFields) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Backend dropped configuration validation.');
      }

      set({ settings: updatedFields, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return { success: false, error: err.message };
    }
  },
}));
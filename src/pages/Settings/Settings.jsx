import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
// 🌟 Import hardware discovery module from the Tauri guest binding plugin
import { list_thermal_printers } from 'tauri-plugin-thermal-printer';

export default function Settings() {
  const { settings, fetchSettings, saveSettings, isLoading, error } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('store');
  const [formData, setFormData] = useState({ ...settings });
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

  // 🌟 Dynamic hardware state containers
  const [systemPrinters, setSystemPrinters] = useState([]);
  const [isScanningPrinters, setIsScanningPrinters] = useState(false);

  // Sync component form memory with Zustand global state on mount or change
  useEffect(() => {
    fetchSettings();
    detectSystemPrinters();
  }, [fetchSettings]);

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);

  // 🌟 Probes system hardware registry via native Tauri runtime bridging
  const detectSystemPrinters = async () => {
    setIsScanningPrinters(true);
    try {
      // Fetch printers list array [{ name, interface_type, identifier, status }]
      const printers = await list_thermal_printers();
      setSystemPrinters(printers || []);
    } catch (err) {
      console.warn('⚠️ Hardware scanning unavailable: Not running inside a compiled Tauri native environment.', err);
      // Fallback stub mock entries during development server local tests
      setSystemPrinters([
        { name: 'XP-80 (Fallback Mock Printer)' },
        { name: 'Xprinter-350B (Fallback Mock Printer)' },
        { name: 'HP-LaserJet (Fallback Mock Printer)' }
      ]);
    } finally {
      setIsScanningPrinters(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNumericChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus({ type: '', message: '' });
    
    const result = await saveSettings(formData);
    if (result.success) {
      setSaveStatus({ type: 'success', message: 'System configurations synced perfectly!' });
    } else {
      setSaveStatus({ type: 'error', message: result.error || 'Failed to save changes.' });
    }
  };

  const tabs = [
    { id: 'store', label: 'Store Info' },
    { id: 'printing', label: 'Printing Hardware' },
    { id: 'financial', label: 'Financials & Scales' },
    { id: 'backup', label: 'Backups' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">System Configurations</h1>
          <p className="text-sm text-gray-500">Configure regional printing properties, layout tokens, and backups.</p>
        </div>
        {/* 🌟 Add manual re-scan action trigger button */}
        {activeTab === 'printing' && (
          <button
            type="button"
            onClick={detectSystemPrinters}
            disabled={isScanningPrinters}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md shadow-sm transition-colors disabled:opacity-50"
          >
            {isScanningPrinters ? 'Scanning...' : '🔄 Refresh Spooler List'}
          </button>
        )}
      </div>

      {/* Dynamic Tab Navigation Row */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-2.5 px-4 font-medium text-sm transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Operational Status Logs */}
      {saveStatus.message && (
        <div className={`p-4 mb-4 rounded-md text-sm font-medium ${
          saveStatus.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {saveStatus.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* ─── TAB 1: STORE INFO ──────────────────────────────────────── */}
        {activeTab === 'store' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Store Name *</label>
              <input
                type="text"
                name="store_name"
                value={formData.store_name || ''}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Welcome Header Message</label>
              <input
                type="text"
                name="welcome_message"
                value={formData.welcome_message || ''}
                onChange={handleChange}
                placeholder="Printed below the logo lines"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Receipt Footer / Thank You Message</label>
              <textarea
                name="thank_you_message"
                value={formData.thank_you_message || ''}
                onChange={handleChange}
                rows={3}
                placeholder="Thank you for shopping with us!"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        )}

        {/* ─── TAB 2: PRINTING SETTINGS (DYNAMIZED) ───────────────────── */}
        {activeTab === 'printing' && (
          <div className="space-y-6">
            {/* Receipt Profile */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2 font-semibold text-sm text-gray-800">POS Thermal Receipts</div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">System Printer Selection</label>
                <select
                  name="receipt_printer_name"
                  value={formData.receipt_printer_name || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md text-sm"
                >
                  <option value="">-- Disconnected / Not Assigned --</option>
                  {systemPrinters.map((p, idx) => (
                    <option key={idx} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Paper Dimensions</label>
                <select
                  name="receipt_paper_size"
                  value={formData.receipt_paper_size}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md text-sm"
                >
                  <option value="Mm58">58mm Variant Roll</option>
                  <option value="Mm80">80mm Standard Roll</option>
                </select>
              </div>
            </div>

            {/* Corporate Invoice Layout */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2 font-semibold text-sm text-gray-800">Commercial Invoiced Accounting Documents</div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">System Printer Selection</label>
                <select
                  name="invoice_printer_name"
                  value={formData.invoice_printer_name || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md text-sm"
                >
                  <option value="">-- Disconnected / Not Assigned --</option>
                  {systemPrinters.map((p, idx) => (
                    <option key={idx} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Form Dimensions</label>
                <select
                  name="invoice_paper_size"
                  value={formData.invoice_paper_size}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md text-sm"
                >
                  <option value="A4">A4 Standard Sheet</option>
                  <option value="A5">A5 Medium Notebook Sheet</option>
                </select>
              </div>
            </div>

            {/* Barcode Sticker Setup */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2 font-semibold text-sm text-gray-800">Barcode Tag Dimensions</div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">System Printer Selection</label>
                <select
                  name="barcode_printer_name"
                  value={formData.barcode_printer_name || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md text-sm"
                >
                  <option value="">-- Disconnected / Not Assigned --</option>
                  {systemPrinters.map((p, idx) => (
                    <option key={idx} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Label Constraints</label>
                <select
                  name="barcode_paper_dimension"
                  value={formData.barcode_paper_dimension}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md text-sm"
                >
                  <option value="40mm x 20mm">40mm × 20mm Standard Label</option>
                  <option value="45mm x 35mm">45mm × 35mm Large Label</option>
                </select>
              </div>
            </div>

            {/* Automation Rules */}
            <div className="flex items-start p-2">
              <div className="flex items-center h-5">
                <input
                  id="print_receipt_on_sale"
                  name="print_receipt_on_sale"
                  type="checkbox"
                  checked={formData.print_receipt_on_sale}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="print_receipt_on_sale" className="font-semibold text-gray-700">Auto-execute receipt printing on session checkout</label>
                <p className="text-gray-500 text-xs">When enabled, completing a sale automatically triggers the thermal spooler pipeline.</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: FINANCIALS & SCALES ────────────────────────────── */}
        {activeTab === 'financial' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Standard Tax Multiplier (%)</label>
              <input
                type="number"
                step="0.01"
                name="tax_percentage"
                value={formData.tax_percentage}
                onChange={handleNumericChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-400 mt-1">Global internal taxation value processed during total tally calculations.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Electronic Weight Scale EAN Prefix</label>
              <input
                type="text"
                name="balance_prefix"
                maxLength={3}
                value={formData.balance_prefix || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm tracking-widest"
                placeholder="21"
              />
              <p className="text-xs text-gray-400 mt-1">
                The leading code digits (typically <strong>21</strong> or <strong>22</strong>) used to identify barcodes printed directly by electronic fresh meat/veg computing scales.
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB 4: AUTOMATIC BACKUPS ──────────────────────────────── */}
        {activeTab === 'backup' && (
          <div className="space-y-4">
            <div className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center h-5">
                <input
                  id="automatic_backup"
                  name="automatic_backup"
                  type="checkbox"
                  checked={formData.automatic_backup}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="automatic_backup" className="font-semibold text-blue-900">Enable Automated SQLite Snapshot Engine</label>
                <p className="text-blue-700 text-xs mt-0.5">
                  When active, SuperStock securely writes encrypted copies of the database ledger directly into your AppData storage paths upon application closure hooks.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Submission Actions Footer Bar */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Saving Changes...' : 'Save Configuration Parameters'}
          </button>
        </div>

      </form>
    </div>
  );
}
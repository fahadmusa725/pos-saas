import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  Settings as SettingsIcon,
  Save,
  Building2,
  MapPin,
  Phone,
  FileText,
  MessageSquare,
  DollarSign,
  Bell,
  Clock,
  QrCode,
  Loader2,
} from 'lucide-react';

function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State matching screenshot inputs
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    taxRate: 0,
    currency: 'Rs.',
    receiptFooterMessage: '',
    showBarcodeOnReceipt: true,
    enableSoundAlerts: true,
    urgentOrderMinutes: 15,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data.success) {
        setFormData({
          name: res.data.data.name || '',
          address: res.data.data.address || '',
          phone: res.data.data.phone || '',
          taxRate: res.data.data.taxRate ?? 0,
          currency: res.data.data.currency || 'Rs.',
          receiptFooterMessage: res.data.data.receiptFooterMessage || '',
          showBarcodeOnReceipt: res.data.data.showBarcodeOnReceipt ?? true,
          enableSoundAlerts: res.data.data.enableSoundAlerts ?? true,
          urgentOrderMinutes: res.data.data.urgentOrderMinutes ?? 15,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings', formData);
      if (res.data.success) {
        toast.success(res.data.message || 'System settings saved successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm font-medium">Loading system preferences...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="w-7 h-7 text-amber-500" />
            System Settings
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Configure your restaurant's global preferences
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-extrabold rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {/* ── 1. GENERAL CARD ── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500">
            GENERAL
          </h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Restaurant Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="text-base"></span> Restaurant Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Quetta Cafe"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="text-base"></span> Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="e.g. Main Boulevard, Gulberg III, Lahore, Pakistan"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="text-base"></span> Phone Number
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="e.g. +92 42 111 222 333"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition font-mono"
            />
          </div>
        </div>
      </div>

      {/* ── 2. BILLING CARD ── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500">
            BILLING
          </h2>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Tax Rate (%) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="text-base"></span> Tax Rate (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.taxRate}
              onChange={(e) => handleChange('taxRate', e.target.value)}
              placeholder="16"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition font-mono"
            />
          </div>

          {/* Currency Symbol */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="text-base"></span> Currency Symbol
            </label>
            <input
              type="text"
              value={formData.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              placeholder="Rs."
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition font-mono"
            />
          </div>
        </div>
      </div>

      {/* ── 3. RECEIPTS CARD ── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500">
            RECEIPTS
          </h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Receipt Footer Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="text-base"></span> Receipt Footer Message
            </label>
            <input
              type="text"
              value={formData.receiptFooterMessage}
              onChange={(e) => handleChange('receiptFooterMessage', e.target.value)}
              placeholder="Thank you for dining with us! Visit again soon."
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
            />
          </div>

          {/* Show Barcode Toggle */}
          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-500" /> Show Barcode on Receipt
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Display decorative thermal barcode at bottom of receipts
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showBarcodeOnReceipt}
                onChange={(e) => handleChange('showBarcodeOnReceipt', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-neutral-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-neutral-600 peer-checked:bg-amber-500" />
            </label>
          </div>
        </div>
      </div>

      {/* ── 4. KITCHEN & KDS PREFERENCES CARD ── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-950/80 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500">
            KITCHEN & KDS PREFERENCES
          </h2>
        </div>

        <div className="p-6 space-y-5">
          {/* Sound Alerts Toggle */}
          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" /> Enable KDS Sound Alerts
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Play sound notification when a new order arrives in kitchen
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enableSoundAlerts}
                onChange={(e) => handleChange('enableSoundAlerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-neutral-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-neutral-600 peer-checked:bg-amber-500" />
            </label>
          </div>

          {/* Urgent Minutes Threshold */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" /> Urgent Order Threshold (Minutes)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={formData.urgentOrderMinutes}
              onChange={(e) => handleChange('urgentOrderMinutes', e.target.value)}
              placeholder="15"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition font-mono"
            />
          </div>
        </div>
      </div>

      {/* Save Button (Bottom Bar) */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-extrabold rounded-xl text-sm transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving Changes...' : '💾 Save Changes'}</span>
        </button>
      </div>
    </form>
  );
}

export default Settings;

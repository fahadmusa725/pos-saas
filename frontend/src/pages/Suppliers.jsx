import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { Truck, Plus, Phone, Mail, MapPin, Package, Edit2, Trash2 } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  itemsSupplied: '',
};

function Suppliers() {
  const [suppliers, setSuppliers]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);

  const [deleteId, setDeleteId]       = useState(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data.data);
    } catch (err) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (supplier) => {
    setEditingId(supplier._id);
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      itemsSupplied: supplier.itemsSupplied || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, form);
        toast.success('Supplier updated!');
      } else {
        await api.post('/suppliers', form);
        toast.success('Supplier created!');
      }
      closeModal();
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/suppliers/${deleteId}`);
      setDeleteId(null);
      fetchSuppliers();
      toast.success('Supplier deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete supplier');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Suppliers Management
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage ingredient suppliers, contact details, and items supplied
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Supplier</span>
        </button>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 italic">No suppliers recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  <th className="px-6 py-3.5">Supplier Name</th>
                  <th className="px-6 py-3.5">Contact Person</th>
                  <th className="px-6 py-3.5">Phone / Email</th>
                  <th className="px-6 py-3.5">Items Supplied</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {suppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-500" />
                      {s.name}
                    </td>
                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300 font-medium">
                      {s.contactPerson || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500 dark:text-neutral-400">
                      <div className="font-mono text-neutral-700 dark:text-neutral-200">{s.phone || '—'}</div>
                      <div>{s.email || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500 dark:text-neutral-400">
                      {s.itemsSupplied || '—'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition"
                        title="Edit Supplier"
                      >
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => setDeleteId(s._id)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              {editingId ? 'Edit Supplier' : 'Add New Supplier'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Items Supplied</label>
                <input
                  type="text"
                  placeholder="e.g. Meat, Vegetables, Dairy"
                  value={form.itemsSupplied}
                  onChange={(e) => setForm({ ...form, itemsSupplied: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-xl transition"
                >
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteId)}
        title="Delete Supplier?"
        message="This supplier will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

export default Suppliers;

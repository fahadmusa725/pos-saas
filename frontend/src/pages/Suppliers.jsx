import { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { Truck, Plus, Edit2, Trash2, X, Check, Store, Wallet, Search } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  itemsSupplied: [],
};

function Suppliers() {
  const [suppliers, setSuppliers]           = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [submitting, setSubmitting]         = useState(false);
  const [showModal, setShowModal]           = useState(false);
  const [editingId, setEditingId]           = useState(null);
  const [form, setForm]                     = useState(EMPTY_FORM);
  const [deleteId, setDeleteId]             = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [supRes, invRes, poRes] = await Promise.allSettled([
        api.get('/suppliers'),
        api.get('/inventory'),
        api.get('/purchase-orders'),
      ]);
      if (supRes.status === 'fulfilled') setSuppliers(supRes.value.data.data);
      if (invRes.status === 'fulfilled') setInventoryItems(invRes.value.data.data);
      if (poRes.status === 'fulfilled')  setPurchaseOrders(poRes.value.data.data);
    } catch (err) {
      toast.error('Failed to load supplier data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (supplier) => {
    setEditingId(supplier._id);
    const itemIds = (supplier.itemsSupplied || []).map((i) => (typeof i === 'object' ? i._id : i));
    setForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      itemsSupplied: itemIds,
    });
    setShowModal(true);
  };

  const toggleItemSupplied = (itemId) => {
    setForm((prev) => {
      const exists = prev.itemsSupplied.includes(itemId);
      return {
        ...prev,
        itemsSupplied: exists
          ? prev.itemsSupplied.filter((id) => id !== itemId)
          : [...prev.itemsSupplied, itemId],
      };
    });
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
      fetchData();
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
      fetchData();
      toast.success('Supplier deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete supplier');
      setDeleteId(null);
    }
  };

  const getSupplierOutstanding = useCallback((supId) => {
    return purchaseOrders
      .filter((po) => (po.supplierId?._id === supId || po.supplierId === supId) && po.status !== 'cancelled')
      .reduce((sum, po) => sum + Math.max(0, (po.totalCost || 0) - (po.amountPaid || 0)), 0);
  }, [purchaseOrders]);

  const totalPayableBalance = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + getSupplierOutstanding(s._id), 0);
  }, [suppliers, getSupplierOutstanding]);

  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter((s) => 
      s.name?.toLowerCase().includes(q) ||
      s.contactPerson?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    );
  }, [suppliers, searchQuery]);

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Active Suppliers */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Store className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-neutral-900 dark:text-white leading-none">
              {suppliers.length}
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mt-1">
              ACTIVE SUPPLIERS
            </p>
          </div>
        </div>

        {/* Total Payable Balance */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white leading-none">
              PKR {totalPayableBalance.toLocaleString()}
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mt-1">
              TOTAL PAYABLE BALANCE
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by vendor name, contact person, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
        />
      </div>


      {/* Suppliers Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 italic">No matching suppliers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  <th className="px-6 py-3.5">Supplier Name</th>
                  <th className="px-6 py-3.5">Contact</th>
                  <th className="px-6 py-3.5">Items Supplied</th>
                  <th className="px-6 py-3.5">Outstanding Balance</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {filteredSuppliers.map((s) => {

                  const outstanding = getSupplierOutstanding(s._id);
                  return (
                    <tr key={s._id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                          <Truck className="w-4 h-4 text-amber-500" />
                          {s.name}
                        </div>
                        {s.address && <p className="text-xs text-neutral-400 mt-0.5">{s.address}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-neutral-800 dark:text-neutral-200">{s.contactPerson || '—'}</div>
                        <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400">{s.phone || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        {s.itemsSupplied && s.itemsSupplied.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.itemsSupplied.map((item, idx) => {
                              const name = typeof item === 'object' ? item.name : inventoryItems.find((i) => i._id === item)?.name;
                              return (
                                <span key={idx} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
                                  {name || 'Item'}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">No catalog linked</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {outstanding > 0 ? (
                          <span className="text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
                            Owes Rs. {outstanding.toFixed(0)}
                          </span>
                        ) : (
                          <span className="text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold">
                            Settled
                          </span>
                        )}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                {editingId ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <button onClick={closeModal} className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                <X className="w-5 h-5" />
              </button>
            </div>

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

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Items Supplied Multi-Select Checkboxes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  Items Supplied (Catalog)
                </label>
                {inventoryItems.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No inventory items found. Add inventory items first.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                    {inventoryItems.map((inv) => {
                      const isSelected = form.itemsSupplied.includes(inv._id);
                      return (
                        <button
                          type="button"
                          key={inv._id}
                          onClick={() => toggleItemSupplied(inv._id)}
                          className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition text-left ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold'
                              : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border ${
                            isSelected ? 'bg-amber-500 border-amber-500 text-neutral-950' : 'border-neutral-400'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="truncate">{inv.name} ({inv.unit || 'units'})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {form.itemsSupplied.length > 0 && (
                  <p className="text-[11px] text-amber-500 mt-1.5">{form.itemsSupplied.length} item(s) selected</p>
                )}
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

import { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { Package, Plus, AlertTriangle, Edit2, Trash2, Search, DollarSign, ChevronDown, Tag } from 'lucide-react';

const UNITS = ['kg', 'litre', 'piece', 'dozen', 'box', 'pack', 'other'];

// Color palette for category badges (cycles through)
const BADGE_COLORS = [
  { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
];

const EMPTY_FORM = {
  name: '',
  category: '',
  unit: 'kg',
  currentStock: 0,
  reorderLevel: 0,
  costPerUnit: 0,
};

function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data || []);
    } catch (err) {
      // silently fail
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get('/inventory');
      setItems(res.data.data);
    } catch (err) {
      toast.error('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [fetchItems, fetchCategories]);

  // Stats
  const totalItems = items.length;
  const lowStockCount = items.filter(i => i.currentStock <= i.reorderLevel && i.currentStock > 0).length;
  const outOfStockCount = items.filter(i => i.currentStock <= 0).length;
  const totalAssetValue = items.reduce((acc, i) => acc + i.currentStock * i.costPerUnit, 0);

  // Filtered items
  const filteredItems = useMemo(() => items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }), [items, searchQuery, selectedCategory]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setShowModal(true); };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name,
      category: item.category || 'Other',
      unit: item.unit,
      currentStock: item.currentStock,
      reorderLevel: item.reorderLevel,
      costPerUnit: item.costPerUnit,
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(EMPTY_FORM); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/inventory/${editingId}`, form);
        toast.success('Inventory item updated!');
      } else {
        await api.post('/inventory', form);
        toast.success('Inventory item created!');
      }
      closeModal();
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save inventory item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/inventory/${deleteId}`);
      setDeleteId(null);
      fetchItems();
      toast.success('Inventory item deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete item');
      setDeleteId(null);
    }
  };

  const clearFilters = () => { setSearchQuery(''); setSelectedCategory('All'); };
  const hasFilters = searchQuery || selectedCategory !== 'All';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Inventory &amp; Stock
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Track raw ingredients, unit costs, and reorder alerts
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Stock Item</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-neutral-900 dark:text-white leading-none">{totalItems}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mt-1">Total Stock Items</p>
          </div>
        </div>

        <div className={`bg-white dark:bg-neutral-900 border rounded-2xl p-5 flex items-center gap-4 shadow-xs ${(lowStockCount + outOfStockCount) > 0 ? 'border-rose-500/50' : 'border-neutral-200 dark:border-neutral-800'
          }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${(lowStockCount + outOfStockCount) > 0 ? 'bg-rose-500/10' : 'bg-neutral-100 dark:bg-neutral-800'
            }`}>
            <AlertTriangle className={`w-6 h-6 ${(lowStockCount + outOfStockCount) > 0 ? 'text-rose-500' : 'text-neutral-400'}`} />
          </div>
          <div>
            <p className={`text-3xl font-extrabold leading-none ${(lowStockCount + outOfStockCount) > 0 ? 'text-rose-500' : 'text-neutral-900 dark:text-white'}`}>
              {lowStockCount + outOfStockCount}
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mt-1">Low Stock Alerts</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-neutral-900 dark:text-white leading-none">
              PKR {totalAssetValue.toLocaleString('en-PK', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
            </p>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mt-1">Total Inventory Asset Value</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:ring-2 focus:ring-amber-500 focus:outline-none transition"
          />
        </div>

        <div className="relative">
          <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="appearance-none pl-10 pr-9 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none transition cursor-pointer min-w-[170px]"
          >
            <option value="All">All Categories</option>
            {categories.map(c => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>

        {hasFilters && (
          <>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-amber-500 hover:text-amber-600 underline underline-offset-2 transition"
            >
              Clear filters
            </button>
          </>
        )}
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-700 mb-3" />
            <p className="text-neutral-400 italic text-sm">
              {items.length === 0 ? 'No inventory items added yet.' : 'No items match your search or filter.'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-3 text-xs font-semibold text-amber-500 hover:text-amber-600 underline underline-offset-2 transition">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  <th className="px-6 py-3.5">Item Name</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Current Stock</th>
                  <th className="px-6 py-3.5">Reorder Level</th>
                  <th className="px-6 py-3.5">Cost per Unit</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {filteredItems.map((item) => {
                  const isOut = item.currentStock <= 0;
                  const isLow = !isOut && item.currentStock <= item.reorderLevel;
                  return (
                    <tr
                      key={item._id}
                      className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors ${isOut ? 'bg-rose-500/5' : isLow ? 'bg-amber-500/5' : ''
                        }`}
                    >
                      <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          {item.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const cat = item.category || '—';
                          const idx = categories.findIndex(c => c.name === cat);
                          const color = BADGE_COLORS[(idx >= 0 ? idx : 0) % BADGE_COLORS.length];
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color.bg} ${color.text} ${color.border}`}>
                              <Tag className="w-3 h-3" />
                              {cat}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">
                        {item.currentStock} <span className="text-xs font-normal text-neutral-400">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                        {item.reorderLevel} {item.unit}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-neutral-900 dark:text-white">
                        Rs. {item.costPerUnit}
                      </td>
                      <td className="px-6 py-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            OUT OF STOCK
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-1">
                        <button onClick={() => openEdit(item)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition" title="Edit Item">
                          <Edit2 className="w-4 h-4 inline" />
                        </button>
                        <button onClick={() => setDeleteId(item._id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition" title="Delete Item">
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
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              {editingId ? 'Edit Stock Item' : 'Add New Stock Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Item Name *</label>
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">— Select Category —</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Unit *</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Current Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={form.currentStock}
                    onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={form.reorderLevel}
                    onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Cost / Unit (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={form.costPerUnit}
                  onChange={(e) => setForm({ ...form, costPerUnit: Number(e.target.value) })}
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
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteId)}
        title="Delete Inventory Item?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

export default Inventory;

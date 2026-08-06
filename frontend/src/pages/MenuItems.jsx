import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { UtensilsCrossed, Plus, Trash2, Leaf, Pencil, X, Check } from 'lucide-react';

const EMPTY_FORM = {
  categoryId: '',
  name: '',
  description: '',
  price: '',
  isVeg: false,
};

function MenuItems() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);

  // ConfirmModal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const fetchData = async () => {
    try {
      const [itemsRes, catRes] = await Promise.allSettled([
        api.get('/menu-items'),
        api.get('/categories'),
      ]);
      if (itemsRes.status === 'fulfilled') setMenuItems(itemsRes.value.data.data);
      if (catRes.status === 'fulfilled') setCategories(catRes.value.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      categoryId: item.categoryId?._id || item.categoryId || '',
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      isVeg: item.isVeg,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, price: Number(form.price) };
      if (editingId) {
        await api.put(`/menu-items/${editingId}`, payload);
        toast.success('Menu item updated!');
      } else {
        await api.post('/menu-items', payload);
        toast.success('Menu item created!');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${editingId ? 'update' : 'create'} menu item`);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (id) => {
    setDeleteTargetId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/menu-items/${deleteTargetId}`);
      setConfirmOpen(false);
      setDeleteTargetId(null);
      fetchData();
      toast.success('Menu item deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete menu item');
      setConfirmOpen(false);
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Menu Items
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Manage items, pricing, and diet attributes in your menu
        </p>
      </div>

      {/* Create / Edit Form */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${editingId ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
              {editingId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              {editingId ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h2>
          </div>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 flex items-center gap-1 transition-colors"
            >
              <X className="w-4 h-4" /> Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Category *
              </label>
              <select
                name="categoryId"
                value={form.categoryId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Item Name *
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                placeholder="e.g. Zinger Burger"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Price (PKR) *
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Description
              </label>
              <input
                type="text"
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                placeholder="Optional brief ingredients/details"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
              <input
                type="checkbox"
                name="isVeg"
                checked={form.isVeg}
                onChange={handleChange}
                className="w-4 h-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="flex items-center gap-1">
                <Leaf className="w-4 h-4 text-emerald-500" />
                Vegetarian Item
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2.5 font-bold rounded-xl transition-all disabled:opacity-50 text-sm shadow-xs flex items-center gap-2 active:scale-95 ${
                editingId
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-neutral-950'
              }`}
            >
              {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {submitting ? (editingId ? 'Saving...' : 'Adding...') : (editingId ? 'Save Changes' : 'Add Menu Item')}
            </button>
          </div>
        </form>
      </div>

      {/* Menu Items Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : menuItems.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No menu items found. Add items to start billing.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  <th className="px-6 py-3.5">Item Name</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Price</th>
                  <th className="px-6 py-3.5">Diet</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-sm">
                {menuItems.map((item) => (
                  <tr
                    key={item._id}
                    className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors ${editingId === item._id ? 'bg-blue-500/5 dark:bg-blue-500/5' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-neutral-900 dark:text-white">{item.name}</p>
                        {editingId === item._id && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            Editing
                          </span>
                        )}
                      </div>
                      {item.description && <p className="text-xs text-neutral-400 mt-0.5">{item.description}</p>}
                    </td>
                    <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400 font-medium">
                      {item.categoryId?.name || '—'}
                    </td>
                    <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">
                      Rs. {item.price}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          item.isVeg
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {item.isVeg ? 'Veg' : 'Non-Veg'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                          title="Edit Item"
                        >
                          <Pencil className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => confirmDelete(item._id)}
                          className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
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

      <ConfirmModal
        isOpen={confirmOpen}
        title="Delete Menu Item?"
        message="This will permanently delete this menu item from your catalog."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTargetId(null);
        }}
      />
    </div>
  );
}

export default MenuItems;
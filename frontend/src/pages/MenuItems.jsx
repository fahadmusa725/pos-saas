import { useEffect, useState, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { UtensilsCrossed, Plus, Trash2, Leaf, Pencil, X, Check, Package, Layers, Link, Upload, ChevronDown, ChevronUp } from 'lucide-react';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

// Compress & resize image via Canvas API (max 800×800px, quality 0.75)
const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 800;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height = Math.round((height * MAX_DIM) / width); width = MAX_DIM; }
          else { width = Math.round((width * MAX_DIM) / height); height = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const FOOD_EMOJIS = [
  '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🍗', '🥩', '🍿',
  '🍲', '🍛', '🍚', '🍖', '🥘', '🥟', '🍣', '🍝', '🍜', '🧆',
  '🥤', '☕', '🧋', '🧃', '🍹', '🍺', '🍷', '🍸', '🍾', '🍵',
  '🍦', '🍰', '🍩', '🧁', '🍨', '🎂', '🍪', '🥐', '🧇', '🥞',
];

const EMPTY_FORM = {
  categoryId: '',
  name: '',
  description: '',
  price: '',
  dealPrice: '',
  isSpecialDeal: false,
  emoji: '🍔',
  isVeg: false,
  image: '',
  imageTab: 'url',
  variants: [],
  recipe: [],
};

function MenuItems() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showRecipe, setShowRecipe] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const fileInputRef = useRef(null);

  const fetchData = async () => {
    try {
      const [itemsRes, catRes, invRes] = await Promise.allSettled([
        api.get('/menu-items'),
        api.get('/categories'),
        api.get('/inventory'),
      ]);
      if (itemsRes.status === 'fulfilled') setMenuItems(itemsRes.value.data.data);
      if (catRes.status === 'fulfilled') setCategories(catRes.value.data.data);
      if (invRes.status === 'fulfilled') setInventoryItems(invRes.value.data.data);
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

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Image too large — please choose a file under 2 MB');
      e.target.value = '';
      return;
    }
    try {
      const compressed = await compressImage(file);
      setForm((prev) => ({ ...prev, image: compressed }));
      toast.success('Image compressed & loaded!');
    } catch { toast.error('Failed to process image'); }
  };

  const handleAddVariant = () => {
    setForm((prev) => ({ ...prev, variants: [...prev.variants, { name: '', price: '', portionMultiplier: 1 }] }));
    setShowVariants(true);
  };
  const handleRemoveVariant = (idx) => setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }));
  const handleVariantChange = (idx, field, value) => {
    setForm((prev) => { const u = [...prev.variants]; u[idx] = { ...u[idx], [field]: value }; return { ...prev, variants: u }; });
  };

  const handleAddIngredient = () => {
    setForm((prev) => ({ ...prev, recipe: [...prev.recipe, { inventoryItemId: '', quantityUsed: '', unit: 'units' }] }));
    setShowRecipe(true);
  };
  const handleRemoveIngredient = (index) => setForm((prev) => ({ ...prev, recipe: prev.recipe.filter((_, i) => i !== index) }));
  const handleIngredientChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.recipe];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'inventoryItemId') {
        const inv = inventoryItems.find((i) => i._id === value);
        if (inv?.unit) updated[index].unit = inv.unit;
      }
      return { ...prev, recipe: updated };
    });
  };

  const openAddModal = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowRecipe(false);
    setShowVariants(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    const hasVariants = (item.variants || []).length > 0;
    const hasRecipe = (item.recipe || []).length > 0;
    setShowVariants(hasVariants);
    setShowRecipe(hasRecipe);
    setForm({
      categoryId: item.categoryId?._id || item.categoryId || '',
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      dealPrice: item.dealPrice ? String(item.dealPrice) : '',
      isSpecialDeal: Boolean(item.isSpecialDeal),
      emoji: item.emoji || '🍔',
      isVeg: Boolean(item.isVeg),
      image: item.image || '',
      imageTab: item.image?.startsWith('data:') ? 'upload' : 'url',
      variants: (item.variants || []).map((v) => ({ name: v.name, price: String(v.price), portionMultiplier: v.portionMultiplier ?? 1 })),
      recipe: (item.recipe || []).map((r) => ({ inventoryItemId: r.inventoryItemId?._id || r.inventoryItemId || '', quantityUsed: String(r.quantityUsed || ''), unit: r.unit || 'units' })),
    });
    setIsModalOpen(true);
  };

  const toggleAvailability = async (item) => {
    const newStatus = !item.isAvailable;
    // Optimistic UI update
    setMenuItems((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, isAvailable: newStatus } : i))
    );
    try {
      await api.put(`/menu-items/${item._id}`, { isAvailable: newStatus });
      toast.success(`${item.name} is now ${newStatus ? 'Available' : 'Unavailable'}`);
    } catch {
      toast.error('Failed to update availability');
      fetchData();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanRecipe = form.recipe
        .filter((r) => r.inventoryItemId && Number(r.quantityUsed) > 0)
        .map((r) => ({ inventoryItemId: r.inventoryItemId, quantityUsed: Number(r.quantityUsed), unit: r.unit || 'units' }));
      const cleanVariants = form.variants
        .filter((v) => v.name.trim() && Number(v.price) >= 0)
        .map((v) => ({ name: v.name.trim(), price: Number(v.price), portionMultiplier: Number(v.portionMultiplier) || 1 }));
      const payload = {
        categoryId: form.categoryId,
        name: form.name,
        description: form.description,
        price: Number(form.price),
        dealPrice: form.dealPrice ? Number(form.dealPrice) : null,
        isSpecialDeal: Boolean(form.isSpecialDeal),
        emoji: form.emoji || '🍔',
        isVeg: form.isVeg,
        image: form.image || '',
        variants: cleanVariants,
        recipe: cleanRecipe,
      };
      if (editingId) {
        await api.put(`/menu-items/${editingId}`, payload);
        toast.success('Menu item updated!');
      } else {
        await api.post('/menu-items', payload);
        toast.success('Menu item created!');
      }
      closeModal();
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

  // Filter items by category & search term
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        item.categoryId?._id === selectedCategory ||
        item.categoryId === selectedCategory;

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchTerm]);

  const inputCls = 'w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition';

  return (
    <div className="space-y-6">

      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
            Menu Items Management
          </h1>
          <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage products, deals, pricing, and live availability
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-extrabold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Menu Item</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs">
        {/* Category Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                selectedCategory === cat._id
                  ? 'bg-amber-500 text-neutral-950 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Live Search Input */}
        <div className="relative w-full md:w-64 flex-shrink-0">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <UtensilsCrossed className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No menu items found for the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  <th className="px-6 py-3.5">Item Name</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Price (PKR)</th>
                  <th className="px-6 py-3.5">Available</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-sm">
                {filteredItems.map((item) => {
                  return (
                    <tr key={item._id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 flex-shrink-0" onError={(e) => { e.target.style.display='none'; }} />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-xl flex-shrink-0">
                              {item.emoji || '🍔'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-neutral-900 dark:text-white text-sm">{item.name}</p>
                              {item.isSpecialDeal && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                  🔥 Special Deal
                                </span>
                              )}
                              {item.isVeg && (
                                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                  Veg
                                </span>
                              )}
                            </div>
                            {item.description && <p className="text-xs text-neutral-400 mt-0.5">{item.description}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                          {item.categoryId?.name || '—'}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">
                        {item.isSpecialDeal && item.dealPrice > 0 ? (
                          <div className="flex flex-col">
                            <span className="font-extrabold text-amber-500 text-sm">Rs. {item.dealPrice}</span>
                            <span className="line-through text-neutral-400 text-xs font-semibold">Rs. {item.price}</span>
                          </div>
                        ) : (
                          <span>Rs. {item.price}</span>
                        )}
                      </td>

                      {/* Availability Toggle Switch */}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => toggleAvailability(item)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            item.isAvailable ? 'bg-emerald-500' : 'bg-neutral-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              item.isAvailable ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => startEdit(item)}
                            className="px-3 py-1.5 text-xs font-bold text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => confirmDelete(item._id)}
                            className="px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Menu Item Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-6">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${editingId ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                  {editingId ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <h2 className="text-lg font-bold text-white">
                  {editingId ? 'Edit Menu Item' : 'Add New Menu Item'}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <form id="menu-item-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Item Name *</label>
                    <input type="text" name="name" value={form.name} onChange={handleChange} required className={inputCls} placeholder="e.g. Zinger Burger / Family Deal" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Category *</label>
                    <select name="categoryId" value={form.categoryId} onChange={handleChange} required className={inputCls}>
                      <option value="">Select category</option>
                      {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Regular / Base Price (PKR) *</label>
                    <input type="number" name="price" value={form.price} onChange={handleChange} required min="0" step="0.01" className={inputCls} placeholder="e.g. 500" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Special Deal / Offer Price (PKR)</label>
                    <input type="number" name="dealPrice" value={form.dealPrice} onChange={handleChange} min="0" step="0.01" className={inputCls} placeholder="e.g. 400 (Shows strikethrough when active)" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Description</label>
                  <input type="text" name="description" value={form.description} onChange={handleChange} className={inputCls} placeholder="Short description of dish or combo items..." />
                </div>

                {/* Special Deal Checkbox */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <label className="flex items-center gap-2 text-sm font-bold text-amber-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="isSpecialDeal"
                      checked={form.isSpecialDeal}
                      onChange={handleChange}
                      className="w-4 h-4 rounded border-amber-500 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="flex items-center gap-1.5">🔥 Tag as Special Deal / Combo Offer</span>
                  </label>
                  <p className="text-[11px] text-neutral-400 mt-1 pl-6">
                    When enabled, item sells at the Deal Price (if entered) and displays a flaming Special Deal badge on POS screen.
                  </p>
                </div>

                {/* Food Emoji Picker Grid (If No Image) */}
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Quick Food Emoji Picker (If No Image Uploaded)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
                    {FOOD_EMOJIS.map((emo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, emoji: emo }))}
                        className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition border ${
                          form.emoji === emo
                            ? 'bg-amber-500/20 border-amber-500 scale-110 shadow-xs'
                            : 'hover:bg-neutral-800 border-transparent'
                        }`}
                      >
                        {emo}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-neutral-400">Selected Icon: <span className="text-base">{form.emoji}</span></p>
                </div>

                {/* Image Input */}
                <div className="pt-3 border-t border-neutral-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Item Image (Optional)</h3>
                  </div>
                  <div className="flex gap-2">
                    {[{ id: 'url', icon: Link, label: 'Paste Image URL' }, { id: 'upload', icon: Upload, label: 'Upload from Device' }].map(({ id, icon: Icon, label }) => (
                      <button key={id} type="button"
                        onClick={() => setForm((p) => ({ ...p, imageTab: id, image: '' }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          form.imageTab === id ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                        }`}>
                        <Icon className="w-3.5 h-3.5" /> {label}
                      </button>
                    ))}
                  </div>
                  {form.imageTab === 'url' ? (
                    <input type="url" name="image" value={form.image} onChange={handleChange} placeholder="https://example.com/food-image.jpg" className={inputCls} />
                  ) : (
                    <div className="space-y-1">
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageFileChange}
                        className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500/10 file:text-amber-500 hover:file:bg-amber-500/20 cursor-pointer" />
                      <p className="text-[11px] text-neutral-400">Max 2 MB — will be auto-compressed &amp; resized to 800px</p>
                    </div>
                  )}
                  {form.image && (
                    <div className="flex items-center gap-3 p-2 bg-neutral-950 border border-neutral-800 rounded-xl">
                      <img src={form.image} alt="preview" className="w-16 h-16 object-cover rounded-lg border border-neutral-700 flex-shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-neutral-300">Preview</p>
                        <p className="text-[11px] text-neutral-400 truncate">{form.image.startsWith('data:') ? 'Uploaded (compressed base64)' : form.image}</p>
                      </div>
                      <button type="button" onClick={() => { setForm((p) => ({ ...p, image: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-neutral-400 hover:text-rose-500 transition flex-shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Portion / Size Variants */}
                <div className="pt-3 border-t border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setShowVariants((v) => !v)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
                      <Layers className="w-4 h-4 text-amber-500" />
                      Portion / Size Variants
                      {showVariants ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {form.variants.length > 0 && <span className="text-amber-500">({form.variants.length})</span>}
                    </button>
                    <button type="button" onClick={handleAddVariant} className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 transition">
                      <Plus className="w-3.5 h-3.5" /> Add Variant
                    </button>
                  </div>
                  {showVariants && (form.variants.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic bg-neutral-950 p-3 rounded-xl border border-dashed border-neutral-800">No variants — click "Add Variant" to add sizes like Half / Full / Large.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        <span className="col-span-4">Variant Name</span><span className="col-span-3">Price (PKR)</span><span className="col-span-4">Portion Multiplier</span><span className="col-span-1"></span>
                      </div>
                      {form.variants.map((v, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-neutral-950 p-2 rounded-xl border border-neutral-800">
                          <input value={v.name} onChange={(e) => handleVariantChange(idx, 'name', e.target.value)} placeholder="e.g. Half" className="col-span-4 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:ring-2 focus:ring-amber-500" />
                          <input type="number" min="0" step="0.01" value={v.price} onChange={(e) => handleVariantChange(idx, 'price', e.target.value)} placeholder="0" className="col-span-3 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:ring-2 focus:ring-amber-500" />
                          <input type="number" min="0.01" max="10" step="0.01" value={v.portionMultiplier} onChange={(e) => handleVariantChange(idx, 'portionMultiplier', e.target.value)} placeholder="1" className="col-span-4 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:ring-2 focus:ring-amber-500" />
                          <button type="button" onClick={() => handleRemoveVariant(idx)} className="col-span-1 p-1.5 text-neutral-400 hover:text-rose-500 transition rounded-lg flex justify-center"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Recipe Builder */}
                <div className="pt-3 border-t border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setShowRecipe((r) => !r)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
                      <Package className="w-4 h-4 text-amber-500" />
                      Recipe / Raw Ingredients (Optional)
                      {showRecipe ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {form.recipe.length > 0 && <span className="text-amber-500">({form.recipe.length})</span>}
                    </button>
                    <button type="button" onClick={handleAddIngredient} className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 transition">
                      <Plus className="w-3.5 h-3.5" /> Add Ingredient
                    </button>
                  </div>
                  {showRecipe && (form.recipe.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic bg-neutral-950 p-3 rounded-xl border border-dashed border-neutral-800">No recipe configured. Stock will not be auto-deducted for this item.</p>
                  ) : (
                    <div className="space-y-2">
                      {form.recipe.map((ing, idx) => (
                        <div key={idx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                          <select value={ing.inventoryItemId} onChange={(e) => handleIngredientChange(idx, 'inventoryItemId', e.target.value)} className="flex-1 min-w-[160px] px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:ring-2 focus:ring-amber-500">
                            <option value="">Select ingredient</option>
                            {inventoryItems.map((inv) => <option key={inv._id} value={inv._id}>{inv.name} ({inv.unit || 'units'})</option>)}
                          </select>
                          <input type="number" step="any" min="0" value={ing.quantityUsed} onChange={(e) => handleIngredientChange(idx, 'quantityUsed', e.target.value)} placeholder="Qty used" className="w-24 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:ring-2 focus:ring-amber-500" />
                          <input type="text" value={ing.unit} onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)} placeholder="Unit" className="w-20 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:ring-2 focus:ring-amber-500" />
                          <button type="button" onClick={() => handleRemoveIngredient(idx)} className="p-1.5 text-neutral-400 hover:text-rose-500 transition rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 cursor-pointer select-none">
                    <input type="checkbox" name="isVeg" checked={form.isVeg} onChange={handleChange} className="w-4 h-4 rounded border-neutral-700 text-amber-500 focus:ring-amber-500" />
                    <span className="flex items-center gap-1"><Leaf className="w-4 h-4 text-emerald-500" /> Vegetarian Item</span>
                  </label>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-950 flex-shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2 text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="menu-item-form"
                disabled={submitting}
                className={`px-6 py-2 text-xs font-extrabold rounded-xl transition shadow-xs flex items-center gap-2 disabled:opacity-50 ${
                  editingId ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-neutral-950'
                }`}
              >
                {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{submitting ? (editingId ? 'Saving...' : 'Adding...') : (editingId ? 'Save Changes' : 'Add Item')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

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
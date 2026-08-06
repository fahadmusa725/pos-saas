import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { Grid, Plus, Trash2, FolderOpen, Pencil, X, Check } from 'lucide-react';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);

  // ConfirmModal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setName('');
    setDescription('');
    setEditingId(null);
  };

  const startEdit = (cat) => {
    setEditingId(cat._id);
    setName(cat.name);
    setDescription(cat.description || '');
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, { name, description });
        toast.success('Category updated!');
      } else {
        await api.post('/categories', { name, description });
        toast.success('Category created!');
      }
      resetForm();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${editingId ? 'update' : 'create'} category`);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (id) => {
    setDeleteTargetId(id);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    await api.delete(`/categories/${deleteTargetId}`);
    setConfirmOpen(false);
    setDeleteTargetId(null);
    fetchCategories();
    toast.success('Category deleted');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Categories
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Organize menu items into distinct categories
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
              {editingId ? 'Edit Category' : 'Add New Category'}
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

        <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Category Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              placeholder="e.g. Appetizers, Beverages"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              placeholder="Optional description"
            />
          </div>
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
            {submitting ? (editingId ? 'Saving...' : 'Adding...') : (editingId ? 'Save Changes' : 'Add Category')}
          </button>
        </form>
      </div>

      {/* Categories List Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
              <FolderOpen className="w-8 h-8" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No categories found. Add your first category above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  <th className="px-6 py-3.5">Category Name</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-sm">
                {categories.map((cat) => (
                  <tr
                    key={cat._id}
                    className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors ${editingId === cat._id ? 'bg-blue-500/5 dark:bg-blue-500/5' : ''}`}
                  >
                    <td className="px-6 py-4 font-semibold text-neutral-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Grid className="w-4 h-4 text-amber-500 shrink-0" />
                        {cat.name}
                        {editingId === cat._id && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            Editing
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">{cat.description || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => startEdit(cat)}
                          className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                          title="Edit Category"
                        >
                          <Pencil className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => confirmDelete(cat._id)}
                          className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                          title="Delete Category"
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
        title="Delete Category?"
        message="This will permanently delete the category. This action cannot be undone."
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

export default Categories;
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { Receipt, Plus, Calendar, DollarSign, Filter, Edit2, Trash2 } from 'lucide-react';

const CATEGORIES = ['rent', 'utilities', 'salaries', 'maintenance', 'supplies', 'other'];

const CATEGORY_COLORS = {
  rent:        'bg-purple-500/10 text-purple-500 border-purple-500/20',
  utilities:   'bg-blue-500/10 text-blue-500 border-blue-500/20',
  salaries:    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  maintenance: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  supplies:    'bg-amber-500/10 text-amber-500 border-amber-500/20',
  other:       'bg-neutral-500/10 text-neutral-500 border-neutral-500/20',
};

const EMPTY_FORM = {
  category: 'rent',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
};

function Expenses() {
  const [expenses, setExpenses]         = useState([]);
  const [summary, setSummary]           = useState({ totalExpense: 0, byCategory: [] });
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);

  // Date filters
  const now = new Date();
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate]       = useState(firstDayStr);
  const [endDate, setEndDate]           = useState(todayStr);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal & Delete
  const [showModal, setShowModal]       = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [deleteId, setDeleteId]         = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedCategory && selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }

      const [expRes, sumRes] = await Promise.allSettled([
        api.get(`/expenses?${params.toString()}`),
        api.get(`/expenses/summary?${params.toString()}`),
      ]);

      if (expRes.status === 'fulfilled') setExpenses(expRes.value.data.data);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
    } catch (err) {
      toast.error('Failed to load expense data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEdit = (expense) => {
    setEditingId(expense._id);
    setForm({
      category: expense.category,
      amount: expense.amount,
      date: new Date(expense.date).toISOString().split('T')[0],
      description: expense.description || '',
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
        await api.put(`/expenses/${editingId}`, form);
        toast.success('Expense updated!');
      } else {
        await api.post('/expenses', form);
        toast.success('Expense recorded!');
      }
      closeModal();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/expenses/${deleteId}`);
      setDeleteId(null);
      fetchData();
      toast.success('Expense deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Expenses Tracking
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Record operational costs, filter by date range, and view category summaries
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Date & Category Filter & Summary Banner */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="w-4 h-4 text-amber-500" />

            {/* Category Dropdown Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase text-neutral-500">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 capitalize font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase text-neutral-500">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-neutral-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase text-neutral-500">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-neutral-100"
              />
            </div>

            {selectedCategory !== 'All' && (
              <button
                onClick={() => setSelectedCategory('All')}
                className="px-2.5 py-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-bold rounded-lg border border-amber-500/20 transition"
              >
                Reset Category
              </button>
            )}
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 block">Total Expense</span>
            <span className="text-2xl font-extrabold text-amber-500">Rs. {summary.totalExpense || 0}</span>
          </div>
        </div>

        {/* Category Breakdown Badges (Clickable filters) */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 items-center">
          <span className="text-xs text-neutral-400 font-semibold mr-1">Quick Category Filter:</span>
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider transition ${
              selectedCategory === 'All'
                ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((catKey) => {
            const catData = summary.byCategory?.find((c) => c._id === catKey);
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(isSelected ? 'All' : catKey)}
                className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider transition active:scale-95 ${
                  isSelected
                    ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-xs'
                    : CATEGORY_COLORS[catKey] || CATEGORY_COLORS.other
                }`}
              >
                {catKey}{catData ? `: Rs. ${catData.totalAmount || catData.total || 0}` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 italic">No expenses recorded for selected period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wider ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.other}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-neutral-900 dark:text-white">Rs. {exp.amount}</td>
                    <td className="px-6 py-4 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500 dark:text-neutral-400">{exp.description || '—'}</td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => openEdit(exp)}
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition"
                        title="Edit Expense"
                      >
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => setDeleteId(exp._id)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                        title="Delete Expense"
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
              {editingId ? 'Edit Expense' : 'Record New Expense'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none capitalize"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Amount (PKR) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Optional details"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteId)}
        title="Delete Expense?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

export default Expenses;

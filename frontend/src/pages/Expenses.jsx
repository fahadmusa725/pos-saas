import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const CATEGORIES = ['rent', 'utilities', 'salaries', 'maintenance', 'supplies', 'other'];

const CATEGORY_COLORS = {
  rent: 'bg-purple-100 text-purple-800 border-purple-200',
  utilities: 'bg-blue-100 text-blue-800 border-blue-200',
  salaries: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  maintenance: 'bg-orange-100 text-orange-800 border-orange-200',
  supplies: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
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
  const [error, setError]               = useState('');
  const [formError, setFormError]       = useState('');

  // Date filters (default current month)
  const now = new Date();
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate]       = useState(firstDayStr);
  const [endDate, setEndDate]           = useState(todayStr);

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

      const [expRes, sumRes] = await Promise.allSettled([
        api.get(`/expenses?${params.toString()}`),
        api.get(`/expenses/summary?${params.toString()}`),
      ]);

      if (expRes.status === 'fulfilled') setExpenses(expRes.value.data.data);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
    } catch (err) {
      setError('Failed to load expense data');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setFormError('');
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
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
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
      setFormError(err.response?.data?.message || 'Failed to save expense');
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
          <p className="text-xs text-gray-500 mt-1">Track operational costs & summaries</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition"
        >
          + Add Expense
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm mb-4">{error}</div>}

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700 uppercase">Filter Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-sm font-bold text-gray-800">
          Total Range Expense: <span className="text-red-600">Rs. {summary.totalExpense || 0}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {CATEGORIES.map((cat) => {
          const found = summary.byCategory?.find((c) => c._id === cat);
          const total = found ? found.totalAmount : 0;
          return (
            <div key={cat} className="bg-white p-3 rounded-xl shadow border border-gray-100 text-center">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat]}`}>
                {cat}
              </span>
              <p className="text-base font-bold text-gray-900 mt-2">Rs. {total}</p>
            </div>
          );
        })}
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500">Loading expenses...</p>
        ) : expenses.length === 0 ? (
          <p className="p-6 text-gray-400 italic">No expenses found for selected range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 text-gray-700 font-medium">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${CATEGORY_COLORS[item.category]}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{item.description || '—'}</td>
                    <td className="px-5 py-3 font-bold text-red-600">Rs. {item.amount}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteId(item._id)}
                          className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition"
                        >
                          Delete
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 font-bold text-lg px-2">✕</button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-xs mb-4">{formError}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 capitalize"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (Rs.) *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Date *</label>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. July Electricity Bill"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50">
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Add Expense'}
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

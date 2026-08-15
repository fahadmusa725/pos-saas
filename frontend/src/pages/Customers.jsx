import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import CustomerHistoryModal from '../components/CustomerHistoryModal';
import { UserPlus, History, Edit2, Trash2, DollarSign, X, RefreshCw, Search } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  loyaltyPoints: 0,
};

function Customers() {
  const [customers, setCustomers]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  
  const [showModal, setShowModal]       = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);

  // Settlement modal state
  const [settleCustomer, setSettleCustomer] = useState(null);
  const [settleAmount, setSettleAmount]     = useState('');
  const [settling, setSettling]             = useState(false);

  // Order history modal
  const [historyCustomer, setHistoryCustomer] = useState(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null);

  const fetchCustomers = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await api.get('/customers');
      setCustomers(res.data.data);
      if (isManualRefresh) toast.success('Customer list refreshed!');
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (customer) => {
    setEditingId(customer._id);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      loyaltyPoints: customer.loyaltyPoints || 0,
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
        await api.put(`/customers/${editingId}`, form);
        toast.success('Customer updated!');
      } else {
        await api.post('/customers', form);
        toast.success('Customer created!');
      }
      closeModal();
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const openSettleModal = (cust) => {
    setSettleCustomer(cust);
    setSettleAmount((cust.creditBalance || 0).toString());
  };

  const closeSettleModal = () => {
    setSettleCustomer(null);
    setSettleAmount('');
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!settleCustomer) return;
    const amt = Number(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid settlement amount > 0');
      return;
    }

    setSettling(true);
    try {
      const res = await api.post(`/customers/${settleCustomer._id}/settle-credit`, { amount: amt });
      toast.success(res.data.message || 'Credit settled successfully!');
      closeSettleModal();
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to settle credit');
    } finally {
      setSettling(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/customers/${deleteId}`);
      setDeleteId(null);
      if (historyCustomer?._id === deleteId) setHistoryCustomer(null);
      fetchCustomers();
      toast.success('Customer deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete customer');
      setDeleteId(null);
    }
  };

  // Filtered customer list by name, phone, or email
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>👤 Customer Directory & Accounts</span>
          </h1>
          <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage customer profiles, tab/receivable balances, and view order history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAdd}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-2 text-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 italic">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400 text-[11px]">
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Total Orders</th>
                  <th className="px-6 py-4">Total Spent</th>
                  <th className="px-6 py-4">Balance Due (Receivable)</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {filteredCustomers.map((c) => {
                  const credit = c.creditBalance || 0;
                  const initial = c.name ? c.name.charAt(0).toUpperCase() : 'C';
                  return (
                    <tr key={c._id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center font-black text-neutral-950 text-sm shadow-xs flex-shrink-0">
                            {initial}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-white text-sm">{c.name}</div>
                            <div className="text-[11px] text-neutral-400 font-mono">{c.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300 font-mono font-medium">{c.phone}</td>
                      <td className="px-6 py-4 font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                        {c.totalOrders || 0}
                      </td>
                      <td className="px-6 py-4 font-extrabold text-emerald-500 dark:text-emerald-400 text-sm">
                        PKR {(c.totalSpent || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {credit > 0 ? (
                          <span className="px-3 py-1.5 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg text-xs font-black inline-block">
                            PKR {credit.toLocaleString()} Due
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-xs font-bold inline-block">
                            Settled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setHistoryCustomer(c)}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition"
                            title="View Order History"
                          >
                            <History className="w-3.5 h-3.5 text-amber-500" />
                            Orders
                          </button>

                          <button
                            onClick={() => openSettleModal(c)}
                            disabled={!credit}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-950 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition"
                            title="Settle Credit Balance"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Settle
                          </button>

                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 text-neutral-400 hover:text-blue-500 rounded-lg transition"
                            title="Edit Customer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(c._id)}
                            className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg transition"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              {editingId ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Phone *</label>
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
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

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Settlement Modal */}
      {settleCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Settle Credit (Udhar)
                </h2>
                <p className="text-xs text-neutral-500">Customer: {settleCustomer.name} ({settleCustomer.phone})</p>
              </div>
              <button onClick={closeSettleModal} className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between text-amber-500 font-bold">
                <span>Outstanding Credit Balance</span>
                <span>PKR {(settleCustomer.creditBalance || 0).toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
                  Settlement Amount (PKR) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-base font-bold text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={closeSettleModal}
                  className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={settling}
                  className="px-5 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-xl transition disabled:opacity-50"
                >
                  {settling ? 'Settling...' : 'Record Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer History Modal */}
      <CustomerHistoryModal
        customer={historyCustomer}
        onClose={() => setHistoryCustomer(null)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteId)}
        title="Delete Customer?"
        message="This customer will be permanently removed. Past orders linked to this customer will remain intact."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

export default Customers;

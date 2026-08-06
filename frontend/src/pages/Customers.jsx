import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { UserCheck, UserPlus, Phone, Mail, MapPin, Award, History, Edit2, Trash2 } from 'lucide-react';

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
  const [submitting, setSubmitting]     = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);

  // Order history panel
  const [selectedCustomer, setSelectedCustomer]   = useState(null);
  const [customerOrders, setCustomerOrders]         = useState([]);
  const [ordersLoading, setOrdersLoading]           = useState(false);
  const [totalSpend, setTotalSpend]                 = useState(0);

  // Delete confirm
  const [deleteId, setDeleteId]         = useState(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data.data);
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
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

  const handleDelete = async () => {
    try {
      await api.delete(`/customers/${deleteId}`);
      setDeleteId(null);
      if (selectedCustomer?._id === deleteId) {
        setSelectedCustomer(null);
        setCustomerOrders([]);
      }
      fetchCustomers();
      toast.success('Customer deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete customer');
      setDeleteId(null);
    }
  };

  const handleViewOrders = async (customer) => {
    if (selectedCustomer?._id === customer._id) {
      setSelectedCustomer(null);
      setCustomerOrders([]);
      return;
    }
    setSelectedCustomer(customer);
    setOrdersLoading(true);
    try {
      const res = await api.get(`/customers/${customer._id}/orders`);
      setCustomerOrders(res.data.data);
      setTotalSpend(res.data.totalSpend || 0);
    } catch (err) {
      setCustomerOrders([]);
      setTotalSpend(0);
    } finally {
      setOrdersLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Customers Directory
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Track customer profiles, phone lookup, loyalty points, and purchase history
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 italic">No customers recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Email / Address</th>
                  <th className="px-6 py-3.5">Loyalty Points</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-amber-500" />
                      {c.name}
                    </td>
                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-300 font-mono">{c.phone}</td>
                    <td className="px-6 py-4 text-xs text-neutral-500 dark:text-neutral-400">
                      <div>{c.email || '—'}</div>
                      <div className="text-neutral-400">{c.address || ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <Award className="w-3.5 h-3.5" />
                        {c.loyaltyPoints || 0} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => handleViewOrders(c)}
                        className={`p-2 rounded-lg transition text-xs font-semibold ${
                          selectedCustomer?._id === c._id
                            ? 'bg-amber-500 text-neutral-950'
                            : 'text-amber-500 hover:bg-amber-500/10'
                        }`}
                        title="View Order History"
                      >
                        <History className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition"
                        title="Edit Customer"
                      >
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => setDeleteId(c._id)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                        title="Delete Customer"
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

      {/* Customer Order History Panel */}
      {selectedCustomer && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-500" />
                Order History — {selectedCustomer.name}
              </h3>
              <p className="text-xs text-neutral-500">Phone: {selectedCustomer.phone}</p>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase text-neutral-400 font-semibold block">Total Spend</span>
              <span className="text-xl font-extrabold text-amber-500">Rs. {totalSpend}</span>
            </div>
          </div>

          {ordersLoading ? (
            <p className="text-sm text-neutral-500 italic">Loading orders...</p>
          ) : customerOrders.length === 0 ? (
            <p className="text-sm text-neutral-400 italic">No past orders found for this customer.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {customerOrders.map((o) => (
                <div
                  key={o._id}
                  className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-amber-500">#{o.orderNumber}</span>
                    <span className="text-neutral-400 ml-2">{new Date(o.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="capitalize font-medium text-neutral-600 dark:text-neutral-300">{o.orderType}</span>
                    <span className="font-extrabold text-neutral-900 dark:text-white">Rs. {o.total}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {o.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

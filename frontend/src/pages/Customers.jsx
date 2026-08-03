import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

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
  const [error, setError]               = useState('');
  const [formError, setFormError]       = useState('');

  // Modal state
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
      setError('Failed to load customers');
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
    setFormError('');
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
      setFormError(err.response?.data?.message || 'Failed to save customer');
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
      // Toggle off if same customer clicked again
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

  const PAY_STATUS = {
    unpaid:         'bg-red-50 text-red-700 border border-red-200',
    partially_paid: 'bg-orange-50 text-orange-700 border border-orange-200',
    paid:           'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition"
        >
          + Add Customer
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
        {loading ? (
          <p className="p-6 text-gray-500">Loading customers...</p>
        ) : customers.length === 0 ? (
          <p className="p-6 text-gray-400 italic">No customers yet. Add your first customer.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Loyalty Pts</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <>
                    <tr
                      key={c._id}
                      className={`hover:bg-gray-50 transition cursor-pointer ${selectedCustomer?._id === c._id ? 'bg-blue-50' : ''}`}
                      onClick={() => handleViewOrders(c)}
                    >
                      <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                      <td className="px-5 py-3 font-mono text-gray-600">{c.phone}</td>
                      <td className="px-5 py-3 text-gray-500">{c.email || '—'}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-xs font-semibold">
                          {c.loyaltyPoints} pts
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEdit(c)}
                            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(c._id)}
                            className="text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline Order History Panel */}
                    {selectedCustomer?._id === c._id && (
                      <tr key={`${c._id}-orders`}>
                        <td colSpan={5} className="px-5 py-4 bg-blue-50 border-t border-blue-100">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h3 className="text-sm font-bold text-blue-900">
                                Order History — {c.name}
                              </h3>
                              {!ordersLoading && (
                                <p className="text-xs text-blue-700 mt-0.5">
                                  {customerOrders.length} order{customerOrders.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Total Spend: <b>Rs. {totalSpend}</b>
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => { setSelectedCustomer(null); setCustomerOrders([]); }}
                              className="text-xs text-blue-500 hover:text-blue-700"
                            >
                              ✕ Close
                            </button>
                          </div>

                          {ordersLoading ? (
                            <p className="text-xs text-gray-500">Loading orders...</p>
                          ) : customerOrders.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No orders linked to this customer yet.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500 border-b border-blue-200">
                                    <th className="py-1.5 pr-4 text-left font-semibold">Order #</th>
                                    <th className="py-1.5 pr-4 text-left font-semibold">Type</th>
                                    <th className="py-1.5 pr-4 text-left font-semibold">Total</th>
                                    <th className="py-1.5 pr-4 text-left font-semibold">Payment</th>
                                    <th className="py-1.5 text-left font-semibold">Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {customerOrders.map((order) => (
                                    <tr key={order._id} className="border-b border-blue-100 last:border-0">
                                      <td className="py-1.5 pr-4 font-mono font-semibold text-gray-800">{order.orderNumber}</td>
                                      <td className="py-1.5 pr-4 capitalize text-gray-600">{order.orderType}</td>
                                      <td className="py-1.5 pr-4 font-semibold text-gray-800">Rs. {order.total}</td>
                                      <td className="py-1.5 pr-4">
                                        <span className={`px-2 py-0.5 rounded-full font-semibold ${PAY_STATUS[order.paymentStatus] || ''}`}>
                                          {order.paymentStatus?.replace('_', ' ')}
                                        </span>
                                      </td>
                                      <td className="py-1.5 text-gray-500">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 font-bold text-lg px-2">✕</button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-xs mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Ahmed Khan"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone * <span className="text-gray-400 font-normal">(unique per restaurant)</span></label>
                  <input
                    required
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. 03001234567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Loyalty Points <span className="text-gray-400 font-normal">(manual)</span></label>
                  <input
                    type="number"
                    min={0}
                    value={form.loyaltyPoints}
                    onChange={(e) => setForm({ ...form, loyaltyPoints: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. ahmed@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Address <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="e.g. House 5, Block B, Lahore"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50">
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

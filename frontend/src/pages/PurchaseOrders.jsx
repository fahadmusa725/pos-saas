import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

function PurchaseOrders() {
  const [orders, setOrders]             = useState([]);
  const [suppliers, setSuppliers]       = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [receivingId, setReceivingId]   = useState(null); // Track specific PO being received
  const [error, setError]             = useState('');
  const [formError, setFormError]     = useState('');

  // Form toggle & state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [supplierId, setSupplierId]         = useState('');
  const [purchaseDate, setPurchaseDate]     = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes]                   = useState('');
  const [poItems, setPoItems]               = useState([
    { inventoryItemId: '', quantity: 1, costPerUnit: 0 },
  ]);

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, suppliersRes, invRes] = await Promise.allSettled([
        api.get('/purchase-orders'),
        api.get('/suppliers'),
        api.get('/inventory'),
      ]);

      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data.data);
      if (suppliersRes.status === 'fulfilled') setSuppliers(suppliersRes.value.data.data);
      if (invRes.status === 'fulfilled') setInventoryItems(invRes.value.data.data);
    } catch (err) {
      setError('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // PO Items manipulation
  const handleItemChange = (index, field, value) => {
    const updated = [...poItems];
    updated[index][field] = value;

    if (field === 'inventoryItemId') {
      const selectedInv = inventoryItems.find((i) => i._id === value);
      if (selectedInv) {
        updated[index].costPerUnit = selectedInv.costPerUnit || 0;
      }
    }
    setPoItems(updated);
  };

  const addItemRow = () => {
    setPoItems([...poItems, { inventoryItemId: '', quantity: 1, costPerUnit: 0 }]);
  };

  const removeItemRow = (index) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const grandTotal = poItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const cost = Number(item.costPerUnit) || 0;
    return sum + qty * cost;
  }, 0);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setFormError('');

    if (poItems.some((i) => !i.inventoryItemId)) {
      setFormError('Please select an inventory item for all rows.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/purchase-orders', {
        supplierId: supplierId || undefined,
        purchaseDate,
        items: poItems,
        notes,
      });

      setShowCreateForm(false);
      setSupplierId('');
      setNotes('');
      setPoItems([{ inventoryItemId: '', quantity: 1, costPerUnit: 0 }]);
      fetchData();
      toast.success('Purchase order created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create purchase order');
      setFormError(err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  // Immediate disable/loading state on Mark Received to prevent double clicks
  const handleStatusUpdate = async (id, status) => {
    if (receivingId) return; // Guard against multiple triggers
    setReceivingId(id);
    try {
      await api.put(`/purchase-orders/${id}/status`, { status });
      fetchData();
      toast.success(status === 'received' ? 'Purchase order marked as Received! Inventory updated.' : 'Purchase order cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setReceivingId(null);
    }
  };

  const STATUS_BADGES = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    received: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Purchase Orders</h1>
          <p className="text-xs text-gray-500 mt-1">Track purchases & auto-update inventory stock</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition"
        >
          {showCreateForm ? 'Close Form' : '+ Create Purchase Order'}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm mb-4">{error}</div>}

      {/* ── Create Form ── */}
      {showCreateForm && (
        <div className="bg-white rounded-xl shadow p-6 mb-6 border border-blue-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">New Purchase Order</h2>

          {formError && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg mb-4">{formError}</div>}

          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Supplier (Optional)</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Item Rows */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Purchase Items</label>

              {poItems.map((item, index) => {
                const invItem = inventoryItems.find((i) => i._id === item.inventoryItemId);
                return (
                  <div key={index} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                    <select
                      required
                      value={item.inventoryItemId}
                      onChange={(e) => handleItemChange(index, 'inventoryItemId', e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Inventory Item</option>
                      {inventoryItems.map((inv) => (
                        <option key={inv._id} value={inv._id}>
                          {inv.name} ({inv.unit}) — Stock: {inv.currentStock}
                        </option>
                      ))}
                    </select>

                    <div className="w-24">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        placeholder="Cost/Unit"
                        value={item.costPerUnit}
                        onChange={(e) => handleItemChange(index, 'costPerUnit', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="w-28 text-right font-semibold text-xs text-gray-800">
                      Rs. {(Number(item.quantity || 0) * Number(item.costPerUnit || 0)).toFixed(2)}
                    </div>

                    {poItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="text-red-500 hover:text-red-700 px-2 py-1 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-xs text-blue-600 font-semibold hover:underline"
                >
                  + Add Item Row
                </button>
                <div className="text-sm font-bold text-gray-900">
                  Total Cost: <span className="text-blue-600">Rs. {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Invoice #1024, Paid via Bank Transfer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Submit Purchase Order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PO List */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <p className="p-6 text-gray-500">Loading purchase orders...</p>
        ) : orders.length === 0 ? (
          <p className="p-6 text-gray-400 italic">No purchase orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Total Cost</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((po) => (
                  <tr key={po._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {new Date(po.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {po.supplierId?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {po.items.map((i) => `${i.itemName} (${i.quantity})`).join(', ')}
                    </td>
                    <td className="px-5 py-3 font-bold text-gray-900">
                      Rs. {po.totalCost}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_BADGES[po.status]}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {po.status === 'pending' && (
                          <>
                            <button
                              disabled={receivingId === po._id}
                              onClick={() => handleStatusUpdate(po._id, 'received')}
                              className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1"
                            >
                              {receivingId === po._id ? 'Processing...' : '✓ Mark Received'}
                            </button>
                            <button
                              disabled={receivingId === po._id}
                              onClick={() => handleStatusUpdate(po._id, 'cancelled')}
                              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-lg transition disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PurchaseOrders;

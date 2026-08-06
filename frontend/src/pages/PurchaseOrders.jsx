import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { ClipboardList, Plus, CheckCircle, XCircle, Trash2, Package } from 'lucide-react';

function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers]           = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [submitting, setSubmitting]         = useState(false);
  const [receivingId, setReceivingId]       = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [supplierId, setSupplierId]         = useState('');
  const [notes, setNotes]                   = useState('');
  const [poItems, setPoItems]               = useState([
    { inventoryItemId: '', quantity: 1, costPerUnit: 0 },
  ]);

  const fetchData = useCallback(async () => {
    try {
      const [poRes, supRes, invRes] = await Promise.allSettled([
        api.get('/purchase-orders'),
        api.get('/suppliers'),
        api.get('/inventory'),
      ]);
      if (poRes.status === 'fulfilled')  setPurchaseOrders(poRes.value.data.data);
      if (supRes.status === 'fulfilled') setSuppliers(supRes.value.data.data);
      if (invRes.status === 'fulfilled') setInventoryItems(invRes.value.data.data);
    } catch (err) {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddItemRow = () => {
    setPoItems([...poItems, { inventoryItemId: '', quantity: 1, costPerUnit: 0 }]);
  };

  const handleRemoveItemRow = (index) => {
    if (poItems.length === 1) return;
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...poItems];
    updated[index][field] = value;

    if (field === 'inventoryItemId') {
      const selected = inventoryItems.find((item) => item._id === value);
      if (selected && selected.costPerUnit) {
        updated[index].costPerUnit = selected.costPerUnit;
      }
    }
    setPoItems(updated);
  };

  const calculateTotal = () => {
    return poItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.costPerUnit) || 0), 0);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();

    const validItems = poItems.filter((i) => i.inventoryItemId && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one valid inventory item');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/purchase-orders', {
        supplierId: supplierId || undefined,
        notes,
        items: validItems.map((i) => ({
          inventoryItemId: i.inventoryItemId,
          quantity: Number(i.quantity),
          costPerUnit: Number(i.costPerUnit),
        })),
      });

      setShowCreateForm(false);
      setSupplierId('');
      setNotes('');
      setPoItems([{ inventoryItemId: '', quantity: 1, costPerUnit: 0 }]);
      fetchData();
      toast.success('Purchase order created!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    if (receivingId) return;
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
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    received: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    cancelled: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Purchase Orders
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Create supplier orders & auto-increment inventory stock on receiving
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{showCreateForm ? 'Close Form' : 'Create Purchase Order'}</span>
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white">New Purchase Order</h2>

          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Supplier (Optional)</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Urgent delivery"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Dynamic Items Array */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Order Items *</label>
              {poItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-center flex-wrap sm:flex-nowrap p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                  <select
                    value={item.inventoryItemId}
                    onChange={(e) => handleItemChange(index, 'inventoryItemId', e.target.value)}
                    required
                    className="flex-1 min-w-[180px] px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="">Select Item</option>
                    {inventoryItems.map((inv) => (
                      <option key={inv._id} value={inv._id}>
                        {inv.name} ({inv.unit})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-20 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs"
                  />

                  <input
                    type="number"
                    min="0"
                    placeholder="Cost/Unit"
                    value={item.costPerUnit}
                    onChange={(e) => handleItemChange(index, 'costPerUnit', e.target.value)}
                    className="w-28 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(index)}
                    disabled={poItems.length === 1}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Item
              </button>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-base font-extrabold text-amber-500">Total: Rs. {calculateTotal()}</span>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl text-sm transition disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Submit Purchase Order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PO Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 italic">No purchase orders created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  <th className="px-6 py-3.5">PO #</th>
                  <th className="px-6 py-3.5">Supplier</th>
                  <th className="px-6 py-3.5">Items</th>
                  <th className="px-6 py-3.5">Total Cost</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {purchaseOrders.map((po) => (
                  <tr key={po._id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-amber-500">#{po.poNumber}</td>
                    <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">
                      {po.supplierId?.name || 'Direct Order'}
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500 dark:text-neutral-400">
                      {po.items.map((i) => `${i.inventoryItemId?.name || 'Item'} (${i.quantity})`).join(', ')}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-neutral-900 dark:text-white">Rs. {po.totalCost}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wider ${STATUS_BADGES[po.status]}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {po.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(po._id, 'received')}
                            disabled={receivingId === po._id}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {receivingId === po._id ? 'Receiving...' : 'Mark Received'}
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(po._id, 'cancelled')}
                            disabled={receivingId === po._id}
                            className="px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        </>
                      )}
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

import { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import CheckoutModal from '../components/CheckoutModal';
import ReceiptModal from '../components/ReceiptModal';

const STATUS_COLORS = {
  pending:   'bg-yellow-100 text-yellow-800 border border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border border-blue-200',
  preparing: 'bg-orange-100 text-orange-800 border border-orange-200',
  ready:     'bg-purple-100 text-purple-800 border border-purple-200',
  completed: 'bg-green-100 text-green-800 border border-green-200',
  cancelled: 'bg-red-100 text-red-800 border border-red-200',
};

const PAY_STATUS_COLORS = {
  unpaid:          'bg-red-50 text-red-700 border border-red-200',
  partially_paid:  'bg-orange-50 text-orange-700 border border-orange-200',
  paid:            'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

function Orders() {
  const [orders, setOrders]       = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  // New Order form state
  const [orderType, setOrderType] = useState('dine-in');
  const [tableId, setTableId]     = useState('');

  // Customer phone search state
  const [customerPhone, setCustomerPhone]       = useState('');
  const [customerSearch, setCustomerSearch]     = useState([]); // search results
  const [selectedCustomer, setSelectedCustomer] = useState(null); // linked customer
  const [searchLoading, setSearchLoading]       = useState(false);
  // Inline new-customer mini-form
  const [showNewCustomer, setShowNewCustomer]   = useState(false);
  const [newCustName, setNewCustName]           = useState('');
  const [newCustSubmitting, setNewCustSubmitting] = useState(false);
  const searchTimer = useRef(null);
  const [cart, setCart]           = useState([]); // { menuItemId, name, price, quantity }
  const [holdOrder, setHoldOrder] = useState(false);

  // Checkout & Receipt modal state
  const [checkoutOrder, setCheckoutOrder]   = useState(null);
  const [receiptOrder, setReceiptOrder]     = useState(null);
  const [restaurantName, setRestaurantName] = useState('');

  // Active filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [payFilter, setPayFilter]       = useState('all');

  const fetchData = async () => {
    try {
      const [ordersRes, itemsRes, tablesRes] = await Promise.allSettled([
        api.get('/orders'),
        api.get('/menu-items'),
        api.get('/tables'),
      ]);
      if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data.data);
      if (itemsRes.status === 'fulfilled')  setMenuItems(itemsRes.value.data.data);
      if (tablesRes.status === 'fulfilled') setTables(tablesRes.value.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Fetch restaurant info for receipt header
    api.get('/auth/me')
      .then((res) => {
        const user = res.data.data;
        setRestaurantName(user.restaurantName || user.name || 'Restaurant');
      })
      .catch(() => {});
  }, []);

  // ─── Cart Helpers ─────────────────────────────────────────────────────────
  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item._id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQuantity = (menuItemId, delta) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const updateItemDiscount = (menuItemId, discountType, value) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.menuItemId === menuItemId) {
          const numVal = Math.max(0, Number(value) || 0);
          return {
            ...c,
            itemDiscount: {
              discountType,
              value: discountType === 'percentage' ? Math.min(100, numVal) : numVal,
            },
          };
        }
        return c;
      })
    );
  };

  const calculateCartItemTotal = (item) => {
    const rawTotal = item.price * item.quantity;
    if (!item.itemDiscount || !item.itemDiscount.value) return rawTotal;

    if (item.itemDiscount.discountType === 'percentage') {
      const discount = (item.price * (item.itemDiscount.value / 100)) * item.quantity;
      return Math.max(0, rawTotal - discount);
    } else {
      const discount = Math.min(item.itemDiscount.value, item.price) * item.quantity;
      return Math.max(0, rawTotal - discount);
    }
  };

  const cartTotal = cart.reduce((sum, c) => sum + calculateCartItemTotal(c), 0);

  // ─── Customer Phone Search (debounced 400ms) ──────────────────────────────
  const handlePhoneInput = (value) => {
    setCustomerPhone(value);
    setSelectedCustomer(null);
    setShowNewCustomer(false);
    setCustomerSearch([]);

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (value.length < 3) return;

    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/customers/search?phone=${encodeURIComponent(value)}`);
        setCustomerSearch(res.data.data || []);
      } catch {
        setCustomerSearch([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerPhone(customer.phone);
    setCustomerSearch([]);
    setShowNewCustomer(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerPhone('');
    setCustomerSearch([]);
    setShowNewCustomer(false);
    setNewCustName('');
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustName.trim()) return;
    setNewCustSubmitting(true);
    try {
      const res = await api.post('/customers', { name: newCustName.trim(), phone: customerPhone.trim() });
      selectCustomer(res.data.data);
      setShowNewCustomer(false);
      setNewCustName('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setNewCustSubmitting(false);
    }
  };

  // ─── Place Order ──────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (cart.length === 0) { toast.error('Add at least one item to the order'); return; }
    if (orderType === 'dine-in' && !tableId) { toast.error('Please select a table for dine-in orders'); return; }

    setSubmitting(true);

    try {
      await api.post('/orders', {
        orderType,
        tableId: orderType === 'dine-in' ? tableId : undefined,
        customerId: selectedCustomer?._id || null,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
          itemDiscount: c.itemDiscount?.value > 0 ? c.itemDiscount : undefined,
        })),
        tax: 0,
        discount: 0,
        paymentMethod: 'cash',
        isHeld: holdOrder,
      });
      setCart([]);
      setTableId('');
      setHoldOrder(false);
      clearCustomer();
      fetchData();
      toast.success(holdOrder ? 'Order held & sent to kitchen!' : 'Order placed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Status Update ────────────────────────────────────────────────────────
  const handleStatusUpdate = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      fetchData();
      toast.success(`Order status updated to ${status}`);
    } catch (err) {
      toast.error('Failed to update order status');
      console.error(err);
    }
  };

  // ─── Payment (via Checkout Modal) ─────────────────────────────────────────
  const handlePaymentSubmit = async ({ payments, changeAmount, couponCode }) => {
    const res = await api.put(`/orders/${checkoutOrder._id}/pay`, {
      payments,
      changeAmount,
      couponCode,
    });
    const updatedOrder = res.data.data;

    setCheckoutOrder(null);
    setReceiptOrder(updatedOrder);
    fetchData();
    toast.success('Payment recorded successfully!');
  };

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    const statusOk = statusFilter === 'all' || o.status === statusFilter;
    const payOk    = payFilter === 'all' || o.paymentStatus === payFilter;
    return statusOk && payOk;
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Orders</h1>

      {/* ── Create Order ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Menu Grid */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Create New Order</h2>

          {/* Order Type + Table */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="dine-in">Dine-in</option>
                <option value="takeaway">Takeaway</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>

            {orderType === 'dine-in' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select table</option>
                  {tables.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.tableNumber} ({t.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── Customer Phone Search ── */}
          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Customer <span className="font-normal text-gray-400">(optional — search by phone)</span></label>

            {selectedCustomer ? (
              // Selected customer display
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-bold text-blue-900">{selectedCustomer.name}</p>
                  <p className="text-xs text-blue-600 font-mono">{selectedCustomer.phone}</p>
                  {selectedCustomer.loyaltyPoints > 0 && (
                    <p className="text-xs text-yellow-600 font-medium">⭐ {selectedCustomer.loyaltyPoints} pts</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearCustomer}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded hover:bg-red-50"
                >
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => handlePhoneInput(e.target.value)}
                  placeholder="Type phone number (min. 3 digits)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {searchLoading && (
                  <p className="text-xs text-gray-400 mt-1">Searching...</p>
                )}

                {/* Search results dropdown */}
                {!searchLoading && customerSearch.length > 0 && (
                  <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {customerSearch.map((c) => (
                      <button
                        key={c._id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition border-b border-gray-100 last:border-0"
                      >
                        <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* No match — offer inline create */}
                {!searchLoading && customerPhone.length >= 3 && customerSearch.length === 0 && (
                  <div className="mt-2">
                    {!showNewCustomer ? (
                      <button
                        type="button"
                        onClick={() => setShowNewCustomer(true)}
                        className="text-xs text-blue-600 hover:underline font-semibold"
                      >
                        ➕ No match — Create new customer with this number
                      </button>
                    ) : (
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          placeholder="Customer name *"
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCreateNewCustomer}
                          disabled={!newCustName.trim() || newCustSubmitting}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                        >
                          {newCustSubmitting ? '...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowNewCustomer(false); setNewCustName(''); }}
                          className="px-2 py-1.5 text-gray-500 hover:text-gray-700 text-xs rounded-lg"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menu Items Grid — POS-optimised: larger tap targets */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {menuItems.map((item) => (
              <button
                key={item._id}
                onClick={() => addToCart(item)}
                className="text-left p-4 min-h-[72px] border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95 transition-all duration-100 dark:bg-gray-700"
              >
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-base leading-snug">{item.name}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">Rs. {item.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart — POS-style: sticky footer with total + place order */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow flex flex-col h-fit max-h-[calc(100vh-200px)] md:max-h-[calc(100vh-160px)]">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200">Cart</h2>
          </div>

          {/* Scrollable cart items */}
          <div className="flex-1 overflow-y-auto px-5 py-3">

          {cart.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm italic py-4">No items added yet</p>
          ) : (
            <div className="space-y-3">
              {cart.map((c) => {
                const itemNetTotal = calculateCartItemTotal(c);
                const hasDiscount = c.itemDiscount && c.itemDiscount.value > 0;

                return (
                  <div key={c.menuItemId} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-gray-800 dark:text-gray-100 leading-snug">{c.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          Rs. {c.price} × {c.quantity} {hasDiscount && <span>= <s className="text-gray-400">Rs. {c.price * c.quantity}</s></span>} <span className="font-bold text-gray-800 dark:text-gray-100">Rs. {itemNetTotal}</span>
                        </p>
                      </div>
                      {/* ± quantity stepper — POS-sized */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => updateQuantity(c.menuItemId, -1)}
                          className="w-9 h-9 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-lg font-bold text-gray-700 dark:text-gray-200 active:scale-90 transition-all"
                        >−</button>
                        <span className="text-base font-bold w-6 text-center text-gray-800 dark:text-gray-200">{c.quantity}</span>
                        <button
                          onClick={() => updateQuantity(c.menuItemId, 1)}
                          className="w-9 h-9 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 text-lg font-bold text-gray-700 dark:text-gray-200 active:scale-90 transition-all"
                        >+</button>
                      </div>
                    </div>

                    {/* Item-level discount */}
                    <div className="flex items-center gap-2 pt-1.5 border-t border-gray-200 dark:border-gray-600/50 text-xs">
                      <span className="text-gray-500 dark:text-gray-400 font-semibold">Discount:</span>
                      <select
                        value={c.itemDiscount?.discountType || 'percentage'}
                        onChange={(e) => updateItemDiscount(c.menuItemId, e.target.value, c.itemDiscount?.value || 0)}
                        className="px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded text-xs"
                      >
                        <option value="percentage">% Off</option>
                        <option value="fixed">Rs. Off</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        placeholder="Value"
                        value={c.itemDiscount?.value || ''}
                        onChange={(e) => updateItemDiscount(c.menuItemId, c.itemDiscount?.discountType || 'percentage', e.target.value)}
                        className="w-16 px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-xs rounded"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>{/* end scrollable cart items */}

          {/* Sticky footer: Total + Hold + Place Order */}
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-xl flex-shrink-0 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-gray-600 dark:text-gray-300">Total</span>
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">Rs. {cartTotal}</span>
            </div>

            {/* Hold Order toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={holdOrder}
                onChange={(e) => setHoldOrder(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span>Hold Order (send to kitchen, pay later)</span>
            </label>

            <button
              onClick={handlePlaceOrder}
              disabled={submitting || cart.length === 0}
              className="w-full px-4 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 text-base"
            >
              {submitting ? 'Placing Order...' : holdOrder ? '📋 Hold & Send to Kitchen' : '✓ Place Order'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Orders List ── */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {/* Header + Filters */}
        <div className="p-6 pb-3 flex flex-wrap gap-3 items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-700">All Orders</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={payFilter}
              onChange={(e) => setPayFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Payments</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="p-6 text-gray-500">Loading...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="p-6 text-gray-400 italic">No orders match your filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Table</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-mono font-semibold text-gray-800">
                      {order.orderNumber}
                      {order.isHeld && (
                        <span className="ml-1.5 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium border border-yellow-200">HELD</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 capitalize">{order.orderType}</td>
                    <td className="px-5 py-3 text-gray-500">{order.tableId?.tableNumber || '—'}</td>
                    {/* customerId is populated — show name, or fallback if customer was deleted */}
                    <td className="px-5 py-3 text-gray-600 text-xs">
                      {order.customerId?.name
                        ? <span className="font-medium">{order.customerId.name}</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-800">
                      Rs. {order.total}
                      {order.amountPaid > 0 && order.amountPaid < order.total && (
                        <span className="block text-xs text-orange-500 font-normal">Paid: Rs. {order.amountPaid}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${PAY_STATUS_COLORS[order.paymentStatus] || ''}`}>
                        {order.paymentStatus?.replace('_', ' ') || 'unpaid'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {/* Status updater */}
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                            className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready">Ready</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        )}

                        {/* Checkout Button: show when order is not fully paid */}
                        {order.paymentStatus !== 'paid' && (
                          <button
                            onClick={() => setCheckoutOrder(order)}
                            className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition flex items-center gap-1"
                          >
                            💳 Checkout
                          </button>
                        )}

                        {/* Print Receipt: show when order is paid */}
                        {order.paymentStatus === 'paid' && (
                          <button
                            onClick={() => setReceiptOrder(order)}
                            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center gap-1"
                          >
                            🖨️ Receipt
                          </button>
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

      {/* ── Modals ── */}
      <CheckoutModal
        order={checkoutOrder}
        isOpen={!!checkoutOrder}
        onClose={() => setCheckoutOrder(null)}
        onPaymentSuccess={handlePaymentSubmit}
      />

      <ReceiptModal
        order={receiptOrder}
        restaurantName={restaurantName}
        isOpen={!!receiptOrder}
        onClose={() => setReceiptOrder(null)}
      />
    </div>
  );
}

export default Orders;
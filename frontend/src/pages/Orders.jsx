import { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import CheckoutModal from '../components/CheckoutModal';
import ReceiptModal from '../components/ReceiptModal';
import {
  ShoppingBag,
  User,
  Plus,
  Search,
  Check,
  X,
  CreditCard,
  Clock,
  Utensils,
  Minus,
  Trash2,
  Tag,
} from 'lucide-react';

const STATUS_COLORS = {
  pending:   'bg-amber-500/10 text-amber-500 border-amber-500/20',
  confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  preparing: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  ready:     'bg-purple-500/10 text-purple-500 border-purple-500/20',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  cancelled: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

const PAY_STATUS_COLORS = {
  unpaid:          'bg-rose-500/10 text-rose-500 border-rose-500/20',
  partially_paid:  'bg-amber-500/10 text-amber-500 border-amber-500/20',
  paid:            'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

function Orders() {
  const [orders, setOrders]       = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // New Order form state
  const [orderType, setOrderType] = useState('dine-in');
  const [tableId, setTableId]     = useState('');

  // Customer phone search state
  const [customerPhone, setCustomerPhone]       = useState('');
  const [customerSearch, setCustomerSearch]     = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchLoading, setSearchLoading]       = useState(false);
  const [showNewCustomer, setShowNewCustomer]   = useState(false);
  const [newCustName, setNewCustName]           = useState('');
  const [newCustSubmitting, setNewCustSubmitting] = useState(false);
  const searchTimer = useRef(null);
  const [cart, setCart]           = useState([]);
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
    api.get('/auth/me')
      .then((res) => {
        const user = res.data.data;
        setRestaurantName(user.restaurantName || user.name || 'Restaurant');
      })
      .catch(() => {});
  }, []);

  const handlePhoneChange = (val) => {
    setCustomerPhone(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (val.trim().length < 2) {
      setCustomerSearch([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/customers/search?phone=${encodeURIComponent(val.trim())}`);
        setCustomerSearch(res.data.data);
      } catch (err) {
        setCustomerSearch([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerPhone(c.phone);
    setCustomerSearch([]);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerPhone('');
    setCustomerSearch([]);
    setShowNewCustomer(false);
    setNewCustName('');
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustName.trim() || !customerPhone.trim()) return;
    setNewCustSubmitting(true);
    try {
      const res = await api.post('/customers', {
        name: newCustName.trim(),
        phone: customerPhone.trim(),
      });
      const created = res.data.data;
      setSelectedCustomer(created);
      setCustomerPhone(created.phone);
      setShowNewCustomer(false);
      setNewCustName('');
      setCustomerSearch([]);
      toast.success(`Customer "${created.name}" created & linked!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setNewCustSubmitting(false);
    }
  };

  const addToCart = (menuItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.menuItemId === menuItem._id);
      if (existing) {
        return prev.map((item) =>
          item.menuItemId === menuItem._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          itemDiscount: { discountType: 'percentage', value: 0 },
        },
      ];
    });
  };

  const updateQuantity = (menuItemId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.menuItemId === menuItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const updateItemDiscount = (menuItemId, discountType, val) => {
    const numVal = Math.max(0, Number(val) || 0);
    setCart((prev) =>
      prev.map((item) => {
        if (item.menuItemId === menuItemId) {
          return {
            ...item,
            itemDiscount: { discountType, value: numVal },
          };
        }
        return item;
      })
    );
  };

  const calculateCartItemTotal = (item) => {
    const rawTotal = item.price * item.quantity;
    if (!item.itemDiscount || !item.itemDiscount.value) return rawTotal;
    if (item.itemDiscount.discountType === 'percentage') {
      const pct = Math.min(100, Math.max(0, item.itemDiscount.value));
      return Math.max(0, rawTotal - (rawTotal * pct) / 100);
    } else {
      return Math.max(0, rawTotal - item.itemDiscount.value);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + calculateCartItemTotal(item), 0);

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

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      fetchData();
      toast.success(`Order status updated to ${status}`);
    } catch (err) {
      toast.error('Failed to update order status');
    }
  };

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

  const filteredOrders = orders.filter((o) => {
    const statusOk = statusFilter === 'all' || o.status === statusFilter;
    const payOk    = payFilter === 'all' || o.paymentStatus === payFilter;
    return statusOk && payOk;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Orders & Billing
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Create new orders, manage POS cart, and process customer payments
        </p>
      </div>

      {/* ── Create Order Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Grid Column */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">Create New Order</h2>
          </div>

          {/* Order Controls */}
          <div className="space-y-4 pt-1">
            {/* Order Type Toggle */}
            <div className="flex gap-2">
              {['dine-in', 'takeaway', 'delivery'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrderType(type)}
                  className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl uppercase tracking-wider transition ${
                    orderType === type
                      ? 'bg-amber-500 text-neutral-950 shadow-xs'
                      : 'bg-neutral-100 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Table Selection */}
            {orderType === 'dine-in' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  Select Table *
                </label>
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                >
                  <option value="">Choose a table...</option>
                  {tables.map((t) => (
                    <option key={t._id} value={t._id}>
                      Table {t.tableNumber} (Capacity: {t.capacity}) — {t.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Search Panel */}
            <div className="relative">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Customer Phone <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>

              {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">{selectedCustomer.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearCustomer}
                    className="p-1 text-neutral-400 hover:text-rose-500 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="Search phone number..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  </div>

                  {/* Dropdown Results */}
                  {customerSearch.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                      {customerSearch.map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => selectCustomer(c)}
                          className="w-full text-left p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition flex justify-between items-center"
                        >
                          <div>
                            <p className="font-semibold text-sm text-neutral-900 dark:text-white">{c.name}</p>
                            <p className="text-xs text-neutral-400">{c.phone}</p>
                          </div>
                          <span className="text-xs text-amber-500 font-bold">Select</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Add Customer mini option */}
                  {customerPhone.length >= 4 && customerSearch.length === 0 && !searchLoading && !showNewCustomer && (
                    <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between">
                      <span>No customer found with phone "{customerPhone}"</span>
                      <button
                        type="button"
                        onClick={() => setShowNewCustomer(true)}
                        className="text-amber-500 font-bold hover:underline"
                      >
                        + Add New Customer
                      </button>
                    </div>
                  )}

                  {/* New Customer Form */}
                  {showNewCustomer && (
                    <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl flex gap-2 items-center">
                      <input
                        type="text"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        placeholder="Customer name *"
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCreateNewCustomer}
                        disabled={!newCustName.trim() || newCustSubmitting}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                      >
                        {newCustSubmitting ? '...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowNewCustomer(false); setNewCustName(''); }}
                        className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
              Select Menu Items
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {menuItems.map((item) => (
                <button
                  key={item._id}
                  onClick={() => addToCart(item)}
                  className="text-left p-4 min-h-[76px] bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-amber-500 dark:hover:border-amber-500/60 hover:bg-amber-500/5 active:scale-95 transition-all duration-100 flex flex-col justify-between"
                >
                  <p className="font-bold text-neutral-900 dark:text-white text-sm leading-snug">{item.name}</p>
                  <p className="text-amber-500 font-extrabold text-xs mt-1">Rs. {item.price}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Panel Column — POS Sticky Checkout */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs flex flex-col h-fit max-h-[calc(100vh-180px)]">
          <div className="px-5 pt-5 pb-3 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center flex-shrink-0">
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              Cart
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
            </span>
          </div>

          {/* Scrollable Cart Items */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 dark:text-neutral-500 text-sm italic">
                Cart is empty. Tap items to add.
              </div>
            ) : (
              cart.map((c) => {
                const itemNetTotal = calculateCartItemTotal(c);
                const hasDiscount = c.itemDiscount && c.itemDiscount.value > 0;

                return (
                  <div
                    key={c.menuItemId}
                    className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 rounded-xl space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-neutral-900 dark:text-white leading-snug">{c.name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          Rs. {c.price} × {c.quantity}{' '}
                          {hasDiscount && <s className="text-neutral-400 font-normal">Rs. {c.price * c.quantity}</s>}{' '}
                          <span className="font-extrabold text-neutral-900 dark:text-white">Rs. {itemNetTotal}</span>
                        </p>
                      </div>

                      {/* ± Quantity Stepper */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => updateQuantity(c.menuItemId, -1)}
                          className="w-8 h-8 flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold active:scale-90 transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-bold w-6 text-center text-neutral-900 dark:text-white">{c.quantity}</span>
                        <button
                          onClick={() => updateQuantity(c.menuItemId, 1)}
                          className="w-8 h-8 flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold active:scale-90 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Item Discount Config */}
                    <div className="flex items-center gap-2 pt-1.5 border-t border-neutral-200 dark:border-neutral-800 text-xs">
                      <Tag className="w-3 h-3 text-amber-500" />
                      <span className="text-neutral-500 dark:text-neutral-400 font-semibold text-[11px]">Disc:</span>
                      <select
                        value={c.itemDiscount?.discountType || 'percentage'}
                        onChange={(e) => updateItemDiscount(c.menuItemId, e.target.value, c.itemDiscount?.value || 0)}
                        className="px-2 py-0.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded text-[11px]"
                      >
                        <option value="percentage">% Off</option>
                        <option value="fixed">Rs. Off</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={c.itemDiscount?.value || ''}
                        onChange={(e) => updateItemDiscount(c.menuItemId, c.itemDiscount?.discountType || 'percentage', e.target.value)}
                        className="w-16 px-2 py-0.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-[11px] rounded"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sticky Total & Place Order Button */}
          <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-b-xl flex-shrink-0 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Total</span>
              <span className="text-2xl font-extrabold text-amber-500">Rs. {cartTotal}</span>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={holdOrder}
                onChange={(e) => setHoldOrder(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-amber-500 focus:ring-amber-500"
              />
              <span>Hold Order (Send to kitchen, pay later)</span>
            </label>

            <button
              onClick={handlePlaceOrder}
              disabled={submitting || cart.length === 0}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-extrabold rounded-xl transition-all disabled:opacity-50 text-base shadow-xs"
            >
              {submitting ? 'Placing Order...' : holdOrder ? '📋 Hold & Send to Kitchen' : '✓ Place Order'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Orders Table Section ── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">All Orders</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Filter by status or payment condition</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              className="px-3 py-2 text-xs font-medium bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Payments</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 italic">No orders match your filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
                  <th className="px-6 py-3.5">Order #</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Table</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Total</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Payment</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-amber-500">#{order.orderNumber}</td>
                    <td className="px-6 py-4 capitalize font-medium text-neutral-700 dark:text-neutral-300">{order.orderType}</td>
                    <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                      {order.tableId ? `Table ${order.tableId.tableNumber}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-neutral-700 dark:text-neutral-300">
                      {order.customerId ? order.customerId.name : <span className="text-neutral-400 italic">—</span>}
                    </td>
                    <td className="px-6 py-4 font-extrabold text-neutral-900 dark:text-white">Rs. {order.total}</td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer ${STATUS_COLORS[order.status]}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${PAY_STATUS_COLORS[order.paymentStatus]}`}>
                        {order.paymentStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                        <button
                          onClick={() => setCheckoutOrder(order)}
                          className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ml-auto"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {checkoutOrder && (
        <CheckoutModal
          order={checkoutOrder}
          onClose={() => setCheckoutOrder(null)}
          onSubmit={handlePaymentSubmit}
        />
      )}

      {/* Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          restaurantName={restaurantName}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}

export default Orders;
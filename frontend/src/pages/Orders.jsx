import { useEffect, useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import CheckoutModal from '../components/CheckoutModal';
import ReceiptModal from '../components/ReceiptModal';
import {
  ShoppingBag,
  User,
  Search,
  X,
  Minus,
  Plus,
  Trash2,
  Tag,
  Percent,
  Utensils,
  UtensilsCrossed,
  CheckCircle2,
  Clock,
  Flame,
  BellRing,
} from 'lucide-react';

const STATUS_BADGE_STYLE = {
  pending: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  preparing: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  ready: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  served: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

function Orders() {
  const [orders, setOrders]       = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [checkoutOrder, setCheckoutOrder]   = useState(null);
  const [receiptOrder, setReceiptOrder]     = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [userRole, setUserRole]             = useState('');

  // Order form state
  const [orderType, setOrderType] = useState('dine-in');
  const [tableId, setTableId]     = useState('');

  // Customer search state
  const [customerPhone, setCustomerPhone]         = useState('');
  const [customerSearch, setCustomerSearch]       = useState([]);
  const [selectedCustomer, setSelectedCustomer]   = useState(null);
  const [searchLoading, setSearchLoading]         = useState(false);
  const [showNewCustomer, setShowNewCustomer]     = useState(false);
  const [newCustName, setNewCustName]             = useState('');
  const [newCustSubmitting, setNewCustSubmitting] = useState(false);
  const searchTimer = useRef(null);

  const [cart, setCart]                   = useState([]);
  const [currentCreatedOrder, setCurrentCreatedOrder] = useState(null);
  const [variantPickerItem, setVariantPickerItem] = useState(null);

  // POS extras
  const [taxRate, setTaxRate]             = useState(0);
  const [itemSearch, setItemSearch]       = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Running tab — checks if this table already has an active unpaid order (not completed yet)
  const existingOpenOrder = useMemo(() => {
    if (orderType === 'dine-in' && tableId) {
      return orders.find(
        (o) =>
          (o.tableId?._id === tableId || o.tableId === tableId) &&
          o.paymentStatus !== 'paid' &&
          !['completed', 'cancelled'].includes(o.status)
      );
    }
    return null;
  }, [orders, orderType, tableId]);

  const activeTabOrder = currentCreatedOrder || existingOpenOrder;

  // ── Running tab sync: Sync cart & open order state whenever orders, tableId or orderType changes ──
  useEffect(() => {
    if (orderType !== 'dine-in') return;

    // Auto-select table if no table is selected but an open dine-in order exists
    if (!tableId && orders.length > 0) {
      const openDineInOrder = orders.find(
        (o) =>
          o.tableId &&
          o.paymentStatus !== 'paid' &&
          !['completed', 'cancelled'].includes(o.status)
      );
      if (openDineInOrder) {
        const foundTableId = openDineInOrder.tableId?._id || openDineInOrder.tableId;
        setTableId(foundTableId);
        return;
      }
    }

    if (!tableId) {
      setCart((prev) => prev.filter((i) => !i.isSentToKitchen));
      setCurrentCreatedOrder(null);
      return;
    }

    const openOrder = orders.find(
      (o) =>
        (o.tableId?._id === tableId || o.tableId === tableId) &&
        o.paymentStatus !== 'paid' &&
        !['completed', 'cancelled'].includes(o.status)
    );

    if (openOrder) {
      setCurrentCreatedOrder(openOrder);

      const mappedItems = (openOrder.items || []).map((item) => {
        const vName = item.variant || item.variantName || null;
        let cleanName = item.name || '';
        if (vName && cleanName.endsWith(` (${vName})`)) {
          cleanName = cleanName.slice(0, -(` (${vName})`.length));
        }
        return {
          cartKey: item._id || `${item.menuItemId}_${vName || 'base'}_${item.round || 1}`,
          menuItemId: typeof item.menuItemId === 'object' ? item.menuItemId._id : item.menuItemId,
          name: cleanName,
          price: item.price,
          quantity: item.quantity,
          variantName: vName,
          portionMultiplier: item.portionMultiplier || 1,
          itemDiscount: item.itemDiscount || { discountType: 'percentage', value: 0 },
          isSentToKitchen: true,
          status: item.status || 'pending',
          round: item.round || 1,
        };
      });

      setCart((prevCart) => {
        const unsentItems = prevCart.filter((i) => !i.isSentToKitchen);
        return [...mappedItems, ...unsentItems];
      });

      if (openOrder.customerId && typeof openOrder.customerId === 'object') {
        setSelectedCustomer(openOrder.customerId);
      }
    } else {
      setCurrentCreatedOrder(null);
      setCart((prevCart) => prevCart.filter((i) => !i.isSentToKitchen));
    }
  }, [orders, orderType, tableId]);

  const fetchData = async () => {
    try {
      const [ordersRes, itemsRes, tablesRes] = await Promise.allSettled([
        api.get('/orders'),
        api.get('/menu-items'),
        api.get('/tables'),
      ]);
      if (ordersRes.status === 'fulfilled') {
        const freshOrders = ordersRes.value.data.data || [];
        setOrders(freshOrders);
        
        // Auto-update active created order reference if active
        if (currentCreatedOrder) {
          const matched = freshOrders.find((o) => o._id === currentCreatedOrder._id);
          if (matched) setCurrentCreatedOrder(matched);
        }
      }
      if (itemsRes.status  === 'fulfilled') setMenuItems(itemsRes.value.data.data);
      if (tablesRes.status === 'fulfilled') setTables(tablesRes.value.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Poll live orders every 4 seconds & fetch settings for taxRate
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);

    api.get('/auth/me')
      .then((res) => {
        const user = res.data.data;
        setRestaurantName(user.restaurantName || user.name || 'Restaurant');
        setUserRole(user.role || '');
      })
      .catch(() => {});

    api.get('/settings')
      .then((res) => {
        if (res.data?.success && res.data.data?.taxRate !== undefined) {
          setTaxRate(res.data.data.taxRate);
        }
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  // ── Category / Search filter ─────────────────────────────────────────────
  const uniqueCategories = useMemo(() => {
    const cats = new Set();
    menuItems.forEach((item) => {
      const catName = typeof item.category === 'object' ? item.category?.name : item.category;
      if (catName) cats.add(catName);
    });
    return Array.from(cats);
  }, [menuItems]);

  const displayedMenuItems = useMemo(() => {
    let items = menuItems;
    if (categoryFilter !== 'All') {
      items = items.filter((item) => {
        const catName = typeof item.category === 'object' ? item.category?.name : item.category;
        return catName === categoryFilter;
      });
    }
    if (itemSearch.trim()) {
      const q = itemSearch.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(q));
    }
    return items;
  }, [menuItems, categoryFilter, itemSearch]);

  // ── Customer handlers ────────────────────────────────────────────────────
  const handlePhoneChange = (val) => {
    setCustomerPhone(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (val.trim().length < 2) { setCustomerSearch([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/customers?search=${encodeURIComponent(val.trim())}`);
        if (res.data.success) setCustomerSearch(res.data.data);
      } catch (err) { console.error(err); }
      finally { setSearchLoading(false); }
    }, 300);
  };

  const selectCustomer = (cust) => {
    setSelectedCustomer(cust);
    setCustomerPhone(cust.phone);
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
    if (!newCustName.trim() || !customerPhone.trim()) return;
    setNewCustSubmitting(true);
    try {
      const res = await api.post('/customers', { name: newCustName.trim(), phone: customerPhone.trim() });
      const created = res.data.data;
      setSelectedCustomer(created);
      setCustomerPhone(created.phone);
      setShowNewCustomer(false);
      setNewCustName('');
      setCustomerSearch([]);
      toast.success(`Customer "${created.name}" created & linked!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer');
    } finally { setNewCustSubmitting(false); }
  };

  // ── Cart handlers ────────────────────────────────────────────────────────
  const addToCart = (menuItem, variant = null) => {
    const cartKey = variant ? `${menuItem._id}__${variant.name}` : menuItem._id;
    const basePrice = menuItem.isSpecialDeal && menuItem.dealPrice > 0 ? menuItem.dealPrice : menuItem.price;
    const price = variant ? variant.price : basePrice;
    setCart((prev) => {
      const existing = prev.find((i) => i.cartKey === cartKey);
      if (existing) {
        return prev.map((i) => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [
        ...prev,
        {
          cartKey,
          menuItemId: menuItem._id,
          name: menuItem.name,
          price,
          quantity: 1,
          variantName: variant?.name || null,
          portionMultiplier: variant?.portionMultiplier || 1,
          itemDiscount: { discountType: 'percentage', value: 0 },
          isSentToKitchen: false,
        },
      ];
    });
    setVariantPickerItem(null);
  };

  const handleMenuItemClick = (menuItem) => {
    if (!menuItem.isAvailable) return;
    if (menuItem.variants && menuItem.variants.length > 0) setVariantPickerItem(menuItem);
    else addToCart(menuItem);
  };

  const updateQuantity = (cartKey, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartKey !== cartKey) return item;
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }).filter(Boolean)
    );
  };

  const updateItemDiscount = (cartKey, discountType, val) => {
    const numVal = Math.max(0, Number(val) || 0);
    setCart((prev) =>
      prev.map((item) =>
        item.cartKey === cartKey ? { ...item, itemDiscount: { discountType, value: numVal } } : item
      )
    );
  };

  const calculateCartItemTotal = (item) => {
    const rawTotal = item.price * item.quantity;
    const discountVal = Number(item.itemDiscount?.value) || 0;
    if (discountVal <= 0) return rawTotal;
    if (item.itemDiscount.discountType === 'percentage') {
      const pct = Math.min(100, Math.max(0, discountVal));
      return Math.max(0, rawTotal - (rawTotal * pct) / 100);
    }
    return Math.max(0, rawTotal - discountVal);
  };

  const numericTaxRate = Number(taxRate) || 0;
  const cartSubtotal = cart.reduce((sum, item) => sum + calculateCartItemTotal(item), 0);
  const taxAmount    = Math.round(cartSubtotal * numericTaxRate / 100);
  const grandTotal   = cartSubtotal + taxAmount;

  // Unsent items check
  const hasUnsentItems = cart.some((i) => !i.isSentToKitchen);

  // ── 1. Place Order to Kitchen (CART CLEAR NAHI HOGA) ──────────────────────
  const handleSendToKitchen = async () => {
    if (cart.length === 0) { toast.error('Add at least one item to the cart'); return; }
    if (orderType === 'dine-in' && !tableId) { toast.error('Please select a table for dine-in orders'); return; }
    if (submitting) return;
    setSubmitting(true);

    try {
      const unsentItems = cart.filter((i) => !i.isSentToKitchen);
      const itemsPayload = unsentItems.map((c) => ({
        menuItemId: c.menuItemId,
        name: c.name + (c.variantName ? ` (${c.variantName})` : ''),
        price: c.price,
        quantity: c.quantity,
        portionMultiplier: c.portionMultiplier || 1,
        variantName: c.variantName || undefined,
        itemDiscount: c.itemDiscount?.value > 0 ? c.itemDiscount : undefined,
      }));

      let createdOrUpdated;
      if (activeTabOrder) {
        const res = await api.post(`/orders/${activeTabOrder._id}/add-items`, { items: itemsPayload });
        createdOrUpdated = res.data.data;
        toast.success(`Sent additions to kitchen for Order #${createdOrUpdated.orderNumber}!`);
      } else {
        const res = await api.post('/orders', {
          orderType,
          tableId: orderType === 'dine-in' ? tableId : undefined,
          customerId: selectedCustomer?._id || null,
          items: itemsPayload,
          tax: taxAmount,
          discount: 0,
          paymentMethod: 'cash',
        });
        createdOrUpdated = res.data.data;
        toast.success('Order sent to kitchen!');
      }

      if (orderType === 'dine-in') {
        // Mark items as SENT in cart instead of clearing cart!
        setCart((prev) => prev.map((item) => ({ ...item, isSentToKitchen: true })));
        setCurrentCreatedOrder(createdOrUpdated);
        toast.success('Order sent to kitchen!');
      } else {
        // Takeaway / Delivery: Auto-open CheckoutModal immediately, clear cart & customer
        setCheckoutOrder(createdOrUpdated);
        setCart([]);
        setCurrentCreatedOrder(null);
        clearCustomer();
        toast.success('Order created! Opening Checkout...');
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally { setSubmitting(false); }
  };

  // ── 2. Open Payment Modal ────────────────────────────────────────────────
  const handleOpenCheckoutModal = () => {
    if (activeTabOrder) {
      setCheckoutOrder(activeTabOrder);
    } else {
      toast.error('No active order to checkout');
    }
  };

  // ── 3. Handle Final Payment Completion (CART TABHI CLEAR HOGA) ───────────
  const handlePaymentSubmit = async ({ payments, changeAmount, couponCode, customerId }) => {
    try {
      const res = await api.put(`/orders/${checkoutOrder._id}/pay`, {
        payments,
        changeAmount,
        couponCode,
        customerId,
      });
      const updatedOrder = res.data.data;
      setCheckoutOrder(null);
      setReceiptOrder(updatedOrder);

      // PAYMENT COMPLETED -> NOW CLEAR CART & RESET POS STATE
      setCart([]);
      setCurrentCreatedOrder(null);
      clearCustomer();
      fetchData();
      toast.success('Payment completed & Order finalized!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    }
  };

  const inputCls = 'w-full px-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition';

  // Selected Table info
  const selectedTableObj = tables.find((t) => t._id === tableId);

  // Live order status (pending, preparing, ready, completed/served)
  const currentOrderStatus = useMemo(() => {
    if (!activeTabOrder) return 'pending';
    if (
      activeTabOrder.items &&
      activeTabOrder.items.length > 0 &&
      activeTabOrder.items.every((i) => i.status === 'served')
    ) {
      return 'served';
    }
    return activeTabOrder.status || 'pending';
  }, [activeTabOrder]);

  const isServedOrCompleted = ['completed', 'served'].includes(currentOrderStatus);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            POS Terminal
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Create orders, manage cart, and process customer payments
          </p>
        </div>
        {/* Order Type Selector */}
        <div className="flex gap-2 flex-shrink-0">
          {['dine-in', 'takeaway', 'delivery'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setOrderType(type);
                if (type !== 'dine-in') setTableId('');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl uppercase tracking-wider transition-all ${
                orderType === type
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-amber-500/50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Main POS Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ minHeight: 'calc(100vh - 200px)' }}>

        {/* ── LEFT: Menu Items ──────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Order Config Row */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Table Selection */}
              {orderType === 'dine-in' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Select Table *
                  </label>
                  <select
                    value={tableId}
                    onChange={(e) => setTableId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Choose a table...</option>
                    {tables.map((t) => (
                      <option key={t._id} value={t._id}>
                        Table {t.tableNumber} ({t.capacity} seats) — {t.status}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer Search */}
              <div className="relative">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                  Customer Phone <span className="text-neutral-400 font-normal normal-case">(optional)</span>
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
                    <button onClick={clearCustomer} className="p-1 text-neutral-400 hover:text-rose-500 rounded">
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
                        placeholder="Search by phone number..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                      />
                      <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    </div>
                    {customerSearch.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg z-20 max-h-44 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                        {customerSearch.map((c) => (
                          <button key={c._id} type="button" onClick={() => selectCustomer(c)}
                            className="w-full text-left p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-sm text-neutral-900 dark:text-white">{c.name}</p>
                              <p className="text-xs text-neutral-400">{c.phone}</p>
                            </div>
                            <span className="text-xs text-amber-500 font-bold">Select</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {customerPhone.length >= 4 && customerSearch.length === 0 && !searchLoading && !showNewCustomer && (
                      <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between">
                        <span>No customer found</span>
                        <button onClick={() => setShowNewCustomer(true)} className="text-amber-500 font-bold hover:underline">
                          + Add New
                        </button>
                      </div>
                    )}
                    {showNewCustomer && (
                      <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl flex gap-2 items-center">
                        <input type="text" value={newCustName} onChange={(e) => setNewCustName(e.target.value)}
                          placeholder="Customer name *"
                          className="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                        <button onClick={handleCreateNewCustomer} disabled={!newCustName.trim() || newCustSubmitting}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50">
                          {newCustSubmitting ? '...' : 'Save'}
                        </button>
                        <button onClick={() => { setShowNewCustomer(false); setNewCustName(''); }}
                          className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category Filter + Search Bar */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Category tabs */}
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {['All', ...uniqueCategories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      categoryFilter === cat
                        ? 'bg-amber-500 text-neutral-950 shadow-xs'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative flex-shrink-0 sm:w-52">
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Search items..."
                  className="w-full pl-8 pr-4 py-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                />
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
              </div>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs flex-1">
            {/* Variant Picker Modal */}
            {variantPickerItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 w-full max-w-xs p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white">{variantPickerItem.name}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">Select a size / portion</p>
                    </div>
                    <button onClick={() => setVariantPickerItem(null)} className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {variantPickerItem.variants.map((v, i) => (
                      <button key={i} onClick={() => addToCart(variantPickerItem, v)}
                        className="w-full flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:border-amber-500 hover:bg-amber-500/5 transition active:scale-95">
                        <span className="font-semibold text-sm text-neutral-900 dark:text-white">{v.name}</span>
                        <span className="text-amber-500 font-extrabold text-sm">Rs. {v.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1,2,3,4,5,6].map((n) => (
                  <div key={n} className="h-32 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : displayedMenuItems.length === 0 ? (
              <div className="py-16 text-center text-neutral-400 flex flex-col items-center gap-3">
                <Utensils className="w-10 h-10 opacity-30" />
                <p className="text-sm">No items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {displayedMenuItems.map((item) => {
                  const isUnavailable = !item.isAvailable;
                  const hasLowStock = !isUnavailable && item.recipe?.length > 0 && item.recipe.some((r) => {
                    const inv = r.inventoryItemId;
                    return inv && typeof inv === 'object' && inv.currentStock > 0 && inv.currentStock <= (inv.reorderLevel || 0);
                  });
                  return (
                    <button
                      key={item._id}
                      onClick={() => handleMenuItemClick(item)}
                      disabled={isUnavailable}
                      className={`text-left p-3 min-h-[80px] border rounded-xl flex flex-col justify-between transition-all duration-100 relative ${
                        isUnavailable
                          ? 'bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 opacity-50 cursor-not-allowed'
                          : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 hover:border-amber-500 dark:hover:border-amber-500/60 hover:bg-amber-500/5 active:scale-95'
                      }`}
                    >
                      {item.isSpecialDeal && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 z-10">🔥 Deal</span>
                      )}
                      {isUnavailable && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 z-10">🚫 Sold Out</span>
                      )}
                      {hasLowStock && !isUnavailable && !item.isSpecialDeal && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 z-10">⚠ Low Stock</span>
                      )}
                      {item.variants?.length > 0 && !isUnavailable && !hasLowStock && !item.isSpecialDeal && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 z-10">{item.variants.length} sizes</span>
                      )}
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-14 object-cover rounded-lg mb-2 border border-neutral-200 dark:border-neutral-700" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="w-full h-14 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-2xl mb-2 flex-shrink-0">
                          {item.emoji || '🍔'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-white text-xs leading-snug pr-10">{item.name}</p>
                        <div className="text-[11px] mt-0.5">
                          {item.variants?.length > 0 ? (
                            <span className="text-amber-500 font-extrabold">from Rs. {Math.min(...item.variants.map((v) => v.price))}</span>
                          ) : item.isSpecialDeal && item.dealPrice > 0 ? (
                            <div className="flex items-center gap-1">
                              <span className="text-amber-500 font-black">Rs. {item.dealPrice}</span>
                              <span className="line-through text-neutral-400 text-[10px]">Rs. {item.price}</span>
                            </div>
                          ) : (
                            <span className="text-amber-500 font-extrabold">Rs. {item.price}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Cart ───────────────────────────────────────── */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs flex flex-col"
          style={{ height: 'calc(100vh - 160px)', position: 'sticky', top: '80px' }}>

          {/* Cart Header */}
          <div className="px-4 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-neutral-900 dark:text-white flex items-center gap-1.5">
                Current Order
              </h2>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {orderType}
              </span>
            </div>
            {selectedTableObj && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-800 text-amber-400 border border-neutral-700">
                📍 T{selectedTableObj.tableNumber}
              </span>
            )}
          </div>

          {/* Scrollable Cart Items (NEVER REMOVED UNTIL PAID) */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-neutral-400 dark:text-neutral-500 flex flex-col items-center gap-3">
                <ShoppingBag className="w-10 h-10 opacity-20" />
                <p className="text-sm font-semibold">Cart is empty</p>
                <p className="text-xs opacity-70">Click items on the left to add to order</p>
              </div>
            ) : (
              cart.map((c) => {
                const itemNetTotal = calculateCartItemTotal(c);
                const hasDiscount = c.itemDiscount && c.itemDiscount.value > 0;
                
                // Determine item status badge from item level status or order live status
                const itemEffStatus = c.status || currentOrderStatus;
                const badgeStyle = c.isSentToKitchen
                  ? STATUS_BADGE_STYLE[itemEffStatus] || STATUS_BADGE_STYLE.pending
                  : 'bg-amber-500/20 text-amber-500 border-amber-500/30';

                return (
                  <div
                    key={c.cartKey}
                    className={`p-3 border rounded-xl space-y-2 transition-all ${
                      c.isSentToKitchen
                        ? 'bg-neutral-900/60 border-neutral-800'
                        : 'bg-neutral-50 dark:bg-neutral-950 border-amber-500/40'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-neutral-900 dark:text-white leading-snug">
                            {c.name}
                            {c.variantName && <span className="ml-1 text-[10px] font-normal text-blue-500">({c.variantName})</span>}
                          </p>

                          {/* Dynamic Item Status Badge: Pending / Preparing / Ready / Served */}
                          {c.isSentToKitchen ? (
                            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${badgeStyle}`}>
                              {itemEffStatus === 'preparing' ? <Flame className="w-2.5 h-2.5" />
                               : itemEffStatus === 'ready' ? <BellRing className="w-2.5 h-2.5" />
                               : itemEffStatus === 'completed' || itemEffStatus === 'served' ? <CheckCircle2 className="w-2.5 h-2.5" />
                               : <Clock className="w-2.5 h-2.5" />}
                              {c.round ? `${itemEffStatus === 'completed' ? 'Served' : itemEffStatus} (R${c.round})` : `${itemEffStatus}`}
                            </span>
                          ) : (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                              New
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                          Rs. {c.price} each
                        </p>
                      </div>

                      {/* Qty Stepper */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!c.isSentToKitchen && (
                          <button onClick={() => updateQuantity(c.cartKey, -1)}
                            className="w-7 h-7 flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 active:scale-90 transition">
                            <Minus className="w-3 h-3" />
                          </button>
                        )}
                        <span className="text-xs font-bold px-2 py-0.5 bg-neutral-800 rounded text-neutral-200">
                          {c.quantity}
                        </span>
                        {!c.isSentToKitchen && (
                          <button onClick={() => updateQuantity(c.cartKey, 1)}
                            className="w-7 h-7 flex items-center justify-center bg-neutral-200 dark:bg-neutral-800 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-700 active:scale-90 transition">
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-extrabold text-amber-500 text-xs">Rs. {itemNetTotal}</span>
                      </div>
                    </div>

                    {/* Per-item Discount */}
                    {!c.isSentToKitchen && (
                      <div className="flex items-center gap-2 pt-1.5 border-t border-neutral-200 dark:border-neutral-800 text-xs">
                        <Tag className="w-3 h-3 text-amber-500 flex-shrink-0" />
                        <span className="text-neutral-500 dark:text-neutral-400 font-semibold text-[10px]">Disc:</span>
                        <select value={c.itemDiscount?.discountType || 'percentage'}
                          onChange={(e) => updateItemDiscount(c.cartKey, e.target.value, c.itemDiscount?.value || 0)}
                          className="px-1.5 py-0.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded text-[10px]">
                          <option value="percentage">% Off</option>
                          <option value="fixed">Rs. Off</option>
                        </select>
                        <input type="number" min="0" placeholder="0"
                          value={c.itemDiscount?.value || ''}
                          onChange={(e) => updateItemDiscount(c.cartKey, c.itemDiscount?.discountType || 'percentage', e.target.value)}
                          className="w-14 px-2 py-0.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 text-[10px] rounded" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* ── Cart Footer: Status Banner + Totals + Action Buttons ── */}
          <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-b-xl flex-shrink-0 space-y-2.5">
            
            {/* Realtime Order Status Bar — ONLY shows AFTER order has been sent to kitchen! */}
            {activeTabOrder && !hasUnsentItems && cart.length > 0 && (
              <div className={`p-2.5 border rounded-xl text-center text-xs font-bold transition-all ${
                isServedOrCompleted
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : currentOrderStatus === 'ready'
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                  : currentOrderStatus === 'preparing'
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              }`}>
                {isServedOrCompleted ? (
                  <span>✔ Table served — ready for checkout & payment</span>
                ) : currentOrderStatus === 'ready' ? (
                  <span>🔔 Order READY — ready for serving</span>
                ) : currentOrderStatus === 'preparing' ? (
                  <span>🍳 Order (PREPARING) — kitchen is cooking</span>
                ) : (
                  <span>⏱ Order sent (PENDING) — kitchen processing</span>
                )}
              </div>
            )}

            {/* Subtotal */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500 dark:text-neutral-400">Subtotal</span>
              <span className="font-semibold text-neutral-900 dark:text-white">Rs. {cartSubtotal}</span>
            </div>

            {/* Tax Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
                  Tax ({taxRate}%)
                </span>
              </div>
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Rs. {taxAmount}</span>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-700 dark:text-neutral-200">Total Payable</span>
              <span className="text-xl font-extrabold text-amber-500">Rs. {grandTotal}</span>
            </div>

            {/* ── Dynamic Buttons Logic ── */}
            {hasUnsentItems ? (
              // CASE 1: Unsent new items exist in cart -> Click sends to Kitchen
              <button
                onClick={handleSendToKitchen}
                disabled={submitting}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-extrabold rounded-xl transition-all disabled:opacity-50 text-sm shadow-xs flex items-center justify-center gap-2"
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>
                  {submitting
                    ? orderType === 'dine-in'
                      ? 'Sending to Kitchen...'
                      : 'Creating & Opening Checkout...'
                    : orderType === 'dine-in'
                    ? 'Place Order to Kitchen →'
                    : 'Place Order & Checkout →'}
                </span>
              </button>
            ) : activeTabOrder && isServedOrCompleted ? (
              // CASE 2: Order is SERVED / COMPLETED -> Checkout Button turns ENABLED!
              <button
                onClick={handleOpenCheckoutModal}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-extrabold rounded-xl transition-all text-sm shadow-xs flex items-center justify-center gap-2"
              >
                <span>Checkout & Pay →</span>
              </button>
            ) : activeTabOrder && !isServedOrCompleted ? (
              // CASE 3: Order sent but STILL IN KITCHEN / WAITER WORKFLOW (Pending, Preparing, Ready) -> Checkout DISABLED!
              <button
                disabled
                className="w-full py-3 bg-neutral-800 text-neutral-400 border border-neutral-700 font-extrabold rounded-xl text-sm cursor-not-allowed flex items-center justify-center gap-2"
                title="Checkout will enable once food is Served to table"
              >
                <span>Checkout & Pay (Waiting for Served)</span>
              </button>
            ) : (
              // CASE 4: Cart empty & no active order
              <button
                disabled
                className="w-full py-3 bg-amber-500/40 text-neutral-950/60 font-extrabold rounded-xl text-sm cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>Checkout & Pay →</span>
              </button>
            )}

            {/* Clear Cart Link */}
            {cart.length > 0 && !activeTabOrder && (
              <div className="text-right pt-1">
                <button
                  onClick={() => { setCart([]); toast('Cart cleared', { icon: '🗑️' }); }}
                  className="text-[11px] font-bold text-rose-500 hover:underline flex items-center justify-end gap-1 ml-auto"
                >
                  <Trash2 className="w-3 h-3" /> Clear Cart
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutOrder && (
        <CheckoutModal
          order={checkoutOrder}
          userRole={userRole}
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
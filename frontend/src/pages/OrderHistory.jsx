import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import CheckoutModal from '../components/CheckoutModal';
import ReceiptModal from '../components/ReceiptModal';
import {
  ClipboardList,
  RefreshCw,
  CreditCard,
  Printer,
  ChevronDown,
  Search,
  Filter,
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
  unpaid:         'bg-rose-500/10 text-rose-500 border-rose-500/20',
  partially_paid: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  paid:           'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
};

const PAY_STATUS_LABELS = {
  unpaid: 'Unpaid',
  partially_paid: 'Partial',
  paid: 'Paid',
};

function OrderHistory() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter]   = useState('all');
  const [typeFilter, setTypeFilter]       = useState('all');
  const [payFilter, setPayFilter]         = useState('all');
  const [dateFilter, setDateFilter]       = useState('');
  const [searchQuery, setSearchQuery]     = useState('');

  // Modals
  const [checkoutOrder, setCheckoutOrder]   = useState(null);
  const [receiptOrder, setReceiptOrder]     = useState(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [userRole, setUserRole]             = useState('');

  const fetchOrders = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/orders');
      setOrders(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    api.get('/auth/me')
      .then((res) => {
        const user = res.data.data;
        setRestaurantName(user.restaurantName || user.name || 'Restaurant');
        setUserRole(user.role || '');
      })
      .catch(() => {});
  }, []);

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status } : o));
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handlePaymentSubmit = async ({ payments, changeAmount, couponCode }) => {
    const res = await api.put(`/orders/${checkoutOrder._id}/pay`, { payments, changeAmount, couponCode });
    const updatedOrder = res.data.data;
    setCheckoutOrder(null);
    setReceiptOrder(updatedOrder);
    fetchOrders();
    toast.success('Payment recorded!');
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (typeFilter !== 'all' && o.orderType !== typeFilter) return false;
    if (payFilter !== 'all' && o.paymentStatus !== payFilter) return false;
    if (dateFilter) {
      const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
      if (orderDate !== dateFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesNum = o.orderNumber?.toLowerCase().includes(q);
      const matchesCust = o.customerId?.name?.toLowerCase().includes(q);
      const matchesTable = o.tableId?.tableNumber?.toLowerCase().includes(q);
      if (!matchesNum && !matchesCust && !matchesTable) return false;
    }
    return true;
  });

  // Stats
  const stats = {
    total:     orders.length,
    completed: orders.filter((o) => o.status === 'completed').length,
    unpaid:    orders.filter((o) => o.paymentStatus === 'unpaid').length,
    revenue:   orders.filter((o) => o.paymentStatus === 'paid').reduce((s, o) => s + (o.total || 0), 0),
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatItems = (items = []) => {
    return items.slice(0, 3).map((i) => `${i.quantity}x ${i.name}`).join(', ')
      + (items.length > 3 ? ` +${items.length - 3} more` : '');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <ClipboardList className="w-6 h-6 text-amber-500" />
            </div>
            Order History
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 ml-1">
            Track, filter, and manage all customer orders
          </p>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-sm font-bold hover:border-amber-500/50 transition disabled:opacity-60 self-start md:self-auto shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Orders'}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: stats.total, color: 'text-neutral-900 dark:text-white' },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-500' },
          { label: 'Unpaid', value: stats.unpaid, color: 'text-rose-500' },
          { label: 'Revenue (Paid)', value: `Rs. ${stats.revenue.toLocaleString()}`, color: 'text-amber-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{s.label}</p>
            <p className={`text-xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-neutral-400 flex-shrink-0" />

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="dine-in">Dine-In</option>
              <option value="takeaway">Takeaway</option>
              <option value="delivery">Delivery</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Payment Filter */}
          <div className="relative">
            <select
              value={payFilter}
              onChange={(e) => setPayFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-xs font-semibold bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">All Payments</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partial</option>
              <option value="paid">Paid</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          />

          {/* Search */}
          <div className="relative ml-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer..."
              className="pl-8 pr-4 py-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 w-52"
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Result count */}
          <span className="text-xs font-semibold text-neutral-400 whitespace-nowrap">
            {filteredOrders.length} of {orders.length}
          </span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-14 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-4 text-neutral-400">
            <ClipboardList className="w-12 h-12 opacity-20" />
            <div>
              <p className="font-semibold text-sm">No orders match your filters</p>
              <p className="text-xs mt-1 opacity-70">Try changing filters or refresh</p>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 text-[11px] uppercase tracking-wider font-bold text-neutral-500 dark:text-neutral-400">
                  <th className="px-3 py-3">Order #</th>
                  <th className="px-3 py-3">Date / Time</th>
                  <th className="px-3 py-3">Type & Table</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Items Summary</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-3 py-3">Payment</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                    {/* Order # */}
                    <td className="px-3 py-3">
                      <span className="font-mono font-bold text-amber-500">#{order.orderNumber}</span>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-3 text-neutral-500 dark:text-neutral-400 whitespace-nowrap text-[11px]">
                      {formatDate(order.createdAt)}
                    </td>

                    {/* Type & Table */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                          {order.orderType}
                        </span>
                        {order.tableId && (
                          <span className="text-[10px] text-neutral-400 font-medium">T{order.tableId.tableNumber}</span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-3 py-3 text-neutral-700 dark:text-neutral-300 font-medium">
                      {order.customerId ? order.customerId.name : <span className="text-neutral-500 italic text-[11px]">Walk-in</span>}
                    </td>

                    {/* Items Summary */}
                    <td className="px-3 py-3 max-w-[180px]">
                      <p className="text-[11px] text-neutral-400 truncate" title={order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}>
                        {formatItems(order.items)}
                      </p>
                    </td>

                    {/* Total */}
                    <td className="px-3 py-3 font-extrabold text-neutral-900 dark:text-white whitespace-nowrap">
                      Rs. {(order.total || 0).toLocaleString()}
                    </td>

                    {/* Payment Status */}
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${PAY_STATUS_COLORS[order.paymentStatus] || ''}`}>
                        {PAY_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                      </span>
                    </td>

                    {/* Status (editable with workflow validation) */}
                    <td className="px-3 py-3">
                      {['completed', 'cancelled'].includes(order.status) ? (
                        <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[order.status] || ''}`}>
                          {order.status}
                        </span>
                      ) : (
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none bg-transparent ${STATUS_COLORS[order.status] || ''}`}
                        >
                          {/* Current Status */}
                          <option value={order.status} className="bg-neutral-900 text-white" disabled>
                            {order.status.toUpperCase()} (Current)
                          </option>

                          {/* Forward Transitions */}
                          {order.status === 'pending' && (
                            <>
                              <option value="confirmed" className="bg-neutral-900 text-white">Confirmed</option>
                              <option value="preparing" className="bg-neutral-900 text-white">Preparing</option>
                              <option value="ready" className="bg-neutral-900 text-white">Ready</option>
                              <option value="completed" className="bg-neutral-900 text-white">Completed</option>
                            </>
                          )}
                          {order.status === 'confirmed' && (
                            <>
                              <option value="preparing" className="bg-neutral-900 text-white">Preparing</option>
                              <option value="ready" className="bg-neutral-900 text-white">Ready</option>
                              <option value="completed" className="bg-neutral-900 text-white">Completed</option>
                            </>
                          )}
                          {order.status === 'preparing' && (
                            <>
                              <option value="ready" className="bg-neutral-900 text-white">Ready</option>
                              <option value="completed" className="bg-neutral-900 text-white">Completed</option>
                            </>
                          )}
                          {order.status === 'ready' && (
                            <option value="completed" className="bg-neutral-900 text-white">Completed</option>
                          )}
                          
                          {/* Cancel option only available before food is Ready */}
                          {['pending', 'confirmed', 'preparing'].includes(order.status) && (
                            <option value="cancelled" className="bg-neutral-900 text-rose-400 font-bold">Cancelled</option>
                          )}
                        </select>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.paymentStatus === 'paid' ? (
                          <button
                            onClick={() => setReceiptOrder(order)}
                            title="View / Print Receipt"
                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>
                        ) : order.status !== 'cancelled' ? (
                          <button
                            onClick={() => setCheckoutOrder(order)}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-lg text-xs font-extrabold transition flex items-center gap-1 shadow-xs"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Now</span>
                          </button>
                        ) : null}
                      </div>
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

export default OrderHistory;

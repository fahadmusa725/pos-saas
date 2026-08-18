import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import ScreenNavPanel from '../components/ScreenNavPanel';
import {
  Bell,
  CheckCircle2,
  Clock,
  Utensils,
  Armchair,
  ShoppingBag,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  X,
} from 'lucide-react';

function WaiterScreen() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'history'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioEnabledRef = useRef(true); // ref so socket callbacks get fresh value
  const [updatingItemId, setUpdatingItemId] = useState(null);

  // Notification bell state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  // History tab states
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyLimit, setHistoryLimit] = useState(50);
  const [historyLoading, setHistoryLoading] = useState(false);

  const socketRef = useRef(null);

  // Keep ref in sync with state (fixes stale closure in socket callbacks)
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);

  // Audio notification when kitchen marks item as ready
  const playReadySound = () => {
    if (!audioEnabledRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const doPlay = () => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      };
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(doPlay);
      } else {
        doPlay();
      }
    } catch (e) {
      console.warn('Audio playback policy restriction:', e);
    }
  };

  const fetchReadyOrders = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError('');
      const res = await api.get('/orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load active orders');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchServedHistory = async (limitVal = historyLimit) => {
    try {
      setHistoryLoading(true);
      const res = await api.get(`/orders?date=today&limit=${limitVal}`);
      if (res.data.success) {
        setHistoryOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch served history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchReadyOrders(true);

    // Socket.io real-time connection
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      if (user?.restaurantId) {
        socket.emit('joinRestaurant', user.restaurantId);
      }
    });

    socket.on('newOrder', () => {
      fetchReadyOrders(false);
    });

    socket.on('orderItemStatusUpdated', ({ status }) => {
      if (status === 'ready') {
        playReadySound();
        toast.success('🔔 Order item is READY to serve!', { duration: 4000 });
      }
      fetchReadyOrders(false);
      if (activeTab === 'history') fetchServedHistory();
    });

    socket.on('orderStatusUpdated', (updatedOrder) => {
      if (updatedOrder && (updatedOrder.status === 'completed' || updatedOrder.status === 'cancelled' || updatedOrder.paymentStatus === 'paid')) {
        setOrders((prev) => prev.filter((o) => o._id !== updatedOrder._id));
      } else {
        fetchReadyOrders(false);
      }
      if (activeTab === 'history') fetchServedHistory();
    });

    socket.on('orderCompleted', (completedOrder) => {
      const orderId = completedOrder?._id || completedOrder;
      if (orderId) {
        setOrders((prev) => prev.filter((o) => o._id !== orderId));
      }
      if (activeTab === 'history') fetchServedHistory();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, activeTab]);

  // Fetch notifications (low-stock + recent orders)
  const fetchNotifications = async () => {
    try {
      const notifList = [];
      const readNotifIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');

      try {
        const invRes = await api.get('/inventory');
        (invRes.data?.data || []).forEach((item) => {
          if (item.currentStock <= item.reorderLevel) {
            const id = `stock-${item._id}`;
            notifList.push({
              id,
              type: 'stock',
              title: `Low Stock: ${item.name}`,
              body: `${item.currentStock} ${item.unit || 'units'} left (min: ${item.reorderLevel})`,
              time: item.updatedAt || item.createdAt,
              read: readNotifIds.includes(id),
            });
          }
        });
      } catch (_) {}
      try {
        const ordRes = await api.get('/orders');
        (ordRes.data?.data || []).slice(0, 5).forEach((ord) => {
          const amt = ord.total ?? ord.grandTotal ?? ord.totalAmount;
          const id = `order-${ord._id}`;
          notifList.push({
            id,
            type: 'order',
            title: `New Order #${ord.orderNumber || ord._id?.slice(-4).toUpperCase()}`,
            body: `${ord.items?.length || 0} items · Rs. ${amt != null ? Number(amt).toFixed(0) : '—'} · ${ord.status}`,
            time: ord.createdAt,
            read: readNotifIds.includes(id),
          });
        });
      } catch (_) {}
      notifList.sort((a, b) => new Date(b.time) - new Date(a.time));
      setNotifications(notifList);
      setUnreadCount(notifList.filter((n) => !n.read).length);
    } catch (_) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close notification panel on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAsRead = (id) => {
    const readNotifIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    if (!readNotifIds.includes(id)) {
      const updatedRead = [...readNotifIds, id];
      localStorage.setItem('read_notifications', JSON.stringify(updatedRead));
    }
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      setUnreadCount(updated.filter((n) => !n.read).length);
      return updated;
    });
  };

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    localStorage.setItem('read_notifications', JSON.stringify(allIds));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchServedHistory(historyLimit);
    }
  }, [activeTab, historyLimit]);

  const handleMarkAsServed = async (orderId, itemId) => {
    setUpdatingItemId(itemId);
    try {
      await api.put(`/orders/${orderId}/items/${itemId}/status`, { status: 'served' });
      toast.success('Item marked as SERVED!');
      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order._id === orderId) {
            const updatedItems = order.items.map((it) =>
              it._id === itemId ? { ...it, status: 'served' } : it
            );
            return { ...order, items: updatedItems };
          }
          return order;
        })
      );
      if (activeTab === 'history') fetchServedHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update item status');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Filter orders that have items ready to be served (and ignore completed/paid/cancelled orders)
  const readyOrders = orders.filter(
    (order) =>
      order.status !== 'completed' &&
      order.status !== 'cancelled' &&
      order.paymentStatus !== 'paid' &&
      (order.items || []).some((item) => item.status === 'ready')
  );

  // Extract served items for history tab
  const servedItemsList = [];
  historyOrders.forEach((order) => {
    if (order.status === 'cancelled') return;
    const tableNum =
      order.tableId?.tableNumber ??
      order.tableNumber ??
      (order.orderType === 'dine-in' ? 'T-?' : order.orderType === 'takeaway' ? 'Takeaway' : 'Delivery');

    (order.items || []).forEach((item) => {
      if (item.status === 'served' || order.status === 'completed') {
        servedItemsList.push({
          ...item,
          orderId: order._id,
          orderNumber: order.orderNumber || order._id.slice(-6),
          orderType: order.orderType,
          tableNum,
          servedTime: item.updatedAt || order.updatedAt || order.createdAt,
        });
      }
    });
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:px-6 shadow-xl">
        <div className="flex items-center gap-3">
          {/* Hamburger menu moved to LEFT side */}
          <ScreenNavPanel />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <Bell className="w-6 h-6 text-amber-500 animate-pulse" /> Waiter Delivery Screen
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {activeTab === 'queue' ? 'Live Queue' : 'Served History'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Pickup orders marked ready by the kitchen and deliver to table
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          {/* Bell Notification Icon — BEFORE Live Queue tab buttons */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((p) => !p)}
              className="relative p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-400 transition border border-neutral-700"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-extrabold px-1 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-extrabold text-white uppercase tracking-wide truncate">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 bg-amber-500 text-neutral-950 text-[10px] font-extrabold rounded-full shrink-0 whitespace-nowrap">{unreadCount} new</span>
                    )}
                  </div>
                  <button
                    onClick={markAllRead}
                    className="text-xs text-neutral-400 hover:text-amber-400 transition font-semibold shrink-0 whitespace-nowrap"
                  >Mark all as read</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-neutral-500 text-sm">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                      All clear!
                    </div>
                  ) : notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-neutral-800 last:border-0 transition group ${
                        !notif.read ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-neutral-800/50'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                        notif.type === 'stock' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {notif.type === 'stock' ? <AlertTriangle className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-neutral-100 leading-tight">{notif.title}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5 leading-snug">{notif.body}</p>
                        <button
                          onClick={() => {
                            setNotifOpen(false);
                            markAsRead(notif.id);
                            if (notif.type === 'stock') {
                              const itemId = notif.id.replace('stock-', '');
                              navigate(`/dashboard/inventory?highlight=${itemId}`);
                            } else {
                              navigate('/dashboard/order-history');
                            }
                          }}
                          className="mt-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition"
                        >
                          {notif.type === 'stock' ? 'Click to inspect stock in Inventory →' : 'View Order History →'}
                        </button>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                        className="p-1 rounded-lg text-neutral-600 hover:text-white hover:bg-neutral-700 transition opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tab Selector */}
          <div className="flex items-center p-1 rounded-xl bg-neutral-950 border border-neutral-800">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'queue'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Live Queue ({readyOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Served History (Today)
            </button>
          </div>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
              audioEnabled
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
            title={audioEnabled ? 'Audio Alert Enabled' : 'Audio Muted'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{audioEnabled ? 'Sound On' : 'Muted'}</span>
          </button>

          <button
            onClick={() => {
              if (activeTab === 'queue') fetchReadyOrders();
              else fetchServedHistory();
            }}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || historyLoading) ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'queue' ? (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
            <p className="text-rose-500 font-semibold">{error}</p>
            <button
              onClick={fetchReadyOrders}
              className="px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded-xl text-xs"
            >
              Retry
            </button>
          </div>
        ) : readyOrders.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center space-y-3">
            <div className="p-4 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">All Orders Served!</h3>
            <p className="text-xs text-neutral-400 max-w-sm">
              No items are currently waiting to be served. New ready orders from the kitchen will appear here automatically in real time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {readyOrders.map((order) => {
              const tableNum =
                order.tableId?.tableNumber ??
                order.tableNumber ??
                (order.orderType === 'dine-in' ? 'T-?' : 'Takeaway');

              const readyItems = (order.items || []).filter((item) => item.status === 'ready');
              const createdTime = order.createdAt
                ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={order._id}
                  className="bg-neutral-900 border-2 border-amber-500/40 rounded-2xl shadow-xl flex flex-col justify-between overflow-hidden"
                >
                  {/* Order Top Bar */}
                  <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-500 text-neutral-950 font-extrabold text-sm flex items-center justify-center">
                        <Armchair className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-white tracking-tight">
                          Table {tableNum}
                        </h3>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          #{order.orderNumber || order._id.slice(-6)} • {order.orderType}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {createdTime}
                      </span>
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mt-0.5">
                        {readyItems.length} {readyItems.length === 1 ? 'item' : 'items'} ready
                      </span>
                    </div>
                  </div>

                  {/* Ready Items List */}
                  <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-80">
                    {readyItems.map((item) => (
                      <div
                        key={item._id}
                        className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between gap-3 hover:border-amber-500/30 transition"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-amber-500 text-sm">
                              {item.quantity}x
                            </span>
                            <span className="font-bold text-white text-sm">{item.name}</span>
                            {item.round > 1 && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                                R{item.round}
                              </span>
                            )}
                          </div>
                          {item.addOns && item.addOns.length > 0 && (
                            <p className="text-[11px] text-neutral-400 pl-6">
                              + {item.addOns.map((a) => a.name).join(', ')}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleMarkAsServed(order._id, item._id)}
                          disabled={updatingItemId === item._id}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-neutral-950 font-extrabold text-xs transition shadow-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{updatingItemId === item._id ? 'Serving...' : 'Mark Served'}</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer */}
                  <div className="p-3 bg-neutral-950/80 border-t border-neutral-800 text-center">
                    <p className="text-[11px] text-neutral-500 font-medium">
                      Deliver ready items to Table {tableNum}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Served History View */
        <div className="space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Served History (Today)
                </h2>
                <p className="text-xs text-neutral-400">
                  Record of items served to customers today
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                {servedItemsList.length} items served
              </span>
            </div>

            {historyLoading ? (
              <div className="p-8 text-center text-neutral-400 animate-pulse text-sm">
                Loading today's served history...
              </div>
            ) : servedItemsList.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 text-sm">
                No items have been marked as served today yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-neutral-950 text-xs uppercase tracking-wider font-semibold text-neutral-400 border-b border-neutral-800">
                      <th className="px-4 py-3">Item Name</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Table / Type</th>
                      <th className="px-4 py-3">Order #</th>
                      <th className="px-4 py-3">Served Time</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {servedItemsList.map((item, idx) => (
                      <tr key={`${item.orderId}-${item._id || idx}`} className="hover:bg-neutral-800/40 transition">
                        <td className="px-4 py-3.5 font-bold text-white">
                          {item.name}
                          {item.variant && <span className="text-xs text-amber-400 block font-normal">{item.variant}</span>}
                        </td>
                        <td className="px-4 py-3.5 font-extrabold text-amber-500">{item.quantity}x</td>
                        <td className="px-4 py-3.5 text-neutral-300">
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-xs font-semibold">
                            Table {item.tableNum}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-neutral-400">#{item.orderNumber}</td>
                        <td className="px-4 py-3.5 text-xs text-neutral-400">
                          {new Date(item.servedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Served
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Load More Pagination */}
            {historyOrders.length >= historyLimit && (
              <div className="mt-4 text-center border-t border-neutral-800 pt-4">
                <button
                  onClick={() => setHistoryLimit((prev) => prev + 50)}
                  disabled={historyLoading}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white font-bold rounded-xl text-xs transition border border-neutral-700 disabled:opacity-50"
                >
                  {historyLoading ? 'Loading...' : 'Load 50 More Served Items'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WaiterScreen;

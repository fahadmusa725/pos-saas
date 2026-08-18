import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import ScreenNavPanel from '../components/ScreenNavPanel';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles,
  Flame,
  Utensils,
  AlertCircle,
  Bell,
  AlertTriangle,
  ShoppingBag,
  X,
} from 'lucide-react';

function KitchenDisplay() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioEnabledRef = useRef(true); // ref so socket callbacks get fresh value

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

  // Audio beep notification helper using Web Audio API
  const playNewOrderSound = () => {
    if (!audioEnabledRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      // Resume context if suspended (browser autoplay policy)
      const doPlay = () => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
      };
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(doPlay);
      } else {
        doPlay();
      }
    } catch (e) {
      console.warn('Audio playback restricted by browser policy:', e);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/orders');
      if (res.data.success) {
        // Only keep active orders in Kitchen Display (pending, confirmed, preparing, ready)
        const active = res.data.data.filter(
          (o) => !['completed', 'cancelled'].includes(o.status)
        );
        setOrders(active);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load kitchen orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderHistory = async (limitVal = historyLimit) => {
    try {
      setHistoryLoading(true);
      const res = await api.get(`/orders?date=today&limit=${limitVal}`);
      if (res.data.success) {
        setHistoryOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch kitchen order history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchOrderHistory(historyLimit);
    }
  }, [activeTab, historyLimit]);

  useEffect(() => {
    fetchActiveOrders();

    // Socket.io connection setup
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('KDS Connected to Socket server:', socket.id);
      if (user?.restaurantId) {
        socket.emit('joinRestaurant', user.restaurantId);
      }
    });

    // Listen to real-time events emitted by backend orderController
    socket.on('newOrder', (newOrder) => {
      console.log('KDS Received new order:', newOrder);
      playNewOrderSound();
      setOrders((prev) => [newOrder, ...prev.filter((o) => o._id !== newOrder._id)]);
      if (activeTab === 'history') fetchOrderHistory();
    });

    socket.on('orderStatusUpdated', (updatedOrder) => {
      setOrders((prev) =>
        prev
          .map((ord) => (ord._id === updatedOrder._id ? updatedOrder : ord))
          .filter((ord) => !['completed', 'cancelled'].includes(ord.status))
      );
      if (activeTab === 'history') fetchOrderHistory();
    });

    socket.on('orderItemStatusUpdated', ({ orderId, itemId, status }) => {
      setOrders((prev) =>
        prev.map((ord) => {
          if (ord._id === orderId) {
            const updatedItems = ord.items.map((item) =>
              item._id === itemId ? { ...item, status } : item
            );
            return { ...ord, items: updatedItems };
          }
          return ord;
        })
      );
      if (activeTab === 'history') fetchOrderHistory();
    });

    socket.on('orderCompleted', () => {
      fetchActiveOrders();
      if (activeTab === 'history') fetchOrderHistory();
    });

    return () => {
      socket.disconnect();
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
      fetchOrderHistory(historyLimit);
    }
  }, [activeTab, historyLimit]);

  const handleUpdateItemStatus = async (orderId, itemId, nextStatus) => {
    try {
      await api.put(`/orders/${orderId}/items/${itemId}/status`, {
        status: nextStatus,
      });
      if (activeTab === 'history') fetchOrderHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update item status');
    }
  };

  const getTimeElapsed = (createdAt) => {
    const diffInMins = Math.floor((new Date() - new Date(createdAt)) / 60000);
    if (diffInMins < 1) return 'Just now';
    if (diffInMins >= 60) {
      const hours = Math.floor(diffInMins / 60);
      const mins = diffInMins % 60;
      return `${hours}h ${mins}m ago`;
    }
    return `${diffInMins} min ago`;
  };

  // Filter orders to only those containing items that are pending or preparing
  const kitchenOrders = orders
    .map((ord) => ({
      ...ord,
      kitchenItems: (ord.items || []).filter(
        (item) => !item.status || item.status === 'pending' || item.status === 'preparing'
      ),
    }))
    .filter((ord) => ord.kitchenItems.length > 0);

  // Extract completed/ready items for history tab
  const historyItemsList = [];
  historyOrders.forEach((order) => {
    if (order.status === 'cancelled') return;
    const tableNum =
      order.tableId?.tableNumber ??
      order.tableNumber ??
      (order.orderType === 'dine-in' ? 'T-?' : order.orderType === 'takeaway' ? 'Takeaway' : 'Delivery');

    (order.items || []).forEach((item) => {
      if (item.status === 'ready' || item.status === 'served' || order.status === 'completed') {
        historyItemsList.push({
          ...item,
          orderId: order._id,
          orderNumber: order.orderNumber || order._id.slice(-6),
          orderType: order.orderType,
          tableNum,
          completedTime: item.updatedAt || order.updatedAt || order.createdAt,
        });
      }
    });
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-6 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:px-6 shadow-xl">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu moved to LEFT side */}
          <ScreenNavPanel />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <ChefHat className="w-6 h-6 text-amber-500" /> Kitchen Display System (KDS)
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {activeTab === 'live' ? 'Live Feed' : 'Order History'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Manage live kitchen item preparation and view past completed tickets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          {/* Bell Notification Icon — BEFORE tab buttons */}
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
              onClick={() => setActiveTab('live')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'live'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Live Feed ({kitchenOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Order History (Today)
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
              if (activeTab === 'live') fetchActiveOrders();
              else fetchOrderHistory();
            }}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || historyLoading) ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'live' ? (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-64 bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3">
            <p className="text-rose-500 font-semibold">{error}</p>
            <button
              onClick={fetchActiveOrders}
              className="px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded-xl text-xs"
            >
              Retry
            </button>
          </div>
        ) : kitchenOrders.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center space-y-3">
            <div className="p-4 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">All Caught Up!</h3>
            <p className="text-xs text-neutral-400 max-w-sm">
              No pending kitchen items right now. New incoming items will pop up here automatically in real time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {kitchenOrders.map((order) => {
              const diffMins = Math.floor((new Date() - new Date(order.createdAt)) / 60000);
              const isUrgent = diffMins > 15;
              const tableNum =
                order.tableId?.tableNumber ??
                order.tableNumber ??
                (order.orderType === 'dine-in' ? 'T-?' : 'Takeaway');

              return (
                <div
                  key={order._id}
                  className={`bg-neutral-900 border-2 rounded-2xl flex flex-col justify-between overflow-hidden shadow-xl transition-all ${
                    isUrgent ? 'border-rose-500/80 shadow-rose-900/20' : 'border-amber-500/30'
                  }`}
                >
                  {/* Card Top Banner */}
                  <div className={`p-4 border-b flex justify-between items-center ${
                    isUrgent ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-lg text-white">#{order.orderNumber}</span>
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
                        <span className="capitalize font-bold text-amber-400">{order.orderType}</span>
                        <span className="bg-neutral-950 text-neutral-200 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-neutral-800">
                          Table {tableNum}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-mono px-2 py-1 rounded-lg border flex items-center gap-1 ${
                        isUrgent ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 font-bold' : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        {getTimeElapsed(order.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Order Kitchen Items List grouped by Round */}
                  <div className="p-4 flex-1 space-y-4 overflow-y-auto max-h-80">
                    {(() => {
                      const itemsByRound = (order.kitchenItems || []).reduce((acc, item) => {
                        const r = item.round || 1;
                        if (!acc[r]) acc[r] = [];
                        acc[r].push(item);
                        return acc;
                      }, {});

                      return Object.entries(itemsByRound).map(([roundNum, items]) => (
                        <div key={roundNum} className="space-y-2 border-b border-neutral-800 pb-3 last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Round {roundNum} {Number(roundNum) > 1 ? '• ADDITION' : ''}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {items.length} {items.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {items.map((item) => {
                              const isPreparing = item.status === 'preparing';
                              return (
                                <div key={item._id} className="flex items-center justify-between gap-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-amber-500 text-neutral-950 font-extrabold px-2 py-0.5 rounded text-xs">
                                        {item.quantity}x
                                      </span>
                                      <span className="font-bold text-white text-sm truncate">{item.name}</span>
                                    </div>

                                    {item.variant && (
                                      <div className="text-xs text-amber-400 font-medium ml-7 mt-0.5">
                                        Variant: {item.variant}
                                      </div>
                                    )}

                                    {item.addOns && item.addOns.length > 0 && (
                                      <div className="text-xs text-neutral-400 ml-7">
                                        + {item.addOns.map((a) => a.name).join(', ')}
                                      </div>
                                    )}

                                    {item.notes && (
                                      <div className="text-xs italic text-rose-400 bg-rose-500/10 border border-rose-500/20 p-1.5 rounded mt-1 ml-7">
                                        Note: {item.notes}
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Button */}
                                  <button
                                    onClick={() =>
                                      handleUpdateItemStatus(
                                        order._id,
                                        item._id,
                                        isPreparing ? 'ready' : 'preparing'
                                      )
                                    }
                                    className={`px-3 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5 active:scale-95 ${
                                      isPreparing
                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 animate-pulse'
                                        : 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                                    }`}
                                  >
                                    {isPreparing ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Ready for Waiter</span>
                                      </>
                                    ) : (
                                      <>
                                        <Flame className="w-3.5 h-3.5" />
                                        <span>Start Prep</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Order History View */
        <div className="space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Kitchen Order History (Today)
                </h2>
                <p className="text-xs text-neutral-400">
                  Record of items prepared and completed by kitchen today
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                {historyItemsList.length} items completed
              </span>
            </div>

            {historyLoading ? (
              <div className="p-8 text-center text-neutral-400 animate-pulse text-sm">
                Loading today's order history...
              </div>
            ) : historyItemsList.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 text-sm">
                No items have been completed by the kitchen today yet.
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
                      <th className="px-4 py-3">Ready Time</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {historyItemsList.map((item, idx) => (
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
                          {new Date(item.completedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {item.status === 'served' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Served
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          )}
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
                  {historyLoading ? 'Loading...' : 'Load 50 More History Items'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default KitchenDisplay;

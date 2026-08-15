import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
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
} from 'lucide-react';

function WaiterScreen() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const socketRef = useRef(null);

  // Audio notification when kitchen marks item as ready
  const playReadySound = () => {
    if (!audioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio playback policy restriction:', e);
    }
  };

  const fetchReadyOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load active orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadyOrders();

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
      fetchReadyOrders();
    });

    socket.on('orderItemStatusUpdated', ({ status }) => {
      if (status === 'ready') {
        playReadySound();
        toast.success('🔔 Order item is READY to serve!', { duration: 4000 });
      }
      fetchReadyOrders();
    });

    socket.on('orderStatusUpdated', () => {
      fetchReadyOrders();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

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
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update item status');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Filter orders that have items ready to be served
  const readyOrders = orders.filter((order) =>
    (order.items || []).some((item) => item.status === 'ready')
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 md:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:px-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <Bell className="w-6 h-6 text-amber-500 animate-pulse" /> Waiter Delivery Screen
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Live Waiter Queue
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Pickup orders marked ready by the kitchen and deliver to table
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
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
            onClick={fetchReadyOrders}
            className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <ScreenNavPanel />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
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
      )}
    </div>
  );
}

export default WaiterScreen;

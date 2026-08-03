import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

function KitchenDisplay() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const socketRef = useRef(null);

  // Audio beep notification helper using Web Audio API
  const playNewOrderSound = () => {
    if (!audioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio playback restricted by browser policy:', e);
    }
  };

  useEffect(() => {
    fetchActiveOrders();

    // Socket.io connection setup
    const socket = io('http://localhost:5000');
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
      setOrders((prev) => [newOrder, ...prev]);
    });

    socket.on('orderStatusUpdated', (updatedOrder) => {
      setOrders((prev) =>
        prev
          .map((ord) => (ord._id === updatedOrder._id ? updatedOrder : ord))
          .filter((ord) => !['completed', 'cancelled'].includes(ord.status))
      );
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
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const fetchActiveOrders = async () => {
    try {
      setLoading(true);
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

  const handleUpdateItemStatus = async (orderId, itemId, currentStatus) => {
    const statusMap = {
      pending: 'preparing',
      preparing: 'ready',
      ready: 'served',
    };
    const nextStatus = statusMap[currentStatus] || 'ready';

    try {
      await api.put(`/orders/${orderId}/items/${itemId}/status`, {
        status: nextStatus,
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update item status');
    }
  };

  const handleUpdateOrderStatus = async (orderId, nextStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: nextStatus });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const getItemStatusBadgeClass = (status) => {
    switch (status) {
      case 'preparing':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ready':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'served':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getOrderStatusBadgeClass = (status) => {
    switch (status) {
      case 'preparing':
        return 'bg-amber-500 text-white';
      case 'ready':
        return 'bg-emerald-500 text-white';
      case 'confirmed':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition border border-gray-600"
          >
            ← Exit KDS
          </Link>
          <div className="h-5 w-px bg-gray-700"></div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-xl font-bold tracking-wide text-white">KITCHEN DISPLAY SYSTEM (KDS)</h1>
            <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs font-semibold">
              {orders.length} Active {orders.length === 1 ? 'Order' : 'Orders'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition ${
              audioEnabled
                ? 'bg-emerald-950 border-emerald-700 text-emerald-400'
                : 'bg-gray-700 border-gray-600 text-gray-400'
            }`}
          >
            🔊 Sound: {audioEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={fetchActiveOrders}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
          >
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Main Order Cards Grid */}
      <main className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            Connecting to live kitchen feed...
          </div>
        ) : error ? (
          <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-xl text-center">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-gray-500 space-y-2">
            <div className="text-4xl">🍳</div>
            <p className="text-lg font-medium">All caught up! No active kitchen orders.</p>
            <p className="text-sm text-gray-600">New incoming orders will pop up here in real time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map((order) => {
              const diffMins = Math.floor((new Date() - new Date(order.createdAt)) / 60000);
              const isUrgent = diffMins > 15;
              return (
                <div
                  key={order._id}
                  className={`bg-gray-800 border rounded-2xl flex flex-col justify-between overflow-hidden shadow-lg transition-all ${
                    isUrgent ? 'border-red-500/80 shadow-red-900/20' : 'border-gray-700'
                  }`}
                >
                  {/* Card Top Banner */}
                  <div className="bg-gray-750 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-lg text-white">#{order.orderNumber}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${getOrderStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        <span className="capitalize font-medium text-amber-400">{order.orderType}</span>
                        {order.tableId && (
                          <span className="bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded text-[11px]">
                            Table {order.tableId.tableNumber || order.tableId}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono px-2 py-1 rounded-md border ${
                        isUrgent ? 'bg-red-950 border-red-700 text-red-300 font-bold' : 'bg-gray-900 border-gray-700 text-gray-300'
                      }`}>
                        ⏱ {getTimeElapsed(order.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Order Items List */}
                  <div className="p-4 flex-1 space-y-3 divide-y divide-gray-700/50 overflow-y-auto max-h-72">
                    {order.items.map((item) => (
                      <div key={item._id} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-900 text-blue-200 font-bold px-2 py-0.5 rounded text-sm">
                              {item.quantity}x
                            </span>
                            <span className="font-semibold text-gray-100 text-sm">{item.name}</span>
                          </div>

                          {item.variant && (
                            <div className="text-xs text-amber-300 font-medium ml-8">
                              Variant: {item.variant}
                            </div>
                          )}

                          {item.addOns && item.addOns.length > 0 && (
                            <div className="text-xs text-gray-400 ml-8">
                              + {item.addOns.map((a) => a.name).join(', ')}
                            </div>
                          )}

                          {item.notes && (
                            <div className="text-xs italic text-red-300 bg-red-950/40 border border-red-900/50 p-1 rounded mt-1 ml-8">
                              Note: {item.notes}
                            </div>
                          )}
                        </div>

                        {/* Item Status Clickable Pill */}
                        <button
                          onClick={() => handleUpdateItemStatus(order._id, item._id, item.status)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer hover:opacity-85 ${getItemStatusBadgeClass(item.status)}`}
                        >
                          {item.status || 'pending'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer Actions (Contextual button logic) */}
                  <div className="p-3 bg-gray-900/80 border-t border-gray-700 flex gap-2">
                    {['pending', 'confirmed'].includes(order.status) && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order._id, 'preparing')}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 rounded-lg transition"
                      >
                        🔥 Mark Preparing
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order._id, 'ready')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition"
                      >
                        ✅ Mark Order Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <div className="w-full text-center text-xs font-bold text-emerald-400 py-1.5 bg-emerald-950/60 border border-emerald-800/80 rounded-lg">
                        ✔ Order Ready for Pickup / Serving
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default KitchenDisplay;

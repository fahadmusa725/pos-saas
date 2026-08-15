import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { APP_MODULES } from '../config/modules';
import {
  Menu, X, Bell, LayoutDashboard, Grid, UtensilsCrossed,
  ShoppingBag, Armchair, Users, UserCheck, Truck, Package,
  ClipboardList, Receipt, BarChart3, Tag, LogOut, Store,
  AlertTriangle, ChefHat, CheckCircle2,
} from 'lucide-react';

const MODULE_ICONS = {
  overview: LayoutDashboard,
  categories: Grid,
  'menu-items': UtensilsCrossed,
  orders: ShoppingBag,
  tables: Armchair,
  staff: Users,
  kds: ChefHat,
  'waiter-screen': Bell,
  customers: UserCheck,
  suppliers: Truck,
  inventory: Package,
  'purchase-orders': ClipboardList,
  expenses: Receipt,
  reports: BarChart3,
  coupons: Tag,
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function ScreenNavPanel({ theme = 'dark' }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  // Sidebar panel state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Restaurant name (fetched live from API like DashboardLayout)
  const [restaurantName, setRestaurantName] = useState('');

  // Notifications state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  // Fetch restaurant name on mount
  useEffect(() => {
    if (user?.restaurantId) {
      api.get('/auth/me/restaurant')
        .then((res) => {
          if (res.data?.data?.name) setRestaurantName(res.data.data.name);
        })
        .catch(() => {});
    }
  }, [user?.restaurantId]);
  // Build notifications from inventory low-stock + recent orders
  const fetchNotifications = async () => {
    try {
      const notifList = [];

      // Low-stock inventory items
      try {
        const invRes = await api.get('/inventory');
        const items = invRes.data?.data || [];
        items.forEach((item) => {
          if (item.currentStock <= item.reorderLevel) {
            notifList.push({
              id: `stock-${item._id}`,
              type: 'stock',
              title: `Low Stock Alert: ${item.name}`,
              body: `Remaining: ${item.currentStock} ${item.unit || 'units'} (Min Threshold: ${item.reorderLevel} ${item.unit || 'units'})`,
              time: item.updatedAt || item.createdAt,
              read: false,
            });
          }
        });
      } catch (_) { /* inventory module may not be enabled */ }

      // Recent orders (last 5)
      try {
        const ordRes = await api.get('/orders');
        const orders = ordRes.data?.data || [];
        orders.slice(0, 5).forEach((ord) => {
          const amount = ord.total ?? ord.grandTotal ?? ord.totalAmount;
          notifList.push({
            id: `order-${ord._id}`,
            type: 'order',
            title: `New Order #${ord.orderNumber || ord._id?.slice(-4).toUpperCase()}`,
            body: `${ord.items?.length || 0} items · Rs. ${amount != null ? Number(amount).toFixed(0) : '—'} · ${ord.status}`,
            time: ord.createdAt,
            read: false,
          });
        });
      } catch (_) { /* orders module may not be enabled */ }

      // Sort newest first
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

  // Close notification dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  // Dismiss a single notification
  const dismissNotification = (id) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      setUnreadCount(updated.filter((n) => !n.read).length);
      return updated;
    });
  };

  // Dismiss all notifications
  const dismissAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const isAllowed = (module) => {
    if (user?.role === 'super-admin' || user?.role === 'restaurant-admin') return true;
    const perms = user?.permissions || [];
    return perms.includes(module.id);
  };

  const stockNotifs = notifications.filter((n) => n.type === 'stock');
  const orderNotifs = notifications.filter((n) => n.type === 'order');

  return (
    <>
      {/* ── Hamburger + Bell buttons ── */}
      <div className="flex items-center gap-2">
        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((p) => !p); markAllRead(); }}
            className="relative p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-400 transition border border-neutral-700"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-neutral-950 text-[10px] font-extrabold px-1 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-extrabold text-white uppercase tracking-wide">Live Notifications</span>
                  {notifications.length > 0 && (
                    <span className="px-2 py-0.5 bg-amber-500 text-neutral-950 text-[10px] font-extrabold rounded-full">
                      {notifications.length} new
                    </span>
                  )}
                </div>
                <button
                  onClick={dismissAll}
                  className="text-xs text-neutral-400 hover:text-rose-400 transition font-semibold"
                >
                  Clear all
                </button>
              </div>

              {/* Category Tabs */}
              <div className="flex items-center gap-1 px-3 py-2 bg-neutral-900 border-b border-neutral-800">
                {[
                  { label: `All (${notifications.length})`, key: 'all' },
                  { label: `Orders (${orderNotifs.length})`, key: 'order' },
                  { label: `Stock (${stockNotifs.length})`, key: 'stock' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      tab.key === 'all'
                        ? 'bg-amber-500 text-neutral-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Notification List */}
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-neutral-500 text-sm">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                    All clear! No new notifications.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-neutral-800 last:border-0 transition group ${
                        !notif.read ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-neutral-800/50'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                        notif.type === 'stock'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {notif.type === 'stock'
                          ? <AlertTriangle className="w-4 h-4" />
                          : <ShoppingBag className="w-4 h-4" />
                        }
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-neutral-100 leading-tight">{notif.title}</p>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            notif.type === 'stock'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {notif.type === 'stock' ? 'Stock Alert' : 'Order'}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-0.5 leading-snug">{notif.body}</p>
                      </div>
                      {/* Dismiss X button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                        className="p-1 rounded-lg text-neutral-600 hover:text-white hover:bg-neutral-700 transition opacity-0 group-hover:opacity-100 flex-shrink-0"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Hamburger Menu */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition border border-neutral-700"
          title="Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Full Sidebar Overlay ── */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar Drawer */}
          <aside className="fixed top-0 left-0 h-full w-72 bg-neutral-900 border-r border-neutral-800 z-50 flex flex-col shadow-2xl animate-slide-in-left">
            {/* Sidebar Header */}
            <div className="p-5 border-b border-neutral-800 flex items-center justify-between flex-shrink-0 bg-neutral-950">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Store className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white leading-tight">DineFlow</h2>
                  <p className="text-[10px] font-semibold tracking-wider text-amber-400 uppercase">Restaurant Panel</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Info */}
            <div className="px-5 py-3 border-b border-neutral-800/60 bg-neutral-950/50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wide truncate">
                  {restaurantName || '...'}
                </span>
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {APP_MODULES.filter(isAllowed).map((item) => {
                const Icon = MODULE_ICONS[item.id] || LayoutDashboard;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'border-l-4 border-amber-500 bg-amber-500/10 text-amber-400 font-semibold'
                        : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-500' : 'text-neutral-500'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-3 border-t border-neutral-800 flex-shrink-0">
              <button
                onClick={() => { logout(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/40 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

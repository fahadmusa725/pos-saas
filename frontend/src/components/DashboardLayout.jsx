import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { APP_MODULES, PLAN_MODULES } from '../config/modules';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Grid,
  UtensilsCrossed,
  ShoppingBag,
  History,
  Armchair,
  Users,
  UserCheck,
  Truck,
  Package,
  ClipboardList,
  Receipt,
  BarChart3,
  Tag,
  LogOut,
  Sun,
  Moon,
  Menu,
  Store,
  Bell,
  Settings,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';

const MODULE_ICONS = {
  overview: LayoutDashboard,
  categories: Grid,
  'menu-items': UtensilsCrossed,
  orders: ShoppingBag,
  'order-history': History,
  tables: Armchair,
  staff: Users,
  'waiter-screen': Bell,
  customers: UserCheck,
  suppliers: Truck,
  inventory: Package,
  'purchase-orders': ClipboardList,
  expenses: Receipt,
  reports: BarChart3,
  coupons: Tag,
  settings: Settings,
};

function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantPlan, setRestaurantPlan] = useState('basic');

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeNotifTab, setActiveNotifTab] = useState('all');
  const notifRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch live restaurant info from backend on mount
  useEffect(() => {
    if (user) {
      api.get('/auth/me/restaurant')
        .then((res) => {
          if (res.data?.data) {
            if (res.data.data.name) setRestaurantName(res.data.data.name);
            if (res.data.data.subscriptionPlan) setRestaurantPlan(res.data.data.subscriptionPlan);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Fetch notifications (low-stock inventory + recent orders)
  const fetchNotifications = async () => {
    try {
      const notifList = [];
      const readNotifIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');

      // Low-stock inventory items
      try {
        const invRes = await api.get('/inventory');
        (invRes.data?.data || []).forEach((item) => {
          if (item.currentStock <= item.reorderLevel) {
            const id = `stock-${item._id}`;
            notifList.push({
              id,
              type: 'stock',
              title: `Low Stock Alert: ${item.name}`,
              body: `Remaining: ${item.currentStock} ${item.unit || 'units'} (Min Threshold: ${item.reorderLevel} ${item.unit || 'units'})`,
              itemId: item._id,
              time: item.updatedAt || item.createdAt,
              read: readNotifIds.includes(id),
            });
          }
        });
      } catch (_) {}

      // Recent orders (last 5)
      try {
        const ordRes = await api.get('/orders');
        (ordRes.data?.data || []).slice(0, 5).forEach((ord) => {
          const amount = ord.total ?? ord.grandTotal ?? ord.totalAmount;
          const id = `order-${ord._id}`;
          notifList.push({
            id,
            type: 'order',
            title: `New Order #${ord.orderNumber || ord._id?.slice(-4).toUpperCase()}`,
            body: `${ord.items?.length || 0} items · Rs. ${amount != null ? Number(amount).toFixed(0) : '—'} · ${ord.status}`,
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

  const handleNotifNavigate = (notif) => {
    setNotifOpen(false);
    markAsRead(notif.id);
    if (notif.type === 'stock') {
      const itemId = notif.id.replace('stock-', '');
      navigate(`/dashboard/inventory?highlight=${itemId}`);
    } else {
      navigate('/dashboard/order-history');
    }
  };

  const displayRestaurantName = restaurantName || user?.restaurantName || user?.name || 'Restaurant';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAllowed = (module) => {
    if (user?.role === 'super-admin') return true;

    // 1. Plan-level check: Is this module included in the tenant's subscription plan?
    const currentPlan = restaurantPlan || 'basic';
    const planModules = PLAN_MODULES[currentPlan] || PLAN_MODULES['basic'];
    if (!planModules.includes(module.id)) {
      return false;
    }

    // 2. Role/Permission-level check
    if (user?.role === 'restaurant-admin') return true;
    const userPermissions = user?.permissions || [];
    return userPermissions.includes(module.id);
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const stockNotifs = notifications.filter((n) => n.type === 'stock');
  const orderNotifs = notifications.filter((n) => n.type === 'order');
  const visibleNotifs = activeNotifTab === 'all'
    ? notifications
    : activeNotifTab === 'order' ? orderNotifs : stockNotifs;

  return (
    <div className="min-h-screen flex bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-200 relative">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-30
          w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800
          flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Branding & Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold shadow-xs">
              <Store className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-neutral-900 dark:text-white leading-tight tracking-tight">
                DineFlow
              </h2>
              <p className="text-[10px] font-semibold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
                RESTAURANT PANEL
              </p>
            </div>
          </div>

          {/* Bell + Theme toggle grouped */}
          <div className="flex items-center gap-1.5">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((p) => !p)}
                className="relative p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-amber-500 transition-colors flex-shrink-0"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[9px] font-extrabold px-1 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {notifOpen && (
                <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="text-xs font-extrabold text-neutral-900 dark:text-white uppercase tracking-wide truncate">Live Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-amber-500 text-neutral-950 text-[10px] font-extrabold rounded-full shrink-0 whitespace-nowrap">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <button
                      onClick={markAllRead}
                      className="text-xs text-neutral-400 hover:text-amber-500 transition font-semibold shrink-0 whitespace-nowrap"
                    >
                      Mark all as read
                    </button>
                  </div>

                  {/* Category Tabs */}
                  <div className="flex items-center gap-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                    {[
                      { label: `All (${notifications.length})`, key: 'all' },
                      { label: `Orders (${orderNotifs.length})`, key: 'order' },
                      { label: `Stock (${stockNotifs.length})`, key: 'stock' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveNotifTab(tab.key)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          activeNotifTab === tab.key
                            ? 'bg-amber-500 text-neutral-950'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-72 overflow-y-auto">
                    {visibleNotifs.length === 0 ? (
                      <div className="py-8 text-center text-neutral-500 text-sm">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                        All clear! No notifications.
                      </div>
                    ) : (
                      visibleNotifs.map((notif) => (
                        <div
                          key={notif.id}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition group ${
                            !notif.read
                              ? 'bg-amber-500/5 hover:bg-amber-500/10'
                              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                          }`}
                        >
                          {/* Icon */}
                          <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                            notif.type === 'stock'
                              ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                              : 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
                          }`}>
                            {notif.type === 'stock'
                              ? <AlertTriangle className="w-4 h-4" />
                              : <ShoppingBag className="w-4 h-4" />
                            }
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-tight">{notif.title}</p>
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                notif.type === 'stock'
                                  ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                                  : 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
                              }`}>
                                {notif.type === 'stock' ? 'Stock Alert' : 'Order'}
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">{notif.body}</p>
                            <button
                              onClick={() => handleNotifNavigate(notif)}
                              className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition"
                            >
                              {notif.type === 'stock' ? 'Click to inspect stock in Inventory →' : 'View Orders →'}
                            </button>
                          </div>
                          {/* Dismiss */}
                          <button
                            onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition opacity-0 group-hover:opacity-100 flex-shrink-0"
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

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors flex-shrink-0"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        </div>

        {/* User Info Card */}
        <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-950/40">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wide truncate">
              {displayRestaurantName}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex-shrink-0">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {APP_MODULES.filter(isAllowed).map((item) => {
            const Icon = MODULE_ICONS[item.id] || LayoutDashboard;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'border-l-4 border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-neutral-400 dark:text-neutral-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header bar (mobile) */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-extrabold text-neutral-900 dark:text-white">DineFlow</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile Bell */}
            <button
              onClick={() => { setNotifOpen((p) => !p); if (!notifOpen) markAllRead(); }}
              className="relative p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-rose-500 text-white text-[8px] font-extrabold px-0.5 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
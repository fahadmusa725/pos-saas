import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import { APP_MODULES } from '../config/modules';
import {
  Menu, X, LayoutDashboard, Grid, UtensilsCrossed,
  ShoppingBag, Armchair, Users, UserCheck, Truck, Package,
  ClipboardList, Receipt, BarChart3, Tag, LogOut, Store,
  ChefHat, Bell,
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

  const isAllowed = (module) => {
    if (user?.role === 'super-admin' || user?.role === 'restaurant-admin') return true;
    const perms = user?.permissions || [];
    return perms.includes(module.id);
  };

  return (
    <>
      {/* ── Hamburger button only ── */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition border border-neutral-700"
        title="Navigation Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

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

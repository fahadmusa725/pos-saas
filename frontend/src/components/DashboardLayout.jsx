import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { APP_MODULES } from '../config/modules';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  Grid,
  UtensilsCrossed,
  ShoppingBag,
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
} from 'lucide-react';

const MODULE_ICONS = {
  overview: LayoutDashboard,
  categories: Grid,
  'menu-items': UtensilsCrossed,
  orders: ShoppingBag,
  tables: Armchair,
  staff: Users,
  customers: UserCheck,
  suppliers: Truck,
  inventory: Package,
  'purchase-orders': ClipboardList,
  expenses: Receipt,
  reports: BarChart3,
  coupons: Tag,
};

function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAllowed = (module) => {
    if (user?.role === 'super-admin' || user?.role === 'restaurant-admin') return true;
    const userPermissions = user?.permissions || [];
    return userPermissions.includes(module.id);
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

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
                POS Dashboard
              </h2>
              <p className="text-[10px] font-semibold tracking-wider text-amber-600 dark:text-amber-400 uppercase">
                RESTAURANT PANEL
              </p>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors flex-shrink-0"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
        </div>

        {/* User Info Card */}
        <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-950/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate">
              {user?.name}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
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
            <span className="text-sm font-extrabold text-neutral-900 dark:text-white">POS Dashboard</span>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
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
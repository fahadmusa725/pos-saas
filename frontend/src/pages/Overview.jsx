import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  Grid,
  UtensilsCrossed,
  ShoppingBag,
  Armchair,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Award,
  Clock,
  Flame,
  ChefHat,
} from 'lucide-react';

function Overview() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    allTimeRevenue: 0,
    allTimeOrders: 0,
    avgOrderValue: 0,
    categoriesCount: 0,
    menuItemsCount: 0,
    tablesCount: 0,
  });

  const [bestSellers, setBestSellers] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);

      const todayStr = new Date().toISOString().split('T')[0];

      const [
        todaySalesRes,
        allSalesRes,
        categoriesRes,
        menuItemsRes,
        tablesRes,
        bestSellersRes,
        ordersRes,
      ] = await Promise.allSettled([
        api.get(`/reports/sales?startDate=${todayStr}&endDate=${todayStr}`),
        api.get('/reports/sales'),
        api.get('/categories'),
        api.get('/menu-items'),
        api.get('/tables'),
        api.get('/reports/best-sellers?limit=5'),
        api.get('/orders'),
      ]);

      // 1. Today Sales
      let todayRev = 0;
      let todayOrd = 0;
      if (todaySalesRes.status === 'fulfilled') {
        const d = todaySalesRes.value.data;
        todayRev = d?.totalRevenue ?? 0;
        todayOrd = d?.totalOrders ?? 0;
      }

      // 2. All Sales
      let allRev = 0;
      let allOrd = 0;
      if (allSalesRes.status === 'fulfilled') {
        const d = allSalesRes.value.data;
        allRev = d?.totalRevenue ?? 0;
        allOrd = d?.totalOrders ?? 0;
      }

      // 3. Counts
      const catCount = categoriesRes.status === 'fulfilled' ? (categoriesRes.value.data?.count ?? categoriesRes.value.data?.data?.length ?? 0) : 0;
      const menuCount = menuItemsRes.status === 'fulfilled' ? (menuItemsRes.value.data?.count ?? menuItemsRes.value.data?.data?.length ?? 0) : 0;
      const tblCount = tablesRes.status === 'fulfilled' ? (tablesRes.value.data?.count ?? tablesRes.value.data?.data?.length ?? 0) : 0;

      const avgVal = allOrd > 0 ? Math.round(allRev / allOrd) : 0;

      setStats({
        todayRevenue: todayRev,
        todayOrders: todayOrd,
        allTimeRevenue: allRev,
        allTimeOrders: allOrd,
        avgOrderValue: avgVal,
        categoriesCount: catCount,
        menuItemsCount: menuCount,
        tablesCount: tblCount,
      });

      // 4. Best Sellers
      if (bestSellersRes.status === 'fulfilled') {
        const raw = bestSellersRes.value.data;
        const arr = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        setBestSellers(
          arr.map((item) => ({
            _id: item._id,
            name: item.name ?? item._id ?? 'Unknown Item',
            totalQuantity: item.totalQuantity ?? item.quantitySold ?? 0,
            totalRevenue: item.totalRevenue ?? 0,
          }))
        );
      }

      // 5. Recent Orders
      if (ordersRes.status === 'fulfilled') {
        const raw = ordersRes.value.data;
        const arr = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        // Slice top 5 recent orders
        setRecentOrders(arr.slice(0, 5));
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  const maxBestSellerQty = bestSellers.length > 0
    ? Math.max(...bestSellers.map((b) => b.totalQuantity))
    : 1;

  const quickAccessCards = [
    {
      label: 'Categories',
      value: stats.categoriesCount,
      icon: Grid,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      path: '/dashboard/categories',
    },
    {
      label: 'Menu Items',
      value: stats.menuItemsCount,
      icon: UtensilsCrossed,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      path: '/dashboard/menu-items',
    },
    {
      label: 'Tables',
      value: stats.tablesCount,
      icon: Armchair,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      path: '/dashboard/tables',
    },
    {
      label: 'Kitchen Display',
      value: 'Live KDS',
      icon: ChefHat,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      path: '/kds',
    },
  ];

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'served':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'preparing':
      case 'pending':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default:
        return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Quick snapshot of your restaurant metrics and real-time activity
        </p>
      </div>

      {/* ROW 1: TOP METRIC CARDS (Revenue-focused) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 animate-pulse space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
              <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          ))
        ) : (
          <>
            {/* Today's Revenue */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs relative overflow-hidden group hover:border-amber-500/40 transition">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Today
                </span>
              </div>
              <p className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                Rs. {stats.todayRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-400 mt-1.5 font-medium">
                {stats.todayOrders} {stats.todayOrders === 1 ? 'order' : 'orders'} today
              </p>
            </div>

            {/* All-Time Revenue */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs relative overflow-hidden group hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  All Time
                </span>
              </div>
              <p className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                Rs. {stats.allTimeRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-400 mt-1.5 font-medium">
                {stats.allTimeOrders} completed orders
              </p>
            </div>

            {/* Avg Order Value */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs relative overflow-hidden group hover:border-purple-500/40 transition">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  Avg Value
                </span>
              </div>
              <p className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                Rs. {stats.avgOrderValue.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-400 mt-1.5 font-medium">Per order average</p>
            </div>

            {/* Total Orders Count */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs relative overflow-hidden group hover:border-blue-500/40 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <Link
                    to="/dashboard/orders"
                    className="text-xs font-bold text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 flex items-center gap-1 transition-colors"
                  >
                    View All <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <p className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                  {stats.allTimeOrders}
                </p>
              </div>
              <p className="text-xs text-neutral-400 font-medium mt-1">Total completed orders</p>
            </div>
          </>
        )}
      </div>

      {/* ROW 2: QUICK ACCESS CARDS */}
      <div>
        <h2 className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-3">
          Quick Access & Catalog
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 animate-pulse h-24"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickAccessCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs hover:border-amber-500/40 transition-all duration-200 group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`p-2.5 rounded-xl border ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xl font-extrabold text-neutral-900 dark:text-white leading-none">
                        {card.value}
                      </p>
                      <p className="text-xs font-medium text-neutral-400 mt-1">
                        {card.label}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={card.path}
                    className="p-2 text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                    title={`Open ${card.label}`}
                  >
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ROW 3: TOP SELLING ITEMS & RECENT TRANSACTIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP SELLING ITEMS */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Top Selling Items
              </h2>
            </div>
            <span className="text-xs text-neutral-400">By quantity sold</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : bestSellers.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 italic text-sm">
              No best sellers recorded yet.
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {bestSellers.map((item, idx) => {
                const pct = Math.round((item.totalQuantity / maxBestSellerQty) * 100);
                return (
                  <div key={item._id || idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2.5 font-bold text-neutral-900 dark:text-white">
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-[10px] shrink-0 font-extrabold">
                          #{idx + 1}
                        </span>
                        <span className="truncate max-w-[200px]">{item.name}</span>
                      </div>
                      <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                        <strong className="text-neutral-900 dark:text-neutral-200">{item.totalQuantity}</strong> sold (Rs. {item.totalRevenue.toLocaleString()})
                      </span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RECENT TRANSACTIONS */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Recent Transactions
              </h2>
            </div>
            <Link
              to="/dashboard/orders"
              className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1 transition-colors"
            >
              View All History →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 italic text-sm">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {recentOrders.map((order) => {
                const orderTime = order.createdAt
                  ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '—';

                const tableNum = order.tableId?.tableNumber ?? order.tableNumber ?? (order.orderType === 'dine-in' ? 'T-?' : 'Takeaway');

                return (
                  <div
                    key={order._id}
                    className="py-3 flex items-center justify-between text-xs hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 px-2 rounded-lg transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-neutral-900 dark:text-white">
                          #{order.orderNumber || order._id.slice(-6)}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${getStatusBadgeClass(
                            order.status || order.paymentStatus
                          )}`}
                        >
                          {order.status || order.paymentStatus || 'paid'}
                        </span>
                      </div>
                      <p className="text-neutral-400 text-[11px] flex items-center gap-2">
                        <span className="capitalize">{order.orderType || 'dine-in'}</span>
                        <span>•</span>
                        <span>{tableNum}</span>
                        <span>•</span>
                        <span>{orderTime}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-extrabold text-amber-500">
                        Rs. {(order.total || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Overview;
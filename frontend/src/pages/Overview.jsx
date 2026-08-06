import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Grid, UtensilsCrossed, ShoppingBag, Armchair, ArrowRight } from 'lucide-react';

function Overview() {
  const [stats, setStats] = useState({ categories: 0, menuItems: 0, orders: 0, tables: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [categoriesRes, menuItemsRes, ordersRes, tablesRes] = await Promise.allSettled([
          api.get('/categories'),
          api.get('/menu-items'),
          api.get('/orders'),
          api.get('/tables'),
        ]);

        setStats({
          categories: categoriesRes.status === 'fulfilled' ? categoriesRes.value.data.count : 0,
          menuItems: menuItemsRes.status === 'fulfilled' ? menuItemsRes.value.data.count : 0,
          orders: ordersRes.status === 'fulfilled' ? ordersRes.value.data.count : 0,
          tables: tablesRes.status === 'fulfilled' ? tablesRes.value.data.count : 0,
        });
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      label: 'Categories',
      value: stats.categories,
      icon: Grid,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      path: '/dashboard/categories',
    },
    {
      label: 'Menu Items',
      value: stats.menuItems,
      icon: UtensilsCrossed,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      path: '/dashboard/menu-items',
    },
    {
      label: 'Total Orders',
      value: stats.orders,
      icon: ShoppingBag,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      path: '/dashboard/orders',
    },
    {
      label: 'Tables',
      value: stats.tables,
      icon: Armchair,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      path: '/dashboard/tables',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Overview
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Quick snapshot of your restaurant metrics
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 animate-pulse space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
              <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs hover:border-amber-500/40 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-xl border ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <Link
                      to={card.path}
                      className="text-xs font-bold text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 flex items-center gap-1 transition-colors"
                    >
                      Manage <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                  <p className="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                    {card.value}
                  </p>
                </div>
                <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mt-3">
                  {card.label}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Overview;
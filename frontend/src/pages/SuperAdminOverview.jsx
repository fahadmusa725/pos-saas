import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Building2, CheckCircle2, AlertTriangle, Clock, ShoppingBag, DollarSign, ArrowRight } from 'lucide-react';

function SuperAdminOverview() {
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    activeCount: 0,
    suspendedCount: 0,
    trialCount: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/super-admin/stats');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load platform stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      label: 'Total Restaurants',
      value: stats.totalRestaurants,
      icon: Building2,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      path: '/super-admin/restaurants',
    },
    {
      label: 'Active Accounts',
      value: stats.activeCount,
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      path: '/super-admin/restaurants',
    },
    {
      label: 'Trial Accounts',
      value: stats.trialCount,
      icon: Clock,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      path: '/super-admin/restaurants',
    },
    {
      label: 'Suspended Accounts',
      value: stats.suspendedCount,
      icon: AlertTriangle,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
      path: '/super-admin/restaurants',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Platform Overview
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Global metrics and tenant activity across DineFlow SaaS platform
        </p>
      </div>

      {/* Row 1: Restaurant Count Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 animate-pulse h-28" />
          ))
        ) : (
          cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs hover:border-amber-500/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl border ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <Link
                      to={card.path}
                      className="text-xs font-bold text-neutral-400 hover:text-amber-500 flex items-center gap-1 transition"
                    >
                      Manage <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-3xl font-extrabold text-neutral-900 dark:text-white">
                    {card.value}
                  </p>
                </div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mt-3">
                  {card.label}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Row 2: Platform Transaction Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Platform Revenue</p>
            <p className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white mt-0.5">
              Rs. {stats.totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Orders Processed</p>
            <p className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white mt-0.5">
              {stats.totalOrders.toLocaleString()} orders
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminOverview;

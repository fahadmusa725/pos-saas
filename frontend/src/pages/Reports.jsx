import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Award, CreditCard, ShoppingBag, Filter } from 'lucide-react';

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

function Reports() {
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [salesData, setSalesData] = useState({ totalRevenue: 0, totalPaidOrders: 0, trend: [] });
  const [bestSellers, setBestSellers] = useState([]);
  const [orderTypeData, setOrderTypeData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [profitLoss, setProfitLoss] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0 });
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const q = `?${params.toString()}`;

      const [sRes, bRes, otRes, pRes, plRes] = await Promise.allSettled([
        api.get(`/reports/sales${q}`),
        api.get(`/reports/best-sellers${q}`),
        api.get(`/reports/order-type-breakdown${q}`),
        api.get(`/reports/payment-breakdown${q}`),
        api.get(`/reports/profit-loss${q}`),
      ]);

      if (sRes.status === 'fulfilled') {
        const d = sRes.value.data;
        // Backend returns: { success, totalRevenue, totalOrders, dailyTrend: [{_id, totalRevenue, orderCount}] }
        setSalesData({
          totalRevenue: d?.totalRevenue ?? 0,
          totalPaidOrders: d?.totalOrders ?? d?.totalPaidOrders ?? 0,
          // Normalize dailyTrend → [{date, revenue}] for AreaChart
          trend: Array.isArray(d?.dailyTrend)
            ? d.dailyTrend.map((t) => ({ date: t._id, revenue: t.totalRevenue }))
            : Array.isArray(d?.trend)
            ? d.trend
            : [],
        });
      }
      if (bRes.status === 'fulfilled') {
        const raw = bRes.value.data;
        // Backend returns: { data: [{_id: itemName, quantitySold, totalRevenue}] }
        // Normalize to: [{name, totalQuantity, totalRevenue}]
        const arr = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        setBestSellers(arr.map((item) => ({
          name: item.name ?? item._id,           // _id holds item name
          totalQuantity: item.totalQuantity ?? item.quantitySold ?? 0,
          totalRevenue: item.totalRevenue ?? 0,
          _id: item._id,
        })));
      }
      if (otRes.status === 'fulfilled') {
        const raw = otRes.value.data;
        const arr = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        setOrderTypeData(arr);
      }
      if (pRes.status === 'fulfilled') {
        const raw = pRes.value.data;
        // Backend returns: { data: [{method, totalAmount, transactionCount, percentage}] }
        // Normalize to: [{_id: method, total: totalAmount}] for PieChart dataKey="total" nameKey="_id"
        const arr = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        setPaymentData(arr.map((item) => ({
          _id: item._id ?? item.method,             // method → _id for nameKey
          total: item.total ?? item.totalAmount ?? 0, // totalAmount → total for dataKey
          transactionCount: item.transactionCount ?? 0,
          percentage: item.percentage ?? 0,
        })));
      }
      if (plRes.status === 'fulfilled') {
        const d = plRes.value.data;
        const payload = d?.data ?? d;
        setProfitLoss({
          totalRevenue: payload?.totalRevenue ?? 0,
          totalExpenses: payload?.totalExpenses ?? 0,
          netProfit: payload?.netProfit ?? 0,
        });
      }
    } catch (err) {
      console.error('Reports fetch error:', err);
      setError('Failed to load reports data.');
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Max quantity for best-seller horizontal progress bars
  const safeBestSellers = Array.isArray(bestSellers) ? bestSellers : [];
  const safePaymentData = Array.isArray(paymentData) ? paymentData : [];
  const safeTrend = Array.isArray(salesData?.trend) ? salesData.trend : [];
  const maxQty = safeBestSellers.length > 0 ? Math.max(...safeBestSellers.map(b => b.totalQuantity ?? 0)) : 1;

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-rose-500 font-semibold text-lg">{error}</p>
        <button
          onClick={fetchReports}
          className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Visual breakdown of sales trends, best sellers, payment methods, and net profit
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 shadow-xs flex items-center gap-3">
          <Filter className="w-4 h-4 text-amber-500" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-neutral-100"
          />
          <span className="text-neutral-400 text-xs font-bold">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-900 dark:text-neutral-100"
          />
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Total Sales
            </span>
          </div>
          <p className="text-3xl font-extrabold text-neutral-900 dark:text-white">Rs. {salesData.totalRevenue || 0}</p>
          <p className="text-xs text-neutral-400 mt-1">{salesData.totalPaidOrders || 0} Paid Orders</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Net Profit
            </span>
          </div>
          <p className={`text-3xl font-extrabold ${profitLoss.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            Rs. {profitLoss.netProfit || 0}
          </p>
          <p className="text-xs text-neutral-400 mt-1">Rev: Rs. {profitLoss.totalRevenue} | Exp: Rs. {profitLoss.totalExpenses}</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Order Volume
            </span>
          </div>
          <p className="text-3xl font-extrabold text-neutral-900 dark:text-white">{salesData.totalPaidOrders || 0}</p>
          <p className="text-xs text-neutral-400 mt-1">Completed orders</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
              Top Seller
            </span>
          </div>
          <p className="text-xl font-extrabold text-neutral-900 dark:text-white truncate">
            {bestSellers[0]?.name || 'N/A'}
          </p>
          <p className="text-xs text-neutral-400 mt-1">{bestSellers[0] ? `${bestSellers[0].totalQuantity} sold` : 'No data'}</p>
        </div>
      </div>

      {/* Revenue Trend Area Chart */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-neutral-900 dark:text-white">Revenue Trend (Daily)</h2>
        {loading ? (
          <div className="h-64 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
        ) : safeTrend.length === 0 ? (
          <p className="py-12 text-center text-neutral-400 italic">No revenue trend data found for range.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={safeTrend}>
                <defs>
                  <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => v?.slice(5) ?? v} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#171717',
                    borderColor: '#404040',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#amberGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Best Sellers & Payment Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">Top Selling Items</h2>
          {safeBestSellers.length === 0 ? (
            <p className="py-8 text-center text-neutral-400 italic">No sales recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {safeBestSellers.map((item, idx) => {
                const pct = Math.round((item.totalQuantity / maxQty) * 100);
                return (
                  <div key={item._id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </span>
                        {item.name}
                      </div>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        {item.totalQuantity} sold (Rs. {item.totalRevenue})
                      </span>
                    </div>
                    <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-950 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Breakdown Pie Chart */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">Payment Method Breakdown (Split Accurate)</h2>
          {safePaymentData.length === 0 ? (
            <p className="py-8 text-center text-neutral-400 italic">No payment breakdown available.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={safePaymentData}
                    dataKey="total"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {safePaymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171717',
                      borderColor: '#404040',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;

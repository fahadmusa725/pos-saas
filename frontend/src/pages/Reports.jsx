import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

function Reports() {
  const now = new Date();
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [loading, setLoading] = useState(true);

  // Report States
  const [salesReport, setSalesReport] = useState({ totalRevenue: 0, totalOrders: 0, dailyTrend: [] });
  const [bestSellers, setBestSellers] = useState([]);
  const [orderTypeData, setOrderTypeData] = useState([]);
  const [paymentData, setPaymentData] = useState([]);
  const [profitLoss, setProfitLoss] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, isProfitable: true });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const [salesRes, bestRes, orderTypeRes, payRes, plRes] = await Promise.allSettled([
      api.get(`/reports/sales${queryString}`),
      api.get(`/reports/best-sellers${queryString}`),
      api.get(`/reports/order-type-breakdown${queryString}`),
      api.get(`/reports/payment-breakdown${queryString}`),
      api.get(`/reports/profit-loss${queryString}`),
    ]);

    if (salesRes.status === 'fulfilled') setSalesReport(salesRes.value.data);
    if (bestRes.status === 'fulfilled') setBestSellers(bestRes.value.data.data);
    if (orderTypeRes.status === 'fulfilled') setOrderTypeData(orderTypeRes.value.data.data);
    if (payRes.status === 'fulfilled') setPaymentData(payRes.value.data.data);
    if (plRes.status === 'fulfilled') setProfitLoss(plRes.value.data);

    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const profitLossBarData = [
    { name: 'Revenue', amount: profitLoss.totalRevenue, fill: '#10B981' },
    { name: 'Expenses', amount: profitLoss.totalExpenses, fill: '#EF4444' },
    { name: 'Net Profit/Loss', amount: Math.abs(profitLoss.netProfit), fill: profitLoss.isProfitable ? '#3B82F6' : '#DC2626' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Date Range Picker */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports & Analytics</h1>
          <p className="text-xs text-gray-500 mt-1">Business intelligence & revenue insights</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700 uppercase">Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">Rs. {salesReport.totalRevenue || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Paid Orders</p>
          <p className="text-2xl font-extrabold text-blue-600 mt-2">{salesReport.totalOrders || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Expenses</p>
          <p className="text-2xl font-extrabold text-red-500 mt-2">Rs. {profitLoss.totalExpenses || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Net Profit / Loss</p>
          <p className={`text-2xl font-extrabold mt-2 ${profitLoss.isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
            Rs. {profitLoss.netProfit || 0}
          </p>
        </div>
      </div>

      {/* Chart Section 1: Revenue Trend */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Revenue Trend (Daily)</h2>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading trend data...</div>
        ) : salesReport.dailyTrend?.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-gray-400 italic">No revenue recorded in this date range.</div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesReport.dailyTrend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`Rs. ${value}`, 'Revenue']} />
                <Area type="monotone" dataKey="totalRevenue" stroke="#3B82F6" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart Section 2 & 3: Best Sellers & Profit/Loss Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Best Sellers */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Top Best Selling Items</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading best sellers...</div>
          ) : bestSellers.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400 italic">No items sold in this period.</div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bestSellers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="_id" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val, name) => [name === 'quantitySold' ? `${val} sold` : `Rs. ${val}`, name === 'quantitySold' ? 'Quantity' : 'Revenue']} />
                  <Bar dataKey="quantitySold" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Profit vs Expense Overview */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Revenue vs Expenses Comparison</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading financial overview...</div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitLossBarData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`Rs. ${value}`, 'Amount']} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {profitLossBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Chart Section 4 & 5: Pie Chart Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Type Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Order Type Breakdown</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading order types...</div>
          ) : orderTypeData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400 italic">No orders in this period.</div>
          ) : (
            <div className="h-72 w-full flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderTypeData}
                    dataKey="count"
                    nameKey="orderType"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.orderType}: ${entry.percentage}%`}
                  >
                    {orderTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value} orders (${props.payload.percentage}%)`, props.payload.orderType]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Payment Method Breakdown (Actual Cash vs Card)</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Loading payment breakdown...</div>
          ) : paymentData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400 italic">No payments recorded.</div>
          ) : (
            <div className="h-72 w-full flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    dataKey="totalAmount"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    label={(entry) => `${entry.method}: Rs.${entry.totalAmount}`}
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`Rs. ${value} (${props.payload.percentage}%)`, props.payload.method]} />
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

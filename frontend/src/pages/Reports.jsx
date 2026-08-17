import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Landmark, Wallet, PieChart as PieIcon, Star, Clock, Users,
  UserCheck, Truck, Calendar, Filter, ArrowUpRight, TrendingUp, AlertTriangle
} from 'lucide-react';

const CATEGORY_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

function Reports() {
  const [activeTab, setActiveTab] = useState('financial-overview');
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('30Days'); // 'today' | '7Days' | '30Days' | 'thisYear' | 'custom'

  // Date Range State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Tab Data States
  const [financialData, setFinancialData] = useState(null);
  const [categorySales, setCategorySales] = useState({ grandTotal: 0, data: [] });
  const [bestSellers, setBestSellers] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [staffPerformance, setStaffPerformance] = useState([]);
  const [customerData, setCustomerData] = useState({ topSpenders: [], outstandingCredit: [], summary: {} });
  const [supplierData, setSupplierData] = useState({ data: [], summary: {} });
  const [error, setError] = useState(null);

  // Preset Date Handlers
  const applyPreset = (type) => {
    setPreset(type);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (type === 'today') {
      start = now;
    } else if (type === '7Days') {
      start.setDate(now.getDate() - 7);
    } else if (type === '30Days') {
      start.setDate(now.getDate() - 30);
    } else if (type === 'thisYear') {
      start = new Date(now.getFullYear(), 0, 1);
    }

    if (type !== 'custom') {
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const fetchTabContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const q = `?${params.toString()}`;

      if (activeTab === 'financial-overview' || activeTab === 'cash-ledger') {
        const res = await api.get(`/reports/financial-overview${q}`);
        setFinancialData(res.data);
      } else if (activeTab === 'category-sales') {
        const res = await api.get(`/reports/category-sales${q}`);
        setCategorySales(res.data);
      } else if (activeTab === 'best-sellers') {
        const res = await api.get(`/reports/best-sellers${q}&limit=15`);
        setBestSellers(res.data.data || []);
      } else if (activeTab === 'peak-hours') {
        const res = await api.get(`/reports/peak-hours${q}`);
        setPeakHours(res.data.data || []);
      } else if (activeTab === 'staff-performance') {
        const res = await api.get(`/reports/staff-performance${q}`);
        setStaffPerformance(res.data.data || []);
      } else if (activeTab === 'customer-report') {
        const res = await api.get(`/reports/customer-report${q}`);
        setCustomerData(res.data);
      } else if (activeTab === 'supplier-report') {
        const res = await api.get(`/reports/supplier-report${q}`);
        setSupplierData(res.data);
      }
    } catch (err) {
      console.error('Fetch report error:', err);
      setError('Failed to load report data.');
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    fetchTabContent();
  }, [fetchTabContent]);

  const tabs = [
    { id: 'financial-overview', label: 'Financial Overview', icon: Landmark },
    { id: 'cash-ledger', label: 'Cash & Ledger Detail', icon: Wallet },
    { id: 'category-sales', label: 'Category Sales', icon: PieIcon },
    { id: 'best-sellers', label: 'Best Sellers', icon: Star },
    { id: 'peak-hours', label: 'Peak Busiest Hours', icon: Clock },
    { id: 'staff-performance', label: 'Staff Performance', icon: Users },
    { id: 'customer-report', label: 'Customer Report', icon: UserCheck },
    { id: 'supplier-report', label: 'Supplier Report', icon: Truck },
  ];

  return (
    <div className="space-y-8 pb-12 text-neutral-100">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Reports & Financial Analytics
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Detailed financial ledger, cash register, sales & profitability breakdown
          </p>
        </div>

        {/* Date Filter Controls — Strictly Single Line */}
        <div className="flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 p-1.5 rounded-xl whitespace-nowrap overflow-hidden">
          <button
            onClick={() => applyPreset('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
              preset === 'today' ? 'bg-amber-500 text-black shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => applyPreset('7Days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
              preset === '7Days' ? 'bg-amber-500 text-black shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => applyPreset('30Days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
              preset === '30Days' ? 'bg-amber-500 text-black shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => applyPreset('thisYear')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
              preset === 'thisYear' ? 'bg-amber-500 text-black shadow-xs' : 'text-neutral-400 hover:text-white'
            }`}
          >
            This Year
          </button>

          <div className="h-4 w-px bg-neutral-800 mx-1 shrink-0" />

          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setPreset('custom');
                setStartDate(e.target.value);
              }}
              className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500"
            />
            <span className="text-neutral-500 text-xs font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setPreset('custom');
                setEndDate(e.target.value);
              }}
              className="bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:outline-hidden focus:border-amber-500"
            />
            <button
              onClick={fetchTabContent}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-colors shrink-0"
            >
              Go
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation — Clear vertical space added above */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2 pb-3 border-b border-neutral-800">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/10'
                  : 'bg-neutral-900/60 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-neutral-950' : 'text-neutral-400'}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-neutral-400 font-medium">Loading report analytics...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-400">{error}</p>
          <button
            onClick={fetchTabContent}
            className="px-4 py-2 bg-amber-500 text-black font-bold text-xs rounded-xl hover:bg-amber-400 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* TAB 1: FINANCIAL OVERVIEW */}
          {activeTab === 'financial-overview' && financialData && (
            <div className="space-y-6">
              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    TOTAL SALES REVENUE
                  </span>
                  <p className="text-2xl font-extrabold text-amber-500 mt-2">
                    PKR {(financialData.totalSalesRevenue || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    From {financialData.totalOrders || 0} completed orders
                  </p>
                </div>

                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                    TOTAL CASH SALES
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                    PKR {(financialData.totalCashSales || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">Direct cash method transactions</p>
                </div>

                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-sky-400 uppercase">
                    ACCOUNTS RECEIVABLE
                  </span>
                  <p className="text-2xl font-extrabold text-sky-400 mt-2">
                    PKR {(financialData.accountsReceivable || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">Customer credit balances owed</p>
                </div>

                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                    NET PROFIT / LOSS
                  </span>
                  <p
                    className={`text-2xl font-extrabold mt-2 ${
                      financialData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-500'
                    }`}
                  >
                    PKR {(financialData.netProfit || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">Revenue minus operational expenses</p>
                </div>
              </div>

              {/* Financial Ledger & Cash Flow Summary */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-neutral-800 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-amber-500" />
                  <h2 className="text-xs font-extrabold text-white tracking-wider uppercase">
                    FINANCIAL LEDGER & CASH FLOW SUMMARY
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-950/60 text-neutral-400 uppercase font-bold border-b border-neutral-800">
                      <tr>
                        <th className="py-3 px-5">FINANCIAL LINE ITEM</th>
                        <th className="py-3 px-5">DESCRIPTION</th>
                        <th className="py-3 px-5 text-right">AMOUNT (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      <tr className="font-bold text-white">
                        <td className="py-3.5 px-5">Total Sales Revenue</td>
                        <td className="py-3.5 px-5 text-neutral-400 font-normal">
                          All completed sales transactions
                        </td>
                        <td className="py-3.5 px-5 text-right text-amber-500 font-extrabold">
                          PKR {(financialData.totalSalesRevenue || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="text-neutral-300">
                        <td className="py-3 px-5 pl-9 text-emerald-400 font-medium">├ Total Cash Sales</td>
                        <td className="py-3 px-5 text-neutral-500">Direct cash paid by customers</td>
                        <td className="py-3 px-5 text-right text-emerald-400 font-semibold">
                          PKR {(financialData.totalCashSales || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="text-neutral-300">
                        <td className="py-3 px-5 pl-9 text-sky-400 font-medium">├ Customer Credit Tabs</td>
                        <td className="py-3 px-5 text-neutral-500">Sales issued on credit (receivables)</td>
                        <td className="py-3 px-5 text-right text-sky-400 font-semibold">
                          PKR {(financialData.creditSales || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="text-neutral-300">
                        <td className="py-3 px-5 text-emerald-400 font-semibold">
                          Customer Credit Payments Collected
                        </td>
                        <td className="py-3 px-5 text-neutral-500">
                          Cash received settling old customer credit tabs
                        </td>
                        <td className="py-3 px-5 text-right text-emerald-400 font-semibold">
                          +PKR {(financialData.creditSales || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="text-neutral-300">
                        <td className="py-3 px-5 text-rose-400 font-semibold">Total Operational Expenses</td>
                        <td className="py-3 px-5 text-neutral-500">
                          Utilities, salaries, rent, PO purchases & misc expenses
                        </td>
                        <td className="py-3 px-5 text-right text-rose-500 font-semibold">
                          -PKR {(financialData.totalExpenses || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="bg-neutral-950/80 font-extrabold text-amber-400">
                        <td className="py-4 px-5 uppercase tracking-wider">ESTIMATED CASH IN REGISTER BALANCE</td>
                        <td className="py-4 px-5 text-neutral-400 font-normal">
                          Cash Sales + Credit Collected – Cash Expenses
                        </td>
                        <td className="py-4 px-5 text-right text-amber-400 text-sm">
                          PKR {(financialData.cashInRegister || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Revenue Trend Over Time Chart */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  <div>
                    <h2 className="text-xs font-extrabold text-white tracking-wider uppercase">
                      REVENUE TREND OVER TIME
                    </h2>
                    <p className="text-[11px] text-neutral-400">Daily sales trajectory</p>
                  </div>
                </div>

                {financialData.dailyTrend?.length === 0 ? (
                  <p className="py-12 text-center text-xs text-neutral-500 italic">No trend data for selected range.</p>
                ) : (
                  <div className="h-72 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={financialData.dailyTrend}>
                        <defs>
                          <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                        <XAxis dataKey="_id" stroke="#737373" fontSize={11} />
                        <YAxis stroke="#737373" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a0a0a',
                            borderColor: '#262626',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="totalRevenue"
                          name="Revenue (PKR)"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#amberGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CASH & LEDGER DETAIL */}
          {activeTab === 'cash-ledger' && financialData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                    TOTAL CASH SALES
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                    PKR {(financialData.totalCashSales || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">Direct Cash Paid</p>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-sky-400 uppercase">
                    ACCOUNTS RECEIVABLE
                  </span>
                  <p className="text-2xl font-extrabold text-sky-400 mt-2">
                    PKR {(financialData.accountsReceivable || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">Total customer credit owed</p>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-rose-400 uppercase">
                    TOTAL EXPENSES LOGGED
                  </span>
                  <p className="text-2xl font-extrabold text-rose-500 mt-2">
                    PKR {(financialData.totalExpenses || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">Rent, utilities, supplies, salaries</p>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-purple-400 uppercase">
                    ACCOUNTS PAYABLE
                  </span>
                  <p className="text-2xl font-extrabold text-purple-400 mt-2">
                    PKR {(financialData.accountsPayable || 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1">Unpaid supplier purchase orders</p>
                </div>
              </div>

              {/* Detailed Breakdown Ledger */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-neutral-800">
                  <h2 className="text-xs font-extrabold text-white tracking-wider uppercase">
                    FINANCIAL BREAKDOWN LEDGER
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-950/60 text-neutral-400 uppercase font-bold border-b border-neutral-800">
                      <tr>
                        <th className="py-3 px-5">FINANCIAL LINE ITEM</th>
                        <th className="py-3 px-5">EXPLANATION</th>
                        <th className="py-3 px-5 text-right">AMOUNT (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      <tr className="font-bold text-white">
                        <td className="py-3.5 px-5">Total Sales Revenue</td>
                        <td className="py-3.5 px-5 text-neutral-400 font-normal">All completed customer orders</td>
                        <td className="py-3.5 px-5 text-right text-amber-500 font-extrabold">
                          PKR {(financialData.totalSalesRevenue || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-5 pl-9 text-emerald-400 font-medium">├ Cash Direct Sales</td>
                        <td className="py-3 px-5 text-neutral-500">Direct cash paid by customers at counter</td>
                        <td className="py-3 px-5 text-right text-emerald-400">
                          PKR {(financialData.totalCashSales || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-5 pl-9 text-sky-400 font-medium">├ Customer Credit Sales</td>
                        <td className="py-3 px-5 text-neutral-500">Sales given on credit tab (receivables)</td>
                        <td className="py-3 px-5 text-right text-sky-400">
                          PKR {(financialData.creditSales || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-5 pl-9 text-purple-400 font-medium">├ Card / Digital Sales</td>
                        <td className="py-3 px-5 text-neutral-500">Card payments processed directly to bank</td>
                        <td className="py-3 px-5 text-right text-purple-400">
                          PKR {(financialData.cardSales || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-5 text-emerald-400 font-semibold">Customer Credit Collections</td>
                        <td className="py-3 px-5 text-neutral-500">Cash received settling old customer credit tabs</td>
                        <td className="py-3 px-5 text-right text-emerald-400 font-semibold">
                          +PKR {(financialData.creditSales || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-5 text-rose-400 font-semibold">Total Operational Expenses</td>
                        <td className="py-3 px-5 text-neutral-500">Daily expenses, utilities, salaries & PO costs</td>
                        <td className="py-3 px-5 text-right text-rose-500 font-semibold">
                          -PKR {(financialData.totalExpenses || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="bg-neutral-950/80 font-extrabold text-amber-400">
                        <td className="py-4 px-5 uppercase">ESTIMATED CASH IN REGISTER</td>
                        <td className="py-4 px-5 text-neutral-400 font-normal">
                          Cash Sales + Credit Collected – Cash Expenses
                        </td>
                        <td className="py-4 px-5 text-right text-amber-400 text-sm">
                          PKR {(financialData.cashInRegister || 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="bg-neutral-950 font-extrabold text-emerald-400 border-t-2 border-neutral-800">
                        <td className="py-4 px-5 uppercase">NET OPERATIONAL PROFIT</td>
                        <td className="py-4 px-5 text-neutral-400 font-normal">Total Revenue – Total Expenses</td>
                        <td className="py-4 px-5 text-right text-emerald-400 text-sm">
                          PKR {(financialData.netProfit || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORY SALES */}
          {activeTab === 'category-sales' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Donut Chart */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div>
                  <h2 className="text-xs font-extrabold text-white tracking-wider uppercase">
                    SALES SHARE BY CATEGORY
                  </h2>
                  <p className="text-[11px] text-neutral-400">Proportion of total revenue generated by each food category</p>
                </div>
                {categorySales.data.length === 0 ? (
                  <p className="py-12 text-center text-xs text-neutral-500 italic">No category sales recorded.</p>
                ) : (
                  <div className="h-72 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categorySales.data}
                          dataKey="totalRevenue"
                          nameKey="categoryName"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                        >
                          {categorySales.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0a0a0a',
                            borderColor: '#262626',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Category Details List */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
                <h2 className="text-xs font-extrabold text-white tracking-wider uppercase">
                  CATEGORY REVENUE DETAILS
                </h2>
                <div className="space-y-3">
                  {categorySales.data.map((cat, idx) => (
                    <div
                      key={cat.categoryId || idx}
                      className="flex items-center justify-between p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                        />
                        <div>
                          <p className="text-xs font-bold text-white">{cat.categoryName}</p>
                          <p className="text-[10px] text-neutral-500">{cat.itemsSold} items sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-extrabold text-white">
                          PKR {(cat.totalRevenue || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] font-semibold text-amber-500">{cat.percentage}% share</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BEST SELLERS */}
          {activeTab === 'best-sellers' && (
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-neutral-800">
                <h2 className="text-xs font-extrabold text-white tracking-wider uppercase">
                  TOP 15 SELLING PRODUCTS
                </h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">Most popular dishes ranked by total quantity sold</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950/60 text-neutral-400 uppercase font-bold border-b border-neutral-800">
                    <tr>
                      <th className="py-3.5 px-6">RANK</th>
                      <th className="py-3.5 px-6">PRODUCT NAME</th>
                      <th className="py-3.5 px-6">UNITS SOLD</th>
                      <th className="py-3.5 px-6">TOTAL REVENUE</th>
                      <th className="py-3.5 px-6 text-right">AVERAGE PRICE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {bestSellers.map((item, idx) => (
                      <tr key={item._id || idx} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="py-4 px-6 font-extrabold text-amber-500">#{idx + 1}</td>
                        <td className="py-4 px-6 font-bold text-white">{item._id}</td>
                        <td className="py-4 px-6 text-emerald-400 font-semibold">{item.quantitySold} pcs</td>
                        <td className="py-4 px-6 font-extrabold text-white">
                          PKR {(item.totalRevenue || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right text-neutral-400">
                          PKR {Math.round(item.avgPrice || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: PEAK BUSIEST HOURS */}
          {activeTab === 'peak-hours' && (
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-xs font-extrabold text-white tracking-wider uppercase">
                  24-HOUR PEAK ORDER DISTRIBUTION
                </h2>
                <p className="text-[11px] text-neutral-400">Busiest hours of the day for kitchen prep & staffing</p>
              </div>
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="label" stroke="#737373" fontSize={10} />
                    <YAxis stroke="#737373" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a0a0a',
                        borderColor: '#262626',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="orderCount" name="Orders" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 6: STAFF PERFORMANCE */}
          {activeTab === 'staff-performance' && (
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-neutral-800">
                <h2 className="text-xs font-extrabold text-white tracking-wider uppercase">
                  CASHIER & STAFF PERFORMANCE LEADERBOARD
                </h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">Total transactions processed by each staff member</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950/60 text-neutral-400 uppercase font-bold border-b border-neutral-800">
                    <tr>
                      <th className="py-3.5 px-6">STAFF MEMBER</th>
                      <th className="py-3.5 px-6">ROLE</th>
                      <th className="py-3.5 px-6">ORDERS PROCESSED</th>
                      <th className="py-3.5 px-6">TOTAL SALES GENERATED</th>
                      <th className="py-3.5 px-6 text-right">AVG ORDER VALUE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {staffPerformance.map((staff, idx) => (
                      <tr key={staff.staffId || idx} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-bold text-white">{staff.staffName}</p>
                          <p className="text-[10px] text-neutral-500">{staff.email}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            {staff.role}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-emerald-400 font-bold">{staff.ordersProcessed}</td>
                        <td className="py-4 px-6 font-extrabold text-white">
                          PKR {(staff.totalSalesGenerated || 0).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right text-neutral-400">
                          PKR {Math.round(staff.avgOrderValue || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: CUSTOMER REPORT */}
          {activeTab === 'customer-report' && (
            <div className="space-y-6">
              {/* Credit Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-sky-400 uppercase">
                    TOTAL CREDIT GIVEN (ALL-TIME)
                  </span>
                  <p className="text-2xl font-extrabold text-sky-400 mt-2">
                    PKR {(customerData.summary?.totalCreditGiven || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                    TOTAL CREDIT SETTLED
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                    PKR {(customerData.summary?.creditSettled || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-rose-400 uppercase">
                    CURRENT OUTSTANDING BALANCE (UDHAR)
                  </span>
                  <p className="text-2xl font-extrabold text-rose-500 mt-2">
                    PKR {(customerData.summary?.totalOutstanding || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Outstanding Credit List */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                    <h2 className="text-xs font-extrabold text-rose-400 tracking-wider uppercase">
                      OUTSTANDING CREDIT BALANCES (UDHAR)
                    </h2>
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full font-bold">
                      {customerData.outstandingCredit?.length || 0} Customers
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-950/60 text-neutral-400 uppercase font-bold border-b border-neutral-800 sticky top-0">
                        <tr>
                          <th className="py-3 px-5">CUSTOMER</th>
                          <th className="py-3 px-5">PHONE</th>
                          <th className="py-3 px-5 text-right">AMOUNT OWED</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {customerData.outstandingCredit?.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-neutral-500 italic">
                              No outstanding credit balances.
                            </td>
                          </tr>
                        ) : (
                          customerData.outstandingCredit?.map((cust) => (
                            <tr key={cust._id} className="hover:bg-neutral-800/30 transition-colors">
                              <td className="py-3 px-5 font-bold text-white">{cust.name}</td>
                              <td className="py-3 px-5 text-neutral-400">{cust.phone}</td>
                              <td className="py-3 px-5 text-right font-extrabold text-rose-400">
                                PKR {(cust.creditBalance || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Spenders List */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="p-4 border-b border-neutral-800">
                    <h2 className="text-xs font-extrabold text-amber-500 tracking-wider uppercase">
                      TOP CUSTOMERS BY TOTAL SPEND
                    </h2>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-950/60 text-neutral-400 uppercase font-bold border-b border-neutral-800 sticky top-0">
                        <tr>
                          <th className="py-3 px-5">CUSTOMER</th>
                          <th className="py-3 px-5">ORDERS</th>
                          <th className="py-3 px-5 text-right">TOTAL SPENT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {customerData.topSpenders?.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-neutral-500 italic">
                              No spend records in date range.
                            </td>
                          </tr>
                        ) : (
                          customerData.topSpenders?.map((cust, idx) => (
                            <tr key={cust.customerId || idx} className="hover:bg-neutral-800/30 transition-colors">
                              <td className="py-3 px-5">
                                <p className="font-bold text-white">{cust.name}</p>
                                <p className="text-[10px] text-neutral-500">{cust.phone}</p>
                              </td>
                              <td className="py-3 px-5 text-emerald-400 font-bold">{cust.orderCount}</td>
                              <td className="py-3 px-5 text-right font-extrabold text-white">
                                PKR {(cust.totalSpent || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SUPPLIER REPORT */}
          {activeTab === 'supplier-report' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-amber-500 uppercase">
                    TOTAL PURCHASE VOLUME
                  </span>
                  <p className="text-2xl font-extrabold text-amber-500 mt-2">
                    PKR {(supplierData.summary?.totalPurchaseVolume || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-xs">
                  <span className="text-[10px] font-bold tracking-wider text-rose-400 uppercase">
                    TOTAL SUPPLIER PAYABLE (OUTSTANDING)
                  </span>
                  <p className="text-2xl font-extrabold text-rose-500 mt-2">
                    PKR {(supplierData.summary?.totalOutstanding || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Per Supplier Breakdown Table */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-5 border-b border-neutral-800">
                  <h2 className="text-xs font-extrabold text-white tracking-wider uppercase">
                    SUPPLIER PURCHASE & OUTSTANDING SUMMARY
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-950/60 text-neutral-400 uppercase font-bold border-b border-neutral-800">
                      <tr>
                        <th className="py-3.5 px-6">SUPPLIER</th>
                        <th className="py-3.5 px-6">PURCHASE ORDERS</th>
                        <th className="py-3.5 px-6">TOTAL VOLUME</th>
                        <th className="py-3.5 px-6">TOTAL PAID</th>
                        <th className="py-3.5 px-6 text-right">OUTSTANDING OWED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {supplierData.data?.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-neutral-500 italic">
                            No supplier transactions recorded.
                          </td>
                        </tr>
                      ) : (
                        supplierData.data?.map((sup, idx) => (
                          <tr key={sup.supplierId || idx} className="hover:bg-neutral-800/30 transition-colors">
                            <td className="py-4 px-6">
                              <p className="font-bold text-white">{sup.supplierName}</p>
                              <p className="text-[10px] text-neutral-500">{sup.phone}</p>
                            </td>
                            <td className="py-4 px-6 text-neutral-300 font-bold">{sup.orderCount} POs</td>
                            <td className="py-4 px-6 font-bold text-white">
                              PKR {(sup.totalPurchaseVolume || 0).toLocaleString()}
                            </td>
                            <td className="py-4 px-6 text-emerald-400 font-bold">
                              PKR {(sup.totalPaid || 0).toLocaleString()}
                            </td>
                            <td className="py-4 px-6 text-right font-extrabold text-rose-400">
                              PKR {(sup.totalOutstanding || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Reports;

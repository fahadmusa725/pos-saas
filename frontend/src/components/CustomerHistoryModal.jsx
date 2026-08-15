import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { X, History, ShoppingBag } from 'lucide-react';

function CustomerHistoryModal({ customer, onClose }) {
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [totalSpend, setTotalSpend] = useState(0);
  const [activeTab, setActiveTab]   = useState('all'); // 'all', 'today', 'week', 'month'

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    api
      .get(`/customers/${customer._id}/orders`)
      .then((res) => {
        setOrders(res.data.data || []);
        setTotalSpend(res.data.totalSpend || 0);
      })
      .catch(() => {
        setOrders([]);
        setTotalSpend(0);
      })
      .finally(() => setLoading(false));
  }, [customer]);

  // Filter orders by time range
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const now = new Date();

    return orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      if (activeTab === 'today') {
        return (
          orderDate.getDate() === now.getDate() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      if (activeTab === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return orderDate >= oneWeekAgo;
      }
      if (activeTab === 'month') {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      return true; // 'all'
    });
  }, [orders, activeTab]);

  if (!customer) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-neutral-800 flex-shrink-0 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <History className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                Order History: {customer.name}
              </h2>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                Total Orders: {orders.length} | Total Spent: PKR {totalSpend.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-950/60 flex-shrink-0">
          <div className="flex gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono font-semibold text-neutral-400">
            {filteredOrders.length} order(s)
          </span>
        </div>

        {/* Itemized Order Cards List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-28 bg-neutral-800/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30 text-amber-500" />
              <p className="italic text-sm">No orders found for selected timeframe.</p>
            </div>
          ) : (
            filteredOrders.map((o) => {
              const isCreditOrder =
                o.paymentMethod === 'credit' ||
                (o.paymentBreakdown && o.paymentBreakdown.some((p) => p.method === 'credit'));

              const formattedDate = new Date(o.createdAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <div
                  key={o._id}
                  className="bg-neutral-950/80 border border-neutral-800/90 rounded-xl p-4 space-y-3 hover:border-neutral-700 transition shadow-xs"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-500 text-sm">
                        #{o.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-semibold capitalize">
                        {o.orderType || 'Dine-In'}
                      </span>
                      {isCreditOrder ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                          Credit Tab
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                          {o.paymentStatus || 'Paid'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400">{formattedDate}</span>
                  </div>

                  {/* Itemized Products List */}
                  {o.items && o.items.length > 0 && (
                    <div className="space-y-1.5 py-2 border-y border-neutral-800/80">
                      {o.items.map((item, idx) => {
                        const qty = item.quantity || 1;
                        const price = item.price || 0;
                        const itemTotal = qty * price;
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-neutral-300 font-medium">
                              {qty}x {item.name || item.itemName || 'Item'}
                              {item.variant ? ` (${item.variant})` : ''}
                            </span>
                            <span className="font-mono font-bold text-neutral-300">
                              PKR {itemTotal.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Card Bottom Total */}
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-neutral-400 font-medium">Total Amount</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      PKR {(o.total || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex justify-end flex-shrink-0 bg-neutral-950">
          <button
            onClick={onClose}
            className="px-6 py-2 text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerHistoryModal;

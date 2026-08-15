import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { CreditCard, Tag, Plus, Trash2, X, UserCheck } from 'lucide-react';

const ALL_PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'card', label: 'Card' },
  { id: 'online', label: 'Online' },
  { id: 'credit', label: 'Credit / Udhar' },
];

function CheckoutModal({ order, onClose, onSubmit, userRole }) {
  // Determine allowed payment methods based on role (credit only for admin / cashier)
  const isCreditAllowed = !userRole || ['restaurant-admin', 'super-admin', 'cashier'].includes(userRole);
  const availableMethods = isCreditAllowed
    ? ALL_PAYMENT_METHODS
    : ALL_PAYMENT_METHODS.filter((m) => m.id !== 'credit');

  const [payments, setPayments] = useState([{ method: 'cash', amount: order.total }]);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Customer selection state inside modal if order has no customer
  const [modalCustomerId, setModalCustomerId] = useState(order.customerId?._id || order.customerId || '');
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    if (isCreditAllowed && !modalCustomerId) {
      setLoadingCustomers(true);
      api
        .get('/customers')
        .then((res) => setCustomers(res.data.data || []))
        .catch(() => setCustomers([]))
        .finally(() => setLoadingCustomers(false));
    }
  }, [isCreditAllowed, modalCustomerId]);

  const couponDiscount = appliedCoupon
    ? Math.min(appliedCoupon.discountAmount ?? 0, order.total)
    : 0;
  const finalTotal = Math.max(0, order.total - couponDiscount);
  const totalEntered = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remaining = finalTotal - totalEntered;
  const changeAmount = remaining < 0 ? Math.abs(remaining) : 0;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);

    try {
      const res = await api.post('/coupons/validate', {
        code: couponCode.trim(),
        orderTotal: order.total,
      });
      setAppliedCoupon(res.data.data);
      toast.success('Coupon applied!');
    } catch (err) {
      setAppliedCoupon(null);
      toast.error(err.response?.data?.message || 'Invalid coupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleAddPayment = () => {
    setPayments([...payments, { method: 'card', amount: remaining > 0 ? remaining : 0 }]);
  };

  const handlePutRemainingOnCredit = () => {
    if (remaining <= 0) return;
    setPayments([...payments, { method: 'credit', amount: remaining }]);
  };

  const handleRemovePayment = (index) => {
    if (payments.length === 1) return;
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handlePaymentChange = (index, field, value) => {
    const updated = [...payments];
    if (field === 'method') {
      updated[index].method = value;
      if (value === 'credit') {
        const otherSum = updated.filter((_, i) => i !== index).reduce((s, p) => s + (Number(p.amount) || 0), 0);
        const rem = Math.max(0, finalTotal - otherSum);
        updated[index].amount = rem > 0 ? rem : finalTotal;
      }
    } else {
      updated[index][field] = Number(value);
    }
    setPayments(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasCredit = payments.some((p) => p.method === 'credit');
    const effectiveCustomerId = order.customerId?._id || order.customerId || modalCustomerId;

    if (hasCredit && !effectiveCustomerId) {
      toast.error('Credit / Udhar payment requires selecting a customer!');
      return;
    }

    if (totalEntered < finalTotal) {
      toast.error(`Insufficient payment amount. Remaining: Rs. ${remaining}`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        payments: payments.map((p) => ({ method: p.method, amount: Number(p.amount) })),
        changeAmount,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        customerId: effectiveCustomerId || undefined,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const hasCreditInPayments = payments.some((p) => p.method === 'credit');
  const activeCustomerName = order.customerId?.name || customers.find((c) => c._id === modalCustomerId)?.name;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-500" />
              Process Payment — #{order.orderNumber}
            </h2>
            <p className="text-xs text-neutral-500">Order Subtotal: Rs. {order.total}</p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Info / Picker if Udhar is used */}
        {hasCreditInPayments && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-amber-500">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />
                Customer for Udhar Record:
              </span>
              {activeCustomerName && (
                <span className="font-extrabold underline">{activeCustomerName}</span>
              )}
            </div>

            {!(order.customerId?._id || order.customerId) && (
              <div>
                <select
                  value={modalCustomerId}
                  onChange={(e) => setModalCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-neutral-100 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Coupon Code Input */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Have a Promo Coupon?
          </label>

          {appliedCoupon ? (
            <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                <span className="font-mono font-bold text-amber-500">{appliedCoupon.code}</span>
                <span className="text-neutral-500">(-Rs. {couponDiscount})</span>
              </div>
              <button type="button" onClick={removeCoupon} className="text-rose-500 hover:underline font-bold text-xs">
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
              >
                {couponLoading ? '...' : 'Apply'}
              </button>
            </div>
          )}
        </div>

        {/* Summary Breakdown */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-1.5 text-sm">
          <div className="flex justify-between text-neutral-600 dark:text-neutral-400 text-xs">
            <span>Order Subtotal</span>
            <span>Rs. {order.total}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-emerald-500 font-semibold text-xs">
              <span>Coupon Discount ({appliedCoupon.code})</span>
              <span>-Rs. {couponDiscount}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-800 font-extrabold text-neutral-900 dark:text-white">
            <span>Final Payable</span>
            <span className="text-xl text-amber-500">Rs. {finalTotal}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Methods Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Split / Payment Breakdown
              </label>
              {payments.length < 3 && (
                <button
                  type="button"
                  onClick={handleAddPayment}
                  className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Split Payment
                </button>
              )}
            </div>

            {payments.map((p, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={p.method}
                  onChange={(e) => handlePaymentChange(idx, 'method', e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-xl text-xs uppercase font-semibold"
                >
                  {availableMethods.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={p.amount}
                  onChange={(e) => handlePaymentChange(idx, 'amount', e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />

                {payments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePayment(idx)}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Quick Put Remaining on Udhar Button */}
          {remaining > 0 && isCreditAllowed && (
            <button
              type="button"
              onClick={handlePutRemainingOnCredit}
              className="w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Put Remaining Rs. {remaining} on Credit / Udhar
            </button>
          )}

          {/* Balance / Change Calculation */}
          <div className="p-3 bg-neutral-100 dark:bg-neutral-950 rounded-xl flex justify-between items-center text-xs font-bold">
            <span>Entered: Rs. {totalEntered}</span>
            {remaining > 0 ? (
              <span className="text-rose-500">Remaining: Rs. {remaining}</span>
            ) : (
              <span className="text-emerald-500">Change Due: Rs. {changeAmount}</span>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || remaining > 0}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-extrabold rounded-xl text-sm transition disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Confirm & Complete Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CheckoutModal;

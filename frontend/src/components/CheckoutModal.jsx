import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { CreditCard, Tag, Plus, Trash2, CheckCircle2, X } from 'lucide-react';

const PAYMENT_METHODS = ['cash', 'card', 'online'];

function CheckoutModal({ order, onClose, onSubmit }) {
  const [payments, setPayments] = useState([{ method: 'cash', amount: order.total }]);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    const { type, value, maxDiscountAmount } = appliedCoupon;
    let disc = type === 'percentage' ? (order.total * value) / 100 : value;
    if (maxDiscountAmount && maxDiscountAmount > 0) {
      disc = Math.min(disc, maxDiscountAmount);
    }
    return Math.min(disc, order.total);
  };

  const couponDiscount = calculateDiscount();
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
        orderSubtotal: order.total,
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

  const handleRemovePayment = (index) => {
    if (payments.length === 1) return;
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handlePaymentChange = (index, field, value) => {
    const updated = [...payments];
    updated[index][field] = field === 'amount' ? Number(value) : value;
    setPayments(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment submission failed');
    } finally {
      setSubmitting(false);
    }
  };

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
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
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

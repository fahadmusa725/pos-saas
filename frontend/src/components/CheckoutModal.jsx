import { useState, useEffect } from 'react';
import api from '../services/api';

function CheckoutModal({ order, isOpen, onClose, onPaymentSuccess }) {
  const [paymentMode, setPaymentMode] = useState('single'); // 'single' | 'split'
  const [singleMethod, setSingleMethod] = useState('cash');
  const [cashTendered, setCashTendered] = useState('');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Split payment rows state
  const [splitRows, setSplitRows] = useState([
    { method: 'cash', amount: '' },
    { method: 'card', amount: '' },
  ]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculate net order total taking applied coupon into account
  const currentDiscount = appliedCoupon ? appliedCoupon.discountAmount : (order?.discount || 0);
  const effectiveTotal = order ? Math.max(0, order.subtotal + (order.tax || 0) - currentDiscount) : 0;
  const remainingBalance = Math.max(0, effectiveTotal - (order?.amountPaid || 0));

  useEffect(() => {
    if (order) {
      const remaining = Math.max(0, order.total - (order.amountPaid || 0));
      setCashTendered(remaining.toString());
      setSplitRows([
        { method: 'cash', amount: (remaining / 2).toString() },
        { method: 'card', amount: (remaining / 2).toString() },
      ]);
      setError('');
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponError('');
      setPaymentMode('single');
      setSingleMethod('cash');
    }
  }, [order, isOpen]);

  useEffect(() => {
    setCashTendered(remainingBalance.toString());
  }, [remainingBalance]);

  if (!isOpen || !order) return null;

  // Single payment calculations
  const tenderedNum = Number(cashTendered) || 0;
  const changeAmount = singleMethod === 'cash' ? Math.max(0, tenderedNum - remainingBalance) : 0;

  // Split payment calculations
  const splitTotal = splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const splitBalanceDiff = remainingBalance - splitTotal;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    setValidatingCoupon(true);

    try {
      // Validate coupon against order subtotal (which includes item-level discounts)
      const res = await api.post('/coupons/validate', {
        code: couponCode.trim(),
        orderTotal: order.subtotal,
      });

      setAppliedCoupon(res.data.data);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.response?.data?.message || 'Invalid coupon code');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleAddSplitRow = () => {
    setSplitRows([...splitRows, { method: 'card', amount: '' }]);
  };

  const handleRemoveSplitRow = (index) => {
    setSplitRows(splitRows.filter((_, i) => i !== index));
  };

  const handleSplitRowChange = (index, field, value) => {
    const updated = [...splitRows];
    updated[index][field] = value;
    setSplitRows(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let paymentsPayload = [];
    let calculatedChange = 0;

    if (paymentMode === 'single') {
      if (singleMethod === 'cash') {
        if (tenderedNum < remainingBalance) {
          setError(`Tendered cash amount (Rs. ${tenderedNum}) is less than the remaining balance (Rs. ${remainingBalance})`);
          return;
        }
        paymentsPayload = [{ method: 'cash', amount: remainingBalance }];
        calculatedChange = changeAmount;
      } else {
        paymentsPayload = [{ method: singleMethod, amount: remainingBalance }];
        calculatedChange = 0;
      }
    } else {
      // Split Payment validation
      if (splitRows.length === 0) {
        setError('Please add at least one payment entry');
        return;
      }

      let cashSum = 0;
      let nonCashSum = 0;

      for (let r of splitRows) {
        const amt = Number(r.amount);
        if (!amt || amt <= 0) {
          setError('Each payment entry must have a valid positive amount');
          return;
        }
        if (r.method === 'cash') {
          cashSum += amt;
        } else {
          nonCashSum += amt;
        }
      }

      if (nonCashSum > remainingBalance) {
        setError(`Non-cash split payments (Rs. ${nonCashSum}) cannot exceed remaining balance (Rs. ${remainingBalance}). Overpayment is only allowed for cash.`);
        return;
      }

      const totalSplitSubmitted = cashSum + nonCashSum;
      if (totalSplitSubmitted < remainingBalance) {
        setError(`Total split payment (Rs. ${totalSplitSubmitted}) is less than remaining balance (Rs. ${remainingBalance})`);
        return;
      }

      paymentsPayload = splitRows.map((r) => ({
        method: r.method,
        amount: Number(r.amount),
      }));

      calculatedChange = Math.max(0, totalSplitSubmitted - remainingBalance);
    }

    try {
      setSubmitting(true);
      await onPaymentSuccess({
        payments: paymentsPayload,
        changeAmount: calculatedChange,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 my-8 border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Process Checkout</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">Order #{order.orderNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2.5 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        {/* Coupon Code Section */}
        <div className="bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50 space-y-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Apply Coupon Code</label>

          {appliedCoupon ? (
            <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 p-2 rounded-lg text-xs">
              <div>
                <span className="font-mono font-bold text-emerald-800 dark:text-emerald-300">{appliedCoupon.code}</span>
                <span className="ml-2 text-emerald-700 dark:text-emerald-400 font-semibold">(-Rs. {appliedCoupon.discountAmount})</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-red-500 hover:text-red-700 text-xs font-bold px-2"
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Code (e.g. SAVE10)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || validatingCoupon}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                {validatingCoupon ? '...' : 'Apply'}
              </button>
            </div>
          )}

          {couponError && <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">{couponError}</p>}
        </div>

        {/* Order Summary Box */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-300">
            <span>Subtotal:</span>
            <span className="font-semibold text-gray-900 dark:text-white">Rs. {order.subtotal}</span>
          </div>
          {currentDiscount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Coupon Discount:</span>
              <span className="font-semibold">- Rs. {currentDiscount}</span>
            </div>
          )}
          {order.amountPaid > 0 && (
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
              <span>Already Paid:</span>
              <span className="font-semibold">Rs. {order.amountPaid}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold border-t dark:border-gray-600 pt-2 text-blue-900 dark:text-blue-300">
            <span>Remaining Due:</span>
            <span>Rs. {remainingBalance}</span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPaymentMode('single')}
            className={`flex-1 py-2 rounded-lg transition ${
              paymentMode === 'single'
                ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            Single Payment
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode('split')}
            className={`flex-1 py-2 rounded-lg transition ${
              paymentMode === 'split'
                ? 'bg-white dark:bg-gray-800 shadow text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
            }`}
          >
            Split Bill (Multiple)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SINGLE PAYMENT MODE */}
          {paymentMode === 'single' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {['cash', 'card', 'online'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSingleMethod(method)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold capitalize border transition ${
                        singleMethod === method
                          ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {singleMethod === 'cash' && (
                <div className="space-y-2 bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Cash Tendered (Rs.)</label>
                    <input
                      type="number"
                      required
                      min={remainingBalance}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-base font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-800 dark:text-emerald-400 pt-1">
                    <span>Change to Return:</span>
                    <span className="text-sm">Rs. {changeAmount}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SPLIT PAYMENT MODE */}
          {paymentMode === 'split' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Split Method Breakdown</label>
              {splitRows.map((row, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    value={row.method}
                    onChange={(e) => handleSplitRowChange(index, 'method', e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                    <option value="other">Other</option>
                  </select>

                  <input
                    type="number"
                    required
                    placeholder="Amount"
                    value={row.amount}
                    onChange={(e) => handleSplitRowChange(index, 'amount', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />

                  {splitRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSplitRow(index)}
                      className="text-red-500 hover:text-red-700 px-2 py-1 text-sm font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={handleAddSplitRow}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  + Add Another Payment Method
                </button>
                <div className="text-xs font-bold text-gray-600 dark:text-gray-300">
                  Total Split: <span className={splitBalanceDiff < 0 ? 'text-emerald-600' : 'text-blue-600'}>Rs. {splitTotal}</span>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 border-t dark:border-gray-700 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Complete Payment & Checkout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CheckoutModal;

import { Printer, CheckCircle, X } from 'lucide-react';

function ReceiptModal({ order, restaurantName = 'Restaurant', onClose }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Actions bar (hidden in print) */}
        <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-3 print:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Payment Completed
          </span>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Printable Card */}
        <div className="bg-white text-neutral-900 p-4 rounded-xl border border-neutral-200 space-y-4 font-mono text-xs shadow-inner">
          <div className="text-center space-y-1">
            <h2 className="text-base font-extrabold tracking-tight text-neutral-900 uppercase">{restaurantName}</h2>
            <p className="text-[11px] text-neutral-500">Official Bill / Receipt</p>
            <p className="text-[10px] text-neutral-400">Order #{order.orderNumber} • {new Date(order.createdAt || Date.now()).toLocaleString()}</p>
          </div>

          <div className="border-t border-b border-dashed border-neutral-300 py-2 space-y-1">
            <div className="flex justify-between text-[11px] font-bold">
              <span>Type: {order.orderType?.toUpperCase()}</span>
              <span>{order.tableId ? `Table ${order.tableId.tableNumber}` : ''}</span>
            </div>
            {order.customerId && (
              <div className="text-[10px] text-neutral-600">Customer: {order.customerId.name} ({order.customerId.phone})</div>
            )}
          </div>

          {/* Items Table */}
          <div className="space-y-1.5">
            {order.items?.map((item, idx) => {
              const hasDisc = item.itemDiscount && item.itemDiscount.value > 0;
              return (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div className="flex-1 pr-2">
                    <div>{item.name} × {item.quantity}</div>
                    {hasDisc && (
                      <div className="text-[9px] text-neutral-400">
                        Disc: {item.itemDiscount.discountType === 'percentage' ? `${item.itemDiscount.value}%` : `Rs.${item.itemDiscount.value}`}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {hasDisc && <s className="text-neutral-400 text-[9px]">Rs. {item.price * item.quantity}</s>}
                    <div className="font-bold">Rs. {item.itemNetTotal !== undefined ? item.itemNetTotal : item.price * item.quantity}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals Breakdown */}
          <div className="border-t border-dashed border-neutral-300 pt-2 space-y-1">
            {order.couponDiscount > 0 && (
              <div className="flex justify-between text-[10px] text-emerald-600">
                <span>Coupon Discount ({order.couponCode})</span>
                <span>-Rs. {order.couponDiscount}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-neutral-200">
              <span>TOTAL PAID</span>
              <span>Rs. {order.total}</span>
            </div>
          </div>

          {/* Split Payment Breakdown */}
          {order.paymentBreakdown?.length > 0 && (
            <div className="border-t border-dashed border-neutral-300 pt-2 text-[10px] space-y-0.5 text-neutral-600">
              <div className="font-bold uppercase text-neutral-800">Payment Method(s):</div>
              {order.paymentBreakdown.map((p, i) => (
                <div key={i} className="flex justify-between uppercase">
                  <span>• {p.paymentMethod}</span>
                  <span>Rs. {p.amount}</span>
                </div>
              ))}
              {order.changeAmount > 0 && (
                <div className="flex justify-between text-neutral-500 font-bold pt-1">
                  <span>Change Given:</span>
                  <span>Rs. {order.changeAmount}</span>
                </div>
              )}
            </div>
          )}

          <div className="text-center pt-2 text-[10px] text-neutral-400">
            Thank you for dining with us!
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReceiptModal;

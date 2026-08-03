import { useRef } from 'react';

function ReceiptModal({ order, restaurantName, isOpen, onClose }) {
  const printRef = useRef();

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const originalBody = document.body.innerHTML;
    document.body.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Share Tech Mono', 'Courier New', monospace; font-size: 11px; width: 80mm; color: #000; }
        .receipt-container { padding: 6mm; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 4px 0; }
        .row { display: flex; justify-content: space-between; }
        .section { margin: 4px 0; }
        .big { font-size: 13px; font-weight: bold; }
        .small { font-size: 10px; }
      </style>
      <div class="receipt-container">${printContents}</div>
    `;
    window.print();
    document.body.innerHTML = originalBody;
    window.location.reload();
  };

  const orderDate = new Date(order.createdAt);
  const printDate = new Date();

  // Payment method display
  const paymentLabel = order.paymentBreakdown?.length > 1
    ? 'Split'
    : order.paymentMethod?.charAt(0).toUpperCase() + order.paymentMethod?.slice(1) || 'Cash';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl my-8">
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-gray-900">Receipt Preview</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
            >
              🖨️ Print Receipt
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-lg transition"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Thermal Receipt Preview */}
        <div
          ref={printRef}
          className="bg-white border border-dashed border-gray-300 rounded-xl p-5 font-mono text-xs leading-relaxed text-gray-900"
          style={{ fontFamily: "'Share Tech Mono', 'Courier New', monospace", fontSize: '11px' }}
        >
          {/* Restaurant Header */}
          <div className="text-center mb-3">
            <div className="font-bold text-sm tracking-widest uppercase">{restaurantName || 'Restaurant'}</div>
            <div className="text-xs text-gray-500 mt-0.5">Point of Sale — Thermal Receipt</div>
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Order Info */}
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between">
              <span>Order #:</span>
              <span className="font-bold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="capitalize">{order.orderType}</span>
            </div>
            {order.tableId?.tableNumber && (
              <div className="flex justify-between">
                <span>Table:</span>
                <span>{order.tableId.tableNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{orderDate.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span>Printed:</span>
              <span>{printDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Items Header */}
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="flex-1">ITEM</span>
            <span className="w-8 text-center">QTY</span>
            <span className="w-14 text-right">PRICE</span>
            <span className="w-14 text-right">TOTAL</span>
          </div>
          <div className="border-t border-dashed border-gray-400 mb-2" />

          {/* Items */}
          {order.items?.map((item, i) => {
            const hasItemDiscount = item.itemDiscount && item.itemDiscount.value > 0;
            const originalUnitPrice = item.price;
            let discountedUnitPrice = originalUnitPrice;

            if (hasItemDiscount) {
              if (item.itemDiscount.discountType === 'percentage') {
                discountedUnitPrice = originalUnitPrice * (1 - item.itemDiscount.value / 100);
              } else {
                discountedUnitPrice = Math.max(0, originalUnitPrice - item.itemDiscount.value);
              }
            }

            const itemLineTotal = discountedUnitPrice * item.quantity;

            return (
              <div key={i} className="mb-1">
                <div className="flex justify-between items-start text-xs">
                  <span className="flex-1 pr-1 leading-tight">{item.name}</span>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <span className="w-16 text-right">
                    {hasItemDiscount ? (
                      <>
                        <s className="text-gray-400 text-[10px]">Rs.{originalUnitPrice}</s>{' '}
                        <span>Rs.{discountedUnitPrice.toFixed(0)}</span>
                      </>
                    ) : (
                      `Rs.${originalUnitPrice}`
                    )}
                  </span>
                  <span className="w-14 text-right">Rs.{itemLineTotal.toFixed(0)}</span>
                </div>
                {/* Add-ons if any */}
                {item.addOns?.map((a, ai) => (
                  <div key={ai} className="text-xs text-gray-500 pl-2">
                    + {a.name} Rs.{a.price}
                  </div>
                ))}
              </div>
            );
          })}

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Totals */}
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>Rs. {order.subtotal || order.total}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>Rs. {order.tax}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between font-semibold text-emerald-800">
                <span>Coupon Discount:</span>
                <span>- Rs. {order.discount}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          <div className="flex justify-between text-sm font-bold">
            <span>TOTAL:</span>
            <span>Rs. {order.total}</span>
          </div>

          {/* Payment Breakdown */}
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="text-xs font-bold mb-1">PAYMENT</div>

          {order.paymentBreakdown?.length > 1 ? (
            <div className="space-y-0.5 text-xs">
              {order.paymentBreakdown.map((p, i) => (
                <div key={i} className="flex justify-between">
                  <span className="capitalize">  {p.method}:</span>
                  <span>Rs. {p.amount}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-between text-xs">
              <span>Method:</span>
              <span className="font-semibold">{paymentLabel}</span>
            </div>
          )}

          <div className="flex justify-between text-xs mt-1">
            <span>Amount Paid:</span>
            <span className="font-bold">Rs. {order.amountPaid || order.total}</span>
          </div>

          {order.changeAmount > 0 && (
            <div className="flex justify-between text-xs text-emerald-700 font-bold">
              <span>Change:</span>
              <span>Rs. {order.changeAmount}</span>
            </div>
          )}

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Payment Status */}
          <div className="text-center text-xs">
            {order.paymentStatus === 'paid' ? (
              <span className="font-bold tracking-widest">✓ PAID — THANK YOU!</span>
            ) : order.paymentStatus === 'partially_paid' ? (
              <span className="font-bold text-orange-600">
                PARTIAL PAYMENT — BALANCE: Rs. {order.total - (order.amountPaid || 0)}
              </span>
            ) : (
              <span className="font-bold text-red-600">UNPAID</span>
            )}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 space-y-0.5">
            <div>Thank you for dining with us!</div>
            <div>Visit us again 😊</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceiptModal;

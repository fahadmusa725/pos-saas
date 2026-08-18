import { useState, useEffect } from 'react';
import { Printer, CheckCircle, X } from 'lucide-react';
import api from '../services/api';

function ReceiptModal({ order, restaurantName = 'Restaurant', onClose }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get('/settings')
      .then((res) => {
        if (res.data?.success) {
          setSettings(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : new Date().toLocaleString();

  const items = order.items || [];
  const hasRounds = items.some((i) => (i.round || 1) > 1);

  const displayName = settings?.name || restaurantName;
  const displayAddress = settings?.address || '';
  const displayPhone = settings?.phone || '';
  const footerMessage = settings?.receiptFooterMessage || 'Thank you for dining with us! Visit again soon.';
  const showBarcode = settings?.showBarcodeOnReceipt ?? true;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      {/* CSS style block for print media query override */}
      <style>{`
        @media print {
          .printable-items-list {
            overflow: visible !important;
            max-height: none !important;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Top Actions bar (fixed top, hidden in print) */}
        <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-3 shrink-0 print:hidden">
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> Thermal Invoice / Receipt
          </span>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal 80mm Printable Receipt Box */}
        <div className="bg-white text-neutral-900 p-4 rounded-xl border border-neutral-300 flex flex-col overflow-hidden font-mono text-xs shadow-sm select-text flex-1 my-3 space-y-2">
          
          {/* Receipt Top Header & Order Info (Fixed Top inside ticket) */}
          <div className="shrink-0 space-y-2">
            <div className="text-center space-y-0.5 pb-1">
              <h2 className="text-lg font-black tracking-wider uppercase text-neutral-950">{displayName}</h2>
              {displayAddress && <p className="text-[10px] text-neutral-600 font-medium">{displayAddress}</p>}
              {displayPhone && <p className="text-[10px] text-neutral-600 font-medium">Ph: {displayPhone}</p>}
              <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold pt-1">Official Sales Receipt / Tax Invoice</p>
              <p className="text-[10px] text-neutral-500">{formattedDate}</p>
            </div>

            <div className="border-t-2 border-b-2 border-neutral-900 py-1.5 space-y-0.5 text-[11px]">
              <div className="flex justify-between font-bold">
                <span>ORDER #: {order.orderNumber}</span>
                <span className="uppercase text-amber-700">{order.orderType}</span>
              </div>
              {order.tableId && (
                <div className="flex justify-between text-neutral-700">
                  <span>TABLE #: Table {order.tableId.tableNumber || order.tableId}</span>
                  <span>STATUS: {order.paymentStatus?.toUpperCase()}</span>
                </div>
              )}
              {order.customerId && (
                <div className="text-neutral-700 pt-0.5 border-t border-neutral-200 text-[10px]">
                  CUSTOMER: <span className="font-bold">{order.customerId.name}</span> ({order.customerId.phone})
                </div>
              )}
            </div>

            {/* Items Column Header */}
            <div className="flex justify-between font-extrabold text-[10px] uppercase tracking-wider border-b border-neutral-400 pb-1 text-neutral-800 pt-1">
              <span className="w-8">QTY</span>
              <span className="flex-1 px-1">ITEM DESCRIPTION</span>
              <span className="w-16 text-right">TOTAL</span>
            </div>
          </div>

          {/* Items List (SCROLLABLE MIDDLE CONTAINER) */}
          <div className="flex-1 overflow-y-auto max-h-[35vh] space-y-2 py-1 pr-1 border-b border-neutral-200 printable-items-list">
            {!hasRounds ? (
              items.map((item, idx) => {
                const basePrice = item.price * item.quantity;
                const hasDisc = item.itemDiscount && item.itemDiscount.value > 0;
                let discAmt = 0;
                if (hasDisc) {
                  discAmt = item.itemDiscount.discountType === 'percentage'
                    ? (basePrice * item.itemDiscount.value) / 100
                    : item.itemDiscount.value * item.quantity;
                }
                const netPrice = Math.max(0, basePrice - discAmt);

                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between items-start text-[11px]">
                      <span className="w-8 font-bold">{item.quantity}x</span>
                      <span className="flex-1 px-1 font-medium leading-tight">
                        {item.name}
                        {item.variant && <span className="text-[10px] text-neutral-600 block">Size: {item.variant}</span>}
                        {item.addOns && item.addOns.length > 0 && (
                          <span className="text-[9px] text-neutral-500 block">+ {item.addOns.map((a) => a.name).join(', ')}</span>
                        )}
                      </span>
                      <span className="w-16 text-right font-bold">Rs. {netPrice}</span>
                    </div>
                    {hasDisc && (
                      <div className="text-[9px] text-neutral-500 pl-9 flex justify-between">
                        <span>Original: <s>Rs. {basePrice}</s></span>
                        <span>Disc: -Rs. {discAmt}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              (() => {
                const grouped = items.reduce((acc, item) => {
                  const r = item.round || 1;
                  if (!acc[r]) acc[r] = [];
                  acc[r].push(item);
                  return acc;
                }, {});

                return Object.entries(grouped).map(([roundNum, rItems]) => (
                  <div key={roundNum} className="space-y-1.5">
                    <div className="text-[10px] font-extrabold uppercase bg-neutral-100 text-neutral-800 px-1 py-0.5 border-l-2 border-neutral-800">
                      --- ROUND {roundNum} {Number(roundNum) > 1 ? '(ADDITION)' : ''} ---
                    </div>
                    {rItems.map((item, idx) => {
                      const basePrice = item.price * item.quantity;
                      const hasDisc = item.itemDiscount && item.itemDiscount.value > 0;
                      let discAmt = 0;
                      if (hasDisc) {
                        discAmt = item.itemDiscount.discountType === 'percentage'
                          ? (basePrice * item.itemDiscount.value) / 100
                          : item.itemDiscount.value * item.quantity;
                      }
                      const netPrice = Math.max(0, basePrice - discAmt);

                      return (
                        <div key={idx} className="space-y-0.5 pl-1">
                          <div className="flex justify-between items-start text-[11px]">
                            <span className="w-8 font-bold">{item.quantity}x</span>
                            <span className="flex-1 px-1 font-medium leading-tight">
                              {item.name}
                              {item.variant && <span className="text-[10px] text-neutral-600 block">Size: {item.variant}</span>}
                            </span>
                            <span className="w-16 text-right font-bold">Rs. {netPrice}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()
            )}
          </div>

          {/* Totals, Financial Breakdown & Footer (Fixed Bottom inside ticket) */}
          <div className="shrink-0 pt-1 space-y-2">
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-neutral-700">
                <span>Subtotal:</span>
                <span>Rs. {order.subtotal || order.total}</span>
              </div>

              {order.tax > 0 && (
                <div className="flex justify-between text-neutral-700">
                  <span>Tax / GST ({settings?.taxRate ?? 0}%):</span>
                  <span>+Rs. {order.tax}</span>
                </div>
              )}

              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount / Coupon:</span>
                  <span>-Rs. {order.discount}</span>
                </div>
              )}

              <div className="flex justify-between items-center font-black text-base pt-1 pb-1 border-t-2 border-neutral-900 border-b-2 my-1">
                <span>GRAND TOTAL</span>
                <span>Rs. {order.total}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-1 text-[11px]">
              <div className="font-bold uppercase text-neutral-800 text-[10px]">Payment Details:</div>
              {order.paymentBreakdown && order.paymentBreakdown.length > 0 ? (
                order.paymentBreakdown.map((p, i) => (
                  <div key={i} className="flex justify-between text-neutral-700 uppercase">
                    <span>• {p.method || p.paymentMethod}</span>
                    <span className="font-bold">Rs. {p.amount}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-neutral-700 uppercase">
                  <span>• {order.paymentMethod || 'Cash'}</span>
                  <span className="font-bold">Rs. {order.total}</span>
                </div>
              )}

              {order.changeAmount > 0 && (
                <div className="flex justify-between text-neutral-800 font-bold pt-1 border-t border-dotted border-neutral-400">
                  <span>Change Returned:</span>
                  <span>Rs. {order.changeAmount}</span>
                </div>
              )}
            </div>

            {/* Barcode & Footer Note */}
            <div className="text-center pt-2 space-y-1 border-t border-dashed border-neutral-300">
              {showBarcode && (
                <div className="flex items-center justify-center gap-1 h-5 px-4">
                  <div className="w-1 h-full bg-neutral-900"></div>
                  <div className="w-2 h-full bg-neutral-900"></div>
                  <div className="w-0.5 h-full bg-neutral-900"></div>
                  <div className="w-1.5 h-full bg-neutral-900"></div>
                  <div className="w-1 h-full bg-neutral-900"></div>
                  <div className="w-3 h-full bg-neutral-900"></div>
                  <div className="w-0.5 h-full bg-neutral-900"></div>
                  <div className="w-2 h-full bg-neutral-900"></div>
                  <div className="w-1 h-full bg-neutral-900"></div>
                </div>
              )}
              <p className="text-[10px] font-bold tracking-wider text-neutral-700 uppercase">{footerMessage}</p>
              <p className="text-[9px] text-neutral-500 italic">Powered by DineFlow POS SaaS System</p>
            </div>
          </div>

        </div>

        {/* Modal Footer Buttons (STICKY BOTTOM, ALWAYS VISIBLE, HIDDEN IN PRINT) */}
        <div className="flex gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 shrink-0 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-neutral-950 font-extrabold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Thermal Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

export default ReceiptModal;

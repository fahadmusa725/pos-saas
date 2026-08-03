const Order = require('../models/Order');
const Table = require('../models/Table');

// Order number generate karne ka helper
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  return `ORD-${timestamp}`;
};

// @desc Create order
// @route POST /api/orders
exports.createOrder = async (req, res) => {
  try {
    const { orderType, tableId, items, tax, discount, couponCode, paymentMethod, isHeld, customerId } = req.body;

    if (!orderType || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'orderType and items are required' });
    }

    // Item-level discount bounds & Subtotal calculation
    let subtotal = 0;
    const processedItems = items.map((item) => {
      const baseItemPrice = Number(item.price);
      const addOnsTotal = (item.addOns || []).reduce((sum, a) => sum + Number(a.price), 0);
      const itemQuantity = Number(item.quantity) || 1;

      let itemDiscountAmount = 0;
      if (item.itemDiscount && item.itemDiscount.value > 0) {
        const dType = item.itemDiscount.discountType;
        const dVal = Number(item.itemDiscount.value);

        // Backend Bounds Validation for Item Discount
        if (dType === 'percentage') {
          if (dVal < 0 || dVal > 100) {
            throw new Error(`Item percentage discount must be between 0% and 100% for ${item.name}`);
          }
          itemDiscountAmount = (baseItemPrice * (dVal / 100)) * itemQuantity;
        } else if (dType === 'fixed') {
          if (dVal < 0) {
            throw new Error(`Item fixed discount cannot be negative for ${item.name}`);
          }
          const fixedPerUnit = Math.min(dVal, baseItemPrice);
          itemDiscountAmount = fixedPerUnit * itemQuantity;
        }
      }

      const rawItemTotal = (baseItemPrice + addOnsTotal) * itemQuantity;
      const netItemTotal = Math.max(0, rawItemTotal - itemDiscountAmount);
      subtotal += netItemTotal;

      return {
        ...item,
        price: baseItemPrice,
        quantity: itemQuantity,
        itemDiscount: item.itemDiscount || { value: 0 },
      };
    });

    const taxAmount = Number(tax) || 0;
    let finalCouponDiscount = Number(discount) || 0;

    // Server-side Coupon Re-validation Guard
    if (couponCode) {
      const Coupon = require('../models/Coupon');
      const { calculateCouponDiscount } = require('./couponController');

      const coupon = await Coupon.findOne({
        restaurantId: req.tenantId,
        code: couponCode.trim().toUpperCase(),
      });

      if (!coupon) {
        return res.status(400).json({ success: false, message: 'Invalid coupon code' });
      }

      // Validates coupon against item-discounted subtotal
      finalCouponDiscount = calculateCouponDiscount(coupon, subtotal);
    }

    // Total Calculation with Math.max(0, total) floor capping
    const rawTotal = subtotal + taxAmount - finalCouponDiscount;
    const total = Math.max(0, rawTotal);

    const order = await Order.create({
      restaurantId: req.tenantId,
      orderNumber: generateOrderNumber(),
      orderType,
      tableId: tableId || null,
      customerId: customerId || null,
      items: processedItems,
      subtotal,
      tax: taxAmount,
      discount: finalCouponDiscount,
      total,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'unpaid',
      isHeld: Boolean(isHeld),
      createdBy: req.user._id,
    });

    // Agar dine-in hai to table ko occupied mark karo
    if (orderType === 'dine-in' && tableId) {
      await Table.findByIdAndUpdate(tableId, { status: 'occupied' });
    }

    // Real-time event bhejo Kitchen Display System ko
    req.io.to(req.tenantId.toString()).emit('newOrder', order);

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all orders (with optional status filter)
// @route GET /api/orders
exports.getOrders = async (req, res) => {
  try {
    const filter = { restaurantId: req.tenantId };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const orders = await Order.find(filter)
      .populate('tableId', 'tableNumber')
      .populate('customerId', 'name phone')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get single order
// @route GET /api/orders/:id
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.tenantId })
      .populate('tableId', 'tableNumber')
      .populate('customerId', 'name phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update order status (whole order)
// @route PUT /api/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.tenantId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    // Agar order complete/cancel ho gaya aur dine-in tha, to table free karo
    if (['completed', 'cancelled'].includes(status) && order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, { status: 'available' });
    }

    // Real-time update bhejo (kitchen + waiter dono ke liye)
    req.io.to(req.tenantId.toString()).emit('orderStatusUpdated', order);

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update single item status (kitchen use karega)
// @route PUT /api/orders/:orderId/items/:itemId/status
exports.updateItemStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { orderId, itemId } = req.params;

    const order = await Order.findOne({ _id: orderId, restaurantId: req.tenantId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Order item not found' });
    }

    item.status = status;
    await order.save();

    req.io.to(req.tenantId.toString()).emit('orderItemStatusUpdated', { orderId, itemId, status });

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Process payment & mark order as paid (with breakdown & overpayment validation)
// @route PUT /api/orders/:id/pay
exports.markAsPaid = async (req, res) => {
  try {
    const { payments, changeAmount, couponCode } = req.body;

    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.tenantId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // If couponCode is provided during payment, re-validate & update order discount & total on server
    if (couponCode && order.paymentStatus === 'unpaid') {
      const Coupon = require('../models/Coupon');
      const { calculateCouponDiscount } = require('./couponController');

      const coupon = await Coupon.findOne({
        restaurantId: req.tenantId,
        code: couponCode.trim().toUpperCase(),
      });

      if (!coupon) {
        return res.status(400).json({ success: false, message: 'Invalid coupon code' });
      }

      const verifiedDiscount = calculateCouponDiscount(coupon, order.subtotal);
      order.discount = verifiedDiscount;
      order.total = Math.max(0, order.subtotal + order.tax - verifiedDiscount);
    }

    // Default fallback if single payment payload is sent
    let newPayments = payments;
    if (!newPayments || !Array.isArray(newPayments) || newPayments.length === 0) {
      const method = req.body.paymentMethod || order.paymentMethod || 'cash';
      newPayments = [{ method, amount: order.total }];
    }

    // Validate overpayment: non-cash methods (card, online, other) cannot exceed remaining balance
    const remainingBalance = Math.max(0, order.total - order.amountPaid);
    let totalNewPaymentAmount = 0;
    let nonCashPaymentTotal = 0;

    for (let p of newPayments) {
      if (!p.method || !p.amount || p.amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid payment amount or method' });
      }
      totalNewPaymentAmount += Number(p.amount);
      if (p.method !== 'cash') {
        nonCashPaymentTotal += Number(p.amount);
      }
    }

    if (nonCashPaymentTotal > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Non-cash payment amount (Rs. ${nonCashPaymentTotal}) cannot exceed the remaining balance (Rs. ${remainingBalance}). Overpayment is only allowed for Cash transactions to return change.`,
      });
    }

    // Append to existing breakdown
    order.paymentBreakdown = order.paymentBreakdown || [];
    newPayments.forEach((p) => {
      order.paymentBreakdown.push({
        method: p.method,
        amount: Number(p.amount),
        paidAt: new Date(),
      });
    });

    const accumulatedPaid = order.paymentBreakdown.reduce((sum, p) => sum + p.amount, 0);
    order.amountPaid = accumulatedPaid;

    if (accumulatedPaid >= order.total) {
      order.paymentStatus = 'paid';
      order.status = 'completed';
      order.changeAmount = changeAmount ? Number(changeAmount) : Math.max(0, accumulatedPaid - order.total);

      // Table Status Sync: Free occupied table upon order completion
      if (order.tableId) {
        await Table.findByIdAndUpdate(order.tableId, { status: 'available' });
      }
    } else if (accumulatedPaid > 0) {
      order.paymentStatus = 'partially_paid';
    }

    // Set dominant payment method name
    if (order.paymentBreakdown.length > 1) {
      order.paymentMethod = 'split';
    } else if (order.paymentBreakdown.length === 1) {
      order.paymentMethod = order.paymentBreakdown[0].method;
    }

    await order.save();

    // Real-time socket updates for KDS & Waiter views
    req.io.to(req.tenantId.toString()).emit('orderStatusUpdated', order);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
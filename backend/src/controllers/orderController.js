const Order = require('../models/Order');
const Table = require('../models/Table');

// Order number generate karne ka helper
const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  return `ORD-${timestamp}`;
};

// Helper function to validate stock levels for items with recipes
const validateStockForItems = async (items, restaurantId) => {
  const MenuItem = require('../models/MenuItem');
  const InventoryItem = require('../models/InventoryItem');

  // Aggregated required quantities per ingredient
  const requiredStock = {};

  for (const item of items) {
    const menuItemId = item.menuItemId || item._id;
    if (!menuItemId) continue;

    const menuItem = await MenuItem.findOne({
      _id: menuItemId,
      restaurantId,
    }).select('name recipe variants');

    // ONLY check stock for menu items that have a non-empty recipe
    if (menuItem && menuItem.recipe && menuItem.recipe.length > 0) {
      // Find portion multiplier if a variant was selected
      let multiplier = 1;
      if (item.variant && menuItem.variants && menuItem.variants.length > 0) {
        const foundVariant = menuItem.variants.find((v) => v.name === item.variant);
        if (foundVariant && foundVariant.portionMultiplier) {
          multiplier = Number(foundVariant.portionMultiplier);
        }
      }

      const itemQty = Number(item.quantity) || 1;

      for (const ingredient of menuItem.recipe) {
        if (!ingredient.inventoryItemId || !ingredient.quantityUsed) continue;
        const invId = ingredient.inventoryItemId.toString();
        const reqQty = Number(ingredient.quantityUsed) * multiplier * itemQty;

        requiredStock[invId] = (requiredStock[invId] || 0) + reqQty;
      }
    }
  }

  // Check required stock against database currentStock
  for (const [invId, totalRequired] of Object.entries(requiredStock)) {
    const invItem = await InventoryItem.findOne({ _id: invId, restaurantId });
    if (invItem && invItem.currentStock < totalRequired) {
      const avail = Math.max(0, invItem.currentStock);
      throw new Error(
        `Insufficient stock for ingredient: ${invItem.name}. Available: ${avail} ${invItem.unit || ''}, Required: ${totalRequired.toFixed(2)} ${invItem.unit || ''}`
      );
    }
  }
};

// Helper function to auto-derive overall order status from item statuses
const deriveOrderStatusFromItems = (order) => {
  if (!order.items || order.items.length === 0) return order.status;

  const statuses = order.items.map((i) => i.status || 'pending');

  const allServed = statuses.every((s) => s === 'served');
  if (allServed) return 'ready'; // Keep order active & table occupied until payment!

  const allReadyOrServed = statuses.every((s) => s === 'ready' || s === 'served');
  if (allReadyOrServed) return 'ready';

  const anyInProgress = statuses.some((s) => ['preparing', 'ready', 'served'].includes(s));
  if (anyInProgress) return 'preparing';

  return 'pending';
};

// @desc Create order
// @route POST /api/orders
exports.createOrder = async (req, res) => {
  try {
    const { orderType, tableId, items, tax, discount, couponCode, paymentMethod, isHeld, customerId } = req.body;

    if (!orderType || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'orderType and items are required' });
    }

    // STRICT STOCK CHECK VALIDATION (only for items with recipes)
    await validateStockForItems(items, req.tenantId);

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
        round: 1,
        itemDiscount: item.itemDiscount || { value: 0 },
      };
    });

    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(req.tenantId);
    const restaurantTaxRate = Number(restaurant?.taxRate) || 0;
    const taxAmount = Math.round(subtotal * (restaurantTaxRate / 100));
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

      finalCouponDiscount = calculateCouponDiscount(coupon, subtotal);
    }

    const rawTotal = subtotal + taxAmount - finalCouponDiscount;
    const total = Math.max(0, rawTotal);

    if (paymentMethod === 'credit') {
      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'A customer must be selected to place a Credit / Udhar order.',
        });
      }
    }

    const initialPaymentBreakdown = paymentMethod === 'credit'
      ? [{ method: 'credit', amount: total, paidAt: new Date() }]
      : [];

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
      paymentBreakdown: initialPaymentBreakdown,
      status: paymentMethod === 'credit' ? 'completed' : 'pending',
      isHeld: Boolean(isHeld),
      createdBy: req.user._id,
    });

    // Increment customer credit balance if paid on credit
    if (paymentMethod === 'credit' && customerId) {
      const Customer = require('../models/Customer');
      await Customer.findByIdAndUpdate(customerId, {
        $inc: { creditBalance: total },
      });
      console.log(`Updated customer ${customerId} creditBalance: +Rs. ${total}`);
    }

    if (orderType === 'dine-in' && tableId) {
      await Table.findByIdAndUpdate(tableId, { status: 'occupied' });
    }

    // Recipe Inventory Deduction with Variant Multiplier Scaling & Auto-Deactivation
    try {
      const MenuItem = require('../models/MenuItem');
      const InventoryItem = require('../models/InventoryItem');

      const depletedInventoryIds = new Set();

      for (const item of processedItems) {
        const menuItemId = item.menuItemId || item._id;
        if (!menuItemId) continue;

        const menuItem = await MenuItem.findOne({
          _id: menuItemId,
          restaurantId: req.tenantId,
        }).select('recipe variants');

        if (menuItem && menuItem.recipe && menuItem.recipe.length > 0) {
          let multiplier = 1;
          const variantName = item.variantName || item.variant;
          if (variantName && menuItem.variants && menuItem.variants.length > 0) {
            const foundVariant = menuItem.variants.find((v) => v.name === variantName);
            if (foundVariant && foundVariant.portionMultiplier) {
              multiplier = Number(foundVariant.portionMultiplier);
            }
          }

          for (const ingredient of menuItem.recipe) {
            if (!ingredient.inventoryItemId || !ingredient.quantityUsed) continue;
            const totalDeduction = Number(ingredient.quantityUsed) * multiplier * (Number(item.quantity) || 1);
            if (isNaN(totalDeduction) || totalDeduction <= 0) continue;

            const updatedInv = await InventoryItem.findOneAndUpdate(
              { _id: ingredient.inventoryItemId, restaurantId: req.tenantId },
              { $inc: { currentStock: -totalDeduction } },
              { new: true }
            );

            if (updatedInv && updatedInv.currentStock <= 0) {
              depletedInventoryIds.add(ingredient.inventoryItemId.toString());
            }
          }
        }
      }

      // Auto-Deactivate menu items if any ingredient's stock drops to 0 or below
      if (depletedInventoryIds.size > 0) {
        const depletedArray = Array.from(depletedInventoryIds);
        const affectedMenuItems = await MenuItem.find({
          restaurantId: req.tenantId,
          isAvailable: true,
          'recipe.inventoryItemId': { $in: depletedArray },
        });

        for (const mItem of affectedMenuItems) {
          await MenuItem.findByIdAndUpdate(mItem._id, { isAvailable: false });
          console.log(`Auto-deactivated menu item due to stock depletion (0 or less): ${mItem.name}`);
        }
      }
    } catch (recipeErr) {
      console.error('Silent inventory deduction/deactivation error:', recipeErr.message);
    }

    req.io.to(req.tenantId.toString()).emit('newOrder', order);

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc Get all orders (with optional status, date, limit filters)
// @route GET /api/orders
exports.getOrders = async (req, res) => {
  try {
    const filter = { restaurantId: req.tenantId };
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.tableId) {
      filter.tableId = req.query.tableId;
    }
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    // Date filtering: date=today OR startDate/endDate
    if (req.query.date === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    } else if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    let query = Order.find(filter)
      .populate('tableId', 'tableNumber')
      .populate('customerId', 'name phone')
      .sort('-createdAt');

    if (req.query.limit && !isNaN(Number(req.query.limit))) {
      query = query.limit(Number(req.query.limit));
    }

    const orders = await query;

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

    // Final Status Guard: Cannot change status of an already completed or cancelled order
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Order is already ${order.status} and cannot be modified.`,
      });
    }

    // Cancellation Guard: Cannot cancel a ready or completed order
    if (status === 'cancelled' && ['ready', 'completed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an order that is already Ready or Completed',
      });
    }

    order.status = status;
    await order.save();

    if ((status === 'cancelled' || (status === 'completed' && order.paymentStatus === 'paid')) && order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, { status: 'available' });
    }

    req.io.to(req.tenantId.toString()).emit('orderStatusUpdated', order);

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update single item status & AUTO-SYNC overall order status
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

    // AUTO-SYNC overall order status based on updated item statuses
    const newDerivedStatus = deriveOrderStatusFromItems(order);
    order.status = newDerivedStatus;

    await order.save();

    req.io.to(req.tenantId.toString()).emit('orderItemStatusUpdated', { orderId, itemId, status });
    req.io.to(req.tenantId.toString()).emit('orderStatusUpdated', order);

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

    // Check for Credit / Udhar payment method
    let creditAmountTotal = 0;
    const hasCreditPayment = newPayments.some((p) => p.method === 'credit');

    if (hasCreditPayment) {
      // Must have linked customer
      const custId = order.customerId || req.body.customerId;
      if (!custId) {
        return res.status(400).json({
          success: false,
          message: 'A customer must be selected to record a Credit / Udhar order.',
        });
      }
      if (req.body.customerId && !order.customerId) {
        order.customerId = req.body.customerId;
      }
    }

    // Validate overpayment: non-cash methods (card, online, credit) cannot exceed remaining balance
    const remainingBalance = Math.max(0, order.total - (order.amountPaid || 0));
    let totalNewPaymentAmount = 0;
    let nonCashPaymentTotal = 0;

    for (let p of newPayments) {
      if (!p.method || !p.amount || Number(p.amount) <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid payment amount or method' });
      }
      totalNewPaymentAmount += Number(p.amount);
      if (p.method !== 'cash') {
        nonCashPaymentTotal += Number(p.amount);
      }
      if (p.method === 'credit') {
        creditAmountTotal += Number(p.amount);
      }
    }

    if (nonCashPaymentTotal > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Non-cash/Credit payment amount (Rs. ${nonCashPaymentTotal}) cannot exceed the remaining balance (Rs. ${remainingBalance}). Overpayment is only allowed for Cash transactions.`,
      });
    }

    // Increment customer creditBalance for credit payments
    if (creditAmountTotal > 0 && order.customerId) {
      const Customer = require('../models/Customer');
      await Customer.findByIdAndUpdate(order.customerId, {
        $inc: { creditBalance: creditAmountTotal },
      });
      console.log(`Updated customer ${order.customerId} creditBalance: +Rs. ${creditAmountTotal}`);
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

    // Compute cash/card/online paid vs credit
    const realMoneyPaid = order.paymentBreakdown
      .filter((p) => p.method !== 'credit')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalCovered = order.paymentBreakdown.reduce((sum, p) => sum + p.amount, 0);

    // If total covered (real money + credit) >= order.total, order is fulfilled and completed
    if (totalCovered >= order.total) {
      order.status = 'completed';
      order.changeAmount = changeAmount ? Number(changeAmount) : Math.max(0, realMoneyPaid - order.total);

      if (realMoneyPaid >= order.total) {
        order.paymentStatus = 'paid';
      } else if (realMoneyPaid > 0) {
        order.paymentStatus = 'partially_paid';
      } else {
        order.paymentStatus = 'unpaid'; // 100% credit
      }

      order.amountPaid = realMoneyPaid;

      // Table Status Sync: Free occupied table upon order completion
      if (order.tableId) {
        await Table.findByIdAndUpdate(order.tableId, { status: 'available' });
      }
    } else if (totalCovered > 0) {
      order.paymentStatus = 'partially_paid';
      order.amountPaid = realMoneyPaid;
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
      message: hasCreditPayment ? 'Credit order completed & udhar recorded!' : 'Payment processed successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Add items to an existing open order (Running Tab)
// @route POST /api/orders/:id/add-items
exports.addItemsToOrder = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items array is required' });
    }

    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.paymentStatus === 'paid' || order.status === 'completed' || order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot add items to a completed or paid order' });
    }

    // STRICT STOCK CHECK VALIDATION for newly added items
    await validateStockForItems(items, req.tenantId);

    // Calculate round number for running tab additions
    const maxExistingRound = (order.items || []).reduce((max, i) => Math.max(max, i.round || 1), 1);
    const nextRound = maxExistingRound + 1;

    let addedSubtotal = 0;
    const newProcessedItems = items.map((item) => {
      const baseItemPrice = Number(item.price);
      const addOnsTotal = (item.addOns || []).reduce((sum, a) => sum + Number(a.price), 0);
      const itemQuantity = Number(item.quantity) || 1;

      let itemDiscountAmount = 0;
      if (item.itemDiscount && item.itemDiscount.value > 0) {
        const dType = item.itemDiscount.discountType;
        const dVal = Number(item.itemDiscount.value);
        if (dType === 'percentage') {
          itemDiscountAmount = (baseItemPrice * (dVal / 100)) * itemQuantity;
        } else if (dType === 'fixed') {
          const fixedPerUnit = Math.min(dVal, baseItemPrice);
          itemDiscountAmount = fixedPerUnit * itemQuantity;
        }
      }

      const rawItemTotal = (baseItemPrice + addOnsTotal) * itemQuantity;
      const netItemTotal = Math.max(0, rawItemTotal - itemDiscountAmount);
      addedSubtotal += netItemTotal;

      return {
        ...item,
        price: baseItemPrice,
        quantity: itemQuantity,
        status: 'pending',
        round: nextRound,
        addedAt: new Date(),
        itemDiscount: item.itemDiscount || { value: 0 },
      };
    });

    order.items.push(...newProcessedItems);

    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(req.tenantId);
    const restaurantTaxRate = Number(restaurant?.taxRate) || 0;

    order.subtotal = (order.subtotal || 0) + addedSubtotal;
    order.tax = Math.round(order.subtotal * (restaurantTaxRate / 100));
    const rawTotal = order.subtotal + order.tax - (order.discount || 0);
    order.total = Math.max(0, rawTotal);

    if (order.status === 'ready' || order.status === 'preparing') {
      order.status = 'pending';
    }

    await order.save();

    // Recipe Inventory Deduction for newly added items with Portion Multiplier & Auto-Deactivation
    try {
      const MenuItem = require('../models/MenuItem');
      const InventoryItem = require('../models/InventoryItem');

      const depletedInventoryIds = new Set();

      for (const item of newProcessedItems) {
        const menuItemId = item.menuItemId || item._id;
        if (!menuItemId) continue;

        const menuItem = await MenuItem.findOne({
          _id: menuItemId,
          restaurantId: req.tenantId,
        }).select('recipe variants');

        if (menuItem && menuItem.recipe && menuItem.recipe.length > 0) {
          let multiplier = 1;
          const variantName = item.variantName || item.variant;
          if (variantName && menuItem.variants && menuItem.variants.length > 0) {
            const foundVariant = menuItem.variants.find((v) => v.name === variantName);
            if (foundVariant && foundVariant.portionMultiplier) {
              multiplier = Number(foundVariant.portionMultiplier);
            }
          }

          for (const ingredient of menuItem.recipe) {
            if (!ingredient.inventoryItemId || !ingredient.quantityUsed) continue;
            const totalDeduction = Number(ingredient.quantityUsed) * multiplier * (Number(item.quantity) || 1);
            if (isNaN(totalDeduction) || totalDeduction <= 0) continue;

            const updatedInv = await InventoryItem.findOneAndUpdate(
              { _id: ingredient.inventoryItemId, restaurantId: req.tenantId },
              { $inc: { currentStock: -totalDeduction } },
              { new: true }
            );

            if (updatedInv && updatedInv.currentStock <= 0) {
              depletedInventoryIds.add(ingredient.inventoryItemId.toString());
            }
          }
        }
      }

      // Auto-Deactivate menu items if any ingredient's stock drops to 0 or below
      if (depletedInventoryIds.size > 0) {
        const depletedArray = Array.from(depletedInventoryIds);
        const affectedMenuItems = await MenuItem.find({
          restaurantId: req.tenantId,
          isAvailable: true,
          'recipe.inventoryItemId': { $in: depletedArray },
        });

        for (const mItem of affectedMenuItems) {
          await MenuItem.findByIdAndUpdate(mItem._id, { isAvailable: false });
          console.log(`Auto-deactivated menu item due to stock depletion (0 or less): ${mItem.name}`);
        }
      }
    } catch (recipeErr) {
      console.error('Silent inventory deduction error on add items:', recipeErr.message);
    }

    req.io.to(req.tenantId.toString()).emit('newOrder', order);
    req.io.to(req.tenantId.toString()).emit('orderStatusUpdated', order);

    res.status(200).json({
      success: true,
      message: 'Items added to order successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
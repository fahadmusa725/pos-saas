const Order = require('../models/Order');
const Table = require('../models/Table');
const { stockAfterDelta } = require('../utils/stockQuantity');
const { publishToRestaurant } = require('../utils/realtime');

const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}${rand}`;
};

// Deliberate validation errors are reported as 400; anything else is an unexpected 500.
const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

// Load MenuItem from DB, verify it belongs to this tenant and is available,
// then compute the canonical price (base or variant) and validate add-ons.
// Returns { dbItem, resolvedPrice, resolvedName, resolvedVariant, resolvedAddOns }
const resolveMenuItemFromDB = async (item, restaurantId) => {
  const MenuItem = require('../models/MenuItem');
  const menuItemId = item.menuItemId || item._id;
  if (!menuItemId) {
    throw validationError('Each order item must have a menuItemId');
  }

  const dbItem = await MenuItem.findOne({ _id: menuItemId, restaurantId }).lean();
  if (!dbItem) {
    throw validationError(`Menu item not found or does not belong to this restaurant`);
  }
  if (dbItem.isAvailable === false) {
    throw validationError(`"${dbItem.name}" is currently unavailable`);
  }

  let resolvedPrice;
  let resolvedVariant = null;

  if (item.variant) {
    if (!dbItem.variants || dbItem.variants.length === 0) {
      throw validationError(`"${dbItem.name}" has no variants`);
    }
    const foundVariant = dbItem.variants.find((v) => v.name === item.variant);
    if (!foundVariant) {
      throw validationError(`Variant "${item.variant}" not found on "${dbItem.name}"`);
    }
    resolvedPrice = foundVariant.price;
    resolvedVariant = foundVariant.name;
  } else {
    resolvedPrice = dbItem.isSpecialDeal && dbItem.dealPrice != null
      ? dbItem.dealPrice
      : dbItem.price;
  }

  // Validate and resolve add-ons from DB definitions (reject unknown add-ons)
  const resolvedAddOns = [];
  if (item.addOns && item.addOns.length > 0) {
    for (const clientAddOn of item.addOns) {
      const dbAddOn = (dbItem.addOns || []).find((a) => a.name === clientAddOn.name);
      if (!dbAddOn) {
        throw validationError(`Add-on "${clientAddOn.name}" not found on "${dbItem.name}"`);
      }
      resolvedAddOns.push({ name: dbAddOn.name, price: dbAddOn.price });
    }
  }

  return { dbItem, resolvedPrice, resolvedName: dbItem.name, resolvedVariant, resolvedAddOns };
};

// Atomically deduct inventory for a list of processed order items.
// Uses conditional update (currentStock >= required) per ingredient.
// If any deduction fails, all already-applied deductions are rolled back.
// Throws on failure so the caller can handle it.
const deductInventoryForItems = async (processedItems, restaurantId) => {
  const MenuItem = require('../models/MenuItem');
  const InventoryItem = require('../models/InventoryItem');

  // Collect all deductions: { inventoryItemId, amount }
  const deductions = [];

  for (const item of processedItems) {
    const menuItemId = item.menuItemId || item._id;
    if (!menuItemId) continue;

    const menuItem = await MenuItem.findOne({
      _id: menuItemId,
      restaurantId,
    }).select('recipe variants');

    if (menuItem && menuItem.recipe && menuItem.recipe.length > 0) {
      let multiplier = 1;
      const variantName = item.variant;
      if (variantName && menuItem.variants && menuItem.variants.length > 0) {
        const foundVariant = menuItem.variants.find((v) => v.name === variantName);
        if (foundVariant && foundVariant.portionMultiplier) {
          multiplier = Number(foundVariant.portionMultiplier);
        }
      }

      for (const ingredient of menuItem.recipe) {
        if (!ingredient.inventoryItemId || !ingredient.quantityUsed) continue;
        const amount = Number(ingredient.quantityUsed) * multiplier * (Number(item.quantity) || 1);
        if (isNaN(amount) || amount <= 0) continue;

        const existing = deductions.find((d) => d.inventoryItemId.toString() === ingredient.inventoryItemId.toString());
        if (existing) {
          existing.amount += amount;
        } else {
          deductions.push({ inventoryItemId: ingredient.inventoryItemId, amount });
        }
      }
    }
  }

  // Apply deductions one-by-one; on failure roll back applied ones
  const applied = [];
  for (const { inventoryItemId, amount } of deductions) {
    const updated = await InventoryItem.findOneAndUpdate(
      { _id: inventoryItemId, restaurantId, currentStock: { $gte: amount } },
      [{ $set: { currentStock: stockAfterDelta(-amount) } }],
      { returnDocument: 'after', updatePipeline: true }
    );

    if (!updated) {
      // Roll back already-applied deductions
      for (const rollback of applied) {
        await InventoryItem.findOneAndUpdate(
          { _id: rollback.inventoryItemId, restaurantId },
          [{ $set: { currentStock: stockAfterDelta(rollback.amount) } }],
          { updatePipeline: true }
        );
      }
      const failedItem = await InventoryItem.findOne({ _id: inventoryItemId, restaurantId });
      if (!failedItem) {
        throw validationError(`Insufficient stock for ingredient: ${inventoryItemId.toString()}`);
      }
      const available = Math.max(0, failedItem.currentStock);
      throw validationError(
        `Insufficient stock for ingredient: ${failedItem.name}. Available: ${available} ${failedItem.unit || ''}, Required: ${amount.toFixed(2)} ${failedItem.unit || ''}`
      );
    }

    applied.push({ inventoryItemId, amount });

    if (updated.currentStock <= 0) {
      // Mark dependent menu items unavailable
      await MenuItem.updateMany(
        { restaurantId, isAvailable: true, 'recipe.inventoryItemId': inventoryItemId },
        { $set: { isAvailable: false } }
      );
    }
  }
};

// Restore inventory for a list of processed order items (used on cancellation and
// to roll back a failed deduction). Restores are aggregated per ingredient and rolled
// back if any update fails. Returns the applied restores so callers can undo them.
const restoreInventoryForItems = async (processedItems, restaurantId) => {
  const MenuItem = require('../models/MenuItem');
  const InventoryItem = require('../models/InventoryItem');

  const restores = [];

  for (const item of processedItems) {
    const menuItemId = item.menuItemId || item._id;
    if (!menuItemId) continue;

    const menuItem = await MenuItem.findOne({ _id: menuItemId, restaurantId }).select('recipe variants');
    if (!menuItem || !menuItem.recipe || menuItem.recipe.length === 0) continue;

    let multiplier = 1;
    if (item.variant && menuItem.variants && menuItem.variants.length > 0) {
      const foundVariant = menuItem.variants.find((v) => v.name === item.variant);
      if (foundVariant && foundVariant.portionMultiplier) {
        multiplier = Number(foundVariant.portionMultiplier);
      }
    }

    for (const ingredient of menuItem.recipe) {
      if (!ingredient.inventoryItemId || !ingredient.quantityUsed) continue;
      const amount = Number(ingredient.quantityUsed) * multiplier * (Number(item.quantity) || 1);
      if (isNaN(amount) || amount <= 0) continue;

      const existing = restores.find((r) => r.inventoryItemId.toString() === ingredient.inventoryItemId.toString());
      if (existing) {
        existing.amount += amount;
      } else {
        restores.push({ inventoryItemId: ingredient.inventoryItemId, amount });
      }
    }
  }

  const applied = [];
  for (const { inventoryItemId, amount } of restores) {
    const updated = await InventoryItem.findOneAndUpdate(
      { _id: inventoryItemId, restaurantId },
      [{ $set: { currentStock: stockAfterDelta(amount) } }],
      { returnDocument: 'after', updatePipeline: true }
    );

    if (!updated) {
      // Roll back already-applied restores
      for (const rollback of applied) {
        await InventoryItem.findOneAndUpdate(
          { _id: rollback.inventoryItemId, restaurantId },
          [{ $set: { currentStock: stockAfterDelta(-rollback.amount) } }],
          { updatePipeline: true }
        );
      }
      throw new Error('Failed to restore inventory for the order');
    }

    applied.push({ inventoryItemId, amount });
  }

  return applied;
};

// Orders leave the API and realtime with their references expanded, exactly like
// getOrders: tableId -> { tableNumber }, customerId -> { name, phone }.
// Mongoose 9 documents support populate() returning a promise (no callback).
const populateOrderRefs = (order) => {
  if (!order) return order;
  return order.populate([
    { path: 'tableId', select: 'tableNumber' },
    { path: 'customerId', select: 'name phone' },
  ]);
};

const deriveOrderStatusFromItems = (order) => {
  if (!order.items || order.items.length === 0) return order.status;

  const statuses = order.items.map((i) => i.status || 'pending');

  // Keep the order active and the table occupied until payment, even when all items are served
  if (statuses.every((s) => s === 'ready' || s === 'served')) return 'ready';

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

    // Validate and resolve all items from DB (price, name, variant, add-ons)
    const resolvedItemMeta = [];
    for (const item of items) {
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({ success: false, message: 'Item quantity must be a positive integer' });
      }
      const meta = await resolveMenuItemFromDB(item, req.tenantId);
      resolvedItemMeta.push({ ...item, ...meta, quantity: qty });
    }

    // Validate tableId belongs to this tenant
    if (tableId) {
      const tableCheck = await Table.findOne({ _id: tableId, restaurantId: req.tenantId });
      if (!tableCheck) {
        return res.status(400).json({ success: false, message: 'Table not found or does not belong to this restaurant' });
      }
    }

    // Validate customerId belongs to this tenant
    if (customerId) {
      const Customer = require('../models/Customer');
      const customerCheck = await Customer.findOne({ _id: customerId, restaurantId: req.tenantId });
      if (!customerCheck) {
        return res.status(400).json({ success: false, message: 'Customer not found or does not belong to this restaurant' });
      }
    }

    if (paymentMethod === 'credit' && !customerId) {
      return res.status(400).json({
        success: false,
        message: 'A customer must be selected to place a Credit / Udhar order.',
      });
    }

    // Only restaurant-admin and manager can apply item-level discounts
    const canApplyItemDiscount = ['restaurant-admin', 'manager'].includes(req.user.role);

    // Stock is validated atomically by deductInventoryForItems (called before the order is saved)
    let subtotal = 0;
    const processedItems = resolvedItemMeta.map((item) => {
      const { dbItem, resolvedPrice, resolvedName, resolvedVariant, resolvedAddOns, quantity } = item;
      const addOnsTotal = resolvedAddOns.reduce((sum, a) => sum + a.price, 0);

      let itemDiscountAmount = 0;
      if (canApplyItemDiscount && item.itemDiscount && item.itemDiscount.value > 0) {
        const dType = item.itemDiscount.discountType;
        const dVal = Number(item.itemDiscount.value);

        if (isNaN(dVal)) {
          throw validationError(`Item discount value must be a number for "${resolvedName}"`);
        }

        if (dType === 'percentage') {
          if (dVal < 0 || dVal > 100) {
            throw validationError(`Item percentage discount must be between 0% and 100% for "${resolvedName}"`);
          }
          itemDiscountAmount = (resolvedPrice * (dVal / 100)) * quantity;
        } else if (dType === 'fixed') {
          if (dVal < 0) {
            throw new Error(`Item fixed discount cannot be negative for "${resolvedName}"`);
          }
          const fixedPerUnit = Math.min(dVal, resolvedPrice);
          itemDiscountAmount = fixedPerUnit * quantity;
        }
      }

      const rawItemTotal = (resolvedPrice + addOnsTotal) * quantity;
      const netItemTotal = Math.max(0, rawItemTotal - itemDiscountAmount);
      subtotal += netItemTotal;

      return {
        menuItemId: dbItem._id,
        name: resolvedName,
        price: resolvedPrice,
        quantity,
        variant: resolvedVariant || undefined,
        addOns: resolvedAddOns,
        notes: item.notes || '',
        round: 1,
        itemDiscount: canApplyItemDiscount && item.itemDiscount ? item.itemDiscount : { value: 0 },
      };
    });

    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(req.tenantId);
    const restaurantTaxRate = Number(restaurant?.taxRate) || 0;
    const taxAmount = Math.round(subtotal * (restaurantTaxRate / 100));
    let finalCouponDiscount = 0;

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

    // Persist the validated coupon code so addItemsToOrder can recompute the discount
    const finalCouponCode = couponCode ? couponCode.trim().toUpperCase() : null;

    // For credit orders, paymentBreakdown records the amount owed;
    // creditBalance is incremented here (once) since the item is taken on credit now.
    const initialPaymentBreakdown = paymentMethod === 'credit'
      ? [{ method: 'credit', amount: total, paidAt: new Date() }]
      : [];

    // Deduct stock first: if it fails, no order, credit increment or table change is persisted
    await deductInventoryForItems(processedItems, req.tenantId);

    let order;
    try {
      order = await (async () => {
        // Retry up to 3 times on duplicate orderNumber (compound unique index)
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await Order.create({
              restaurantId: req.tenantId,
              orderNumber: generateOrderNumber(),
              orderType,
              tableId: tableId || null,
              customerId: customerId || null,
              items: processedItems,
              subtotal,
              tax: taxAmount,
              discount: finalCouponDiscount,
              couponCode: finalCouponCode,
              total,
              paymentMethod: paymentMethod || 'cash',
              paymentStatus: 'unpaid',
              paymentBreakdown: initialPaymentBreakdown,
              status: paymentMethod === 'credit' ? 'completed' : 'pending',
              isHeld: Boolean(isHeld),
              createdBy: req.user._id,
            });
          } catch (err) {
            if (err.code === 11000 && attempt < 2) continue;
            throw err;
          }
        }
      })();
    } catch (createErr) {
      // Undo the deduction so a failed create leaves no stock side effect
      await restoreInventoryForItems(processedItems, req.tenantId);
      throw createErr;
    }

    // Credit balance incremented exactly once at order creation for credit orders
    if (paymentMethod === 'credit' && customerId) {
      const Customer = require('../models/Customer');
      await Customer.findOneAndUpdate(
        { _id: customerId, restaurantId: req.tenantId },
        { $inc: { creditBalance: total } }
      );
    }

    if (orderType === 'dine-in' && tableId) {
      await Table.findOneAndUpdate(
        { _id: tableId, restaurantId: req.tenantId },
        { status: 'occupied' }
      );
    }

    await populateOrderRefs(order);

    await publishToRestaurant(req.tenantId, 'newOrder', order);

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error('Create order error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong while creating the order' });
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

    // Validate status is a known value
    const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const order = await Order.findOne({ _id: req.params.id, restaurantId: req.tenantId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Role-based status transition restrictions
    const role = req.user.role;

    // Kitchen staff: can only move to preparing or ready; cannot complete or cancel
    if (role === 'kitchen' && ['completed', 'cancelled'].includes(status)) {
      return res.status(403).json({
        success: false,
        message: 'Kitchen staff cannot complete or cancel orders',
      });
    }

    // Waiter: cannot cancel orders
    if (role === 'waiter' && status === 'cancelled') {
      return res.status(403).json({
        success: false,
        message: 'Waiters cannot cancel orders',
      });
    }

    // Final Status Guard: a cancelled order is final. A completed order can only be
    // cancelled, and only by a restaurant admin or manager (e.g. reversing a credit order).
    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled and cannot be modified.',
      });
    }

    if (order.status === 'completed') {
      if (status !== 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Order is already completed and cannot be modified.',
        });
      }
      if (!['restaurant-admin', 'manager'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Only a restaurant admin or manager can cancel a completed order',
        });
      }
    }

    // Cancellation Guard: Cannot cancel an order that is already Ready
    if (status === 'cancelled' && order.status === 'ready') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an order that is already Ready',
      });
    }

    const previousStatus = order.status;

    // Cancellation side effects run before the status is persisted: if any of them
    // fails, the order stays unchanged and the error is reported to the caller.
    let appliedRestore = [];
    let reversedCredit = 0;

    const rollbackSideEffects = async () => {
      const InventoryItem = require('../models/InventoryItem');
      for (const applied of appliedRestore) {
        await InventoryItem.findOneAndUpdate(
          { _id: applied.inventoryItemId, restaurantId: req.tenantId },
          [{ $set: { currentStock: stockAfterDelta(-applied.amount) } }],
          { updatePipeline: true }
        );
      }
      if (reversedCredit > 0 && order.customerId) {
        const Customer = require('../models/Customer');
        await Customer.findOneAndUpdate(
          { _id: order.customerId, restaurantId: req.tenantId },
          { $inc: { creditBalance: reversedCredit } }
        );
      }
    };

    if (status === 'cancelled') {
      try {
        appliedRestore = await restoreInventoryForItems(order.items, req.tenantId);

        // Reverse the full credit amount this order added to the customer's balance
        if (order.customerId) {
          const Customer = require('../models/Customer');
          const creditAmount = (order.paymentBreakdown || [])
            .filter((p) => p.method === 'credit')
            .reduce((sum, p) => sum + p.amount, 0);
          if (creditAmount > 0) {
            const updatedCustomer = await Customer.findOneAndUpdate(
              { _id: order.customerId, restaurantId: req.tenantId },
              { $inc: { creditBalance: -creditAmount } },
              { returnDocument: 'after' }
            );
            if (!updatedCustomer) {
              throw new Error('Customer not found while reversing credit');
            }
            reversedCredit = creditAmount;
          }
        }
      } catch (cancelErr) {
        await rollbackSideEffects();
        throw cancelErr;
      }
    }

    let updatedOrder;
    try {
      // Conditional update keeps cancellation and its side effects exactly-once
      updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, restaurantId: req.tenantId, status: previousStatus },
        { $set: { status } },
        { returnDocument: 'after' }
      );
    } catch (saveErr) {
      await rollbackSideEffects();
      throw saveErr;
    }

    if (!updatedOrder) {
      await rollbackSideEffects();
      return res.status(400).json({
        success: false,
        message: 'Order status was changed by another request, please retry',
      });
    }

    if ((status === 'cancelled' || (status === 'completed' && updatedOrder.paymentStatus === 'paid')) && updatedOrder.tableId) {
      await Table.findOneAndUpdate(
        { _id: updatedOrder.tableId, restaurantId: req.tenantId },
        { status: 'available' }
      );
    }

    await populateOrderRefs(updatedOrder);

    await publishToRestaurant(req.tenantId, 'orderStatusUpdated', updatedOrder);
    if (['completed', 'cancelled'].includes(status)) {
      await publishToRestaurant(req.tenantId, 'orderCompleted', updatedOrder);
    }

    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({ success: false, message: 'Something went wrong while updating the order status' });
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

    const newDerivedStatus = deriveOrderStatusFromItems(order);
    order.status = newDerivedStatus;

    await order.save();

    await populateOrderRefs(order);

    await publishToRestaurant(req.tenantId, 'orderItemStatusUpdated', { orderId, itemId, status });
    await publishToRestaurant(req.tenantId, 'orderStatusUpdated', order);

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

    // Reject already finalized orders
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot process payment on a cancelled order' });
    }
    if (order.status === 'completed' && order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Order is already fully paid' });
    }

    // A completed order whose recorded payments already cover the total must not
    // accept another payment (e.g. a 100% credit order created as completed).
    const totalRecorded = (order.paymentBreakdown || []).reduce((sum, p) => sum + p.amount, 0);
    if (order.status === 'completed' && totalRecorded >= order.total) {
      return res.status(400).json({
        success: false,
        message: 'Payment for this order is already fully recorded',
      });
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
      order.couponCode = coupon.code;
    }

    // A customer can only be attached once: ignore a body customerId when the order
    // already has a customer or already recorded a credit payment.
    const hasCreditEntry = (order.paymentBreakdown || []).some((p) => p.method === 'credit');
    if (req.body.customerId && !order.customerId && !hasCreditEntry) {
      const Customer = require('../models/Customer');
      const customerCheck = await Customer.findOne({ _id: req.body.customerId, restaurantId: req.tenantId });
      if (!customerCheck) {
        return res.status(400).json({ success: false, message: 'Customer not found or does not belong to this restaurant' });
      }
      order.customerId = req.body.customerId;
    }

    // Default fallback if single payment payload is sent
    let newPayments = payments;
    if (!newPayments || !Array.isArray(newPayments) || newPayments.length === 0) {
      const method = req.body.paymentMethod || order.paymentMethod || 'cash';
      newPayments = [{ method, amount: order.total }];
    }

    let newCreditAmountTotal = 0;
    const hasCreditPayment = newPayments.some((p) => p.method === 'credit');

    if (hasCreditPayment && !order.customerId) {
      return res.status(400).json({
        success: false,
        message: 'A customer must be selected to record a Credit / Udhar order.',
      });
    }

    // Validate overpayment: non-cash methods (card, online, credit) cannot exceed remaining balance
    const remainingBalance = Math.max(0, order.total - (order.amountPaid || 0));
    let totalNewPaymentAmount = 0;
    let nonCashPaymentTotal = 0;

    for (const p of newPayments) {
      const pAmount = Number(p.amount);
      if (!p.method || !isFinite(pAmount) || pAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid payment amount or method' });
      }
      totalNewPaymentAmount += pAmount;
      if (p.method !== 'cash') {
        nonCashPaymentTotal += pAmount;
      }
      if (p.method === 'credit') {
        newCreditAmountTotal += pAmount;
      }
    }

    if (nonCashPaymentTotal > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Non-cash/Credit payment amount (Rs. ${nonCashPaymentTotal}) cannot exceed the remaining balance (Rs. ${remainingBalance}). Overpayment is only allowed for Cash transactions.`,
      });
    }

    // Increment the customer's credit balance for the new credit payment
    if (newCreditAmountTotal > 0 && order.customerId) {
      const Customer = require('../models/Customer');
      await Customer.findOneAndUpdate(
        { _id: order.customerId, restaurantId: req.tenantId },
        { $inc: { creditBalance: newCreditAmountTotal } }
      );
    }

    order.paymentBreakdown = order.paymentBreakdown || [];
    newPayments.forEach((p) => {
      order.paymentBreakdown.push({
        method: p.method,
        amount: Number(p.amount),
        paidAt: new Date(),
      });
    });

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

      if (order.tableId) {
        await Table.findOneAndUpdate(
          { _id: order.tableId, restaurantId: req.tenantId },
          { status: 'available' }
        );
      }
    } else if (totalCovered > 0) {
      order.paymentStatus = 'partially_paid';
      order.amountPaid = realMoneyPaid;
    }

    if (order.paymentBreakdown.length > 1) {
      order.paymentMethod = 'split';
    } else if (order.paymentBreakdown.length === 1) {
      order.paymentMethod = order.paymentBreakdown[0].method;
    }

    await order.save();

    await populateOrderRefs(order);

    await publishToRestaurant(req.tenantId, 'orderStatusUpdated', order);
    if (order.paymentStatus === 'paid' || order.status === 'completed') {
      await publishToRestaurant(req.tenantId, 'orderCompleted', order);
    }

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

    // Validate and resolve all items from DB (price, name, variant, add-ons)
    const resolvedItemMeta = [];
    for (const item of items) {
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({ success: false, message: 'Item quantity must be a positive integer' });
      }
      const meta = await resolveMenuItemFromDB(item, req.tenantId);
      resolvedItemMeta.push({ ...item, ...meta, quantity: qty });
    }

    const maxExistingRound = (order.items || []).reduce((max, i) => Math.max(max, i.round || 1), 1);
    const nextRound = maxExistingRound + 1;

    const canApplyItemDiscount = ['restaurant-admin', 'manager'].includes(req.user.role);

    let addedSubtotal = 0;
    const newProcessedItems = resolvedItemMeta.map((item) => {
      const { dbItem, resolvedPrice, resolvedName, resolvedVariant, resolvedAddOns, quantity } = item;
      const addOnsTotal = resolvedAddOns.reduce((sum, a) => sum + a.price, 0);

      let itemDiscountAmount = 0;
      if (canApplyItemDiscount && item.itemDiscount && item.itemDiscount.value > 0) {
        const dType = item.itemDiscount.discountType;
        const dVal = Number(item.itemDiscount.value);
        if (!isNaN(dVal)) {
          if (dType === 'percentage') {
            itemDiscountAmount = (resolvedPrice * (Math.min(Math.max(dVal, 0), 100) / 100)) * quantity;
          } else if (dType === 'fixed') {
            const fixedPerUnit = Math.min(Math.max(dVal, 0), resolvedPrice);
            itemDiscountAmount = fixedPerUnit * quantity;
          }
        }
      }

      const rawItemTotal = (resolvedPrice + addOnsTotal) * quantity;
      const netItemTotal = Math.max(0, rawItemTotal - itemDiscountAmount);
      addedSubtotal += netItemTotal;

      return {
        menuItemId: dbItem._id,
        name: resolvedName,
        price: resolvedPrice,
        quantity,
        variant: resolvedVariant || undefined,
        addOns: resolvedAddOns,
        notes: item.notes || '',
        status: 'pending',
        round: nextRound,
        addedAt: new Date(),
        itemDiscount: canApplyItemDiscount && item.itemDiscount ? item.itemDiscount : { value: 0 },
      };
    });

    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findById(req.tenantId);
    const restaurantTaxRate = Number(restaurant?.taxRate) || 0;

    order.subtotal = (order.subtotal || 0) + addedSubtotal;
    order.tax = Math.round(order.subtotal * (restaurantTaxRate / 100));

    // Recompute coupon discount after subtotal changes
    let recomputedCouponDiscount = order.discount || 0;
    if (order.couponCode) {
      try {
        const Coupon = require('../models/Coupon');
        const { calculateCouponDiscount } = require('./couponController');
        const coupon = await Coupon.findOne({
          restaurantId: req.tenantId,
          code: order.couponCode,
        });
        if (coupon) {
          recomputedCouponDiscount = calculateCouponDiscount(coupon, order.subtotal);
        }
      } catch {
        // Keep existing discount if coupon lookup fails
      }
    }
    order.discount = recomputedCouponDiscount;

    const rawTotal = order.subtotal + order.tax - order.discount;
    order.total = Math.max(0, rawTotal);

    if (order.status === 'ready' || order.status === 'preparing') {
      order.status = 'pending';
    }

    // Deduct stock before persisting: if it fails, the order stays untouched
    await deductInventoryForItems(newProcessedItems, req.tenantId);

    order.items.push(...newProcessedItems);

    try {
      await order.save();
    } catch (saveErr) {
      // Undo the deduction so a failed save leaves no stock side effect
      await restoreInventoryForItems(newProcessedItems, req.tenantId);
      throw saveErr;
    }

    await populateOrderRefs(order);

    await publishToRestaurant(req.tenantId, 'newOrder', order);
    await publishToRestaurant(req.tenantId, 'orderStatusUpdated', order);

    res.status(200).json({
      success: true,
      message: 'Items added to order successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
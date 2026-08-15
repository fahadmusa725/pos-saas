const PurchaseOrder = require('../models/PurchaseOrder');
const InventoryItem = require('../models/InventoryItem');

// @desc    Get all purchase orders
// @route   GET /api/purchase-orders
// @access  Private (restaurant-admin)
const getPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({ restaurantId: req.tenantId })
      .populate('supplierId', 'name contactPerson phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create purchase order
// @route   POST /api/purchase-orders
// @access  Private (restaurant-admin)
const createPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, purchaseDate, items, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    let totalCost = 0;
    const processedItems = [];

    for (const item of items) {
      const invItem = await InventoryItem.findOne({
        _id: item.inventoryItemId,
        restaurantId: req.tenantId,
      });

      if (!invItem) {
        return res.status(400).json({
          success: false,
          message: `Inventory item not found: ${item.inventoryItemId}`,
        });
      }

      const qty = Number(item.quantity);
      const cost = Number(item.costPerUnit);
      if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
        return res.status(400).json({ success: false, message: 'Invalid quantity or cost for item' });
      }

      const subtotal = qty * cost;
      totalCost += subtotal;

      processedItems.push({
        inventoryItemId: invItem._id,
        itemName: invItem.name,
        quantity: qty,
        costPerUnit: cost,
        subtotal,
      });
    }

    const order = await PurchaseOrder.create({
      restaurantId: req.tenantId,
      supplierId: supplierId || null,
      purchaseDate: purchaseDate || Date.now(),
      items: processedItems,
      totalCost,
      status: 'pending',
      notes: notes || '',
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update purchase order status (received / cancelled)
// @route   PUT /api/purchase-orders/:id/status
// @access  Private (restaurant-admin)
const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['received', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update' });
    }

    const order = await PurchaseOrder.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order status is already '${order.status}' and cannot be changed.`,
      });
    }

    // Stock update & Auto-Expense creation on receiving purchase order
    if (status === 'received') {
      for (const item of order.items) {
        await InventoryItem.findOneAndUpdate(
          { _id: item.inventoryItemId, restaurantId: req.tenantId },
          { $inc: { currentStock: item.quantity }, costPerUnit: item.costPerUnit }
        );
      }

      // Silent PO-to-Expense Auto Creation
      try {
        const Expense = require('../models/Expense');
        const Supplier = require('../models/Supplier');

        let supplierName = '';
        if (order.supplierId) {
          const supplier = await Supplier.findById(order.supplierId).select('name');
          if (supplier) supplierName = supplier.name;
        }

        const supplierInfo = supplierName ? ` from ${supplierName}` : '';
        const poRef = order._id.toString().slice(-6).toUpperCase();

        await Expense.create({
          restaurantId: req.tenantId,
          category: 'supplies',
          amount: order.totalCost,
          date: order.purchaseDate || new Date(),
          description: `Purchase Order #${poRef}${supplierInfo}`,
        });
      } catch (expenseErr) {
        console.error('Silent PO-to-Expense auto creation error:', expenseErr.message);
      }
    }

    order.status = status;
    await order.save();

    // Auto-Reactivation: Restore isAvailable on menu items whose ingredients are now back in stock
    if (status === 'received') {
      try {
        const MenuItem = require('../models/MenuItem');
        const InventoryItem = require('../models/InventoryItem');

        // Find all unavailable menu items for this restaurant that have recipes
        const unavailableItems = await MenuItem.find({
          restaurantId: req.tenantId,
          isAvailable: false,
          'recipe.0': { $exists: true }, // only those with at least 1 recipe entry
        });

        for (const menuItem of unavailableItems) {
          let allInStock = true;

          for (const ingredient of menuItem.recipe) {
            if (!ingredient.inventoryItemId) continue;
            const inv = await InventoryItem.findOne({
              _id: ingredient.inventoryItemId,
              restaurantId: req.tenantId,
            });
            if (!inv || inv.currentStock <= 0) {
              allInStock = false;
              break;
            }
          }

          if (allInStock) {
            await MenuItem.findByIdAndUpdate(menuItem._id, { isAvailable: true });
            console.log(`Auto-reactivated menu item: ${menuItem.name}`);
          }
        }
      } catch (reactivationErr) {
        console.error('Silent menu item reactivation error:', reactivationErr.message);
      }
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record payment for a purchase order (with Overpayment Guard & Auto-Receive on full payment)
// @route   PATCH /api/purchase-orders/:id/pay
// @access  Private (restaurant-admin)
const payPurchaseOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount > 0 is required' });
    }

    const order = await PurchaseOrder.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot record payment for a cancelled order' });
    }

    const currentPaid = Number(order.amountPaid) || 0;
    const remaining = order.totalCost - currentPaid;

    // Overpayment Guard
    if (paymentAmount > remaining) {
      return res.status(400).json({
        success: false,
        message: `Payment amount exceeds remaining balance. Outstanding: Rs. ${remaining.toFixed(2)}`,
      });
    }

    const newAmountPaid = currentPaid + paymentAmount;
    order.amountPaid = newAmountPaid;

    if (newAmountPaid >= order.totalCost) {
      order.paymentStatus = 'paid';
    } else if (newAmountPaid > 0) {
      order.paymentStatus = 'partially_paid';
    } else {
      order.paymentStatus = 'unpaid';
    }

    // Auto-Receive: If PO is now fully paid and was pending, mark as received & update stock/expense/reactivation
    let justReceived = false;
    if (order.paymentStatus === 'paid' && order.status === 'pending') {
      order.status = 'received';
      justReceived = true;

      // Stock update
      for (const item of order.items) {
        await InventoryItem.findOneAndUpdate(
          { _id: item.inventoryItemId, restaurantId: req.tenantId },
          { $inc: { currentStock: item.quantity }, costPerUnit: item.costPerUnit }
        );
      }

      // Silent Expense creation
      try {
        const Expense = require('../models/Expense');
        const Supplier = require('../models/Supplier');

        let supplierName = '';
        if (order.supplierId) {
          const supplier = await Supplier.findById(order.supplierId).select('name');
          if (supplier) supplierName = supplier.name;
        }

        const supplierInfo = supplierName ? ` from ${supplierName}` : '';
        const poRef = order._id.toString().slice(-6).toUpperCase();

        await Expense.create({
          restaurantId: req.tenantId,
          category: 'supplies',
          amount: order.totalCost,
          date: order.purchaseDate || new Date(),
          description: `Purchase Order #${poRef}${supplierInfo}`,
        });
      } catch (expenseErr) {
        console.error('Silent PO-to-Expense auto creation error:', expenseErr.message);
      }

      // Silent Auto-Reactivation
      try {
        const MenuItem = require('../models/MenuItem');

        const unavailableItems = await MenuItem.find({
          restaurantId: req.tenantId,
          isAvailable: false,
          'recipe.0': { $exists: true },
        });

        for (const menuItem of unavailableItems) {
          let allInStock = true;

          for (const ingredient of menuItem.recipe) {
            if (!ingredient.inventoryItemId) continue;
            const inv = await InventoryItem.findOne({
              _id: ingredient.inventoryItemId,
              restaurantId: req.tenantId,
            });
            if (!inv || inv.currentStock <= 0) {
              allInStock = false;
              break;
            }
          }

          if (allInStock) {
            await MenuItem.findByIdAndUpdate(menuItem._id, { isAvailable: true });
            console.log(`Auto-reactivated menu item on PO full payment: ${menuItem.name}`);
          }
        }
      } catch (reactivationErr) {
        console.error('Silent menu item reactivation error:', reactivationErr.message);
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: justReceived
        ? 'PO fully paid and automatically marked as RECEIVED (stock updated)!'
        : 'Payment recorded successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  payPurchaseOrder,
};

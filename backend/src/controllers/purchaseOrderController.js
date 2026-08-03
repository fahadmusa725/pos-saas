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

    // Stock update logic on receiving purchase order
    if (status === 'received') {
      for (const item of order.items) {
        await InventoryItem.findOneAndUpdate(
          { _id: item.inventoryItemId, restaurantId: req.tenantId },
          { $inc: { currentStock: item.quantity }, costPerUnit: item.costPerUnit }
        );
      }
    }

    order.status = status;
    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
};

const InventoryItem = require('../models/InventoryItem');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private (restaurant-admin)
const getInventoryItems = async (req, res) => {
  try {
    const items = await InventoryItem.find({ restaurantId: req.tenantId }).sort({ name: 1 });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get low stock inventory items
// @route   GET /api/inventory/low-stock
// @access  Private (restaurant-admin)
const getLowStockItems = async (req, res) => {
  try {
    const items = await InventoryItem.find({
      restaurantId: req.tenantId,
      $expr: { $lte: ['$currentStock', '$reorderLevel'] },
    }).sort({ name: 1 });

    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create inventory item
// @route   POST /api/inventory
// @access  Private (restaurant-admin)
const createInventoryItem = async (req, res) => {
  try {
    const { name, unit, currentStock, reorderLevel, costPerUnit } = req.body;

    if (!name || !unit) {
      return res.status(400).json({ success: false, message: 'Name and unit are required' });
    }

    const item = await InventoryItem.create({
      restaurantId: req.tenantId,
      name: name.trim(),
      unit,
      currentStock: currentStock !== undefined ? Number(currentStock) : 0,
      reorderLevel: reorderLevel !== undefined ? Number(reorderLevel) : 0,
      costPerUnit: costPerUnit !== undefined ? Number(costPerUnit) : 0,
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private (restaurant-admin)
const updateInventoryItem = async (req, res) => {
  try {
    const { name, unit, currentStock, reorderLevel, costPerUnit } = req.body;

    const item = await InventoryItem.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    if (name !== undefined) item.name = name.trim();
    if (unit !== undefined) item.unit = unit;
    if (currentStock !== undefined) item.currentStock = Number(currentStock);
    if (reorderLevel !== undefined) item.reorderLevel = Number(reorderLevel);
    if (costPerUnit !== undefined) item.costPerUnit = Number(costPerUnit);

    await item.save();
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private (restaurant-admin)
const deleteInventoryItem = async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found' });
    }

    await item.deleteOne();
    res.status(200).json({ success: true, message: 'Inventory item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getInventoryItems,
  getLowStockItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
};

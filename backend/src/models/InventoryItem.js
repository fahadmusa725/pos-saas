const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Inventory item name is required'],
      trim: true,
    },
    unit: {
      type: String,
      enum: ['kg', 'litre', 'piece', 'dozen', 'box', 'pack', 'other'],
      required: [true, 'Unit is required'],
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    reorderLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    costPerUnit: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);

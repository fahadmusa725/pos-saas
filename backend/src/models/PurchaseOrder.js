const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema(
  {
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    costPerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    items: [poItemSchema],
    totalCost: {
      type: Number,
      required: true,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
    },
    status: {
      type: String,
      enum: ['pending', 'received', 'cancelled'],
      default: 'pending',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);

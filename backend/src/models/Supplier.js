const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    // Structured items supplied by this supplier
    itemsSupplied: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryItem',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Supplier', supplierSchema);

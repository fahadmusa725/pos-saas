const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    name: { type: String, required: true }, // snapshot at order time
    price: { type: Number, required: true }, // snapshot at order time
    quantity: { type: Number, required: true, default: 1 },
    variant: { type: String }, // e.g. "Large"
    addOns: [{ name: String, price: Number }],
    notes: { type: String, default: '' },
    round: { type: Number, default: 1 },
    addedAt: { type: Date, default: Date.now },
    itemDiscount: {
      discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
      },
      value: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'served'],
      default: 'pending',
    },
  },
  { _id: true }
);

const paymentBreakdownSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ['cash', 'card', 'online', 'credit', 'other'],
      required: true,
    },
    amount: { type: Number, required: true },
    paidAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    orderType: {
      type: String,
      enum: ['dine-in', 'takeaway', 'delivery'],
      required: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Table',
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'split', 'online', 'credit', 'other'],
      default: 'cash',
    },
    paymentBreakdown: [paymentBreakdownSchema],
    amountPaid: { type: Number, default: 0 },
    changeAmount: { type: Number, default: 0 },
    isHeld: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
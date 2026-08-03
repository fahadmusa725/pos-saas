const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
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
    // loyaltyPoints: MANUAL ONLY — admin sets this number via edit form.
    // No automatic accrual per order — that is a future module (not in current scope).
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Compound unique index: phone must be unique per restaurant (not globally)
customerSchema.index({ restaurantId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);

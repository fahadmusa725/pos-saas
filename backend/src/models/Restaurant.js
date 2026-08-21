const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    logo: {
      type: String,
      default: '',
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    receiptFooterMessage: {
      type: String,
      default: 'Thank you for dining with us! Visit again soon.',
    },
    currency: {
      type: String,
      default: 'Rs.',
    },
    showBarcodeOnReceipt: {
      type: Boolean,
      default: true,
    },
    enableSoundAlerts: {
      type: Boolean,
      default: true,
    },
    urgentOrderMinutes: {
      type: Number,
      default: 15,
    },
    subscriptionStatus: {
      type: String,
      enum: ['trial', 'active', 'suspended', 'cancelled'],
      default: 'trial',
    },
    subscriptionPlan: {
      type: String,
      enum: ['basic', 'pro'],
      default: 'basic',
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Restaurant', restaurantSchema);
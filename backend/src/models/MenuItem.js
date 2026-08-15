const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "Small", "Medium", "Large"
    price: { type: Number, required: true },
    portionMultiplier: { type: Number, default: 1, min: 0.01 }, // e.g. 0.5 for Half, 1.5 for Large
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: true,
    },
    dealPrice: {
      type: Number,
      default: null,
    },
    isSpecialDeal: {
      type: Boolean,
      default: false,
    },
    emoji: {
      type: String,
      default: '🍔',
    },
    image: {
      type: String,
      default: '',
    },
    variants: [variantSchema], // optional: sizes with different prices
    addOns: [
      {
        name: { type: String },
        price: { type: Number },
      },
    ],
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isVeg: {
      type: Boolean,
      default: false,
    },
    recipe: [
      {
        inventoryItemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'InventoryItem',
          required: true,
        },
        quantityUsed: {
          type: Number,
          required: true,
          min: 0,
        },
        unit: {
          type: String,
          default: 'units',
        },
      },
    ],
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
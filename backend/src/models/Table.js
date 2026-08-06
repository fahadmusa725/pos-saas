const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    tableNumber: {
      type: String,
      required: true,
    },
    capacity: {
      type: Number,
      default: 4,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved'],
      default: 'available',
    },
    section: {
      type: String,
      enum: ['Indoor', 'Outdoor', 'Rooftop', 'VIP', 'Bar'],
      default: 'Indoor',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Table', tableSchema);
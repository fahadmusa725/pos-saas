const Coupon = require('../models/Coupon');

// Helper function to calculate valid discount for a coupon
const calculateCouponDiscount = (coupon, subtotal) => {
  if (!coupon.isActive) {
    throw new Error('Coupon is inactive');
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    throw new Error('Coupon has expired');
  }

  if (subtotal < coupon.minOrderAmount) {
    throw new Error(`Minimum order subtotal of Rs. ${coupon.minOrderAmount} required for this coupon`);
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = (subtotal * coupon.value) / 100;
    if (coupon.maxDiscountAmount > 0) {
      discount = Math.min(discount, coupon.maxDiscountAmount);
    }
  } else if (coupon.type === 'fixed') {
    discount = Math.min(coupon.value, subtotal);
  }

  return Math.max(0, discount);
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private (restaurant-admin)
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({ restaurantId: req.tenantId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: coupons.length, data: coupons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Validate coupon code
// @route   POST /api/coupons/validate
// @access  Private (restaurant-admin, cashier)
const validateCoupon = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;

    if (!code || orderTotal === undefined) {
      return res.status(400).json({ success: false, message: 'Coupon code and order total are required' });
    }

    const coupon = await Coupon.findOne({
      restaurantId: req.tenantId,
      code: code.trim().toUpperCase(),
    });

    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }

    const discountAmount = calculateCouponDiscount(coupon, Number(orderTotal));

    res.status(200).json({
      success: true,
      data: {
        code: coupon.code,
        discountAmount,
        type: coupon.type,
        value: coupon.value,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Create coupon
// @route   POST /api/coupons
// @access  Private (restaurant-admin)
const createCoupon = async (req, res) => {
  try {
    const { code, type, value, minOrderAmount, maxDiscountAmount, expiryDate } = req.body;

    if (!code || !type || value === undefined) {
      return res.status(400).json({ success: false, message: 'Code, type, and value are required' });
    }

    const uppercaseCode = code.trim().toUpperCase();
    const existing = await Coupon.findOne({ restaurantId: req.tenantId, code: uppercaseCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Coupon '${uppercaseCode}' already exists` });
    }

    const coupon = await Coupon.create({
      restaurantId: req.tenantId,
      code: uppercaseCode,
      type,
      value: Number(value),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : 0,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private (restaurant-admin)
const updateCoupon = async (req, res) => {
  try {
    const { type, value, minOrderAmount, maxDiscountAmount, isActive, expiryDate } = req.body;

    const coupon = await Coupon.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    if (type !== undefined) coupon.type = type;
    if (value !== undefined) coupon.value = Number(value);
    if (minOrderAmount !== undefined) coupon.minOrderAmount = Number(minOrderAmount);
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = Number(maxDiscountAmount);
    if (isActive !== undefined) coupon.isActive = Boolean(isActive);
    if (expiryDate !== undefined) coupon.expiryDate = expiryDate ? new Date(expiryDate) : null;

    await coupon.save();
    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle coupon active status
// @route   PATCH /api/coupons/:id/status
// @access  Private (restaurant-admin)
const toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private (restaurant-admin)
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    await coupon.deleteOne();
    res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCoupons,
  validateCoupon,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  calculateCouponDiscount,
};

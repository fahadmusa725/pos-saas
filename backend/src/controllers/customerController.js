const Customer = require('../models/Customer');
const Order = require('../models/Order');

// @desc    Get all customers for current tenant
// @route   GET /api/customers
// @access  Private (restaurant-admin, cashier)
const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ restaurantId: req.tenantId }).sort({ name: 1 });
    res.status(200).json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search customer by phone number (partial match)
// @route   GET /api/customers/search?phone=XXX
// @access  Private (restaurant-admin, cashier)
// SECURITY: req.tenantId filter is MANDATORY — prevents cross-restaurant data leak
const searchCustomerByPhone = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone || phone.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'At least 3 characters required for phone search' });
    }

    // Always scoped to req.tenantId — a cashier from Restaurant A can NEVER
    // see customers of Restaurant B, even via direct API call.
    const customers = await Customer.find({
      restaurantId: req.tenantId,       // ← TENANT ISOLATION ENFORCED
      phone: { $regex: phone.trim(), $options: 'i' },
    }).limit(10);

    res.status(200).json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new customer
// @route   POST /api/customers
// @access  Private (restaurant-admin, cashier)
const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, loyaltyPoints } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    // Check duplicate phone within same restaurant
    const existing = await Customer.findOne({ restaurantId: req.tenantId, phone: phone.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A customer with phone "${phone}" already exists in this restaurant`,
      });
    }

    const customer = await Customer.create({
      restaurantId: req.tenantId,
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || '',
      address: address?.trim() || '',
      // loyaltyPoints is manual-only; no auto-accrual in current scope
      loyaltyPoints: loyaltyPoints !== undefined ? Number(loyaltyPoints) : 0,
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A customer with this phone already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update customer info
// @route   PUT /api/customers/:id
// @access  Private (restaurant-admin, cashier)
const updateCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, loyaltyPoints } = req.body;

    const customer = await Customer.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Check if new phone conflicts with another customer in same restaurant
    if (phone && phone.trim() !== customer.phone) {
      const conflict = await Customer.findOne({ restaurantId: req.tenantId, phone: phone.trim() });
      if (conflict) {
        return res.status(400).json({ success: false, message: `Phone "${phone}" is already used by another customer` });
      }
    }

    if (name !== undefined)          customer.name          = name.trim();
    if (phone !== undefined)         customer.phone         = phone.trim();
    if (email !== undefined)         customer.email         = email.trim();
    if (address !== undefined)       customer.address       = address.trim();
    // loyaltyPoints: manual edit only — no auto logic
    if (loyaltyPoints !== undefined) customer.loyaltyPoints = Number(loyaltyPoints);

    await customer.save();
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
// @access  Private (restaurant-admin only)
// NOTE ON ORPHANED ORDERS: Deleting a customer whose ID is linked to past orders
// leaves those orders with a stale customerId reference. This is handled gracefully:
// - Orders are NOT deleted (financial records must be preserved)
// - Frontend uses optional chaining (order.customerId?.name || 'Deleted Customer')
//   so no crash occurs when the referenced customer document no longer exists
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await customer.deleteOne();
    res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all past orders for a specific customer
// @route   GET /api/customers/:id/orders
// @access  Private (restaurant-admin, cashier)
const getCustomerOrders = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const orders = await Order.find({
      restaurantId: req.tenantId,
      customerId: customer._id,
    })
      .select('orderNumber orderType total paymentStatus status createdAt')
      .sort('-createdAt');

    const totalSpend = orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.total, 0);

    res.status(200).json({
      success: true,
      count: orders.length,
      totalSpend,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCustomers,
  searchCustomerByPhone,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerOrders,
};

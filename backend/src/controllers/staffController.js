const User = require('../models/User');
const Order = require('../models/Order');
const { VALID_MODULE_IDS, DEFAULT_ROLE_PERMISSIONS } = require('../config/modules');

// @desc    Get all staff members for current tenant (with orders count & auto-migrate missing permissions)
// @route   GET /api/staff
// @access  Private (restaurant-admin)
const getStaffMembers = async (req, res) => {
  try {
    const staff = await User.find({
      restaurantId: req.tenantId,
      role: { $in: ['cashier', 'waiter', 'kitchen'] },
    }).select('-password').sort({ createdAt: -1 });

    // One-time auto migration for legacy staff members without permissions array
    for (let member of staff) {
      if (!member.permissions || member.permissions.length === 0) {
        member.permissions = DEFAULT_ROLE_PERMISSIONS[member.role] || [];
        await member.save();
      }
    }

    // Aggregate handled orders count per staff member
    const staffIds = staff.map((s) => s._id);
    const orderCounts = await Order.aggregate([
      {
        $match: {
          restaurantId: req.tenantId,
          createdBy: { $in: staffIds },
        },
      },
      {
        $group: {
          _id: '$createdBy',
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    orderCounts.forEach((item) => {
      countMap[item._id.toString()] = item.totalOrders;
    });

    const staffWithMetrics = staff.map((member) => {
      const doc = member.toObject();
      doc.ordersCount = countMap[member._id.toString()] || 0;
      return doc;
    });

    res.status(200).json({
      success: true,
      data: staffWithMetrics,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new staff member
// @route   POST /api/staff
// @access  Private (restaurant-admin)
const createStaffMember = async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and role' });
    }

    const allowedRoles = ['cashier', 'waiter', 'kitchen'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff role. Allowed roles are: cashier, waiter, kitchen',
      });
    }

    // Strict permissions array validation against APP_MODULES
    let finalPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    if (permissions && Array.isArray(permissions)) {
      const invalid = permissions.filter((p) => !VALID_MODULE_IDS.includes(p));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid permissions provided: ${invalid.join(', ')}`,
        });
      }
      finalPermissions = permissions;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Auto-generate password if not provided by admin
    const finalPassword = password && password.trim().length >= 6
      ? password.trim()
      : Math.random().toString(36).slice(-8) + 'A1!';

    const staffMember = await User.create({
      name,
      email: email.toLowerCase(),
      password: finalPassword,
      role,
      permissions: finalPermissions,
      restaurantId: req.tenantId,
      isActive: true,
    });

    const responseData = staffMember.toObject();
    delete responseData.password;
    responseData.generatedPassword = password ? null : finalPassword;

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: responseData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update staff member details
// @route   PUT /api/staff/:id
// @access  Private (restaurant-admin)
const updateStaffMember = async (req, res) => {
  try {
    const { name, email, role, password, permissions } = req.body;

    const staffMember = await User.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
      role: { $in: ['cashier', 'waiter', 'kitchen'] },
    });

    if (!staffMember) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    if (name) staffMember.name = name;
    if (email) {
      const existing = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: staffMember._id },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already in use by another user' });
      }
      staffMember.email = email.toLowerCase();
    }

    if (role) {
      const allowedRoles = ['cashier', 'waiter', 'kitchen'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid staff role' });
      }
      staffMember.role = role;
    }

    if (permissions && Array.isArray(permissions)) {
      const invalid = permissions.filter((p) => !VALID_MODULE_IDS.includes(p));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid permissions provided: ${invalid.join(', ')}`,
        });
      }
      staffMember.permissions = permissions;
    }

    if (password && password.trim().length >= 6) {
      staffMember.password = password.trim();
    }

    await staffMember.save();

    const responseData = staffMember.toObject();
    delete responseData.password;

    res.status(200).json({
      success: true,
      message: 'Staff member updated successfully',
      data: responseData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle staff active status (activate/deactivate)
// @route   PATCH /api/staff/:id/status
// @access  Private (restaurant-admin)
const toggleStaffStatus = async (req, res) => {
  try {
    const staffMember = await User.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
      role: { $in: ['cashier', 'waiter', 'kitchen'] },
    });

    if (!staffMember) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    staffMember.isActive = !staffMember.isActive;
    await staffMember.save();

    const responseData = staffMember.toObject();
    delete responseData.password;

    res.status(200).json({
      success: true,
      message: `Staff member ${staffMember.isActive ? 'activated' : 'deactivated'} successfully`,
      data: responseData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete staff member
// @route   DELETE /api/staff/:id
// @access  Private (restaurant-admin)
const deleteStaffMember = async (req, res) => {
  try {
    const staffMember = await User.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.tenantId,
      role: { $in: ['cashier', 'waiter', 'kitchen'] },
    });

    if (!staffMember) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Staff member deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStaffMembers,
  createStaffMember,
  updateStaffMember,
  toggleStaffStatus,
  deleteStaffMember,
};

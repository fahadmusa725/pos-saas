const Restaurant = require('../models/Restaurant');

// @desc Get restaurant system settings
// @route GET /api/settings
// @access Private (Admin & Staff)
exports.getSettings = async (req, res) => {
  try {
    let restaurant = null;
    if (req.tenantId) {
      restaurant = await Restaurant.findById(req.tenantId);
    }
    if (!restaurant) {
      restaurant = await Restaurant.findOne();
    }

    if (!restaurant) {
      return res.status(200).json({
        success: true,
        data: {
          name: '',
          phone: '',
          address: '',
          taxRate: 0,
          receiptFooterMessage: 'Thank you for dining with us! Visit again soon.',
          currency: 'Rs.',
          showBarcodeOnReceipt: true,
          enableSoundAlerts: true,
          urgentOrderMinutes: 15,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        name: restaurant.name || '',
        phone: restaurant.phone || '',
        address: restaurant.address || '',
        taxRate: restaurant.taxRate ?? 0,
        receiptFooterMessage: restaurant.receiptFooterMessage || 'Thank you for dining with us! Visit again soon.',
        currency: restaurant.currency || 'Rs.',
        showBarcodeOnReceipt: restaurant.showBarcodeOnReceipt ?? true,
        enableSoundAlerts: restaurant.enableSoundAlerts ?? true,
        urgentOrderMinutes: restaurant.urgentOrderMinutes ?? 15,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update restaurant system settings
// @route PUT /api/settings
// @access Private (Admin Only)
exports.updateSettings = async (req, res) => {
  try {
    const {
      name,
      phone,
      address,
      taxRate,
      receiptFooterMessage,
      currency,
      showBarcodeOnReceipt,
      enableSoundAlerts,
      urgentOrderMinutes,
    } = req.body;

    let restaurant = null;
    if (req.tenantId) {
      restaurant = await Restaurant.findById(req.tenantId);
    }
    if (!restaurant) {
      restaurant = await Restaurant.findOne();
    }

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    if (name !== undefined && String(name).trim().length > 0) restaurant.name = String(name).trim();
    if (phone !== undefined) restaurant.phone = String(phone).trim();
    if (address !== undefined) restaurant.address = String(address).trim();
    if (taxRate !== undefined) restaurant.taxRate = Math.max(0, Math.min(100, Number(taxRate) || 0));
    if (receiptFooterMessage !== undefined) restaurant.receiptFooterMessage = String(receiptFooterMessage).trim();
    if (currency !== undefined) restaurant.currency = String(currency).trim() || 'Rs.';
    if (showBarcodeOnReceipt !== undefined) restaurant.showBarcodeOnReceipt = Boolean(showBarcodeOnReceipt);
    if (enableSoundAlerts !== undefined) restaurant.enableSoundAlerts = Boolean(enableSoundAlerts);
    if (urgentOrderMinutes !== undefined) restaurant.urgentOrderMinutes = Math.max(1, Number(urgentOrderMinutes) || 15);

    await restaurant.save();

    res.status(200).json({
      success: true,
      message: 'System settings updated successfully!',
      data: {
        name: restaurant.name,
        phone: restaurant.phone,
        address: restaurant.address,
        taxRate: restaurant.taxRate,
        receiptFooterMessage: restaurant.receiptFooterMessage,
        currency: restaurant.currency,
        showBarcodeOnReceipt: restaurant.showBarcodeOnReceipt,
        enableSoundAlerts: restaurant.enableSoundAlerts,
        urgentOrderMinutes: restaurant.urgentOrderMinutes,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
